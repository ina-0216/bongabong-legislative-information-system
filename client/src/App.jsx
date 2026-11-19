import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageSkeleton from './components/ui/PageSkeleton';
import { ADMIN_ROLES, SECRETARY_ADMIN_ROLES, SYSTEM_ADMIN_ROLES } from './utils/routePermissions';

import Sidebar from './components/layouts/Sidebar';
import Topbar from './components/layouts/Topbar';

const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrdinanceList = lazy(() => import('./pages/OrdinanceList'));
const OrdinanceDetail = lazy(() => import('./pages/OrdinanceDetail'));
const EncodeOrdinance = lazy(() => import('./pages/EncodeOrdinance'));
const UsersList = lazy(() => import('./pages/UsersList'));
const ConsultationVerification = lazy(() => import('./pages/ConsultationVerification'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const Committees = lazy(() => import('./pages/Committees'));
const Sessions = lazy(() => import('./pages/Sessions'));
const SBMembers = lazy(() => import('./pages/SBMembers'));
const Terms = lazy(() => import('./pages/Terms'));
const NewsAdmin = lazy(() => import('./pages/NewsAdmin'));
const PdfHeaderSettings = lazy(() => import('./pages/PdfHeaderSettings'));


export function AdminLayout({ children }) {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    // Restore the sidebar state the user last chose, so the panel does not
    // snap back open on every visit.
    const persisted = localStorage.getItem('sidebarExpanded');
    if (persisted !== null) return persisted === 'true';
    return window.matchMedia('(min-width: 768px)').matches;
  });
  const menuButtonRef = useRef(null);
  const toggleSidebar = useCallback(() => setExpanded(v => !v), []);
  const closeMobileSidebar = useCallback(() => {
    setExpanded(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const persistSidebarState = () => {
      localStorage.setItem('sidebarExpanded', String(expanded));
    };
    window.addEventListener('beforeunload', persistSidebarState);
    return () => window.removeEventListener('beforeunload', persistSidebarState);
  }, [expanded]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const syncSidebarToViewport = (event) => setExpanded(event.matches);

    desktopQuery.addEventListener?.('change', syncSidebarToViewport);
    return () => desktopQuery.removeEventListener?.('change', syncSidebarToViewport);
  }, []);

  return (
    <div className="admin-shell flex min-h-screen bg-background overflow-x-hidden">
      {expanded && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}
      <Sidebar expanded={expanded} onNavigate={closeMobileSidebar} />

      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 ml-0 ${expanded ? 'md:ml-[260px]' : 'md:ml-16'}`}
      >
        <Topbar expanded={expanded} onToggleSidebar={toggleSidebar} menuButtonRef={menuButtonRef} />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md">Skip to main content</a>
        <main id="main-content" className="flex-1 p-4 sm:p-6 pt-[78px] sm:pt-[86px] w-full overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function PageLoading() {
  return <PageSkeleton variant="detail" />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoading />}>
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                <Route path="/" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminLayout><Navigate to="/dashboard" replace /></AdminLayout></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminLayout><ErrorBoundary><Dashboard /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute roles={SECRETARY_ADMIN_ROLES}><AdminLayout><ErrorBoundary><Sessions /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/ordinances" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminLayout><ErrorBoundary><OrdinanceList /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/ordinances/new" element={<ProtectedRoute roles={SECRETARY_ADMIN_ROLES}><AdminLayout><ErrorBoundary><EncodeOrdinance /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/ordinances/:id" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminLayout><ErrorBoundary><OrdinanceDetail /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/ordinances/:id/edit" element={<ProtectedRoute roles={SECRETARY_ADMIN_ROLES}><AdminLayout><ErrorBoundary><EncodeOrdinance /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute roles={SYSTEM_ADMIN_ROLES}><AdminLayout><ErrorBoundary><UsersList /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/consultation-verification" element={<ProtectedRoute roles={SECRETARY_ADMIN_ROLES}><AdminLayout><ErrorBoundary><ConsultationVerification /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminLayout><ErrorBoundary><Reports /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/committees" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminLayout><ErrorBoundary><Committees /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/sbmembers" element={<ProtectedRoute roles={SECRETARY_ADMIN_ROLES}><AdminLayout><ErrorBoundary><SBMembers /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/terms" element={<ProtectedRoute roles={SECRETARY_ADMIN_ROLES}><AdminLayout><ErrorBoundary><Terms /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/news" element={<ProtectedRoute roles={SECRETARY_ADMIN_ROLES}><AdminLayout><ErrorBoundary><NewsAdmin /></ErrorBoundary></AdminLayout></ProtectedRoute>} />
                <Route path="/pdf-header-settings" element={<ProtectedRoute roles={SYSTEM_ADMIN_ROLES}><AdminLayout><ErrorBoundary><PdfHeaderSettings /></ErrorBoundary></AdminLayout></ProtectedRoute>} />

                <Route path="/profile" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminLayout><ErrorBoundary><Profile /></ErrorBoundary></AdminLayout></ProtectedRoute>} />

                <Route path="/unauthorized" element={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-center p-8 bg-card border border-border rounded-xl shadow-xs max-w-sm">
                      <h2 className="text-lg font-bold text-foreground mb-2">Access Denied</h2>
                      <p className="text-sm text-muted-foreground mb-6">You do not have permission to view this page.</p>
                      <a href="/login" className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90">Return to Login</a>
                    </div>
                  </div>
                } />
                <Route path="*" element={<ProtectedRoute roles={ADMIN_ROLES}><Navigate to="/dashboard" replace /></ProtectedRoute>} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
