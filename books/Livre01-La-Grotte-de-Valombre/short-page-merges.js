/* DEV — Regroupement des micro-pages qui ne portent aucun vrai choix intermédiaire. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book?.story) return;

  const page190 = book.story.c173;
  const page191 = book.story.c174;

  /* Pages 190 + 191 : une seule conversation continue.
     L'unique choix intermédiaire (« pourquoi la voix s'est tue ») ne justifie pas
     un changement de page. On conserve c174 intact pour les anciennes sauvegardes. */
  if (page190 && page191 && !page190.__mergedWith191) {
    const text190 = page190.text;
    const text191 = page191.text;
    const choices191 = page191.choices;

    page190.text = state => {
      const first = typeof text190 === 'function' ? text190(state) : text190;
      const second = typeof text191 === 'function' ? text191(state) : text191;
      return `${first || ''}${second || ''}`;
    };

    page190.choices = choices191;
    page190.__mergedWith191 = true;
  }
})();
