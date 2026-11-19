import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';


// Home is eager: it is the landing route. Archive and directory pages load on demand.
const DocumentDetail = lazy(() => import('./pages/DocumentDetail'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const Members = lazy(() => import('./pages/Members'));
const Ordinances = lazy(() => import('./pages/Ordinances'));
const Resolutions = lazy(() => import('./pages/Resolutions'));
const Sessions = lazy(() => import('./pages/Sessions'));
const About = lazy(() => import('./pages/About'));
const Committees = lazy(() => import('./pages/Committees'));
const News = lazy(() => import('./pages/News'));
const MissionVision = lazy(() => import('./pages/MissionVision'));

function RouteFallback() {
  const { t } = useLanguage();
  return <div className="container v11-page-pad"><p className="v11-empty">{t('loadingShort')}</p></div>;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

/**
 * Split out of App so the skip link can read its label from the catalogue. It
 * must render inside LanguageProvider, and App's own body deliberately does not.
 */
function AppShell() {
  const { t } = useLanguage();
  return (
      // LazyMotion loads only the DOM animation features actually used, which
      // keeps most of framer-motion out of the entry chunk. `strict` makes any
      // stray `motion.*` component throw rather than silently pull the full
      // bundle back in. Every animated element uses `m` from framer-motion.
      <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
      <Router>
        <ScrollToTop />
        <div className="app-container">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-white focus:px-3 focus:py-2">{t('skipToMainContent')}</a>
        <Navbar />
          <main id="main-content" className="main-content">
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/ordinances" element={<Ordinances />} />
              <Route path="/resolutions" element={<Resolutions />} />
              <Route path="/document/:id" element={<DocumentDetail />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/members" element={<Members />} />
              <Route path="/committees" element={<Committees />} />
              <Route path="/tourism" element={<Navigate to="/" replace />} />
              <Route path="/about" element={<About />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:id" element={<NewsDetail />} />
              <Route path="/mission-vision" element={<MissionVision />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
      </LazyMotion>
      </MotionConfig>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}

export default App;
