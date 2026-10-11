/* Livre 01 — les deux sentinelles utilisent des boutons de choix ordinaires.
   Leur moteur est deja specifique (sentinelFight) : le mode inlineCombat du lecteur
   n'apporte rien ici et peut desactiver le bouton avant l'execution du lancer. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY) return;

  const IDS = ['c79','c80','c132','c133','c134','c135'];

  function ordinaryChoices(list) {
    return (list || []).map(choice => {
      if (!choice || !choice.inlineCombat) return choice;
      return { ...choice, inlineCombat:false };
    });
  }

  for (const id of IDS) {
    const scene = STORY[id];
    if (!scene) continue;
    const previousChoices = scene.choices;
    if (typeof previousChoices === 'function') {
      scene.choices = state => ordinaryChoices(previousChoices(state));
    } else if (Array.isArray(previousChoices)) {
      scene.choices = ordinaryChoices(previousChoices);
    }
  }
})();
