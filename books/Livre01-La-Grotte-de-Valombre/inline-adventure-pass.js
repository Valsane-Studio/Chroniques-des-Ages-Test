/* DEV — Intégrations volontaires seulement.
   Règle :
   - plusieurs chemins réellement visibles peuvent être cliquables au moment où ils sont décrits ;
   - un objet / une interaction facultative peut être cliquable au moment de sa découverte ;
   - un choix unique de continuation n'est JAMAIS injecté ici : il reste en fin de scène.
*/
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book?.story) return;

  const to = destination => choice => choice?.to === destination;

  function choicesFor(scene, state) {
    return typeof scene?.choices === 'function' ? scene.choices(state) : (scene?.choices || []);
  }

  function choiceIndex(scene, state, matcher) {
    const list = choicesFor(scene, state);
    if (typeof matcher === 'function') return list.findIndex(matcher);
    const labels = Array.isArray(matcher) ? matcher : [matcher];
    return list.findIndex(choice => labels.includes(choice?.label));
  }

  function ink(scene, state, matcher, copy) {
    const index = choiceIndex(scene, state, matcher);
    if (index < 0) return null;
    return {
      index,
      html: `<span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="${index}" role="button" tabindex="0">${copy}</span>`
    };
  }

  function alreadyIntegrated(html, index) {
    return html.includes(`data-choice-index="${index}"`);
  }

  function mark(html, scene, state, matcher, needle, copy) {
    const token = ink(scene, state, matcher, copy);
    if (!token || alreadyIntegrated(html, token.index)) return html;
    if (typeof needle === 'string') return html.includes(needle) ? html.replace(needle, token.html) : html;
    if (needle instanceof RegExp) return html.replace(needle, token.html);
    return html;
  }

  function appendChoiceSentence(html, scene, state, matcher, copy, sentence) {
    const token = ink(scene, state, matcher, copy);
    if (!token || alreadyIntegrated(html, token.index)) return html;
    return `${html}${sentence(token.html)}`;
  }

  function wrap(id, transform) {
    const scene = book.story[id];
    if (!scene || scene.__globalInteractiveInkPass) return;
    const previous = scene.text;
    scene.text = state => {
      const html = typeof previous === 'function' ? previous(state) : previous;
      return html ? transform(String(html), state, scene) : html;
    };
    scene.__globalInteractiveInkPass = true;
  }

  /* PAGE 028 — plusieurs pistes réellement visibles dans le camp. */
  wrap('c28', (html, state, scene) => {
    html = mark(html, scene, state, to('c30'), '<strong>ancien campement</strong>', 'ancien campement');
    html = mark(html, scene, state, to('c31'), 'une galerie est presque entièrement <strong>barrée par un énorme bloc de pierre</strong>', 'une galerie presque entièrement barrée par un énorme bloc de pierre');
    html = mark(html, scene, state, to('c34'), 'un <strong>tunnel étroit</strong> s’enfonce dans l’obscurité', 'un tunnel étroit qui s’enfonce dans l’obscurité');
    html = appendChoiceSentence(html, scene, state, to('c37'), 'un passage plus sombre qui poursuit la descente', token => `<p>Derrière le feu, ${token} disparaît sous la roche.</p>`);
    return html;
  });

  /* PAGE 040 — trois voies visibles dans le paysage. */
  wrap('c40', (html, state, scene) => {
    html = mark(html, scene, state, to('c41'), 'un sentier descend vers une étendue d’eau parfaitement noire', 'un sentier descend vers une étendue d’eau parfaitement noire');
    html = mark(html, scene, state, to('c44'), 'un ancien escalier de pierre grimpe le long de la falaise', 'un ancien escalier de pierre grimpe le long de la falaise');
    html = mark(html, scene, state, to('c58'), 'une corniche étroite rejoint un pont suspendu au-dessus d’un gouffre sans fond visible', 'une corniche étroite rejoint un pont suspendu au-dessus d’un gouffre sans fond visible');
    return html;
  });

  /* PAGE 055 — deux chemins réellement possibles. */
  wrap('c55', (html, state, scene) => {
    html = mark(html, scene, state, to('c56'), 'entrer dans la fissure', 'entrer dans la fissure');
    html = mark(html, scene, state, to('c57'), 'continuer à monter', 'continuer à monter');
    return html;
  });

  /* PAGE 085 — référence positive : deux issues déjà présentes dans le récit. */
  wrap('c85', (html, state, scene) => {
    html = mark(html, scene, state, to('c86'), 'Une fissure étroite', 'Une fissure étroite');
    html = mark(html, scene, state, to('c91'), 'La sortie des quartiers', 'La sortie des quartiers');
    return html;
  });

  /* PAGE 102 — deux interactions facultatives et une sortie. */
  wrap('c102', (html, state, scene) => {
    html = mark(html, scene, state, to('c103'), 'Un vieux mécanisme grince', 'Un vieux mécanisme grince');
    html = mark(html, scene, state, to('c138'), 'Une armoire éventrée', 'Une armoire éventrée');
    html = mark(html, scene, state, to('c197'), 'Le couloir continue au-delà', 'Le couloir continue au-delà');
    return html;
  });

  /* PAGE 106 — trois directions physiques. */
  wrap('c106', (html, state, scene) => {
    html = mark(html, scene, state, to('c107'), 'un poste de secours', 'un poste de secours');
    html = mark(html, scene, state, to('c108'), 'une petite réserve', 'une petite réserve');
    html = mark(html, scene, state, to('c109'), 'un escalier descendant', 'un escalier descendant');
    return html;
  });

  /* PAGE 107 — objets / lieux facultatifs visibles. */
  wrap('c107', (html, state, scene) => {
    html = mark(html, scene, state, to('c139'), 'Une haute armoire médicale', 'Une haute armoire médicale');
    html = mark(html, scene, state, to('c184'), 'quelques livres oubliés', 'quelques livres oubliés');
    html = mark(html, scene, state, to('c186'), 'la trappe secrète', 'la trappe secrète');
    return html;
  });

  /* PAGE 131 — objet facultatif + continuation. */
  wrap('c131', (html, state, scene) => {
    html = mark(html, scene, state, to('c65'), 'fouiller sa sacoche', 'fouiller sa sacoche');
    html = mark(html, scene, state, to('c64'), 'poursuivre vers la porte', 'poursuivre vers la porte');
    return html;
  });

  /* PAGE 152 — échappatoires physiques pendant la menace. */
  wrap('c152', (html, state, scene) => {
    html = mark(html, scene, state, to('c155'), 'un renfoncement peut te dissimuler', 'un renfoncement peut te dissimuler');
    html = mark(html, scene, state, to('c157'), 'une fente étroite s’ouvre dans la roche', 'une fente étroite s’ouvre dans la roche');
    return html;
  });

  /* PAGE 180 — objet facultatif + départ. */
  wrap('c163', (html, state, scene) => {
    html = mark(html, scene, state, to('c164'), 'Une sacoche reste prise sous la sangle d’un manteau', 'Une sacoche reste prise sous la sangle d’un manteau');
    html = mark(html, scene, state, to('c165'), 'Tu dois repartir', 'Tu dois repartir');
    return html;
  });

  /* PAGE 185 — deux passages physiques. */
  wrap('c168', (html, state, scene) => {
    html = mark(html, scene, state, to('c169'), 'une ouverture à peine assez large pour ramper subsiste', 'une ouverture à peine assez large pour ramper subsiste');
    html = mark(html, scene, state, to('c170'), 'des dalles disjointes dessinent un passage plus direct au-dessus d’un gouffre', 'des dalles disjointes dessinent un passage plus direct au-dessus d’un gouffre');
    return html;
  });

  /* PAGE 203 — éléments facultatifs de la cache. */
  wrap('c186', (html, state, scene) => {
    html = mark(html, scene, state, to('c187'), 'un cahier couvert d’une écriture serrée', 'un cahier couvert d’une écriture serrée');
    html = mark(html, scene, state, to('c188'), 'Un grand coffre est ouvert', 'Un grand coffre est ouvert');
    return html;
  });

  wrap('c187', (html, state, scene) =>
    mark(html, scene, state, to('c188'), 'le coffre ouvert', 'le coffre ouvert'));

  /* PAGE 223 — trois passages visibles. */
  wrap('c223', (html, state, scene) => {
    html = mark(html, scene, state, to('c224'), 'Une petite échelle de corde', 'Une petite échelle de corde');
    html = mark(html, scene, state, to('c226'), 'des prises irrégulières courent le long de la paroi', 'des prises irrégulières courent le long de la paroi');
    html = mark(html, scene, state, to('c230'), 'une fissure juste assez large pour t’y glisser', 'une fissure juste assez large pour t’y glisser');
    return html;
  });

  /* PAGE 234 — deux voies de retour. */
  wrap('c234', (html, state, scene) => {
    html = mark(html, scene, state, to('c224'), 'L’échelle de corde', 'L’échelle de corde');
    html = mark(html, scene, state, to('c226'), 'les prises sur la gauche', 'les prises sur la gauche');
    return html;
  });

  /* PAGE 238 — deux issues physiques ; l'ampoule reste une action d'inventaire. */
  wrap('c238', (html, state, scene) => {
    html = mark(html, scene, state, to('c234'), 'l’étroit passage par lequel tu es entré', 'l’étroit passage par lequel tu es entré');
    html = mark(html, scene, state, to('c232'), 'La sortie est de l’autre côté de la salle', 'La sortie est de l’autre côté de la salle');
    return html;
  });
})();