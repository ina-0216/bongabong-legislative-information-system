import PageSkeleton from '../components/PageSkeleton';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowRight, Newspaper, Search, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import groupPhoto from '../assets/bongabong-sb-group.jpg';
import heroBg from '../assets/municipal-building.jpg';
import bongabongSeal from '../assets/bongabong-seal.png';
import { officialCouncilPortrait } from '../utils/officialCouncilPortraits';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const formatSessionDate = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  return payload.data || payload.docs || payload.sessions || [];
};

const mediaUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const origin = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
};

const memberName = (member) => member.name || [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ') || 'SB Member';

const statusTag = (status) => {
  if (status === 'Approved') return 'status-done';
  if (status === 'Public Consultation') return 'status-open';
  return 'status-progress';
};

const fade = (reduceMotion) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' },
});

export default function Home() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [stats, setStats] = useState({ totalOrdinances: 0, totalResolutions: 0, approvedOrdinances: 0, approvedResolutions: 0, inConsultation: 0 });
  const [recentDocs, setRecentDocs] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [news, setNews] = useState([]);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [query, setQuery] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    Promise.allSettled([
      api.getStats().then(setStats),
      api.getDocuments({ limit: 5, page: 1 }).then((data) => setRecentDocs(toArray(data))),
      api.getDocuments({ status: 'Public Consultation', limit: 3, page: 1 }).then((data) => setConsultations(toArray(data))),
      api.getNews({ limit: 4, page: 1 }).then((data) => setNews(toArray(data))),
      api.getSessions().then((data) => setSessions(toArray(data).slice(0, 4))),
      api.getTerms().then((terms) => {
        const list = toArray(terms);
        // Fall back to a year-range match when the server response predates
        // the `isCurrent` virtual, so the council band still populates.
        const current = list.find((term) => term.isCurrent)
          || list.find((term) => Number.isInteger(term.startYear) && Number.isInteger(term.endYear)
            && new Date().getFullYear() >= term.startYear && new Date().getFullYear() <= term.endYear);
        if (!current) return setMembers([]);
        return api.getMembers({ termId: current._id }).then((data) => setMembers(toArray(data)));
      }).catch(() => setMembers([])),
    ]).then((results) => setDataError(results.some((result) => result.status === 'rejected')))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const term = query.trim();
    navigate(`/ordinances${term ? `?search=${encodeURIComponent(term)}` : ''}`);
  };

  const orderedMembers = [...members].sort((a, b) => {
    const aIsPresiding = /vice mayor|presiding/i.test(a.position || '');
    const bIsPresiding = /vice mayor|presiding/i.test(b.position || '');
    return Number(bIsPresiding) - Number(aIsPresiding);
  });

  const statValue = (value) => (loading ? '—' : value || 0);

  return (
    <m.div
      className="v11-page"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
    >
      {/* 1. Hero */}
      <m.section
        {...fade(reduceMotion)}
        className="v11-band v11-hero dark"
        aria-labelledby="home-title"
        style={{
          position: 'relative',
          backgroundImage: `linear-gradient(90deg, color-mix(in srgb, var(--v11-navy-2) 76%, transparent) 0%, color-mix(in srgb, var(--v11-navy-2) 62%, transparent) 56%, color-mix(in srgb, var(--v11-navy-2) 38%, transparent) 100%), url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <figure
          className="v11-hero-emblem"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '52px',
            right: '24px',
            width: '70px',
            height: '70px',
            zIndex: 0,
          }}
        >
          <img src={bongabongSeal} alt="" width="70" height="70" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </figure>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <p className="v11-kicker">{t('officialPublicRecord')}</p>
          <h1 id="home-title">{t('heroHeadline')}</h1>
          <p className="v11-hero-lede">
            {t('heroLede')}
          </p>
          <div className="v11-hero-actions">
            <Link to="/ordinances" className="v11-btn v11-btn-primary">{t('exploreRecord')} <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/news" className="v11-btn v11-btn-on-dark">{t('whatsNew')} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <p className="v11-hero-note"><ShieldCheck size={17} aria-hidden="true" /> {t('heroByline')}</p>
        </div>
      </m.section>

      {/* 2. Counts */}
      <m.section {...fade(reduceMotion)} className="v11-band v11-stats-band" aria-label={t('ariaArchiveAtAGlance')}>
        <div className="container">
          {loading ? <PageSkeleton variant="stats" rows={5} label={t('loadingRecords')} /> : (
            <dl className="v11-stats">
              <div className="v11-stat"><dt>{t('approvedOrdinances')}</dt><dd>{statValue(stats.approvedOrdinances)}</dd></div>
              <div className="v11-stat"><dt>{t('approvedResolutions')}</dt><dd>{statValue(stats.approvedResolutions)}</dd></div>
              <div className="v11-stat"><dt>{t('ordinancesRecorded')}</dt><dd>{statValue(stats.totalOrdinances)}</dd></div>
              <div className="v11-stat"><dt>{t('resolutionsRecorded')}</dt><dd>{statValue(stats.totalResolutions)}</dd></div>
              <div className="v11-stat"><dt>{t('openForCommentCount')}</dt><dd>{stats.inConsultation === undefined ? '—' : stats.inConsultation}</dd></div>
            </dl>
          )}
        </div>
      </m.section>

      {dataError && (
        <div className="container v11-notice-wrap">
          <div className="v11-notice" role="status">
            <strong>{t('civicDataUnavailable')}</strong>
            <span>{t('liveDataBlurb')}</span>
          </div>
        </div>
      )}

      {/* 3. Council — photography is legitimate here, never on a record */}
      <m.section {...fade(reduceMotion)} className="v11-band alt v11-council-band" id="council" aria-labelledby="council-title">
        <div className="container">
          <div className="v11-bandhead">
            <h2 id="council-title">{t('councilHeading')}</h2>
            <p>{t('councilBlurb')}</p>
          </div>
          <div className="v11-council">
            <figure className="v11-figure">
              <img src={groupPhoto} alt={t('councilGroupCaption')} />
              <figcaption>{t('councilGroupCaption')}</figcaption>
            </figure>
            <div className="v11-seats">
              {loading && <PageSkeleton variant="seats" rows={11} label={t('loadingCouncilMembers')} />}
              {!loading && !members.length && <p className="v11-empty">{t('noMembersYet')}</p>}
              {orderedMembers.map((member) => {
                const portrait = officialCouncilPortrait(member);
                const initials = memberName(member).split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
                return (
                  <Link to="/members" className="v11-seat" key={member._id}>
                    {portrait ? <img src={portrait} alt="" aria-hidden="true" /> : (
                      <span className="v11-seat-initials" aria-hidden="true">{initials}</span>
                    )}
                    <span className="v11-seat-body">
                      <strong>{memberName(member)}</strong>
                      <span>{member.position || t('sbMemberRole')}</span>
                    </span>
                  </Link>
                );
              })}
              <Link to="/members" className="v11-link v11-seats-more">{t('seeFullMemberProfiles')} <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </m.section>

      {/* 4. News and sessions share a balanced desktop row. */}
      <m.div {...fade(reduceMotion)} className="v11-band v11-home-pair-band" data-home-pair="news-sessions">
        <div className="container v11-home-pair v11-home-news-sessions">
          <section className="v11-home-pair-panel v11-home-news" id="news" aria-labelledby="news-title">
            <div className="v11-bandhead">
              {/* Matches every other band head in this page: h2 is the section
                  name, the paragraph is the blurb. The blurb was previously the
                  h2 and the section name was a kicker, which inverted the
                  hierarchy and put the least important line in the document
                  outline. No other band carries a kicker, so keeping one here
                  would also make this band structurally inconsistent. */}
              <h2 id="news-title">{t('newsAndUpdates')}</h2>
              <p>{t('newsBlurb')}</p>
              <p>{t('informationalOnly')}</p>
            </div>
            {news.length ? (
              <div className="v11-news">
                {news[0] && (
                  <Link to={`/news/${news[0]._id}`} className="v11-news-lead">
                    <figure className="v11-figure">
                      {news[0].coverImage
                        ? <img src={mediaUrl(news[0].coverImage)} alt="" />
                        : <span className="v11-news-placeholder" aria-hidden="true"><Newspaper size={38} strokeWidth={1.4} /></span>}
                    </figure>
                    <span className="v11-news-lead-body">
                      <span className="v11-news-lead-meta">
                        <span className="v11-tag">{news[0].category || t('publicUpdate')}</span>
                        <time dateTime={news[0].publishedAt || news[0].createdAt}>{formatDate(news[0].publishedAt || news[0].createdAt)}</time>
                      </span>
                      <h3>{news[0].title}</h3>
                      {news[0].excerpt && <span className="v11-news-excerpt">{news[0].excerpt}</span>}
                      {news[0].author && <span className="v11-news-author">{news[0].author}</span>}
                      <span className="v11-link v11-news-read">{t('readFullReport')} <ArrowRight size={15} aria-hidden="true" /></span>
                    </span>
                  </Link>
                )}
                <div className="v11-news-list">
                  {news.slice(1).map((item) => (
                    <Link to={`/news/${item._id}`} className="v11-news-item" key={item._id}>
                      <h3>{item.title}</h3>
                      <span className="v11-tag">{item.category || t('publicUpdate')}</span>
                      {item.excerpt && <p>{item.excerpt}</p>}
                      <time dateTime={item.publishedAt || item.createdAt}>{formatDate(item.publishedAt || item.createdAt)}</time>
                    </Link>
                  ))}
                  <Link to="/news" className="v11-link">{t('viewAllUpdates')} <ArrowRight size={15} aria-hidden="true" /></Link>
                </div>
              </div>
            ) : (
              loading ? <PageSkeleton variant="homeNews" rows={3} label={t('loadingUpdates')} /> : <p className="v11-empty">{t('noUpdatesYet')}</p>
            )}
          </section>

          <section className="v11-home-pair-panel v11-home-session" id="sessions" aria-labelledby="sessions-title">
            <div className="v11-bandhead">
              <h2 id="sessions-title">{t('sessions')}</h2>
              <p>{t('sessionsBlurb')}</p>
            </div>
            {sessions.length ? (
              <div className="v11-sessions">
                {sessions.map((session, index) => (
                  <div className="v11-session" key={session._id || index}>
                    <span className="v11-session-date">{formatSessionDate(session.sessionDate || session.date)}</span>
                    <strong>{session.title || t('regularSession')}</strong>
                    <span className="v11-session-place">{session.location || session.venue || t('sessionVenueFallback')}</span>
                  </div>
                ))}
              </div>
            ) : (
              loading ? <PageSkeleton variant="sessions" rows={2} label={t('loadingSessions')} /> : <p className="v11-empty-dark">{t('noSessionsScheduled')}</p>
            )}
            <p className="v11-cta-row">
              <Link to="/sessions" className="v11-btn v11-btn-on-dark">{t('seePublicCalendar')} <ArrowRight size={16} aria-hidden="true" /></Link>
            </p>
          </section>
        </div>
      </m.div>

      {/* 5. Open for comment and latest records share a desktop row. */}
      <m.div {...fade(reduceMotion)} className="v11-band alt v11-home-pair-band" data-home-pair="consultation-records">
        <div className="container v11-home-pair v11-home-records-consultation">
          <section className="v11-home-pair-panel v11-home-consultation" id="consultation" aria-labelledby="consult-title">
            <div className="v11-bandhead">
              <h2 id="consult-title">{t('openForComment')}</h2>
              <p>{t('openBlurb')}</p>
            </div>
            {consultations.length ? (
              <div className="v11-records">
                {consultations.map((doc) => (
                  <Link to={`/document/${doc._id}`} className="v11-record" key={doc._id}>
                    <span className="v11-record-num">{doc.number || t('unnumbered')}</span>
                    <span className="v11-record-title">{doc.title}</span>
                    <span className="v11-record-meta">{doc.committee || t('sangguniangBayanSignature')} · {formatDate(doc.createdAt)}</span>
                    <span className="v11-record-aside"><span className="v11-tag status-open">{doc.status}</span></span>
                  </Link>
                ))}
              </div>
            ) : (
              loading ? <PageSkeleton variant="records" rows={2} label={t('loadingConsultations')} /> : <p className="v11-empty">{t('noOpenConsultations')}</p>
            )}
            <p className="v11-cta-row">
              <Link to="/ordinances?type=Ordinance&status=Public%20Consultation" className="v11-btn v11-btn-primary">{t('seeOpenConsultations')} <ArrowRight size={16} aria-hidden="true" /></Link>
            </p>
          </section>

          {/* Latest records — typographic rows, no photography. */}
          <section className="v11-home-pair-panel v11-home-records" id="records" aria-labelledby="records-title">
            <div className="v11-bandhead">
              <p className="v11-kicker">{t('decisions')}</p>
              <h2 id="records-title">{t('latestRecords')}</h2>
              <p>{t('recordsBlurb')}</p>
            </div>
            {recentDocs.length ? (
              <div className="v11-records">
                {recentDocs.map((doc) => (
                  <Link to={`/document/${doc._id}`} className="v11-record" key={doc._id}>
                    <span className="v11-record-num">{doc.number || t('unnumbered')}</span>
                    <span className="v11-record-title">{doc.title}</span>
                    <span className="v11-record-meta">{doc.committee || t('sangguniangBayanSignature')} · {formatDate(doc.createdAt)}</span>
                    <span className="v11-record-aside">
                      {doc.status && <span className={`v11-tag ${statusTag(doc.status)}`}>{doc.status}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              loading ? <PageSkeleton variant="records" rows={3} label={t('loadingRecords')} /> : <p className="v11-empty">{t('noRecordsPublished')}</p>
            )}
            <p className="v11-cta-row">
              <Link to="/ordinances" className="v11-link v11-home-records-archive-link">{t('viewFullArchive')} <ArrowRight size={15} aria-hidden="true" /></Link>
            </p>
          </section>
        </div>
      </m.div>

      {/* 8. Help */}
      <m.section {...fade(reduceMotion)} className="v11-band alt" id="help" aria-labelledby="help-title">
        <div className="container v11-help">
          <div>
            <h2 id="help-title">{t('findRecord')}</h2>
            <p>{t('findRecordBlurb')}</p>
          </div>
          <form className="v11-search" onSubmit={handleSearchSubmit} role="search">
            <label className="v11-search-label" htmlFor="home-search">{t('searchArchive')}</label>
            <div className="v11-search-row">
              <Search size={18} aria-hidden="true" />
              <input
                id="home-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
              />
              <button type="submit" className="v11-btn v11-btn-primary">{t('search')}</button>
            </div>
          </form>
        </div>
      </m.section>
    </m.div>
  );
}
