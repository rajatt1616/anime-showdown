const TRAITS = ['strength', 'speed', 'iq', 'durability', 'combat'];
const CARD_BACK_SRC = 'assets/card_back_pixel.jpg';

let characters = null;
let state = null;
let pendingAction = 'round';

async function initGame() {
    try {
        const response = await fetch('characters.json');
        characters = await response.json();
    } catch (error) {
        console.error('Failed to load characters:', error);
        return;
    }
    document.getElementById('startBtn').addEventListener('click', startMatch);
    document.getElementById('playAgainBtn').addEventListener('click', onAdvance);
}

/* -----------------------------------------
   MATCH LIFECYCLE
   ----------------------------------------- */
function startMatch() {
    state = DuelGame.createMatch(characters);
    pendingAction = 'round';
    document.getElementById('startScreen').hidden = true;
    ['hud', 'battleArea', 'statControls'].forEach(id => {
        document.getElementById(id).hidden = false;
    });
    hideOverlay();
    renderRound();
}

function onAdvance() {
    if (pendingAction === 'match') {
        startMatch();
        return;
    }
    DuelGame.nextRound(state);
    if (state.phase === 'matchOver') {
        showFinal();
    } else {
        hideOverlay();
        renderRound();
    }
}

/* -----------------------------------------
   RENDERING
   ----------------------------------------- */
function placeholderHTML(char) {
    const initials = char.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3);
    return `<div class="char-placeholder"><span>${initials}</span></div>`;
}

function attachArtFallback(root, char) {
    const img = root.querySelector('.character-image img');
    if (!img || !char || !char.image) return;
    const fail = () => {
        const holder = img.parentElement;
        if (holder) holder.innerHTML = placeholderHTML(char);
    };
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0) fail();
}

function statsHTML(char, hiddenValues) {
    return TRAITS.map(trait => `
        <p data-trait="${trait}">${trait.toUpperCase()} <span class="stat-val">${hiddenValues ? '?' : char.stats[trait]}</span></p>
    `).join('');
}

function renderRound() {
    const pChar = characters[state.decks.player[0]];
    const battleArea = document.getElementById('battleArea');

    battleArea.innerHTML = `
        <div class="card player-card">
            <div class="card-header">
                <h2>${pChar.name}</h2>
                <p class="title">${pChar.title}</p>
            </div>
            <div class="character-image">${pChar.image ? `<img src="${pChar.image}" alt="${pChar.name}">` : placeholderHTML(pChar)}</div>
            <div class="traits">${statsHTML(pChar, false)}</div>
        </div>
        <div class="vs">VS</div>
        <div class="card opponent-card card-hidden">
            <div class="card-header">
                <h2>MYSTERY OPPONENT</h2>
                <p class="title">UNKNOWN TITLE</p>
            </div>
            <div class="character-image"><img src="${CARD_BACK_SRC}" alt="Card Back" class="card-art"></div>
            <div class="traits">${statsHTML(pChar, true)}</div>
        </div>
    `;

    attachArtFallback(battleArea, pChar);
    renderControls(pChar);
    updateHUD();
}

function renderControls(pChar) {
    const controls = document.getElementById('statControls');
    controls.innerHTML = TRAITS.map(trait => `
        <button class="stat-btn" data-trait="${trait}">
            ${trait.toUpperCase()} <span>${pChar.stats[trait]}</span>
        </button>
    `).join('');
    setupTraitDuel();
}

function updateHUD(pulseSide) {
    document.getElementById('pDeck').textContent = state.decks.player.length;
    document.getElementById('pStolen').textContent = state.captured.player;
    document.getElementById('pWins').textContent = state.roundsWon.player;
    document.getElementById('cDeck').textContent = state.decks.cpu.length;
    document.getElementById('cStolen').textContent = state.captured.cpu;
    document.getElementById('cWins').textContent = state.roundsWon.cpu;
    document.getElementById('roundNum').textContent = `ROUND ${state.round}`;

    if (pulseSide && pulseSide !== 'tie') {
        const el = document.getElementById(pulseSide === 'player' ? 'pStolen' : 'cStolen');
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');
    }
}

/* -----------------------------------------
   DUEL INTERACTION (hover highlight + pick)
   ----------------------------------------- */
function setHighlight(trait) {
    document.querySelectorAll('#battleArea [data-trait]').forEach(el => {
        el.classList.toggle('stat-highlight', trait !== null && el.dataset.trait === trait);
    });
}

function setupTraitDuel() {
    const buttons = document.querySelectorAll('#statControls .stat-btn');

    buttons.forEach(button => {
        const trait = button.getAttribute('data-trait');
        const on = () => { if (state && state.phase === 'choosing') setHighlight(trait); };
        const off = () => { if (state && state.phase === 'choosing') setHighlight(null); };

        button.addEventListener('mouseenter', on);
        button.addEventListener('mouseleave', off);
        button.addEventListener('focus', on);
        button.addEventListener('blur', off);

        button.addEventListener('click', () => {
            if (!state || state.phase !== 'choosing') return;

            buttons.forEach(b => {
                b.classList.toggle('selected', b === button);
                b.disabled = true;
            });
            setHighlight(trait);

            const result = DuelGame.chooseTrait(state, characters, trait);
            if (!result) return;

            const oppCard = document.querySelector('.opponent-card');
            revealOpponent(oppCard, characters[result.cpuId], () => {
                updateHUD(result.winner);
                showResult(characters[result.playerId], characters[result.cpuId], trait, result.winner);
            });
        });
    });
}

/* -----------------------------------------
   REVEAL (flip animation)
   ----------------------------------------- */
function revealOpponent(oppCard, oppChar, onDone) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyContent = () => {
        oppCard.classList.remove('card-hidden');
        oppCard.querySelector('.card-header h2').textContent = oppChar.name;
        oppCard.querySelector('.card-header .title').textContent = oppChar.title;

        const holder = oppCard.querySelector('.character-image');
        if (oppChar.image) {
            holder.innerHTML = `<img src="${oppChar.image}" alt="${oppChar.name}">`;
            attachArtFallback(oppCard, oppChar);
        } else {
            holder.innerHTML = placeholderHTML(oppChar);
        }

        TRAITS.forEach(trait => {
            oppCard.querySelector(`[data-trait="${trait}"] .stat-val`).textContent = oppChar.stats[trait];
        });
    };

    if (prefersReduced) {
        applyContent();
        onDone();
        return;
    }

    oppCard.classList.add('flip-out');
    oppCard.addEventListener('animationend', function onOut() {
        oppCard.removeEventListener('animationend', onOut);
        oppCard.classList.remove('flip-out');
        applyContent();
        oppCard.classList.add('flip-in');
        oppCard.addEventListener('animationend', function onIn() {
            oppCard.removeEventListener('animationend', onIn);
            oppCard.classList.remove('flip-in');
            onDone();
        });
    });
}

/* -----------------------------------------
   RESULT PANEL + FINAL SCOREBOARD
   ----------------------------------------- */
function showResult(p1, p2, trait, winner) {
    const overlay = document.getElementById('resultOverlay');
    const titleEl = document.getElementById('resultTitle');
    const subEl = document.getElementById('resultSub');
    const barsEl = document.getElementById('statBars');

    let outcome, cls;
    if (winner === 'player') { outcome = 'YOU WIN!'; cls = 'win'; }
    else if (winner === 'cpu') { outcome = 'DEFEAT'; cls = 'lose'; }
    else { outcome = 'DRAW'; cls = 'draw'; }

    titleEl.textContent = outcome;
    titleEl.className = `result-title ${cls}`;
    subEl.textContent = `ROUND ${state.round} — ${trait.toUpperCase()} — ${p1.name} VS ${p2.name}`;

    barsEl.innerHTML = TRAITS.map(traitName => {
        const you = p1.stats[traitName];
        const opp = p2.stats[traitName];
        const isChosen = traitName === trait ? ' chosen' : '';
        const youCls = you > opp ? 'won' : '';
        const oppCls = opp > you ? 'lost' : '';
        return `
            <div class="stat-row${isChosen}">
                <div class="stat-label">
                    <span class="trait-name">${traitName.toUpperCase()}</span>
                    <span class="stat-nums"><span class="${youCls}">${you}</span> vs <span class="${oppCls}">${opp}</span></span>
                </div>
                <div class="bar-track"><div class="bar you" data-w="${you}"></div></div>
                <div class="bar-track"><div class="bar opp" data-w="${opp}"></div></div>
            </div>
        `;
    }).join('');
    barsEl.style.display = '';

    document.getElementById('playAgainBtn').textContent = 'NEXT ROUND';
    pendingAction = 'round';

    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => requestAnimationFrame(() => {
        barsEl.querySelectorAll('.bar').forEach((bar, i) => {
            bar.style.transitionDelay = `${i * 60}ms`;
            bar.style.width = `${bar.dataset.w}%`;
        });
    }));
}

function showFinal() {
    const overlay = document.getElementById('resultOverlay');
    const titleEl = document.getElementById('resultTitle');
    const subEl = document.getElementById('resultSub');
    const barsEl = document.getElementById('statBars');

    let outcome, cls;
    if (state.winner === 'player') { outcome = 'YOU WIN!'; cls = 'win'; }
    else if (state.winner === 'cpu') { outcome = 'DEFEAT'; cls = 'lose'; }
    else { outcome = 'DRAW MATCH'; cls = 'draw'; }

    titleEl.textContent = outcome;
    titleEl.className = `result-title ${cls}`;
    subEl.textContent = `ROUNDS ${state.roundsWon.player}-${state.roundsWon.cpu} · CARDS STOLEN ${state.captured.player}-${state.captured.cpu}`;
    barsEl.style.display = 'none';

    document.getElementById('playAgainBtn').textContent = 'REMATCH';
    pendingAction = 'match';

    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
}

function hideOverlay() {
    const overlay = document.getElementById('resultOverlay');
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
}

initGame();
