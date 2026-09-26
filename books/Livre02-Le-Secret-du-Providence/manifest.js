BookManifestRegistry.register({
  id:'livre02',
  runtimeId:'providence-02',
  number:2,
  label:'Livre 02',
  kicker:'Chroniques des Âges · Livre 02',
  title:'Le Secret du Providence',
  pitch:'Un navire marchand a disparu. Sa trace conduit vers une île que personne n’aurait dû chercher.',
  status:'available',
  actionLabel:'Découvrir',
  access:{mode:'free'},
  cover:'assets/presentation.jpg',
  preview:{
    image:'assets/presentation.jpg',
    situation:'Port Royal, 1719. Le Providence, navire marchand d’Edmund Harcourt, a disparu avec vingt-sept hommes. La Royal Navy t’envoie retrouver sa trace.',
    adventure:'Aventure maritime mêlant enquête, navigation, commandement et exploration, avec une montée progressive vers le surnaturel, les mythes et les légendes de marins.',
    dangers:'Récifs, pirates, combats, mer imprévisible et phénomènes que les marins préfèrent évoquer à voix basse.'
  },
  coverCandidates:['assets/presentation.jpg'],
  bookScript:'book.js',
  journalScript:'journal.js',
  extraScripts:['map.js'],
  themeStylesheet:'assets/theme.css',
  contentVersion:15,
  assetVersion:7,
  theme:{
    buttonTexture:'assets/textures/texture-bouton.jpg',
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