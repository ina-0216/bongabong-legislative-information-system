import PageSkeleton from '../components/PageSkeleton';
import { useState, useEffect, useCallback } from 'react';
import { mediaUrl, api, cloudinaryPdfDownloadUrl, createPdfFilename, publicDocumentPdfUrl } from '../utils/api';
import { Link, useSearchParams } from 'react-router-dom';
import TermSidebarLayout from '../components/TermSidebarLayout';
import SelectField from '../components/v11/SelectField';
import Pagination from '../components/v11/Pagination';
import { useLanguage } from '../context/LanguageContext';
import { getDocumentSponsorNames } from '../utils/documentDisplay';
import { FileText, Download, Search, AlertTriangle } from 'lucide-react';

const ORDINANCE_STATUSES = [
  'First Reading', 'Committee Assignment', 'Committee Hearing',
  'Public Consultation', 'Second Reading', 'Third Reading',
  "For Mayor's Signature", 'For SP Review', 'Approved'
];
const RESOLUTION_STATUSES = [
  'First Reading', 'Committee Assignment', 'Third Reading',
  "For Mayor's Signature", 'Approved'
];

const statusTagClass = (status) => {
  if (status === 'Approved') return 'status-done';
  if (status === 'Public Consultation') return 'status-open';
  return 'status-progress';
};

export default function Ordinances() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || (searchParams.has('search') ? 'All' : 'Ordinance');
  const requestedStatus = searchParams.get('status');
  const initialStatuses = initialType === 'Resolution' ? RESOLUTION_STATUSES : ORDINANCE_STATUSES;

  const [docs, setDocs] = useState([]);
  const [terms, setTerms] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState(
    initialStatuses.includes(requestedStatus) ? requestedStatus : 'All'
  );
  const [committee, setCommittee] = useState(searchParams.get('committee') || '');
  const [type, setType] = useState(initialType);
  const [page, setPage] = useState(1);
  const [activeTermId, setActiveTermId] = useState(searchParams.get('termId') || null);
  const { t, language } = useLanguage();

  const activeStatuses = type === 'Resolution' ? RESOLUTION_STATUSES : ORDINANCE_STATUSES;

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setPage(1);
  }, [searchParams]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      let currentTerms = terms;
      if (currentTerms.length === 0) {
        const termsData = await api.getTerms();
        setTerms(termsData);
        currentTerms = termsData;
      }

      let resolvedTermId = activeTermId;
      if (!resolvedTermId && currentTerms.length > 0) {
        const currentTerm = currentTerms.find((t) => t.isCurrent);
        resolvedTermId = currentTerm?._id;
        if (resolvedTermId) setActiveTermId(resolvedTermId);
      }

      const fetchType = type === 'All' ? '' : type;
      const data = await api.getDocuments({
        search,
        type: fetchType,
        status,
        page,
        limit: 10,
        termId: resolvedTermId,
        ...(committee ? { committee } : {}),
      });
      setDocs(Array.isArray(data?.docs) ? data.docs : []);
      setPageCount(Number.isFinite(data?.pages) ? data.pages : 0);
    } catch (err) {
      console.error(err);
      setDocs([]);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  }, [terms, activeTermId, search, type, status, page, committee]);

  useEffect(() => {
    const loadCommittees = async () => {
      try {
        const termsData = await api.getTerms();
        const currentTerm = termsData.find((t) => t.isCurrent);
        if (currentTerm) {
          const termId = currentTerm._id;
          const committeeData = await api.getCommittees({ termId });
          setCommittees(committeeData.docs || committeeData);
        }
      } catch { /* the filter simply stays empty */ }
    };
    loadCommittees();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchDocs(), 300);
    return () => clearTimeout(timer);
  }, [fetchDocs]);

  const handleSearch = (event) => {
    event.preventDefault();
    const normalizedSearch = search.trim();
    setSearch(normalizedSearch);
    setPage(1);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('type', type);
      if (normalizedSearch) next.set('search', normalizedSearch);
      else next.delete('search');
      return next;
    });
  };

  return (
    <TermSidebarLayout
      title={t('recordsPageTitle')}
      description={t('recordsArchiveLede')}
      breadcrumbs={[{ label: t('ordinancesCrumb') }]}
      terms={terms}
      activeTermId={activeTermId}
      onTermChange={(id) => { setActiveTermId(id); setPage(1); }}
    >
      <div className="v11-stack">
        <section className="v11-filters" aria-label={t('ariaSearchFilterRecords')}>
          <form onSubmit={handleSearch} className="v11-filter-form">
            <div className="v11-field v11-field-grow">
              <label className="v11-field-label" htmlFor="keyword-search">{t('searchRecords')}</label>
              <div className="v11-input-row">
                <Search size={17} aria-hidden="true" />
                <input
                  id="keyword-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t('searchRecordsPlaceholder')}
                  type="search"
                />
              </div>
            </div>
            <button type="submit" className="v11-btn v11-btn-primary">{t('searchAction')}</button>
          </form>

          <div className="v11-filter-controls">
            <div className="v11-toggle" role="group" aria-label={t('ariaDocumentType')}>
              {['All', 'Ordinance', 'Resolution'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setType(option); setPage(1); }}
                  aria-pressed={type === option}
                  className={type === option ? 'active' : ''}
                >
                  {option === 'All' ? t('allShort') : `${option}s`}
                </button>
              ))}
            </div>

            <SelectField
              id="filter-committee"
              label={t('filterCommitteeLabel')}
              allLabel={t('allCommittees')}
              value={committee}
              onValueChange={(next) => { setCommittee(next); setPage(1); }}
              options={committees
                .map((c) => ({ value: c.name || c.committeeName || '', label: c.name || c.committeeName || '' }))
                .filter((c) => c.value)}
            />
            <SelectField
              id="filter-status"
              label={t('filterStatusLabel')}
              allLabel={t('allStatuses')}
              value={status === 'All' ? '' : status}
              onValueChange={(next) => { setStatus(next || 'All'); setPage(1); }}
              options={activeStatuses}
            />
          </div>
        </section>

        <section className="v11-band" aria-label={t('ariaRecordsList')}>
          <div className="container">
            {loading ? (
              <PageSkeleton variant="records" label={t('loadingRecords')} />
            ) : docs.length === 0 ? (
              <p className="v11-empty">{t('noRecordsMatch')}</p>
            ) : (
              <div className="v11-records">
                {docs.map((doc) => {
                  const summary = language === 'tl' && doc.plainLanguageSummary_tl
                    ? doc.plainLanguageSummary_tl
                    : doc.plainLanguageSummary;
                  const sponsors = getDocumentSponsorNames(doc);
                  return (
                  <article className="v11-record" key={doc._id}>
                    <span className="v11-record-num">{doc.number || '—'}</span>
                    <Link to={`/document/${doc._id}`} className="v11-record-title">
                      {doc.title}
                    </Link>
                    <span className="v11-record-meta">
                      {summary || t('noSummaryAvailable')}
                    </span>
                    <span className="v11-record-extra">
                      {sponsors.length ? sponsors.join(', ') : null}
                      {sponsors.length ? ' · ' : null}
                      {new Date(doc.filedAt || doc.createdAt).toLocaleDateString()}
                      {doc.sectorTag ? <span className="v11-tag">{doc.sectorTag}</span> : null}
                    </span>
                    {/* Actions stay visible. They were previously revealed
                        on hover only, which hid them from keyboard users. */}
                    <span className="v11-record-aside">
                      {doc.amendedByOrdinanceId && (
                        <span className="v11-tag v11-tag--amended" title={t('amendedMeasureTitle')}>
                          <AlertTriangle size={11} aria-hidden="true" /> {t('amendedLabel')}
                        </span>
                      )}
                      {doc.status && <span className={`v11-tag ${statusTagClass(doc.status)}`}>{doc.status}</span>}
                      <Link to={`/document/${doc._id}`} className="v11-icon-btn" aria-label={t('ariaViewDetailsFor', { title: doc.title })}>
                        <FileText size={17} aria-hidden="true" />
                      </Link>
                      <a
                        href={doc.pdfUrl
                          ? cloudinaryPdfDownloadUrl(mediaUrl(doc.pdfUrl), createPdfFilename(doc.type, doc.number, doc.title))
                          : publicDocumentPdfUrl(doc._id, true)}
                        download={createPdfFilename(doc.type, doc.number, doc.title)}
                        className="v11-icon-btn"
                        aria-label={t('ariaDownloadPdfFor', { title: doc.title })}
                      >
                        <Download size={17} aria-hidden="true" />
                      </a>
                    </span>
                  </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </TermSidebarLayout>
  );
}
