/* DEV — Filet de sécurité pour les transitions narratives restantes.
   Une transition de lecture pure ne doit pas retomber sous forme de bulle :
   elle devient une action en encre bleue dans le flux du récit.
   Les combats, tests, actions système et interactions mécaniques restent en blocs. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book?.story) return;

  const TRANSITION_RE = /^(poursuivre|continuer|rejoindre|revenir|retourner|quitter|entrer|avancer|suivre|descendre|monter|franchir|reprendre|gagner|achever la traversée|terminer la traversée|traverser|passer|préparer la descente|prendre le sentier|prendre le passage|prendre la route|prendre l’escalier|longer la corniche|se glisser dans l’ouverture|se glisser par la trappe|se glisser sous l’arche|remonter l’échelle|remonter|sortir|s’éloigner|aller au village|partir vers|partir immédiatement|repartir vers)/i;
  const MECHANICAL_RE = /(jeter les dés|lancer les dés|lancer les trois dés|test de|tester ta|épreuve de|combat|affronter|attaquer|te défendre|faire face|frapper|tuer|achever aldren|lame de jet|pommeau|dégainer|charge|sentinelle|marcheur|rampant|créature|horde)/i;

  function choicesFor(scene, state) {
    const list = typeof scene?.choices === 'function' ? scene.choices(state) : (scene?.choices || []);
    return Array.isArray(list) ? list : [];
  }

  function isNarrativeTransition(choice) {
    if (!choice || typeof choice !== 'object') return false;
    if (!choice.to || !choice.label) return false;
    if (choice.action || choice.diceTest || choice.inlineCombat || choice.stay) return false;
    if (MECHANICAL_RE.test(choice.label)) return false;
    return TRANSITION_RE.test(choice.label);
  }

  function lowerInitial(text) {
    if (!text) return text;
    return text.charAt(0).toLocaleLowerCase('fr-FR') + text.slice(1);
  }

  function wrapScene(scene) {
    if (!scene || scene.__narrativeTransitionInk) return;
    const previousText = scene.text;

    scene.text = state => {
      let html = typeof previousText === 'function' ? previousText(state) : previousText;
      if (!html) return html;

      const choices = choicesFor(scene, state);
      const existing = new Set(
        Array.from(String(html).matchAll(/data-choice-index=["'](\d+)["']/g), match => Number(match[1]))
      );

      const remaining = choices
        .map((choice, index) => ({ choice, index }))
        .filter(({ choice, index }) => isNarrativeTransition(choice) && !existing.has(index));

      if (!remaining.length) return html;

      const links = remaining.map(({ choice, index }) => {
        const copy = lowerInitial(String(choice.label).trim().replace(/[.!?]+$/, ''));
        return `<span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="${index}" role="button" tabindex="0">${copy}</span>`;
      });

      let sentence = '';
      if (links.length === 1) {
        sentence = `Tu peux ${links[0]}.`;
      } else if (links.length === 2) {
        sentence = `Tu peux ${links[0]} ou ${links[1]}.`;
      } else {
        sentence = `Tu peux ${links.slice(0, -1).join(', ')}, ou ${links[links.length - 1]}.`;
      }

      return `${html}<p class="inline-story-transition-fallback">${sentence}</p>`;
    };

    scene.__narrativeTransitionInk = true;
  }

  Object.values(book.story).forEach(wrapScene);
})();
