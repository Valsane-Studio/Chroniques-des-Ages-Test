# Chroniques des Âges

**Valsane Studio**

Application de récits interactifs regroupant plusieurs livres indépendants autour d’un moteur commun.

## Architecture

```text
/
├── index.html
├── app/
├── engine/
├── assets/
│   └── common/
├── books/
│   ├── _Book-Template/
│   ├── Livre01-La-Grotte-de-Valombre/
│   └── Livre02-Le-Secret-du-Providence/
└── tools/
```

Chaque livre possède son propre `manifest.js`, son contenu, ses images et ses assets.  
La visibilité et l’ordre des livres dans la bibliothèque sont réglés dans `app/catalog.js`.

## Images

Les illustrations des pages ne sont pas stockées dans cette initialisation.

Convention : JPG/JPEG pour les images opaques ; PNG uniquement quand une transparence est nécessaire.  
Elles doivent être ajoutées manuellement dans le dossier `images/` du livre concerné, au format JPG/JPEG.

## Studio

© Valsane Studio — Tous droits réservés.
