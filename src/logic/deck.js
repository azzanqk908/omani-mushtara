export const SUITS = ['S', 'H', 'C', 'D'];
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6'];

export const createDeck = () => {
    const deck = [];
    let id = 0;
    
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            let value = 0;
            if (rank === 'A') value = 14;
            else if (rank === 'K') value = 13;
            else if (rank === 'Q') value = 12;
            else if (rank === 'J') value = 11;
            else value = parseInt(rank);
            
            // STRICT DECK FILTERING: 36 Cards
            // We want 6 for ONLY Spades (S) and Hearts (H).
            let allow = true;
            if (rank === '6') {
                if (suit !== 'S' && suit !== 'H') {
                    allow = false; // Exclude 6C and 6D
                }
            }

            if (allow) {
                 deck.push({ id: id++, suit, rank, value, type: 'standard' });
            }
        });
    });

    // Add Jokers
    deck.push({ id: id++, suit: null, rank: 'JN', value: 20, type: 'joker' });
    deck.push({ id: id++, suit: null, rank: 'NQ', value: 19, type: 'joker' });

    return deck;
};

export const shuffle = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};
