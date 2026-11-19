import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FileText, Users,
  BarChart2, LogOut, Archive, Landmark,
  MessageSquareWarning, Calendar, UserCircle2, Megaphone, Settings2
} from 'lucide-react';
import UserAvatar from '../ui/UserAvatar';

const ROLE_NAV = {
  'System Admin': [
    { label: 'Dashboard',           icon: LayoutDashboard,      to: '/dashboard' },
    { label: 'Sessions',            icon: Archive,              to: '/sessions' },
    { label: 'Terms',               icon: Calendar,             to: '/terms' },
    { label: 'SB Members',          icon: Users,                to: '/sbmembers' },
    { label: 'Ordinances',          icon: FileText,             to: '/ordinances' },
    { label: 'Committees',          icon: Landmark,             to: '/committees' },
    { label: 'User Management',     icon: Users,                to: '/users' },
    { label: 'News & Announcements',icon: Megaphone,            to: '/news' },
    { label: 'PDF Header',           icon: Settings2,            to: '/pdf-header-settings' },
    { label: 'Consultation Review', icon: MessageSquareWarning, to: '/consultation-verification' },
    { label: 'Reports',             icon: BarChart2,            to: '/reports' },
  ],
  'Secretary': [
    { label: 'Dashboard',           icon: LayoutDashboard,      to: '/dashboard' },
    { label: 'Sessions',            icon: Archive,              to: '/sessions' },
    { label: 'Terms',               icon: Calendar,             to: '/terms' },
    { label: 'SB Members',          icon: Users,                to: '/sbmembers' },
    { label: 'Ordinances',          icon: FileText,             to: '/ordinances' },
    { label: 'Committees',          icon: Landmark,             to: '/committees' },
    { label: 'News & Announcements',icon: Megaphone,            to: '/news' },
    { label: 'Consultation Review', icon: MessageSquareWarning, to: '/consultation-verification' },
    { label: 'Reports',             icon: BarChart2,            to: '/reports' },
  ],
  'Vice Mayor': [
    { label: 'Dashboard',  icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Ordinances', icon: FileText,        to: '/ordinances' },
    { label: 'Committees', icon: Landmark,        to: '/committees' },
    { label: 'Reports',    icon: BarChart2,       to: '/reports' },
  ],
  'SB Member': [
    { label: 'Dashboard',  icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Ordinances', icon: FileText,        to: '/ordinances' },
    { label: 'Committees', icon: Landmark,        to: '/committees' },
    { label: 'Reports',    icon: BarChart2,       to: '/reports' },
  ],
};

export default function Sidebar({ expanded, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = ROLE_NAV[user?.role] || [];
  const isMobile = typeof window !== 'undefined' && (
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 767px)').matches
      : window.innerWidth < 768
  );

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleNavigate = () => {
    if (isMobile) onNavigate?.();
  };

  return (
    <>
    <aside
      id="primary-navigation"
      aria-label="Primary navigation"
      aria-hidden={!expanded}
      inert={!expanded ? true : undefined}
      className={`
        fixed top-0 left-0 h-screen w-[min(85vw,260px)] md:w-[260px] bg-sidebar text-sidebar-foreground
        flex flex-col z-50
        shadow-[2px_0_12px_rgba(0,0,0,0.04)]
        transition-transform duration-200 ease-out motion-reduce:transition-none overflow-hidden
        ${expanded ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-center gap-3 px-0 py-4 md:justify-start md:px-5">
        <img src="/bongabong-seal.png" alt="" aria-hidden="true" className="h-10 w-10 shrink-0 object-contain drop-shadow-sm" />
        <div className="overflow-hidden whitespace-nowrap leading-tight">
          <div className="text-[15px] font-bold tracking-wide text-sidebar-foreground">B-LIS</div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-sidebar-primary">SB Bongabong</div>
        </div>
      </div>

      {/* ── User card ────────────────────────────────── */}
      <div className="shrink-0 px-0 pt-4 pb-2 md:px-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
          <UserAvatar user={user} size={34} style={{ flexShrink: 0 }} />
          <div className="min-w-0 overflow-hidden">
            <div className="truncate text-[13px] font-semibold text-sidebar-foreground">{user?.name}</div>
            <div className="mt-1 inline-block rounded bg-sidebar-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
              {user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────── */}
      <nav aria-label="Main menu" className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2 py-2">
        <div className="px-2 pt-2 pb-2 text-[9px] font-bold uppercase tracking-[1.4px] text-sidebar-foreground/65">
          Navigation
        </div>

        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            onClick={handleNavigate}
            title={undefined}
            className={({ isActive }) =>
              `flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors mb-0.5
              ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        {/* Account section */}
        <div className="mt-2 pt-2">
          <div className="px-2 pt-2 pb-2 text-[9px] font-bold uppercase tracking-[1.4px] text-sidebar-foreground/65">
            Account
          </div>
          <NavLink
            to="/profile"
            onClick={handleNavigate}
            title={undefined}
            className={({ isActive }) =>
              `flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors mb-0.5
              ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`
            }
          >
            <UserCircle2 size={18} className="shrink-0" />
            <span className="truncate">Profile</span>
          </NavLink>
        </div>
      </nav>

      {/* ── Sign Out ─────────────────────────────────── */}
      <div className="shrink-0 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/12 hover:text-sidebar-foreground"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
    <aside
      aria-label="Collapsed navigation"
      aria-hidden={expanded}
      inert={expanded ? true : undefined}
      className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col bg-sidebar text-sidebar-foreground shadow-[2px_0_12px_rgba(0,0,0,0.04)] md:flex"
    >
      <div className="flex shrink-0 justify-center py-4">
        <img src="/bongabong-seal.png" alt="" aria-hidden="true" className="h-10 w-10 object-contain drop-shadow-sm" />
      </div>
      <div className="flex shrink-0 justify-center py-3">
        <div title={user?.name}><UserAvatar user={user} size={36} /></div>
      </div>
      <nav aria-label="Main menu" className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            title={item.label}
            className={({ isActive }) =>
              `flex justify-center rounded-lg px-0 py-2.5 text-[13px] font-medium transition-colors ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
          </NavLink>
        ))}
        <div className="mt-2 pt-2">
          <NavLink
            to="/profile"
            title="Profile"
            className={({ isActive }) =>
              `flex justify-center rounded-lg px-0 py-2.5 text-[13px] font-medium transition-colors ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`
            }
          >
            <UserCircle2 size={18} className="shrink-0" />
          </NavLink>
        </div>
      </nav>
      <div className="flex shrink-0 justify-center p-2">
        <button
          onClick={handleLogout}
          title="Sign Out"
          aria-label="Sign Out"
          className="flex justify-center rounded-lg bg-white/5 p-2.5 text-[13px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/12 hover:text-sidebar-foreground"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
    </>
  );
}
