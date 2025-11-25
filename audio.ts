
let muted = false;
let audioCtx: AudioContext | null = null;
const getContext = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
};
export const isMuted = () => muted;
export const toggleMute = () => { muted = !muted; return muted; };
export const playSound = (type: 'play' | 'draw' | 'error' | 'shuffle' | 'win' | 'lose' | 'click' | 'start') => {
  if (muted) return;
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    // Simple synth logic placeholder (full logic is in main app, this is for export)
    const osc = ctx.createOscillator();
    osc.connect(gainNode);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {}
};
