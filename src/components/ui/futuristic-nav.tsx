"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Info, Layers, Calendar, Trophy, Sparkles } from "lucide-react";
import { useLenis } from '../../hooks/useLenis';

export interface NavItem {
  id: number;
  icon: React.ReactNode;
  label: string;
  href?: string;
}

const defaultItems: NavItem[] = [
  { id: 0, icon: <Home size={18} />, label: "Home", href: "#" },
  { id: 1, icon: <Info size={18} />, label: "About", href: "#about" },
  { id: 2, icon: <Layers size={18} />, label: "Tracks", href: "#tracks" },
  { id: 3, icon: <Calendar size={18} />, label: "Timeline", href: "#timeline" },
  { id: 4, icon: <Trophy size={18} />, label: "Prizes", href: "#prizes" },
  { id: 5, icon: <Sparkles size={18} />, label: "Register", href: "#cta" },
];

export interface LumaBarProps {
  items?: NavItem[];
  onItemClick?: (item: NavItem, index: number) => void;
  className?: string;
}

export const LumaBar: React.FC<LumaBarProps> = ({
  items = defaultItems,
  onItemClick,
  className = "",
}) => {
  const [active, setActive] = useState(0);
  const { lenis } = useLenis();

  useEffect(() => {
    let frame = 0;
    const updateActive = () => {
      frame = 0;
      const marker = Math.min(window.innerHeight * 0.3, 220);
      let current = 0;
      items.forEach((item, index) => {
        if (!item.href?.startsWith('#') || item.href === '#') return;
        const section = document.querySelector(item.href);
        if (section && section.getBoundingClientRect().top <= marker) current = index;
      });
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActive);
    };
    updateActive();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [items]);

  const handleClick = (item: NavItem, index: number) => {
    setActive(index);
    if (onItemClick) {
      onItemClick(item, index);
    } else if (item.href) {
      if (item.href.startsWith("#")) {
        if (item.href === "#") {
          if (lenis) lenis.scrollTo(0);
          else window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        const el = document.querySelector(item.href);
        if (el) {
          if (lenis) lenis.scrollTo(el as HTMLElement);
          else el.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  return (
    <div className={`select-none ${className}`}>
      <div className="relative flex items-center justify-center gap-1 sm:gap-2.5 bg-black/25 backdrop-blur-2xl rounded-full px-3 sm:px-5 py-1.5 sm:py-2 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/15 overflow-visible">
        
        {/* Active Indicator Glow */}
        <motion.div
          layoutId="active-indicator"
          className="absolute w-12 h-12 bg-gradient-to-r from-[#FF2A85] via-[#D97745] to-[#E5A06F] rounded-full blur-lg -z-10 opacity-70 pointer-events-none"
          animate={{
            left: `calc(${active * (100 / items.length)}% + ${100 / items.length / 2}%)`,
            translateX: "-50%",
          }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />

        {items.map((item, index) => {
          const isActive = index === active;
          return (
            <motion.div key={item.id} className="relative flex flex-col items-center group">
              {/* Button */}
              <motion.a
                href={item.href ?? "#"}
                onClick={(e) => {
                  if (item.href?.startsWith("#")) {
                    e.preventDefault();
                  }
                  handleClick(item, index);
                }}
                whileHover={{ scale: 1.15 }}
                animate={{ scale: isActive ? 1.2 : 1 }}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-colors relative z-10 ${
                  isActive
                    ? "text-[#F1EEE7] font-semibold drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                    : "text-[#A9AAA5] hover:text-[#F1EEE7]"
                }`}
                aria-label={item.label}
                aria-current={isActive ? "location" : undefined}
              >
                {item.icon}
              </motion.a>

              {/* Tooltip positioned under the top nav item */}
              <span className="absolute top-full mt-2.5 px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase rounded-md bg-[#171A1D] text-[#F1EEE7] border border-white/15 shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap translate-y-1 group-hover:translate-y-0 z-50">
                {item.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LumaBar;
