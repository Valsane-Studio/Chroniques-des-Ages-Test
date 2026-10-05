/* Livre 02 — confort d'interface commun au Livre 01, sans toucher au récit. */
(function () {
  'use strict';
  const book = window.BookRegistry?.get?.('providence-02');
  if (!book) return;
  const storyText = document.getElementById('storyText');
  const DEX_RULE_HTML = 'Lance les <strong>trois dés</strong> et additionne-les. Si le total est <strong>inférieur ou égal à ta Dextérité</strong>, le test est réussi.';
  function addDexterityHelp() {
    const panel = storyText?.querySelector('.dice-test-waiting');
    if (!panel || panel.querySelector('.dice-test-help')) return;
    if (!/Dext[ée]rit[ée]/i.test(panel.textContent || '')) return;
    const help = document.createElement('p');
    help.className = 'dice-test-help';
    help.innerHTML = DEX_RULE_HTML;
    const diceFaces = panel.querySelector('.dice-faces');
    if (diceFaces) panel.insertBefore(help, diceFaces);
    else panel.appendChild(help);
  }
  if (storyText) {
    new MutationObserver(addDexterityHelp).observe(storyText, { childList:true, subtree:true, characterData:true });
    addDexterityHelp();
  }
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (modal && closeModalBtn) {
    modal.addEventListener('click', event => {
      if (modal.dataset.panel === 'inventory' && event.target === modal) closeModalBtn.click();
    });
  }
  const style = document.createElement('style');
  style.id = 'providence-feedback-ui';
  style.textContent = `
    #modal[data-panel="inventory"] > .modal-card > .drawer-head {
      position: sticky;
      top: -18px;
      z-index: 25;
      margin: -18px -18px 12px;
      padding: 18px 18px 12px;
      background: #eadfbe;
      border-bottom: 1px solid rgba(97, 73, 42, .22);
    }
    #modal[data-panel="inventory"] #closeModalBtn { position:relative; z-index:26; }
    .dice-test-waiting .dice-test-help {
      max-width:520px;
      margin:8px auto 14px;
      line-height:1.45;
    }
  `;
  document.head.appendChild(style);
})();
