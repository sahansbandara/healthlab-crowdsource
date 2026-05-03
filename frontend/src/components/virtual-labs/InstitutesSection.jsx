import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  GraduationCap,
  Globe2,
  HeartPulse,
  Stethoscope,
  Users,
} from 'lucide-react';

const partners = [
  {
    title: 'Community Researchers',
    description: 'Independent researchers contributing real-world health experiments.',
    icon: Users,
  },
  {
    title: 'University Labs',
    description: 'Academic institutions conducting structured and evidence-based studies.',
    icon: GraduationCap,
  },
  {
    title: 'Healthcare Professionals',
    description: 'Doctors and health experts guiding research and validating findings.',
    icon: Stethoscope,
  },
  {
    title: 'Wellness Organizations',
    description: 'Organizations focused on improving public health and well-being.',
    icon: HeartPulse,
  },
  {
    title: 'Fitness & Lifestyle Groups',
    description: 'Communities promoting healthy habits through participation and data.',
    icon: Dumbbell,
  },
  {
    title: 'Global Contributors',
    description: 'Individuals worldwide sharing data and supporting research initiatives.',
    icon: Globe2,
  },
];

const InstitutesSection = () => {
  const scrollerRef = useRef(null);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 400) * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section id="institutes" className="scroll-mt-24 border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-800">Collaborating Partners</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Our Research Network
            </h2>
            <p className="mt-2 max-w-xl text-slate-600">
              Trusted researchers, institutions, and communities contributing to experiments, insights, and innovation across HealthLab.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              aria-label="Scroll partners left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              aria-label="Scroll partners right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        <div className="relative mt-10">
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
            aria-label="Collaborating partners carousel"
          >
            {partners.map((partner) => {
              const Icon = partner.icon;
              return (
                <motion.div
                  key={partner.title}
                  role="listitem"
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="snap-start shrink-0"
                >
                  <div className="flex h-52 w-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-blue-200 hover:shadow-cardHover">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md ring-4 ring-blue-600/10">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{partner.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{partner.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstitutesSection;
