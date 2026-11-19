import PageSkeleton from '../components/PageSkeleton';
import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { api, mediaUrl, cloudinaryPdfDownloadUrl, createPdfFilename, publicDocumentPdfUrl, publicSessionMinutesUrl } from '../utils/api';
import LegislativeTimeline from '../components/LegislativeTimeline';
import VoteChart from '../components/VoteChart';
import GuestForm from '../components/GuestForm';
import { useLanguage } from '../context/LanguageContext';
import { getDocumentSponsorNames } from '../utils/documentDisplay';
import { ThumbsUp, ThumbsDown, Minus, MessageSquare, User, FileText, Download, Eye, AlertTriangle, ArrowRight } from 'lucide-react';

const VOTE_TAG = {
  Agree: { className: 'status-done', Icon: ThumbsUp },
  Disagree: { className: 'status-open', Icon: ThumbsDown },
  Neutral: { className: 'status-progress', Icon: Minus },
  None: { className: '', Icon: MessageSquare },
};

const formatLongDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

export default function DocumentDetail() {
  const { id } = useParams();
  const [, setSearchParams] = useSearchParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [publicFeedback, setPublicFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [hasFeedbackError, setHasFeedbackError] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    api.getDocumentDetail(id)
      .then((document) => {
        setDoc(document);
        setSearchParams((current) => {
          if (current.get('type') === document.type) return current;
          const next = new URLSearchParams(current);
          next.set('type', document.type);
          return next;
        }, { replace: true });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, setSearchParams]);

  useEffect(() => {
    if (tab === 'comments') {
      setFeedbackLoading(true);
      api.getPublicFeedback(id)
        .then(setPublicFeedback)
        .catch((err) => {
          console.error('[DocumentDetail] Failed to load public feedback:', err);
          setPublicFeedback([]);
          setHasFeedbackError(true);
        })
        .finally(() => setFeedbackLoading(false));
    }
  }, [tab, id]);

  if (loading) {
    return <div className="container v11-page-pad"><PageSkeleton variant="detail" label={t('loadingDocument')} /></div>;
  }

  if (!doc) {
    return (
      <div className="container v11-page-pad v11-notfound">
        <FileText size={40} aria-hidden="true" />
        <p>{t('documentNotFound')}</p>
        <Link to="/ordinances" className="v11-link">← {t('backToArchive')}</Link>
      </div>
    );
  }

  const isOrdinance = doc.type === 'Ordinance';
  const sponsorNames = getDocumentSponsorNames(doc);
  const officialPdfUrl = doc.pdfUrl ? mediaUrl(doc.pdfUrl) : publicDocumentPdfUrl(doc._id);
  const officialPdfDownloadUrl = doc.pdfUrl
    ? cloudinaryPdfDownloadUrl(officialPdfUrl, createPdfFilename(doc.type, doc.number, doc.title))
    : publicDocumentPdfUrl(doc._id, true);

  // Every tab label resolves from the catalogue. A `t('key') || 'English'`
  // fallback would be a silent untranslated-string generator if a key were ever
  // dropped, so the fallback is deliberately absent and the audit enforces it.
  const tabs = [
    { key: 'overview', label: t('overview') },
    ...(doc.sessions?.length > 0 ? [{ key: 'sessions', label: t('sessionHistory') }] : []),
    ...(isOrdinance
      ? [
          { key: 'comments', label: t('publicComments') },
          {
            key: 'consultation',
            label: doc.status === 'Public Consultation'
              ? t('publicConsultation')
              : t('submitFeedback'),
          },
        ]
      : []),
  ];

  const statusTagClass = doc.status === 'Approved'
    ? 'status-done'
    : doc.status === 'Public Consultation' ? 'status-open' : 'status-progress';

  return (
    <div className="container v11-page-pad">
      <nav aria-label={t('ariaBreadcrumb')} className="v11-crumbs">
        <Link to="/">{t('breadcrumbHome')}</Link>
        <span aria-hidden="true">/</span>
        <Link to={isOrdinance ? '/ordinances' : '/resolutions'}>
          {t(isOrdinance ? 'ordinances' : 'resolutions')}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{doc.number || t('documentDetailCrumb')}</span>
      </nav>

      <header className="v11-doc-head">
        <div className="v11-doc-head-main">
          <h1>{doc.number || '—'}</h1>
          <p className="v11-doc-title">{doc.title}</p>
          {doc.title_tl && <p className="v11-doc-title-tl">({doc.title_tl})</p>}
        </div>
        <span className={`v11-tag ${statusTagClass}`}>{doc.status || t('inProgress')}</span>
      </header>

      {/* Amendment notice banners */}
      {doc.amendedByOrdinanceId && (
        <div
          role="alert"
          className="v11-amendment-notice v11-amendment-notice--amended"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {t('amendedNoticeLead')} <strong>{t('amendedNoticeVerb')}</strong> {t('amendedNoticeSuffix')}{' '}
            <Link to={`/document/${doc.amendedByOrdinanceId._id || doc.amendedByOrdinanceId}`} className="v11-link">
              {t('viewAmendedMeasure', { number: doc.amendedByOrdinanceId.number || t('newerVersion') })} <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </span>
        </div>
      )}
      {doc.amendsOrdinanceId && (
        <div
          role="note"
          className="v11-amendment-notice v11-amendment-notice--amends"
        >
          <ArrowRight size={16} aria-hidden="true" />
          <span>
            {t('amendsNoticeLead')} <strong>{t('amendsNoticeVerb')}</strong>{' '}
            <Link to={`/document/${doc.amendsOrdinanceId._id || doc.amendsOrdinanceId}`} className="v11-link">
              {doc.amendsOrdinanceId.number || t('earlierOrdinance')}
            </Link>
            {doc.amendsOrdinanceId.title
              ? t('amendedMeasureTitleSuffix', { title: doc.amendsOrdinanceId.title.replace(/ \(Original\)$/, '') })
              : '.'}
          </span>
        </div>
      )}

      <dl className="v11-facts">
        <div><dt>{t('dateFiled')}</dt><dd>{formatLongDate(doc.filedAt || doc.createdAt)}</dd></div>
        {sponsorNames.length > 0 && (
          <div><dt>{t('primarySponsor')}</dt><dd>{sponsorNames.join(', ')}</dd></div>
        )}
        {doc.committee && <div><dt>{t('committee')}</dt><dd>{doc.committee}</dd></div>}
        {doc.effectivityDate && (
          <div><dt>{t('effectivityDate')}</dt><dd>{formatLongDate(doc.effectivityDate)}</dd></div>
        )}
      </dl>

      <div className="v11-split">
        <div className="v11-split-main">
          {/* Radix Tabs replace the previous onClick buttons, which had no
              tablist/tabpanel semantics and no arrow-key navigation. */}
          <TabsPrimitive.Root value={tab} onValueChange={setTab} className="v11-tabs">
            <TabsPrimitive.List className="v11-tablist" aria-label={t('ariaDocumentSections')}>
              {tabs.map((item) => (
                <TabsPrimitive.Trigger className="v11-tab" value={item.key} key={item.key}>
                  {item.label}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

            <TabsPrimitive.Content className="v11-tabpanel" value="overview">
              <div className="v11-prose">
                <h3>{t('plainLanguageSummary')}</h3>
                <p className="v11-pre">
                  {(language === 'tl' && doc.plainLanguageSummary_tl)
                    ? doc.plainLanguageSummary_tl
                    : (doc.plainLanguageSummary || t('noSummaryAvailableDocument'))}
                </p>
              </div>
            </TabsPrimitive.Content>

            {doc.sessions?.length > 0 && (
              <TabsPrimitive.Content className="v11-tabpanel" value="sessions">
                <div className="v11-records">
                  {doc.sessions.map((session) => (
                    <div className="v11-record" key={session._id}>
                      <span className="v11-record-title">{session.title}</span>
                      <span className="v11-record-meta">{new Date(session.date).toLocaleDateString()}</span>
                      <span className="v11-record-aside">
                        {session.status === 'Final' && (
                          <a
                            href={publicSessionMinutesUrl(session._id)}
                            target="_blank"
                            rel="noreferrer"
                            className="v11-btn v11-btn-quiet v11-btn-sm"
                          >
                            <Eye size={15} aria-hidden="true" /> {t('viewMinutes')}
                          </a>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsPrimitive.Content>
            )}

            {isOrdinance && (
              <TabsPrimitive.Content className="v11-tabpanel" value="comments">
                <div className="v11-panel-head">
                  <h3>{t('publicComments')}</h3>
                  <span className="v11-tag">
                    {publicFeedback.length}{' '}
                    {t(publicFeedback.length === 1 ? 'approvedCommentOne' : 'approvedCommentMany')}
                  </span>
                </div>

                {feedbackLoading ? (
                  <PageSkeleton variant="comments" label={t('loadingComments')} />
                ) : hasFeedbackError ? (
                  <div className="v11-empty">
                    <MessageSquare size={32} aria-hidden="true" />
                    <p>{t('commentsLoadError')}</p>
                    <p>{t('commentsTryAgain')}</p>
                  </div>
                ) : publicFeedback.length === 0 ? (
                  <div className="v11-empty">
                    <MessageSquare size={32} aria-hidden="true" />
                    <p>{t('noCommentsYet')}</p>
                    <p>{t('commentsReviewedNotice')}</p>
                  </div>
                ) : (
                  <div className="v11-comments">
                    {publicFeedback.map((entry) => {
                      const vote = VOTE_TAG[entry.vote] || VOTE_TAG.None;
                      const VoteIcon = vote.Icon;
                      return (
                        <article className="v11-comment" key={entry._id || 'unknown-comment'}>
                          <div className="v11-comment-head">
                            <strong>{t('anonymousResident')}</strong>
                            <span className={`v11-tag ${vote.className}`}>
                              <VoteIcon size={12} aria-hidden="true" /> {entry.vote || 'None'}
                            </span>
                            {entry.sentiment && <span className="v11-tag">{entry.sentiment}</span>}
                          </div>
                          {entry.comment && <p>{entry.comment}</p>}
                          <time dateTime={entry.createdAt}>
                            {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </time>
                        </article>
                      );
                    })}
                  </div>
                )}
              </TabsPrimitive.Content>
            )}

            {isOrdinance && (
              <TabsPrimitive.Content className="v11-tabpanel" value="consultation">
                <div className="v11-consult">
                  <GuestForm
                    ordinanceId={doc._id}
                    ordinanceStatus={doc.status}
                    onSubmitted={async () => {
                      const updatedDocument = await api.getDocumentDetail(id);
                      setDoc(updatedDocument);
                    }}
                  />
                  <div>
                    <p className="v11-consult-count">
                      {t('publicSentiment')} <strong>{doc.totalVotes}</strong> {t('participants')}
                    </p>
                    <VoteChart tally={doc.tally} />
                  </div>
                </div>
              </TabsPrimitive.Content>
            )}
          </TabsPrimitive.Root>
        </div>

        <aside className="v11-split-aside" aria-label={t('ariaDocumentTools')}>
          <section className="v11-panel">
            <h3>{t('documents')}</h3>
            <div className="v11-panel-stack">
              <a href={officialPdfUrl} target="_blank" rel="noreferrer" className="v11-btn v11-btn-primary">
                <Eye size={16} aria-hidden="true" /> {t('viewPdf')}
              </a>
              <a
                href={officialPdfDownloadUrl}
                className="v11-btn v11-btn-quiet"
                download={createPdfFilename(doc.type, doc.number, doc.title)}
              >
                <Download size={16} aria-hidden="true" /> {t('downloadCopy')}
              </a>
            </div>
          </section>

          <section className="v11-panel">
            <h3>{t('legislativeProgress')}</h3>
            <LegislativeTimeline currentStatus={doc.status} isResolution={!isOrdinance} />
          </section>


          {isOrdinance && (
            <section className="v11-panel v11-panel-stack">
              <button type="button" className="v11-btn v11-btn-quiet" onClick={() => setTab('comments')}>
                <MessageSquare size={16} aria-hidden="true" /> {t('viewPublicComments')}
              </button>
              <button type="button" className="v11-btn v11-btn-quiet" onClick={() => setTab('consultation')}>
                <User size={16} aria-hidden="true" /> {t('submitFeedback')}
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
