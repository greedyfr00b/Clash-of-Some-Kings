
import { Card, Rank, Suit, PileSide } from '../types';

export const getCardColor = (suit: Suit): 'red' | 'black' => {
  return suit === Suit.HEARTS || suit === Suit.DIAMONDS ? 'red' : 'black';
};

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
      deck.push({ id: `card-${idCounter++}`, suit, rank });
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

export const isSuitAllowedOnSide = (suit: Suit, side: PileSide): boolean => {
  if (side === PileSide.LEFT) return suit === Suit.SPADES || suit === Suit.HEARTS;
  else return suit === Suit.CLUBS || suit === Suit.DIAMONDS;
};

export const isOppositeSuit = (s1: Suit, s2: Suit, side: PileSide): boolean => {
     if (side === PileSide.LEFT) return (s1 === Suit.SPADES && s2 === Suit.HEARTS) || (s1 === Suit.HEARTS && s2 === Suit.SPADES);
     if (side === PileSide.RIGHT) return (s1 === Suit.CLUBS && s2 === Suit.DIAMONDS) || (s1 === Suit.DIAMONDS && s2 === Suit.CLUBS);
     return false;
};

export const isValidMove = (card: Card, side: PileSide, topCard: Card | undefined, isPileFinished: boolean, cardsPlayedThisTurn: Card[], lastPileSidePlayed: PileSide | null): { valid: boolean; reason?: string } => {
  if (!isSuitAllowedOnSide(card.suit, side)) return { valid: false, reason: 'Wrong deck.' };
  
  if (cardsPlayedThisTurn.length > 0 && lastPileSidePlayed) {
    if (side !== lastPileSidePlayed) return { valid: false, reason: "Must continue playing on the same pile." };
    const lastPlayed = cardsPlayedThisTurn[cardsPlayedThisTurn.length - 1];
    if (lastPlayed.rank !== Rank.ACE) {
       if (card.rank !== lastPlayed.rank + 1) return { valid: false, reason: "Stacking requires consecutive rank." };
       if (!isOppositeSuit(card.suit, lastPlayed.suit, side)) return { valid: false, reason: "Must be opposite color/suit." };
    }
    return { valid: true };
  }

  if (card.rank === Rank.ACE) return { valid: true };
  if (isPileFinished || !topCard) return { valid: true };
  if (card.rank < topCard.rank) return { valid: false, reason: "Must be same value or higher." };
  if (!isOppositeSuit(card.suit, topCard.suit, side)) return { valid: false, reason: "Must be opposite suit of top card." };
  return { valid: true };
};
