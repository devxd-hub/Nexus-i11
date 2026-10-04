import React, { useRef, useEffect, useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/magnified-doc';
import {
  type MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { toCanvas } from 'html-to-image';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { BrainIcon } from '../components/ui/brain-icon';
import { ChromeIcon } from '../components/ui/chrome-icon';
import { UsersIcon } from '../components/ui/users-icon';
import { LeafyGreenIcon } from '../components/ui/leafy-green-icon';
import { IdeaBoxIcon } from '../components/ui/idea-box-icon';
import { Grainient } from '../components/ui/grainient';
import { DriftWall } from '../components/ui/drift-wall';

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'opening' | 'open' | 'closing';
type Dir = 'open' | 'minimize';

interface Pt {
  x: number;
  y: number;
}

export interface Track {
  id: string;
  number: string;
  label: string;
  accent: string;
  tb: [string, string];
  domain: string;
  description: string;
  capabilities: string[];
  bgGradient: string;
  Icon: React.FC<{ isHovered?: boolean }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const WIN_W = 460;
const WIN_H = 340;
const DUR = 500;

// Magnification config
const ICON_BASE = 52;
const ICON_PEAK = 76;
const MAG_RANGE = 130;

// ─── Math ─────────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const eioC = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eIn2 = (t: number) => t * t;
const eOut2 = (t: number) => 1 - (1 - t) * (1 - t);

// ─── Track Custom SVG Icons ───────────────────────────────────────────────────

const AiDataIcon: React.FC<{ isHovered?: boolean }> = ({ isHovered }) => (
  <div className="relative w-full h-full rounded-[22%] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#3B0D24] via-[#2A091A] to-[#18050F] shadow-inner border border-[#FF2A85]/30">
    <div className="relative z-10 text-[#FF2A85] flex items-center justify-center drop-shadow-[0_0_12px_rgba(255,42,133,0.85)]">
      <BrainIcon size={30} isHovered={isHovered} className="text-[#FF2A85]" />
    </div>
    <motion.div
      animate={{
        opacity: isHovered ? [0.4, 0.9, 0.4] : 0.25,
        scale: isHovered ? [0.95, 1.2, 0.95] : 1,
      }}
      transition={{
        duration: 1.4,
        repeat: isHovered ? Infinity : 0,
        ease: 'easeInOut',
      }}
      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,42,133,0.45),transparent_70%)] pointer-events-none"
    />
  </div>
);

const WebAppIcon: React.FC<{ isHovered?: boolean }> = ({ isHovered }) => (
  <div className="relative w-full h-full rounded-[22%] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#0B2347] via-[#081B38] to-[#051021] shadow-inner border border-[#1F86F9]/30">
    <div className="relative z-10 text-[#38BDF8] flex items-center justify-center drop-shadow-[0_0_12px_rgba(31,134,249,0.85)]">
      <ChromeIcon size={30} isHovered={isHovered} className="text-[#38BDF8]" />
    </div>
    <motion.div
      animate={{
        opacity: isHovered ? [0.4, 0.9, 0.4] : 0.25,
        scale: isHovered ? [0.95, 1.2, 0.95] : 1,
      }}
      transition={{
        duration: 1.4,
        repeat: isHovered ? Infinity : 0,
        ease: 'easeInOut',
      }}
      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(31,134,249,0.45),transparent_70%)] pointer-events-none"
    />
  </div>
);

const SustainabilityIcon: React.FC<{ isHovered?: boolean }> = ({ isHovered }) => (
  <div className="relative w-full h-full rounded-[22%] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#0D3818] via-[#092711] to-[#05170A] shadow-inner border border-[#28C840]/30">
    <div className="relative z-10 text-[#28C840] flex items-center justify-center drop-shadow-[0_0_12px_rgba(40,200,64,0.85)]">
      <LeafyGreenIcon size={30} isHovered={isHovered} className="text-[#28C840]" />
    </div>
    <motion.div
      animate={{
        opacity: isHovered ? [0.4, 0.9, 0.4] : 0.25,
        scale: isHovered ? [0.95, 1.2, 0.95] : 1,
      }}
      transition={{
        duration: 1.4,
        repeat: isHovered ? Infinity : 0,
        ease: 'easeInOut',
      }}
      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(40,200,64,0.45),transparent_70%)] pointer-events-none"
    />
  </div>
);

const SocialImpactIcon: React.FC<{ isHovered?: boolean }> = ({ isHovered }) => (
  <div className="relative w-full h-full rounded-[22%] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#4A1E0E] via-[#33140A] to-[#1F0B05] shadow-inner border border-[#D97745]/30">
    <div className="relative z-10 text-[#D97745] flex items-center justify-center drop-shadow-[0_0_12px_rgba(217,119,69,0.85)]">
      <UsersIcon size={30} isHovered={isHovered} className="text-[#D97745]" />
    </div>
    <motion.div
      animate={{
        opacity: isHovered ? [0.4, 0.9, 0.4] : 0.25,
        scale: isHovered ? [0.95, 1.2, 0.95] : 1,
      }}
      transition={{
        duration: 1.4,
        repeat: isHovered ? Infinity : 0,
        ease: 'easeInOut',
      }}
      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(217,119,69,0.45),transparent_70%)] pointer-events-none"
    />
  </div>
);

const OpenInnovationIcon: React.FC<{ isHovered?: boolean }> = ({ isHovered }) => (
  <div className="relative w-full h-full rounded-[22%] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#3B1261] via-[#240A3D] to-[#12041F] shadow-inner border border-[#A855F7]/30">
    <div className="relative z-10 text-[#C084FC] flex items-center justify-center drop-shadow-[0_0_12px_rgba(168,85,247,0.85)]">
      <IdeaBoxIcon size={34} isHovered={isHovered} className="text-[#C084FC]" />
    </div>
    <motion.div
      animate={{
        opacity: isHovered ? [0.45, 0.95, 0.45] : 0.25,
        scale: isHovered ? [0.95, 1.2, 0.95] : 1,
      }}
      transition={{
        duration: 1.4,
        repeat: isHovered ? Infinity : 0,
        ease: 'easeInOut',
      }}
      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.5),transparent_70%)] pointer-events-none"
    />
  </div>
);

// ─── Tracks Data ──────────────────────────────────────────────────────────────
export const TRACKS: Track[] = [
  {
    id: 'ai-data',
    number: '01',
    label: 'AI & DATA',
    accent: '#FF2A85',
    tb: ['#2e0c1e', '#190610'],
    domain: 'Artificial intelligence, machine learning, predictive analytics, and intelligent data systems.',
    description: 'Build intelligent applications and data pipelines that extract meaningful insights, improve decision making, and automate complex workflows.',
    capabilities: [
      'Intelligent decision engines & agentic workflows',
      'Predictive modeling and statistical insight tools',
      'Natural language processing and accessibility engines',
      'Real-time data visualization & telemetry',
    ],
    bgGradient: 'radial-gradient(ellipse at 70% 40%, rgba(255,42,133,0.18) 0%, rgba(20,5,15,0.95) 75%)',
    Icon: AiDataIcon,
  },
  {
    id: 'web-app',
    number: '02',
    label: 'WEB & APP',
    accent: '#1F86F9',
    tb: ['#0e2238', '#081628'],
    domain: 'Modern web platforms, progressive web apps, cross-platform mobile apps, and distributed services.',
    description: 'Engineer responsive, high-utility web and mobile software with world-class user experiences and resilient architectures.',
    capabilities: [
      'High-performance full-stack web platforms',
      'Cross-platform mobile applications',
      'Collaborative real-time productivity software',
      'Accessible civic and community digital services',
    ],
    bgGradient: 'radial-gradient(ellipse at 70% 40%, rgba(31,134,249,0.18) 0%, rgba(5,15,30,0.95) 75%)',
    Icon: WebAppIcon,
  },
  {
    id: 'sustainability',
    number: '03',
    label: 'SUSTAINABILITY',
    accent: '#28C840',
    tb: ['#0e2a14', '#06180a'],
    domain: 'Ecological monitoring, renewable resource optimization, waste reduction, and climate resilience.',
    description: 'Develop technology solutions that protect ecosystems, optimize resource consumption, and advance environmental sustainability.',
    capabilities: [
      'Carbon tracking and resource optimization dashboards',
      'Renewable energy distribution simulations',
      'Smart agriculture and ecological sensor networks',
      'Circular economy and waste reduction platforms',
    ],
    bgGradient: 'radial-gradient(ellipse at 70% 40%, rgba(40,200,64,0.16) 0%, rgba(5,20,10,0.95) 75%)',
    Icon: SustainabilityIcon,
  },
  {
    id: 'social-impact',
    number: '04',
    label: 'SOCIAL IMPACT',
    accent: '#D97745',
    tb: ['#36190e', '#1e0c06'],
    domain: 'Public health, education equity, community empowerment, and civic technology.',
    description: 'Build impactful tools that address societal disparities, improve accessibility, and empower local communities.',
    capabilities: [
      'Accessible educational tools and learning platforms',
      'Community mutual-aid and emergency response networks',
      'Public health monitoring and wellness utilities',
      'Digital inclusion and assistive technology',
    ],
    bgGradient: 'radial-gradient(ellipse at 70% 40%, rgba(217,119,69,0.18) 0%, rgba(25,10,5,0.95) 75%)',
    Icon: SocialImpactIcon,
  },
  {
    id: 'open-innovation',
    number: '05',
    label: 'OPEN INNOVATION',
    accent: '#A855F7',
    tb: ['#240e36', '#140620'],
    domain: 'Emerging technologies, multidisciplinary solutions, hardware/IoT, and experimental software.',
    description: 'Pioneer novel concepts that transcend traditional domains by fusing unique tech stacks and creative engineering.',
    capabilities: [
      'IoT, robotics, and embedded hardware integrations',
      'Experimental developer tools & creative computation',
      'Decentralized systems and open protocols',
      'Interdisciplinary moonshot prototypes',
    ],
    bgGradient: 'radial-gradient(ellipse at 70% 40%, rgba(168,85,247,0.18) 0%, rgba(18,5,30,0.95) 75%)',
    Icon: OpenInnovationIcon,
  },
];

// ─── Genie Scanline Renderer ──────────────────────────────────────────────────
function renderGenie(
  ctx: CanvasRenderingContext2D,
  off: HTMLCanvasElement,
  W: number,
  H: number,
  rawT: number,
  dir: Dir,
  dock: Pt,
  win: Pt,
): void {
  ctx.clearRect(0, 0, W, H);
  for (let y = 0; y < WIN_H; y++) {
    const r = y / WIN_H;
    const rowXStart = dir === 'minimize' ? (1 - r) * 0.65 : r * 0.65;
    const xP = clamp((rawT - rowXStart) / (1 - rowXStart), 0, 1);
    const xE = eioC(xP);
    const rowYStart = dir === 'minimize' ? (1 - r) * 0.2 : r * 0.2;
    const yP = clamp((rawT - rowYStart) / (1 - rowYStart), 0, 1);
    const yE = eIn2(yP);
    let left: number, right: number, destY: number;
    if (dir === 'minimize') {
      left = lerp(win.x, dock.x, xE);
      right = lerp(win.x + WIN_W, dock.x, xE);
      destY = lerp(win.y + y, dock.y, yE);
    } else {
      left = lerp(dock.x, win.x, xE);
      right = lerp(dock.x, win.x + WIN_W, xE);
      destY = lerp(dock.y, win.y + y, yE);
    }
    const rowW = right - left;
    if (rowW < 0.8) continue;
    ctx.drawImage(off, 0, y, WIN_W, 1, left, destY, rowW, 1);
  }
  const glowRaw = dir === 'minimize' ? rawT : 1 - rawT;
  if (glowRaw > 0.75) {
    const a = eOut2((glowRaw - 0.75) / 0.25) * 0.3;
    const hex = Math.round(a * 255)
      .toString(16)
      .padStart(2, '0');
    const g = ctx.createRadialGradient(dock.x, dock.y, 0, dock.x, dock.y, 55);
    g.addColorStop(0, '#ffffff' + hex);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ─── Track Window Content ─────────────────────────────────────────────────────
function TrackWindowContent({ track }: { track: Track }) {
  return (
    <div className="flex flex-col h-full p-5 sm:p-6 bg-[#171A1D] text-[#F1EEE7] overflow-y-auto">
      {/* Track Eyebrow & Number */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(241,238,231,0.08)]">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider" style={{ color: track.accent }}>
          {track.id === 'ai-data' ? (
            <BrainIcon size={16} className="text-[#FF2A85]" />
          ) : track.id === 'web-app' ? (
            <ChromeIcon size={16} className="text-[#1F86F9]" />
          ) : track.id === 'sustainability' ? (
            <LeafyGreenIcon size={16} className="text-[#28C840]" />
          ) : track.id === 'social-impact' ? (
            <UsersIcon size={16} className="text-[#D97745]" />
          ) : track.id === 'open-innovation' ? (
            <IdeaBoxIcon size={16} className="text-[#C084FC]" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>TRACK {track.number}</span>
        </div>
        <span className="text-[10px] font-mono text-[#70736F] uppercase tracking-widest">
          HACK FOR GOOD
        </span>
      </div>

      {/* Main Track Heading */}
      <div className="pt-3 pb-2">
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display uppercase" style={{ color: track.accent }}>
          {track.label}
        </h3>
      </div>

      {/* Domain & Description */}
      <div className="space-y-1.5 pb-4">
        <span className="text-[10px] font-mono text-[#70736F] uppercase tracking-wider">
          DOMAIN
        </span>
        <p className="text-xs sm:text-sm text-[#D1CECA] leading-relaxed">
          {track.domain}
        </p>
      </div>

      {/* What Can You Build */}
      <div className="space-y-2 pt-2 border-t border-[rgba(241,238,231,0.08)]">
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: track.accent }}>
          WHAT CAN YOU BUILD?
        </span>
        <ul className="space-y-1.5 text-xs text-[#A9AAA5]">
          {track.capabilities.map((cap, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: track.accent }} />
              <span>{cap}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Footer inside Window */}
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-[rgba(241,238,231,0.08)]">
        <span className="text-[11px] text-[#70736F] font-mono">Build with Purpose</span>
        <a
          href="#cta"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-xs transition-colors"
          style={{ background: track.accent, color: '#111315' }}
        >
          <span>Register for Track</span>
          <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}

// ─── Mac Window Wrapper ───────────────────────────────────────────────────────
const MacWindow = ({
  track,
  winPos,
  onClose,
  domRef,
}: {
  track: Track;
  winPos: Pt;
  onClose: () => void;
  domRef: React.RefCallback<HTMLDivElement>;
}) => {
  return (
    <div
      ref={domRef}
      className="absolute flex flex-col overflow-hidden max-w-[calc(100vw-32px)]"
      style={{
        width: WIN_W,
        height: WIN_H,
        left: winPos.x,
        top: winPos.y,
        borderRadius: 14,
        background: '#171A1D',
        zIndex: 40,
        boxShadow:
          '0 32px 80px rgba(0,0,0,.85), 0 0 0 1px rgba(241,238,231,.14)',
      }}
    >
      <div
        className="flex items-center px-4 shrink-0 relative"
        style={{
          height: 38,
          background: `linear-gradient(180deg,${track.tb[0]},${track.tb[1]})`,
          borderBottom: '1px solid rgba(241,238,231,.08)',
        }}
      >
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={onClose}
            aria-label="Close Window"
            className="w-3 h-3 rounded-full border-none cursor-pointer hover:brightness-90 transition-all"
            style={{ background: '#ff5f57', boxShadow: '0 0 0 0.5px #e0443e' }}
          />
          <button
            onClick={onClose}
            aria-label="Minimize Window"
            className="w-3 h-3 rounded-full border-none cursor-pointer hover:brightness-90 transition-all"
            style={{ background: '#febc2e', boxShadow: '0 0 0 0.5px #d4a017' }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: '#28c840', boxShadow: '0 0 0 0.5px #1aab29' }}
          />
        </div>
        <span
          className="absolute inset-x-0 text-center text-xs font-mono font-medium pointer-events-none uppercase tracking-wider"
          style={{ color: 'rgba(241,238,231,.7)' }}
        >
          TRACK {track.number} // {track.label}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <TrackWindowContent track={track} />
      </div>
    </div>
  );
};

// ─── Magnified Dock Icon ──────────────────────────────────────────────────────
function MagnifiedDockIcon({
  track,
  isActive,
  showDot,
  disabled,
  btnRef,
  onClick,
  mouseX,
}: {
  track: Track;
  isActive: boolean;
  showDot: boolean;
  disabled: boolean;
  btnRef: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
  mouseX: MotionValue<number>;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const localRef = useRef<HTMLButtonElement>(null);
  const setRefs = useCallback(
    (el: HTMLButtonElement | null) => {
      localRef.current = el;
      btnRef(el);
    },
    [btnRef],
  );

  const distance = useTransform(mouseX, (val) => {
    const bounds = localRef.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
    };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeSync = useTransform(
    distance,
    [-MAG_RANGE, 0, MAG_RANGE],
    [ICON_BASE, ICON_PEAK, ICON_BASE],
  );
  const size = useSpring(sizeSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const innerSize = useTransform(size, (s) => s * 0.88);

  const Icon = track.Icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          ref={setRefs}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={disabled}
          style={{
            width: size,
            height: size,
            background: isActive ? `${track.accent}33` : 'transparent',
            cursor: disabled ? 'default' : 'pointer',
          }}
          className="relative flex items-center justify-center rounded-xl border-none transition-colors"
        >
          <motion.div
            style={{
              width: innerSize,
              height: innerSize,
              filter: isActive
                ? `drop-shadow(0 4px 14px ${track.accent}cc)`
                : 'drop-shadow(0 2px 6px rgba(0,0,0,.6))',
              pointerEvents: 'none',
            }}
            className="block"
          >
            <Icon isHovered={isHovered} />
          </motion.div>
          {showDot && (
            <div
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
              style={{ background: track.accent, boxShadow: `0 0 6px ${track.accent}` }}
            />
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent className="py-1 px-3 rounded-md" sideOffset={12}>
        <p className="text-xs font-semibold text-[#F1EEE7] tracking-wider uppercase">
          {track.number} — {track.label}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Snapshot Stage ───────────────────────────────────────────────────────────
function SnapshotStage({
  onReady,
}: {
  onReady: (canvases: HTMLCanvasElement[]) => void;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (cancelled) return;

        const canvases = await Promise.all(
          refs.current.map(async (node, i) => {
            if (!node) {
              const fallback = document.createElement('canvas');
              fallback.width = WIN_W;
              fallback.height = WIN_H;
              return fallback;
            }
            try {
              return await toCanvas(node, {
                pixelRatio: 1,
                cacheBust: false,
                skipFonts: true,
                fontEmbedCSS: '',
              });
            } catch {
              // Fallback canvas if rasterization encounters sandboxed CSS issues
              const fallback = document.createElement('canvas');
              fallback.width = WIN_W;
              fallback.height = WIN_H;
              const fCtx = fallback.getContext('2d');
              if (fCtx) {
                const tr = TRACKS[i];
                fCtx.fillStyle = '#171A1D';
                fCtx.fillRect(0, 0, WIN_W, WIN_H);
                fCtx.fillStyle = tr ? tr.accent : '#FF2A85';
                fCtx.font = 'bold 20px sans-serif';
                fCtx.fillText(tr ? tr.label : 'TRACK', 24, 60);
              }
              return fallback;
            }
          }),
        );
        if (cancelled) return;
        onReady(canvases);
      } catch (err) {
        console.warn('Genie snapshot handled with fallback:', err);
        if (!cancelled) onReady([]);
      }
    };

    const ric =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback;
    const cic =
      (window as unknown as { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback;
    let handle: number;
    if (typeof ric === 'function') {
      handle = ric(run);
    } else {
      handle = window.setTimeout(run, 50);
    }

    return () => {
      cancelled = true;
      if (typeof cic === 'function') cic(handle);
      else clearTimeout(handle);
    };
  }, [onReady]);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: -10000,
        top: 0,
        pointerEvents: 'none',
      }}
    >
      {TRACKS.map((t, i) => (
        <div
          key={t.id}
          style={{
            position: 'relative',
            width: WIN_W,
            height: WIN_H,
            marginBottom: 20,
          }}
        >
          <MacWindow
            track={t}
            winPos={{ x: 0, y: 0 }}
            onClose={() => {}}
            domRef={(el) => {
              refs.current[i] = el;
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main Tracks Section ──────────────────────────────────────────────────────
export const Tracks: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [phase, setPhase] = useState<Phase>('idle');
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [winPos, setWinPos] = useState<Pt>({ x: 0, y: 0 });
  const [snapshotsReady, setSnapshotsReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dockRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const offRef = useRef<HTMLCanvasElement[]>([]);
  const rafRef = useRef<number>(0);
  const stateRef = useRef<{ phase: Phase; activeTrack: number | null }>({
    phase: 'idle',
    activeTrack: null,
  });

  const mouseX = useMotionValue(Infinity);

  const handleSnapshotsReady = useCallback((canvases: HTMLCanvasElement[]) => {
    offRef.current = canvases;
    setSnapshotsReady(true);
  }, []);

  const getContainerSize = useCallback((): { w: number; h: number } => {
    const el = containerRef.current;
    if (!el) return { w: window.innerWidth, h: 660 };
    return { w: el.clientWidth, h: el.clientHeight };
  }, []);

  const getWinPos = useCallback((): Pt => {
    const { w, h } = getContainerSize();
    return {
      x: Math.max(16, (w - WIN_W) / 2),
      y: Math.max(48, (h - WIN_H) / 2 - 40),
    };
  }, [getContainerSize]);

  const getDockCenter = useCallback((idx: number): Pt => {
    const btn = dockRefs.current[idx];
    const cont = containerRef.current;
    if (!btn || !cont) return { x: 0, y: 0 };
    const b = btn.getBoundingClientRect();
    const c = cont.getBoundingClientRect();
    return {
      x: b.left - c.left + b.width / 2,
      y: b.top - c.top + b.height / 2,
    };
  }, []);

  const setupCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { w, h } = getContainerSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;
    c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [getContainerSize]);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    c.style.zIndex = '30';
  }, []);

  const startAnim = useCallback(
    (dir: Dir, trackIdx: number, onDone: () => void) => {
      cancelAnimationFrame(rafRef.current);
      const dock = getDockCenter(trackIdx);
      const win = getWinPos();
      const { w: cw, h: ch } = getContainerSize();
      const off = offRef.current[trackIdx];
      if (!off) {
        onDone();
        return;
      }
      let start: number | null = null;
      function frame(ts: number) {
        if (!start) start = ts;
        const rawT = clamp((ts - start) / DUR, 0, 1);
        const c = canvasRef.current;
        if (!c) return;
        renderGenie(
          c.getContext('2d')!,
          off,
          cw,
          ch,
          rawT,
          dir,
          dock,
          win,
        );
        if (rawT < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          onDone();
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    },
    [getDockCenter, getWinPos, getContainerSize],
  );

  const doOpen = useCallback(
    (idx: number) => {
      const { phase: currentPhase, activeTrack: currentTrack } = stateRef.current;
      if (currentPhase === 'opening' || currentPhase === 'closing') return;
      if (currentPhase === 'open' && currentTrack === idx) return;
      const wp = getWinPos();
      setupCanvas();
      stateRef.current = { phase: 'opening', activeTrack: idx };
      setWinPos(wp);
      setPhase('opening');
      setActiveTrack(idx);
      startAnim('open', idx, () => {
        stateRef.current.phase = 'open';
        flushSync(() => {
          setPhase('open');
        });
        clearCanvas();
      });
    },
    [getWinPos, setupCanvas, startAnim, clearCanvas],
  );

  const doMinimize = useCallback(() => {
    const { phase: p, activeTrack: a } = stateRef.current;
    if (p !== 'open' || a === null) return;

    const cvs = canvasRef.current;
    if (cvs) cvs.style.zIndex = '50';

    setupCanvas();
    const dock = getDockCenter(a);
    const win = getWinPos();
    const { w: cw, h: ch } = getContainerSize();
    const ctx = cvs?.getContext('2d');
    if (ctx && cvs) {
      renderGenie(ctx, offRef.current[a], cw, ch, 0, 'minimize', dock, win);
    }

    if (windowRef.current) {
      windowRef.current.style.opacity = '0';
      windowRef.current.style.pointerEvents = 'none';
    }

    stateRef.current.phase = 'closing';
    setPhase('closing');

    startAnim('minimize', a, () => {
      stateRef.current = { phase: 'idle', activeTrack: null };
      setPhase('idle');
      setActiveTrack(null);
      clearCanvas();
    });
  }, [setupCanvas, getDockCenter, getWinPos, getContainerSize, startAnim, clearCanvas]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (stateRef.current.phase === 'open') {
        setWinPos(getWinPos());
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [getWinPos]);

  const isAnimating = phase === 'opening' || phase === 'closing';
  const track = activeTrack !== null ? TRACKS[activeTrack] : null;

  return (
    <section id="tracks" className="relative py-12 sm:py-16 lg:py-20 px-3 sm:px-6 lg:px-8 w-full border-b border-[rgba(241,238,231,0.12)] overflow-hidden bg-[#08090C]">
      {/* 3D DriftWall Website Background behind macOS */}
      <div className="absolute -inset-x-28 -inset-y-20 pointer-events-none overflow-hidden opacity-90 z-0">
        <DriftWall
          speed={30}
          columns={12}
          tileWidth={175}
          tileHeight={105}
          gap={16}
          fade={0.2}
          dim={0.9}
          perspective={1200}
          tilt={12}
          turn={-8}
          lift={50}
          overlayColor="#080414"
          className="w-full h-full"
        />
        {/* Soft atmospheric gradient to seamlessly blend with website theme */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090C]/80 via-[#08090C]/35 to-[#08090C]/85" />
      </div>

      {/* Section Header: Aligned directly above the full-width workspace */}
      <div className="relative z-10 w-full max-w-[1240px] mx-auto px-2 sm:px-4 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#FF2A85] tracking-widest uppercase">
            <span>02 / CHALLENGES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#F1EEE7] font-display uppercase tracking-tight mt-1">
            HACKATHON TRACKS
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#A9AAA5] max-w-md font-normal leading-relaxed text-pretty">
          Focus areas designed to challenge participants across multiple disciplines. Choose a track below to explore.
        </p>
      </div>

      {/* PRIMARY MAC WORKSPACE CANVAS FLOATING ABOVE DRIFT WALL */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-[1240px] mx-auto min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] h-[70vh] max-h-[800px] rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-[rgba(241,238,231,0.18)] bg-[#0C0E10] shadow-[0_32px_100px_rgba(0,0,0,0.95)] flex flex-col justify-between"
      >
        {/* Dynamic WebGL Grainient macOS Wallpaper */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Grainient
            timeSpeed={0.22}
            color1="#c6598f"
            color2="#442774"
            color3="#383739"
            contrast={1.4}
            grainAmount={0.07}
            warpStrength={1.15}
            warpFrequency={4.8}
            zoom={0.88}
            className="w-full h-full opacity-90"
          />
          {/* Subtle dark glass vignette overlay to ensure text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0C0E10]/60 via-[#0C0E10]/35 to-[#0C0E10]/75" />
          {/* Ambient Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(241,238,231,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(241,238,231,0.03)_1px,transparent_1px)] bg-[size:36px_36px]" />
        </div>

        {/* Top macOS-Style Menubar */}
        <div
          className="relative top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 w-full shrink-0"
          style={{
            height: 32,
            zIndex: 50,
            background: 'rgba(17,19,21,0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(241,238,231,0.08)',
          }}
        >
          <div className="text-[#F1EEE7]/85 flex items-center text-xs gap-3 sm:gap-4 font-semibold tracking-tight uppercase">
            <span className="text-[#FF2A85] font-black flex items-center gap-1.5">
              <span>⚡</span> HACK FOR GOOD
            </span>
            <span className="text-[#A9AAA5] hidden sm:inline">TRACKS</span>
            <span className="text-[#70736F] hidden md:inline">FILE</span>
            <span className="text-[#70736F] hidden md:inline">VIEW</span>
            <span className="text-[#70736F] hidden md:inline">HELP</span>
          </div>
          <div className="text-[#A9AAA5] text-xs font-mono tracking-wider">
            {track ? `${track.number} // ${track.label}` : 'SELECT A TRACK'}
          </div>
        </div>

        {/* Default Desktop State (Center Workspace Content with Generous Breathing Room) */}
        <div className="relative my-auto flex flex-col items-center justify-center px-6 py-8 text-center pointer-events-none z-10">
          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#FF2A85] tracking-widest uppercase mb-2.5">
            <span className="w-1.5 h-1.5 bg-[#FF2A85] rounded-full animate-pulse" />
            <span>02 / CHALLENGES</span>
          </div>
          <h3 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#F1EEE7] font-display uppercase tracking-tight max-w-3xl text-balance drop-shadow-lg leading-[0.94]">
            WHAT WILL YOU BUILD?
          </h3>
          <p className="text-xs sm:text-sm text-[#A9AAA5] mt-3 sm:mt-4 max-w-md text-balance font-normal leading-relaxed">
            Choose a track in the dock below to explore challenges, capabilities, and domains.
          </p>
        </div>

        {/* Genie Animation Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', zIndex: 30 }}
        />

        {/* Live MacWindow (Rendered during Open/Closing state) */}
        {(phase === 'open' || phase === 'closing') && track && (
          <MacWindow
            track={track}
            winPos={winPos}
            onClose={doMinimize}
            domRef={(el) => {
              windowRef.current = el;
            }}
          />
        )}

        {/* Bottom Mac Dock Shelf: Integrated into the bottom of the workspace canvas */}
        {mounted && (
          <div className="relative bottom-0 inset-x-0 z-50 flex items-center justify-center p-0 sm:pb-3 pointer-events-none">
            <SnapshotStage onReady={handleSnapshotsReady} />

            <TooltipProvider delayDuration={0}>
              <motion.div
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className="pointer-events-auto w-full sm:w-[90%] max-w-3xl mx-auto flex items-end justify-center sm:justify-around gap-2 sm:gap-5 md:gap-7 px-4 sm:px-8 pb-2.5 pt-3 rounded-t-2xl sm:rounded-2xl border-t sm:border border-[rgba(241,238,231,0.16)] bg-[#15181C]/90 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.6)]"
              >
                {TRACKS.map((t, i) => (
                  <MagnifiedDockIcon
                    key={t.id}
                    track={t}
                    isActive={activeTrack === i}
                    showDot={activeTrack === i}
                    disabled={isAnimating || !snapshotsReady}
                    btnRef={(el) => {
                      dockRefs.current[i] = el;
                    }}
                    onClick={() => doOpen(i)}
                    mouseX={mouseX}
                  />
                ))}
              </motion.div>
            </TooltipProvider>
          </div>
        )}
      </div>
    </section>
  );
};
