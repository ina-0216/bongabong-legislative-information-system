import NotificationPanel from '../features/NotificationPanel';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard':                  { title: 'Dashboard',           subtitle: 'Overview of the legislative platform' },
  '/ordinances':                 { title: 'Ordinances',          subtitle: 'Track and manage all legislative items' },
  '/ordinances/new':             { title: 'Encode Ordinance',    subtitle: 'Draft and submit a new ordinance' },
  '/users':                      { title: 'User Management',     subtitle: 'Manage SB officials and system accounts' },
  '/reports':                    { title: 'Reports',             subtitle: 'Generate and download official PDF reports' },
  '/profile':                    { title: 'My Profile',          subtitle: 'Manage your account information' },
  '/sessions':                   { title: 'Sessions',            subtitle: 'Manage legislative sessions and minutes' },
  '/terms':                      { title: 'Terms',               subtitle: 'Manage legislative terms and periods' },
  '/sbmembers':                  { title: 'SB Members',          subtitle: 'Manage Sangguniang Bayan Members' },
  '/committees':                 { title: 'Committees',          subtitle: 'Manage legislative committees' },
  '/consultation-verification':  { title: 'Consultation Review', subtitle: 'Verify and review public consultations' },
};

export default function Topbar({ expanded, onToggleSidebar, menuButtonRef }) {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const info = PAGE_TITLES[base] || PAGE_TITLES[pathname] || { title: 'B-LIS', subtitle: '' };

  return (
    <header
      className={`fixed top-0 right-0 h-[62px] bg-[var(--ibosys-surface-primary)] border-b border-[var(--ibosys-border-default)] flex items-center justify-between px-3 sm:px-4 z-30 shadow-[0_1px_6px_rgba(0,0,0,0.06)] left-0 ${expanded ? 'md:left-[260px]' : 'md:left-16'}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Single hamburger — the only toggle trigger */}
        <button
          ref={menuButtonRef}
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0"
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label="Toggle sidebar"
          aria-expanded={expanded}
          aria-controls="primary-navigation"
        >
          <Menu size={19} />
        </button>

        <div className="h-5 w-px bg-border shrink-0" />

        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-foreground leading-tight truncate">{info.title}</div>
          {info.subtitle && (
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate hidden sm:block">{info.subtitle}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        <NotificationPanel />
      </div>
    </header>
  );
}
