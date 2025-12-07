import React, { useState, useEffect, useRef } from 'react';

// --- GAME ENGINE & LOGIC ---

const SUITS = ['S', 'H', 'C', 'D'];
// UPDATE: Ranks now stop at 6 (36 card deck base)
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6'];

// Player indices: 0 (User), 1 (CPU Left), 2 (Partner Top), 3 (CPU Right)
// UPDATE: Counter-Clockwise Order: 0 -> 3 -> 2 -> 1 -> 0
const NEXT_PLAYER = [3, 0, 1, 2];

const createDeck = () => {
    const deck = [];
    let id = 0;
    
    // Add standard cards
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            let value = 0;
            if (rank === 'A') value = 14;
            else if (rank === 'K') value = 13;
            else if (rank === 'Q') value = 12;
            else if (rank === 'J') value = 11;
            else value = parseInt(rank);
            
            // STRICT DECK FILTERING
            // We want: A, K, Q, J, 10, 9, 8, 7 for ALL suits.
            // We want: 6 for ONLY Spades (S) and Hearts (H).
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
    // JN = Joker Non-colored (Big), NQ = Naqsh/Colored (Small)
    deck.push({ id: id++, suit: null, rank: 'JN', value: 20, type: 'joker' });
    deck.push({ id: id++, suit: null, rank: 'NQ', value: 19, type: 'joker' });

    return deck;
};

const shuffle = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const distributeHands = () => {
    const deck = shuffle(createDeck());
    const hands = [[], [], [], []];
    
    // Deal all cards (should be 9 per player now)
    deck.forEach((card, i) => {
        hands[i % 4].push(card);
    });

    return {
        hands: hands,
        msg: "Standard Deal"
    };
};

const getCardScore = (card, leadSuit, trumpSuit, round, yidhamman) => {
    // Scoring logic for determining the trick winner
    // Base Values:
    // Joker Big (JN) > Joker Small (NQ) > Trump > Lead > Others
    
    if (card.rank === 'JN') return 10000;
    if (card.rank === 'NQ') return 9000;
    
    // Standard cards
    let score = card.value;
    
    if (card.suit === trumpSuit) {
        score += 1000; // Trump bonus
    } else if (card.suit === leadSuit) {
        score += 500; // Lead suit bonus
    }
    
    return score;
};

// --- CSS STYLES ---

const styles = `
    .game-container {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #2c3e50;
        color: white;
        height: 100vh;
        width: 100vw;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
    }

    .status-bar {
        display: flex;
        justify-content: space-between;
        padding: 10px 20px;
        background-color: #34495e;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10;
    }

    .score-box, .bound-score {
        font-weight: bold;
        font-size: 1.1em;
    }
    
    .bound-score { color: #f1c40f; }

    .top-area, .bottom-area {
        height: 25%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 10px;
    }

    .middle-area {
        height: 50%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
    }

    .player-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        opacity: 0.7;
    }

    .active-turn {
        opacity: 1;
        transform: scale(1.05);
    }
    
    .active-turn .player-name {
        color: #f1c40f;
        text-shadow: 0 0 10px #f1c40f;
    }

    .player-name {
        margin-bottom: 5px;
        font-weight: bold;
        text-shadow: 1px 1px 2px black;
    }
    
    .player-badge {
        background: #e74c3c;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7em;
        margin-left: 5px;
    }

    .hand {
        display: flex;
        justify-content: center;
        min-width: 300px;
    }

    .card {
        width: 70px;
        height: 100px;
        background-color: white;
        border-radius: 6px;
        margin: 0 -20px; /* Overlap cards */
        box-shadow: -2px 0 5px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 5px;
        color: black;
        cursor: pointer;
        transition: transform 0.2s;
        position: relative;
        user-select: none;
    }

    .card:hover {
        transform: translateY(-15px);
        z-index: 100;
    }

    .card.red { color: #c0392b; }
    .card.black { color: #2c3e50; }

    .card-top-left {
        text-align: left;
        line-height: 1;
        font-size: 1.2em;
        font-weight: bold;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .card-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2em;
    }
    
    .card-joker-label {
        font-size: 0.8em;
        text-align: center;
        margin-top: 30px;
    }

    .card-back {
        width: 60px;
        height: 90px;
        background: repeating-linear-gradient(
          45deg,
          #c0392b,
          #c0392b 10px,
          #e74c3c 10px,
          #e74c3c 20px
        );
        border: 2px solid white;
        border-radius: 6px;
        box-shadow: 1px 1px 3px rgba(0,0,0,0.5);
    }

    .trick-area {
        width: 300px;
        height: 200px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(255,255,255,0.05);
        border-radius: 20px;
    }

    .trick-card {
        position: absolute;
        transition: all 0.5s;
    }

    .trick-card.p0 { bottom: 10px; }
    .trick-card.p1 { left: 10px; }
    .trick-card.p2 { top: 10px; }
    .trick-card.p3 { right: 10px; }

    /* Modals */
    .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: #ecf0f1;
        color: #2c3e50;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        min-width: 300px;
    }

    button {
        background: #27ae60;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 1.1em;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
        transition: background 0.2s;
    }

    button:hover { background: #2ecc71; }
    button:disabled { background: #95a5a6; cursor: not-allowed; }
    button.secondary { background: #7f8c8d; }
    button.special { background: #e67e22; }

    .bid-controls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
    }

    .suit-controls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
    }
    
    .suit-btn {
        font-size: 1.5em;
        padding: 10px 15px;
    }

    .contract-display {
        position: absolute;
        top: 60px;
        right: 20px;
        background: rgba(0,0,0,0.5);
        padding: 10px;
        border-radius: 8px;
        text-align: center;
    }
    
    .contract-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        font-size: 1.5em;
        font-weight: bold;
    }
    
    .log-container {
        position: absolute;
        bottom: 10px;
        left: 10px;
        width: 250px;
        height: 150px;
        overflow-y: auto;
        font-size: 0.8em;
        background: rgba(0,0,0,0.3);
        padding: 5px;
        border-radius: 5px;
        pointer-events: none;
    }
    
    .log-msg { margin-bottom: 2px; color: #bdc3c7; }
    .log-msg.important { color: #f1c40f; font-weight: bold; }
`;

// --- COMPONENTS ---

const Card = ({ card, roundNumber, yidhamman, onClick }) => {
    if (!card) return null;

    const isRed = card.suit === 'H' || card.suit === 'D';
    const isJoker = card.type === 'joker';
    
    const renderSuit = (s) => {
        if (s === 'S') return '♠';
        if (s === 'H') return '♥';
        if (s === 'C') return '♣';
        if (s === 'D') return '♦';
        return '';
    };

    return (
        <div 
            className={`card ${isRed ? 'red' : 'black'}`} 
            onClick={onClick}
        >
            <div className="card-top-left">
                <span>{card.rank}</span>
                {!isJoker && <span>{renderSuit(card.suit)}</span>}
            </div>
            
            <div className="card-center">
                {isJoker ? '🎭' : renderSuit(card.suit)}
            </div>
            
            {isJoker && (
                <div className="card-joker-label">
                    {card.rank === 'JN' ? 'BIG' : 'SMALL'}
                </div>
            )}
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const App = () => {
    const [gameState, setGameState] = useState('startMenu'); 
    const [players, setPlayers] = useState([[], [], [], []]); 
    const [turnIndex, setTurnIndex] = useState(0);
    const [dealerIndex, setDealerIndex] = useState(0);
    
    // BIDDING STATE
    const [bid, setBid] = useState({ amount: 0, player: null, suit: null, malzoum: false });
    const [currentBidder, setCurrentBidder] = useState(0);
    const [maxBid, setMaxBid] = useState(0); 
    const [biddingTurnCount, setBiddingTurnCount] = useState(0);
    const [isDealerTurn, setIsDealerTurn] = useState(false); 
    const [playersWhoPassed, setPlayersWhoPassed] = useState([]);

    const [trick, setTrick] = useState([]);
    const [tricksWon, setTricksWon] = useState([0, 0]); 
    const [scores, setScores] = useState([0, 0]);
    const [boundScore, setBoundScore] = useState([0, 0]); 
    const [roundNumber, setRoundNumber] = useState(1);
    const [log, setLog] = useState([]);
    const [popup, setPopup] = useState(null); 
    const [sjPlayed, setSjPlayed] = useState(false);
    const [yidhamman, setYidhamman] = useState(false);
    const [boundActive, setBoundActive] = useState(false); 
    
    const logRef = useRef(null);
    const playersRef = useRef(players);
    const stateRef = useRef(gameState);
    
    useEffect(() => { playersRef.current = players; }, [players]);
    useEffect(() => { stateRef.current = gameState; }, [gameState]);
    useEffect(() => { if(logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

    const addLog = (msg, important = false) => {
        setLog(prev => [...prev.slice(-99), { text: msg, important }]);
    };

    const resetGame = () => {
        setGameState('startMenu');
        setPlayers([[], [], [], []]);
        setTurnIndex(0);
        setDealerIndex(0);
        setBid({ amount: 0, player: null, suit: null, malzoum: false });
        setCurrentBidder(0);
        setMaxBid(0);
        setBiddingTurnCount(0);
        setIsDealerTurn(false);
        setTrick([]);
        setTricksWon([0, 0]);
        setScores([0, 0]);
        setBoundScore([0, 0]);
        setRoundNumber(1);
        setLog([]);
        setPopup(null);
        setSjPlayed(false);
        setYidhamman(false);
        setBoundActive(false);
        addLog("--- GAME RESET ---", true);
    };

    const startGame = (nextDealer = 0, overrideHands = null) => {
        let hands = [[], [], [], []];
        let dealMsg = "";

        if (overrideHands && Array.isArray(overrideHands)) {
            hands = overrideHands;
            dealMsg = "Manual/Cheat Deal";
        } else {
            try {
                const result = distributeHands();
                if (Array.isArray(result)) {
                    hands = result;
                    dealMsg = "Standard Deal";
                } else if (result && Array.isArray(result.hands)) {
                    hands = result.hands;
                    dealMsg = result.msg || "Standard Deal";
                } else {
                    console.error("Error: distributeHands returned invalid data", result);
                    hands = [[], [], [], []];
                    dealMsg = "Error dealing hands";
                }
            } catch (error) {
                console.error("Error executing distributeHands:", error);
                hands = [[], [], [], []];
                dealMsg = "Critical Deal Error";
            }
        }
        
        if (Array.isArray(hands)) {
            hands.forEach(h => {
                if (Array.isArray(h)) {
                    h.sort((a,b) => {
                        if(a.type === 'joker') return 1; 
                        if(b.type === 'joker') return -1;
                        if(a.suit !== b.suit) return (SUITS || []).indexOf(a.suit) - (SUITS || []).indexOf(b.suit);
                        return a.value - b.value;
                    });
                }
            });
        }

        setPlayers(hands);
        setGameState('bidding');
        setDealerIndex(nextDealer);
        const starter = NEXT_PLAYER[nextDealer]; 
        setCurrentBidder(starter);
        
        setBid({ amount: 0, player: null, suit: null, malzoum: false });
        setMaxBid(5); 
        setBiddingTurnCount(0); 
        setPlayersWhoPassed([]); 
        setTricksWon([0, 0]); setRoundNumber(1);
        setSjPlayed(false); setYidhamman(false); setBoundActive(false); setTrick([]);
        setIsDealerTurn(false);
        addLog(`New Round. Dealer: P${nextDealer}. Bidding starts P${starter}.`);
        if(dealMsg !== "Standard Deal") addLog(dealMsg, true);

        if (starter !== 0) triggerAIBid(starter, 0, 5, [], false, null);
    };

    const triggerAIBid = (playerIdx, turns, mBid, passedList, isDealerPhase, currentWinner) => {
        setTimeout(() => {
            const hand = playersRef.current[playerIdx];
            if (!hand || !Array.isArray(hand)) return;

            let power = 0;
            hand.forEach(c => {
                if(c.type === 'joker') power += 3;
                if(c.rank === 'A') power += 2;
                if(c.rank === 'K') power += 1;
            });

            let bidAmt = 0;
            let bidSuit = null;
            let isMalzoum = false;

            const suits = {};
            hand.forEach(c => { if(c.suit) suits[c.suit] = (suits[c.suit]||0)+1 });
            const bestSuit = Object.keys(suits).reduce((a, b) => suits[a] > suits[b] ? a : b, 'S');

            if (power > 5 && mBid < 6) {
                bidAmt = 6; bidSuit = bestSuit;
            } else if (power > 8 && mBid < 7) {
                bidAmt = 7; bidSuit = bestSuit;
            }

            if (isDealerPhase && bidAmt === 0) {
                const teamIdx = (playerIdx === 0 || playerIdx === 2) ? 0 : 1;
                if (power < 2 && scores[teamIdx] > 0) {
                    addLog(`P${playerIdx} calls REDEAL (-1 score)`);
                    setScores(prev => { const newS = [...prev]; newS[teamIdx]--; return newS; });
                    setTimeout(() => startGame(playerIdx), 1500); 
                    return;
                } else {
                    bidAmt = 6; bidSuit = bestSuit; isMalzoum = true;
                }
            }

            if (bidAmt > mBid || (isDealerPhase && bidAmt >= 6)) {
                processBid(playerIdx, bidAmt, bidSuit, mBid, turns, isMalzoum, passedList);
            } else {
                processPass(playerIdx, turns, mBid, passedList, currentWinner);
            }
        }, 1000);
    };

    const processBid = (playerIdx, amount, suit, currentMax, turns, malzoum, passedList) => {
        if (amount <= currentMax && !malzoum) return processPass(playerIdx, turns, currentMax, passedList, null);
        
        const type = malzoum ? "MALZOUM (6)" : amount;
        addLog(`P${playerIdx} bids ${type}`);
        
        setBid({ amount, player: playerIdx, suit: null, malzoum });
        setMaxBid(amount);
        
        advanceBidding(playerIdx, turns + 1, amount, passedList, playerIdx);
    };

    const processPass = (playerIdx, turns, mBid, passedList, currentWinner) => {
        addLog(`P${playerIdx} passes`);
        const updatedPassed = [...passedList, playerIdx];
        setPlayersWhoPassed(updatedPassed); 
        advanceBidding(playerIdx, turns + 1, mBid, updatedPassed, currentWinner);
    };

    const advanceBidding = (lastPlayer, newTurnCount, currentMaxBid, passedList, currentWinner) => {
        setBiddingTurnCount(newTurnCount);
        
        if (newTurnCount >= 4) {
            if (currentMaxBid > 5) {
                const winner = (currentWinner !== undefined && currentWinner !== null) ? currentWinner : bid.player;
                enterSuitSelection(winner);
            } else {
                addLog("Everyone passed. Dealer must choose.", true);
                setIsDealerTurn(true);
                setCurrentBidder(dealerIndex);
                if (dealerIndex !== 0) triggerAIBid(dealerIndex, newTurnCount, 0, passedList, true, null);
            }
        } else {
            let nextP = NEXT_PLAYER[lastPlayer];
            setCurrentBidder(nextP);
            if (nextP !== 0) triggerAIBid(nextP, newTurnCount, currentMaxBid, passedList, false, currentWinner);
        }
    };

    const enterSuitSelection = (winnerIdx) => {
        setCurrentBidder(winnerIdx); 
        setGameState('choosingHokum');
        addLog(`P${winnerIdx} wins auction! Waiting for Hokum...`, true);
        if (winnerIdx !== 0) {
            setTimeout(() => {
                const hand = playersRef.current[winnerIdx];
                if (!hand) return;

                const suits = {};
                hand.forEach(c => { if(c.suit) suits[c.suit] = (suits[c.suit]||0)+1 });
                const bestSuit = Object.keys(suits).reduce((a, b) => suits[a] > suits[b] ? a : b, 'S');
                confirmContract(winnerIdx, bestSuit);
            }, 1500);
        }
    };

    const confirmContract = (playerIdx, suit) => {
        setBid(prev => ({ ...prev, suit }));
        setTimeout(() => startPlaying(playerIdx), 500);
    };

    const startPlaying = (starterIdx) => {
        setGameState('playing');
        const leader = NEXT_PLAYER[starterIdx];
        setTurnIndex(leader);
        addLog(`Hokum is ${suitIcon(bid.suit)}. P${leader} leads first.`);
        if (leader !== 0) triggerAIPlay(leader);
    };

    const suitIcon = (s) => s==='S'?'♠':s==='H'?'♥':s==='C'?'♣':'♦';

    const userBid = (amount) => processBid(0, amount, null, maxBid, biddingTurnCount, false, playersWhoPassed);
    const userPass = () => processPass(0, biddingTurnCount, maxBid, playersWhoPassed, bid.player);
    const userMalzoum = () => processBid(0, 6, null, 0, biddingTurnCount, true, playersWhoPassed);
    const userSelectSuit = (s) => confirmContract(0, s);
    const userRedeal = () => {
        if (scores[0] > 0) {
            addLog(`You call REDEAL (-1 score)`);
            setScores(prev => [prev[0]-1, prev[1]]);
            setTimeout(() => startGame(0), 1000);
        } else {
            addLog("Cannot redeal with 0 score!", true);
        }
    };

    const triggerAIPlay = (playerIdx) => {
        setTimeout(() => {
            if (stateRef.current !== 'playing') return;
        }, 1000);
    };

    // --- AI COMPONENT INSIDE APP ---
    const AIPlayer = ({ playerIdx }) => {
        useEffect(() => {
            if (turnIndex === playerIdx && gameState === 'playing' && trick.length < 4) {
                const timer = setTimeout(() => {
                    const hand = players[playerIdx];
                    if (!hand || !Array.isArray(hand)) return;

                    let validMoves = hand.filter(c => checkMoveValidity(c, hand).valid);
                    
                    if (trick.length === 0) {
                        const isDefender = (playerIdx !== bid.player && playerIdx !== (bid.player + 2) % 4);
                        if (isDefender) {
                            const nonHokumMoves = validMoves.filter(c => c.suit !== bid.suit && c.type !== 'joker');
                            if (nonHokumMoves.length > 0) validMoves = nonHokumMoves;
                        }
                    }

                    let choice = null;
                    const JOKER_SMALL = 'NQ';
                    const sj = validMoves.find(c => c.rank === JOKER_SMALL);
                    
                    if (sj && !yidhamman) {
                        if (roundNumber === 3) choice = sj;
                        else if (roundNumber < 3) {
                             choice = sj; 
                        }
                    }

                    if (!choice) {
                        if (validMoves.length > 0) choice = validMoves[0];
                    }
                    
                    if (choice) playCard(playerIdx, choice);
                }, 1200);
                return () => clearTimeout(timer);
            }
        }, [turnIndex, gameState, trick.length, players]); 
        return null;
    };

    const checkMoveValidity = (card, hand) => {
        const JOKER_BIG = 'JN';
        const JOKER_SMALL = 'NQ';
        const isLead = trick.length === 0;
        
        if (card.rank === JOKER_BIG && !sjPlayed) {
            const hasSJ = hand.find(c => c.rank === JOKER_SMALL);
            const isBuyer = turnIndex === bid.player;
            if (isBuyer && hasSJ && roundNumber <= 3) { } 
            else if (roundNumber > 3) { }
            else if (!sjPlayed) return { valid: false, reason: "SJ must be played before BJ!" };
        }
        if (isLead) {
            if (roundNumber === 1 && bid.amount < 8 && card.suit === bid.suit) return { valid: false, reason: "Cannot lead Hokum in Round 1!" };
            if (bid.amount === 8 && roundNumber === 1) {
                const hasHokum = hand.some(c => c.suit === bid.suit);
                if (hasHokum && card.suit !== bid.suit) return { valid: false, reason: "Must lead Hokum on Inzelli start!" };
                if (card.type === 'joker') return { valid: false, reason: "Cannot lead Joker on Inzelli start!" }; 
            }
            if (card.type === 'joker') {
                const nonJokers = hand.filter(c => c.type !== 'joker');
                if (nonJokers.length === 0) return { valid: true }; 
                if (roundNumber === 9 && yidhamman && card.rank === JOKER_SMALL) return { valid: true };
                return { valid: false, reason: "Cannot lead a Joker!" }; 
            }
            return { valid: true };
        }
        const leadCard = trick[0].card;
        if (leadCard.type !== 'joker') {
            const leadSuit = leadCard.suit;
            const hasSuit = hand.some(c => c.suit === leadSuit && c.type !== 'joker');
            if (hasSuit) {
                if (card.suit !== leadSuit && card.type !== 'joker') return { valid: false, reason: `Must follow suit (${leadSuit})!` };
            }
        }
        return { valid: true };
    };

    const playCard = (playerIdx, card) => {
        const newHands = [...players];
        newHands[playerIdx] = newHands[playerIdx].filter(c => c.id !== card.id);
        setPlayers(newHands);
        if (card.rank === 'NQ') setSjPlayed(true);
        if (card.rank === 'JN' && !sjPlayed && roundNumber <= 3 && playerIdx === bid.player) {
            setYidhamman(true); addLog("🛡️ YIDHAMMAN ACTIVATED!", true);
        }
        const newTrick = [...trick, { player: playerIdx, card }];
        setTrick(newTrick);
        if (newTrick.length < 4) setTurnIndex(NEXT_PLAYER[playerIdx]);
        else setTimeout(() => evaluateTrick(newTrick), 1500);
    };

    const evaluateTrick = (completedTrick) => {
        let winner = null;
        let highestScore = -9999;
        const leadCard = completedTrick[0].card;
        const leadSuit = leadCard.suit; 
        completedTrick.forEach(play => {
            const score = getCardScore(play.card, leadSuit, bid.suit, roundNumber, yidhamman);
            if (score > highestScore) { highestScore = score; winner = play.player; }
        });
        
        const winTeam = (winner === 0 || winner === 2) ? 0 : 1;
        const newTricks = [...tricksWon];
        newTricks[winTeam]++;
        setTricksWon(newTricks);
        addLog(`P${winner} wins trick!`);
        setTrick([]);
        
        const buyerTeam = (bid.player === 0 || bid.player === 2) ? 0 : 1;
        if (winTeam === buyerTeam) {
            const won = newTricks[buyerTeam];
            if (won === roundNumber && !bid.malzoum) { 
                let trigger = (bid.amount===6 && won===5) || (bid.amount===7 && won===6) || (bid.amount===8 && won===7);
                if (trigger && !boundActive && winTeam === 0) { 
                        setGameState('boundWait');
                        setPopup({
                            type: 'bound', message: "Call 'Bound'? (Go Big)",
                            onConfirm: () => { 
                                setBoundActive(true); setPopup(null); setGameState('playing'); 
                                setRoundNumber(r => r+1); setTurnIndex(winner); 
                            },
                            onCancel: () => { 
                                setPopup(null); setGameState('playing'); 
                                if (won >= bid.amount) endRound(newTricks); 
                                else { setRoundNumber(r => r+1); setTurnIndex(winner); }
                            }
                        });
                        return; 
                }
            }
        }

        const opponentTeam = 1 - buyerTeam;
        const opponentWins = newTricks[opponentTeam];
        const maxLosses = 9 - bid.amount; 
        if (!boundActive && opponentWins > maxLosses) {
            addLog(`Contract Failed! Lost too many tricks.`, true);
            endRound(newTricks); return;
        }
        if (!boundActive && newTricks[buyerTeam] >= bid.amount) {
            endRound(newTricks); return;
        }

        if (roundNumber < 9) {
            setRoundNumber(r => r + 1);
            setTurnIndex(winner);
        } else {
            endRound(newTricks);
        }
    };

    const endRound = (finalTricks, forceEnd=false) => {
        setGameState('roundEnd'); 
        const buyerTeam = (bid.player === 0 || bid.player === 2) ? 0 : 1;
        let delta0 = 0, delta1 = 0;
        let boundWinner = -1;
        if (boundActive) {
                if (finalTricks[buyerTeam] === 9) boundWinner = buyerTeam;
                else if (forceEnd || roundNumber === 9) boundWinner = (1 - buyerTeam);
        }
        if (boundWinner !== -1) {
            setBoundScore(prev => { const newB = [...prev]; newB[boundWinner]++; return newB; });
            setScores([0,0]); setGameState('gameEnd'); return;
        }
        if (finalTricks[buyerTeam] >= bid.amount) {
            if (buyerTeam === 0) { delta0 = bid.amount; delta1 = 0; } else { delta1 = bid.amount; delta0 = 0; }
        } else {
            const penalty = bid.malzoum ? 6 : bid.amount * 2;
            if (buyerTeam === 0) { delta0 = 0; delta1 = penalty; } else { delta1 = 0; delta0 = penalty; }
        }
        const newScores = [scores[0] + delta0, scores[1] + delta1];
        setScores(newScores);
        if (newScores[0] >= 30 && newScores[1] === 0) { setBoundScore(prev => [prev[0]+1, prev[1]]); setScores([0,0]); setGameState('gameEnd'); return; }
        if (newScores[1] >= 30 && newScores[0] === 0) { setBoundScore(prev => [prev[0], prev[1]+1]); setScores([0,0]); setGameState('gameEnd'); return; }
        if (newScores[0] >= 54 || newScores[1] >= 54) { 
            const winner = newScores[0] >= 54 ? 0 : 1;
            setBoundScore(prev => { const newB = [...prev]; newB[winner]++; return newB; });
            setScores([0,0]); setGameState('gameEnd'); 
        } else {
            addLog(`Round Over. Scores: ${newScores[0]} - ${newScores[1]}`);
            const dealerTeam = (dealerIndex===0||dealerIndex===2) ? 0 : 1;
            const opponentTeam = dealerTeam===0 ? 1 : 0;
            let nextDealer = dealerIndex;
            if (newScores[dealerTeam] > newScores[opponentTeam]) nextDealer = NEXT_PLAYER[dealerIndex]; 
            setTimeout(() => startGame(nextDealer), 4000);
        }
    };
    
    // Renders
    const renderStartMenu = () => (
        <div className="modal-overlay">
            <div className="modal-content">
                <h1>🇴🇲 Omani Mushtara 🃏</h1>
                <p style={{color: '#bdc3c7', marginBottom: '20px'}}>The Trick-Taking Game of the Gulf.</p>
                <button onClick={() => startGame(0)}>Start Game</button>
            </div>
        </div>
    );
    
    const renderSuitIcon = (s) => (
        <span style={{fontSize: '1em'}}>{s==='S'?'♠':s==='H'?'♥':s==='C'?'♣':'♦'}</span>
    );
    
    const renderBack = () => <div className="card-back"></div>;

    return (
        <div className="game-container">
            <style>{styles}</style>
            <AIPlayer playerIdx={1} />
            <AIPlayer playerIdx={2} />
            <AIPlayer playerIdx={3} />

            {gameState === 'startMenu' && renderStartMenu()}

            {(gameState !== 'startMenu' && gameState !== 'lobby') && (
                <div className="status-bar">
                    <div className="score-box">Team You: {scores[0]} ({tricksWon[0]})</div>
                    <div className="bound-score">BOUNDS: {boundScore[0]} - {boundScore[1]}</div>
                    <div className="score-box">Team CPU: {scores[1]} ({tricksWon[1]})</div>
                </div>
            )}
            
            {/* Contract Display */}
            {bid.amount > 0 && gameState !== 'bidding' && gameState !== 'choosingHokum' && (
                <div className="contract-display">
                    <div className="contract-label">{bid.malzoum ? "MALZOUM" : "CONTRACT"}</div>
                    <div className="contract-content">
                        <div className="contract-value">{bid.amount}</div>
                        <div className={`contract-suit ${['H','D'].includes(bid.suit) ? 'red' : ''}`} style={{color: ['H','D'].includes(bid.suit) ? '#e74c3c' : 'white'}}>
                            {renderSuitIcon(bid.suit)}
                        </div>
                    </div>
                    <div className="contract-label" style={{fontSize:'0.6em', marginTop:'5px'}}>Buyer: P{bid.player}</div>
                </div>
            )}

            {/* Game Table */}
            {(gameState === 'bidding' || gameState === 'choosingHokum' || gameState === 'playing' || gameState === 'roundEnd') && (
                <React.Fragment>
                    <div className="top-area">
                        <div className={`player-area ${turnIndex===2 ? 'active-turn':''}`}>
                            <div className="player-name">Partner (P2)</div>
                            <div className="hand">{players[2].map((c,i) => <div key={i}>{renderBack()}</div>)}</div>
                        </div>
                    </div>

                    <div className="middle-area">
                        <div className={`player-area ${turnIndex===1 ? 'active-turn':''}`}>
                            <div className="player-name">CPU (P1)</div>
                            <div className="hand" style={{flexDirection:'column', minWidth:'auto', height:'300px'}}>
                                {players[1].map((c,i) => <div key={i} style={{margin:'-40px 0', transform:'rotate(90deg)'}}>{renderBack()}</div>)}
                            </div>
                        </div>

                        <div className="trick-area">
                            {trick.map((t) => (
                                <div key={t.player} className={`trick-card p${t.player}`}>
                                    <Card card={t.card} roundNumber={roundNumber} yidhamman={yidhamman} />
                                </div>
                            ))}
                            {gameState === 'gameEnd' && (
                                <div className="modal-content" style={{position:'absolute'}}>
                                    <h2>Game Over!</h2>
                                    <h3>{boundScore[0] > boundScore[1] ? 'YOU WIN A BOUND!' : 'CPU WINS A BOUND!'}</h3>
                                    <button onClick={() => {startGame(0);}}>Next Game</button>
                                </div>
                            )}
                            {gameState === 'choosingHokum' && currentBidder === 0 && (
                                <div className="modal-content" style={{position:'absolute', zIndex:400}}>
                                    <h3>You Won! Choose Hokum:</h3>
                                    <div className="suit-controls">
                                        {SUITS.map(s => (
                                            <button key={s} className="suit-btn" onClick={() => userSelectSuit(s)}>
                                                {renderSuitIcon(s)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`player-area ${turnIndex===3 ? 'active-turn':''}`}>
                            <div className="player-name">CPU (P3)</div>
                            <div className="hand" style={{flexDirection:'column', minWidth:'auto', height:'300px'}}>
                                {players[3].map((c,i) => <div key={i} style={{margin:'-40px 0', transform:'rotate(-90deg)'}}>{renderBack()}</div>)}
                            </div>
                        </div>
                    </div>

                    {/* Bidding Overlays */}
                    {gameState === 'bidding' && currentBidder === 0 && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <h3>{isDealerTurn ? "Dealer Choice" : `Make your Bid (Current: ${maxBid === 5 ? 0 : maxBid})`}</h3>
                                <div className="bid-controls">
                                    {[6,7,8].map(amt => (
                                        <button key={amt} className="suit-btn" 
                                            disabled={isDealerTurn ? (amt!==6 && amt!==7 && amt!==8) : (amt <= maxBid)} 
                                            onClick={() => {
                                                if(isDealerTurn && amt===6) { /* User chooses Normal 6 */ }
                                                userBid(amt);
                                            }}
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                                {isDealerTurn && (
                                    <div style={{marginTop:10}}>
                                        <div style={{marginBottom:5}}>Special Options:</div>
                                        <div style={{display:'flex', justifyContent:'center', gap:10}}>
                                            <button className="special" onClick={() => userMalzoum()}>Malzoum (6)</button>
                                        </div>
                                        <button className="secondary" onClick={userRedeal} style={{marginTop:10}}>Redeal (-1 Score)</button>
                                    </div>
                                )}
                                {!isDealerTurn && <button className="secondary" onClick={userPass}>Pass</button>}
                            </div>
                        </div>
                    )}
                    
                    {/* Bound Popup */}
                    {popup && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <h3>{popup.message}</h3>
                                <button onClick={popup.onConfirm}>YES</button>
                                <button className="secondary" onClick={popup.onCancel}>NO</button>
                            </div>
                        </div>
                    )}

                    <div className="bottom-area">
                        <div className={`player-area ${turnIndex===0 ? 'active-turn':''}`}>
                            <div className="player-name">You (P0) {dealerIndex===0 && <span className="player-badge">Dealer</span>}</div>
                            <div className="hand">
                                {players[0].map(c => (
                                    <Card 
                                        key={c.id} 
                                        card={c} 
                                        roundNumber={roundNumber} 
                                        yidhamman={yidhamman}
                                        onClick={() => {
                                            if(turnIndex === 0 && gameState === 'playing') {
                                                const check = checkMoveValidity(c, players[0]);
                                                if(check.valid) playCard(0, c);
                                                else addLog(`❌ Invalid: ${check.reason}`, true);
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="log-container" ref={logRef}>
                        {log.map((l, i) => (
                            <div key={i} className={`log-msg ${l.important ? 'important' : ''}`}>
                                {l.text}
                            </div>
                        ))}
                    </div>
                </React.Fragment>
            )}
        </div>
    );
};

export default App;