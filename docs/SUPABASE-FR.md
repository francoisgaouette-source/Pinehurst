# Pinehurst Cup : base de données et synchronisation

Le site reste hébergé sur Netlify. Un **nouveau projet Supabase Pinehurst** fournit la base et la connexion. Le projet Scotland n'est jamais utilisé.

## 1. Créer la base

1. Sur https://supabase.com/dashboard, créez un projet **Pinehurst Cup**.
2. Gardez le mot de passe de la base privé : il ne va jamais dans le site.
3. Ouvrez **SQL Editor**, créez une requête, collez le contenu de supabase/setup.sql et cliquez **Run**.
4. Le fichier public prépare les tables, les fonctions et les droits. Ajoutez les adresses des membres dans le SQL Editor à l’aide de l’exemple commenté, sans les publier dans GitHub. Si la version privée contenant les 16 membres a déjà été exécutée, les autorisations sont conservées. Le fichier peut être exécuté de nouveau sans effacer les résultats.
5. Pour changer les membres, utilisez le SQL Editor, pas le navigateur. Ne publiez jamais une version du fichier contenant la liste privée des adresses.

## 2. Autoriser la connexion

Dans **Authentication → URL Configuration** :
- **Site URL** : l'adresse HTTPS du site Pinehurst sur Netlify.
- **Redirect URLs** : ajoutez l'adresse exacte de la page d'accueil utilisée, par exemple https://VOTRE-SITE.netlify.app/ . Si vous utilisez un domaine personnalisé, ajoutez également cette adresse.
- Pour un test local uniquement, ajoutez http://localhost:5173/ .

Activez le fournisseur Email. Le site utilise des liens de connexion envoyés par courriel.
Pour les 16 joueurs, configurez un service SMTP d'envoi dans Supabase : le service de courriels de test intégré peut limiter les destinataires aux membres de votre organisation et limiter le nombre d'envois. Entrez les identifiants SMTP **uniquement dans les réglages Supabase**.
Documentation officielle : https://supabase.com/docs/guides/auth/auth-smtp

Chaque joueur demande un lien depuis l'appareil qu'il souhaite connecter, puis ouvre ce lien dans le navigateur correspondant. Répétez sur le mobile et l'ordinateur avec la même adresse de membre.

## 3. Relier le site à la base

Dans les paramètres API du projet, copiez :
- **Project URL** ;
- la clé **publishable** (sb_publishable_…), ou l'ancienne clé publique anon.

**Jamais** la clé secrète sb_secret_…, la clé service_role, ni le mot de passe de la base.

Placez ces deux valeurs publiques dans public/cloud-config.json :

    {
      "supabaseUrl": "https://VOTRE-PROJET.supabase.co",
      "publishableKey": "sb_publishable_VOTRE_CLE_PUBLIQUE"
    }

Puis lancez npm ci, npm test et npm run build. Les noms d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY sont une alternative pour un déploiement Netlify avec compilation. Ce sont des valeurs publiques du navigateur.

Le panneau « Configuration de la base (organisateur) » peut servir au test sur un appareil. Ce réglage local ne configure pas automatiquement les autres appareils : pour tous les joueurs, publiez le fichier de configuration commun.

## 4. Publier et vérifier

Glissez **le contenu du dossier dist** dans le déploiement manuel du site Netlify Pinehurst.
Ne publiez ni le dossier du projet entier, ni supabase/, ni ce guide.
Le site utilise désormais index.html, ses assets et cloud-config.json. Un fichier HTML autonome n'est pas suffisant pour récupérer un fichier de configuration commun ajouté après sa génération.

Connectez-vous sur deux appareils et vérifiez :

1. Une note écrite sur le premier apparaît sur le second après quelques secondes (lecture toutes les 2,5 secondes quand la page est visible).
2. Les scores, groupes, matchs et passeports sont identiques.
3. Deux scores de joueurs différents se combinent sans perte.
4. Une modification du même champ sur les deux appareils demande quelle version conserver.
5. Une coupure réseau indique des changements en attente, et le retour du réseau les transmet.
6. Un courriel extérieur à la liste n'accède pas à la base.

Le statut **Synchronisé** signifie que la base a confirmé les modifications connues. Un changement en attente n'est pas encore disponible sur un autre appareil. Le site conserve la file locale par projet et par utilisateur; ce n'est pas une sauvegarde indépendante de votre navigateur. Exportez aussi une copie JSON.

## Ancien brouillon

Les anciennes données locales ne sont **jamais importées automatiquement** dans la base partagée.
Après connexion, ouvrez « Revoir mon ancien brouillon local ». Le site montre le nombre et les champs concernés. L'import est une action explicite et peut remplacer les valeurs en ligne de ces champs.
Gardez une copie JSON de votre ancien fichier avant de changer d'adresse de site : le stockage local est propre à chaque origine/navigateur.

## Droits et limites

Les membres authentifiés partagent la même compétition et peuvent modifier les résultats et passeports du groupe. Il ne s'agit pas de comptes individuels verrouillant chaque passeport à son propriétaire.
Les visiteurs non connectés ne lisent ni ne modifient les données partagées.
L'index, les scores brut/net et les points Stableford restent saisis manuellement.

Le code et les règles SQL sont testés localement, y compris les droits d'accès et les conflits.
La connexion réelle, la délivrance des liens courriel et la synchronisation sur le projet Supabase du groupe doivent être vérifiées **après sa création et sa configuration**.
