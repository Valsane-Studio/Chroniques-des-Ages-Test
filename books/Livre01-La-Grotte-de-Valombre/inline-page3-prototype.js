/* DEV — Prototype page 003 : choix tactiles directement intégrés dans la prose. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c3;
  if (!scene || scene.__inlinePillsPrototype) return;

  const originalText = scene.text;
  const originalChoices = scene.choices;

  function availableChoices(state) {
    return typeof originalChoices === 'function' ? originalChoices(state) : (originalChoices || []);
  }

  function choiceIndex(state, label) {
    return availableChoices(state).findIndex(choice => choice?.label === label);
  }

  function pill(state, label, copy) {
    const index = choiceIndex(state, label);
    if (index < 0) return '';
    return `<span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="${index}" role="button" tabindex="0"><span class="inline-story-choice-copy">${copy}</span></span>`;
  }

  scene.text = state => {
    let html = typeof originalText === 'function' ? originalText(state) : originalText;
    if (!html) return html;

    const merchant = pill(state, 'Voir le marchand', 'tu peux passer le voir');
    const forge = pill(state, 'Voir la forgeronne', 'la forge est également ouverte');
    const street = pill(state, 'Approcher la personne dans la ruelle', 'une silhouette attend dans la ruelle');
    const leave = pill(state, 'Partir vers la grotte', 'tu peux quitter Valombre et prendre la route de la grotte');

    if (!forge || !leave) return html;

    let opportunities = '';
    if (merchant) {
      opportunities += `Le marchand se tient sous son auvent, ${merchant} ; il a souvent quelques potions à proposer. `;
    }
    opportunities += `${forge} : les flammes du fourneau sont visibles depuis l’extérieur`;
    if (street) opportunities += `, tandis qu’${street}.`;
    else opportunities += '.';

    const replacement = `
      <p class="inline-story-sentence">${opportunities}</p>
      <p class="inline-story-sentence">Si rien d’autre ne te retient ici, ${leave}.</p>
    `;

    return html
      .replace(/<p>[^<]*(?:Le marchand|La forge|Une silhouette)[\s\S]*?<\/p>\s*<p>Tu peux encore prendre le temps de faire ce qui te semble utile — ou quitter le village\.<\/p>/, replacement)
      .replace('<p>Tu peux encore prendre le temps de faire ce qui te semble utile — ou quitter le village.</p>', replacement);
  };

  scene.__inlinePillsPrototype = true;

  /* La convention est annoncée une seule fois dans les règles du livre. */
  const rulesScene = book.story?.startRules;
  if (rulesScene && !rulesScene.__interactiveInkHint) {
    const originalRulesText = rulesScene.text;
    rulesScene.text = state => {
      let html = typeof originalRulesText === 'function' ? originalRulesText(state) : originalRulesText;
      if (!html) return html;
      const hint = `
        <div class="interactive-ink-hint" role="note">
          <p>Certains passages du récit apparaissent en <span class="interactive-ink-sample">bleu</span>. Ils indiquent une action possible : touche-les pour agir.</p>
        </div>
      `;
      return html.includes('interactive-ink-hint')
        ? html
        : html.replace('<div class="hero-weapon">', `${hint}<div class="hero-weapon">`);
    };
    rulesScene.__interactiveInkHint = true;
  }

  const style = document.createElement('style');
  style.id = 'inline-page3-prototype-style';
  style.textContent = `
    .inline-story-sentence {
      line-height: inherit;
    }

    .inline-story-choice.inline-story-pill {
      -webkit-appearance: none;
      appearance: none;
      display: inline;
      width: auto;
      max-width: none;
      min-height: 0;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: #365f79;
      font: inherit;
      font-weight: inherit;
      line-height: inherit;
      text-align: inherit;
      vertical-align: baseline;
      white-space: normal;
      box-shadow: none;
      cursor: pointer;
      -webkit-tap-highlight-color: rgba(54, 95, 121, .16);
      touch-action: manipulation;
    }

    .inline-story-choice.inline-story-pill::after {
      content: none;
    }

    .inline-story-choice.inline-story-pill .inline-story-choice-copy {
      display: inline;
    }

    .inline-story-choice.inline-story-pill:active {
      color: #203f55;
      background: transparent;
      border: 0;
      transform: none;
    }

    .inline-story-choice.inline-story-pill:focus-visible {
      outline: 1px dotted rgba(54, 95, 121, .75);
      outline-offset: 2px;
    }

    .interactive-ink-hint {
      margin: 14px 0;
      padding: 0;
      border: 0;
      background: transparent;
    }

    .interactive-ink-hint p {
      margin: 0;
    }

    .interactive-ink-sample {
      color: #365f79;
    }

    @media (max-width: 700px) {
      .inline-story-sentence {
        line-height: inherit;
      }

      .inline-story-choice.inline-story-pill {
        margin: 0;
        padding: 0;
        line-height: inherit;
      }
    }
  `;
  document.head.appendChild(style);
})();
