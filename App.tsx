
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Card,
  GameState,
  Player,
  Suit,
  Rank,
  PileSide,
  GameStatus,
  NetworkMode,
  NetworkAction,
  GameLogEntry,
  UserProfile,
  ChatMessage
} from './types';
import {
  generateDeck,
  shuffleDeck,
  formatRank,
  getSuitSymbol,
  getCardColor,
  isValidMove,
  isSuitAllowedOnSide
} from './utils/gameLogic';
import { Loader2, Trophy, RotateCcw, Hand, ArrowUpCircle, Layers, Wifi, Users, Copy, Share2, Smartphone, Play, Link as LinkIcon, AlertTriangle, Sparkles, Sword, GraduationCap, ScrollText, BrainCircuit, Bot, ChevronRight, Download, QrCode, Maximize, Minimize, MessageSquare, X, Clock, Shuffle, Volume2, VolumeX, User, Settings, CheckCircle2, Menu, Star, Zap, TrendingUp, Award, Crown, Send, RefreshCw, LogOut } from 'lucide-react';
import { playSound, toggleMute, isMuted as getMutedState } from './utils/audio';
// @ts-ignore
import { Peer, DataConnection } from 'peerjs';
// @ts-ignore
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import JSZip from 'jszip';

// --- Constants ---

const BOT_NAMES = ['Ironclad', 'Shadow', 'Viper', 'Raven', 'Storm', 'Crimson', 'Azure', 'Onyx'];
const APP_ID_PREFIX = 'clash-kings-v2-'; // Prefix to ensure uniqueness on PeerJS server
const GOOGLE_CLIENT_ID = "25392198498-tkbjik36sdqijddq7o7o0lel6odohpr2.apps.googleusercontent.com";

const XP_RATES = {
  BEGINNER: 50,
  INTERMEDIATE: 100,
  ADVANCED: 200,
  MULTIPLAYER: 150
};

// Bot Personality Data
type BotPersonality = {
  style: string;
  lines: {
    PLAYER_ACE: string[]; // When player plays an Ace
    BOT_ACE: string[];    // When this bot plays an Ace
    PLAYER_LOW: string[]; // When player has 1-2 cards
    BOT_LOW: string[];    // When this bot has 1-2 cards
    WIN: string[];        // When this bot wins
    LOSE: string[];       // When player wins
  }
};

const BOT_PERSONALITIES: Record<string, BotPersonality> = {
  'Viper': {
    style: 'Aggressive',
    lines: {
      PLAYER_ACE: ["Cheap trick.", "You got lucky with that Ace.", "Seriously? Another reset?", "Coward's move."],
      BOT_ACE: ["Back to square one.", "I control this game.", "Did that ruin your plans?", "Resetting the board."],
      PLAYER_LOW: ["Don't you dare win.", "You're not finishing this.", "I'm watching you.", "Just one mistake is all I need."],
      BOT_LOW: ["It's over for you.", "I can taste the victory.", "Pack it up, I've won.", "Too easy."],
      WIN: ["Pathetic performance.", "Kneel before the Viper.", "Was that even a challenge?", "Ez."],
      LOSE: ["You cheated.", "Impossible!", "Pure luck, nothing else.", "I demand a rematch."]
    }
  },
  'Crimson': {
    style: 'Arrogant',
    lines: {
      PLAYER_ACE: ["A desperate move.", "Delaying the inevitable.", "Cute Ace.", "That won't save you."],
      BOT_ACE: ["Witness true power.", "Observe a master at work.", "I demand a clean slate.", "Begone."],
      PLAYER_LOW: ["You think you can beat me?", "Impressive, for a novice.", "Don't get cocky.", "You're getting close... too close."],
      BOT_LOW: ["Behold, my final form.", "Prepare for your demise.", "I am unstoppable.", "This game is mine."],
      WIN: ["As expected.", "The crown suits me.", "Bow down.", "I am simply superior."],
      LOSE: ["A fluke.", "How did this happen?", "You will pay for this.", "My reign... ended?"]
    }
  },
  'Ironclad': {
    style: 'Robotic',
    lines: {
      PLAYER_ACE: ["Ace detected. Strategy recalibrating.", "Reset acknowledged.", "Probability of victory adjusted.", "Variable introduced."],
      BOT_ACE: ["Initiating reset protocol.", "Clearing stack buffer.", "Tactical Ace deployed.", "Optimizing board state."],
      PLAYER_LOW: ["Warning: Opponent near victory condition.", "Threat level: Critical.", "Analyzing counter-measures.", "Defeat imminent."],
      BOT_LOW: ["Victory probability: 95%.", "Finishing sequence initiated.", "Outcome determined.", "Calculations complete."],
      WIN: ["Mission accomplished.", "Superior processing.", "Humanity exceeded.", "Victory logic executed."],
      LOSE: ["System error.", "Calculation anomaly detected.", "Rebooting strategy.", "You are an outlier."]
    }
  },
  'Onyx': {
    style: 'Cold/Calculated',
    lines: {
      PLAYER_ACE: ["An efficient delay.", "Predictable.", "You bought yourself time.", "A logical choice."],
      BOT_ACE: ["Let us start over.", "I am wiping the slate.", "Necessary sacrifice.", "Balance restored."],
      PLAYER_LOW: ["Careful now.", "One card left? Interesting.", "The endgame approaches.", "I see your strategy."],
      BOT_LOW: ["Checkmate in 2 moves.", "The end is near.", "Do not struggle.", "Silence, please."],
      WIN: ["The result was inevitable.", "Cold precision.", "You never stood a chance.", "Checkmate."],
      LOSE: ["A miscalculation.", "Well played.", "I underestimated you.", "An intriguing outcome."]
    }
  },
  'Azure': {
    style: 'Friendly',
    lines: {
      PLAYER_ACE: ["Nice Ace!", "Whoa, reset!", "Good save there!", "Keeping it fresh!"],
      BOT_ACE: ["Let's mix it up!", "Fresh start for everyone!", "Needed that!", "Here comes an Ace!"],
      PLAYER_LOW: ["You're so close!", "Don't leave me behind!", "Wait up!", "Wow, almost done?"],
      BOT_LOW: ["I might actually win!", "Fingers crossed!", "Almost there!", "Wish me luck!"],
      WIN: ["GG! That was fun!", "Yay! I won!", "Good game, friend!", "That was intense!"],
      LOSE: ["Congrats!", "You got me!", "Well played!", "Next time I'll get you!"]
    }
  },
  'Storm': {
    style: 'Energetic',
    lines: {
      PLAYER_ACE: ["Boom! Ace!", "What a twist!", "Lightning strikes!", "Chaos!"],
      BOT_ACE: ["Thunder crash!", "Shaking things up!", "Reset button smashed!", "Boom!"],
      PLAYER_LOW: ["Speed run?", "You're so fast!", "Wait, slow down!", "Panic mode!"],
      BOT_LOW: ["I'm electric right now!", "Coming through!", "Can't stop me!", "Zooming to the finish!"],
      WIN: ["Victory screech!", "Lightning fast!", "I am the storm!", "What a rush!"],
      LOSE: ["Oof, struck down!", "You're too fast!", "Whatever, good game!", "Blown away!"]
    }
  },
  'Shadow': {
    style: 'Edgy',
    lines: {
      PLAYER_ACE: ["A flash of light... annoying.", "You prolong your suffering.", "The void resets.", "Futile."],
      BOT_ACE: ["Fade to black.", "Into the abyss.", "Darkness returns.", "Nothing remains."],
      PLAYER_LOW: ["The light flickers.", "Do not think you've escaped.", "I am the shadow behind you.", "Close..."],
      BOT_LOW: ["From the shadows, I strike.", "Almost invisible.", "The end is silent.", "Unseen victory."],
      WIN: ["Darkness prevails.", "Welcome to the void.", "Lights out.", "Consumed."],
      LOSE: ["The light burns.", "Retreating to shadows.", "You survived...", "Until next time."]
    }
  },
  'Raven': {
    style: 'Mysterious',
    lines: {
      PLAYER_ACE: ["A twist of fate.", "The cards shift.", "An unexpected turn.", "Destiny changes."],
      BOT_ACE: ["The prophecy resets.", "As foretold.", "A new chapter begins.", "The cycle repeats."],
      PLAYER_LOW: ["Your destiny awaits.", "Is this your fate?", "The end draws near.", "Time is short."],
      BOT_LOW: ["My fortune looks bright.", "The stars align.", "Fate favors me.", "Almost time."],
      WIN: ["It was written.", "Destiny fulfilled.", "The cards have spoken.", "Fate is absolute."],
      LOSE: ["A twist in the tale.", "Fate is cruel.", "I did not foresee this.", "Prophecy broken."]
    }
  }
};

const getBotLine = (botName: string, type: keyof BotPersonality['lines']): string => {
  const personality = BOT_PERSONALITIES[botName] || BOT_PERSONALITIES['Ironclad']; // Fallback
  const lines = personality.lines[type];
  return lines[Math.floor(Math.random() * lines.length)];
};

// Level Calculation: quadratic curve (level 2 at 100xp, 3 at 400xp, etc)
// XP = 100 * (Level - 1)^2
const getLevelData = (totalXp: number) => {
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const currentLevelBaseXp = 100 * Math.pow(level - 1, 2);
  const nextLevelBaseXp = 100 * Math.pow(level, 2);
  const progress = totalXp - currentLevelBaseXp;
  const required = nextLevelBaseXp - currentLevelBaseXp;
  return { level, progress, required, nextLevelBaseXp };
};

// Robust Peer Configuration with single reliable Google STUN server
const PEER_CONFIG = {
  debug: 0, 
  secure: true,
  pingInterval: 5000,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
};

type TutorialPosition = 'top' | 'center' | 'bottom';

interface TutorialStep {
  id: string;
  text: string;
  highlight: string | null;
  requiredAction: string;
  position: TutorialPosition;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'INTRO',
    text: "Welcome to Clash of Kings. Your goal is to empty your hand.",
    highlight: null,
    requiredAction: 'NEXT',
    position: 'center'
  },
  {
    id: 'PLAY_1',
    text: "Rule: Play Higher Rank & Opposite Suit (e.g. Hearts ♥ on Spades ♠). Tap Heart 5.",
    highlight: 'HAND_CARD_0',
    requiredAction: 'PLAY_CARD_0', 
    position: 'top'
  },
  {
    id: 'PLAY_2',
    text: "Great! Now chain the Spade 6 (Black) onto the Heart 5.",
    highlight: 'HAND_CARD_0', // Index 0 (cards shift after play)
    requiredAction: 'PLAY_CARD_0',
    position: 'top'
  },
  {
    id: 'STEP_END_TURN',
    text: "Locked to Left Pile! You cannot switch sides mid-turn. Club 2 is too low for Left. End Turn.",
    highlight: 'BTN_END_TURN',
    requiredAction: 'END_TURN',
    position: 'center'
  },
  {
    id: 'DRAW_INFO',
    text: "Opponent played Diamond 4 on Right. Your turn! Draw a card.",
    highlight: 'BTN_DRAW', // Highlight the button immediately
    requiredAction: 'DRAW',
    position: 'center' // Center to avoid covering the button at bottom
  },
  {
    id: 'PLAY_ACE',
    text: "You drew an Ace! Aces are wild and reset the pile. Tap the Diamond Ace to clear the Right Pile.",
    highlight: 'HAND_CARD_LAST',
    requiredAction: 'PLAY_ACE',
    position: 'top'
  },
  {
    id: 'FINISH',
    text: "You are ready to rule! Good luck.",
    highlight: null,
    requiredAction: 'FINISH',
    position: 'center'
  }
];

// --- Helper Functions ---

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed potentially confusing chars (I, 1, O, 0)
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Simple JWT decoder for client-side google tokens (no validation)
const decodeJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// --- Visual Components ---

const Background = () => (
  <div className="absolute inset-0 pointer-events-none z-0">
    {/* Base Gradient - Deep Felt Green */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e5132_0%,#0d2b1a_100%)]" />
    
    {/* Felt Texture Noise */}
    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] mix-blend-overlay" />
    
    {/* Vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
    
    {/* Floating Particles (Abstract) */}
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
      <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[10%] right-[20%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  </div>
);

const CardView: React.FC<{
  card: Card;
  onClick?: () => void;
  className?: string;
  isPlayable?: boolean;
  isSelected?: boolean;
  mini?: boolean;
  highlight?: boolean;
  style?: any;
}> = ({ card, onClick, className = '', isPlayable = false, isSelected = false, mini = false, highlight = false, style }) => {
  const color = getCardColor(card.suit);
  const symbol = getSuitSymbol(card.suit);
  const rankStr = formatRank(card.rank);
  
  // Use a deterministic rotation to avoid jitter on re-renders
  const rotation = useMemo(() => Math.random() * 4 - 2, []);
  
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ 
        scale: isSelected ? 1.1 : (highlight ? 1.15 : 1), 
        y: isSelected ? -24 : (highlight ? -30 : 0), 
        opacity: 1,
        rotate: isSelected ? 0 : rotation,
        zIndex: isSelected || highlight ? 50 : 'auto'
      }}
      exit={{ scale: 0.5, opacity: 0, y: -50 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      style={style}
      className={`
        relative flex flex-col items-center justify-between
        bg-white rounded-xl shadow-xl select-none overflow-hidden
        border border-gray-200
        ${mini ? 'w-8 h-12 text-xs' : 'w-20 h-32 sm:w-28 sm:h-44 text-xl sm:text-3xl'}
        ${(!isSelected && isPlayable) || highlight ? 'cursor-pointer ring-4 ring-yellow-400/70 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}
        ${color === 'red' ? 'text-red-600' : 'text-gray-900'}
        ${className}
      `}
    >
      {/* Paper Texture */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
      
      <div className="z-10 self-start pl-1.5 pt-0.5 font-black leading-none font-mono tracking-tighter">{rankStr}</div>
      <div className={`z-10 ${mini ? 'text-sm' : 'text-4xl sm:text-6xl drop-shadow-sm'}`}>{symbol}</div>
      <div className="z-10 self-end pr-1.5 pb-0.5 font-black rotate-180 leading-none font-mono tracking-tighter">{rankStr}</div>
    </motion.div>
  );
};

const CardBack: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`
      w-16 h-24 sm:w-28 sm:h-44 rounded-lg sm:rounded-xl shadow-xl border border-white/10
      bg-blue-900 flex items-center justify-center relative overflow-hidden
      ${className}
    `}
  >
    {/* Intricate Pattern CSS */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e3a8a_0%,#172554_100%)]" />
    <div className="absolute inset-0 opacity-30" 
      style={{
        backgroundImage: 'radial-gradient(#f59e0b 1px, transparent 1px), radial-gradient(#f59e0b 1px, transparent 1px)',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0, 5px 5px'
      }} 
    />
    <div className="w-8 h-8 sm:w-12 sm:h-12 border-2 border-yellow-500/30 rounded-full flex items-center justify-center relative z-10">
       <Sword size={16} className="text-yellow-500/40 sm:w-6 sm:h-6" />
    </div>
  </div>
);

const EmptyPile: React.FC<{ side: PileSide; isFinished: boolean; onClick?: () => void; isTarget?: boolean; highlight?: boolean }> = ({ side, isFinished, onClick, isTarget, highlight }) => (
  <motion.div 
    onClick={onClick}
    animate={{ 
      scale: isTarget || highlight ? 1.05 : 1,
      borderColor: isTarget || highlight ? 'rgba(250, 204, 21, 0.8)' : (isFinished ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255,255,255,0.2)'),
      backgroundColor: isTarget || highlight ? 'rgba(250, 204, 21, 0.1)' : 'rgba(0,0,0,0.3)'
    }}
    className={`
    w-20 h-32 sm:w-28 sm:h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-1
    cursor-pointer backdrop-blur-sm shadow-inner
    transition-colors duration-300 relative
    ${highlight ? 'ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : ''}
  `}>
    <span className="text-[10px] sm:text-xs font-bold text-white/50 tracking-widest uppercase font-mono mb-1">
      {side === PileSide.LEFT ? 'Left' : 'Right'}
    </span>
    <div className="flex gap-2 text-white/40 text-3xl sm:text-5xl">
      {side === PileSide.LEFT ? 
        <><span className="drop-shadow-lg">♠</span><span className="text-red-400/40 drop-shadow-lg">♥</span></> : 
        <><span className="drop-shadow-lg">♣</span><span className="text-red-400/40 drop-shadow-lg">♦</span></>
      }
    </div>
    {isFinished && (
      <motion.div 
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        className="absolute bottom-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
      >
        ANY
      </motion.div>
    )}
  </motion.div>
);

const ActionButton: React.FC<{ 
  onClick: () => void; 
  color: 'blue' | 'orange'; 
  icon?: any; 
  label: string; 
  subLabel?: React.ReactNode;
  disabled?: boolean;
  highlight?: boolean;
}> = ({ onClick, color, icon: Icon, label, subLabel, disabled, highlight }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative overflow-hidden group
      min-w-[110px] sm:min-w-[150px] px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl 
      flex items-center justify-between gap-2 sm:gap-3
      shadow-lg transition-all duration-200
      border border-white/10
      z-30
      ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'}
      ${color === 'blue' ? 'bg-gradient-to-br from-blue-600 to-indigo-800 shadow-blue-900/40 text-white' : ''}
      ${color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-red-700 shadow-orange-900/40 text-white' : ''}
      ${highlight ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-black animate-pulse z-50 scale-105' : ''}
    `}
  >
    {/* Shine effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    
    <div className="flex flex-col items-start">
      <span className="font-black text-xs sm:text-base uppercase tracking-wider leading-none">{label}</span>
      {subLabel && (
        <div className={`text-[9px] sm:text-[10px] font-mono mt-0.5 leading-tight ${typeof subLabel === 'string' ? (disabled && subLabel.includes('Max') ? 'text-red-200' : 'opacity-60') : ''}`}>
          {subLabel}
        </div>
      )}
    </div>
    
    {Icon && (
      <div className={`p-1.5 sm:p-2 rounded-full ${color === 'blue' ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
      </div>
    )}
  </button>
);

const TutorialOverlay: React.FC<{ stepIndex: number; onNext: () => void }> = ({ stepIndex, onNext }) => {
  const step = TUTORIAL_STEPS[stepIndex];
  if (!step) return null;

  const getPositionClasses = (pos: TutorialPosition) => {
    switch (pos) {
      case 'top': return 'top-[16%]'; // High enough to clear piles
      case 'center': return 'top-1/2 -translate-y-1/2';
      case 'bottom': return 'bottom-[20%]'; 
      default: return 'top-[15%]';
    }
  };

  return (
     <AnimatePresence mode="wait">
       <motion.div 
         layout
         initial={{ opacity: 0, y: 20, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         key={`tutorial-step-${stepIndex}`}
         className={`absolute left-0 right-0 mx-auto w-[90%] max-w-md z-[60] pointer-events-none flex justify-center ${getPositionClasses(step.position)}`}
       >
          <div className="bg-black/80 backdrop-blur-xl border border-yellow-500/30 pl-5 pr-4 py-4 rounded-full shadow-2xl pointer-events-auto flex items-center gap-4 relative overflow-hidden w-full ring-1 ring-white/10">
             {/* Decor */}
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

             <div className="flex-shrink-0 bg-yellow-500/20 p-2 rounded-full">
                <Sparkles size={20} className="text-yellow-400 animate-pulse" />
             </div>
             
             <div className="flex-1">
                <p className="text-white text-sm sm:text-base font-medium leading-snug text-shadow-sm">
                    {step.text}
                </p>
             </div>

             {step.requiredAction === 'NEXT' || step.requiredAction === 'FINISH' ? (
               <button 
                 onClick={() => { playSound('click'); onNext(); }}
                 className="flex-shrink-0 bg-white text-black hover:bg-gray-200 text-xs font-bold py-2 px-4 rounded-full shadow-lg transition flex items-center gap-1 active:scale-95"
               >
                  {step.requiredAction === 'FINISH' ? 'Play' : 'Next'} <ChevronRight size={14} />
               </button>
             ) : (
                <div className="w-2" /> // Spacer
             )}
          </div>
       </motion.div>
     </AnimatePresence>
  );
};

const ChatModal: React.FC<{ 
  messages: ChatMessage[]; 
  currentPlayerId: number; 
  onSend: (msg: string) => void; 
  onClose: () => void; 
}> = ({ messages, currentPlayerId, onSend, onClose }) => {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
       {/* Backdrop for click out */}
       <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
       
       <motion.div 
         initial={{ opacity: 0, y: 20, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: 20, scale: 0.95 }}
         className="bg-gray-900/95 backdrop-blur-xl border border-white/10 w-full sm:w-96 sm:rounded-2xl h-[60vh] sm:h-[500px] flex flex-col shadow-2xl pointer-events-auto overflow-hidden mb-0 sm:mb-0 rounded-t-2xl"
         onClick={e => e.stopPropagation()}
       >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
             <h3 className="text-white font-bold flex items-center gap-2">
               <MessageSquare size={18} className="text-yellow-500" /> Chat
             </h3>
             <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-white">
               <X size={18} />
             </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {messages.length === 0 && (
               <div className="text-center text-white/20 text-xs italic mt-4">No messages yet. Say hi!</div>
             )}
             {messages.map((msg) => {
               const isMe = msg.playerId === currentPlayerId;
               return (
                 <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-md break-words ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none'}`}>
                       {msg.text}
                    </div>
                    <div className="text-[10px] text-white/30 mt-1 px-1">
                       {isMe ? 'You' : msg.playerName}
                    </div>
                 </div>
               );
             })}
             <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-black/20 flex gap-2">
             <input 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSend()}
               placeholder="Type a message..."
               className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
               autoFocus
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim()}
               className="p-2 bg-yellow-500 text-black rounded-full disabled:opacity-50 hover:bg-yellow-400 transition"
             >
               <ArrowUpCircle size={20} />
             </button>
          </div>
       </motion.div>
    </div>
  );
};

const GameHistoryModal: React.FC<{ history: GameLogEntry[], onClose: () => void }> = ({ history, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
       <motion.div
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="bg-gray-900 border border-white/10 p-6 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden max-h-[80vh] flex flex-col"
       >
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
               <ScrollText className="text-yellow-500" /> Battle Log
             </h3>
             <button onClick={() => { playSound('click'); onClose(); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
               <X size={16} className="text-white" />
             </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1 bg-black/20 rounded-xl p-4 border-inner border-white/5">
             {history.length === 0 && <div className="text-white/30 text-center italic py-10">No actions yet.</div>}
             {history.map((entry) => (
               <div key={entry.id} className={`flex gap-3 p-3 rounded-lg border ${entry.playerId === 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className={`mt-1 ${entry.playerId === 0 ? 'text-blue-400' : 'text-red-400'}`}>
                     {entry.type === 'PLAY' && <Layers size={16} />}
                     {entry.type === 'DRAW' && <ArrowUpCircle size={16} className="rotate-180" />}
                     {entry.type === 'PASS' && <Clock size={16} />}
                     {entry.type === 'GAME_OVER' && <Trophy size={16} />}
                  </div>
                  <div>
                     <div className="text-[10px] uppercase font-bold opacity-50 mb-0.5 flex gap-2">
                       <span>{entry.playerName}</span>
                       <span>•</span>
                       <span>{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                     </div>
                     <div className="text-sm text-white/90 font-medium">{entry.description}</div>
                  </div>
               </div>
             ))}
          </div>
       </motion.div>
    </div>
  );
};

const StrategiesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const strategies = [
    {
      title: "The Ascension Combo",
      description: "Patience is key! Don't just play single cards. Hold onto consecutive ranks (e.g., 4, 5, 6) with alternating colors to play on a powerful burst turn.",
      difficulty: "Advanced",
      icon: <Sparkles className="text-purple-400" />
    },
    {
      title: "Ace Conservation",
      description: "Aces are your escape hatch. Don't waste them on low-value piles. Save them for when the pile rank is high (Kings/Queens) or when you're completely stuck with no other moves.",
      difficulty: "Intermediate",
      icon: <Sword className="text-yellow-400" />
    },
    {
      title: "Color Balance",
      description: "Always keep an eye on your colors. If you have too many Red cards, aggressively take opportunities to play on Black cards. Don't let yourself get locked out by playing your last connector!",
      difficulty: "Beginner",
      icon: <BrainCircuit className="text-blue-400" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-yellow-500/30 p-6 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden max-h-[90vh] flex flex-col"
      >
         <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-2xl font-bold text-yellow-400 font-serif">Royal Strategies</h3>
            <button onClick={() => { playSound('click'); onClose(); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
              <X size={16} className="text-white" />
            </button>
         </div>

         <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pr-1">
            {strategies.map((strat, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-black/40 rounded-lg">{strat.icon}</div>
                    <div>
                       <h4 className="font-bold text-white text-lg">{strat.title}</h4>
                       <span className="text-xs uppercase tracking-widest text-white/40 font-bold">{strat.difficulty}</span>
                    </div>
                 </div>
                 <p className="text-white/70 text-sm leading-relaxed">{strat.description}</p>
              </div>
            ))}
         </div>

         <button onClick={() => { playSound('click'); onClose(); }} className="mt-6 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition shadow-lg shadow-yellow-500/20 relative z-10">
            Understood
         </button>
      </motion.div>
    </div>
  );
};

const MenuModal: React.FC<{ 
  onResume: () => void; 
  onQuit: () => void; 
  onStrategies: () => void; 
  onHistory: () => void; 
  onDownload: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}> = ({ onResume, onQuit, onStrategies, onHistory, onDownload, isMuted, onToggleMute, isFullscreen, onToggleFullscreen }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
    <motion.div initial={{scale:0.9}} animate={{scale:1}} className="bg-gray-900 border border-white/10 p-8 rounded-3xl w-full max-w-xs text-center space-y-4 shadow-2xl">
       <h2 className="text-2xl font-serif font-bold text-white mb-6">Paused</h2>

       <button onClick={onResume} className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2">
          <Play size={18} className="fill-current" /> Resume
       </button>

       <div className="grid grid-cols-2 gap-3">
          <button onClick={onStrategies} className="py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 flex flex-col items-center justify-center gap-1">
             <BrainCircuit size={18} /> <span className="text-[10px] uppercase">Rules</span>
          </button>
          <button onClick={onHistory} className="py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 flex flex-col items-center justify-center gap-1">
             <ScrollText size={18} /> <span className="text-[10px] uppercase">Log</span>
          </button>
       </div>

       <div className="grid grid-cols-2 gap-3">
          <button onClick={onToggleMute} className="py-3 bg-white/5 text-white/70 font-bold rounded-xl hover:bg-white/10 flex flex-col items-center justify-center gap-1">
             {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
             <span className="text-[10px] uppercase">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button onClick={onToggleFullscreen} className="py-3 bg-white/5 text-white/70 font-bold rounded-xl hover:bg-white/10 flex flex-col items-center justify-center gap-1">
             {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
             <span className="text-[10px] uppercase">{isFullscreen ? 'Exit Full' : 'Full Scrn'}</span>
          </button>
       </div>

       <button onClick={onDownload} className="w-full py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold rounded-xl hover:bg-blue-500/20 flex items-center justify-center gap-2">
          <Download size={18} /> Download Code
       </button>

       <div className="h-px w-full bg-white/10 my-2" />

       <button onClick={onQuit} className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-xl hover:bg-red-500/20 flex items-center justify-center gap-2">
          <X size={18} /> Quit Game
       </button>
    </motion.div>
  </div>
);

const DifficultySelection: React.FC<{ onSelect: (diff: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => void, onBack: () => void }> = ({ onSelect, onBack }) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="bg-gray-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
       >
          <h2 className="text-3xl font-bold text-white mb-2 font-serif">Select Difficulty</h2>
          <p className="text-white/50 mb-8">Choose your opponent's skill level.</p>
          
          <div className="space-y-3">
             <button 
               onClick={() => { playSound('click'); onSelect('BEGINNER'); }}
               className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-between px-6 transition transform hover:scale-[1.02]"
             >
                <span className="flex items-center gap-3"><Bot size={20} /> Beginner</span>
                <span className="text-xs bg-black/20 px-2 py-1 rounded text-white/80">Low Rewards</span>
             </button>
             <button 
               onClick={() => { playSound('click'); onSelect('INTERMEDIATE'); }}
               className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-4 rounded-xl flex items-center justify-between px-6 transition transform hover:scale-[1.02]"
             >
                <span className="flex items-center gap-3"><Bot size={20} /> Intermediate</span>
                <span className="text-xs bg-black/20 px-2 py-1 rounded text-white/80">Balanced</span>
             </button>
             <button 
               onClick={() => { playSound('click'); onSelect('ADVANCED'); }}
               className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 rounded-xl flex items-center justify-between px-6 transition transform hover:scale-[1.02]"
             >
                <span className="flex items-center gap-3"><Bot size={20} /> Advanced</span>
                <span className="text-xs bg-black/20 px-2 py-1 rounded text-white/80">High Rewards</span>
             </button>
          </div>

          <button onClick={() => { playSound('click'); onBack(); }} className="mt-6 text-white/40 hover:text-white text-sm font-medium transition">
            Back
          </button>
       </motion.div>
    </div>
  );
};

const PlayerCountSelection: React.FC<{ onSelect: (count: number) => void, onBack: () => void }> = ({ onSelect, onBack }) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="bg-gray-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
       >
          <h2 className="text-3xl font-bold text-white mb-2 font-serif">Players</h2>
          <p className="text-white/50 mb-8">How many people are playing?</p>
          
          <div className="grid grid-cols-3 gap-3">
             {[2, 3, 4].map(num => (
                <button 
                  key={num}
                  onClick={() => { playSound('click'); onSelect(num); }}
                  className="bg-white/10 hover:bg-white/20 hover:border-yellow-500/50 border border-transparent text-white font-bold py-6 rounded-xl flex flex-col items-center justify-center gap-2 transition"
                >
                   <span className="text-3xl">{num}</span>
                   <span className="text-xs uppercase text-white/40">Players</span>
                </button>
             ))}
          </div>

          <button onClick={() => { playSound('click'); onBack(); }} className="mt-6 text-white/40 hover:text-white text-sm font-medium transition">
            Back
          </button>
       </motion.div>
    </div>
  );
};

// Helper to check subsequent chain length
const getChainLength = (starter: Card, hand: Card[], side: PileSide): number => {
  let length = 1;
  let currentRank = starter.rank;
  let currentSuit = starter.suit;
  let tempHand = [...hand];
  const starterIdx = tempHand.findIndex(c => c.id === starter.id);
  if (starterIdx > -1) tempHand.splice(starterIdx, 1);

  while (true) {
    if (starter.rank === Rank.ACE) break; // Aces are single plays mostly, unless we code complex logic
    
    const nextRank = currentRank + 1;
    // Check for next card in sequence or an Ace
    const nextCardIndex = tempHand.findIndex(c => 
       (c.rank === nextRank && isSuitAllowedOnSide(c.suit, side) && getCardColor(c.suit) !== getCardColor(currentSuit)) ||
       c.rank === Rank.ACE
    );
    
    if (nextCardIndex !== -1) {
      length++;
      const nextCard = tempHand[nextCardIndex];
      if (nextCard.rank === Rank.ACE) {
         // Ace stops the chain count in this simple logic as it resets
         break; 
      }
      currentRank = nextRank;
      currentSuit = nextCard.suit;
      tempHand.splice(nextCardIndex, 1);
    } else {
      break;
    }
  }
  return length;
};

// --- Main App ---

export const App: React.FC = () => {
  // User Profile State (Persistent)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('cok_profile_v2'); // v2 for new schema
    return saved ? JSON.parse(saved) : { name: '', xp: 0, level: 1, wins: 0, gamesPlayed: 0 };
  });

  // Game State
  const [state, setState] = useState<GameState>({
    deck: [],
    players: [],
    currentPlayerIndex: 0,
    leftPile: [],
    rightPile: [],
    leftPileFinished: false,
    rightPileFinished: false,
    cardsPlayedThisTurn: [],
    lastPileSidePlayed: null,
    status: 'SETUP',
    winner: null,
    message: 'SETUP',
    history: [],
    chat: []
  });

  // UI States
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [viewingStrategies, setViewingStrategies] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [setupPhase, setSetupPhase] = useState<'NONE' | 'PLAYER_COUNT' | 'DIFFICULTY'>('NONE');
  const [selectedPlayerCount, setSelectedPlayerCount] = useState(2);
  const [botDifficulty, setBotDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [lastGameXp, setLastGameXp] = useState(0);

  const [isShuffling, setIsShuffling] = useState(false);
  const [isMuted, setIsMuted] = useState(getMutedState());
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Bot state management
  const gameStateRef = useRef(state);
  // Ref to ensure XP is only awarded once per game over
  const gameProcessedRef = useRef(false);

  // Network State
  const [networkMode, setNetworkMode] = useState<NetworkMode>('OFFLINE');
  const [playerId, setPlayerId] = useState<number>(0); // 0 for Host/Single, >0 for Client
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>(''); // The short code shown to user
  const [hostIdInput, setHostIdInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'FAILED'>('DISCONNECTED');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Host Lobby State
  const [lobbyPlayers, setLobbyPlayers] = useState<{id: number, name: string}[]>([{ id: 0, name: 'Host' }]);

  // Refs
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map()); // For Host to manage multiple clients
  const connRef = useRef<DataConnection | null>(null); // For Client
  
  const heartbeatRef = useRef<any>(null);
  const notificationTimeoutRef = useRef<any>(null);
  const hasReceivedStateRef = useRef(false);

  useEffect(() => { 
    gameStateRef.current = state; 
  }, [state]);

  // Save Profile Effect
  useEffect(() => {
    localStorage.setItem('cok_profile_v2', JSON.stringify(userProfile));
  }, [userProfile]);

  // Handle Google Login Callback
  const handleGoogleLogin = useCallback((response: any) => {
    const userInfo = decodeJwt(response.credential);
    if (!userInfo) return;

    // Check if we have a saved profile for this googleId
    const saved = localStorage.getItem('cok_profile_v2');
    const profiles = saved ? [JSON.parse(saved)] : []; // In a real app we might have multiple, here just simple single storage for SPA
    
    // Logic: In a real backend we'd query DB. Here, we check if current user matches, or overwrite/merge.
    // Since we only store one profile in localStorage for this simple app, we check if it matches.
    const currentProfile = JSON.parse(localStorage.getItem('cok_profile_v2') || '{}');
    
    if (currentProfile.googleId === userInfo.sub) {
        // Known user, update avatar/email just in case
        setUserProfile({
            ...currentProfile,
            email: userInfo.email,
            avatarUrl: userInfo.picture
        });
        showNotification(`Welcome back, ${currentProfile.name}!`);
    } else {
        // New Google User or overwrite guest
        const newProfile: UserProfile = {
            ...currentProfile,
            googleId: userInfo.sub,
            email: userInfo.email,
            avatarUrl: userInfo.picture,
            name: userInfo.given_name || userInfo.name, // Pre-fill name from Google
            xp: currentProfile.xp || 0, // Keep guest XP if they merge? Let's just keep stats.
            level: currentProfile.level || 1,
            wins: currentProfile.wins || 0,
            gamesPlayed: currentProfile.gamesPlayed || 0
        };
        
        setUserProfile(newProfile);
        // Force name edit confirmation for new google sign ins
        setIsEditingName(true);
        showNotification("Google Account Linked");
    }
  }, []);

  // Initialize Google Button
  useEffect(() => {
    if (state.status === 'SETUP' && (window as any).google && !userProfile.googleId) {
        const btnContainer = document.getElementById("googleBtn");
        if (btnContainer) {
            try {
                // Clear to prevent duplicates on re-render
                btnContainer.innerHTML = '';

                (window as any).google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID.trim(), // Ensure no whitespace
                    callback: handleGoogleLogin,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    ux_mode: 'popup', 
                    context: 'signin'
                });
                
                (window as any).google.accounts.id.renderButton(
                    btnContainer,
                    { 
                        theme: "outline", 
                        size: "large", 
                        type: "standard",
                        shape: "pill",
                        text: "signin_with",
                        logo_alignment: 'left',
                        width: 250
                    }
                );
            } catch (e) {
                console.error("Google Sign In Error", e);
            }
        }
    }
  }, [state.status, userProfile.googleId, handleGoogleLogin]);

  // Initial Check for Name
  useEffect(() => {
    if (!userProfile.name) setIsEditingName(true);
  }, []);

  // Chat notification
  useEffect(() => {
     if (!showChat && state.chat.length > 0) {
        const lastMsg = state.chat[state.chat.length - 1];
        if (lastMsg.playerId !== playerId) {
           setUnreadChatCount(prev => prev + 1);
           playSound('click');
        }
     }
  }, [state.chat, showChat, playerId]);
  
  useEffect(() => {
     if (showChat) setUnreadChatCount(0);
  }, [showChat]);

  const handleSaveName = (name: string) => {
    if (name.trim()) {
      setUserProfile(p => ({ ...p, name: name.trim() }));
      setIsEditingName(false);
      // Update lobby if hosting
      setLobbyPlayers(prev => prev.map(p => p.id === 0 ? { ...p, name: name.trim() } : p));
    }
  };

  const handleLogout = () => {
    // Reset to guest profile
    const guestProfile: UserProfile = {
        name: '', 
        xp: 0, 
        level: 1, 
        wins: 0, 
        gamesPlayed: 0
    };
    setUserProfile(guestProfile);
    setIsEditingName(true);
  };
  
  const handleDemoLogin = () => {
    // For environments where Google Origin Check fails
    const demoProfile: UserProfile = {
       name: 'Demo User',
       email: 'demo@gmail.com',
       avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
       googleId: 'demo-123',
       xp: userProfile.xp,
       level: userProfile.level,
       wins: userProfile.wins,
       gamesPlayed: userProfile.gamesPlayed
    };
    setUserProfile(demoProfile);
    setIsEditingName(true);
    showNotification("Demo Mode: Google Linked");
  };

  const handleDownloadCode = async () => {
     try {
        const zip = new JSZip();

        // 1. Manually write Config & Entry files to ensure they exist and are correct for Vercel
        const packageJson = `
{
  "name": "clash-of-kings",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "framer-motion": "^10.16.4",
    "lucide-react": "^0.344.0",
    "peerjs": "^1.5.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.56",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4"
  }
}`;

        const viteConfig = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

        const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="referrer" content="no-referrer-when-downgrade" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#0d2b1a" />
    <title>Clash of Kings</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
  </head>
  <body class="bg-black overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>`;

        const indexTsx = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
`;
        
        const indexCss = `
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: 'Inter', sans-serif; }
h1, h2, h3, .game-title { font-family: 'Cinzel', serif; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

        const tailwindConfig = `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
`;

        const postcssConfig = `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

        const readmeMd = `# Clash of Kings

## Setup

1. \`npm install\`
2. \`npm run dev\`

## Deployment to Vercel

1. Push to GitHub.
2. Import in Vercel.
3. Deploy.
`;

        zip.file("package.json", packageJson);
        zip.file("vite.config.js", viteConfig);
        zip.file("index.html", indexHtml);
        zip.file("index.tsx", indexTsx);
        zip.file("index.css", indexCss);
        zip.file("tailwind.config.js", tailwindConfig);
        zip.file("postcss.config.js", postcssConfig);
        zip.file("README.md", readmeMd);

        // 2. Fetch the Source Code Files
        // We only fetch the dynamic logic files.
        const filesToFetch = [
          'App.tsx',
          'types.ts',
          'utils/gameLogic.ts',
          'utils/audio.ts'
        ];

        let successCount = 0;
        await Promise.all(filesToFetch.map(async (filename) => {
           try {
              const response = await fetch(`./${filename}`);
              if (response.ok) {
                 const text = await response.text();
                 // Check if it returned HTML (error page)
                 if (!text.trim().startsWith('<!DOCTYPE')) {
                    zip.file(filename, text);
                    successCount++;
                 } else {
                    console.error("Failed to fetch (is HTML): " + filename);
                 }
              } else {
                 console.error("Failed to fetch: " + filename);
              }
           } catch (e) {
              console.error("Error fetching " + filename, e);
           }
        }));

        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "clash-of-kings-source.zip";
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification("Downloading Source Code...");

     } catch (e) {
        console.error(e);
        showNotification("Download failed");
     }
  };

  // --- XP Logic ---
  useEffect(() => {
    if (state.status === 'GAME_OVER' && !gameProcessedRef.current && state.winner) {
       gameProcessedRef.current = true;
       
       if (state.winner.id === playerId) {
          // We Won!
          let xpReward = 0;
          if (networkMode !== 'OFFLINE') {
             xpReward = XP_RATES.MULTIPLAYER;
          } else {
             xpReward = XP_RATES[botDifficulty];
          }
          
          setLastGameXp(xpReward);
          
          setUserProfile(prev => {
             const newXp = prev.xp + xpReward;
             const { level } = getLevelData(newXp);
             return {
               ...prev,
               xp: newXp,
               level: level,
               wins: prev.wins + 1,
               gamesPlayed: prev.gamesPlayed + 1
             };
          });
          
          // Trigger Bot Lose Lines
          if (networkMode === 'OFFLINE') {
             state.players.forEach(p => {
               if (p.isBot) handleBotChat(p, 'LOSE');
             });
          }

       } else {
          // Lost
          setLastGameXp(0);
          setUserProfile(prev => ({
             ...prev,
             gamesPlayed: prev.gamesPlayed + 1
          }));

          // Trigger Bot Win Lines (if winner was bot)
          if (state.winner.isBot && networkMode === 'OFFLINE') {
             handleBotChat(state.winner, 'WIN');
          }
       }
    }
  }, [state.status, state.winner, playerId, networkMode, botDifficulty]);

  const handleToggleMute = () => {
    const muted = toggleMute();
    setIsMuted(muted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // Message Decoder helper
  const getDisplayMessage = useCallback((msgCode: string): string => {
    if (!msgCode) return "";
    
    // Standard Codes: TYPE|PLAYER_ID|...
    const parts = msgCode.split('|');
    const type = parts[0];

    if (type === 'SETUP') return "Clash of Kings";
    
    // Turn Start
    if (type === 'TURN') {
      const pid = parseInt(parts[1]);
      if (pid === playerId) return "Your Turn";
      const pName = state.players.find(p => p.id === pid)?.name || `Player ${pid + 1}`;
      return `${pName}'s Turn`;
    }

    // Play
    if (type === 'PLAY') {
       const pid = parseInt(parts[1]);
       const rank = parts[2];
       const suit = parts[3];
       if (pid === playerId) return `You played ${rank}${suit}`;
       const pName = state.players.find(p => p.id === pid)?.name || "Opponent";
       return `${pName} played ${rank}${suit}`;
    }

    // Draw
    if (type === 'DRAW') {
       const pid = parseInt(parts[1]);
       if (pid === playerId) return "Card Drawn";
       const pName = state.players.find(p => p.id === pid)?.name || "Opponent";
       return `${pName} drew a card`;
    }

    // Pass
    if (type === 'PASS') {
       const pid = parseInt(parts[1]);
       if (pid === playerId) return "You Passed";
       const pName = state.players.find(p => p.id === pid)?.name || "Opponent";
       return `${pName} Passed`;
    }

    return msgCode; // Fallback
  }, [playerId, state.players]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanupPeer();
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setNetworkMode('CLIENT');
      setHostIdInput(joinCode);
      if (!userProfile.name) setIsEditingName(true);
    }
  }, []);

  const showNotification = (msg: string) => {
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    setNotification(msg);
    notificationTimeoutRef.current = setTimeout(() => setNotification(null), 3000);
  };

  // --- Network Logic ---

  const cleanupPeer = () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    
    // Close all host connections
    connectionsRef.current.forEach(conn => conn.close());
    connectionsRef.current.clear();

    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    
    // Properly destroy peer and remove listeners
    if (peerRef.current) {
      peerRef.current.removeAllListeners();
      if (!peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
      peerRef.current = null;
    }
    hasReceivedStateRef.current = false;
  };

  const startHeartbeat = () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (networkMode === 'CLIENT' && connRef.current?.open) {
        connRef.current.send({ type: 'PING' });
      }
    }, 3000);
  };

  const initializeHost = (retryAttempt = 0) => {
    if (!userProfile.name.trim()) {
      setIsEditingName(true);
      return;
    }
    if (retryAttempt === 0) playSound('click');
    
    cleanupPeer();
    setNetworkMode('HOST');
    setPlayerId(0);
    setLobbyPlayers([{ id: 0, name: userProfile.name }]);
    setConnectionStatus('CONNECTING');
    setConnectionError(null);
    
    // Generate a new code each attempt to avoid ID collision/stuck IDs
    const code = generateRoomCode();
    setRoomCode(code);
    const myPeerIdRaw = `${APP_ID_PREFIX}${code}`;

    const peer = new Peer(myPeerIdRaw, PEER_CONFIG);
    peerRef.current = peer;

    // Timeout fallback logic
    const currentPeer = peer;
    const timeoutDuration = retryAttempt === 0 ? 6000 : 10000; // Increasing timeout
    
    const timeoutId = setTimeout(() => {
        if (peerRef.current === currentPeer && !currentPeer.open) {
            console.error("Connection timed out");
            if (retryAttempt < 2) {
               console.log(`Retrying connection... Attempt ${retryAttempt + 1}`);
               initializeHost(retryAttempt + 1);
            } else {
               setConnectionStatus('FAILED');
               setConnectionError("Connection timed out. The server may be busy.");
               cleanupPeer();
            }
        }
    }, timeoutDuration);

    peer.on('open', (id: string) => {
      clearTimeout(timeoutId);
      setMyPeerId(id);
      setConnectionStatus('CONNECTED');
    });

    peer.on('error', (err: any) => {
       clearTimeout(timeoutId);
       console.error("Host Error:", err);
       
       if (err.type === 'unavailable-id') {
          // If ID is taken, retry immediately with new code (don't count as a failure retry)
          initializeHost(retryAttempt); 
       } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-closed' || err.type === 'webrtc') {
          if (retryAttempt < 2) {
             setTimeout(() => initializeHost(retryAttempt + 1), 1000);
          } else {
             setConnectionStatus('FAILED');
             setConnectionError("Network connection unstable.");
             cleanupPeer();
          }
       } else {
          setConnectionStatus('FAILED');
          setConnectionError(`Error: ${err.type || "Unknown"}`);
          cleanupPeer();
       }
    });

    peer.on('disconnected', () => {
      // If we disconnect after being connected, try to reconnect to the same ID
      if (peer && !peer.destroyed) {
          peer.reconnect();
      }
    });

    peer.on('connection', (conn: DataConnection) => {
      connectionsRef.current.set(conn.peer, conn);
      
      conn.on('data', (data: NetworkAction) => {
        if (data.type === 'PING') return; 
        
        if (data.type === 'READY') {
           const clientName = data.payload?.name || `Player`;
           setLobbyPlayers(prev => {
             if (prev.find(p => p.id === conn.peer as any)) return prev; 

             const newId = prev.length;
             const newPlayers = [...prev, { id: newId, name: clientName, peerId: conn.peer }];
             
             const syncPayload = { 
               ...gameStateRef.current, 
               players: newPlayers.map(p => ({ id: p.id, name: p.name, hand: [], isBot: false }))
             };

             conn.send({ 
               type: 'SYNC_STATE', 
               payload: syncPayload,
               yourId: newId 
             });

             connectionsRef.current.forEach(c => {
                 if (c.peer !== conn.peer) {
                    c.send({ type: 'SYNC_STATE', payload: syncPayload });
                 }
             });

             return newPlayers;
           });
           return;
        }

        handleNetworkAction(data);
      });

      conn.on('close', () => {
        connectionsRef.current.delete(conn.peer);
        setLobbyPlayers(prev => prev.filter(p => (p as any).peerId !== conn.peer));
        showNotification("A player disconnected");
      });
    });
  };

  const joinGame = () => {
    if (!userProfile.name.trim()) {
      setIsEditingName(true);
      return;
    }

    playSound('click');
    let rawInput = hostIdInput.trim();
    const codeMatch = rawInput.match(/join=([^&]+)/);
    if (codeMatch) rawInput = codeMatch[1];
    
    let targetPeerId = rawInput;
    if (!rawInput.startsWith(APP_ID_PREFIX) && rawInput.length <= 8) {
       targetPeerId = `${APP_ID_PREFIX}${rawInput.toUpperCase()}`;
    }
    
    if (!targetPeerId) {
      showNotification("Please enter a valid Game Code");
      return;
    }

    cleanupPeer();
    setNetworkMode('CLIENT');
    setConnectionStatus('CONNECTING');
    setConnectionError(null);
    hasReceivedStateRef.current = false;

    const peer = new Peer(PEER_CONFIG);
    peerRef.current = peer;

    // Connection Timeout for Client
    const timeoutId = setTimeout(() => {
        if (connectionStatus === 'CONNECTING') {
            setConnectionStatus('FAILED');
            setConnectionError("Could not find room. Check code.");
            cleanupPeer();
        }
    }, 20000); // Increased to 20s for better mobile support

    const connectToHost = () => {
       try {
         const conn = peer.connect(targetPeerId, { reliable: true });
         connRef.current = conn;

         conn.on('open', () => {
            clearTimeout(timeoutId);
            setConnectionStatus('CONNECTED');
            startHeartbeat();
            const sendReady = () => {
               if (conn.open && !hasReceivedStateRef.current) {
                   conn.send({ type: 'READY', payload: { name: userProfile.name } });
               }
            };
            sendReady();
            const readyInterval = setInterval(sendReady, 1000);
            const checkStateTimeout = setTimeout(() => {
               clearInterval(readyInterval);
               if (!hasReceivedStateRef.current && connectionStatus === 'CONNECTED') {
                   showNotification("Waiting for host to start...");
               }
            }, 5000);
            
            conn.on('close', () => {
                clearInterval(readyInterval);
                clearTimeout(checkStateTimeout);
                setConnectionStatus('DISCONNECTED');
                showNotification("Host disconnected");
            });
         });

         conn.on('data', (data: any) => {
            if (data.type === 'PING') return;
            if (data.type === 'SYNC_STATE') {
               hasReceivedStateRef.current = true;
               if (data.yourId !== undefined) {
                  setPlayerId(data.yourId);
                  showNotification(`Joined as Player ${data.yourId + 1}`);
               }
               setState(data.payload);
            }
         });

         conn.on('error', (err: any) => {
            console.error("Connection Error:", err);
            setConnectionStatus('FAILED');
            setConnectionError("Connection to Host Failed");
         });
       } catch (e) {
          console.error(e);
          setConnectionStatus('FAILED');
       }
    };

    peer.on('open', (id: string) => {
      setMyPeerId(id);
      connectToHost();
    });
    
    peer.on('error', (err: any) => {
      clearTimeout(timeoutId);
      console.error("Peer Error:", err);
      if (err.type === 'peer-unavailable') {
          setConnectionStatus('FAILED');
          setConnectionError(`Room "${roomCode || hostIdInput}" not found.`);
      } else {
         setConnectionStatus('FAILED');
         setConnectionError("Connection Failed. Check internet.");
      }
    });
  };

  // --- Game Actions ---

  const sendToHost = (action: NetworkAction) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send(action);
    }
  };

  const broadcastState = (newState: GameState) => {
    if (networkMode === 'HOST') {
      connectionsRef.current.forEach(conn => {
        conn.send({ type: 'SYNC_STATE', payload: newState });
      });
    }
  };

  const handleNetworkAction = (action: NetworkAction) => {
    const currentState = gameStateRef.current;
    const senderIndex = action.payload?.playerId ?? (action.payload?.index !== undefined ? currentState.currentPlayerIndex : -1);

    switch (action.type) {
      case 'PLAY_CARD':
        if (currentState.currentPlayerIndex === senderIndex || senderIndex === -1) {
           playCard(action.payload.index, action.payload.side, currentState.currentPlayerIndex);
        }
        break;
      case 'DRAW_CARD':
        if (currentState.currentPlayerIndex === senderIndex || senderIndex === -1) {
          handleDraw(currentState.currentPlayerIndex);
        }
        break;
      case 'END_TURN':
        if (currentState.currentPlayerIndex === senderIndex || senderIndex === -1) {
          endTurn(currentState.currentPlayerIndex);
        }
        break;
      case 'SEND_CHAT':
        setState(prev => {
           const newState = { ...prev, chat: [...prev.chat, action.payload] };
           if (networkMode === 'HOST') broadcastState(newState);
           return newState;
        });
        break;
    }
  };

  const sendChat = (text: string) => {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        playerId,
        playerName: userProfile.name,
        text,
        timestamp: Date.now()
      };

      if (networkMode === 'HOST' || networkMode === 'OFFLINE') {
         setState(prev => {
            const newState = { ...prev, chat: [...prev.chat, msg] };
            if (networkMode === 'HOST') broadcastState(newState);
            return newState;
         });
      } else {
         sendToHost({ type: 'SEND_CHAT', payload: msg });
      }
  };

  const handleBotChat = (botPlayer: Player, type: keyof BotPersonality['lines']) => {
      if (!botPlayer.isBot) return;

      // Probability check (don't spam every single time, unless it's a win/lose)
      if (type !== 'WIN' && type !== 'LOSE' && Math.random() > 0.65) return;

      const line = getBotLine(botPlayer.name, type);
      
      // Delay slightly for realism
      setTimeout(() => {
         const msg: ChatMessage = {
            id: `msg-bot-${Date.now()}-${Math.random()}`,
            playerId: botPlayer.id,
            playerName: botPlayer.name,
            text: line,
            timestamp: Date.now()
         };
         
         setState(prev => ({ ...prev, chat: [...prev.chat, msg] }));
      }, 1000 + Math.random() * 1500);
  };

  const initializeGame = (overridePlayerCount?: number, isBotGame = true) => {
    setIsShuffling(true);
    gameProcessedRef.current = false; // Reset XP processing for new game
    setLastGameXp(0);
    playSound('shuffle');

    let finalPlayers: Player[] = [];
    const totalPlayers = overridePlayerCount || selectedPlayerCount;

    if (networkMode === 'HOST') {
       finalPlayers = lobbyPlayers.map(p => ({
          id: p.id,
          name: p.name,
          hand: [],
          isBot: false
       }));
    } else {
       finalPlayers.push({ id: 0, name: userProfile.name, hand: [], isBot: false });
       
       const usedNames = [userProfile.name];
       for (let i = 1; i < totalPlayers; i++) {
          let botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          while (usedNames.includes(botName)) {
             botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          }
          usedNames.push(botName);
          finalPlayers.push({ id: i, name: botName, hand: [], isBot: true });
       }
    }

    setTimeout(() => {
      playSound('start');
      let rawDeck = generateDeck();

      // Use full deck - do not filter out Aces
      let deck = shuffleDeck(rawDeck);
      
      const leftStartIdx = deck.findIndex(c => c.rank !== Rank.ACE && (c.suit === Suit.HEARTS || c.suit === Suit.SPADES));
      const leftStart = deck.splice(leftStartIdx, 1)[0];

      const rightStartIdx = deck.findIndex(c => c.rank !== Rank.ACE && (c.suit === Suit.CLUBS || c.suit === Suit.DIAMONDS));
      const rightStart = deck.splice(rightStartIdx, 1)[0];

      const handSize = 7;
      finalPlayers.forEach(p => {
        for (let j = 0; j < handSize; j++) {
          if (deck.length > 0) p.hand.push(deck.pop()!);
        }
        p.hand.sort((a, b) => a.rank - b.rank);
      });

      const newState: GameState = {
        deck,
        players: finalPlayers,
        currentPlayerIndex: 0,
        leftPile: [leftStart],
        rightPile: [rightStart],
        leftPileFinished: false,
        rightPileFinished: false,
        cardsPlayedThisTurn: [],
        lastPileSidePlayed: null,
        status: 'PLAYING',
        winner: null,
        message: `TURN|0`,
        history: [],
        chat: []
      };

      setState(newState);
      setIsShuffling(false);
      
      if (networkMode === 'HOST') {
        broadcastState(newState);
      }
    }, 1200);
  };

  // Bot Logic Loop
  useEffect(() => {
    if (state.status === 'PLAYING') {
       const currentPlayer = state.players[state.currentPlayerIndex];
       if (currentPlayer && currentPlayer.isBot) {
          const delay = state.message.startsWith('DRAW|') ? 600 : 1000;
          const timeout = setTimeout(() => executeBotTurn(), delay);
          return () => clearTimeout(timeout);
       }
    }
    // Added state.deck.length to dependency array to ensure bot re-evaluates after drawing a card
    // even if the message string looks similar or other race conditions occur.
  }, [state.currentPlayerIndex, state.status, state.message, state.deck.length]);

  const executeBotTurn = () => {
    const botIdx = state.currentPlayerIndex;
    const botPlayer = state.players[botIdx];
    const botHand = botPlayer.hand;
    
    // 1. Handle Stacking (Must play if started, or pass if cannot)
    if (state.cardsPlayedThisTurn.length > 0 && state.lastPileSidePlayed) {
       const topCard = state.lastPileSidePlayed === PileSide.LEFT 
          ? state.leftPile[state.leftPile.length - 1] 
          : state.rightPile[state.rightPile.length - 1];
          
       const validMoves = botHand
          .map((card, index) => ({ card, index, side: state.lastPileSidePlayed! }))
          .filter(m => isValidMove(m.card, m.side, topCard, state.lastPileSidePlayed === PileSide.LEFT ? state.leftPileFinished : state.rightPileFinished, state.cardsPlayedThisTurn, state.lastPileSidePlayed).valid);

       if (validMoves.length > 0) {
         validMoves.sort((a, b) => a.card.rank - b.card.rank);
         playCard(validMoves[0].index, validMoves[0].side, botIdx);
         return;
       } else {
         endTurn(botIdx);
         return;
       }
    }

    // 2. Calculate potential moves
    let potentialMoves: { card: Card, side: PileSide, index: number, chainLength: number }[] = [];
    const topL = state.leftPile.length > 0 ? state.leftPile[state.leftPile.length - 1] : undefined;
    const topR = state.rightPile.length > 0 ? state.rightPile[state.rightPile.length - 1] : undefined;

    botHand.forEach((card, index) => {
      const validL = isValidMove(card, PileSide.LEFT, topL, state.leftPileFinished, state.cardsPlayedThisTurn, state.lastPileSidePlayed);
      if (validL.valid) potentialMoves.push({ card, side: PileSide.LEFT, index, chainLength: getChainLength(card, botHand, PileSide.LEFT) });
      
      const validR = isValidMove(card, PileSide.RIGHT, topR, state.rightPileFinished, state.cardsPlayedThisTurn, state.lastPileSidePlayed);
      if (validR.valid) potentialMoves.push({ card, side: PileSide.RIGHT, index, chainLength: getChainLength(card, botHand, PileSide.RIGHT) });
    });

    const normalMoves = potentialMoves.filter(m => m.card.rank !== Rank.ACE);
    const aceMoves = potentialMoves.filter(m => m.card.rank === Rank.ACE);

    // 3. Decision Making
    if (normalMoves.length > 0) {
      if (botDifficulty === 'BEGINNER') {
         const random = normalMoves[Math.floor(Math.random() * normalMoves.length)];
         playCard(random.index, random.side, botIdx);
      } else {
         normalMoves.sort((a, b) => b.chainLength - a.chainLength);
         playCard(normalMoves[0].index, normalMoves[0].side, botIdx);
      }
    } else if (aceMoves.length > 0) {
       playCard(aceMoves[0].index, aceMoves[0].side, botIdx);
    } else {
       // No moves available.
       // Check for max aces before drawing
       const aceCount = botHand.filter(c => c.rank === Rank.ACE).length;
       
       if (state.deck.length > 0 && aceCount < 2) {
          handleDraw(botIdx);
       } else {
          // Deck empty OR Max Aces reached, cannot draw, must pass.
          endTurn(botIdx);
       }
    }
  };

  const handleDraw = (playerIndex = state.currentPlayerIndex) => {
    if (state.status === 'TUTORIAL') {
       if (TUTORIAL_STEPS[tutorialStepIndex].requiredAction !== 'DRAW') return;
    }

    if (state.cardsPlayedThisTurn.length > 0) {
       if (playerIndex === playerId) showNotification("Cannot draw after playing!");
       return;
    }
    
    // New Rule: Max 2 Aces Limit - Force Play
    const actingPlayer = state.players.find(p => p.id === playerIndex);
    if (actingPlayer) {
        const aceCount = actingPlayer.hand.filter(c => c.rank === Rank.ACE).length;
        if (aceCount >= 2) {
            if (playerIndex === playerId) {
                playSound('error');
                showNotification("Max Aces! You must play a card.");
            }
            return;
        }
    }
    
    if (playerIndex === playerId) playSound('draw');

    setState(prev => {
      if (prev.deck.length === 0) return prev;
      const newDeck = [...prev.deck];
      const card = newDeck.pop()!;
      const player = prev.players.find(p => p.id === playerIndex);
      const newPlayers = prev.players.map(p => p.id === playerIndex ? { ...p, hand: [...p.hand, card].sort((a, b) => a.rank - b.rank) } : p);
      
      const newState = {
        ...prev,
        deck: newDeck,
        players: newPlayers,
        message: `DRAW|${playerIndex}`,
        history: [...prev.history, {
           id: `log-${Date.now()}-${Math.random()}`,
           timestamp: Date.now(),
           playerId: playerIndex,
           playerName: player?.name || '',
           type: 'DRAW',
           description: 'Drew a card'
        }]
      };
      
      if (networkMode === 'HOST') broadcastState(newState);
      return newState;
    });

    if (networkMode === 'CLIENT' && playerIndex === playerId) {
      sendToHost({ type: 'DRAW_CARD', payload: { playerId } });
    }
  };

  const endTurn = (playerIndex = state.currentPlayerIndex) => {
    if (state.status === 'TUTORIAL') {
       setState(prev => ({ ...prev, cardsPlayedThisTurn: [], lastPileSidePlayed: null }));
       return; 
    }

    if (state.cardsPlayedThisTurn.length === 0 && state.deck.length > 0 && playerIndex === playerId) {
       showNotification("Play or Draw!");
       return; 
    }
    
    if (playerIndex === playerId) playSound('click');

    setState(prev => {
      const nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      const newState = {
        ...prev,
        currentPlayerIndex: nextIndex,
        cardsPlayedThisTurn: [],
        lastPileSidePlayed: null,
        message: `TURN|${nextIndex}`,
        history: [...prev.history, {
           id: `log-${Date.now()}`,
           timestamp: Date.now(),
           playerId: playerIndex,
           playerName: prev.players[playerIndex].name,
           type: 'PASS',
           description: 'Ended turn'
        }]
      };
      if (networkMode === 'HOST') broadcastState(newState);
      return newState;
    });

    if (networkMode === 'CLIENT' && playerIndex === playerId) {
      sendToHost({ type: 'END_TURN', payload: { playerId } });
    }
  };

  const playCard = (handIndex: number, side: PileSide, playerIndex = state.currentPlayerIndex) => {
    setState(prev => {
      const player = prev.players[playerIndex];
      const card = player.hand[handIndex];
      const topCard = side === PileSide.LEFT ? prev.leftPile[prev.leftPile.length - 1] : prev.rightPile[prev.rightPile.length - 1];
      const isPileFinished = side === PileSide.LEFT ? prev.leftPileFinished : prev.rightPileFinished;

      if (prev.status !== 'TUTORIAL') {
        const validation = isValidMove(card, side, topCard, isPileFinished, prev.cardsPlayedThisTurn, prev.lastPileSidePlayed);
        if (!validation.valid) {
           if (playerIndex === playerId) { playSound('error'); showNotification(validation.reason || "Invalid"); }
           return prev;
        }
      }

      if (playerIndex === playerId) playSound('play');

      // Mutation
      const newHand = [...player.hand];
      newHand.splice(handIndex, 1);
      
      let newLeft = [...prev.leftPile], newRight = [...prev.rightPile], newDeck = [...prev.deck];
      let leftFin = prev.leftPileFinished, rightFin = prev.rightPileFinished;

      // BOT CHAT TRIGGER LOGIC
      if (networkMode === 'OFFLINE' && prev.status !== 'TUTORIAL') {
         // 1. Check for Ace Play
         if (card.rank === Rank.ACE) {
            if (player.isBot) {
               // Bot played Ace
               handleBotChat(player, 'BOT_ACE');
            } else {
               // Player played Ace - trigger a random bot to react
               const bots = prev.players.filter(p => p.isBot);
               if (bots.length > 0) {
                  const randomBot = bots[Math.floor(Math.random() * bots.length)];
                  handleBotChat(randomBot, 'PLAYER_ACE');
               }
            }
         }

         // 2. Check for Low Cards (Win Condition Near)
         if (newHand.length <= 2 && newHand.length > 0) {
            if (player.isBot) {
               handleBotChat(player, 'BOT_LOW');
            } else {
               // Player is low - bots panic
               const bots = prev.players.filter(p => p.isBot);
               if (bots.length > 0) {
                  const randomBot = bots[Math.floor(Math.random() * bots.length)];
                  handleBotChat(randomBot, 'PLAYER_LOW');
               }
            }
         }
      }

      if (card.rank === Rank.ACE) {
         if (side === PileSide.LEFT) { newDeck = shuffleDeck([...newDeck, ...newLeft, card]); newLeft = []; leftFin = true; }
         else { newDeck = shuffleDeck([...newDeck, ...newRight, card]); newRight = []; rightFin = true; }
      } else {
         if (side === PileSide.LEFT) { newLeft.push(card); leftFin = false; }
         else { newRight.push(card); rightFin = false; }
      }

      let status = prev.status;
      let winner = prev.winner;
      if (newHand.length === 0 && prev.status !== 'TUTORIAL') {
         status = 'GAME_OVER';
         winner = player;
         playSound(player.id === playerId ? 'win' : 'lose');
      }

      const newState = {
         ...prev,
         deck: newDeck,
         players: prev.players.map(p => p.id === player.id ? { ...p, hand: newHand } : p),
         leftPile: newLeft, rightPile: newRight,
         leftPileFinished: leftFin, rightPileFinished: rightFin,
         cardsPlayedThisTurn: card.rank === Rank.ACE ? [] : [...prev.cardsPlayedThisTurn, card],
         lastPileSidePlayed: card.rank === Rank.ACE ? null : side,
         currentPlayerIndex: (card.rank === Rank.ACE && status !== 'GAME_OVER') ? (prev.currentPlayerIndex + 1) % prev.players.length : prev.currentPlayerIndex,
         status, winner,
         message: `PLAY|${player.id}|${formatRank(card.rank)}|${getSuitSymbol(card.suit)}`,
         history: [...prev.history, {
            id: `log-${Date.now()}`, timestamp: Date.now(),
            playerId: player.id, playerName: player.name,
            type: status === 'GAME_OVER' ? 'GAME_OVER' : 'PLAY',
            description: status === 'GAME_OVER' ? 'WON THE GAME' : `Played ${formatRank(card.rank)}${getSuitSymbol(card.suit)}`
         }]
      };

      if (networkMode === 'HOST') broadcastState(newState);
      return newState;
    });

    if (networkMode === 'CLIENT' && playerIndex === playerId) {
       sendToHost({ type: 'PLAY_CARD', payload: { index: handIndex, side, playerId } });
    }
    setSelectedCardIndex(null);
  };

  // --- Tutorials & Setup Screens ---

  const startTutorial = () => {
    setTutorialStepIndex(0); setPlayerId(0); playSound('start'); 
    setBotDifficulty('BEGINNER');
    const leftStart: Card = { id: 't-left', suit: Suit.SPADES, rank: Rank.FOUR };
    const rightStart: Card = { id: 't-right', suit: Suit.CLUBS, rank: Rank.THREE };
    const playerHand: Card[] = [{ id: 't-h5', suit: Suit.HEARTS, rank: Rank.FIVE }, { id: 't-s6', suit: Suit.SPADES, rank: Rank.SIX }, { id: 't-c2', suit: Suit.CLUBS, rank: Rank.TWO }];
    const botHand: Card[] = [{ id: 't-b-d4', suit: Suit.DIAMONDS, rank: Rank.FOUR }, { id: 't-b-hk', suit: Suit.HEARTS, rank: Rank.KING }];
    setState({
      deck: [{ id: 't-ace', suit: Suit.DIAMONDS, rank: Rank.ACE }],
      players: [{ id: 0, name: 'You', hand: playerHand, isBot: false }, { id: 1, name: 'Trainer', hand: botHand, isBot: true }],
      currentPlayerIndex: 0, leftPile: [leftStart], rightPile: [rightStart],
      leftPileFinished: false, rightPileFinished: false, cardsPlayedThisTurn: [], lastPileSidePlayed: null,
      status: 'TUTORIAL', winner: null, message: 'TUTORIAL', history: [], chat: []
    });
  };

  const isHighlighted = (id: string) => {
     if (state.status !== 'TUTORIAL') return false;
     const step = TUTORIAL_STEPS[tutorialStepIndex];
     if (step?.highlight === 'HAND_CARD_LAST') return id === `HAND_CARD_${state.players[0].hand.length - 1}`;
     return step?.highlight === id;
  };

  const handleTutorialAction = (action: string) => {
     const step = TUTORIAL_STEPS[tutorialStepIndex];
     if (step?.requiredAction === action) {
        if (action === 'NEXT') setTutorialStepIndex(p => p + 1);
        if (action === 'FINISH') { setBotDifficulty('BEGINNER'); initializeGame(2); }
        if (action === 'DRAW') { handleDraw(); setTutorialStepIndex(p => p + 1); }
        if (action === 'END_TURN') { 
           // Fake Bot Turn
           endTurn();
           setTimeout(() => {
              setState(p => ({ ...p, rightPile: [...p.rightPile, {id:'b', rank: Rank.FOUR, suit: Suit.DIAMONDS}], message: 'Trainer played 4♦' }));
              playSound('play');
              setTimeout(() => { setTutorialStepIndex(i=>i+1); setState(p=>({...p, currentPlayerIndex: 0, message: 'Your Turn'})); }, 1000);
           }, 800);
        }
     }
  };

  // --- Rendering ---

  const renderOpponents = () => {
    const opponents = state.players.filter(p => p.id !== playerId);
    const isSingleOpponent = opponents.length === 1;

    return (
       <div className={`absolute top-2 w-full px-2 flex ${isSingleOpponent ? 'justify-center' : 'justify-between'} items-start z-0 gap-2`}>
          {opponents.map((opp, idx) => (
             <div key={opp.id} className={`flex flex-col items-center relative ${state.currentPlayerIndex === opp.id ? 'opacity-100 scale-105' : 'opacity-70 scale-90'} transition-all`}>
                {/* Cards */}
                <div className="flex -space-x-4 mb-1 justify-center">
                   {opp.hand.map((_, i) => (
                     <CardBack key={i} className={`w-8 h-12 sm:w-12 sm:h-16 !rounded shadow-sm border-white/10 ${i>0?'hidden':''}`} />
                   ))}
                   {opp.hand.length > 1 && (
                     <div className="w-8 h-12 sm:w-12 sm:h-16 rounded-lg bg-blue-900 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-lg z-10">
                        +{opp.hand.length - 1}
                     </div>
                   )}
                </div>
                
                {/* Info */}
                <div className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${state.currentPlayerIndex === opp.id ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg animate-pulse' : 'bg-black/40 text-white/60 border-white/10'}`}>
                   {opp.name}
                </div>

                {/* Status Bubble */}
                {state.message.includes(`${opp.name}`) && (
                   <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="absolute top-full mt-1 bg-white text-black text-[9px] px-2 py-0.5 rounded-md shadow-xl font-bold whitespace-nowrap z-20">
                      {state.message.split('|')[0] === 'DRAW' ? 'Drawing...' : 'Thinking...'}
                   </motion.div>
                )}
             </div>
          ))}
       </div>
    );
  };

  if (state.status === 'SETUP') {
    const levelData = getLevelData(userProfile.xp);

    return (
      <div className="h-[100dvh] w-full bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center relative">
        <Background />
        
        {/* Main Menu */}
        <div className="z-10 w-full max-w-md px-6 flex flex-col items-center gap-6">
          
          {/* Logo */}
          <div className="text-center mb-4">
            <div className="relative inline-block">
               <Sword className="absolute -top-8 -left-8 text-yellow-500/20 w-24 h-24 rotate-45" />
               <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-2xl font-serif mb-2">
                 CLASH
               </h1>
               <div className="h-1 w-full bg-yellow-500/50 rounded-full mb-2" />
               <h2 className="text-2xl font-bold tracking-[0.5em] text-yellow-100/60 uppercase">of Kings</h2>
            </div>
          </div>

          {/* Profile Card */}
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 group hover:bg-white/10 transition cursor-pointer relative overflow-hidden" onClick={() => setIsEditingName(true)}>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-4 relative z-10 w-full">
                 <div className="relative">
                     {userProfile.avatarUrl ? (
                         <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg ring-2 ring-yellow-500/30">
                            <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                         </div>
                     ) : (
                         <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-yellow-500/30">
                            <span className="font-black text-2xl text-white font-serif">{levelData.level}</span>
                         </div>
                     )}
                     <div className="absolute -bottom-1 -right-1 bg-black text-[8px] border border-white/20 px-1.5 rounded-full uppercase font-bold text-white/60">LVL {levelData.level}</div>
                 </div>
                 
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                       <div className="font-bold text-lg text-white truncate pr-2">{userProfile.name || "Guest"}</div>
                       <div className="text-xs font-bold text-yellow-500 flex items-center gap-1"><Award size={12} /> {userProfile.wins} Wins</div>
                    </div>
                    
                    {/* XP Bar */}
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                       <div 
                          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-200" 
                          style={{ width: `${Math.min(100, (levelData.progress / levelData.required) * 100)}%` }}
                       />
                    </div>
                    <div className="flex justify-between mt-1">
                       <span className="text-[9px] text-white/40 font-mono uppercase">XP</span>
                       <span className="text-[9px] text-white/40 font-mono">{Math.floor(levelData.progress)} / {Math.floor(levelData.required)}</span>
                    </div>
                 </div>
              </div>
          </div>

          {/* Main Actions */}
          <div className="w-full space-y-3">
             <button 
               onClick={() => { playSound('click'); setSetupPhase('PLAYER_COUNT'); }}
               className="w-full bg-white/5 hover:bg-yellow-500/10 border border-white/10 hover:border-yellow-500/50 p-4 rounded-2xl flex items-center justify-between group transition-all"
             >
                <div className="flex items-center gap-4">
                   <Bot size={24} className="text-blue-400" />
                   <div className="text-left">
                      <div className="font-bold text-lg group-hover:text-yellow-400">Single Player</div>
                      <div className="text-xs text-white/40">Vs Bots</div>
                   </div>
                </div>
                <ChevronRight className="text-white/20" />
             </button>

             <button 
               onClick={() => { playSound('click'); setSetupPhase('PLAYER_COUNT'); setNetworkMode('HOST'); }}
               className="w-full bg-white/5 hover:bg-green-500/10 border border-white/10 hover:border-green-500/50 p-4 rounded-2xl flex items-center justify-between group transition-all"
             >
                <div className="flex items-center gap-4">
                   <Users size={24} className="text-green-400" />
                   <div className="text-left">
                      <div className="font-bold text-lg group-hover:text-green-400">Host Game</div>
                      <div className="text-xs text-white/40">Create Room</div>
                   </div>
                </div>
                <ChevronRight className="text-white/20" />
             </button>

             {/* Join Input */}
             <div className="flex gap-2 mt-2">
                <input 
                   value={hostIdInput} onChange={(e)=>setHostIdInput(e.target.value)}
                   placeholder="Enter 5-Letter Code..."
                   className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-yellow-500/50 uppercase font-mono placeholder-white/30"
                />
                <button onClick={joinGame} className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold">
                   {connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin" /> : "JOIN"}
                </button>
             </div>
          </div>

          {/* Google Sign In Placeholder */}
          {!userProfile.googleId && (
              <div className="w-full flex flex-col items-center justify-center mt-2">
                  <div id="googleBtn"></div>
                  <div className="text-[10px] text-white/20 mt-2 text-center max-w-xs mx-auto">
                     If "No registered origin" error appears, your domain is not whitelisted.
                     <button onClick={handleDemoLogin} className="block mx-auto mt-1 text-yellow-500 hover:underline">
                        Try Demo Login
                     </button>
                  </div>
              </div>
          )}

          {/* Footer */}
          <button onClick={startTutorial} className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white mt-4 flex items-center gap-2">
             <GraduationCap size={14} /> How to Play
          </button>
        </div>

        {/* Modals */}
        
        {/* Profile Creator / Editor */}
        {isEditingName && (
           <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-gray-900 border border-white/10 p-8 rounded-3xl w-full max-w-sm relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                 
                 <div className="text-center mb-6">
                     <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                     <h3 className="text-xl font-bold text-white">Profile Setup</h3>
                     <p className="text-sm text-white/50">Enter your name to start your legend.</p>
                 </div>

                 <input 
                    value={userProfile.name} 
                    onChange={(e) => setUserProfile(p => ({...p, name: e.target.value}))}
                    placeholder="Your Name"
                    className="w-full bg-black/40 border border-white/20 rounded-xl p-4 text-white text-lg font-bold mb-4 focus:border-yellow-500 outline-none text-center"
                    autoFocus
                 />
                 
                 <button 
                   onClick={() => handleSaveName(userProfile.name)} 
                   disabled={!userProfile.name.trim()}
                   className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition mb-2"
                 >
                    Confirm Name
                 </button>

                 {userProfile.googleId && (
                     <button 
                         onClick={handleLogout}
                         className="w-full text-red-400 hover:text-red-300 text-sm font-bold py-2 flex items-center justify-center gap-2"
                     >
                        <LogOut size={14} /> Sign Out
                     </button>
                 )}
              </div>
           </div>
        )}

        {/* Player Count Selector */}
        {setupPhase === 'PLAYER_COUNT' && (
           <PlayerCountSelection 
             onSelect={(num) => {
                setSelectedPlayerCount(num);
                if (networkMode === 'HOST') {
                   initializeHost(); // This works as undefined is falsy
                   setSetupPhase('NONE');
                } else {
                   setSetupPhase('DIFFICULTY'); // Continue Single Player Flow
                }
             }}
             onBack={() => { setSetupPhase('NONE'); setNetworkMode('OFFLINE'); }}
           />
        )}

        {/* Difficulty Selector */}
        {setupPhase === 'DIFFICULTY' && (
           <DifficultySelection 
             onSelect={(diff) => {
                setBotDifficulty(diff);
                initializeGame(selectedPlayerCount);
                setSetupPhase('NONE');
             }}
             onBack={() => setSetupPhase('PLAYER_COUNT')}
           />
        )}

        {/* Connection States Overlay */}
        {((networkMode === 'HOST' || networkMode === 'CLIENT') && (connectionStatus === 'CONNECTING' || connectionStatus === 'FAILED')) && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center">
              
              {connectionStatus === 'CONNECTING' && (
                <>
                   <Loader2 className="w-16 h-16 text-green-500 animate-spin mb-6" />
                   <h2 className="text-3xl font-bold text-white font-serif animate-pulse">{networkMode === 'HOST' ? 'Creating Room...' : 'Joining Room...'}</h2>
                   <p className="text-white/50 text-sm mb-8 max-w-xs">Establishing secure connection...</p>
                </>
              )}

              {connectionStatus === 'FAILED' && (
                <div className="bg-red-900/20 border border-red-500/30 p-8 rounded-3xl max-w-sm w-full animate-in fade-in zoom-in duration-300">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connection Failed</h2>
                    <p className="text-white/60 text-sm mb-6">{connectionError || "Unable to connect to server."}</p>
                    
                    <button 
                      onClick={() => networkMode === 'HOST' ? initializeHost() : joinGame()} 
                      className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 mb-3 transition"
                    >
                      <RefreshCw size={18} /> Retry
                    </button>
                </div>
              )}

              <button 
                onClick={() => { cleanupPeer(); setNetworkMode('OFFLINE'); }} 
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition"
              >
                Cancel
              </button>
          </div>
        )}

        {/* Host Lobby */}
        {networkMode === 'HOST' && connectionStatus === 'CONNECTED' && state.status === 'SETUP' && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
              <div className="bg-gray-900 border border-green-500/30 p-8 rounded-3xl max-w-md w-full relative overflow-hidden text-center">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
                 
                 <h3 className="text-2xl font-bold text-green-400 mb-1">Lobby Active</h3>
                 <p className="text-white/50 text-sm mb-6">Share this code with friends</p>

                 <div className="bg-black/60 border border-white/10 rounded-2xl p-6 mb-6 relative group cursor-pointer" onClick={async () => {
                       if (navigator.share) navigator.share({ title: 'Clash', text: `Join my game: ${roomCode}`, url: window.location.href.split('?')[0] + '?join=' + roomCode });
                       else { await navigator.clipboard.writeText(roomCode); showNotification("Code Copied"); }
                    }}>
                    <div className="text-5xl font-mono font-black text-white tracking-widest">{roomCode}</div>
                    <div className="text-[10px] uppercase text-white/30 mt-2 font-bold tracking-wider">Tap to Share</div>
                 </div>
                 
                 <div className="text-left mb-6">
                     <div className="text-xs font-bold text-white/40 uppercase mb-2">Players ({lobbyPlayers.length}/{selectedPlayerCount})</div>
                     {lobbyPlayers.map((p, i) => (
                       <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <span className="font-bold text-white">{p.name} {p.id === 0 && '(You)'}</span>
                          <CheckCircle2 size={16} className="text-green-500" />
                       </div>
                    ))}
                    {Array.from({ length: selectedPlayerCount - lobbyPlayers.length }).map((_, i) => (
                       <div key={`empty-${i}`} className="py-2 text-white/20 italic flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/10 border-dashed animate-spin" /> Waiting...
                       </div>
                    ))}
                 </div>

                 <button 
                   onClick={() => initializeGame()}
                   disabled={lobbyPlayers.length < 2} // Need at least 1 opponent
                   className={`w-full font-bold py-4 rounded-xl transition ${lobbyPlayers.length > 1 ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                 >
                    Start Game
                 </button>
                 <button onClick={() => { cleanupPeer(); setNetworkMode('OFFLINE'); }} className="w-full mt-3 text-red-400 text-sm font-bold">Cancel</button>
              </div>
           </div>
        )}

        {/* Waiting for Host (Client) */}
        {networkMode === 'CLIENT' && connectionStatus === 'CONNECTED' && state.status === 'SETUP' && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
              <div className="bg-gray-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center">
                  <div className="flex justify-center mb-6">
                     <div className="relative">
                        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black">...</div>
                     </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Connected</h2>
                  <p className="text-white/50 text-sm mb-6">Waiting for host to start...</p>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
                     <span className="text-xs text-white/40 uppercase font-bold">Room Code</span>
                     <div className="text-xl font-mono font-bold text-white tracking-widest mt-1">{roomCode || hostIdInput}</div>
                  </div>

                  <div className="text-left mb-6 bg-black/20 p-4 rounded-xl">
                     <div className="text-xs font-bold text-white/40 uppercase mb-2">Lobby Members</div>
                     {state.players.length > 0 ? (
                        state.players.map((p, i) => (
                           <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                              <span className="font-bold text-white">{p.name} {p.id === playerId && '(You)'}</span>
                              <CheckCircle2 size={16} className="text-yellow-500" />
                           </div>
                        ))
                     ) : (
                        // Fallback if no players synced yet
                        <div className="flex items-center justify-between py-2">
                           <span className="font-bold text-white">{userProfile.name} (You)</span>
                           <CheckCircle2 size={16} className="text-yellow-500" />
                        </div>
                     )}
                  </div>
                  
                  <button onClick={() => { cleanupPeer(); setNetworkMode('OFFLINE'); }} className="mt-2 text-red-400 hover:text-red-300 text-sm font-bold underline">Leave Lobby</button>
              </div>
           </div>
        )}

        {isShuffling && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
             <Shuffle className="w-16 h-16 text-yellow-500 animate-bounce mb-4" />
             <h2 className="text-3xl font-bold text-white font-serif animate-pulse">Shuffling Deck...</h2>
          </div>
        )}

        {notification && <div className="fixed bottom-10 bg-white text-black px-6 py-3 rounded-full shadow-2xl font-bold z-[100] text-center">{notification}</div>}
      </div>
    );
  }

  // Game Render
  const myPlayer = state.players.find(p => p.id === playerId) || state.players[0];
  const isMyTurn = state.currentPlayerIndex === playerId;
  const isTutorial = state.status === 'TUTORIAL';
  const levelData = getLevelData(userProfile.xp);
  
  // Ace Check for UI
  const myAceCount = myPlayer.hand.filter(c => c.rank === Rank.ACE).length;
  const isAceLocked = myAceCount >= 2;

  return (
    <div className="h-[100dvh] w-full bg-black text-white font-sans overflow-hidden flex flex-col select-none relative">
      <Background />

      {/* Navbar */}
      <div className="h-14 flex items-center justify-between px-4 z-20 bg-black/20 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3">
           <div className="text-yellow-500 font-bold font-serif tracking-wider flex items-center gap-2">
              CLASH <span className="text-[10px] text-white/30 bg-white/10 px-1.5 rounded-sm font-sans">{networkMode === 'OFFLINE' ? botDifficulty : 'LIVE'}</span>
           </div>
        </div>

        {/* Level Badge in Nav */}
        {!isTutorial && (
           <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-white/5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md overflow-hidden">
                 {userProfile.avatarUrl ? (
                     <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                     <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                        {levelData.level}
                     </div>
                 )}
              </div>
              <div className="flex flex-col">
                 <div className="text-[10px] font-bold leading-none">{userProfile.name}</div>
                 <div className="text-[8px] text-white/50 leading-none mt-0.5">{Math.floor(levelData.progress)} / {Math.floor(levelData.required)} XP</div>
              </div>
           </div>
        )}

        <div className="flex gap-2">
           <button 
             onClick={() => setShowChat(true)} 
             className="p-2 text-white/40 hover:text-white relative"
           >
             <MessageSquare size={18} className={unreadChatCount > 0 ? 'text-white' : ''} />
             {unreadChatCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                   {unreadChatCount}
                </span>
             )}
           </button>
           <button onClick={toggleFullscreen} className="p-2 text-white/40 hover:text-white"><Maximize size={18} /></button>
           <button onClick={() => setShowMenu(true)} className="p-2 text-white/40 hover:text-white"><Menu size={18} /></button>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
        
        {/* Render Opponents Strip */}
        {renderOpponents()}

        {/* Message */}
        {!isTutorial && (
           <div className="absolute top-[20%] z-20">
              <AnimatePresence mode="wait">
                 <motion.div 
                   key={getDisplayMessage(state.message)}
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                   className="bg-black/60 backdrop-blur border border-white/10 px-4 py-1 rounded-full shadow-xl"
                 >
                    <span className="font-bold font-serif tracking-wide">{getDisplayMessage(state.message)}</span>
                 </motion.div>
              </AnimatePresence>
           </div>
        )}

        {/* Center Piles */}
        <div className="flex gap-6 sm:gap-16 items-center justify-center z-10 mt-12">
           <div className="relative">
              {state.leftPile.length > 0 && !state.leftPileFinished ? (
                <CardView card={state.leftPile[state.leftPile.length-1]} className="shadow-2xl ring-4 ring-black/50" isPlayable={false} highlight={isHighlighted('PILE_LEFT')} />
              ) : (
                 <EmptyPile side={PileSide.LEFT} isFinished={state.leftPileFinished} highlight={isHighlighted('PILE_LEFT')} />
              )}
           </div>
           <div className="relative">
              {state.rightPile.length > 0 && !state.rightPileFinished ? (
                <CardView card={state.rightPile[state.rightPile.length-1]} className="shadow-2xl ring-4 ring-black/50" isPlayable={false} highlight={isHighlighted('PILE_RIGHT')} />
              ) : (
                 <EmptyPile side={PileSide.RIGHT} isFinished={state.rightPileFinished} highlight={isHighlighted('PILE_RIGHT')} />
              )}
           </div>
        </div>

        {/* Player Hand (Bottom) */}
        <div className="absolute bottom-0 w-full z-30 flex flex-col items-center gap-2 bg-gradient-to-t from-black via-black/80 to-transparent pt-10 pb-4">
           {/* Controls */}
           <div className="flex gap-4 mb-4">
              <ActionButton 
                onClick={() => isTutorial ? handleTutorialAction('DRAW') : (isMyTurn && handleDraw())} 
                color="blue" icon={Layers} label="Draw"
                subLabel={isAceLocked ? (
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-red-300 font-bold whitespace-nowrap">Max Aces Held</span>
                    <span className="text-[8px] opacity-70 whitespace-nowrap">{state.deck.length} Cards</span>
                  </div>
                ) : `${state.deck.length} Cards`}
                disabled={!isTutorial && (!isMyTurn || state.cardsPlayedThisTurn.length > 0 || state.deck.length === 0 || isAceLocked)} 
                highlight={isTutorial ? isHighlighted('BTN_DRAW') : (isMyTurn && state.cardsPlayedThisTurn.length === 0 && state.deck.length > 0 && !isAceLocked)}
              />
              <ActionButton 
                onClick={() => isTutorial ? handleTutorialAction('END_TURN') : (isMyTurn && endTurn())} 
                color="orange" icon={ArrowUpCircle} label="End Turn" 
                disabled={(isTutorial && !isHighlighted('BTN_END_TURN')) || (!isTutorial && (!isMyTurn || (state.cardsPlayedThisTurn.length === 0 && state.deck.length > 0)))} 
                highlight={isTutorial ? isHighlighted('BTN_END_TURN') : false}
              />
           </div>

           {/* Cards - Fix Scrolling & Clipping */}
           <div className="w-full overflow-x-auto no-scrollbar h-44 sm:h-56">
               <div className="w-max mx-auto px-4 sm:px-8 pb-2 pt-8 flex items-end min-h-full">
                   <div className="flex -space-x-8 sm:-space-x-12 pb-2">
                      <AnimatePresence>
                      {myPlayer.hand.map((card, index) => {
                        const isSelected = index === selectedCardIndex;
                        const topL = state.leftPile.length > 0 ? state.leftPile[state.leftPile.length-1] : undefined;
                        const topR = state.rightPile.length > 0 ? state.rightPile[state.rightPile.length-1] : undefined;
                        const validL = isValidMove(card, PileSide.LEFT, topL, state.leftPileFinished, state.cardsPlayedThisTurn, state.lastPileSidePlayed);
                        const validR = isValidMove(card, PileSide.RIGHT, topR, state.rightPileFinished, state.cardsPlayedThisTurn, state.lastPileSidePlayed);
                        const playable = (isMyTurn || isTutorial) && (validL.valid || validR.valid);
                        
                        return (
                            <div key={card.id} className={`relative transition-transform duration-200 flex-shrink-0 ${isSelected ? '-translate-y-6 z-40' : 'hover:-translate-y-2 hover:z-30 z-10'}`}>
                              <CardView 
                                card={card} isSelected={isSelected} isPlayable={playable} highlight={isHighlighted(`HAND_CARD_${index}`)}
                                onClick={() => {
                                    if (isTutorial) {
                                      // Tutorial tap handler logic...
                                      if (isHighlighted(`HAND_CARD_${index}`)) {
                                        if (validL.valid) playCard(index, PileSide.LEFT);
                                        else if (validR.valid) playCard(index, PileSide.RIGHT);
                                        handleTutorialAction(card.rank === Rank.ACE ? 'PLAY_ACE' : `PLAY_CARD_${index}`);
                                      }
                                      return;
                                    }
                                    if (!isMyTurn) return;
                                    if (!isSelected) { setSelectedCardIndex(index); playSound('click'); }
                                    else setSelectedCardIndex(null);

                                    if (validL.valid && !validR.valid) playCard(index, PileSide.LEFT);
                                    else if (!validL.valid && validR.valid) playCard(index, PileSide.RIGHT);
                                }}
                              />
                              {isSelected && playable && !isTutorial && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-black/80 p-1 rounded z-50">
                                    {validL.valid && <button onClick={(e)=>{e.stopPropagation(); playCard(index, PileSide.LEFT)}} className="px-2 py-1 bg-gray-700 rounded text-[10px] font-bold text-white">L</button>}
                                    {validR.valid && <button onClick={(e)=>{e.stopPropagation(); playCard(index, PileSide.RIGHT)}} className="px-2 py-1 bg-gray-700 rounded text-[10px] font-bold text-white">R</button>}
                                </div>
                              )}
                            </div>
                        );
                      })}
                      </AnimatePresence>
                   </div>
               </div>
           </div>
        </div>
        
        {/* Overlays */}
        {isTutorial && <TutorialOverlay stepIndex={tutorialStepIndex} onNext={() => handleTutorialAction(TUTORIAL_STEPS[tutorialStepIndex].requiredAction)} />}
        {viewingHistory && <GameHistoryModal history={state.history} onClose={() => setViewingHistory(false)} />}
        {viewingStrategies && <StrategiesModal onClose={() => setViewingStrategies(false)} />}
        {showChat && (
           <ChatModal 
              messages={state.chat}
              currentPlayerId={playerId}
              onSend={sendChat}
              onClose={() => setShowChat(false)}
           />
        )}
        {showMenu && (
           <MenuModal 
             onResume={() => setShowMenu(false)}
             onStrategies={() => { setShowMenu(false); setViewingStrategies(true); }}
             onHistory={() => { setShowMenu(false); setViewingHistory(true); }}
             onDownload={handleDownloadCode}
             onQuit={() => { 
               setShowMenu(false); 
               cleanupPeer(); 
               setState(p => ({...p, status: 'SETUP', message: 'SETUP'})); 
             }}
             isMuted={isMuted}
             onToggleMute={handleToggleMute}
             isFullscreen={isFullscreen}
             onToggleFullscreen={toggleFullscreen}
           />
        )}
        {state.status === 'GAME_OVER' && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 text-center backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                 
                 <Trophy className={`w-20 h-20 mx-auto mb-4 ${state.winner?.id === playerId ? 'text-yellow-500 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-gray-600'}`} />
                 
                 <h2 className="text-4xl font-black text-white mb-2 font-serif uppercase tracking-wide">{state.winner?.id === playerId ? 'VICTORY' : 'DEFEAT'}</h2>
                 <p className="text-white/50 mb-6">{state.winner?.name} won the game!</p>

                 {state.winner?.id === playerId && lastGameXp > 0 && (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 animate-pulse">
                       <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Rewards</div>
                       <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-2xl">
                          <Star className="fill-current" /> +{lastGameXp} XP
                       </div>
                       <div className="mt-2 w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                          <div 
                             className="h-full bg-yellow-500 transition-all duration-1000" 
                             style={{ width: `${Math.min(100, (levelData.progress / levelData.required) * 100)}%` }} 
                          />
                       </div>
                    </div>
                 )}

                 <button onClick={() => setState({...state, status: 'SETUP'})} className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold text-white transition">
                    Back to Menu
                 </button>
              </div>
           </div>
        )}
        {notification && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/90 border border-red-500 text-white px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.5)] font-bold z-[100] text-center animate-pulse">{notification}</div>}
      </div>
    );
  };
