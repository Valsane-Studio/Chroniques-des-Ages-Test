/* DEV — Prototype "encre interactive" : uniquement des choix intégrés dans la prose. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book) return;

  /* Page 020 : les directions sont déjà décrites dans le récit.
     Elles deviennent directement interactives, sans bloc de choix ajouté ensuite. */
  const scene20 = book.story?.c20;
  if (scene20 && !scene20.__interactiveInkPrototype) {
    const originalText20 = scene20.text;
    scene20.text = state => {
      let html = typeof originalText20 === 'function' ? originalText20(state) : originalText20;
      if (!html) return html;

      html = html.replace(
        '<p>L’un <strong>descend</strong> dans l’obscurité, et de ce passage monte une <strong>forte odeur de soufre</strong>.</p>',
        '<p><span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="0" role="button" tabindex="0">L’un descend dans l’obscurité</span>, et de ce passage monte une forte odeur de soufre.</p>'
      );

      html = html.replace(
        '<p>L’autre continue tout droit et semble s’enfoncer dans un passage beaucoup plus étroit.</p>',
        '<p><span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="1" role="button" tabindex="0">L’autre continue tout droit et semble s’enfoncer dans un passage beaucoup plus étroit</span>.</p>'
      );

      return html;
    };
    scene20.__interactiveInkPrototype = true;
  }

  function install() {
    const storyText = document.getElementById('storyText');
    const choices = document.getElementById('choices');
    const chapterNumber = document.getElementById('chapterNumber');
    if (!storyText || !choices) return;

    let scheduled = false;

    function sourceButtons() {
      return Array.from(choices.querySelectorAll('.choice-btn'));
    }

    function syncInlineChoices() {
      scheduled = false;
      const buttons = sourceButtons();
      buttons.forEach(btn => btn.classList.remove('inline-choice-source-hidden'));

      /* Un bloc source disparaît uniquement si son équivalent est réellement
         présent dans le récit. Ainsi un échec d'intégration reste visible
         plutôt que de rendre un choix inaccessible. */
      const inlineIndexes = new Set(
        Array.from(storyText.querySelectorAll('.inline-story-choice[data-choice-index]'))
          .map(el => Number(el.dataset.choiceIndex))
          .filter(Number.isFinite)
      );

      inlineIndexes.forEach(index => {
        const source = buttons[index];
        if (source) source.classList.add('inline-choice-source-hidden');
      });
    }

    function scheduleSync() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(syncInlineChoices);
    }

    function activateInlineChoice(target) {
      if (!target || target.getAttribute('aria-disabled') === 'true') return;
      const index = Number(target.dataset.choiceIndex);
      if (!Number.isFinite(index)) return;
      const source = sourceButtons()[index];
      if (!source) return;
      target.classList.add('inline-story-choice-pressed');
      target.setAttribute('aria-disabled', 'true');
      source.click();
    }

    storyText.addEventListener('click', event => {
      const target = event.target.closest('.inline-story-choice[data-choice-index]');
      if (!target) return;
      activateInlineChoice(target);
    });

    storyText.addEventListener('keydown', event => {
      const target = event.target.closest('.inline-story-choice[data-choice-index]');
      if (!target || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      activateInlineChoice(target);
    });

    /* Le lecteur reconstruit le récit et les choix à chaque navigation.
       On observe les deux zones : cela rend le masquage indépendant de
       leur ordre exact de rendu. */
    const observer = new MutationObserver(scheduleSync);
    observer.observe(storyText, { childList: true, subtree: true });
    observer.observe(choices, { childList: true, subtree: true });
    if (chapterNumber) observer.observe(chapterNumber, { childList: true, characterData: true, subtree: true });

    scheduleSync();
  }

  const style = document.createElement('style');
  style.id = 'interactive-ink-prototype-style';
  style.textContent = `
    #choices .inline-choice-source-hidden {
      display: none !important;
    }

    /* Règle visuelle APHANES : une action intégrée au récit reste du texte.
       Bleu = interactif. Aucun cadre, aucun fond, aucune ombre. */
    #storyText .inline-story-choice.inline-story-pill,
    #storyText .inline-story-choice-in-text,
    #storyText .inline-story-choice.inline-story-pill:hover,
    #storyText .inline-story-choice-in-text:hover,
    #storyText .inline-story-choice.inline-story-pill:active,
    #storyText .inline-story-choice-in-text:active {
      -webkit-appearance: none !important;
      appearance: none !important;
      display: inline !important;
      width: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      outline: 0 !important;
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      filter: none !important;
      color: #365f79 !important;
      -webkit-text-fill-color: #365f79 !important;
      text-shadow: none !important;
      text-decoration: none !important;
      font: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
      letter-spacing: inherit !important;
      text-transform: none !important;
      text-align: inherit !important;
      vertical-align: baseline !important;
      white-space: normal !important;
      cursor: pointer !important;
      transform: none !important;
      -webkit-tap-highlight-color: rgba(54, 95, 121, .16) !important;
      touch-action: manipulation;
    }

    #storyText .inline-story-choice.inline-story-pill::before,
    #storyText .inline-story-choice.inline-story-pill::after,
    #storyText .inline-story-choice-in-text::before,
    #storyText .inline-story-choice-in-text::after {
      content: none !important;
      display: none !important;
    }

    #storyText .inline-story-choice-pressed {
      color: #203f55 !important;
      -webkit-text-fill-color: #203f55 !important;
    }

    #storyText .inline-story-choice.inline-story-pill:focus-visible,
    #storyText .inline-story-choice-in-text:focus-visible {
      outline: 1px dotted rgba(54, 95, 121, .75) !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
