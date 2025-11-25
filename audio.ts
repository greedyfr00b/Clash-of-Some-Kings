
let muted = false;

let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const isMuted = () => muted;

export const toggleMute = () => {
  muted = !muted;
  return muted;
};

export const playSound = (type: 'play' | 'draw' | 'error' | 'shuffle' | 'win' | 'lose' | 'click' | 'start') => {
  if (muted) return;
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    if (type === 'play') {
      // High pitched "pop"
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'draw') {
      // Soft "slide"
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.15);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'error') {
      // Low "buzz"
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'shuffle') {
      // Rising synthetic noise
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.5);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.03, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'win') {
       // Major Arpeggio
       [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0.1, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.4);
       });
    } else if (type === 'lose') {
       // Descending minor tones
       [300, 250, 200].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0.15, now + i * 0.2);
          g.gain.linearRampToValueAtTime(0.01, now + i * 0.2 + 0.3);
          osc.start(now + i * 0.2);
          osc.stop(now + i * 0.2 + 0.3);
       });
    } else if (type === 'start') {
       // Game start chime
       const osc = ctx.createOscillator();
       osc.type = 'sine';
       osc.frequency.setValueAtTime(440, now);
       osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
       osc.connect(gainNode);
       gainNode.gain.setValueAtTime(0.15, now);
       gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
       osc.start(now);
       osc.stop(now + 0.3);
    } else if (type === 'click') {
       // Simple UI click
       const osc = ctx.createOscillator();
       osc.type = 'sine';
       osc.frequency.setValueAtTime(800, now);
       osc.connect(gainNode);
       gainNode.gain.setValueAtTime(0.05, now);
       gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
       osc.start(now);
       osc.stop(now + 0.05);
    }
  } catch (e) {
    console.error("Audio error", e);
  }
};
