# Nuage de mots

Une application web en français pour recueillir les mots d'une classe autour d'une question et afficher un nuage collectif. Les mots fréquemment proposés apparaissent plus gros.

## Fonctionnalités

- Création d'une activité par l'enseignant avec une question et une limite de 2 ou 3 mots par réponse.
- Lien élève distinct du lien enseignant.
- Réponses anonymes, sans compte ni nom d'élève demandé.
- Nuage agrégé actualisé automatiquement, aussi bien côté enseignant que côté élève.
- Ouverture et fermeture des réponses, export CSV des fréquences.
- Stockage partagé et persistant via Cloudflare Workers et Durable Objects.

## Déploiement Cloudflare

Le dépôt contient le code source, mais le partage en direct nécessite de déployer le Worker (un site statique GitHub Pages seul ne peut pas enregistrer les réponses de toute la classe dans une base commune).

1. Installe Node.js (version LTS) et Wrangler : `npm install -g wrangler`.
2. Depuis la racine du dépôt, connecte-toi à Cloudflare : `wrangler login`.
3. Déploie l'application : `wrangler deploy`.
4. Wrangler publie le Worker sur une adresse `workers.dev`. Ouvre cette adresse pour créer une activité et partager le lien élève généré.

Le fichier `wrangler.toml` configure les fichiers statiques et le stockage durable des activités. La première publication crée la migration Durable Objects déclarée dans ce fichier.

## Développement

Le front-end n'a pas de dépendance de compilation. Pour tester localement avec le stockage Durable Objects de Wrangler :

```bash
wrangler dev
```

## Confidentialité

Les réponses sont anonymes dans l'interface : aucun nom n'est demandé. Les réponses brutes sont conservées pour permettre à un même navigateur de remplacer sa réponse ; seule la fréquence agrégée des mots est affichée publiquement. Ne demandez pas aux élèves de saisir des données personnelles dans leurs réponses.
