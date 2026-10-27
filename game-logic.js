// Pure game rules: this file deliberately has no Firebase or DOM dependencies.
export const SECONDARY = { VILLAGER: 'Dorfbewohner', MAYOR: 'Bürgermeister', CUPID: 'Amor' };
export const MAIN = { WOLF: 'Werwolf', VILLAGER: 'Dorfbewohner', SEER: 'Seherin', WITCH: 'Hexe', HEALER: 'Heiler', HUNTER: 'Jäger', RED: 'Rotkäppchen' };
export const ROLE_TEXT = {
  [MAIN.WOLF]: 'Wache nachts mit den anderen Wölfen auf und wähle ein Opfer.',
  [MAIN.VILLAGER]: 'Du hast keine Sonderfähigkeit. Finde tagsüber die Wölfe.',
  [MAIN.SEER]: 'Prüfe jede Nacht eine lebende Person auf ihre Wolfszugehörigkeit.',
  [MAIN.WITCH]: 'Du hast einmal den Heiltrank und einmal den Gifttrank.',
  [MAIN.HEALER]: 'Schütze jede Nacht eine lebende Person. Nicht zweimal hintereinander dieselbe.',
  [MAIN.HUNTER]: 'Wenn du stirbst, darfst du sofort eine lebende Person erschießen.',
  [MAIN.RED]: 'Wolfsangriffe können dich nicht töten, solange der Jäger lebt.'
};
export const SECONDARY_TEXT = {
  [SECONDARY.VILLAGER]: 'Keine Zusatzfähigkeit.',
  [SECONDARY.MAYOR]: 'Deine Stimme zählt bei jeder Abstimmung doppelt.',
  [SECONDARY.CUPID]: 'In Nacht 1 bestimmst du zwei Verliebte. Stirbt einer, stirbt auch der andere.'
};
export function weightedTally(votes, players, validTargets = null) {
  const tally = {};
  for (const [voter, target] of Object.entries(votes || {})) {
    const p = players[voter];
    if (!p?.alive || !players[target]?.alive || (validTargets && !validTargets.includes(target))) continue;
    tally[target] = (tally[target] || 0) + (p.secondary === SECONDARY.MAYOR ? 2 : 1);
  }
  return tally;
}
export function chooseVoteWinner(votes, players, validTargets = null, rng = Math.random) {
  const tally = weightedTally(votes, players, validTargets);
  const max = Math.max(0, ...Object.values(tally));
  if (!max) return { winner: null, tied: [], tally };
  const tied = Object.keys(tally).filter(id => tally[id] === max);
  return tied.length === 1 ? { winner: tied[0], tied: [], tally } : { winner: null, tied, tally, randomPick: tied[Math.floor(rng() * tied.length)] };
}
export function assignSecondary(playerIds, options = {}, rng = Math.random) {
  const deck = playerIds.map(() => SECONDARY.VILLAGER);
  const available = playerIds.map((_, i) => i);
  const take = () => available.splice(Math.floor(rng() * available.length), 1)[0];
  if (options.mayor !== false && available.length) deck[take()] = SECONDARY.MAYOR;
  if (options.cupid !== false && available.length) deck[take()] = SECONDARY.CUPID;
  return Object.fromEntries(playerIds.map((id, i) => [id, deck[i]]));
}
export function buildMainDeck(count, options = {}) {
  const deck = Array.from({ length: options.wolves ?? (count >= 10 ? 3 : 2) }, () => MAIN.WOLF);
  for (const [key, role] of [['seer', MAIN.SEER], ['witch', MAIN.WITCH], ['healer', MAIN.HEALER], ['hunter', MAIN.HUNTER], ['red', MAIN.RED]]) if (options[key] !== false) deck.push(role);
  if (deck.length > count) throw new Error('Zu viele Sonderrollen für diese Runde.');
  while (deck.length < count) deck.push(MAIN.VILLAGER);
  return deck;
}
export function loversClosure(initialIds, lovers, players) {
  const dead = new Set(initialIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...dead]) {
      const partner = lovers?.[id];
      if (partner && players[partner]?.alive && !dead.has(partner)) { dead.add(partner); changed = true; }
    }
  }
  return [...dead];
}
export function checkWin(players, lovers = {}) {
  const alive = Object.entries(players).filter(([, p]) => p.alive);
  const wolves = alive.filter(([, p]) => p.main === MAIN.WOLF).length;
  const others = alive.length - wolves;
  if (alive.length === 2 && wolves === 1) {
    const [a, b] = alive.map(([id]) => id);
    if (lovers[a] === b && lovers[b] === a) return { winner: 'Liebespaar', alive: alive.map(([id]) => id) };
  }
  if (!wolves) return { winner: 'Dorf', alive: alive.map(([id]) => id) };
  if (wolves >= others) return { winner: 'Wölfe', alive: alive.map(([id]) => id) };
  return null;
}
export function resolveNight({ players, wolfVotes = {}, healedByHealer = null, witchSave = false, witchPoison = null, lovers = {}, rng = Math.random, deferHunter = false }) {
  const events = [];
  const wolfPick = chooseVoteWinner(wolfVotes, players, Object.keys(players).filter(id => players[id].alive && players[id].main !== MAIN.WOLF), rng);
  const victim = wolfPick.winner || wolfPick.randomPick || null;
  const deaths = new Set();
  if (victim) {
    const protectedByRed = players[victim]?.main === MAIN.RED && Object.values(players).some(p => p.alive && p.main === MAIN.HUNTER);
    const protectedByHealer = healedByHealer === victim;
    const protectedByWitch = witchSave;
    if (protectedByRed || protectedByHealer || protectedByWitch) events.push({ type: 'saved', playerId: victim, causes: [protectedByRed && 'Rotkäppchen', protectedByHealer && 'Heiler', protectedByWitch && 'Heiltrank'].filter(Boolean) });
    else deaths.add(victim);
  }
  if (witchPoison && players[witchPoison]?.alive) deaths.add(witchPoison);
  const allDeaths = loversClosure([...deaths], lovers, players);
  for (const id of allDeaths) if (players[id]?.alive) { players[id].alive = false; events.push({ type: 'death', playerId: id, cause: deaths.has(id) ? 'Nacht' : 'Liebeskummer' }); }
  const hunterShots = [];
  const pendingHunters = allDeaths.filter(id => players[id]?.main === MAIN.HUNTER);
  for (const hunterId of (deferHunter ? [] : pendingHunters)) {
    const living = Object.keys(players).filter(id => players[id].alive);
    if (!living.length) continue;
    const target = living[Math.floor(rng() * living.length)];
    hunterShots.push({ hunterId, target });
    const chain = loversClosure([target], lovers, players);
    for (const id of chain) if (players[id]?.alive) { players[id].alive = false; events.push({ type: 'death', playerId: id, cause: id === target ? 'Jägerschuss' : 'Liebeskummer' }); }
  }
  return { victim, events, hunterShots, pendingHunters, win: checkWin(players, lovers) };
}
export function resolveHunterShot(players, hunterId, targetId, lovers = {}) {
  if (players[targetId]?.alive) {
    for (const id of loversClosure([targetId], lovers, players)) if (players[id]?.alive) players[id].alive = false;
  }
  return { hunterId, targetId, win: checkWin(players, lovers) };
}
export function claimCard(claims, uid, cardId) {
  if (claims[cardId] && claims[cardId] !== uid) return { ok: false, claims };
  return { ok: true, claims: { ...claims, [cardId]: uid } };
}
