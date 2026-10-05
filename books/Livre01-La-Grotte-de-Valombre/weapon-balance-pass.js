/* DEV — Règles d’armes lisibles et cohérentes dans tout le Livre 01.
   Petite épée : DEX ±0 / Puissance 2
   Grosse épée : DEX -2 / Puissance 4
   Lame noire : DEX ±0 / Puissance 6
   Épée rouge : DEX ±0 / Puissance 8

   Ce patch est chargé en dernier afin d’harmoniser aussi les anciens combats
   et les prototypes DEV qui avaient conservé les anciennes valeurs. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!book || !STORY || book.__weaponBalancePassV1) return;

  const rules = book.rules || (book.rules = {});
  const oldRuleDex = typeof rules.currentDexterity === 'function' ? rules.currentDexterity : null;
  const oldRulePower = typeof rules.combatPower === 'function' ? rules.combatPower : null;
  const ACTIVE = Symbol('weaponBalanceDexComp');

  function dexDelta(state) {
    if (state?.weapon === 'heavy') return 2;       // ancien -4 -> nouveau -2
    if (state?.weapon === 'light') return 1;       // ancien -1 -> nouveau 0
    if (state?.weapon === 'sorcerer_sword') return 1; // ancien -1 -> nouveau 0
    return 0;
  }

  function desiredPower(state) {
    if (state?.weapon === 'heavy') return 4;
    if (state?.weapon === 'light') return 2;
    if (state?.weapon === 'black_blade') return 6;
    if (state?.weapon === 'sorcerer_sword') return 8;
    return 0;
  }

  function balancedDexterity(state) {
    const base = oldRuleDex ? Number(oldRuleDex(state)) : Number(state?.baseDexterity || 13);
    return base + (state?.[ACTIVE] ? 0 : dexDelta(state));
  }

  rules.currentDexterity = balancedDexterity;
  rules.combatPower = desiredPower;

  /* Les anciennes fonctions du book.js et de certains prototypes ferment sur
     l’ancienne fonction currentDexterity. Pendant leur exécution seulement,
     on compense donc l’ancien malus dans dexBonus. Aucun bonus n’est sauvegardé. */
  function withDexComp(state, fn) {
    if (!state || typeof fn !== 'function' || state[ACTIVE]) return fn();
    const delta = dexDelta(state);
    if (!delta) return fn();
    const before = Number(state.dexBonus || 0);
    state[ACTIVE] = true;
    state.dexBonus = before + delta;
    try { return fn(); }
    finally {
      state.dexBonus = before;
      delete state[ACTIVE];
    }
  }

  function rewriteWeaponText(html) {
    return String(html == null ? '' : html)
      .replace(/<strong>Épée lourde de Sir Aldren<\/strong> — Puissance : <strong>5<\/strong> · Dextérité de base avec cette arme : <strong>9<\/strong>\./g,
        '<strong>Épée lourde de Sir Aldren</strong> — Puissance : <strong>4</strong> · Dextérité : <strong>−2</strong>.')
      .replace(/<strong>Épée lourde de Sir Aldren<\/strong> — Puissance : <strong>5<\/strong> · Dextérité : <strong>9<\/strong>\./g,
        '<strong>Épée lourde de Sir Aldren</strong> — Puissance : <strong>4</strong> · Dextérité : <strong>−2</strong>.')
      .replace(/<strong>Épée de la forgeronne<\/strong> — Puissance : <strong>2<\/strong> · Dextérité de base avec cette arme : <strong>12<\/strong>\./g,
        '<strong>Épée de la forgeronne</strong> — Puissance : <strong>2</strong> · Dextérité : <strong>inchangée</strong>.')
      .replace(/<strong>Épée de la forgeronne<\/strong> — Puissance : <strong>2<\/strong> · Dextérité : <strong>12<\/strong>\./g,
        '<strong>Épée de la forgeronne</strong> — Puissance : <strong>2</strong> · Dextérité : <strong>inchangée</strong>.')
      .replace(/Puissance 8, Dextérité −1\. Légère et très bien équilibrée\./g,
        'Puissance 8, Dextérité inchangée. Légère et très bien équilibrée.')
      .replace(/Puissance 8, Dextérité −1\./g, 'Puissance 8, Dextérité inchangée.')
      .replace(/Grosse épée · DEX −4 · Puissance 5/g, 'Grosse épée · DEX −2 · Puissance 4')
      .replace(/Petite épée · DEX −1 · Puissance 2/g, 'Petite épée · DEX ±0 · Puissance 2')
      .replace(/Épée rouge · DEX −1 · Puissance 8/g, 'Épée rouge · DEX ±0 · Puissance 8')
      .replace(/DEX −4 · Puissance 5/g, 'DEX −2 · Puissance 4')
      .replace(/DEX −1 · Puissance 2/g, 'DEX ±0 · Puissance 2')
      .replace(/DEX −1 · Puissance 8/g, 'DEX ±0 · Puissance 8');
  }

  /* Barre de caractéristiques : valeurs finales, pas les anciennes valeurs
     lexicales du book.js. */
  if (typeof book.statusStats === 'function') {
    const oldStatusStats = book.statusStats;
    book.statusStats = state => {
      const stats = withDexComp(state, () => oldStatusStats(state)) || [];
      return stats.map(stat => {
        if (stat?.label === 'Dextérité') return { ...stat, value:String(balancedDexterity(state)) };
        if (stat?.label === 'Arme') return { ...stat, value:state.weapon === 'none' ? '0' : `+${desiredPower(state)}` };
        return stat;
      });
    };
  }

  /* Fiche personnage : l’ancien rendu bénéficie déjà de la compensation DEX ;
     on rectifie seulement les dégâts de la grosse épée (7 -> 6). */
  if (typeof book.characterSheetHtml === 'function') {
    const oldCharacterSheet = book.characterSheetHtml;
    book.characterSheetHtml = state => {
      let html = withDexComp(state, () => oldCharacterSheet(state));
      if (state.weapon === 'heavy') {
        html = String(html || '').replace(
          /(<p><strong>Dégâts si tu remportes un échange :<\/strong>\s*)7(<\/p>)/,
          '$16$2'
        );
      }
      return rewriteWeaponText(html);
    };
  }

  /* Inventaire : description et encart d’équipement. */
  if (book.inventory) {
    if (typeof book.inventory.displayEntries === 'function') {
      const oldDisplayEntries = book.inventory.displayEntries;
      book.inventory.displayEntries = state => {
        const entries = oldDisplayEntries(state) || [];
        return entries.map(([id, item]) => {
          if (!item || typeof item !== 'object') return [id, item];
          const copy = { ...item, description:rewriteWeaponText(item.description || '') };
          if (id === 'epee_sorciere') copy.description = 'Épée rouge du forgeron-sorcier : Puissance 8, Dextérité inchangée. Légère et très bien équilibrée.';
          return [id, copy];
        });
      };
    }
    if (typeof book.inventory.extraHtml === 'function') {
      const oldExtraHtml = book.inventory.extraHtml;
      book.inventory.extraHtml = state => {
        let html = withDexComp(state, () => oldExtraHtml(state));
        html = rewriteWeaponText(html);
        if (state.weapon === 'heavy') {
          html = html.replace(/DEX −4\s*·\s*Puissance 5/g, 'DEX −2 · Puissance 4');
        } else if (state.weapon === 'light') {
          html = html.replace(/DEX −1\s*·\s*Puissance 2/g, 'DEX ±0 · Puissance 2');
        } else if (state.weapon === 'sorcerer_sword') {
          html = html.replace(/DEX −1\s*·\s*Puissance 8/g, 'DEX ±0 · Puissance 8');
        }
        return html;
      };
    }
  }

  /* ---------------------------------------------------------------
     Correction de la seule différence de dégâts restante : book.js
     calcule encore en fermeture Puissance 5 pour l’épée lourde.
     Les autres armes ont déjà la bonne puissance historique.
     --------------------------------------------------------------- */
  function snapshot(state) {
    const combats = {};
    for (const [key, c] of Object.entries(state.combats || {})) {
      combats[key] = { hp:Number(c?.hp), round:Number(c?.round || 0), last:c?.last || null };
    }
    const fk = state.flags?.finalKnights;
    return {
      combats,
      anselmeHp:Number(state.flags?.anselmeRaidersHp),
      anselmeRound:state.flags?.anselmeFirstRound || null,
      circle:state.flags?.isletCircleRoll || null,
      finalKnights:fk ? {
        hp:Array.isArray(fk.hp) ? [...fk.hp] : null,
        armor:Array.isArray(fk.armor) ? [...fk.armor] : null,
        firstDown:fk.firstDown,
        phase:fk.phase,
        last:fk.last || null
      } : null
    };
  }

  function fixStandardHeavyCombat(state, before) {
    for (const [key, c] of Object.entries(state.combats || {})) {
      const prev = before.combats[key];
      if (!prev || !c?.last || (c.last === prev.last && Number(c.round || 0) === prev.round)) continue;
      const r = c.last;
      if (r.outcome !== 'hero') continue;

      let wantedDamage = null;
      let wantedPower = null;
      if (key === 'isletCrawler' && state.flags?.isletTactic === 'vertical' && Number(r.heroWeaponPower) === 3) {
        wantedDamage = 4; // 2 + Puissance 4 - pénalité tactique 2
        wantedPower = 2;
      } else if (Number(r.heroWeaponPower) === 5) {
        wantedDamage = 6; // 2 + Puissance 4
        wantedPower = 4;
      }
      if (wantedDamage == null || !Number.isFinite(prev.hp)) continue;

      c.hp = Math.max(0, prev.hp - wantedDamage);
      r.damage = wantedDamage;
      r.heroDamage = wantedDamage;
      r.heroWeaponPower = wantedPower;
      r.enemyHp = c.hp;
    }
  }

  function fixIsletCircle(state, before) {
    const roll = state.flags?.isletCircleRoll;
    if (!roll || roll === before.circle || !roll.success) return;
    if (state.weapon !== 'heavy') return;
    const prev = before.combats.isletCrawler;
    const c = state.combats?.isletCrawler;
    if (!prev || !c || !Number.isFinite(prev.hp)) return;
    const wantedDamage = 8; // dégâts normaux 6 + bonus tactique 2
    c.hp = Math.max(0, prev.hp - wantedDamage);
    roll.damage = wantedDamage;
    roll.enemyHp = c.hp;
  }

  function fixAnselmeHeavy(state, before) {
    const r = state.flags?.anselmeFirstRound;
    if (!r || r === before.anselmeRound || r.outcome !== 'hero' || Number(r.heroWeaponPower) !== 5) return;
    const beforeHp = Number.isFinite(before.anselmeHp) ? before.anselmeHp : 8;
    const wantedDamage = 6;
    state.flags.anselmeRaidersHp = Math.max(0, beforeHp - wantedDamage);
    r.heroWeaponPower = 4;
    r.heroDamage = wantedDamage;
    r.damage = wantedDamage;
    r.enemyHp = state.flags.anselmeRaidersHp;
  }

  function fixFinalKnightsHeavy(state, before, label) {
    if (!before.finalKnights || !/Jeter les dés contre le chevalier\s+[12]/i.test(label || '')) return;
    const f = state.flags?.finalKnights;
    if (!f || f.last === before.finalKnights.last) return;
    const match = String(label || '').match(/chevalier\s+([12])/i);
    if (!match) return;
    const target = Number(match[1]) - 1;
    const bh = Number(before.finalKnights.hp?.[target]);
    const ba = Number(before.finalKnights.armor?.[target]);
    if (!Number.isFinite(bh) || !Number.isFinite(ba)) return;
    const ah = Number(f.hp?.[target]);
    const aa = Number(f.armor?.[target]);
    const totalLoss = (bh - ah) + (ba - aa);
    if (totalLoss <= 0) return; // le héros n’a pas touché

    const raw = 6;
    const absorbed = Math.min(raw, ba);
    const hpDamage = Math.min(bh, Math.max(0, raw - absorbed));
    const wantedArmor = Math.max(0, ba - absorbed);
    const wantedHp = Math.max(0, bh - hpDamage);
    f.armor[target] = wantedArmor;
    f.hp[target] = wantedHp;

    if (Array.isArray(f.last?.messages)) {
      const line = `Tu touches le chevalier ${target+1} : ${absorbed} absorbé${absorbed>1?'s':''} par son armure, ${hpDamage} dégât${hpDamage>1?'s':''} infligé${hpDamage>1?'s':''}. Protection restante : ${wantedArmor}/3.`;
      const idx = f.last.messages.findIndex(m => /^Tu touches le chevalier\s+/i.test(m));
      if (idx >= 0) f.last.messages[idx] = line;
      if (wantedHp > 0) f.last.messages = f.last.messages.filter(m => !new RegExp(`Le chevalier ${target+1} s’effondre\\.`).test(m));
    }

    if (before.finalKnights.firstDown == null && f.firstDown === target && wantedHp > 0) {
      f.firstDown = null;
    }
  }

  function fixHeavyAfterEffect(state, before, label) {
    if (state.weapon !== 'heavy') return;
    fixStandardHeavyCombat(state, before);
    fixIsletCircle(state, before);
    fixAnselmeHeavy(state, before);
    fixFinalKnightsHeavy(state, before, label);
  }

  function wrapChoice(choice) {
    if (!choice || choice.__weaponBalanceWrapped) return choice;
    const out = { ...choice, __weaponBalanceWrapped:true };
    if (typeof choice.effect === 'function') {
      const oldEffect = choice.effect;
      out.effect = state => {
        const before = snapshot(state);
        const result = withDexComp(state, () => oldEffect(state));
        fixHeavyAfterEffect(state, before, choice.label || '');
        return result;
      };
    }
    return out;
  }

  /* Tous les nœuds déjà créés par les patches précédents passent par la même
     compensation. Cela couvre combats, épreuves de DEX et affichages de seuil. */
  for (const scene of Object.values(STORY)) {
    if (!scene || scene.__weaponBalanceWrapped) continue;

    if (typeof scene.text === 'function') {
      const oldText = scene.text;
      scene.text = state => rewriteWeaponText(withDexComp(state, () => oldText(state)));
    } else if (typeof scene.text === 'string') {
      scene.text = rewriteWeaponText(scene.text);
    }

    if (typeof scene.choices === 'function') {
      const oldChoices = scene.choices;
      scene.choices = state => {
        const list = withDexComp(state, () => oldChoices(state)) || [];
        return list.map(wrapChoice);
      };
    } else if (Array.isArray(scene.choices)) {
      scene.choices = scene.choices.map(wrapChoice);
    }

    if (typeof scene.onEnter === 'function') {
      const oldEnter = scene.onEnter;
      scene.onEnter = state => withDexComp(state, () => oldEnter(state));
    }

    scene.__weaponBalanceWrapped = true;
  }

  if (typeof book.choiceOverride === 'function') {
    const oldChoiceOverride = book.choiceOverride;
    book.choiceOverride = (state, node) => {
      const result = withDexComp(state, () => oldChoiceOverride(state, node));
      return Array.isArray(result) ? result.map(wrapChoice) : result;
    };
  }

  book.__weaponBalancePassV1 = true;
})();
