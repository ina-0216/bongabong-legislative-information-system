import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { normalizeArray } from '../utils/normalizeResponse';
import { useAuth } from '../context/AuthContext';
import { Landmark, Edit2, X, UserCheck, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Pagination } from '@ibosys/ui';
import PageSkeleton from '../components/ui/PageSkeleton';

export default function Committees() {
  const { user } = useAuth();
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [committees, setCommittees] = useState([]);
  const [sbMembers, setSbMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ chairperson: '', viceChairperson: '', members: [], description: '' });
  const [newMember, setNewMember] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const canEdit = ['Secretary', 'System Admin'].includes(user?.role);

  const loadTerms = async () => {
    try {
      const termsData = await api.getTerms();
      const list = normalizeArray(termsData);
      setTerms(list);
      const current = list.find(t => t.isCurrent);
      setSelectedTermId(current?._id || '');
    } catch {
      toast.error('Failed to load terms');
    }
  };

  useEffect(() => { loadTerms(); }, []);

  const loadData = useCallback(async () => {
    if (!selectedTermId) {
      setCommittees([]);
      setSbMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const committeeRequest = canEdit
        ? api.ensureTermCommittees(selectedTermId)
        : api.getCommittees(`termId=${selectedTermId}&limit=100`);
      const [data, membersData] = await Promise.all([
        committeeRequest,
        api.getSBMembers(`termId=${selectedTermId}`)
      ]);
      setCommittees(normalizeArray(data));
      setSbMembers(normalizeArray(membersData));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedTermId, canEdit]);

  useEffect(() => { loadData(); }, [selectedTermId, loadData]);

  const startEdit = (c) => {
    setEditingId(c._id);
    setEditForm({
      chairperson: c.chairperson || '',
      viceChairperson: c.viceChairperson || '',
      members: [...(c.members || [])],
      description: c.description || ''
    });
    setNewMember('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewMember('');
  };

  const addMember = () => {
    const trimmed = newMember.trim();
    if (!trimmed) return;
    if (editForm.members.includes(trimmed)) {
      toast.warning('This member is already in the list.');
      return;
    }
    setEditForm(p => ({ ...p, members: [...p.members, trimmed] }));
    setNewMember('');
  };

  const removeMember = (idx) => {
    setEditForm(p => ({ ...p, members: p.members.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveCommittee(editingId, editForm);
      toast.success('Committee updated successfully!');
      await loadData();
      setEditingId(null);
    } catch (e) {
      toast.error(e.message || 'Failed to save committee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton variant="grid" rows={6} />;

  const paginatedCommittees = committees.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 min-w-0"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark size={24} className="text-primary" />
            Standing Committees
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Official legislative committees of the Sangguniang Bayan, leadership, and member rosters.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Calendar size={16} className="text-muted-foreground" />
          <select 
            className="px-3.5 py-2 bg-card border border-input rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs"
            value={selectedTermId} 
            onChange={e => {
              setPage(1);
              setSelectedTermId(e.target.value);
            }}
          >
            {terms.map(t => (
              <option key={t._id} value={t._id}>{t.label} {t.isCurrent ? '(Current Term)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Committee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0">
        {paginatedCommittees.map((c, idx) => (
          <motion.div
            key={c._id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  <Landmark size={10} /> Committee
                </span>
                {canEdit && editingId !== c._id && (
                  <button
                    onClick={() => startEdit(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-foreground hover:text-primary bg-background border border-border hover:border-primary/50 rounded-md transition-colors cursor-pointer"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                )}
              </div>

              <h3 className="font-bold text-foreground text-sm leading-snug mb-3 min-h-[2.5rem]">
                {c.name}
              </h3>

              {editingId === c._id ? (
                /* Edit Mode */
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Chairperson
                    </label>
                    <select
                      className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary"
                      value={editForm.chairperson}
                      onChange={e => setEditForm(p => ({ ...p, chairperson: e.target.value }))}
                    >
                      <option value="">Select chairperson…</option>
                      {sbMembers.map(m => (
                        <option key={m._id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Vice-Chairperson
                    </label>
                    <select
                      className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary"
                      value={editForm.viceChairperson}
                      onChange={e => setEditForm(p => ({ ...p, viceChairperson: e.target.value }))}
                    >
                      <option value="">Select vice-chairperson…</option>
                      {sbMembers.map(m => (
                        <option key={m._id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Add Members
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary"
                        value={newMember}
                        onChange={e => setNewMember(e.target.value)}
                      >
                        <option value="">Select member…</option>
                        {sbMembers.filter(m => m.name !== editForm.chairperson).map(m => (
                          <option key={m._id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addMember}
                        className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-md transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {editForm.members.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium border border-border">
                          {m}
                          <button type="button" onClick={() => removeMember(i)} aria-label={`Remove ${m}`} className="text-destructive hover:text-destructive/80">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-2.5 py-1 text-xs font-medium text-muted-foreground bg-background border border-border rounded-md hover:bg-muted/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <UserCheck size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Chairperson
                      </span>
                      <span className="block text-xs font-bold text-foreground truncate">
                        {c.chairperson || 'Not assigned'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <UserCheck size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Vice-Chairperson
                      </span>
                      <span className="block text-xs font-bold text-foreground truncate">
                        {c.viceChairperson || 'Not assigned'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Users size={12} /> Members ({c.members?.length || 0})
                    </span>
                    {c.members && c.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.members.map((m, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium border border-border/50">
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No members assigned</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <Pagination currentPage={page} totalPages={Math.ceil(committees.length / ITEMS_PER_PAGE)} onPageChange={setPage} />
    </motion.div>
  );
}
