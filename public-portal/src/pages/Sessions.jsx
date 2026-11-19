import PageSkeleton from '../components/PageSkeleton';
import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Download, Calendar, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from '../components/v11/Pagination';
import { useLanguage } from '../context/LanguageContext';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    setLoading(true);
    api.getSessions({ page, limit: 10 })
      .then((res) => {
        setSessions(res?.docs || res?.data || (Array.isArray(res) ? res : []));
        setPageCount(res?.pages || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const minutesOrigin = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

  return (
    <div className="container v11-page-pad">
      <nav aria-label={t('ariaBreadcrumb')} className="v11-crumbs">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t('sessionsTitle')}</span>
      </nav>

      <header className="v11-page-head">
        <h1>{t('sessionsTitle')}</h1>
        <p>{t('sessionsLede')}</p>
      </header>

      {loading ? (
        <PageSkeleton variant="sessions" label={t('loadingSessions')} />
      ) : sessions.length === 0 ? (
        <p className="v11-empty">{t('noSessions')}</p>
      ) : (
        <div className="v11-records v11-records-spaced">
          {sessions.map((session) => (
            <article className="v11-record v11-record-block" key={session._id}>
              <span className="v11-record-meta v11-record-date">
                <Calendar size={15} aria-hidden="true" />
                {new Date(session.date).toLocaleDateString(undefined, {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
              <h2 className="v11-record-title">{session.title}</h2>

              {session.itemsDiscussed?.length > 0 ? (
                <div className="v11-session-items">
                  <h3>{t('keyItemsDiscussed')}</h3>
                  <ul>
                    {session.itemsDiscussed.map((item) => (
                      <li key={item._id}>
                        <Link to={`/document/${item._id}`} className="v11-link">
                          <strong>{item.number || t('unnumbered')}:</strong> {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="v11-record-note">{t('sessionNoLinkedDocs')}</p>
              )}

              <span className="v11-record-aside">
                {session.status === 'Final' ? (
                  <>
                    <a
                      href={`${minutesOrigin}/api/public/minutes/${session._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="v11-btn v11-btn-quiet v11-btn-sm"
                    >
                      <Eye size={15} aria-hidden="true" /> {t('viewPdf')}
                    </a>
                    <a
                      href={`${minutesOrigin}/api/public/minutes/${session._id}?download=true`}
                      className="v11-btn v11-btn-primary v11-btn-sm"
                    >
                      <Download size={15} aria-hidden="true" /> {t('downloadMinutes')}
                    </a>
                  </>
                ) : (
                  <span className="v11-tag">{t('minutesNotPublished')}</span>
                )}
              </span>
            </article>
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
