/* DEV — PAGE 69 : formulation de la poudre noire avant son identification. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!book || !STORY?.c69) return;

  const POWDER_ID = 'poudre_cite_inconnue';

  function hasPowder(state) {
    const inv = state?.inventory;
    if (Array.isArray(inv)) return inv.some(item => (typeof item === 'string' ? item === POWDER_ID : item?.id === POWDER_ID));
    return !!(inv && typeof inv === 'object' && inv[POWDER_ID]);
  }

  function syncMysteryName(state) {
    if (!hasPowder(state) || !state.inventory || Array.isArray(state.inventory)) return;
    const item = state.inventory[POWDER_ID];
    if (!item || typeof item !== 'object') return;
    if (state.flags?.physicianNotesRead) {
      item.name = 'Terre noire — échantillon de la Cité morte';
      item.description = 'Quelques grains de terre noire prélevés dans la vasque de la Cité morte. Usage unique : +1 Terre noire.';
    } else {
      item.name = 'Poudre noire — nature inconnue';
      item.description = 'Quelques grains noirs prélevés à l’aide d’un tissu, sans contact direct, dans la Cité morte. Leur nature et leur dangerosité sont inconnues.';
    }
  }

  const oldText = STORY.c69.text;
  STORY.c69.text = state => {
    const html = typeof oldText === 'function' ? oldText(state) : oldText;
    syncMysteryName(state);
    return html;
  };

  const oldChoices = STORY.c69.choices;
  STORY.c69.choices = state => {
    const source = typeof oldChoices === 'function' ? (oldChoices(state) || []) : (oldChoices || []);
    return source.map(choice => {
      if (!choice || !/^Prélever délicatement quelques grains/i.test(String(choice.label || ''))) return choice;
      const oldEffect = choice.effect;
      return {
        ...choice,
        label: 'Prélever délicatement quelques grains à l’aide d’un tissu',
        effect: s => {
          if (typeof oldEffect === 'function') oldEffect(s);
          syncMysteryName(s);
        }
      };
    });
  };

  if (book.inventory?.displayEntries) {
    const oldDisplayEntries = book.inventory.displayEntries;
    book.inventory.displayEntries = state => {
      syncMysteryName(state);
      return (oldDisplayEntries(state) || []).map(([id, item]) => {
        if (id !== POWDER_ID || !item || typeof item !== 'object') return [id, item];
        const copy = { ...item };
        if (!state.flags?.physicianNotesRead) {
          copy.name = 'Poudre noire — nature inconnue';
          copy.description = 'Quelques grains noirs prélevés à l’aide d’un tissu, sans contact direct, dans la Cité morte. Leur nature et leur dangerosité sont inconnues.';
        }
        return [id, copy];
      });
    };
  }
})();
