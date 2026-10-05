/* DEV — PAGE 28 : les alentours d'Anselme offrent deux détours seulement.
   La galerie descendante devient ensuite la progression principale, après la crise. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY?.c28 || STORY.c28.__campPage28EntryV3) return;

  function choicesOf(source, state) {
    return typeof source === 'function' ? (source(state) || []) : (source || []);
  }

  function rerouteDepthChoice(choice) {
    if (!choice) return choice;
    if (choice.to !== 'c37') return choice;
    if (!/profondeur|descente|poursuivre/i.test(choice.label || '')) return choice;
    return { ...choice, to: 'c34' };
  }

  /* PAGE 28 : la galerie descendante n'est plus un troisième détour. */
  const previousC28Text = STORY.c28.text;
  const previousC28Choices = STORY.c28.choices;

  STORY.c28.text = state => {
    let html = typeof previousC28Text === 'function' ? previousC28Text(state) : previousC28Text;
    html = String(html || '')
      .replace(
        'Plus loin, un <strong>tunnel étroit</strong> s’enfonce dans l’obscurité.',
        'Au-delà du camp, le <strong>passage principal</strong> continue de descendre dans l’obscurité.'
      );
    return html;
  };

  STORY.c28.choices = state => {
    const source = choicesOf(previousC28Choices, state).map(rerouteDepthChoice);

    if (state.flags?.campBranchesLocked || state.flags?.campCrisisStarted || state.flags?.campCrisisResolved) {
      return source;
    }

    /* Premier passage : uniquement vieux campement OU galerie condamnée. */
    return source.filter(choice => choice && choice.to !== 'c34' && choice.to !== 'c37');
  };

  /* Dès que la crise a eu lieu, « poursuivre vers les profondeurs » mène
     obligatoirement à la galerie descendante avant les fissures. */
  ['campCrisis', 'campEscapeResult', 'c30'].forEach(id => {
    const scene = STORY[id];
    if (!scene || scene.__depthReroutedV3) return;
    const oldChoices = scene.choices;
    scene.choices = state => choicesOf(oldChoices, state)
      .map(rerouteDepthChoice)
      /* Une ancienne option « explorer le tunnel voisin » ne doit jamais
         réapparaître : seule la sortie vers les profondeurs peut mener à c34. */
      .filter(choice => !(id === 'c30' && choice?.to === 'c34' && /explorer|tunnel voisin/i.test(choice.label || '')));
    scene.__depthReroutedV3 = true;
  });

  /* Nettoyage du texte du vieux campement pour les anciennes sauvegardes. */
  if (STORY.c30 && !STORY.c30.__descendingGalleryTextV3) {
    const oldText = STORY.c30.text;
    STORY.c30.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      return String(html || '')
        .replace('La galerie condamnée et le tunnel voisin s’ouvrent de part et d’autre.', 'La galerie condamnée reste sur le côté. Plus loin, le passage principal descend vers les profondeurs.')
        .replace('la galerie condamnée et le tunnel voisin', 'la galerie condamnée et le passage vers les profondeurs');
    };
    STORY.c30.__descendingGalleryTextV3 = true;
  }

  /* PAGE 34 devient la suite principale. L'ancien nom d'image est conservé
     uniquement comme identifiant d'asset ; il n'est pas affiché au lecteur. */
  if (STORY.c34) {
    STORY.c34.title = 'La galerie descendante';
    const oldText = STORY.c34.text;
    const oldChoices = STORY.c34.choices;

    STORY.c34.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      return String(html || '')
        .replace('t’engages dans le tunnel voisin', 't’engages dans la galerie descendante')
        .replace('Le passage descend doucement.', 'La galerie s’enfonce doucement vers les profondeurs.');
    };

    STORY.c34.choices = state => choicesOf(oldChoices, state)
      .filter(choice => choice && choice.to !== 'c30');
  }

  /* Parler sans approcher permet désormais de poursuivre : le disparu se tasse
     contre la paroi et laisse le héros passer. */
  if (STORY.c35) {
    const oldText = STORY.c35.text;
    STORY.c35.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      return String(html || '').replace(
        `<p>Tu recules sans la quitter des yeux, puis reprends le tunnel en sens inverse.</p>\n\n      <p>Lorsque tu retrouves le croisement, les sanglots continuent encore derrière toi. Tu n'as aucune envie de retourner dans ce tunnel.</p>`,
        `<p>La silhouette se tasse lentement contre la paroi, comme si elle avait compris que tu voulais passer.</p>\n\n      <p>Tu avances sans la toucher, l’arme basse mais prête. Elle ne relève pas la tête.</p>\n\n      <p>Lorsque tu t’éloignes, ses sanglots reprennent derrière toi. Tu continues vers les profondeurs sans te retourner.</p>`
      );
    };
    STORY.c35.choices = [{ label: 'Poursuivre la descente', to: 'c37' }];
  }

  /* Après le combat éventuel contre le disparu, on ne remonte plus au camp. */
  if (STORY.c38) {
    const oldChoices = STORY.c38.choices;
    STORY.c38.choices = state => choicesOf(oldChoices, state).map(choice => {
      if (!choice || choice.to !== 'c30') return choice;
      return { ...choice, label: 'Poursuivre dans la galerie descendante', to: 'c37' };
    });
  }

  STORY.c28.__campPage28EntryV3 = true;
})();