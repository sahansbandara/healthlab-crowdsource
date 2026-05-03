import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import ExperimentShowcase from './components/ExperimentShowcase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import RecommendationPage from './pages/RecommendationPage';
import ResearchReviews from './pages/ResearchReviews';
import MyStudies from './pages/MyStudies';
import StudyDashboardStyled from './pages/StudyDashboardStyled';
import AdminDashboard from './pages/AdminDashboard';
import ResearcherExperiments from './pages/ResearcherExperiments';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import FundRequests from './pages/FundRequests';
import OpenFundRequests from './pages/OpenFundRequests';
import MyContributions from './pages/MyContributions';
import ResearcherWallet from './pages/ResearcherWallet';
import ResearcherWalletDetail from './pages/ResearcherWalletDetail';
import { getCurrentUser, logoutUser } from './api/auth';
import { SiteNavbar } from './components/virtual-labs';

const AppHeader = ({ user, handleLogout }) => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-blue-900/30 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 px-6 py-4 transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-blue-950/25' : ''}`}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div className="text-2xl font-extrabold tracking-tight text-white">HealthLab</div>
      <nav className="flex flex-wrap items-center justify-center gap-2">
        <Link to="/" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Home</Link>
        <Link to="/experiments" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/experiments' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Experiments</Link>
        <Link to="/community" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/community' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Community</Link>
        <Link to="/fund" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/fund' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Fund</Link>
        <Link to="/recommended" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/recommended' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Recommended</Link>
        <Link to="/my-studies" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/my-studies' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>My Studies</Link>
        {user && (user.role || '').toLowerCase() === 'researcher' && (
          <Link to="/researcher/experiments" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/researcher/experiments' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>My Experiments</Link>
        )}
        {user && (user.role || '').toLowerCase() === 'researcher' && (
          <Link to="/researcher/reviews" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/researcher/reviews' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Research Reviews</Link>
        )}
        {user && (user.role || '').toLowerCase() === 'admin' && (
          <Link to="/admin" className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location.pathname === '/admin' ? 'bg-red-500/20 text-red-100' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Admin Dashboard</Link>
        )}
      </nav>
      <div className="flex justify-end">
        {user ? (
          <button type="button" className="ml-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-blue-100/90 transition hover:bg-white/10 hover:text-white" onClick={handleLogout}>
            Logout ({user.name ? user.name.split(' ')[0] : 'User'})
          </button>
        ) : (
          <Link to="/login" className={`ml-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-medium transition ${location.pathname === '/login' ? 'bg-white/10 text-white' : 'text-blue-100/90 hover:bg-white/10 hover:text-white'}`}>Login</Link>
        )}
      </div>
      </div>
    </header>
  );
};

function App() {
  const [user, setUser] = useState(getCurrentUser());
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    setUser(getCurrentUser());
  }, [location]);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const researcherSoftPageBg =
    location.pathname === '/researcher/experiments' ||
    location.pathname === '/researcher/reviews';
  const experimentsShowcasePage =
    location.pathname === '/experiments' ||
    location.pathname === '/community' ||
    location.pathname === '/fund' ||
    location.pathname === '/my-contributions';

  const Layout = ({ children }) => (
    <div className={`flex min-h-screen flex-col text-slate-900 antialiased ${experimentsShowcasePage ? 'bg-[linear-gradient(180deg,#edf6ff_0%,#dbeafe_45%,#c8dcfb_100%)]' : 'bg-[#e6f2ff]'}`}>
      {!isHomePage && <AppHeader user={user} handleLogout={handleLogout} />}
      <main
        className={`main-content${researcherSoftPageBg ? ' main-content--researcher-soft' : ''}${isHomePage ? ' main-content--home' : ''}`}
      >
        {children}
      </main>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={<div className="min-h-screen bg-[#e6f2ff] text-slate-900 antialiased"><SiteNavbar /><Login /></div>} />
      <Route path="/signup" element={<div className="min-h-screen bg-[#e6f2ff] text-slate-900 antialiased"><SiteNavbar /><Signup /></div>} />
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/experiments" element={<Layout><ExperimentShowcase /></Layout>} />
      <Route path="/community" element={<Layout><Community /></Layout>} />
      <Route path="/community/:id" element={<Layout><PostDetail /></Layout>} />
      <Route path="/fund" element={<Layout><OpenFundRequests /></Layout>} />
      <Route path="/recommended" element={<Layout><RecommendationPage /></Layout>} />

      {user && (user.role || '').toLowerCase() === 'researcher' && (
        <Route path="/researcher/reviews" element={<Layout><ResearchReviews /></Layout>} />
      )}

      {user && (user.role || '').toLowerCase() === 'researcher' && (
        <Route path="/fund-requests" element={<Layout><FundRequests /></Layout>} />
      )}

      {user && (user.role || '').toLowerCase() === 'researcher' && (
        <Route path="/researcher/wallet" element={<Layout><ResearcherWallet /></Layout>} />
      )}

      {user && (user.role || '').toLowerCase() === 'researcher' && (
        <Route path="/researcher/wallet/:experimentId" element={<Layout><ResearcherWalletDetail /></Layout>} />
      )}

      <Route path="/my-studies" element={<Layout><MyStudies /></Layout>} />
      <Route path="/my-contributions" element={<Layout><MyContributions /></Layout>} />
      <Route path="/dashboard/:participationId" element={<Layout><StudyDashboardStyled /></Layout>} />
      <Route path="/researcher/experiments" element={<Layout><ResearcherExperiments /></Layout>} />

      {user && (user.role || '').toLowerCase() === 'admin' && (
        <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
      )}
    </Routes>
  );
}

export default App;
