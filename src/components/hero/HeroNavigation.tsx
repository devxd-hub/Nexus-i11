import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import LumaBar from '../ui/futuristic-nav';
import { heroContent } from '../../config/heroContent';

interface HeroNavigationProps {
  onRegisterClick?: () => void;
  className?: string;
}

export const HeroNavigation = forwardRef<HTMLElement, HeroNavigationProps>(
  ({ onRegisterClick }, ref) => createPortal(
    <header ref={ref} data-hero="nav" className="fixed inset-x-0 top-4 sm:top-6 z-50 pointer-events-none">
      <nav aria-label="Main navigation" className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
        <LumaBar />
      </nav>
      <button
        type="button"
        onClick={onRegisterClick}
        className="absolute top-16 lg:top-2 right-8 sm:right-12 lg:right-20 pointer-events-auto inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 bg-black/20 backdrop-blur-md hover:bg-white/[0.06] border border-white/30 hover:border-[#fbf7ee] text-[#fbf7ee] font-mono text-[10px] sm:text-[11px] tracking-[0.2em] uppercase transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c42828]"
      >
        {heroContent.navigation.cta.label}
      </button>
    </header>,
    document.body
  )
);

HeroNavigation.displayName = 'HeroNavigation';
export default HeroNavigation;
