import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote:
      'HealthLab helps researchers efficiently manage experiments, track participant data, and monitor progress in one centralized platform.',
    name: 'Dr. Ayesha Perera',
    role: 'Researcher',
    org: 'Health Research Institute',
  },
  {
    quote:
      'The platform simplifies experiment configuration, eligibility management, and data tracking, making research workflows faster and more organized.',
    name: 'Dr. Nimal Fernando',
    role: 'Senior Researcher',
    org: 'Biomedical Research Center',
  },
  {
    quote:
      'HealthLab provides a reliable and structured environment for handling research reviews, experiment lifecycle management, and collaboration.',
    name: 'Dr. Kavindi Silva',
    role: 'Research Lead',
    org: 'Clinical Research Unit',
  },
];

const TestimonialsSection = () => (
  <section className="bg-white py-16 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-800">USER FEEDBACK</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          What researchers and users say about HealthLab
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: 0.08 * i, duration: 0.45 }}
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-6 shadow-card"
          >
            <Quote className="h-8 w-8 text-blue-200" aria-hidden />
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">“{t.quote}”</blockquote>
            <figcaption className="mt-6 border-t border-slate-200 pt-4">
              <p className="font-semibold text-slate-900">{t.name}</p>
              <p className="text-xs font-medium text-emerald-700">{t.role}</p>
              <p className="mt-1 text-xs text-slate-500">{t.org}</p>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
