/**
 * GameEngine.js
 * Contains the Core Game Loop AND the Card Game Rules/Logic required by App.jsx
 */

// --- 1. GAME CONSTANTS (Required by App.jsx) ---

export const SUITS = {
  SPADES: 'spades',
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs'
};

// Maps current player position to the next player's position
export const NEXT_PLAYER = {
  'bottom': 'right',
  'right': 'top',
  'top': 'left',
  'left': 'bottom'
};

// --- 2. CARD LOGIC FUNCTIONS ---

/**
 * Returns the numeric value/score of a card rank
 * Used for sorting or trick evaluation
 */
export const getCardScore = (rankOrCard) => {
  // Handle if an object is passed instead of just the rank string
  const rank = typeof rankOrCard === 'object' ? rankOrCard.rank : rankOrCard;

  const scores = {
    'A': 14, 
    'K': 13, 
    'Q': 12, 
    'J': 11,
    '10': 10, 
    '9': 9, 
    '8': 8, 
    '7': 7, 
    '6': 6, 
    '5': 5, 
    '4': 4, 
    '3': 3, 
    '2': 2
  };
  return scores[rank] || 0;
};

/**
 * Creates a standard 52-card deck
 */
const createDeck = () => {
  const suits = Object.values(SUITS);
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      // id is unique for React keys
      deck.push({ 
        suit, 
        rank, 
        id: `${rank}-${suit}`,
        // Add numeric value for easier comparison if needed
        value: getCardScore(rank)
      });
    }
  }
  return deck;
};

/**
 * Fisher-Yates Shuffle Algorithm
 */
const shuffle = (array) => {
  const newArray = [...array];
  let currentIndex = newArray.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};

/**
 * Distributes a shuffled deck to 4 players
 * Returns a Hybrid Structure that is compatible with:
 * 1. Array iteration: hands.forEach(...)
 * 2. Object keys: hands.player, hands.bottom
 * 3. Nested property access: hand.cards.forEach(...)
 */
export const distributeHands = () => {
  const deck = shuffle(createDeck());
  
  const bottom = deck.slice(0, 13);
  const right = deck.slice(13, 26);
  const top = deck.slice(26, 39);
  const left = deck.slice(39, 52);

  // Helper: Attach a .cards reference to the array itself
  // This prevents crashes if App.jsx does `hand.cards.forEach()`
  const enhance = (handArray) => {
    handArray.cards = handArray;
    return handArray;
  };

  // PRIMARY: Return an Array to satisfy .forEach() calls in App.jsx
  const hands = [
    enhance(bottom), 
    enhance(right), 
    enhance(top), 
    enhance(left)
  ];

  // SECONDARY: Attach named properties for ALL common conventions
  hands.bottom = bottom;
  hands.player = bottom; // Alias
  hands.user = bottom;   // Alias
  
  hands.right = right;
  hands.cpu1 = right;    // Alias
  
  hands.top = top;
  hands.cpu2 = top;      // Alias
  
  hands.left = left;
  hands.cpu3 = left;     // Alias

  return hands;
};

// --- 3. THE GAME LOOP CLASS (Generic Engine) ---

export class GameEngine {
  constructor(updateCallback, renderCallback) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.isRunning = false;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.updateCallback) this.updateCallback(deltaTime);
    if (this.renderCallback) this.renderCallback();

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}

export default GameEngine;