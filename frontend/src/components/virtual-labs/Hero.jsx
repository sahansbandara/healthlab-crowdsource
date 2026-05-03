import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getCurrentUser } from '../../api/auth';
import heroBackground from '../../assets/images/Virtual Experiments.png';

const heroContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const Hero = () => {
  const user = getCurrentUser();

  return (
    <section
      id="top"
      className="relative isolate flex min-h-[90dvh] w-full min-w-0 flex-col overflow-hidden bg-slate-950 sm:min-h-[115vh] lg:min-h-[130vh]"
      aria-labelledby="vl-hero-heading"
    >
      <div
        className="absolute inset-0 min-h-full w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(115deg, rgba(15,23,42,0.92) 0%, rgba(30,58,138,0.82) 45%, rgba(6,78,59,0.55) 100%), url(${heroBackground})`,
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-center px-5 py-28 sm:px-8 sm:py-36 lg:px-12 lg:py-44 -translate-y-16 sm:-translate-y-20 lg:-translate-y-28">
        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="visible"
          className="max-w-5xl"
        >
          <motion.div custom={0} variants={fadeUp} className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-white/20 backdrop-blur-sm sm:text-sm sm:px-5 sm:py-2">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Research Experiment Platform
          </motion.div>
          <motion.h1
            id="vl-hero-heading"
            custom={1}
            variants={fadeUp}
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            Manage and Participate in Experiments Anytime, Anywhere
          </motion.h1>
          <motion.p
            custom={2}
            variants={fadeUp}
            className="mt-6 max-w-3xl text-base leading-relaxed text-blue-100/90 sm:text-lg lg:text-xl"
          >
            Create, manage, and participate in research experiments with ease. Track progress, submit daily logs, and analyze results through a secure and user-friendly platform.
          </motion.p>
          <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/experiments"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore Virtual Experiments
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to={user ? '/my-studies' : '/login'}
              className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {user ? 'My Studies' : 'Get Started'}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
