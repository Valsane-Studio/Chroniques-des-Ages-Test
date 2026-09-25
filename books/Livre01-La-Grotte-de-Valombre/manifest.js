BookManifestRegistry.register({
  id:'livre01',
  runtimeId:'ecuyer-01',
  number:1,
  label:'Livre 01',
  kicker:'Chroniques des Âges · Livre 01',
  title:'La Grotte de Valombre',
  pitch:'Sir Aldren a disparu. Les réponses se trouvent sous Valombre.',
  status:'available',
  actionLabel:'Découvrir',
  access:{mode:'free'},
  cover:'assets/presentation.jpg',
  preview:{
    image:'assets/presentation.jpg',
    situation:'Sir Aldren de Rochebrune a disparu. Sa piste te conduit à Valombre, un village qui semble cacher bien plus que quelques silences.',
    adventure:'Enquête médiévale, exploration, choix de route, combats et découverte progressive d’un monde enfoui.',
    dangers:'Pièges, créatures, blessures et une mystérieuse terre noire dont l’influence grandit à mesure que tu t’enfonces sous la cité.'
  },
  bookScript:'book.js',
  journalScript:'journal.js',
  extraScripts:['map.js'],
  themeStylesheet:'assets/theme.css',
  contentVersion:123,
  assetVersion:185,
  theme:{
    buttonTexture:'assets/textures/texture-bouton.jpg',
    statsTexture:'assets/textures/texture-caracteristiques.jpg',
    parchmentTexture:'assets/textures/texture-parchemin.jpg',
    icons:{
      vie:'assets/icons/vie.png', dexterite:'assets/icons/dexterite.png', force:'assets/icons/force.png',
      arme:'assets/icons/arme.png', protection:'assets/icons/protection.png', special:'assets/icons/special.png'
    }
  }
});
