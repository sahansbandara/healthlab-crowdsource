import React from 'react';
import {
  SiteNavbar,
  Hero,
  ObjectivesSection,
  LabCategories,
  InstitutesSection,
  AnnouncementsVideo,
  TestimonialsSection,
  StatisticsSection,
  VirtualLabsFooter,
} from '../components/virtual-labs';

/**
 * Virtual Labs marketing homepage — Tailwind + Framer Motion + Lucide.
 * Modular sections live in `src/components/virtual-labs/`.
 */
const Home = () => (
  <div className="min-h-screen bg-[#e6f2ff] text-slate-900 antialiased">
    <SiteNavbar />
    <Hero />
    <ObjectivesSection />
    <LabCategories />
    <InstitutesSection />
    <AnnouncementsVideo />
    <TestimonialsSection />
    <StatisticsSection />
    <VirtualLabsFooter />
  </div>
);

export default Home;
