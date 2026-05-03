import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';

const links = [
  { label: 'Home', href: '/#top' },
  { label: 'About', href: '/#about' },
  { label: 'Labs', href: '/experiments', router: true },
  { label: 'Institutes', href: '/#institutes' },
  { label: 'Contact', href: '/#contact' },
];

const SiteNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/experiments?q=${encodeURIComponent(q)}`);
    else navigate('/experiments');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 border-b border-blue-900/30 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 transition-shadow duration-300',
        scrolled && 'shadow-lg shadow-blue-950/25'
      )}
      aria-label="Primary"
    >
      <div className="relative mx-auto w-full max-w-[90rem] px-5 py-4 sm:min-h-[68px] sm:py-3 sm:px-8 lg:min-h-[76px] lg:px-12">
        <Link
          to="/"
          className="mb-3 block text-center text-2xl font-extrabold tracking-tight text-white sm:absolute sm:left-8 sm:top-1/2 sm:mb-0 sm:-translate-y-1/2 lg:left-12"
        >
          HealthLab
        </Link>
        <ul
          className="mb-3 flex flex-wrap items-center justify-center gap-1 sm:mb-0 sm:absolute sm:left-1/2 sm:top-1/2 sm:z-10 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:gap-3"
          role="list"
        >
          {links.map(({ label, href, router }) => (
            <li key={label}>
              {router ? (
                <Link
                  to={href}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-blue-100/90 transition hover:bg-white/10 hover:text-white sm:text-base sm:py-3"
                >
                  {label}
                </Link>
              ) : (
                <a
                  href={href}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-blue-100/90 transition hover:bg-white/10 hover:text-white sm:text-base sm:py-3"
                >
                  {label}
                </a>
              )}
            </li>
          ))}
        </ul>
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto flex w-full max-w-md justify-center sm:absolute sm:right-6 sm:top-1/2 sm:z-20 sm:mx-0 sm:w-auto sm:-translate-y-1/2 lg:right-12"
          role="search"
          aria-label="Search labs"
        >
          <label htmlFor="vl-nav-search" className="sr-only">
            Search labs
          </label>
          <div className="relative flex w-full max-w-[280px] items-center sm:max-w-[320px]">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-blue-300/80"
              aria-hidden
            />
            <input
              id="vl-nav-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-blue-200/60 outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20 sm:h-11 sm:text-base"
            />
          </div>
        </form>
      </div>
    </nav>
  );
};

export default SiteNavbar;
