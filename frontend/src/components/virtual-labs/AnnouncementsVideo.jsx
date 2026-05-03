import React from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Play } from 'lucide-react';

const announcements = [
  {
    title: 'New Experiments Launched',
    body: 'Discover newly published health experiments and start participating to contribute your data and insights.',
  },
  {
    title: 'Research Funding Open',
    body: 'Support ongoing health studies by contributing to funding campaigns initiated by researchers.',
  },
  {
    title: 'Latest Research Updates',
    body: 'Explore recently published findings and experiment results shared by researchers on the platform.',
  },
  {
    title: 'Community Highlights',
    body: 'See trending discussions, user contributions, and active communities within HealthLab.',
  },
  {
    title: 'Participation Milestones',
    body: 'Track how user contributions are helping advance real-world health research.',
  },
];

/** Replace with your official HealthLab overview embed ID */
const YOUTUBE_EMBED_ID = 'M7lc1UVf-VE';

const AnnouncementsVideo = () => (
  <section className="bg-[#e6f2ff] py-16 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-stretch">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col rounded-2xl border border-blue-100 bg-white p-6 shadow-card sm:p-8"
        >
          <div className="flex items-center gap-2 text-blue-900">
            <Megaphone className="h-5 w-5" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Announcements</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Stay updated with the latest experiments, funding opportunities, and community activities on HealthLab.
          </p>
          <ul className="mt-6 space-y-4">
            {announcements.map((a) => (
              <li
                key={a.title}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-blue-200 hover:bg-white"
              >
                <p className="font-semibold text-slate-900">{a.title}</p>
                <p className="mt-1 text-sm text-slate-600">{a.body}</p>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-card"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">HealthLab Overview</h2>
            <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              <Play className="h-3 w-3 fill-current" aria-hidden />
              Video
            </span>
          </div>
          <div className="relative aspect-video w-full bg-slate-900">
            <iframe
              title="HealthLab introductory video"
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${YOUTUBE_EMBED_ID}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <p className="px-6 py-3 text-xs text-slate-500">
            Watch how HealthLab connects participants, researchers, and communities through real-world health studies.
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

export default AnnouncementsVideo;
