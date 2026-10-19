# Nuage de mots

Application web en français pour créer des nuages de mots collaboratifs avec une classe. Plus un mot est proposé par des élèves différents, plus il apparaît gros.

## Fonctionnalités

- Créer une activité avec une question et choisir une limite de 2 ou 3 mots par élève.
- Envoyer un lien distinct aux élèves : pas de compte ni de nom demandé.
- Afficher le nuage et le nombre de réponses, actualisés automatiquement.
- Modifier sa réponse depuis le même navigateur.
- Ouvrir ou fermer les réponses, effacer les contributions et exporter les fréquences en CSV.
- Stocker les réponses sur le serveur pour que les élèves et l'enseignant voient le même nuage sur tous les appareils.

## Déploiement Cloudflare

Le code est hébergé sur GitHub, mais il faut déployer l'application sur un serveur pour que la classe partage les mêmes réponses. Une simple page GitHub Pages ne fournit pas le stockage partagé nécessaire.

1. Installe Node.js (version LTS).
2. Clone le dépôt et ouvre un terminal à sa racine.
3. Installe les dépendances : `npm install`.
4. Connecte-toi à Cloudflare : `npx wrangler login`.
5. Déploie : `npm run deploy`.
6. À la fin du déploiement, ouvre l'adresse `workers.dev` indiquée par Wrangler. Crée une activité depuis cette page et copie le lien élève à partager.

La configuration `wrangler.toml` sert le site statique et configure Durable Objects avec stockage SQLite pour les activités.

## Développement

- `npm run dev` : lance l'application localement avec Wrangler.
- `npm run check` : vérifie la syntaxe JavaScript.
- Une vérification GitHub Actions exécute ces contrôles et un déploiement à blanc à chaque mise à jour de la branche principale.

## Confidentialité

Aucun nom ni e-mail n'est demandé aux élèves. Le serveur conserve les réponses afin de compter les mots et de permettre une modification depuis le même navigateur ; l'API publique ne renvoie que les fréquences agrégées. Le lien élève est public : les personnes qui le possèdent peuvent participer tant que l'enseignant laisse les réponses ouvertes. Il est conseillé de rappeler aux élèves de ne pas saisir de données personnelles.
