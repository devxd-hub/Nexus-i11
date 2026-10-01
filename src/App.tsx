/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, lazy, Suspense } from 'react';
import { useLenis } from './hooks/useLenis';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HeritageJourney from './components/HeritageJourney/HeritageJourney';
import StorySection from './components/StorySection';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Partners from './components/Partners/Partners';

// Code-split modals so they are only fetched when requested by the user
const ApplicationModal = lazy(() => import('./components/ApplicationModal'));
const TrailerModal = lazy(() => import('./components/TrailerModal'));

export default function App() {
  useLenis();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07080a] text-white selection:bg-[#f59e0b] selection:text-black overflow-x-hidden">
      {/* Accessible skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-[#f59e0b] text-black font-mono text-xs font-bold shadow-lg"
      >
        Skip to main content
      </a>

      {/* 1. Fixed/Sticky Navigation with Reference Branding & Menu */}
      <Navbar onOpenApplyModal={() => setIsApplyModalOpen(true)} />

      <main id="main-content">
        {/* 2. Full-Screen Cinematic Gateway Hero Experience */}
        <Hero
          onOpenApplyModal={() => setIsApplyModalOpen(true)}
          onOpenChallengeModal={() => setIsTrailerModalOpen(true)}
        />

        {/* 3. CONTINUOUS HERITAGE JOURNEY (Connecting artwork gta6/abthfg.png spanning Section One & Section Two) */}
        <HeritageJourney
          onOpenApplyModal={() => setIsApplyModalOpen(true)}
          onExploreClick={() => setIsTrailerModalOpen(true)}
        />

        {/* 4. THE BUILDERS: IDEAS BECOME IMPACT */}
        <StorySection
          id="builders"
          actNumber="ACT 02"
          chapterNumber="CHAPTER 02"
          eyebrow="THE PEOPLE"
          heading="IDEAS BECOME IMPACT"
          supportingCopy="From first prototype to final demonstration, teams turn ideas into working technology with measurable social and technological impact."
          narrativeParagraphs={[
            "Thirty-two hand-selected squads—composed of compiler specialists, systems architects, industrial designers, and domain operators—enter the crucible with raw telemetry and exit with verified, production-grade artifacts.",
            "Teams work directly alongside frontier laboratory leads and frontline humanitarian directors. When the 48-hour sprint concludes, qualifying systems unlock non-dilutive capital grants disbursed directly on Sunday evening."
          ]}
          benchmarks={[
            { label: "SELECTED SQUADS", value: "120 TEAMS" },
            { label: "CRUCIBLE WINDOW", value: "48 UNBROKEN HRS" },
            { label: "DEPLOYMENT POOL", value: "$1,200,000 DIRECT" }
          ]}
          quote={{
            text: "Watching senior builders transform a raw problem statement into a running, formally verified kernel in 48 hours is what separates hackathon theater from engineering.",
            author: "LEAD SYSTEMS AUDITOR"
          }}
          ctaText="REGISTER FOR CHALLENGE"
          onCtaClick={() => setIsApplyModalOpen(true)}
          imageProps={{
            primaryImage: "/assets/jason_1.webp",
            secondaryImage: "/assets/jason_3.webp",
            backdropImage: "/assets/background.webp",
            altText: "Systems engineer stress-testing high-concurrency runtime nodes",
            frameId: "SECTOR 02 · SPRINT CRUCIBLE",
            coordinates: "20.2961° N · 85.8245° E",
            telemetryTag: "HIGH-CONCURRENCY RUNTIME",
            variant: "overlap-duo",
            overlapDirection: "left"
          }}
          layoutVariant="text-right"
        />

        {/* 5. Call-To-Action Section (Application Gates) */}
        <CTA onOpenApplyModal={() => setIsApplyModalOpen(true)} />
          <Partners onOpenApplyModal={() => setIsApplyModalOpen(true)} />
      </main>

      {/* 6. Editorial Footer */}
      <Footer />

      {/* Suspended Modal Loading for Optimal Initial JS Payload */}
      {isApplyModalOpen && (
        <Suspense fallback={null}>
          <ApplicationModal
            isOpen={isApplyModalOpen}
            onClose={() => setIsApplyModalOpen(false)}
          />
        </Suspense>
      )}

      {isTrailerModalOpen && (
        <Suspense fallback={null}>
          <TrailerModal
            isOpen={isTrailerModalOpen}
            onClose={() => setIsTrailerModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
