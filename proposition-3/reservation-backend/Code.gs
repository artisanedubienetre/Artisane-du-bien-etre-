/**
 * Service de réservation — Artisane du Bien-être
 * Google Apps Script : lit ton Google Agenda, enregistre les rendez-vous
 * et envoie les e-mails de confirmation depuis ton Gmail.
 *
 * Mise en place : voir LISEZ-MOI.md
 */

var CONFIG = {
  calendarId: 'primary',                                   // ton agenda principal
  timezone: 'Europe/Paris',
  notifyEmail: 'aurelie.artisanedubienetre@gmail.com',     // reçoit une notification à chaque réservation
  senderName: 'Artisane du Bien-être',
  minNoticeHours: 24,
  horizonDays: 60,
  bufferMin: 15,
  // 0 = dimanche ... 6 = samedi. Mêmes horaires que dans le site (à garder identiques).
  hours: {
    2: [['09:30', '12:30'], ['14:00', '18:30']],
    3: [['09:30', '12:30'], ['14:00', '18:30']],
    4: [['09:30', '12:30'], ['14:00', '18:30']],
    5: [['09:30', '12:30'], ['14:00', '18:30']],
    6: [['09:30', '13:00']]
  },
  services: {
    'premier':       { label: 'Premier échange',        dur: 30, place: 'En visioconférence' },
    'reiki-cabinet': { label: 'Reiki Usui (cabinet)',   dur: 60, place: 'Au cabinet, Maison du Port, Couëron (44220)' },
    'reiki-ligne':   { label: 'Reiki Usui (en ligne)',  dur: 45, place: 'En ligne' },
    'kobido':        { label: 'Massage Kobido',         dur: 60, place: 'Au cabinet, Maison du Port, Couëron (44220)' },
    'decouverte':    { label: 'Séance Découverte',      dur: 90, place: 'Au cabinet, Maison du Port, Couëron (44220)' }
  }
};

/** Le site demande les créneaux déjà pris (sans aucun détail sur les rendez-vous). */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== 'busy') return json_({ ok: false, error: 'bad_request' });
  var from = parseDay_(p.from), to = parseDay_(p.to);
  if (!from || !to || to - from > 120 * 86400000) return json_({ ok: false, error: 'bad_range' });
  var cal = CalendarApp.getCalendarById(CONFIG.calendarId) || CalendarApp.getDefaultCalendar();
  var busy = cal.getEvents(from, to).map(function (ev) {
    if (ev.isAllDayEvent()) {
      var d = ev.getAllDayStartDate();
      var s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0), en = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59);
      return [fmt_(s), fmt_(en)];
    }
    return [fmt_(ev.getStartTime()), fmt_(ev.getEndTime())];
  });
  return json_({ ok: true, busy: busy });
}

/** Le site envoie un rendez-vous à enregistrer. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var r = JSON.parse(e.postData.contents);

    // Contrôles : le serveur ne fait pas confiance au navigateur.
    var svc = CONFIG.services[r.svc];
    if (!svc) return json_({ ok: false, error: 'service' });
    if (r.hp) return json_({ ok: true }); // anti-spam silencieux
    var prenom = clean_(r.prenom, 60), nom = clean_(r.nom, 60), email = clean_(r.email, 120), tel = clean_(r.tel, 30), msg = clean_(r.message, 800);
    if (!prenom || !nom || !/^\S+@\S+\.\S+$/.test(email) || r.consent !== true) return json_({ ok: false, error: 'invalid' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !/^\d{2}:\d{2}$/.test(r.time)) return json_({ ok: false, error: 'invalid' });

    var start = parseDateTime_(r.date, r.time), end = new Date(start.getTime() + svc.dur * 60000), now = new Date();
    if (start < new Date(now.getTime() + CONFIG.minNoticeHours * 3600000)) return json_({ ok: false, error: 'too_soon' });
    if (start > new Date(now.getTime() + CONFIG.horizonDays * 86400000)) return json_({ ok: false, error: 'too_far' });
    if (!inHours_(r.date, r.time, svc.dur)) return json_({ ok: false, error: 'closed' });

    // Le créneau est-il toujours libre ? (avec la pause entre deux rendez-vous)
    var cal = CalendarApp.getCalendarById(CONFIG.calendarId) || CalendarApp.getDefaultCalendar();
    var buf = CONFIG.bufferMin * 60000;
    if (cal.getEvents(new Date(start.getTime() - buf), new Date(end.getTime() + buf)).length) return json_({ ok: false, error: 'taken' });

    cal.createEvent(svc.label + ' · ' + prenom + ' ' + nom, start, end, {
      location: svc.place,
      description: 'Réservé depuis le site\n\nClient : ' + prenom + ' ' + nom + '\nE-mail : ' + email + '\nTéléphone : ' + (tel || '—') + '\nMessage : ' + (msg || '—')
    });

    var when = Utilities.formatDate(start, CONFIG.timezone, "EEEE d MMMM yyyy 'à' HH'h'mm");
    MailApp.sendEmail({
      to: email, replyTo: CONFIG.notifyEmail, name: CONFIG.senderName,
      subject: 'Ton rendez-vous est confirmé : ' + svc.label,
      body: 'Bonjour ' + prenom + ',\n\nTon rendez-vous est confirmé.\n\n' +
        'Soin : ' + svc.label + '\nQuand : ' + when + '\nLieu : ' + svc.place + '\nDurée : ' + svc.dur + ' min\n\n' +
        'Pour déplacer ou annuler, réponds simplement à cet e-mail.\n\nÀ très vite,\nAurélie\nArtisane du Bien-être'
    });
    MailApp.sendEmail({
      to: CONFIG.notifyEmail, name: CONFIG.senderName,
      subject: 'Nouvelle réservation : ' + svc.label + ' · ' + prenom + ' ' + nom,
      body: when + '\n' + svc.label + ' (' + svc.place + ')\n\n' + prenom + ' ' + nom + '\n' + email + '\n' + (tel || '') + '\n\n' + (msg || '')
    });
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ---- utilitaires ----
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max); }
function parseDay_(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function parseDateTime_(d, t) { var a = d.split('-'), b = t.split(':'); return new Date(+a[0], +a[1] - 1, +a[2], +b[0], +b[1]); }
function fmt_(d) { return Utilities.formatDate(d, CONFIG.timezone, 'yyyy-MM-dd HH:mm'); }
function inHours_(date, time, dur) {
  var day = parseDateTime_(date, '00:00').getDay(), wins = CONFIG.hours[day];
  if (!wins) return false;
  var s = toMin_(time), e = s + dur;
  return wins.some(function (w) { return s >= toMin_(w[0]) && e <= toMin_(w[1]); });
}
function toMin_(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
