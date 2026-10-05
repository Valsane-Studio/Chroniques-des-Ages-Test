/* PAGE 102 : une seule exploration dans la salle des injections.
   Le joueur choisit la machine, l'armoire, ou quitte immédiatement la pièce.
   Dès qu'une branche est choisie, l'autre devient inaccessible et la vieille
   installation finit par céder, forçant la sortie vers le couloir. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY?.c102) return;

  const LEAK_START = `
    <p>Un craquement sec retentit du côté de la cuve. Le raccord qui alimente le bras articulé vient de se fendre. Une première goutte de terre noire tombe sur les dalles.</p>
    <p>L’odeur de soufre devient aussitôt plus forte. Tu n’as plus le temps de fouiller la pièce : si tu veux agir sur cette machine, c’est maintenant.</p>`;

  const LEAK_FULL = `
    <p>Un claquement sec retentit derrière toi.</p>
    <p>Le vieux tuyau relié à la cuve vient de céder. Une boue noire commence à se répandre sur les dalles et l’odeur de soufre emplit immédiatement la pièce.</p>
    <p>Tu n’as aucune envie de rester là plus longtemps.</p>`;

  function choicesOf(source, state) {
    return typeof source === 'function' ? (source(state) || []) : (source || []);
  }

  function markChoice(state, branch) {
    state.flags = state.flags || {};
    if (!state.flags.labRoomChoice) state.flags.labRoomChoice = branch;
  }

  function wrapEffect(choice, effect) {
    const oldEffect = choice?.effect;
    return {
      ...choice,
      effect: state => {
        if (typeof oldEffect === 'function') oldEffect(state);
        effect(state);
      }
    };
  }

  {
    const scene = STORY.c102;
    const originalChoices = scene.choices;
    scene.choices = state => {
      const branch = state.flags?.labRoomChoice;
      if (branch) return [{label:'Avancer dans le couloir', to:'c197'}];

      return choicesOf(originalChoices, state).map(choice => {
        if (!choice) return choice;
        if (choice.to === 'c103') return wrapEffect(choice, s => markChoice(s, 'mechanism'));
        if (choice.to === 'c138') return wrapEffect(choice, s => markChoice(s, 'cabinet'));
        if (choice.to === 'c197') return wrapEffect(choice, s => markChoice(s, 'corridor'));
        return choice;
      });
    };
  }

  if (STORY.c103) {
    const scene = STORY.c103;
    const originalText = scene.text;
    const originalChoices = scene.choices;

    scene.text = state => {
      const html = typeof originalText === 'function' ? originalText(state) : originalText;
      if (state.flags?.labRoomChoice !== 'mechanism' || state.flags?.labLeverBroken) return html;
      return `${html || ''}${LEAK_START}`;
    };

    scene.choices = state => choicesOf(originalChoices, state)
      .filter(choice => choice?.to !== 'c138')
      .map(choice => choice?.to === 'c197'
        ? {...choice, label:'Quitter la salle et poursuivre dans le couloir'}
        : choice);
  }

  if (STORY.c151) {
    const scene = STORY.c151;
    const originalText = scene.text;
    const originalChoices = scene.choices;

    scene.text = state => {
      const html = typeof originalText === 'function' ? originalText(state) : originalText;
      if (state.flags?.labRoomChoice !== 'mechanism' || !state.flags?.labLeverBroken) return html;
      return `${html || ''}${LEAK_FULL}`;
    };

    scene.choices = state => choicesOf(originalChoices, state).map(choice =>
      choice?.to === 'c197' ? {...choice, label:'Quitter la salle et poursuivre dans le couloir'} : choice
    );
  }

  if (STORY.c196) {
    const scene = STORY.c196;
    const originalChoices = scene.choices;
    scene.choices = state => choicesOf(originalChoices, state)
      .filter(choice => choice?.to !== 'c138')
      .map(choice => choice?.to === 'c197'
        ? {...choice, label:'Quitter la salle et poursuivre dans le couloir'}
        : choice);
  }

  if (STORY.c138) {
    const scene = STORY.c138;
    const originalText = scene.text;
    const originalChoices = scene.choices;

    scene.text = state => {
      const html = typeof originalText === 'function' ? originalText(state) : originalText;
      if (state.flags?.labRoomChoice !== 'cabinet') return html;
      return `${html || ''}${LEAK_FULL}`;
    };

    scene.choices = state => {
      if (state.flags?.labRoomChoice === 'cabinet') {
        return [{label:'Quitter la salle et suivre le couloir', to:'c197'}];
      }
      return choicesOf(originalChoices, state);
    };
  }
})();
