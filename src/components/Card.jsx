import React from 'react';

const Card = ({ card, roundNumber, yidhamman, onClick, style }) => {
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
        <div className={`card ${isRed ? 'red' : 'black'}`} onClick={onClick} style={style}>
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

export default Card;
