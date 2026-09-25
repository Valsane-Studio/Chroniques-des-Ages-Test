BookManifestRegistry.register({
  id:'livre01',
  runtimeId:'ecuyer-01',
  number:1,
  label:'Livre 01',
  kicker:'Chroniques des Âges · Livre 01',
  title:'La Grotte de Valombre',
  pitch:'Sir Aldren a disparu. Les réponses se trouvent sous Valombre.',
  status:'available',
  actionLabel:'Jouer',
  cover:'assets/presentation.jpg',
  bookScript:'book.js',
  journalScript:'journal.js',
  extraScripts:['map.js'],
  themeStylesheet:'assets/theme.css',
  assetVersion:180,
  theme:{
    buttonTexture:'assets/textures/texture-bouton.jpg',
    statsTexture:'assets/textures/texture-caracteristiques.jpg',
    parchmentTexture:'assets/textures/texture-parchemin.jpg',
    icons:{
      vie:'assets/icons/vie.png', dexterite:'assets/icons/dexterite.png', force:'assets/icons/force.png',
      arme:'assets/icons/arme.png', protection:'assets/icons/protection.png', terreNoire:'assets/icons/terre-noire.png'
    }
  }
});
