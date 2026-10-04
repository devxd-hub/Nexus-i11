import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tone from 'tone';
import { Delaunay } from 'd3-delaunay';
import { RotateCcw, Sparkles } from 'lucide-react';

// --- SVG Icon ---
export const DiamondIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-violet-100 mb-4"
  >
    <path
      d="M2.7 10.3a2.4 2.4 0 0 0-1.4 4.3l8 8a2.4 
             2.4 0 0 0 3.4 0l8-8a2.4 2.4 
             0 0 0-1.4-4.3h-13Z"
    />
    <path
      d="m2.7 10.3 8.6-8.6a2.4 
             2.4 0 0 1 3.4 0l8.6 8.6"
    />
  </svg>
);

export interface Shard {
  id: number;
  path: string;
  vx: number;
  vy: number;
  vr: number;
  life: number;
  x?: number;
  y?: number;
  r?: number;
}

interface ShardCanvasProps {
  shards: Shard[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  state: 'intact' | 'cracked' | 'shattered';
  shardColor?: string;
}

// --- Canvas for shattered shards ---
export function ShardCanvas({ shards, containerRef, state, shardColor }: ShardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (state !== 'shattered') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    // clone shards to mutate
    const active: (Shard & { x: number; y: number; r: number })[] = shards.map((s) => ({
      ...s,
      x: 0,
      y: 0,
      r: 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyAlive = false;

      active.forEach((shard) => {
        if (shard.life > 0) {
          anyAlive = true;
          shard.x += shard.vx;
          shard.y += shard.vy;
          shard.r += shard.vr;
          shard.vy += 0.22; // gravity
          shard.life -= 0.012;

          ctx.save();
          ctx.translate(shard.x, shard.y);
          ctx.rotate((shard.r * Math.PI) / 180);
          ctx.fillStyle = shardColor || `rgba(167,139,250,${Math.max(0, shard.life)})`;
          ctx.fill(new Path2D(shard.path));
          ctx.restore();
        }
      });

      if (anyAlive) {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [shards, state, shardColor]);

  return (
    <canvas
      ref={canvasRef}
      width={containerRef.current?.clientWidth || 320}
      height={containerRef.current?.clientHeight || 400}
      className="absolute inset-0 pointer-events-none z-30"
    />
  );
}

export interface ShatterableGlassCardProps {
  badge?: string;
  category?: string;
  title?: string;
  reward?: string;
  description?: string;
  highlight?: boolean;
  accentColor?: string;
  icon?: React.ReactNode;
  className?: string;
  coverImage?: string;
  revealedTitle?: string;
  revealedDescription?: string;
  revealedPerks?: string[];
}

// --- Main Component ---
export default function ShatterableGlassCard({
  badge,
  category,
  title,
  reward,
  description,
  highlight,
  accentColor = '#D97745',
  icon,
  className = '',
  coverImage,
  revealedTitle,
  revealedDescription,
  revealedPerks,
}: ShatterableGlassCardProps = {}) {
  const [state, setState] = useState<'intact' | 'cracked' | 'shattered'>('intact');
  const [hasRevealed, setHasRevealed] = useState(false);
  const [shards, setShards] = useState<Shard[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRefs = useRef<{
    crackSynth?: Tone.PluckSynth;
    shatterSynth?: Tone.PolySynth<Tone.MetalSynth>;
  }>({});

  const isCustomCard = Boolean(title);

  // initialize synths
  useEffect(() => {
    try {
      audioRefs.current.crackSynth = new Tone.PluckSynth({
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.9,
      }).toDestination();

      audioRefs.current.shatterSynth = new Tone.PolySynth(Tone.MetalSynth, {
        envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      } as any).toDestination();
    } catch {
      // AudioContext fallback
    }

    return () => {
      try {
        if (audioRefs.current.crackSynth) audioRefs.current.crackSynth.dispose();
        if (audioRefs.current.shatterSynth) audioRefs.current.shatterSynth.dispose();
      } catch {
        // cleanup safe
      }
    };
  }, []);

  // generate voronoi shards
  const generateShards = (x: number, y: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 380;
    const points: [number, number][] = Array.from({ length: 80 }, () => [
      Math.random() * width,
      Math.random() * height,
    ]);
    points.push([x, y]);

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    const newShards: Shard[] = Array.from(voronoi.cellPolygons()).map((poly, i) => {
      const centroid = poly
        .reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0])
        .map((v) => v / poly.length);
      const dx = centroid[0] - x;
      const dy = centroid[1] - y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      const force = (width - dist) / width;

      return {
        id: i,
        path: `M${poly.join('L')}Z`,
        vx: Math.cos(angle) * (10 + Math.random() * 10) * force,
        vy: Math.sin(angle) * (10 + Math.random() * 10) - 5,
        vr: (Math.random() - 0.5) * 2,
        life: 1,
      };
    });
    setShards(newShards);
  };

  // click handler
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state === 'shattered') return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      if (Tone.context.state !== 'running') {
        Tone.start();
      }
    } catch {
      // Audio context unlock
    }

    if (state === 'intact') {
      generateShards(x, y);
      setState('cracked');
      try {
        audioRefs.current.crackSynth?.triggerAttack('C6');
      } catch {
        // ignore audio errors
      }
    } else if (state === 'cracked') {
      setHasRevealed(true);
      setState('shattered');
      try {
        audioRefs.current.shatterSynth?.triggerAttackRelease(['C4', 'E4', 'G4', 'B4'], 0.4);
      } catch {
        // ignore audio errors
      }
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setState('intact');
    setShards([]);
  };

  // Standalone Default Demo Mode
  if (!isCustomCard) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-white select-none">
        <div className="w-full max-w-md text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-200 md:text-5xl">
            Shatterable Interface
          </h1>
          <p className="mt-2 text-neutral-400">An interface you can literally break.</p>
        </div>

        <div
          ref={containerRef}
          onClick={handleClick}
          className="relative h-[450px] w-[300px] cursor-pointer rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-violet-500 to-indigo-700"
        >
          <AnimatePresence>
            {state !== 'shattered' && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DiamondIcon />
                <h2 className="text-3xl font-bold text-white">UNBREAKABLE</h2>
                <p className="text-violet-200">Click to test our promise.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Crack overlay */}
          <svg
            className={`absolute inset-0 w-full h-full transition-opacity duration-300 pointer-events-none z-20 ${
              state === 'cracked' ? 'opacity-70' : 'opacity-0'
            }`}
            fill="none"
            stroke="white"
          >
            {shards.map((s) => (
              <path key={s.id} d={s.path} strokeWidth="0.8" />
            ))}
          </svg>

          {/* Shatter canvas */}
          {state === 'shattered' && (
            <ShardCanvas shards={shards} containerRef={containerRef} state={state} />
          )}

          {/* Revealed back */}
          <AnimatePresence>
            {state === 'shattered' && (
              <motion.div
                className="absolute inset-0 bg-amber-500 flex flex-col items-center justify-center text-center p-4 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
              >
                <h2 className="text-2xl font-bold text-white">Promise Broken!</h2>
                <p className="text-sm text-amber-100">You found the easter egg.</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs font-mono transition-colors"
                >
                  Repair Glass
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Custom Prize Card Mode
  return (
    <div className="relative group/prize max-w-[350px] mx-auto w-full">
      {!hasRevealed && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-40 whitespace-nowrap rounded-lg border border-white/20 bg-[#171A1D]/95 px-3 py-2 text-xs font-medium text-[#F1EEE7] shadow-xl backdrop-blur-md pointer-events-none opacity-0 translate-y-1 transition-all duration-150 group-hover/prize:opacity-100 group-hover/prize:translate-y-0"
        >
          Tap to reveal
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-[#171A1D]" />
        </div>
      )}
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative rounded-2xl flex flex-col justify-between min-h-[440px] sm:min-h-[460px] max-w-[350px] mx-auto w-full transition-all duration-300 transform-gpu backdrop-blur-md shadow-2xl overflow-hidden border select-none group ${
        state !== 'shattered' ? 'cursor-pointer' : ''
      } ${
        highlight
          ? 'bg-gradient-to-b from-[#1C2026]/70 via-[#15181E]/65 to-[#0E1014]/75 border-[#D97745]/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:border-[#D97745]/80'
          : 'bg-gradient-to-b from-[#16191E]/65 via-[#111317]/60 to-[#0B0D10]/70 border-white/15 hover:border-white/35 shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
      } ${className}`}
    >
      {/* Specular top highlight */}
      <div
        className={`absolute top-0 inset-x-0 h-[1px] pointer-events-none transition-opacity duration-300 ${
          highlight
            ? 'bg-gradient-to-r from-transparent via-[#D97745]/70 to-transparent'
            : 'bg-gradient-to-r from-transparent via-white/30 to-transparent'
        }`}
      />

      {/* Ambient backlight glow on hover */}
      <div
        className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      {/* Intact / Cracked Content */}
      <AnimatePresence>
        {state !== 'shattered' && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`relative z-10 flex flex-col justify-between h-full ${
              coverImage ? 'p-0 overflow-hidden' : 'p-5 sm:p-6'
            }`}
          >
            {coverImage ? (
              <div className="relative w-full h-full min-h-[440px] sm:min-h-[460px] flex flex-col justify-between overflow-hidden">
                {/* Full artwork cover image */}
                <img
                  src={coverImage}
                  alt={title || 'Prize Cover'}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                />

                {/* Subtle soft gradient fade at bottom only, keeping artwork completely clear and vibrant */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />

                {/* Top spacer (clean and unobstructed) */}
                <div className="relative z-10 p-5" />

                {/* Bottom Title */}
                <div className="relative z-10 p-4 sm:p-5 flex items-center justify-center">
                  <h3 className="text-sm sm:text-base md:text-lg font-black text-white font-display uppercase tracking-wider leading-none drop-shadow-md text-center">
                    {title}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-between h-full min-h-[440px] sm:min-h-[460px]">
                <div className="space-y-4">
                  {/* Top: Clean Icon */}
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] backdrop-blur-md">
                      {icon}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-black text-[#F1EEE7] font-display uppercase tracking-wider group-hover:text-white transition-colors leading-tight whitespace-nowrap">
                      {title}
                    </h3>
                  </div>

                  {/* Description Container */}
                  <div className="pt-1">
                    <div className="p-4 rounded-xl bg-black/55 border border-white/[0.1] backdrop-blur-md shadow-inner">
                      <p className="text-xs sm:text-[13px] text-[#E2E1DC] leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crack Overlay SVG */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none z-20 transition-opacity duration-200 ${
          state === 'cracked' ? 'opacity-85' : 'opacity-0'
        }`}
        fill="none"
        stroke={accentColor || '#ffffff'}
      >
        {shards.map((s) => (
          <path key={s.id} d={s.path} strokeWidth="1" strokeOpacity="0.8" />
        ))}
      </svg>

      {/* Shatter Canvas */}
      {state === 'shattered' && (
        <ShardCanvas
          shards={shards}
          containerRef={containerRef}
          state={state}
          shardColor={`rgba(${
            highlight ? '217, 119, 69' : '200, 210, 225'
          }, 0.85)`}
        />
      )}

      {/* Revealed Back Vault State */}
      <AnimatePresence>
        {state === 'shattered' && (
          <motion.div
            className="absolute inset-0 z-10 p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-b from-[#181216] via-[#120F15] to-[#0A080E] border-2 border-amber-500/60 shadow-inner overflow-hidden rounded-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.15, duration: 0.3 } }}
          >
            <div className="space-y-3">
              {/* Header with securely positioned reload button and title */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset / Restore Glass"
                  aria-label="Reset / Restore Glass"
                  className="absolute top-0 right-0 p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-sm"
                >
                  <RotateCcw size={14} className="hover:-rotate-45 transition-transform" />
                </button>

                <div className="pr-9">
                  <h4 className="text-xs sm:text-sm md:text-base font-black text-white font-display uppercase tracking-wider leading-snug break-words">
                    {revealedTitle || `${title} Perks`}
                  </h4>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                {(
                  revealedPerks || [
                    `Top allocation of the prize pool`,
                    'Direct accelerator interview & incubator invite',
                    'Dedicated cloud compute credits voucher',
                    'Official Hack for Good 2025 Trophy',
                  ]
                ).map((perk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-[#E5E7EB] bg-black/50 px-2.5 py-1.5 rounded-lg border border-white/10"
                  >
                    <span className="text-amber-400 font-bold shrink-0">✓</span>
                    <span className="leading-snug">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
