import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { normalizeArray, normalizePaginated } from '../utils/normalizeResponse';
import { ChevronDown, Plus, Edit2, Trash2, Mail, UserCheck } from 'lucide-react';
import { Pagination, Modal } from '@ibosys/ui';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { isPhotoUploadWithinLimit, PHOTO_UPLOAD_SIZE_ERROR } from '@ibosys/api';
import PageSkeleton from '../components/ui/PageSkeleton';
import { officialCouncilPortrait } from '../utils/officialCouncilPortraits';

const COMMITTEES_LIST = [
  'Committee on Appropriation, Infrastructure and Power and Energy',
  'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability',
  'Committee on Health, Livelihood and Civil Society Organizations',
  'Committee on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise',
  'Committee on Agriculture and Games and Amusement',
  'Committee on Tourism, Transportation, Peace and Order and Beautification',
  'Committee on Social Welfare, Disaster Risk Reduction and Management and Community Driven Development',
  'Committee on Ways and Means, Trade and Industry, Land Use, Labor and Human Resource, Overseas Filipino Workers, Oversight and Sisterhood',
  'Committee on Youth and Sports Development, Science and Technology and Information and Communication Technology',
  'Committee on Barangay Affairs',
];

const formatName = (member) => {
  let fName = member.firstName || '';
  fName = fName.replace(/^Hon\.?\s*/i, '');
  const isAttorney = /^Atty\.?\s*/i.test(fName);
  fName = fName.replace(/^Atty\.?\s*/i, '');
  const middleInitial = member.middleName?.trim().replace(/\.$/, '').charAt(0);
  const name = [fName, middleInitial ? `${middleInitial}.` : '', member.lastName].filter(Boolean).join(' ');
  return `Hon. ${isAttorney ? 'Atty. ' : ''}${name}`;
};

export default function SBMembers() {
  const [members, setMembers] = useState([]);
  const [terms, setTerms] = useState([]);
  const [termsLoaded, setTermsLoaded] = useState(false);
  const [termsLoadError, setTermsLoadError] = useState('');
  const [filterTermId, setFilterTermId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const ITEMS_PER_PAGE = 10;
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [biography, setBiography] = useState('');
  const [committees, setCommittees] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [fbLink, setFbLink] = useState('');
  const [sbNumber, setSbNumber] = useState('');
  const [termId, setTermId] = useState('');
  const [order, setOrder] = useState('1');
  const [photo, setPhoto] = useState(null);

  const fetchMembers = useCallback(async () => {
    try {
      let p = `page=${page}&limit=${ITEMS_PER_PAGE}`;
      if (filterTermId) p += `&termId=${filterTermId}`;
      if (showInactive) p += '&includeInactive=true';
      const data = await api.getSBMembers(p);
      const result = normalizePaginated(data);
      setMembers(result.docs);
      const pageCount = Math.max(1, result.pages);
      setTotalPages(pageCount);
      if (page < 1) setPage(1);
      else if (page > pageCount) setPage(pageCount);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to fetch SB Members');
    } finally {
      setLoading(false);
    }
  }, [page, filterTermId, showInactive]);

  useEffect(() => {
    fetchMembers();
  }, [filterTermId, page, fetchMembers]);

  useEffect(() => {
    let isMounted = true;
    api.getTerms()
      .then((res) => {
        if (isMounted) setTerms(normalizeArray(res));
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setTermsLoadError(err.message || 'Could not load legislative terms.');
      })
      .finally(() => {
        if (isMounted) setTermsLoaded(true);
      });

    return () => { isMounted = false; };
  }, []);

  const openModal = (member = null) => {
    setEditingMember(member);
    if (member) {
      setFirstName(member.firstName || '');
      setMiddleName(member.middleName || '');
      setLastName(member.lastName || '');
      setPosition(member.position);
      setBiography(member.biography);
      setCommittees(member.committees || []);
      setContactEmail(member.contactEmail);
      setFbLink(member.fbLink);
      setSbNumber(member.sbNumber);
      setTermId(typeof member.termId === 'object' ? member.termId?._id || '' : member.termId || '');
      setOrder(String(member.order ?? 1));
    } else {
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setPosition('');
      setBiography('');
      setCommittees([]);
      setContactEmail('');
      setFbLink('');
      setSbNumber('');
      setTermId(filterTermId || terms.find((term) => term.isCurrent)?._id || '');
      setOrder('1');
    }
    setPhoto(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const memberData = new FormData();
    memberData.append('firstName', firstName);
    memberData.append('middleName', middleName);
    memberData.append('lastName', lastName);
    memberData.append('position', position);
    memberData.append('biography', biography);
    memberData.append('committees', JSON.stringify(committees));
    memberData.append('contactEmail', contactEmail);
    memberData.append('fbLink', fbLink);
    memberData.append('sbNumber', sbNumber);
    if (termId) memberData.append('termId', termId);
    memberData.append('order', order);

    try {
      let memberId;
      if (editingMember) {
        await api.updateSBMember(editingMember._id, memberData);
        memberId = editingMember._id;
      } else {
        const createdMember = await api.createSBMember(memberData);
        memberId = createdMember?._id;
      }

      let photoUploadFailed = false;
      if (photo && memberId) {
        const photoData = new FormData();
        for (const [key, value] of memberData.entries()) photoData.append(key, value);
        photoData.append('photo', photo);
        try {
          await api.updateSBMember(memberId, photoData);
        } catch (photoError) {
          photoUploadFailed = true;
          console.error(photoError);
        }
      }

      setShowModal(false);
      fetchMembers();
      if (photoUploadFailed) {
        toast.error('Member details were saved, but the portrait upload failed. Edit the member and choose the photo again to retry.');
      } else {
        toast.success(editingMember ? 'Member updated successfully' : 'Member added successfully');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save SB Member');
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await api.deleteSBMember(id);
      setDeleteConfirm(null);
      toast.success(result?.deactivated
        ? 'Member deactivated to preserve linked legislative history.'
        : 'Member permanently removed.');
      fetchMembers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete SB Member');
    }
  };

  const handleReactivate = async (member) => {
    const update = new FormData();
    update.append('isActive', 'true');
    try {
      await api.updateSBMember(member._id, update);
      toast.success('Member reactivated.');
      fetchMembers();
    } catch (err) {
      toast.error(err.message || 'Failed to reactivate SB Member.');
    }
  };

  if (loading) {
    return <PageSkeleton variant="grid" rows={8} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">SB Members Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage the official roster of Sangguniang Bayan councilors and presiding officers.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          disabled={!termsLoaded || terms.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 shadow-xs transition-colors cursor-pointer self-start sm:self-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>
      {termsLoaded && terms.length === 0 && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {termsLoadError || 'Create a legislative term before adding an SB member.'}
        </p>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div ref={dropdownRef} className="relative w-64">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-card border border-input rounded-lg text-sm text-foreground hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
          >
            <span className="truncate">
              {filterTermId ? terms.find(t => t._id === filterTermId)?.label : 'All Legislative Terms'}
            </span>
            <ChevronDown size={15} className="text-muted-foreground shrink-0 ml-2" />
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 w-full mt-1.5 bg-card border border-border rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto py-1 divide-y divide-border">
              <button
                type="button"
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                onClick={() => { setFilterTermId(''); setPage(1); setIsDropdownOpen(false); }}
              >
                All Legislative Terms
              </button>
              {terms.map(t => (
                <button
                  key={t._id}
                  type="button"
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                  onClick={() => { setFilterTermId(t._id); setPage(1); setIsDropdownOpen(false); }}
                >
                  {t.label} ({t.startYear}–{t.endYear})
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-pressed={showInactive}
          onClick={() => { setShowInactive(value => !value); setPage(1); }}
          className="px-3.5 py-2.5 bg-card border border-input rounded-lg text-sm text-foreground hover:border-primary/50 transition-colors"
        >
          {showInactive ? 'Showing inactive members' : 'Show inactive members'}
        </button>
      </div>
      {showInactive && <p className="text-sm text-muted-foreground">Inactive members are hidden from the public roster. Reactivating restores their visibility without changing their linked history.</p>}

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Official</th>
                <th className="px-6 py-3.5">Position</th>
                <th className="px-6 py-3.5 text-center">Rank Order</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                  {members.map(member => (
                <tr key={member._id} className={`hover:bg-muted/20 transition-colors ${member.isActive === false ? 'opacity-80' : ''}`}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      {officialCouncilPortrait(member) ? (
                        <img 
                          src={officialCouncilPortrait(member)} 
                          alt={member.name} 
                          className="w-10 h-10 rounded-full object-cover object-[center_20%] border border-border shrink-0" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center font-bold text-sm border border-border shrink-0">
                          {member.firstName?.charAt(0) || 'M'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground">{formatName(member)}</div>
                        {member.contactEmail && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail size={11} /> {member.contactEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-xs font-semibold text-foreground">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      member.position === 'Vice Mayor'
                        ? 'bg-amber-50 border border-amber-300 text-amber-900'
                        : 'bg-primary-50 border border-primary-100 text-primary-800'
                    }`}>
                      {member.position}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center text-xs font-bold text-muted-foreground">
                    #{Math.max(Number(member.order) || 1, 1)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button
                        onClick={() => member.isActive === false ? handleReactivate(member) : openModal(member)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                        title={member.isActive === false ? 'Reactivate Member' : 'Edit Member'}
                        aria-label={member.isActive === false ? `Reactivate ${formatName(member)}` : `Edit ${formatName(member)}`}
                      >
                        {member.isActive === false ? <UserCheck size={15} /> : <Edit2 size={15} />}
                      </button>
                      {member.isActive !== false && <button
                        onClick={() => setDeleteConfirm(member._id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                        title="Delete Member"
                      >
                        <Trash2 size={15} />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-sm text-muted-foreground">
                    {showInactive ? 'No inactive SB members found for this term.' : 'No active SB members found for this term.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Add / Edit Member Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingMember ? 'Edit SB Member' : 'Add SB Member'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sb-member-first-name" className="block text-xs font-bold text-foreground mb-1.5">First Name *</label>
              <input id="sb-member-first-name" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
            <div>
              <label htmlFor="sb-member-middle-name" className="block text-xs font-bold text-foreground mb-1.5">Middle Name</label>
              <input id="sb-member-middle-name" type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
            <div>
              <label htmlFor="sb-member-last-name" className="block text-xs font-bold text-foreground mb-1.5">Last Name *</label>
              <input id="sb-member-last-name" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sb-member-position" className="block text-xs font-bold text-foreground mb-1.5">Position *</label>
              <select id="sb-member-position" value={position} onChange={e => setPosition(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
                <option value="">Select Position…</option>
                <option value="Vice Mayor">Vice Mayor</option>
                <option value="SB Member">SB Member</option>
              </select>
            </div>
            <div>
              <label htmlFor="sb-member-term" className="block text-xs font-bold text-foreground mb-1.5">
                Term{!editingMember || editingMember.termId ? ' *' : ''}
              </label>
              <select id="sb-member-term" value={termId} onChange={e => setTermId(e.target.value)} required={!editingMember || Boolean(editingMember.termId)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
                <option value="">Select a Term</option>
                {terms.map(t => (
                  <option key={t._id} value={t._id}>{t.label} ({t.startYear}-{t.endYear})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sb-member-order" className="block text-xs font-bold text-foreground mb-1.5">Order (Sort)</label>
              <input id="sb-member-order" type="number" min="1" value={order} onChange={e => setOrder(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sb-member-email" className="block text-xs font-bold text-foreground mb-1.5">Email Address</label>
              <input id="sb-member-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
            <div>
              <label htmlFor="sb-member-facebook" className="block text-xs font-bold text-foreground mb-1.5">Facebook Profile Link</label>
              <input id="sb-member-facebook" type="url" value={fbLink} onChange={e => setFbLink(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Committees Assigned</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-border rounded-lg bg-background">
              {COMMITTEES_LIST.map(c => (
                <label key={c} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-secondary/40 p-1 rounded">
                  <input 
                    type="checkbox" 
                    checked={committees.includes(c)}
                    onChange={(e) => {
                      if (e.target.checked) setCommittees([...committees, c]);
                      else setCommittees(committees.filter(item => item !== c));
                    }}
                    className="accent-primary"
                  />
                  <span className="truncate">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sb-member-biography" className="block text-xs font-bold text-foreground mb-1.5">Biography</label>
            <textarea id="sb-member-biography" value={biography} onChange={e => setBiography(e.target.value)} rows="2" className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="Official biography..." />
          </div>

          <div>
            <label htmlFor="sb-member-photo" className="block text-xs font-bold text-foreground mb-1.5">Photo</label>
            <input id="sb-member-photo" type="file" onChange={e => {
              const file = e.target.files?.[0];
              if (file && !isPhotoUploadWithinLimit(file)) {
                setPhoto(null);
                toast.error(PHOTO_UPLOAD_SIZE_ERROR);
                e.target.value = '';
                return;
              }
              setPhoto(file || null);
            }} accept="image/*" className="w-full text-xs text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:bg-secondary file:text-xs file:font-semibold hover:file:bg-secondary/80 cursor-pointer" />
            <p className="mt-1 text-xs text-muted-foreground">Maximum photo size: 25 MB.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Save Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this member? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDeleteConfirm(null)} className="px-3.5 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={() => handleDelete(deleteConfirm)} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-destructive rounded-md hover:bg-destructive/90 transition-colors">
              Delete Member
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
