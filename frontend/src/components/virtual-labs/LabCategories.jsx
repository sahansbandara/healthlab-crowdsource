import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cpu,
  Zap,
  Cog,
  Building2,
  Dna,
  Atom,
} from 'lucide-react';

const categories = [
  {
    name: 'Fitness & Lifestyle',
    icon: Cpu,
    slug: 'fitness-lifestyle',
    description: 'Join studies that explore exercise routines, activity levels, and daily lifestyle habits that support better health.',
  },
  {
    name: 'Nutrition & Diet',
    icon: Zap,
    slug: 'nutrition-diet',
    description: 'Share food habits and diet choices to support research on nutrition, energy, and healthy eating patterns.',
  },
  {
    name: 'Mental Health',
    icon: Cog,
    slug: 'mental-health',
    description: 'Contribute to studies focused on mood, stress, focus, and emotional well-being in everyday life.',
  },
  {
    name: 'Chronic Conditions',
    icon: Building2,
    slug: 'chronic-conditions',
    description: 'Help researchers understand long-term health conditions, symptoms, treatment routines, and daily care experiences.',
  },
  {
    name: 'Sleep & Recovery',
    icon: Dna,
    slug: 'sleep-recovery',
    description: 'Track sleep patterns and recovery habits to help improve rest quality and overall health.',
  },
  {
    name: 'General Health Studies',
    icon: Atom,
    slug: 'general-health-studies',
    description: 'Take part in diverse experiments covering broader health topics and community-driven research.',
  },
];

const LabCategories = () => (
  <section id="labs" className="scroll-mt-24 bg-white py-16 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45 }}
        className="text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">EXPERIMENT CATEGORIES</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Explore Health Research Areas
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          Discover experiments across different health domains. Choose an area that matches your interests and contribute to meaningful research.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: 0.05 * i, duration: 0.4 }}
            >
              <Link
                to={`/experiments?area=${encodeURIComponent(cat.slug)}`}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-6 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-cardHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md ring-4 ring-blue-600/10 transition group-hover:scale-105 group-hover:bg-blue-700">
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{cat.name}</h3>
                <p className="mt-2 flex-1 text-sm text-slate-600">
                  {cat.description}
                </p>
                <span className="mt-4 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  Browse experiments →
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default LabCategories;
