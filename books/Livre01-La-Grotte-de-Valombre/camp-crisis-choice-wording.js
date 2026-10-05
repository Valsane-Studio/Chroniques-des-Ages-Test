/* DEV — Crise d’Anselme : ne pas révéler le type de test avant le choix. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY) return;

  function hideTestNames(choices) {
    return (choices || []).map(choice => {
      if (!choice) return choice;
      let label = String(choice.label || '');
      label = label
        .replace(/\s*[—-]\s*test de Force\s*$/i, '')
        .replace(/\s*[—-]\s*test de Dextérité\s*$/i, '');
      return label === choice.label ? choice : { ...choice, label };
    });
  }

  function wrapChoices(scene) {
    if (!scene || scene.__hiddenCampTestNames) return;
    const original = scene.choices;
    scene.choices = state => {
      const choices = typeof original === 'function' ? original(state) : (original || []);
      return hideTestNames(choices);
    };
    scene.__hiddenCampTestNames = true;
  }

  // campAidArrival porte aussi les choix tactiques après le premier échange.
  wrapChoices(STORY.campAidArrival);
  wrapChoices(STORY.campAidTactics);
})();
