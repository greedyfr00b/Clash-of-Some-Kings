
import { Card, Rank, Suit, PileSide, Player } from '../types';

// Helper to get color
export const getCardColor = (suit: Suit): 'red' | 'black' => {
  return suit === Suit.HEARTS || suit === Suit.DIAMONDS ? 'red' : 'black';
};

// Generate standard 52 card deck
export const generateDeck = (): Card[] => {
  const suits = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
  const ranks = [
    Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
    Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE
  ];

  const deck: Card[] = [];
  let idCounter = 0;

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `card-${idCounter++}`,
        suit,
        rank
      });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Formatting helpers
export const formatRank = (rank: Rank): string => {
  switch (rank) {
    case Rank.JACK: return 'J';
    case Rank.QUEEN: return 'Q';
    case Rank.KING: return 'K';
    case Rank.ACE: return 'A';
    default: return rank.toString();
  }
};

export const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case Suit.HEARTS: return '♥';
    case Suit.DIAMONDS: return '♦';
    case Suit.CLUBS: return '♣';
    case Suit.SPADES: return '♠';
  }
};

// Rule Validation

// Left Pile: Spades or Hearts
// Right Pile: Clubs or Diamonds
export const isSuitAllowedOnSide = (suit: Suit, side: PileSide): boolean => {
  if (side === PileSide.LEFT) {
    return suit === Suit.SPADES || suit === Suit.HEARTS;
  } else {
    return suit === Suit.CLUBS || suit === Suit.DIAMONDS;
  }
};

// Helper: Check if suits are opposite in the context of the game piles
// Left (Spades/Hearts) and Right (Clubs/Diamonds) inherently handle color opposition
// by their definition, but we double check specific suit pairings.
export const isOppositeSuit = (s1: Suit, s2: Suit, side: PileSide): boolean => {
     if (side === PileSide.LEFT) {
        // Spades (Black) <> Hearts (Red)
        return (s1 === Suit.SPADES && s2 === Suit.HEARTS) || (s1 === Suit.HEARTS && s2 === Suit.SPADES);
     }
     if (side === PileSide.RIGHT) {
        // Clubs (Black) <> Diamonds (Red)
        return (s1 === Suit.CLUBS && s2 === Suit.DIAMONDS) || (s1 === Suit.DIAMONDS && s2 === Suit.CLUBS);
     }
     return false;
};

export const isValidMove = (
  card: Card,
  side: PileSide,
  topCard: Card | undefined,
  isPileFinished: boolean,
  cardsPlayedThisTurn: Card[],
  lastPileSidePlayed: PileSide | null
): { valid: boolean; reason?: string } => {

  // 1. Basic Deck Suit Check
  if (!isSuitAllowedOnSide(card.suit, side)) {
    return { valid: false, reason: `Wrong deck.` };
  }

  // 2. Stacking Constraints
  // If you have already played a card this turn:
  if (cardsPlayedThisTurn.length > 0 && lastPileSidePlayed) {
    // Must play on the same pile
    if (side !== lastPileSidePlayed) {
      return { valid: false, reason: "Must continue playing on the same pile." };
    }
    
    const lastPlayed = cardsPlayedThisTurn[cardsPlayedThisTurn.length - 1];
    
    // Strict Consecutive Rank Constraint:
    // You can only play once per turn unless it's consecutive (e.g., 2 then 3).
    // This means rank must be exactly previous rank + 1.
    // EXCEPTION: If the last card played was an ACE, the pile is reset, so consecutive rank is not required.
    if (lastPlayed.rank !== Rank.ACE) {
       if (card.rank !== lastPlayed.rank + 1) {
         return { valid: false, reason: "Stacking requires consecutive rank (e.g. 2 then 3)." };
       }
       
       // Stacking also requires Opposite Suit/Color
       if (!isOppositeSuit(card.suit, lastPlayed.suit, side)) {
          return { valid: false, reason: "Must be opposite color/suit." };
       }
    }

    // If we are stacking and satisfy constraints, the move is valid.
    return { valid: true };
  }

  // 3. Ace Logic (Always playable on correct side if checking against board state)
  if (card.rank === Rank.ACE) {
    return { valid: true };
  }

  // 4. If Pile is "Finished" (Empty or Ace was cleared), we can start with any valid suit card
  if (isPileFinished || !topCard) {
    return { valid: true };
  }

  // 5. Normal Play Logic (First card of turn or starting fresh)
  // Must be same value or higher than top of PILE
  if (card.rank < topCard.rank) {
    return { valid: false, reason: "Must be same value or higher." };
  }

  // Must be opposite suit of the top card
  if (!isOppositeSuit(card.suit, topCard.suit, side)) {
    return { valid: false, reason: "Must be opposite suit of top card." };
  }

  return { valid: true };
};
