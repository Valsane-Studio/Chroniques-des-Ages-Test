BookManifestRegistry.register({
  id:'livre01',
  runtimeId:'ecuyer-01',
  number:1,
  label:'Livre 01',
  kicker:'APHANES · Livre 01',
  title:'La Grotte de Valombre',
  pitch:'Sir Aldren a disparu. Les réponses se trouvent sous Valombre.',
  status:'available',
  actionLabel:'Découvrir',
  access:{mode:'free'},
  cover:'assets/presentation.jpg',
  libraryImage:'assets/bibliotheque.jpg',
  preview:{
    image:'assets/presentation.jpg',
    situation:'Valombre est ton village, tu y as grandi, tu connais ses rues, ses habitants et ses habitudes.\n\nLorsque Sir Aldren de Rochebrune disparaît, ce monde familier commence pourtant à révéler des secrets que tu n’avais jamais soupçonnés.',
    adventure:'Enquête médiévale, exploration, choix de route, combats et découverte progressive d’un monde enfoui.',
    dangers:'Pièges, créatures et une mystérieuse terre noire dont l’influence grandit à mesure que tu t’enfonces sous la cité.'
  },
  bookScript:'book.js',
  journalScript:'journal.js',
  extraScripts:['map.js','feedback-ui.js','maze-prototype.js','combat-prototype.js','combat-controls-prototype.js','narrative-flow-cleanup.js','short-page-merges.js','camp-crisis-pass.js','camp-crisis-dice-flow.js','camp-crisis-choice-wording.js','dice-consistency-audit.js','lab-choice-lock.js','care-crossroads-lock.js','siege-thread-pass.js','camp-page28-entry.js','early-encounter-dynamics.js','city-sentinel-tactics.js','sentinel-balance-pass.js','weapon-balance-pass.js','powder-wording-pass.js','sentinel-icon-fix.js','sentinel-power-flow-v2.js','labyrinth-woman-payoff.js','inventory-reminder-pass.js','labyrinth-wanderer-tactics.js','labyrinth-slab-choice-pass.js','labyrinth-slab-choice-commit-fix.js','labyrinth-slab-choice-fixes-v2.js','combat-dice-choice.js','combat-dice-visuals-v2.js','combat-dice-standard-color.js','test-runtime-cleanup.js','combat-dice-offensive-name.js','combat-dice-ui-cleanup.js'],
  themeStylesheet:'assets/theme.css',
  contentVersion:250,
  assetVersion:188,
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