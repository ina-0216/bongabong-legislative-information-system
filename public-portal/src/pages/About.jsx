import { Users, MapPin, MessageCircle, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import bongabongSeal from '../assets/bongabong-seal.png';

// Key names, not prose. The array is module scope so it cannot call t(); the
// component resolves each key at render time.
const PROCESS = [
  { key: 'firstReading' },
  { key: 'committeeHearing' },
  { key: 'secondThirdReading' },
  { key: 'approval' },
];

export default function About() {
  const { t } = useLanguage();
  return (
    <div className="container v11-page-pad">
      <nav aria-label={t('ariaBreadcrumb')} className="v11-crumbs">
<Link to="/">{t('breadcrumbHome')}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t('breadcrumbAbout')}</span>
      </nav>

      <header className="v11-page-head">
        <h1>{t('aboutTitle')}</h1>
        <p>{t('aboutLede')}</p>
      </header>

      <div className="v11-articles">
        <section className="v11-article v11-article-row" aria-labelledby="seal-title">
          <img className="v11-seal" src={bongabongSeal} alt={t('officialSeal')} />
          <div className="v11-prose">
            <h2 id="seal-title" className="v11-article-title"><Flag size={20} aria-hidden="true" /> {t('officialSeal')}</h2>
            <p>{t('sealBodyP1')}</p>
            <p>{t('sealBodyP2')}</p>
          </div>
        </section>

        <section className="v11-article" aria-labelledby="body-title">
          <h2 id="body-title" className="v11-article-title"><Users size={20} aria-hidden="true" /> {t('legislativeBody')}</h2>
          <div className="v11-two-col">
            <div className="v11-prose">
              <p>{t('legislativeBodyP1')}</p>
              <p>{t('legislativeBodyP2')}</p>
            </div>
            {/*
              Deliberately always-Tagalog. This column pairs with the prose beside
              it to show the same statement in both languages on one screen, so it
              must not flip with the language toggle. Its own keys carry Tagalog
              in both catalogue blocks; routing it through the generic prose keys
              would make the two columns identical in either language.
            */}
            <div className="v11-quote v11-prose">
              <p>{t('legislativeBodyQuote1')}</p>
              <p>{t('legislativeBodyQuote2')}</p>
            </div>
          </div>
        </section>

        <section className="v11-article" aria-labelledby="process-title">
          <h2 id="process-title" className="v11-article-title">{t('legislativeProcess')}</h2>
          <p className="v11-article-lede">{t('howMeasureBecomesLaw')}</p>
          <ol className="v11-steps">
            {PROCESS.map((step, index) => (
              <li className="v11-step" key={step.key}>
                <span className="v11-step-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{t(`${step.key}Title`)}</h3>
                  <p>{t(`${step.key}Desc`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="v11-article v11-contact" aria-labelledby="contact-title">
          <MapPin size={30} aria-hidden="true" className="v11-contact-icon" />
          <h2 id="contact-title" className="v11-article-title v11-contact-title">{t('contactUs')}</h2>
          <p className="v11-contact-line">Sangguniang Bayan Office</p>
          <p className="v11-contact-line">Municipal Hall, Poblacion, Bongabong</p>
          <p className="v11-contact-line">Oriental Mindoro, Philippines 5211</p>
          <a href="mailto:sangguniangbayan@bongabong.gov.ph" className="v11-contact-mail">
            sangguniangbayan@bongabong.gov.ph
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="v11-btn v11-btn-primary">
            <MessageCircle size={17} aria-hidden="true" /> {t('followUsFacebook')}
          </a>
        </section>
      </div>
    </div>
  );
}
