
export enum Suit {
  HEARTS = 'HEARTS',
  DIAMONDS = 'DIAMONDS',
  CLUBS = 'CLUBS',
  SPADES = 'SPADES',
}

export enum Rank {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
}

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  isBot: boolean;
}

export interface UserProfile {
  name: string;
  xp: number;
  level: number;
  wins: number;
  gamesPlayed: number;
  googleId?: string;
  email?: string;
  avatarUrl?: string;
}

export enum PileSide {
  LEFT = 'LEFT',   // Spades or Hearts
  RIGHT = 'RIGHT', // Clubs or Diamonds
}

export type GameStatus = 'SETUP' | 'PLAYING' | 'GAME_OVER' | 'TUTORIAL';

export interface GameLogEntry {
  id: string;
  timestamp: number;
  playerId: number;
  playerName: string;
  type: 'PLAY' | 'DRAW' | 'PASS' | 'GAME_OVER';
  description: string;
}

export interface ChatMessage {
  id: string;
  playerId: number;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  deck: Card[];
  players: Player[];
  currentPlayerIndex: number;
  leftPile: Card[];
  rightPile: Card[];
  leftPileFinished: boolean; // True if Ace was just played
  rightPileFinished: boolean; // True if Ace was just played
  cardsPlayedThisTurn: Card[]; // Track stacking
  lastPileSidePlayed: PileSide | null; // Track which pile was played on this turn
  status: GameStatus;
  winner: Player | null;
  message: string;
  history: GameLogEntry[];
  chat: ChatMessage[];
}

export type NetworkMode = 'OFFLINE' | 'HOST' | 'CLIENT';

export type NetworkActionType = 'PLAY_CARD' | 'DRAW_CARD' | 'END_TURN' | 'RESTART_GAME' | 'SYNC_STATE' | 'PING' | 'READY' | 'SEND_CHAT';

export interface NetworkAction {
  type: NetworkActionType;
  payload?: any;
}