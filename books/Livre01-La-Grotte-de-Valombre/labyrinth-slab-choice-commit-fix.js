/* Livre 01 — verrouiller le choix de combattre pour observer les dalles. */
(function () {
  'use strict';
  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c170;
  if (!scene || scene.__slabCommitFixV1) return;

  const previousChoices = scene.choices;
  scene.choices = state => {
    const list = typeof previousChoices === 'function' ? (previousChoices(state) || []) : (previousChoices || []);
    const flow = state.flags?.labyrinthSlabSequenceV1;
    if (flow?.stage === 'combat' && !flow.cameFromArch && !flow.monsterDead) {
      return list.filter(choice => !/dalles sans réfléchir/i.test(choice?.label || ''));
    }
    return list;
  };

  scene.__slabCommitFixV1 = true;
})();
