/* Femme du dédale — conséquence du choix de la page 193.
   Si le joueur refuse de l'achever, elle réapparaît transformée dans
   la caverne des condamnés, juste avant le réveil de la horde. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c201;
  if (!scene || scene.__labyrinthWomanPayoffV1) return;

  const originalText = scene.text;

  scene.text = state => {
    const html = typeof originalText === 'function' ? originalText(state) : originalText;
    if (state?.flags?.labyrinthWomanFate !== 'spared') return html;

    const returnText = `<p>Une silhouette se redresse plus près de toi que les autres.</p>
      <p>Tu reconnais ses vêtements avant son visage.</p>
      <p><strong>La femme du dédale.</strong></p>
      <p>Son corps s’est tordu, ses traits ont presque disparu sous la terre noire. Elle ouvre la bouche comme pour parler, mais seul un râle en sort.</p>
      <p>Elle avait raison. Elle s’est relevée autrement.</p>`;

    const marker = '<p>Un autre craquement répond au loin';
    if (String(html || '').includes(marker)) {
      return String(html).replace(marker, `${returnText}${marker}`);
    }
    return `${html || ''}${returnText}`;
  };

  scene.__labyrinthWomanPayoffV1 = true;
})();
