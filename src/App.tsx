import { useLenis } from './hooks/useLenis';
import './landing.css';
import { RouterProvider, useRouter } from './lib/router';
import { Hero } from './components/LandingHero';
import { About } from './sections/About';
import { Tracks } from './sections/Tracks';
import { Timeline } from './sections/Timeline';
import { Prizes } from './sections/Prizes';
import { PartnersTeaser } from './sections/PartnersTeaser';
import { CallToAction } from './sections/CallToAction';
import { Footer } from './sections/Footer';
import { PartnersPage } from './pages/PartnersPage';
import Register from './pages/Register';

function AppContent() {
  const { path, navigate } = useRouter();
  useLenis();

  // Dedicated Hidden /partners page (pure full-screen interactive experience)
  if (path === '/partners') {
    return <PartnersPage />;
  }

  // Working Squad Registration page (backend connected)
  if (path === '/register') {
    return <Register />;
  }

  // Primary Homepage View
  return (
    <div className="min-h-screen bg-[#111315] text-[#F1EEE7] flex flex-col">
      {/* 1. Navbar */}

      <main className="flex-1 flex flex-col">
        {/* 2. Hero */}
        <Hero onOpenApplyModal={() => navigate('/register')} />

        {/* 3. About Hack for Good */}
        <About />

        {/* 4. Hackathon Tracks */}
        <Tracks />

        {/* 5. Timeline */}
        <Timeline />

        {/* 6. Prizes */}
        <Prizes />

        {/* 7. Partners Teaser (Immediately after Prizes and before CallToAction/FAQ) */}
        <PartnersTeaser />

        {/* 8. Call to Action */}
        <CallToAction />
      </main>

      {/* 9. Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
