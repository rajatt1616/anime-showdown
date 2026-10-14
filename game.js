/* ==========================================
   DUEL GAME ENGINE — pure rules, no DOM
   phases: choosing -> result -> (nextRound) -> matchOver
   ========================================== */
(function () {
    const TRAITS = ['strength', 'speed', 'iq', 'durability', 'combat'];
    const MAX_ROUNDS = 200;

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    }

    function createMatch(characters) {
        const keys = shuffle(Object.keys(characters));
        const half = Math.ceil(keys.length / 2);
        return {
            phase: 'choosing',
            round: 1,
            decks: {
                player: keys.slice(0, half),
                cpu: keys.slice(half)
            },
            captured: { player: 0, cpu: 0 },
            roundsWon: { player: 0, cpu: 0 },
            lastResult: null,
            winner: null
        };
    }

    /* Player picks the stat; both top cards are compared on it.
       Winner captures the loser's card (both cards return to their owner's
       deck bottom otherwise). */
    function chooseTrait(state, characters, trait) {
        if (state.phase !== 'choosing') return null;

        const playerId = state.decks.player[0];
        const cpuId = state.decks.cpu[0];
        if (!playerId || !cpuId) return null;

        const pVal = characters[playerId].stats[trait];
        const cVal = characters[cpuId].stats[trait];

        let winner;
        if (pVal > cVal) winner = 'player';
        else if (cVal > pVal) winner = 'cpu';
        else winner = 'tie';

        state.decks.player.shift();
        state.decks.cpu.shift();

        if (winner === 'player') {
            state.decks.player.push(playerId, cpuId);
            state.captured.player += 1;
            state.roundsWon.player += 1;
        } else if (winner === 'cpu') {
            state.decks.cpu.push(cpuId, playerId);
            state.captured.cpu += 1;
            state.roundsWon.cpu += 1;
        } else {
            state.decks.player.push(playerId);
            state.decks.cpu.push(cpuId);
        }

        state.lastResult = { playerId, cpuId, trait, winner, pVal, cVal };
        state.phase = 'result';
        return state.lastResult;
    }

    function nextRound(state) {
        if (state.decks.player.length === 0) {
            state.winner = 'cpu';
            state.phase = 'matchOver';
            return state;
        }
        if (state.decks.cpu.length === 0) {
            state.winner = 'player';
            state.phase = 'matchOver';
            return state;
        }
        if (state.round >= MAX_ROUNDS) {
            const p = state.decks.player.length;
            const c = state.decks.cpu.length;
            state.winner = p > c ? 'player' : c > p ? 'cpu' : 'draw';
            state.phase = 'matchOver';
            return state;
        }
        state.round += 1;
        state.lastResult = null;
        state.phase = 'choosing';
        return state;
    }

    window.DuelGame = { TRAITS, createMatch, chooseTrait, nextRound };
})();
