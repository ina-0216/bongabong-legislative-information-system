import { Link } from 'react-router-dom';
import { Mail, MapPin, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import bongabongSeal from '../assets/bongabong-seal.png';
import DownloadModal from './DownloadModal';

const footerLinkKeys = [
  { to: '/ordinances', key: 'ordinances' },
  { to: '/resolutions', key: 'resolutions' },
  { to: '/sessions', key: 'sessions' },
  { to: '/committees', key: 'committees' },
  { to: '/members', key: 'members' },
  { to: '/news', key: 'news' },
  { to: '/about', key: 'about' },
  { to: '/mission-vision', key: 'missionVisionTitle' },
];

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="portal-footer v11-footer" role="contentinfo">
      <div className="container portal-footer-grid">
        <div className="portal-footer-brand">
          <img className="portal-footer-seal" src={bongabongSeal} alt="" aria-hidden="true" />
          <div>
            <p className="portal-footer-title">B-LIS</p>
            <p className="portal-footer-subtitle">{t('footerTagline')}</p>
            <div className="mt-4">
              <DownloadModal triggerClassName="v11-btn v11-btn-primary gap-2 px-3 py-2" />
            </div>
          </div>
        </div>

        <div>
          <p className="portal-footer-label">{t('exploreTheRecord')}</p>
          <nav className="portal-footer-links" aria-label={t('ariaFooterNav')}>
            {footerLinkKeys.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.key ? t(link.key) : link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="portal-footer-contact">
          <p className="portal-footer-label">{t('publicInfoDesk')}</p>
          <p><MapPin size={15} aria-hidden="true" /> Municipal Hall, Bongabong</p>
          <a href="mailto:info@bongabong.gov.ph"><Mail size={15} aria-hidden="true" /> info@bongabong.gov.ph</a>
          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> {t('officialUpdates')}</a>
        </div>
      </div>
      <div className="container portal-footer-bottom">
        <span>© {new Date().getFullYear()} Municipality of Bongabong. All rights reserved.</span>
        <span>Integrated Barangay Ordinances &amp; Sessions System</span>
      </div>
    </footer>
  );
}
