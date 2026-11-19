import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

// Key names, not prose. Module scope cannot call t(); the component resolves
// each key at render time.
const CORE_VALUES = ['integrity', 'transparency', 'resilience', 'equity'];

const MISSION_POINTS = [
  'missionPoint1',
  'missionPoint2',
  'missionPoint3',
  'missionPoint4',
];

export default function MissionVision() {
  const { t } = useLanguage();
  return (
    <div className="container v11-page-pad">
      <nav aria-label={t('ariaBreadcrumb')} className="v11-crumbs">
        <ol className="v11-crumb-list">
          <li><Link to="/">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Vision &amp; mission</li>
        </ol>
      </nav>

      <header className="v11-page-head">
        <h1>{t('visionMissionTitle')}</h1>
        <p>{t('visionMissionLede')}</p>
      </header>

      <section className="v11-band dark v11-vision" aria-labelledby="vision-title">
        <div className="container">
          <h2 id="vision-title" className="v11-kicker">{t('municipalVision')}</h2>
          <blockquote>{t('municipalVisionStatement')}</blockquote>
        </div>
      </section>

      <div className="v11-two-col v11-two-col-top">
        <section className="v11-article" aria-labelledby="mission-title">
          <h2 id="mission-title" className="v11-article-title">{t('strategicMission')}</h2>
          <ul className="v11-ticks">
            {MISSION_POINTS.map((point) => <li key={point}>{t(point)}</li>)}
          </ul>
        </section>

        <section className="v11-article" aria-labelledby="values-title">
          <h2 id="values-title" className="v11-article-title">{t('corePrinciples')}</h2>
          <div className="v11-values">
            {CORE_VALUES.map((value) => (
              <div className="v11-value" key={value}>
                <h3>{t(`coreValue${value.charAt(0).toUpperCase()}${value.slice(1)}`)}</h3>
                <p>{t(`coreValue${value.charAt(0).toUpperCase()}${value.slice(1)}Desc`)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="v11-commitment" aria-labelledby="commitment-title">
        <h2 id="commitment-title" className="v11-article-title">{t('commitmentToPeople')}</h2>
        <p>{t('commitmentBody')}</p>
        <p className="v11-commitment-sign">{t('sangguniangBayanSignature')}</p>
      </section>
    </div>
  );
}