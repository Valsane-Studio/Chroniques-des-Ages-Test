BookManifestRegistry.register({
  id:'livre02',
  runtimeId:'providence-02',
  number:2,
  label:'Livre 02',
  kicker:'Chroniques des Âges · Livre 02',
  title:'Le Secret du Providence',
  pitch:'Un navire marchand a disparu. Sa trace conduit vers une île que personne n’aurait dû chercher.',
  status:'available',
  actionLabel:'Jouer',
  cover:'assets/presentation.jpg',
  coverCandidates:['assets/presentation.jpg'],
  bookScript:'book.js',
  journalScript:'journal.js',
  extraScripts:['map.js'],
  themeStylesheet:'assets/theme.css',
  contentVersion:10,
  assetVersion:5,
  theme:{
    buttonTexture:'assets/textures/texture-bouton.jpeg',
    statsTexture:'assets/textures/texture-caracteristiques.jpg',
    parchmentTexture:'assets/textures/texture-parchemin.jpg',
    icons:{
      vie:'assets/icons/vie.png',
      dexterite:'assets/icons/dexterite.png',
      force:'assets/icons/force.png',
      arme:'assets/icons/arme.png',
      protection:'assets/icons/protection.png',
      special:'assets/icons/special.png'
    }
  }
});