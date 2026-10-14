async function initGame() {
    try {
        const response = await fetch('characters.json');
        const characters = await response.json();
        const battleArea = document.getElementById('battleArea');

        const keys = Object.keys(characters);
        let cardsHTML = '';
        
        keys.forEach((key, index) => {
            const char = characters[key];
            
            // Notice: No <button class="challenge"> inside here anymore!
            cardsHTML += `
                <div class="card" data-char="${key}">
                    <p class="${char.rarityClass}">★ ${char.rarity}</p>
                    <h2>${char.name}</h2>
                    <div class="character-image">
                        <img src="${char.image}" alt="${char.name}">
                    </div>
                    <p class="ability">Ability: ${char.abilityName}</p>
                    <div class="traits">
                        <p data-trait="strength">Strength <span>${char.stats.strength}</span></p>
                        <p data-trait="speed">Speed <span>${char.stats.speed}</span></p>
                        <p data-trait="iq">IQ <span>${char.stats.iq}</span></p>
                        <p data-trait="durability">Durability <span>${char.stats.durability}</span></p>
                        <p data-trait="combat">Combat <span>${char.stats.combat}</span></p>
                    </div>
                </div>
            `;

            if (index === 0) {
                cardsHTML += `<div class="vs">vs</div>`;
            }
        });

        battleArea.innerHTML = cardsHTML;
        setupDuelLogic(characters);

    } catch (error) {
        console.error("Failed to load characters:", error);
    }
}

function setupDuelLogic(characters) {
    // Target the single global button by its ID
    const challengeButton = document.getElementById('challengeBtn');
    const keys = Object.keys(characters);
    
    const p1Key = keys[0];
    const p2Key = keys[1];

    challengeButton.addEventListener('click', () => {
        let p1Stats = { ...characters[p1Key].stats };
        let p2Stats = { ...characters[p2Key].stats };

        const p1Char = characters[p1Key];
        const p2Char = characters[p2Key];

        if (p1Char.abilityType === 'boost') {
            p1Stats[p1Char.abilityTarget] += p1Char.abilityValue;
        }
        if (p2Char.abilityType === 'boost') {
            p2Stats[p2Char.abilityTarget] += p2Char.abilityValue;
        }

        const traitsList = ['strength', 'speed', 'iq', 'durability', 'combat'];
        let p1Wins = 0;
        let p2Wins = 0;

        traitsList.forEach(trait => {
            const p1Val = p1Stats[trait];
            const p2Val = p2Stats[trait];

            const p1Span = document.querySelector(`[data-char="${p1Key}"] [data-trait="${trait}"] span`);
            const p2Span = document.querySelector(`[data-char="${p2Key}"] [data-trait="${trait}"] span`);

            p1Span.textContent = p1Val;
            p2Span.textContent = p2Val;

            if (p1Val > p2Val) {
                p1Wins++;
                p1Span.style.color = '#10B981';
                p2Span.style.color = '#EF4444';
            } else if (p2Val > p1Val) {
                p2Wins++;
                p2Span.style.color = '#10B981';
                p1Span.style.color = '#EF4444';
            } else {
                p1Span.style.color = '#FBBF24';
                p2Span.style.color = '#FBBF24';
            }
        });

        setTimeout(() => {
            if (p1Wins > p2Wins) {
                alert(`${p1Char.name} wins the duel ${p1Wins} - ${p2Wins}!`);
            } else if (p2Wins > p1Wins) {
                alert(`${p2Char.name} wins the duel ${p2Wins} - ${p1Wins}!`);
            } else {
                alert(`It's a draw!`);
            }
        }, 100);
    });
}

initGame();