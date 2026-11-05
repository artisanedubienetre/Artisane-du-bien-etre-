# Brancher les vrais rendez-vous (15 minutes, une seule fois)

Le calendrier du site fonctionne en **mode démonstration** tant que rien n'est branché. Pour que les rendez-vous soient réels (bloqués dans ton Google Agenda, avec e-mail de confirmation au client), il faut ce petit service gratuit, hébergé chez Google, sur **ton** compte.

## Ce que ça fait
- Le site affiche les créneaux libres en lisant ton Google Agenda (sans montrer le détail de tes rendez-vous).
- Quand un client confirme : le rendez-vous est ajouté à ton agenda, le client reçoit un e-mail de confirmation, et toi une notification.
- Un créneau déjà pris ne peut pas être réservé deux fois (vérification au moment de l'envoi).
- Pour déplacer ou annuler, le client répond à l'e-mail de confirmation (le rendez-vous se supprime à la main dans ton agenda).

## Mise en place
1. Va sur **script.google.com**, connecté avec le compte Google qui contient ton agenda, puis **Nouveau projet**.
2. Efface le contenu de `Code.gs` et colle à la place tout le fichier `Code.gs` fourni.
3. En haut du fichier, vérifie dans `CONFIG` : ton adresse (`notifyEmail`), les **horaires** et les **durées** (ils doivent être identiques à ceux du site, voir plus bas).
4. Dans **Paramètres du projet** (roue dentée), règle le **fuseau horaire** sur `Europe/Paris`.
5. Clique **Déployer → Nouveau déploiement → type « Application Web »** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. Autorise l'accès à Agenda et à l'envoi d'e-mails quand Google le demande.
7. Copie l'**URL de l'application web** (elle se termine par `/exec`).
8. Dans `index.html` de la proposition, cherche `endpoint:''` et colle l'URL entre les guillemets. Le bandeau « Mode démonstration » disparaît.

Si tu modifies `Code.gs` plus tard : **Déployer → Gérer les déploiements → modifier → nouvelle version**.

## À savoir
- **Horaires d'ouverture** : ceux du site (dans `BOOKING.hours` de `index.html`) et ceux de `Code.gs` (`CONFIG.hours`) doivent être les mêmes. Les horaires actuels sont des exemples à remplacer par les tiens.
- **Durées** : premier échange fixé à 30 min par défaut (à confirmer), Reiki cabinet 60 min, Reiki en ligne 45 min, Kobido 60 min, Découverte 1 h 30.
- **Paiement** : le widget ne gère pas le paiement (contrairement à Weezevent). Le règlement se fait à la séance, ou on ajoute un lien de paiement plus tard.
- **Quota Google** : un Gmail gratuit peut envoyer environ 100 e-mails par jour, largement suffisant.
- **Données personnelles (RGPD)** : les coordonnées arrivent dans ton agenda et ta boîte mail. Remplace la mention « [Lien vers la politique de confidentialité] » par ta vraie page.
- **Protection** : un champ invisible piège les robots, et le serveur revérifie tout (horaires, créneau libre, e-mail valide).
