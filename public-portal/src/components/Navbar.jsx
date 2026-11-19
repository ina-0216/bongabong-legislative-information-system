import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import bongabongSeal from '../assets/bongabong-seal.png';
import DownloadModal from './DownloadModal';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { language, toggle, t } = useLanguage();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', key: 'home' },
    { to: '/ordinances', key: 'ordinanceNav' },
    { to: '/resolutions', key: 'resolutions' },
    { to: '/sessions', key: 'sessions' },
    { to: '/committees', key: 'committees' },
    { to: '/members', key: 'members' },
    { to: '/news', key: 'newsNav' },
    { to: '/about', key: 'about' },
  ].map((link) => ({ ...link, label: t(link.key) }));

  const detailType = location.pathname.startsWith('/document/')
    ? new URLSearchParams(location.search).get('type')
    : null;
  const isActive = (path) => {
    if (path === '/ordinances' && detailType === 'Ordinance') return true;
    if (path === '/resolutions' && detailType === 'Resolution') return true;
    if (path === '/about' && location.pathname === '/mission-vision') return true;
    return path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <header className="portal-nav v11-masthead" role="banner">
      <div className="portal-notice-strip">
        {t('officialService')} · Bongabong, Oriental Mindoro <span>·</span> {t('openParticipation')}
      </div>

      <div className="portal-nav-inner">
        <Link to="/" className="portal-brand" aria-label={t('ariaBrandHome')}>
          <img className="brand-seal" src={bongabongSeal} alt="" aria-hidden="true" />
          <span>
            <strong>B-LIS</strong>
            <small>{t('sbFullName')}</small>
          </span>
        </Link>

        <nav className="portal-nav-links" aria-label={t('ariaMainNav')}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={isActive(link.to) ? 'active' : ''}
              aria-current={isActive(link.to) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="portal-nav-actions">
          <DownloadModal triggerClassName="v11-btn v11-btn-primary gap-2 px-3 py-2 max-[480px]:px-2" />
          <button
            type="button"
            className="v11-lang-toggle"
            onClick={toggle}
            lang={language === 'en' ? 'tl' : 'en'}
            aria-label={t('switchLanguage')}
          >
            {language === 'en' ? 'FL' : 'EN'}
          </button>

          {/* Radix Dialog supplies the focus trap, Escape handling and
              aria-expanded wiring the previous boolean toggle lacked. */}
          <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Trigger asChild>
              <button className="portal-menu-button" aria-label={t('openNavigation')}>
                <Menu size={21} aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="v11-sheet-overlay" />
              <Dialog.Content className="v11-sheet" aria-label={t('navigate')}>
                <div className="v11-sheet-head">
                  <Dialog.Title className="v11-sheet-title">{t('navigate')}</Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="v11-sheet-close" aria-label={t('closeNavigation')}>
                      <X size={20} aria-hidden="true" />
                    </button>
                  </Dialog.Close>
                </div>
                <nav className="v11-sheet-nav">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={isActive(link.to) ? 'active' : ''}
                      aria-current={isActive(link.to) ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
