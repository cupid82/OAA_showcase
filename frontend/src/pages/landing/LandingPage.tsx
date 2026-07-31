import { LandingFooter } from '@/pages/landing/components/LandingFooter';
import { LandingNav } from '@/pages/landing/components/LandingNav';
import { About } from '@/pages/landing/sections/About';
import { Contact } from '@/pages/landing/sections/Contact';
import { Courses } from '@/pages/landing/sections/Courses';
import { Departments } from '@/pages/landing/sections/Departments';
import { Events } from '@/pages/landing/sections/Events';
import { Gallery } from '@/pages/landing/sections/Gallery';
import { Hero } from '@/pages/landing/sections/Hero';
import { News } from '@/pages/landing/sections/News';
import { Placements } from '@/pages/landing/sections/Placements';
import { PrincipalMessage } from '@/pages/landing/sections/PrincipalMessage';
import { Statistics } from '@/pages/landing/sections/Statistics';
import { Testimonials } from '@/pages/landing/sections/Testimonials';

/** Public marketing page. Content lives in landingData.ts — see docs/01-landing-page.md. */
export default function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <LandingNav />
      <main>
        <Hero />
        <Statistics />
        <About />
        <PrincipalMessage />
        <Departments />
        <Courses />
        <Gallery />
        <News />
        <Events />
        <Placements />
        <Testimonials />
        <Contact />
      </main>
      <LandingFooter />
    </div>
  );
}
