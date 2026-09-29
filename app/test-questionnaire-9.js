/* APHANES TEST — échelle questionnaire 1 à 9.
   Cette surcouche ne touche pas au stockage Supabase : elle ajuste uniquement
   l'interface du questionnaire TEST pour conserver un vrai centre sur 5. */
(function () {
  'use strict';

  function applyNinePointScale(root = document) {
    const feedback = root.querySelector?.('#testFeedback') || document.getElementById('testFeedback');
    if (!feedback) return;

    feedback.querySelectorAll('.test-feedback-dots').forEach(group => {
      const ten = group.querySelector('.test-feedback-dot[data-value="10"]');
      if (ten) ten.remove();

      group.querySelectorAll('.test-feedback-dot').forEach(dot => {
        dot.setAttribute('aria-label', `${dot.dataset.value} sur 9`);
      });
    });
  }

  const style = document.createElement('style');
  style.id = 'testQuestionnaireNinePointStyle';
  style.textContent = `
    .test-feedback-labels,
    .test-feedback-dots {
      grid-template-columns: repeat(9, minmax(0, 1fr)) !important;
    }

    .test-feedback-labels {
      margin-bottom: 9px !important;
      min-height: 3em !important;
    }

    .test-feedback-label {
      font-size: .84rem !important;
      line-height: 1.18 !important;
    }

    .test-feedback-label.low {
      grid-column: 1 / span 2 !important;
      text-align: left !important;
    }

    .test-feedback-label.mid {
      grid-column: 4 / span 3 !important;
      text-align: center !important;
    }

    .test-feedback-label.high {
      grid-column: 8 / span 2 !important;
      text-align: right !important;
    }

    @media (max-width: 520px) {
      .test-feedback-label {
        font-size: .74rem !important;
      }
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => applyNinePointScale(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', () => applyNinePointScale(document));
  window.addEventListener('load', () => applyNinePointScale(document));
  setTimeout(() => applyNinePointScale(document), 50);
  setTimeout(() => applyNinePointScale(document), 250);
})();
