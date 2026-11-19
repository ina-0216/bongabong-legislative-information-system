import PageSkeleton from '../components/PageSkeleton';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mediaUrl, api } from '../utils/api';
import { ArrowRight, CalendarDays, Clock, MapPin, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const stripHtml = (html) => (html ? String(html).replace(/<[^>]*>/g, '') : '');

export default function News() {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentSession, setRecentSession] = useState(null);
  const [query, setQuery] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    api.getNews({ limit: 50 })
      .then((res) => setNews(res?.data || res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    api.getRecentSessions()
      .then((sessions) => setRecentSession(sessions?.[0] || null))
      .catch(() => setRecentSession(null));
  }, []);

  const featured = news[0] || null;
  const rest = news.slice(1);

  const handleSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    navigate(`/ordinances${term ? `?search=${encodeURIComponent(term)}` : ''}`);
  };

  return (
    <div className="container v11-page-pad">
      <nav aria-label={t('ariaBreadcrumb')} className="v11-crumbs">
        <ol className="v11-crumb-list">
          <li><Link to="/">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">News &amp; updates</li>
        </ol>
      </nav>

      <header className="v11-page-head">
        <h1>{t('newsTitle')}</h1>
        <p>{t('newsLede')}</p>
      </header>

      <div className="v11-news-layout">
        <div className="v11-news-main">
          {loading ? (
            <PageSkeleton variant="article" rows={4} label={t('loadingUpdates')} />
          ) : news.length === 0 ? (
            <p className="v11-empty">{t('noUpdatesYet')}</p>
          ) : (
            <>
              {featured && (
                <article className="v11-feature">
                  {featured.coverImage && (
                    <div className="v11-figure v11-feature-figure">
                      <img src={mediaUrl(featured.coverImage)} alt="" />
                    </div>
                  )}
                  <div className="v11-feature-body">
                    <p className="v11-feature-meta">
                      <span className="v11-tag">{featured.category || t('featuredBulletin')}</span>
                      <time dateTime={featured.publishedAt || featured.createdAt}>
                        {formatDate(featured.publishedAt || featured.createdAt)}
                      </time>
                      <span>{t('legislativeOffice')}</span>
                    </p>
                    <h2>{featured.title}</h2>
                    <p>
                      {featured.excerpt || `${stripHtml(featured.content).slice(0, 200)}…`}
                    </p>
                    <Link to={`/news/${featured._id}`} className="v11-link v11-feature-link">
                      {t('readFullReport')} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )}

              <h2 className="v11-subhead">{t('latestUpdates')}</h2>
              <div className="v11-news-cards">
                {rest.map((item) => (
                  <article className="v11-news-card" key={item._id}>
                    <p className="v11-feature-meta">
                      <span className="v11-tag">{item.category || 'News'}</span>
                      <time dateTime={item.publishedAt || item.createdAt}>
                        {formatDate(item.publishedAt || item.createdAt)}
                      </time>
                    </p>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt || `${stripHtml(item.content).slice(0, 100)}…`}</p>
                    <Link to={`/news/${item._id}`} className="v11-link v11-news-card-link">
                      {t('viewDetails')} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="v11-news-aside" aria-label={t('ariaArchiveShortcuts')}>
          <section className="v11-panel">
            <h3>{t('categories')}</h3>
            <ul className="v11-counts">
<li><Link to="/ordinances"><span>{t('ordinances')}</span><b>{stats?.totalOrdinances ?? 0}</b></Link></li>
                <li><Link to="/resolutions"><span>{t('resolutions')}</span><b>{stats?.totalResolutions ?? 0}</b></Link></li>
              <li><Link to="/ordinances?status=Public%20Consultation"><span>{t('publicHearings')}</span><b>{stats?.inConsultation ?? 0}</b></Link></li>
              <li><Link to="/news"><span>{t('announcements')}</span><b>{news.length}</b></Link></li>
            </ul>
          </section>

          <section className="v11-panel v11-next-session">
            <h3>{t('nextSession')}</h3>
            <p className="v11-next-date">
              <CalendarDays size={17} aria-hidden="true" />
              {recentSession?.date ? new Date(recentSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : t('toBeAnnounced')}
            </p>
            <p className="v11-next-line">
              <Clock size={15} aria-hidden="true" />
              {recentSession?.date ? new Date(recentSession.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
            </p>
            <p className="v11-next-line"><MapPin size={15} aria-hidden="true" /> {t('sessionHall')}</p>
            <p className="v11-next-title">{recentSession?.title || t('regularSession')}</p>
            <Link to="/sessions" className="v11-btn v11-btn-quiet v11-btn-sm v11-btn-block">
              {t('viewFullCalendar')}
            </Link>
          </section>

          <section className="v11-panel">
            <h3>{t('searchArchives')}</h3>
            <form className="v11-panel-stack" onSubmit={handleSearch} role="search">
              <label className="v11-field-label" htmlFor="archive-search">{t('searchTerms')}</label>
              <div className="v11-input-row">
                <Search size={16} aria-hidden="true" />
                <input
                  id="archive-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('searchKeywordsPlaceholder')}
                />
              </div>
              <button type="submit" className="v11-btn v11-btn-primary v11-btn-block">{t('searchAction')}</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}