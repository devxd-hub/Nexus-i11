import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroNavigation from './hero/HeroNavigation';

gsap.registerPlugin(ScrollTrigger);

interface HeroProps {
  onOpenApplyModal?: () => void;
  onOpenChallengeModal?: () => void;
}

type RoadPoint = { x: number; y: number; width: number; angle: number };
// Coordinates use the background's 1672 x 941 canvas. The route ends at the left bend.
const sportsRoute: RoadPoint[] = [
  { x: 140, y: 868, width: 420, angle: 0 },
  { x: 490, y: 980, width: 270, angle: 3 },
  { x: 900, y: 1060, width: 200, angle: 0 },
  { x: 1180, y: 990, width: 155, angle: -10 },
  { x: 1040, y: 920, width: 135, angle: -12 },
  { x: 890, y: 859, width: 115, angle: -12 },
  { x: 650, y: 775, width: 94, angle: -12 },
  { x: 490, y: 695, width: 76, angle: -8 },
  { x: 475, y: 689, width: 70, angle: -4 },
];

// Smooth interpolation follows the bridge's bends rather than a straight diagonal.
function sampleRoute(points: RoadPoint[], progress: number): RoadPoint {
  const t = Math.min(1, Math.max(0, progress)) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(t));
  const f = t - i;
  const result = {} as RoadPoint;
  for (const key of ['x', 'y', 'width', 'angle'] as const) {
    const a = points[Math.max(0, i - 1)][key];
    const b = points[i][key];
    const c = points[i + 1][key];
    // Extrapolate the final lane direction without adding a turn beyond the endpoint.
    const d = i + 2 < points.length ? points[i + 2][key] : key === 'x' || key === 'y' ? c + (c - b) : c;
    result[key] = .5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    if (key === 'width') result[key] = b + (c - b) * f;
  }
  return result;
}

function CarWheel({ className }: { className: string }) {
  return (
    <svg className={`car-wheel ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#100d20" stroke="#a92d4c" strokeWidth="3" />
      <g data-wheel-rotor>
        {Array.from({ length: 10 }, (_, index) => (
          <path key={index} d="M47 47L42 9 50 6 54 45Z" fill={index % 2 ? '#b63a63' : '#ef704c'} transform={`rotate(${index * 36} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="10" fill="#242034" stroke="#b24b66" strokeWidth="2" />
    </svg>
  );
}

// Door panels reuse the car's paint and windows, with hinges at the front pillars.
function CarDoors() {
  return <svg className="car-doors" viewBox="0 0 1672 941" aria-hidden="true">
    <defs>
      <clipPath id="near-door-cut"><path d="M1080 252L1160 260 1410 414 1460 490 1430 645 1250 628 1190 440Z" /></clipPath>
      <clipPath id="far-door-cut"><path d="M850 240L1020 225 1170 320 1130 410 930 340Z" /></clipPath>
    </defs>
    <path className="door-opening" d="M1080 252L1160 260 1410 414 1460 490 1430 645 1250 628 1190 440Z" fill="#120c22" stroke="#ec654a" strokeWidth="8" />
    <g data-car-door="far"><image href="/gta6/sports-car.png" width="1672" height="941" clipPath="url(#far-door-cut)" /><path d="M850 240L1020 225 1170 320 1130 410 930 340Z" fill="none" stroke="#e95972" strokeWidth="7" /></g>
    <g data-car-door="near"><image href="/gta6/sports-car.png" width="1672" height="941" clipPath="url(#near-door-cut)" /><path d="M1080 252L1160 260 1410 414 1460 490 1430 645 1250 628 1190 440Z" fill="none" stroke="#ff794d" strokeWidth="7" /></g>
  </svg>;
}

const sailingVessels = [
  { kind: 'cruise', startX: 230, endX: 1000, y: 548, endY: 551, width: 148, height: 49, duration: 180, left: false },
  { kind: 'cruise', startX: 1430, endX: 1020, y: 681, endY: 696, width: 184, height: 61, duration: 57, left: true },
  { kind: 'private', startX: 1450, endX: 1150, y: 606, endY: 617, width: 86, height: 29, duration: 43, left: true },
  { kind: 'private', startX: 1380, endX: 1090, y: 752, endY: 763, width: 112, height: 37, duration: 49, left: true },
];

function LivingSea() {
  return <svg className="living-sea" viewBox="0 0 1672 941" aria-hidden="true">
    <defs>
      <mask id="vessels-behind-shore" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941">
        <rect width="1672" height="941" fill="white" />
        <g fill="black">
          <path d="M174 941L177 239 179 235 179 223Q184 217 190 222L193 227 192 237 195 240 193 941Z" />
          <path d="M0 485L42 502 24 516 75 525 45 529 101 552 58 545 83 570 132 562 114 577 150 587 151 552 165 568 174 595 193 576 208 551 226 540 218 560 247 543 229 570 254 562 228 585 263 577 248 599 271 604 285 587 311 590 298 610 333 606 320 628 362 623 363 645 400 649 0 941Z" />
          <path d="M1672 575L1619 594 1648 597 1579 620 1610 617 1563 641 1530 624 1538 646 1498 641 1537 665 1495 665 1524 681 1480 702 1510 697 1487 726 1461 727 1473 741 1410 784 1431 786 1380 814 1425 810 1388 843 1320 864 1339 880 1300 911 1672 941Z" />
        </g>
      </mask>

      <clipPath id="cruise-silhouette"><path d="M20 470L30 437 56 409 83 374 107 347 143 316 148 296 199 276 205 260 250 241 260 222 269 218 260 208 261 190 280 185 289 208 285 220 333 220 355 189 383 162 372 136 397 135 400 96 442 89 474 125 485 139 501 182 578 191 636 208 649 229 707 215 840 184 956 166 958 116 959 84 973 81 976 54 982 54 987 80 1007 83 1005 94 990 99 1003 122 1040 127 1039 135 1022 139 1050 161 1145 168 1190 183 1220 194 1243 218 1300 234 1322 251 1315 269 1340 287 1368 317 1490 330 1487 290 1493 283 1498 332 1518 346 1354 494 1353 508 67 501 31 484Z" /></clipPath>
      <clipPath id="private-silhouette"><path d="M21 919L75 901 101 866 147 843 152 816 206 815 208 746 253 734 300 706 333 687 362 672 462 654 457 626 469 616 449 583 451 554 463 545 472 577 490 585 496 613 517 628 529 609 548 610 565 629 563 654 655 659 778 677 826 697 947 725 1057 752 1484 777 1483 745 1489 741 1494 780 1517 800 1427 901 1378 947 108 960 29 949Z" /></clipPath>
      <filter id="ambient-water" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency=".011 .09" numOctaves="2" seed="21" result="flow">
          <animate attributeName="baseFrequency" values=".011 .09;.014 .075;.011 .09" dur="14s" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="flow" scale="5" xChannelSelector="R" yChannelSelector="G">
          <animate attributeName="scale" values="4;7;4" dur="8s" repeatCount="indefinite" />
        </feDisplacementMap>
      </filter>
      <mask id="open-water-only" maskUnits="userSpaceOnUse">
        <path fill="white" d="M200 524L670 547 730 564 355 617 250 590ZM1100 564L1610 576 1575 672 1475 766 1360 815 1000 787 900 735 850 701 945 678 1010 673 1108 651Z" />
      </mask>
    </defs>
    <g mask="url(#open-water-only)"><image href="/gta6/hero-water-no-ships.png" width="1672" height="941" filter="url(#ambient-water)" /></g>
    <g mask="url(#vessels-behind-shore)">
    {sailingVessels.map((vessel, index) => <g key={index} className="sailing-vessel">
      <animateMotion path={`M${vessel.startX} ${vessel.y}L${vessel.endX} ${vessel.endY}`} dur={`${vessel.duration}s`} repeatCount="1" fill="freeze" />
      <g transform={`scale(${vessel.left ? -1 : 1} 1)`}>
        <path d={`M${-vessel.width*.42} -5q${-vessel.width*.25} 5 ${-vessel.width*.4} 3m${vessel.width*.4} 2q${-vessel.width*.3} 5 ${-vessel.width*.45} 2`} fill="none" stroke="#ffc2da" strokeWidth="1.3" opacity=".4" />
        <svg x={-vessel.width/2} y={-vessel.height+7} width={vessel.width} height={vessel.height} viewBox={vessel.kind === 'cruise' ? '0 0 1536 512' : '0 512 1536 512'} preserveAspectRatio="xMidYMid meet" overflow="hidden">
          <image href="/gta6/sailing-ship-sprites.png" width="1536" height="1024" clipPath={`url(#${vessel.kind === 'cruise' ? 'cruise' : 'private'}-silhouette)`} />
        </svg>
      </g>
    </g>)}
    </g>
  </svg>;
}

function SeaWordmark() {
  return <svg className="sea-wordmark" viewBox="0 0 1672 941" aria-hidden="true">
    <defs>
      <clipPath id="good-waterline"><path data-waterline-clip d="M420 285H1520V550H420Z" /></clipPath>
      <linearGradient id="good-vice-colors" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#edb194" />
        <stop offset=".38" stopColor="#e977aa" />
        <stop offset=".72" stopColor="#c65bce" />
        <stop offset="1" stopColor="#9270cf" />
      </linearGradient>
      <mask id="good-color-shape" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="44" y="310" width="1358" height="514">
        <image href="/gta6/good-wordmark.png" width="1430" height="1086" />
      </mask>
      <filter id="good-refraction" x="-10%" y="-15%" width="120%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency=".016 .065" numOctaves="2" seed="8" result="wave" />
        <feDisplacementMap data-letter-distortion in="SourceGraphic" in2="wave" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <linearGradient id="dry-letter-gradient" x1="0" y1="500" x2="0" y2="545" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <linearGradient id="wet-letter-gradient" x1="0" y1="500" x2="0" y2="545" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="black" /><stop offset="1" stopColor="white" /></linearGradient>
      <mask id="dry-letter-mask" maskUnits="userSpaceOnUse" x="400" y="280" width="1150" height="280"><rect x="400" y="280" width="1150" height="280" fill="url(#dry-letter-gradient)" /></mask>
      <mask id="wet-letter-mask" maskUnits="userSpaceOnUse" x="400" y="280" width="1150" height="280"><rect x="400" y="280" width="1150" height="280" fill="url(#wet-letter-gradient)" /></mask>
    </defs>
    <g clipPath="url(#good-waterline)">
      {['dry', 'wet'].map(layer => <g key={layer} mask={`url(#${layer}-letter-mask)`}>
        <g data-good-rise filter={layer === 'wet' ? 'url(#good-refraction)' : undefined}>
          <svg x="496" y="315" width="680" height="215" viewBox="44 310 1358 514" preserveAspectRatio="none" className="good-lettering">
            <rect x="44" y="310" width="1358" height="514" fill="url(#good-vice-colors)" mask="url(#good-color-shape)" />
          </svg>
        </g>
      </g>)}
    </g>
  </svg>;
}

export const Hero: React.FC<HeroProps> = ({ onOpenApplyModal }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sportsRef = useRef<HTMLDivElement>(null);
  const womanRef = useRef<HTMLDivElement>(null);
  const manRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const sports = sportsRef.current;
    const woman = womanRef.current;
    const man = manRef.current;
    if (!section || !stage || !sports || !woman || !man) return;
    const sportsSide = sports.querySelector<HTMLElement>('.sports-side');
    const sportsRear = sports.querySelector<HTMLElement>('.sports-rear');
    const wheelRotors = Array.from(sports.querySelectorAll<SVGGElement>('[data-wheel-rotor]'));
    // Wheel rotation follows distance along the road, so stopping or reversing scroll does the same to the wheels.
    const distances = [0];
    for (let index = 1; index <= 200; index++) {
      const previous = sampleRoute(sportsRoute, (index - 1) / 200);
      const current = sampleRoute(sportsRoute, index / 200);
      distances.push(distances[index - 1] + Math.hypot(current.x - previous.x, current.y - previous.y));
    }
    const media = gsap.matchMedia();
    media.add({ reduced: '(prefers-reduced-motion: reduce)', normal: '(prefers-reduced-motion: no-preference)' }, context => {
      const reduced = Boolean(context.conditions?.reduced);
      const driveDistance = () => Math.max(1200, Math.min(1800, window.innerHeight * 1.7));
      const exitDistance = 450;
      const draw = (totalProgress: number) => {
        section.dataset.sceneComplete = totalProgress >= .999 ? 'true' : 'false';
        const traveled = totalProgress * (driveDistance() + exitDistance);
        const progress = Math.min(1, traveled / driveDistance());
        const exitProgress = Math.max(0, Math.min(1, (traveled - driveDistance() - 55) / (exitDistance - 55)));
        const doorProgress = Math.min(1, exitProgress / .32);
        const walkingProgress = Math.max(0, Math.min(1, (exitProgress - .28) / .72));
        const step = walkingProgress * walkingProgress * (3 - 2 * walkingProgress);
        // Scissor doors lift first and remain fully raised throughout the standing phase.
        sports.querySelector('[data-car-door="near"]')?.setAttribute('transform', `rotate(${doorProgress * 76} 1450 430)`);
        sports.querySelector('[data-car-door="far"]')?.setAttribute('transform', `rotate(${doorProgress * 82} 1170 320)`);
        const doors = sports.querySelector<SVGElement>('.car-doors');
        if (doors) doors.style.opacity = exitProgress > 0 ? '1' : '0';
        const scale = Math.max(stage.clientWidth / 1672, stage.clientHeight / 941);
        const horizontalAnchor = stage.clientWidth <= 640 ? .22 : .5;
        const offsetX = (stage.clientWidth - 1672 * scale) * horizontalAnchor;
        const offsetY = (stage.clientHeight - 941 * scale) / 2;
        const emergence = Math.min(1, progress / .78);
        const rise = 1 - Math.pow(1 - emergence, 2);
        const sea = stage.querySelector<SVGElement>('.sea-wordmark');
        const livingSea = stage.querySelector<SVGElement>('.living-sea');
        if (livingSea) gsap.set(livingSea, { x: offsetX, y: offsetY, width: 1672 * scale, height: 941 * scale });
        if (sea) {
          gsap.set(sea, { x: offsetX, y: offsetY, width: 1672 * scale, height: 941 * scale });
          sea.querySelectorAll('[data-good-rise]').forEach(layer => layer.setAttribute('transform', `translate(0 ${(1 - rise) * 300})`));
          const agitation = Math.sin(Math.PI * emergence);
          const phase = emergence * 25;
          const wavePoints = Array.from({ length: 56 }, (_, index) => {
            const x = 420 + index * 20;
            const y = 550 + agitation * (Math.sin(index * .67 + phase) * 5 + Math.sin(index * .29 - phase * .7) * 3);
            return `${x.toFixed(1)} ${y.toFixed(1)}`;
          });
          sea.querySelector('[data-waterline-clip]')?.setAttribute('d', `M420 285H1520L${wavePoints.slice().reverse().join('L')}Z`);
          sea.querySelector('[data-letter-distortion]')?.setAttribute('scale', (agitation * 17).toFixed(2));
        }
        stage.dataset.goodProgress = emergence.toFixed(3);
        const place = (el: HTMLElement, route: RoadPoint[]) => {
          const point = sampleRoute(route, progress);
          // Hold the established heading for the final approach instead of yawing again at the endpoint.
          const headingProgress = Math.min(progress, .86);
          const before = sampleRoute(route, Math.max(0, headingProgress - .003));
          const after = sampleRoute(route, Math.min(1, headingProgress + .003));
          const dx = after.x - before.x;
          const dy = after.y - before.y;
          const horizontal = dx / Math.max(.001, Math.hypot(dx, dy));
          const direction = dx >= 0 ? 1 : -1;
          // The road tangent determines the nose direction; do not slide a fixed pose along it.
          let slope = Math.atan2(dy, dx) * 180 / Math.PI;
          if (slope > 90) slope -= 180;
          if (slope < -90) slope += 180;
          const facingCamera = 1 - Math.min(1, Math.abs(horizontal) / .65);
          gsap.set(el, {
            x: offsetX + point.x * scale,
            y: offsetY + point.y * scale,
            width: point.width * scale,
            rotation: Math.max(-12, Math.min(12, slope)) * (1 - facingCamera),
            scaleX: direction,
            xPercent: -50,
            yPercent: -82,
            transformOrigin: '50% 82%',
          });

            // Keep a single opaque vehicle silhouette while its angle changes.
            const rearFacing = facingCamera > .4;
            if (sportsSide) sportsSide.style.opacity = rearFacing ? '0' : '1';
            if (sportsRear) sportsRear.style.opacity = rearFacing ? '1' : '0';

        };
        place(sports, sportsRoute);
        const placeCharacter = (element: HTMLElement, side: number) => {
          const doorX = side < 0 ? 453 : 479;
          const doorY = side < 0 ? 688 : 674;
          const x = doorX + side * step * 23;
          const y = doorY + step * (side < 0 ? 8 : -2);
          gsap.set(element, {
            x: offsetX + x * scale,
            y: offsetY + (y + (1 - step) * 18) * scale,
            height: (side < 0 ? 53 : 57) * scale,
            xPercent: -50,
            yPercent: -94,
            opacity: Math.min(1, walkingProgress * 10),
            clipPath: `inset(0 0 ${(1 - step) * 75}% 0)`,
          });
        };
        placeCharacter(woman, -1);
        placeCharacter(man, 1);
        const distanceIndex = Math.min(199, Math.floor(progress * 200));
        const distanceFraction = progress * 200 - distanceIndex;
        const distance = distances[distanceIndex] + (distances[distanceIndex + 1] - distances[distanceIndex]) * distanceFraction;
        const wheelAngle = reduced ? 0 : distance / 18 * 180 / Math.PI;
        wheelRotors.forEach(rotor => rotor.setAttribute('transform', `rotate(${wheelAngle.toFixed(2)} 50 50)`));
        stage.dataset.driveProgress = progress.toFixed(3);
        stage.dataset.exitProgress = exitProgress.toFixed(3);
        stage.dataset.doorProgress = doorProgress.toFixed(3);
      };
      draw(reduced ? 1 : 0);
      if (reduced) {
        const resize = () => draw(1);
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
      }
      const state = { progress: 0 };
      const tween = gsap.to(state, {
        progress: 1,
        ease: 'none',
        onUpdate: () => draw(state.progress),
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${driveDistance() + exitDistance}`,
          pin: stage,
          scrub: .25,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => draw(state.progress),
        },
      });
      return () => { tween.scrollTrigger?.kill(); tween.kill(); };
    });
    return () => media.revert();
  }, []);

  return (
    <section ref={sectionRef} className="hero-drive relative w-full bg-[#07080a]" aria-label="Hack for Good scroll scene">
      <div ref={stageRef} className="hero-redesign relative isolate h-[100svh] min-h-[540px] w-full overflow-hidden bg-[#07080a]">
        <div className="hero-artwork" aria-hidden="true" />
        <h1 className="hero-artwork-title">
          <span className="sr-only">Hack for Good</span>
          <img src="/gta6/hack-for-retro-cream.png" alt="" fetchPriority="high" />
        </h1>
        <div className="hero-artwork hero-artwork-foreground" aria-hidden="true" />
        <LivingSea />
        <SeaWordmark />
        <div className="hero-traffic" aria-hidden="true">
          <div ref={womanRef} className="car-character car-character-woman" />
          <div ref={sportsRef} className="road-vehicle sports-vehicle">
            <div className="sports-side">
              <img src="/gta6/sports-car.png" alt="" loading="eager" />
              <CarWheel className="car-wheel-near" />
              <CarWheel className="car-wheel-far" />
              <CarDoors />
            </div>
            <img className="sports-rear" src="/gta6/sports-car-rear.png" alt="" loading="eager" />
          </div>
          <div ref={manRef} className="car-character car-character-man" />
        </div>
        <div className="hero-scene-shade" aria-hidden="true" />
        <HeroNavigation onRegisterClick={onOpenApplyModal} className="relative" />
      </div>
      <div className="landing-motion-strip" aria-label="Build. Solve. Impact. Hack for Good.">
        <div className="landing-motion-strip-track" aria-hidden="true">
          {[0, 1].map(copy => (
            <div className="landing-motion-strip-group" key={copy}>
              {[0, 1, 2, 3].map(item => (
                <span className="landing-motion-strip-message" key={item}>
                  BUILD. SOLVE. IMPACT. <span className="landing-motion-strip-star">✦</span> HACK FOR GOOD <span className="landing-motion-strip-star">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;













