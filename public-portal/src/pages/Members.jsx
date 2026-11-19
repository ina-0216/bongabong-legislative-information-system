import PageSkeleton from '../components/PageSkeleton';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useSearchParams } from 'react-router-dom';
import { Mail, MessageCircle } from 'lucide-react';
import TermSidebarLayout from '../components/TermSidebarLayout';
import { useLanguage } from '../context/LanguageContext';
import { officialCouncilPortrait } from '../utils/officialCouncilPortraits';

const ROLE_LABEL_KEYS = {
  Chair: 'committeeChairRole',
  'Vice Chair': 'committeeViceChairRole',
  Member: 'committeeMemberRole',
};

function Biography({ text, t, officer = false }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = text.length > 220;

  return (
    <div className={officer ? 'v11-officer-biography-wrap' : 'v11-member-biography-wrap'}>
      <p className={`${officer ? 'v11-officer-biography' : 'v11-member-biography'}${collapsible && !expanded ? ' is-clamped' : ''}`}>
        {text}
      </p>
      {collapsible && (
        <button
          type="button"
          className="v11-bio-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {t(expanded ? 'hideFullBiography' : 'readFullBiography')}
        </button>
      )}
    </div>
  );
}

function CommitteeAssignments({ roles, t }) {
  if (!roles.length) return null;

  const groups = ['Chair', 'Vice Chair', 'Member']
    .map((role) => ({ role, assignments: roles.filter((item) => item.role === role) }))
    .filter((group) => group.assignments.length > 0);

  return (
    <details className="v11-member-assignments">
      <summary>{t('viewAllCommitteeAssignments', { count: roles.length })}</summary>
      <div className="v11-member-assignment-groups">
        {groups.map(({ role, assignments }) => (
          <section key={role} aria-label={t(ROLE_LABEL_KEYS[role])}>
            <h4>{t(ROLE_LABEL_KEYS[role])}</h4>
            <ul>
              {assignments.map(({ committeeName }) => <li key={committeeName}>{committeeName}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTermId, setActiveTermId] = useState(searchParams.get('termId') || null);
  const { t, language } = useLanguage();

  const fetchMembersAndTerms = useCallback(async () => {
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

      if (!resolvedTermId) {
        setMembers([]);
        return;
      }
      const membersData = await api.getMembers({ termId: resolvedTermId });
      setMembers(Array.isArray(membersData) ? membersData : membersData?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTermId, terms]);

  useEffect(() => {
    fetchMembersAndTerms();
  }, [activeTermId, fetchMembersAndTerms]);

  const activeTerm = terms.find((t) => t._id === activeTermId) || terms.find((t) => t.isCurrent);

  const presidingOfficer = members.find(
    (m) => m.position?.toLowerCase().includes('vice mayor') || m.position?.toLowerCase().includes('presiding')
  );
  const regularMembers = members.filter((m) => m !== presidingOfficer);

  const formatMemberName = (member) => {
    const name = member?.name || [member?.firstName, member?.middleName, member?.lastName].filter(Boolean).join(' ');
    if (!name) return 'Councilor';
    return name.startsWith('Hon.') ? name : `Hon. ${name}`;
  };

  const initials = (member) =>
    formatMemberName(member)
      .replace('Hon.', '')
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  const getCommitteeAssignments = (member) => {
    const assignments = Array.isArray(member?.committees) ? member.committees : [];
    return [...new Set(assignments
      .map((assignment) => typeof assignment === 'string' ? assignment.trim() : assignment?.name?.trim())
      .filter(Boolean))];
  };

  const getCommitteeRoles = (member) => {
    if (Array.isArray(member?.committeeRoles) && member.committeeRoles.length > 0) {
      const seen = new Set();
      return member.committeeRoles.filter(({ committeeName, role }) => {
        const key = `${role}:${committeeName}`;
        if (!committeeName || !ROLE_LABEL_KEYS[role] || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const assignments = getCommitteeAssignments(member).map((committeeName) => ({ committeeName, role: 'Member' }));
    if (member?.committee && !assignments.some(({ committeeName }) => committeeName === member.committee)) {
      assignments.unshift({ committeeName: member.committee, role: 'Chair' });
    }
    return assignments;
  };

  const getRoleCounts = (roles) => ['Chair', 'Vice Chair', 'Member']
    .map((role) => ({ role, count: roles.filter((item) => item.role === role).length }))
    .filter(({ count }) => count > 0);

  const formatServiceDate = (value) => {
    if (!value || Number.isNaN(new Date(value).getTime())) return null;
    return new Date(value).toLocaleDateString(language === 'tl' ? 'fil-PH' : 'en-PH', { month: 'short', year: 'numeric' });
  };

  /* No stock portrait is substituted when a member has no photo. A
     photograph of a person who did not pose for this portal would be a
     fabrication, so the monogram stands in instead. */
  const Portrait = ({ member, className }) => {
    const portrait = officialCouncilPortrait(member);
    return portrait ? (
      <img className={className} src={portrait} alt={formatMemberName(member)} />
    ) : (
      <span className={`${className} v11-monogram`} aria-hidden="true">{initials(member)}</span>
    );
  };

  return (
    <TermSidebarLayout
      title={t('membersTitle')}
      description={`Meet the elected representatives of Bongabong dedicated to legislative excellence and public service. ${activeTerm ? `— ${activeTerm.label}` : ''}`}
      breadcrumbs={[{ label: t('sbMembersCrumb') }]}
      terms={terms}
      activeTermId={activeTermId}
      onTermChange={(id) => setActiveTermId(id)}
    >
      {loading ? (
        <PageSkeleton variant="members" label={t('loadingMembers')} />
      ) : (
        <div className="v11-stack">
          {(presidingOfficer || activeTerm?.presidingOfficer) && (
            <section aria-labelledby="presiding-title">
              <h2 id="presiding-title" className="v11-subhead">{t('presidingOfficer')}</h2>
              <div className="v11-officer">
                <div className="v11-officer-portrait">
                  <Portrait member={presidingOfficer || { name: activeTerm?.presidingOfficer || '' }} className="v11-officer-img" />
                </div>
                <div className="v11-officer-body">
                  <p className="v11-kicker">{t('municipalViceMayor')}</p>
                  <h3>
                    {presidingOfficer
                      ? formatMemberName(presidingOfficer)
                      : `Hon. ${activeTerm?.presidingOfficer || t('viceMayorRole')}`}
                  </h3>
                  <Biography text={presidingOfficer?.biography || t('presidingOfficerBio')} t={t} officer />
                  {(presidingOfficer?.sbNumber || presidingOfficer?.termStart || presidingOfficer?.termEnd) && (
                    <div className="v11-officer-facts">
                      {presidingOfficer?.sbNumber && <span>{presidingOfficer.sbNumber}</span>}
                      {(presidingOfficer?.termStart || presidingOfficer?.termEnd) && (
                        <span>{t('termOfService')}: {[presidingOfficer.termStart, presidingOfficer.termEnd].map(formatServiceDate).filter(Boolean).join(' – ')}</span>
                      )}
                    </div>
                  )}
                  <CommitteeAssignments roles={getCommitteeRoles(presidingOfficer)} t={t} />
                  {(presidingOfficer?.contactEmail || presidingOfficer?.fbLink) && (
                    <div className="v11-btn-row">
                      {presidingOfficer?.contactEmail && (
                        <a href={`mailto:${presidingOfficer.contactEmail}`} className="v11-btn v11-btn-primary v11-btn-sm">
                          <Mail size={15} aria-hidden="true" /> {t('contactOffice')}
                        </a>
                      )}
                      {presidingOfficer?.fbLink && (
                        <a href={presidingOfficer.fbLink} target="_blank" rel="noreferrer" className="v11-btn v11-btn-quiet v11-btn-sm">
                          <MessageCircle size={15} aria-hidden="true" /> Facebook
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="members-title">
            <h2 id="members-title" className="v11-subhead">{t('sbMembers')}</h2>
            {regularMembers.length === 0 && members.length === 0 ? (
              <p className="v11-empty">{t('noProfiles')}</p>
            ) : (
              <div className="v11-member-grid">
                {(regularMembers.length > 0 ? regularMembers : members).map((member) => (
                  <article className="v11-member" key={member._id}>
                    <Portrait member={member} className="v11-member-img" />
                    <div className="v11-member-body">
                      <span className="v11-tag">{member.position || t('sbMemberTag')}</span>
                      <h3>{formatMemberName(member)}</h3>
                      {member.biography && <Biography text={member.biography} t={t} />}
                      {getRoleCounts(getCommitteeRoles(member)).length > 0 && (
                        <ul className="v11-member-role-summary" aria-label={t('committeeAssignments')}>
                          {getRoleCounts(getCommitteeRoles(member)).map(({ role, count }) => (
                            <li key={role}><span>{t(ROLE_LABEL_KEYS[role])}</span><strong>{count}</strong></li>
                          ))}
                        </ul>
                      )}
                      {(member.sbNumber || member.termStart || member.termEnd) && (
                        <div className="v11-member-facts">
                          {member.sbNumber && <span>{member.sbNumber}</span>}
                          {(member.termStart || member.termEnd) && (
                            <span><strong>{t('termOfService')}</strong>{[member.termStart, member.termEnd].map(formatServiceDate).filter(Boolean).join(' – ')}</span>
                          )}
                        </div>
                      )}
                      <CommitteeAssignments roles={getCommitteeRoles(member)} t={t} />
                    </div>
                    {(member.contactEmail || member.fbLink) && (
                      <div className="v11-member-links">
                        {member.contactEmail && (
                          <a href={`mailto:${member.contactEmail}`} className="v11-member-link">
                            <Mail size={14} aria-hidden="true" /> Email
                          </a>
                        )}
                        {member.fbLink && (
                          <a href={member.fbLink} target="_blank" rel="noreferrer" className="v11-member-link">
                            <MessageCircle size={14} aria-hidden="true" /> Social
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </TermSidebarLayout>
  );
}
