import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import { FlaskConical, Users, Eye } from 'lucide-react';

function useAnimatedNumber(target, options = {}) {
  const { duration = 2 } = options;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return undefined;
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, target, duration]);

  return { ref, value };
}

const stats = [
  {
    label: 'Registered Users',
    end: 12500,
    icon: Eye,
    format: (n) => `${n.toLocaleString()}+`,
  },
  {
    label: 'Experiments Conducted',
    end: 3200,
    icon: Users,
    format: (n) => `${n.toLocaleString()}+`,
  },
  {
    label: 'Research Reviews Submitted',
    end: 850,
    icon: FlaskConical,
    format: (n) => `${n.toLocaleString()}+`,
  },
];

const StatisticsSection = () => (
  <section className="border-t border-slate-200 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 py-14 text-white sm:py-16">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300/90">HEALTHLAB OVERVIEW</p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Our Platform Impact</h2>
      </motion.div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return <StatCard key={s.label} stat={s} Icon={Icon} index={i} />;
        })}
      </div>
    </div>
  </section>
);

function StatCard({ stat, Icon, index }) {
  const { ref, value } = useAnimatedNumber(stat.end, { duration: 2.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 * index, duration: 0.45 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-lg backdrop-blur-sm"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{stat.format(value)}</p>
      <p className="mt-2 text-sm font-medium text-blue-100/85">{stat.label}</p>
    </motion.div>
  );
}

export default StatisticsSection;
