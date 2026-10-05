/* DEV — PAGE 113 : le carrefour des soins devient un vrai choix de route.
   Le joueur peut explorer le poste de secours OU la réserve, ou descendre
   immédiatement. Une présence approche dans le couloir emprunté par le joueur.
   Après un détour, le retour se fait sur une page distincte et pousse à descendre. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY?.c106) return;

  const RETURN_ID = 'careCrossroadsReturn';

  function choicesOf(source, state) {
    return typeof source === 'function' ? (source(state) || []) : (source || []);
  }

  function chosenBranch(state) {
    const explicit = state.flags?.careCrossroadsChoice;
    if (explicit) return explicit;

    const aid = !!state.visited?.c107;
    const reserve = !!state.visited?.c108;
    if (aid && !reserve) return 'aid';
    if (reserve && !aid) return 'reserve';
    if (aid && reserve) return 'legacy-both';
    return null;
  }

  function markBranch(state, branch) {
    state.flags = state.flags || {};
    if (!state.flags.careCrossroadsChoice) state.flags.careCrossroadsChoice = branch;
  }

  function wrapEffect(choice, branch) {
    const oldEffect = choice?.effect;
    return {
      ...choice,
      effect: state => {
        if (typeof oldEffect === 'function') oldEffect(state);
        markBranch(state, branch);
      }
    };
  }

  const DISTANT_THREAT = `
    <p>Un bruit sec résonne soudain dans le couloir derrière toi.</p>
    <p>Un choc métallique. Puis un autre, à intervalles réguliers. Entre les deux, quelque chose frotte contre la pierre.</p>
    <p>Le son est encore lointain, mais il se rapproche.</p>`;

  const RETURN_TEXT = `
    <p>Lorsque tu reviens au carrefour, le bruit a changé.</p>
    <p>Les chocs métalliques résonnent maintenant beaucoup plus près dans le couloir derrière toi. Tu distingues le raclement lourd de quelque chose qui avance sur la pierre.</p>
    <p>Tu as eu le temps pour un détour. Pas pour un second. L’escalier qui descend vers les niveaux inférieurs est encore libre.</p>`;

  STORY[RETURN_ID] = {
    number: 'PAGE 113',
    title: '',
    noImage: true,
    text: RETURN_TEXT,
    choices: [{label:'Descendre vers les niveaux inférieurs', to:'c109'}]
  };

  const scene = STORY.c106;
  const originalText = scene.text;
  const originalChoices = scene.choices;

  scene.text = state => {
    const html = typeof originalText === 'function' ? originalText(state) : originalText;
    const branch = chosenBranch(state);
    // Compatibilité avec une sauvegarde déjà revenue sur c106 avant cette version.
    if (branch === 'aid' || branch === 'reserve' || branch === 'legacy-both') return RETURN_TEXT;
    if (branch === 'stairs') return html;
    return `${html || ''}${DISTANT_THREAT}`;
  };

  scene.choices = state => {
    const branch = chosenBranch(state);
    const source = choicesOf(originalChoices, state);

    if (branch === 'aid' || branch === 'reserve' || branch === 'legacy-both') {
      return [{label:'Descendre vers les niveaux inférieurs', to:'c109'}];
    }

    return source.map(choice => {
      if (!choice) return choice;
      if (choice.to === 'c107') return wrapEffect(choice, 'aid');
      if (choice.to === 'c108') return wrapEffect(choice, 'reserve');
      if (choice.to === 'c109') return wrapEffect(choice, 'stairs');
      return choice;
    });
  };

  /* Tous les retours des deux branches vers l'ancien carrefour sont redirigés
     vers la nouvelle page de retour. Les actions internes aux pièces restent intactes. */
  Object.entries(STORY).forEach(([id, branchScene]) => {
    if (id === 'c106' || id === RETURN_ID || !branchScene?.choices || branchScene.__careReturnRedirect) return;
    const previousChoices = branchScene.choices;
    branchScene.choices = state => choicesOf(previousChoices, state).map(choice => {
      if (!choice || choice.to !== 'c106') return choice;
      const branch = chosenBranch(state);
      if (branch !== 'aid' && branch !== 'reserve' && branch !== 'legacy-both') return choice;
      return {...choice, to: RETURN_ID};
    });
    branchScene.__careReturnRedirect = true;
  });
})();
