/* Livre 02 — choix allégés : même langage graphique que le Livre 01. */
(function () {
  'use strict';
  const style = document.createElement('style');
  style.id = 'providence-choice-flow-style';
  style.textContent = `
    #choices .choice-btn,
    #choices .choice-btn:hover,
    #choices .choice-btn:focus,
    #choices .choice-btn:focus-visible,
    #choices .choice-btn:active {
      width: 100% !important;
      min-height: 44px !important;
      margin: 5px 0 !important;
      padding: 10px 14px !important;
      border: 1px solid rgba(58, 46, 32, .72) !important;
      border-radius: 3px !important;
      outline: none !important;
      outline-offset: 0 !important;
      background: transparent !important;
      background-image: none !important;
      background-color: transparent !important;
      box-shadow: none !important;
      filter: none !important;
      color: #2b2117 !important;
      -webkit-text-fill-color: #2b2117 !important;
      text-shadow: none !important;
      font-family: var(--body-font, Georgia, 'Times New Roman', serif) !important;
      font-size: inherit !important;
      font-weight: 400 !important;
      line-height: 1.45 !important;
      letter-spacing: normal !important;
      text-align: left !important;
      transform: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    #choices .choice-btn::before,
    #choices .choice-btn::after {
      content: none !important;
      display: none !important;
    }
    #choices .choice-btn .choice-arrow,
    #choices .choice-btn .choice-dest {
      display: none !important;
    }
    #choices .choice-btn .choice-copy,
    #choices .choice-btn .choice-copy > span,
    #choices .choice-btn .choice-copy * {
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      transform: none !important;
      display: block !important;
      text-align: left !important;
      color: #2b2117 !important;
      -webkit-text-fill-color: #2b2117 !important;
      text-shadow: none !important;
      opacity: 1 !important;
      filter: none !important;
      font-family: var(--body-font, Georgia, 'Times New Roman', serif) !important;
      font-size: inherit !important;
      font-weight: 400 !important;
      line-height: 1.45 !important;
      letter-spacing: normal !important;
    }
    #choices .choice-btn:hover,
    #choices .choice-btn:focus-visible {
      background: rgba(58, 46, 32, .03) !important;
      border-color: rgba(58, 46, 32, .84) !important;
    }
    #choices .choice-btn:active {
      background: rgba(58, 46, 32, .055) !important;
      border-color: rgba(58, 46, 32, .9) !important;
    }
    #choices .choice-btn:disabled { opacity: .48 !important; }
    .story-text .inline-story-choice,
    .story-text .inline-story-choice.inline-story-pill,
    .story-text .inline-story-choice-in-text {
      display: inline !important;
      margin: 0 .03em !important;
      padding: .04em .24em !important;
      border: 1px solid rgba(58, 46, 32, .54) !important;
      border-radius: 3px !important;
      outline: none !important;
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      filter: none !important;
      color: #2b2117 !important;
      -webkit-text-fill-color: #2b2117 !important;
      text-shadow: none !important;
      font: inherit !important;
      vertical-align: baseline !important;
      cursor: pointer !important;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
      -webkit-tap-highlight-color: transparent !important;
      touch-action: manipulation;
    }
    @media (max-width: 700px) {
      #choices .choice-btn {
        min-height: 44px !important;
        padding: 9px 11px !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
