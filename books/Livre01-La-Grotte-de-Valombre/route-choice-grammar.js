/* DEV — Grammaire visuelle finale des choix.
   - Navigation / direction / changement de lieu => cadre transparent.
   - Objet / découverte / lecture / fouille / interaction => encre bleue dans le récit.
   - Lancers de dés et interactions tactiques de combat gardent aussi leurs cadres.
   Ce fichier est chargé en dernier pour arbitrer les anciens prototypes sans les casser. */
(function () {
  'use strict';

  const storyText = document.getElementById('storyText');
  const choicesRoot = document.getElementById('choices');
  const storyCard = document.querySelector('.story-card');
  if (!storyText || !choicesRoot) return;

  function normalize(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, ' ')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function labelOf(button) {
    return (button.querySelector('.choice-copy')?.textContent || button.textContent || '').trim();
  }

  function isRouteChoice(label) {
    const n = normalize(label);

    /* Les verbes ci-dessous correspondent à un déplacement ou à un changement
       de lieu. Ils doivent toujours rester des contrôles séparés et encadrés. */
    return /(?:^|\s)(quitter|ressortir|sortir|revenir|retourner|rejoindre|poursuivre|continuer|reprendre|descendre|remonter|monter|gagner|regagner|franchir|traverser|suivre|entrer|passer|avancer|approcher|partir|fuir|courir)(?:\s|$)/.test(n)
      || /(?:^|\s)(s engager|t engager|te glisser|se glisser|s eloigner|t eloigner)(?:\s|$)/.test(n)
      || /^(achever la traversee|terminer la descente|prendre (?:le|la|les|un|une) (?:sentier|route|chemin|passage|barque|escalier|porte|galerie|avenue))\b/.test(n);
  }

  function unwrapRouteInline(index) {
    const nodes = Array.from(storyText.querySelectorAll(`.inline-story-choice[data-choice-index="${index}"]`));
    nodes.forEach(node => {
      const generatedParagraph = node.closest('.fluid-choice-fallback-paragraph');
      if (generatedParagraph) {
        generatedParagraph.remove();
        return;
      }
      node.replaceWith(document.createTextNode(node.textContent || ''));
    });
  }

  function applyGrammar() {
    if (storyCard?.classList.contains('sheet-page')) return;

    const buttons = Array.from(choicesRoot.querySelectorAll('.choice-btn'));
    if (!buttons.length) return;

    buttons.forEach((button, index) => {
      const route = isRouteChoice(labelOf(button));

      if (!route) {
        button.classList.remove('route-choice-control');
        return;
      }

      /* Si un ancien prototype avait intégré cette direction en bleu dans la
         phrase, elle redevient du texte normal. Le vrai choix réapparaît dessous. */
      unwrapRouteInline(index);

      button.classList.remove('fluid-choice-source-hidden', 'inline-choice-source-hidden');
      button.classList.add('route-choice-control');
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scheduled = false;
      applyGrammar();
    }));
  }

  /* On observe uniquement les reconstructions du contenu. Les changements de
     classes sont volontaires et ne doivent pas relancer l'observateur. */
  new MutationObserver(schedule).observe(choicesRoot, { childList: true, subtree: true });
  new MutationObserver(schedule).observe(storyText, { childList: true, subtree: true });
  schedule();

  const style = document.createElement('style');
  style.id = 'route-choice-grammar-style';
  style.textContent = `
    /* Navigation : même sobriété que les dés, mais clairement séparée du récit. */
    #choices .choice-btn.route-choice-control,
    #choices .choice-btn.route-choice-control:hover,
    #choices .choice-btn.route-choice-control:focus,
    #choices .choice-btn.route-choice-control:focus-visible,
    #choices .choice-btn.route-choice-control:active {
      display: block !important;
      width: 100% !important;
      min-height: 44px !important;
      margin: 7px 0 !important;
      padding: 10px 14px !important;
      border: 1px solid rgba(58,46,32,.72) !important;
      border-radius: 3px !important;
      outline: none !important;
      outline-offset: 0 !important;
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      color: #2b2117 !important;
      -webkit-text-fill-color: #2b2117 !important;
      text-shadow: none !important;
      font-family: var(--body-font, Georgia, 'Times New Roman', serif) !important;
      font-size: inherit !important;
      font-weight: 400 !important;
      font-style: normal !important;
      text-transform: none !important;
      letter-spacing: normal !important;
      line-height: 1.45 !important;
      text-align: left !important;
      transform: none !important;
    }

    #choices .choice-btn.route-choice-control:hover,
    #choices .choice-btn.route-choice-control:focus-visible {
      background: rgba(58,46,32,.03) !important;
      border-color: rgba(58,46,32,.84) !important;
    }

    #choices .choice-btn.route-choice-control .choice-copy,
    #choices .choice-btn.route-choice-control .choice-copy *,
    #choices .choice-btn.route-choice-control .choice-dest {
      color: #2b2117 !important;
      -webkit-text-fill-color: #2b2117 !important;
      text-shadow: none !important;
      font: inherit !important;
      text-transform: none !important;
      letter-spacing: normal !important;
      text-align: left !important;
    }

    #choices .choice-btn.route-choice-control .choice-arrow,
    #choices .choice-btn.route-choice-control .choice-dest {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
})();
