import PageSkeleton from '../components/PageSkeleton';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Search } from 'lucide-react';
import TermSidebarLayout from '../components/TermSidebarLayout';
import { useLanguage } from '../context/LanguageContext';

export default function Committees() {
  const [committees, setCommittees] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const [activeTermId, setActiveTermId] = useState(searchParams.get('termId') || null);
  const { t } = useLanguage();

  const fetchCommittees = useCallback(async () => {
    setLoading(true);
    try {
      let currentTerms = terms;
      if (currentTerms.length === 0) {
        const termsData = await api.getTerms();
        setTerms(termsData);
        currentTerms = termsData;
      }

      let currentTermId = activeTermId;
      if (!currentTermId && currentTerms.length > 0) {
        const activeTerm = currentTerms.find((t) => t.isCurrent);
        currentTermId = activeTerm?._id;
        if (currentTermId) setActiveTermId(currentTermId);
      }

      if (currentTermId) {
        const data = await api.getCommittees({ termId: currentTermId });
        setCommittees(Array.isArray(data) ? data : data?.docs || []);
      } else {
        setCommittees([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTermId, terms]);

  useEffect(() => {
    fetchCommittees();
  }, [activeTermId, fetchCommittees]);

  const needle = search.trim().toLowerCase();
  const filtered = committees.filter((c) =>
    !needle ||
    c.name?.toLowerCase().includes(needle) ||
    c.chairperson?.toLowerCase().includes(needle) ||
    c.viceChairperson?.toLowerCase().includes(needle)
  );

  return (
    <TermSidebarLayout
      title={t('committeesTitle')}
      description={t('committeesLede')}
      breadcrumbs={[{ label: t('committeeMembersCrumb') }]}
      terms={terms}
      activeTermId={activeTermId}
      onTermChange={(id) => setActiveTermId(id)}
    >
      <div className="v11-stack">
        <div className="v11-filters">
          <div className="v11-field v11-field-grow">
            <label className="v11-field-label" htmlFor="committee-search">{t('searchDirectory')}</label>
            <div className="v11-input-row">
              <Search size={17} aria-hidden="true" />
              <input
                id="committee-search"
                type="search"
                placeholder={t('committeesSearchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <PageSkeleton variant="committees" label={t('loadingCommittees')} />
        ) : filtered.length === 0 ? (
          <p className="v11-empty">
            {search ? t('noCommitteesMatch', { search }) : t('noCommitteesFound')}
          </p>
        ) : (
          <div className="v11-committee-grid">
            {filtered.map((committee) => (
              <article className="v11-committee" key={committee._id}>
                <div className="v11-committee-head">
                  <h2>{committee.name}</h2>
                  <span className="v11-tag">{t('standingCommittee')}</span>
                  {committee.description && <p>{committee.description}</p>}
                </div>

                <dl className="v11-committee-body">
                  <div>
                    <dt>{t('chairperson')}</dt>
                    <dd>{committee.chairperson || t('toBeDesignated')}</dd>
                  </div>
                  {committee.viceChairperson && (
                    <div>
                      <dt>{t('viceChairperson')}</dt>
                      <dd>{committee.viceChairperson}</dd>
                    </div>
                  )}
                  {committee.members?.length > 0 && (
                    <div>
                      <dt>{t('committeeMembersLabel')}</dt>
                      <dd className="v11-committee-members">{committee.members.join(' · ')}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </TermSidebarLayout>
  );
}
