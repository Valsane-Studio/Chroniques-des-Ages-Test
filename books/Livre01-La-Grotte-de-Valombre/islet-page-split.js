/* Livre 01 — découpe de l’îlot de l’œil fermé en deux pages.
   PAGE 47 : découverte de l’îlot et du symbole.
   PAGE 47B : révélation de la créature et combat.
*/
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!book || !STORY?.c46 || !STORY?.c47) return;

  const INTRO_ID = 'c240';
  const COMBAT_ID = 'c47';

  STORY[INTRO_ID] = {
    number: 'PAGE 47',
    title: 'L’îlot de l’œil fermé',
    image: 'L’îlot de l’œil fermé',
    text: `
      <p>Tu accostes contre l’ancien quai de pierre et tires la barque hors de l’eau.</p>
      <p>L’îlot s’étend sur plusieurs dizaines de pas. Son sol irrégulier est parsemé de blocs effondrés et de vestiges de murs. À une extrémité, un escalier descend directement dans les eaux noires du lac.</p>
      <p>Tu avances parmi les ruines.</p>
      <p>Au centre de l’îlot, quatre piliers brisés entourent une large dalle de pierre blanche.</p>
      <p>Un œil fermé y est gravé.</p>
      <p>Dans une petite cavité, au milieu de la dalle, repose un anneau métallique couvert de dépôts gris.</p>
      <p>Tu t’approches pour l’examiner.</p>
      <p>Quelque chose racle la pierre derrière l’un des piliers.</p>
    `,
    choices: [{ label: 'Continuer', to: COMBAT_ID }]
  };

  /* Le choix depuis le lac passe désormais d’abord par la nouvelle page 47.
     Les retours de lame de jet vers c47 ne sont pas modifiés. */
  const previousLakeChoices = STORY.c46.choices;
  STORY.c46.choices = state => {
    const list = typeof previousLakeChoices === 'function' ? (previousLakeChoices(state) || []) : (previousLakeChoices || []);
    return list.map(choice => choice?.to === COMBAT_ID
      ? { ...choice, to: INTRO_ID }
      : choice);
  };

  /* c47 devient uniquement la révélation + le combat. On conserve tous les
     wrappers déjà installés par les systèmes de combat et de dés. */
  const originalCombatText = STORY.c47.text;
  STORY.c47.number = 'PAGE 47B';
  STORY.c47.title = 'La forme derrière le pilier';
  STORY.c47.image = 'La créature de l’îlot';
  STORY.c47.text = state => {
    const html = typeof originalCombatText === 'function' ? originalCombatText(state) : originalCombatText;
    const marker = '<p>Une forme basse apparaît.</p>';
    const index = String(html || '').indexOf(marker);
    return index >= 0 ? String(html).slice(index) : html;
  };

  if (book.navigationTitles) {
    book.navigationTitles[INTRO_ID] = 'L’îlot de l’œil fermé';
    book.navigationTitles[COMBAT_ID] = 'La forme derrière le pilier';
  }

  /* La carte de travail suit elle aussi les deux étapes. */
  const isletNode = book.adventureMap?.nodes?.find?.(node => node?.id === 'ilot');
  if (isletNode && Array.isArray(isletNode.pages) && !isletNode.pages.includes(INTRO_ID)) {
    const combatIndex = isletNode.pages.indexOf(COMBAT_ID);
    if (combatIndex >= 0) isletNode.pages.splice(combatIndex, 0, INTRO_ID);
    else isletNode.pages.unshift(INTRO_ID);
  }
})();
