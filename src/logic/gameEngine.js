import { createDeck, shuffle, SUITS } from './deck';

export const NEXT_PLAYER = [3, 0, 1, 2];

export const distributeHands = () => {
    const fullDeck = createDeck();
    let deckToDeal = fullDeck;
    let hands = [[], [], [], []];
    let dealMsg = "Standard Deal";
    
    // --- FUN DEAL LOGIC (27% Chance) ---
    const random = Math.random();
    let accumulatedProb = 0;
    let scenarioApplied = false;

    // Helper to extract cards
    const extractCards = (deck, filterFn, count) => {
        const results = deck.filter(filterFn).slice(0, count);
        const extractedIds = new Set(results.map(c => c.id));
        const remainingDeck = deck.filter(c => !extractedIds.has(c.id));
        return { extracted: results, remaining: remainingDeck };
    };

    // 1. The Sultan's Hand (0.4%)
    accumulatedProb += 0.004;
    if (random < accumulatedProb && !scenarioApplied) {
        const targetRanks = ['A', 'K', 'Q', 'J', '10', '9', '8'];
        const targetSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const jokers = fullDeck.filter(c => c.type === 'joker');
        
        const { extracted: sultanCards, remaining: tempDeck } = extractCards(
            fullDeck.filter(c => c.type !== 'joker'),
            c => c.suit === targetSuit && targetRanks.includes(c.rank),
            7 
        );
        
        hands[0].push(...jokers, ...sultanCards);
        deckToDeal = tempDeck.filter(c => c.type !== 'joker');
        dealMsg = "👑 The Sultan's Hand! (0.4%)";
        scenarioApplied = true;
    }

    // 2. Double Joker Draw (5.0%)
    accumulatedProb += 0.050; 
    if (random < accumulatedProb && !scenarioApplied) {
        const jokers = fullDeck.filter(c => c.type === 'joker');
        hands[0].push(...jokers);
        deckToDeal = fullDeck.filter(c => c.type !== 'joker');
        dealMsg = "🃏 Double Joker Draw! (5.0%)";
        scenarioApplied = true;
    }

    // 3. Triple Ace Start (2.0%)
    accumulatedProb += 0.020; 
    if (random < accumulatedProb && !scenarioApplied) {
        const { extracted: aces, remaining: tempDeck } = extractCards(fullDeck, c => c.rank === 'A', 3);
        hands[0].push(...aces);
        deckToDeal = tempDeck; 
        dealMsg = "✨ Triple Ace Start! (2.0%)";
        scenarioApplied = true;
    }

    // 4. Seven-Card Suit (5.0%)
    accumulatedProb += 0.050; 
    if (random < accumulatedProb && !scenarioApplied) {
        const targetSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const suitCards = fullDeck.filter(c => c.suit === targetSuit && c.type !== 'joker');
        const { extracted: strongSuit, remaining: tempDeck } = extractCards(suitCards, () => true, 7);
        
        hands[0].push(...strongSuit);
        deckToDeal = tempDeck.concat(fullDeck.filter(c => c.suit !== targetSuit));
        dealMsg = "🌊 Seven-Card Suit! (5.0%)";
        scenarioApplied = true;
    }

    // 5. The Two-Suit Power (3.0%)
    accumulatedProb += 0.030; 
    if (random < accumulatedProb && !scenarioApplied) {
        const availableSuits = [...SUITS];
        const suit1 = availableSuits.splice(Math.floor(Math.random() * availableSuits.length), 1)[0];
        const suit2 = availableSuits.splice(Math.floor(Math.random() * availableSuits.length), 1)[0];
        const jokers = fullDeck.filter(c => c.type === 'joker');
        const suitCards1 = fullDeck.filter(c => c.suit === suit1 && c.type !== 'joker');
        const suitCards2 = fullDeck.filter(c => c.suit === suit2 && c.type !== 'joker');
        
        // Take jokers and fill rest with cards from the two suits (up to 9 total)
        hands[0].push(...jokers, ...suitCards1, ...suitCards2);
        if(hands[0].length > 9) hands[0] = hands[0].slice(0, 9);

        const p0Ids = new Set(hands[0].map(c => c.id));
        deckToDeal = fullDeck.filter(c => !p0Ids.has(c.id));
        dealMsg = "🔥 The Two-Suit Power! (3.0%)";
        scenarioApplied = true;
    }

    // 6. High Card, No Joker (3.0%)
    accumulatedProb += 0.030;
    if (random < accumulatedProb && !scenarioApplied) {
        const highRanks = ['A', 'K', 'Q', 'J', '10', '9'];
        const highCards = fullDeck.filter(c => c.type !== 'joker' && highRanks.includes(c.rank));
        const { extracted: p0HighCards, remaining: tempDeck } = extractCards(shuffle(highCards), () => true, 9);
        
        hands[0].push(...p0HighCards);
        deckToDeal = tempDeck.concat(fullDeck.filter(c => !highRanks.includes(c.rank) && c.type !== 'joker'));
        deckToDeal = deckToDeal.filter(c => c.type !== 'joker'); 
        dealMsg = "💎 High Card, No Joker! (3.0%)";
        scenarioApplied = true;
    }

    // 7. Big Joker Anchor (3.0%)
    accumulatedProb += 0.030;
    if (random < accumulatedProb && !scenarioApplied) {
        const bigJoker = fullDeck.find(c => c.rank === 'JN');
        const targetSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const suitCards = fullDeck.filter(c => c.suit === targetSuit && c.type !== 'joker');
        
        if (bigJoker && suitCards.length >= 8) {
            const chosenSuitCards = suitCards.slice(0, 8);
            hands[0].push(bigJoker, ...chosenSuitCards);
            const p0Ids = new Set(hands[0].map(c => c.id));
            deckToDeal = fullDeck.filter(c => !p0Ids.has(c.id));
        } else {
            // Fallback: Just jokers
            const jokers = fullDeck.filter(c => c.type === 'joker');
            hands[0].push(...jokers);
            deckToDeal = fullDeck.filter(c => c.type !== 'joker');
        }
        dealMsg = "⚓ Big Joker Anchor! (3.0%)";
        scenarioApplied = true;
    }
    
    // 8. Trump Dominance (5.6%) - A,K,Q,J,10 of one suit
    accumulatedProb += 0.056;
    if (random < accumulatedProb && !scenarioApplied) {
        const targetRanks = ['A', 'K', 'Q', 'J', '10'];
        const targetSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const { extracted: topCards, remaining: tempDeck } = extractCards(
            fullDeck,
            c => c.suit === targetSuit && targetRanks.includes(c.rank), 
            5 
        );
        
        hands[0].push(...topCards);
        deckToDeal = tempDeck;
        dealMsg = "⭐ Trump Dominance (5.6%)";
        scenarioApplied = true;
    }

    // --- FINISH DEALING ---
    if (scenarioApplied) {
        deckToDeal = shuffle(deckToDeal);
        // Fill P0 to 9 cards
        while (hands[0].length < 9 && deckToDeal.length > 0) {
            hands[0].push(deckToDeal.pop());
        }
        // Deal rest to P1-P3
        let cardIndex = 0;
        for (let p = 1; p < 4; p++) {
            for (let count = 0; count < 9; count++) {
                if (deckToDeal[cardIndex]) hands[p].push(deckToDeal[cardIndex++]);
            }
        }
    } else {
        // Standard Deal
        deckToDeal = shuffle(createDeck());
        deckToDeal.forEach((card, i) => {
            hands[i % 4].push(card);
        });
    }

    // Safety Fallback
    if (hands.some(h => h.length !== 9)) {
        hands = [[], [], [], []];
        const cleanDeck = shuffle(createDeck());
        cleanDeck.forEach((card, i) => {
            hands[i % 4].push(card);
        });
        dealMsg = scenarioApplied ? "⚠️ Fallback: Standard Deal" : "Standard Deal";
    }

    return { hands, msg: hands[0].length === 9 ? dealMsg : "Error" };
};

export const getCardScore = (card, leadSuit, trumpSuit, round, yidhamman) => {
    if (card.rank === 'JN') return 10000;
    if (card.rank === 'NQ') return 9000;
    
    let score = card.value;
    if (card.suit === trumpSuit) score += 1000;
    else if (card.suit === leadSuit) score += 500;
    
    return score;
};
