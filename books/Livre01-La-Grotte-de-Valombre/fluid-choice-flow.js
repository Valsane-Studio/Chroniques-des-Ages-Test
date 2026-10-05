/* DEV — Flux de choix intégral.
   Règle éditoriale :
   - toute décision / action / direction = encre bleue dans le récit ;
   - les intégrations écrites explicitement dans une scène sont prioritaires ;
   - tout choix non intégré explicitement est placé APRES la dernière phrase du récit ;
   - un choix unique est introduit par une phrase narrative, jamais par « tu dois » ;
   - le lancer de dés reste un contrôle encadré transparent ;
   - pendant une interaction tactique de combat, les réactions restent encadrées.
   Aucun placement automatique par ressemblance de mots n'est autorisé. */
(function () {
  'use strict';

  const storyText = document.getElementById('storyText');
  const choicesRoot = document.getElementById('choices');
  const storyCard = document.querySelector('.story-card');
  if (!storyText || !choicesRoot) return;

  const DIRECT_ROLL_RE = /^(?:jeter|relancer)\s+(?:les?|trois)\s+d[ée]s?\b|^lancer\s+(?:le|un|les|trois)\s+(?:trois\s+)?d[ée]s?\b/i;

  function buttonLabel(button) {
    return (button.querySelector('.choice-copy')?.textContent || button.textContent || '').trim();
  }

  function isDirectRollButton(button) {
    const label = buttonLabel(button);
    if (storyText.querySelector('.dice-test-waiting')) return true;
    return DIRECT_ROLL_RE.test(label);
  }

  function isCombatInteractionPhase() {
    return Boolean(storyText.querySelector('.combat-interaction-prompt, .shadow-tech-event'));
  }

  function cleanInlineLabel(label) {
    let text = String(label || '').trim().replace(/[.!?]+$/, '');
    text = text
      .replace(/\s+—\s+[^—]*(?:lancer|tester|test\s+de|épreuve\s+de|jet\s+de|dés?)\b.*$/i, '')
      .replace(/\s+—\s+\d+\s+restante?s?\b.*$/i, '')
      .replace(/\s*\((?=[^)]*(?:jet\s+de|test\s+de|dégâts?|riposte|dés?))[^)]*\)\s*$/i, '')
      .trim();
    if (!text) text = String(label || '').trim();
    return text.charAt(0).toLocaleLowerCase('fr-FR') + text.slice(1);
  }

  function inlineChoice(index, label) {
    const link = document.createElement('span');
    link.className = 'inline-story-choice inline-story-choice-in-text inline-story-pill fluid-choice-generated';
    link.dataset.choiceIndex = String(index);
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    link.textContent = cleanInlineLabel(label);
    return link;
  }

  function removeOldGeneratedFallback() {
    storyText.querySelectorAll('.fluid-choice-fallback-paragraph, .fluid-choice-sentence').forEach(el => el.remove());
  }

  function appendNarrativeSingleChoice(p, entry) {
    const label = cleanInlineLabel(entry.label);
    let match;

    function add(prefix, clickable, suffix) {
      if (prefix) p.appendChild(document.createTextNode(prefix));
      p.appendChild(inlineChoice(entry.index, clickable));
      if (suffix) p.appendChild(document.createTextNode(suffix));
    }

    if ((match = label.match(/^consulter\s+(.+)$/i))) {
      add('Plus loin se trouvent ', match[1], '.');
      return;
    }
    if ((match = label.match(/^examiner\s+(.+)$/i))) {
      add('Ton attention se porte sur ', match[1], '.');
      return;
    }
    if ((match = label.match(/^lire\s+(.+)$/i))) {
      add('Un peu plus loin, ', match[1], ' attire ton attention.');
      return;
    }
    if ((match = label.match(/^regarder\s+(.+)$/i))) {
      add('Ton regard se porte vers ', match[1], '.');
      return;
    }
    if ((match = label.match(/^reprendre\s+(.+)$/i))) {
      add('', match[1].charAt(0).toLocaleUpperCase('fr-FR') + match[1].slice(1), ' se poursuit devant toi.');
      return;
    }
    if ((match = label.match(/^poursuivre\s+vers\s+(.+)$/i))) {
      add('Le passage se poursuit vers ', match[1], '.');
      return;
    }
    if ((match = label.match(/^poursuivre\s+dans\s+(.+)$/i))) {
      add('Le chemin continue dans ', match[1], '.');
      return;
    }
    if ((match = label.match(/^continuer\s+(?:vers|dans)\s+(.+)$/i))) {
      add('Le chemin se prolonge vers ', match[1], '.');
      return;
    }
    if ((match = label.match(/^continuer\s+(.+)$/i))) {
      add('', match[1].charAt(0).toLocaleUpperCase('fr-FR') + match[1].slice(1), ' prolonge ton chemin.');
      return;
    }
    if ((match = label.match(/^rejoindre\s+(.+)$/i))) {
      add('Plus loin, ton chemin rejoint ', match[1], '.');
      return;
    }
    if ((match = label.match(/^gagner\s+(.+)$/i))) {
      add('Plus loin, le passage rejoint ', match[1], '.');
      return;
    }
    if ((match = label.match(/^entrer\s+dans\s+(.+)$/i))) {
      add('Devant toi s’ouvre ', match[1], '.');
      return;
    }
    if ((match = label.match(/^passer\s+(?:dans|sous)\s+(.+)$/i))) {
      add('Un passage mène vers ', match[1], '.');
      return;
    }
    if ((match = label.match(/^franchir\s+(.+)$/i))) {
      add('', match[1].charAt(0).toLocaleUpperCase('fr-FR') + match[1].slice(1), ' se dresse encore devant toi.');
      return;
    }
    if ((match = label.match(/^suivre\s+(.+)$/i))) {
      add('', match[1].charAt(0).toLocaleUpperCase('fr-FR') + match[1].slice(1), ' se poursuit devant toi.');
      return;
    }
    if ((match = label.match(/^traverser\s+(.+)$/i))) {
      add('', match[1].charAt(0).toLocaleUpperCase('fr-FR') + match[1].slice(1), ' s’étend devant toi.');
      return;
    }
    if ((match = label.match(/^retourner\s+(?:dans|vers|à|au|aux)\s+(.+)$/i))) {
      add('Le chemin te ramène vers ', match[1], '.');
      return;
    }
    if ((match = label.match(/^remonter(?:\s+(.+))?$/i))) {
      if (match[1]) add('Le passage remonte vers ', match[1], '.');
      else add('', 'Le passage remonte devant toi', '.');
      return;
    }
    if ((match = label.match(/^descendre(?:\s+(?:vers|dans)\s+)?(.+)?$/i))) {
      if (match[1]) add('Le passage descend vers ', match[1], '.');
      else add('', 'Le passage descend plus loin', '.');
      return;
    }

    const sentence = label.charAt(0).toLocaleUpperCase('fr-FR') + label.slice(1);
    add('', sentence, '.');
  }

  function appendFallback(entries) {
    if (!entries.length) return;

    const p = document.createElement('p');
    p.className = 'fluid-choice-fallback-paragraph';

    if (entries.length === 1) {
      appendNarrativeSingleChoice(p, entries[0]);
    } else {
      p.appendChild(document.createTextNode('Tu peux '));
      entries.forEach((entry, i) => {
        if (i > 0) {
          if (i === entries.length - 1) p.appendChild(document.createTextNode(entries.length === 2 ? ' ou ' : ', ou '));
          else p.appendChild(document.createTextNode(', '));
        }
        p.appendChild(inlineChoice(entry.index, entry.label));
      });
      p.appendChild(document.createTextNode('.'));
    }

    storyText.appendChild(p);
  }

  function syncChoices() {
    if (storyCard?.classList.contains('sheet-page')) return;

    removeOldGeneratedFallback();

    const buttons = Array.from(choicesRoot.querySelectorAll('.choice-btn'));
    if (!buttons.length) return;

    const interactionPhase = isCombatInteractionPhase();
    const existingIndexes = new Set(
      Array.from(storyText.querySelectorAll('.inline-story-choice[data-choice-index]'))
        .map(el => Number(el.dataset.choiceIndex))
        .filter(Number.isFinite)
    );

    const fallback = [];

    buttons.forEach((button, index) => {
      button.classList.remove('fluid-choice-source-hidden', 'fluid-roll-control', 'fluid-combat-interaction-control');

      if (isDirectRollButton(button)) {
        button.classList.add('fluid-roll-control');
        return;
      }

      if (interactionPhase) {
        button.classList.add('fluid-combat-interaction-control');
        return;
      }

      button.classList.add('fluid-choice-source-hidden');
      if (!existingIndexes.has(index)) fallback.push({ index, label: buttonLabel(button) });
    });

    appendFallback(fallback);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncChoices();
    });
  }

  new MutationObserver(schedule).observe(choicesRoot, { childList: true, subtree: true });
  schedule();

  const style = document.createElement('style');
  style.id = 'fluid-choice-flow-style';
  style.textContent = `
    #choices .choice-btn.fluid-choice-source-hidden {
      display: none !important;
    }

    .story-text .inline-story-choice,
    .story-text .inline-story-choice.inline-story-pill,
    .story-text .inline-story-choice-in-text,
    .story-text .fluid-choice-generated {
      display: inline !important;
      width: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      outline: none !important;
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      filter: none !important;
      color: #365f79 !important;
      -webkit-text-fill-color: #365f79 !important;
      text-shadow: none !important;
      font: inherit !important;
      font-weight: inherit !important;
      font-style: inherit !important;
      font-variant: inherit !important;
      text-transform: inherit !important;
      line-height: inherit !important;
      letter-spacing: inherit !important;
      text-align: inherit !important;
      vertical-align: baseline !important;
      cursor: pointer !important;
      white-space: normal !important;
      -webkit-tap-highlight-color: rgba(54,95,121,.16) !important;
      touch-action: manipulation;
    }

    .story-text .inline-story-choice:hover,
    .story-text .inline-story-choice:focus,
    .story-text .inline-story-choice:focus-visible {
      border: 0 !important;
      background: transparent !important;
      color: #294f68 !important;
      -webkit-text-fill-color: #294f68 !important;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: .12em;
    }

    .story-text .inline-story-choice:active,
    .story-text .inline-story-choice-pressed {
      border: 0 !important;
      background: transparent !important;
      color: #203f55 !important;
      -webkit-text-fill-color: #203f55 !important;
    }

    .fluid-choice-fallback-paragraph {
      font: inherit;
      color: inherit;
    }

    #choices .choice-btn.fluid-roll-control,
    #choices .choice-btn.fluid-roll-control:hover,
    #choices .choice-btn.fluid-roll-control:focus,
    #choices .choice-btn.fluid-roll-control:focus-visible,
    #choices .choice-btn.fluid-roll-control:active,
    #choices .choice-btn.fluid-combat-interaction-control,
    #choices .choice-btn.fluid-combat-interaction-control:hover,
    #choices .choice-btn.fluid-combat-interaction-control:focus,
    #choices .choice-btn.fluid-combat-interaction-control:focus-visible,
    #choices .choice-btn.fluid-combat-interaction-control:active {
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
      text-transform: none !important;
      letter-spacing: normal !important;
      line-height: 1.45 !important;
      text-align: left !important;
      transform: none !important;
    }

    #choices .choice-btn.fluid-roll-control .choice-copy,
    #choices .choice-btn.fluid-roll-control .choice-copy *,
    #choices .choice-btn.fluid-roll-control .choice-dest,
    #choices .choice-btn.fluid-combat-interaction-control .choice-copy,
    #choices .choice-btn.fluid-combat-interaction-control .choice-copy *,
    #choices .choice-btn.fluid-combat-interaction-control .choice-dest {
      color: #2b2117 !important;
      -webkit-text-fill-color: #2b2117 !important;
      text-shadow: none !important;
      font: inherit !important;
      text-transform: none !important;
      letter-spacing: normal !important;
      text-align: left !important;
    }

    #choices .choice-btn.fluid-roll-control .choice-arrow,
    #choices .choice-btn.fluid-roll-control .choice-dest,
    #choices .choice-btn.fluid-combat-interaction-control .choice-arrow,
    #choices .choice-btn.fluid-combat-interaction-control .choice-dest {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
})();
