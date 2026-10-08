import { useEffect, useRef, useState } from 'react';
import { VolumeX } from 'lucide-react';

export default function ThemeAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const chimeRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const lastChimeRef = useRef(0);
  const effectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = .35;
    return () => {
      if (effectTimerRef.current) clearTimeout(effectTimerRef.current);
      void chimeRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const spectrum = new Uint8Array(128);
    const draw = () => {
      const analyser = analyserRef.current;
      const bars = barsRef.current?.children;
      if (analyser && bars) {
        analyser.getByteFrequencyData(spectrum);
        Array.from(bars).forEach((bar, index) => {
          // Sample the musical low/mid frequencies, rather than animate random heights.
          const start = 2 + index * 4;
          const energy = (spectrum[start] + spectrum[start + 1] + spectrum[start + 2] + spectrum[start + 3]) / (4 * 255);
          const rows = reducedMotion.matches ? 3 + Math.round(3 * Math.sin(index / 10 * Math.PI)) : Math.max(1, Math.round(energy * 8));
          (bar as HTMLElement).style.height = `${rows * 4}px`;
        });
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const playChime = () => {
    setGlowing(true);
    if (effectTimerRef.current) clearTimeout(effectTimerRef.current);
    effectTimerRef.current = setTimeout(() => setGlowing(false), 550);
    const context = chimeRef.current;
    const now = performance.now();
    if (!playing || !context || context.state !== 'running' || now - lastChimeRef.current < 700) return;
    lastChimeRef.current = now;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * .045;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.018, start + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .45);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + .5);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError('');
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      // Unlock interaction sounds only after the visitor explicitly turns sound on.
      try {
        chimeRef.current ??= new AudioContext();
        if (!sourceRef.current) {
          const analyser = chimeRef.current.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = .78;
          const source = chimeRef.current.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(chimeRef.current.destination);
          sourceRef.current = source;
          analyserRef.current = analyser;
        }
        await chimeRef.current.resume();
      } catch { /* Theme music still works when Web Audio is unavailable. */ }
    } catch {
      setError('Unable to play the theme song. Please try again.');
    }
  };

  return (
    <>
      <audio ref={audioRef} src="/audio/nexus-theme.mp3" loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setError('The theme song could not be loaded.'); }} />
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[60] flex flex-col items-end gap-2">
        {error && <p role="alert" className="max-w-64 rounded-xl bg-black/70 backdrop-blur-xl px-3 py-2 text-xs text-white">{error}</p>}
        <button
          type="button"
          onClick={toggle}
          onPointerEnter={playChime}
          onWheel={playChime}
          aria-label={playing ? 'Turn theme music off' : 'Turn theme music on'}
          aria-pressed={playing}
          className={`inline-flex items-center gap-2.5 px-4 py-3 text-[#F1EEE7] transition-all duration-300 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A06F] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${playing ? `bg-transparent border-0 shadow-none ${glowing ? 'motion-safe:scale-105' : ''}` : `rounded-full border bg-black/25 backdrop-blur-2xl hover:bg-black/40 ${glowing ? 'border-[#E5A06F]/65 shadow-[0_0_24px_rgba(229,160,111,.25),inset_0_1px_0_rgba(255,255,255,.18)] motion-safe:-translate-y-0.5 motion-safe:scale-105' : 'border-white/25 shadow-[0_8px_32px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.12)]'}`}`}
        >
          {playing ? (
            <div ref={barsRef} aria-hidden="true" className="flex items-end justify-center gap-[1px] h-8 w-11">
              {Array.from({ length: 11 }, (_, index) => (
                <span key={index} className="block w-[3px] h-1" style={{ background: 'repeating-linear-gradient(to top, #F1EEE7 0px, #F1EEE7 3px, transparent 3px, transparent 4px)' }} />
              ))}
            </div>
          ) : (
            <><VolumeX size={17} aria-hidden="true" /><span className="font-mono text-[10px] tracking-[.12em] uppercase">Sound off</span></>
          )}
        </button>
      </div>
    </>
  );
}
