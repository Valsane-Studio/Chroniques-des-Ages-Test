/* Livre 01 — garde-fou pour les dés du combat des deux sentinelles.
   Certains parcours conservent un lastCombatKey d'un ancien combat standard.
   Le sélecteur général des dés peut alors détourner le clic vers cet ancien combat.
   On neutralise cette référence uniquement pour les scènes des sentinelles. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY) return;

  const SENTINEL_SCENES = ['c79','c80','c132','c133','c134','c135'];

  function guardChoices(list) {
    return (list || []).map(choice => {
      if (!choice || !choice.inlineCombat || typeof choice.effect !== 'function' || !/^Jeter les dés/i.test(choice.label || '')) return choice;
      const previousEffect = choice.effect;
      return {
        ...choice,
        effect: state => {
          // Les sentinelles utilisent sentinelFight et non combats[lastCombatKey].
          // Une ancienne clé de combat ne doit donc jamais intercepter ce lancer.
          state.lastCombatKey = null;
          state.lastCombatOutcome = null;
          return previousEffect(state);
        }
      };
    });
  }

  for (const id of SENTINEL_SCENES) {
    const scene = STORY[id];
    if (!scene || scene.__sentinelDiceGuardV1) continue;

    const previousChoices = scene.choices;
    if (typeof previousChoices === 'function') {
      scene.choices = state => guardChoices(previousChoices(state));
    } else if (Array.isArray(previousChoices)) {
      scene.choices = guardChoices(previousChoices);
    }

    scene.__sentinelDiceGuardV1 = true;
  }
})();