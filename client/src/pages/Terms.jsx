import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { Modal, Pagination } from '@ibosys/ui';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PageSkeleton from '../components/ui/PageSkeleton';

const TERM_LENGTH_YEARS = 3;
const formatTermLabel = (startYear, endYear) => `${startYear}-${endYear} Term`;

export default function Terms() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 3,
    presidingOfficer: ''
  });

  const fetchTerms = async () => {
    try {
      const data = await api.getTerms();
      setTerms(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load terms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleOpenModal = (term = null) => {
    if (term) {
      setEditingTerm(term);
      setFormData({
        startYear: term.startYear,
        endYear: Number(term.startYear) + TERM_LENGTH_YEARS,
        presidingOfficer: term.presidingOfficer
      });
    } else {
      setEditingTerm(null);
      const latestEndYear = Math.max(0, ...terms.map(({ endYear }) => Number(endYear) || 0));
      const startYear = latestEndYear || new Date().getFullYear();
      setFormData({
        startYear,
        endYear: startYear + TERM_LENGTH_YEARS,
        presidingOfficer: ''
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const startYear = Number(formData.startYear);
      const endYear = startYear + TERM_LENGTH_YEARS;
      const termData = {
        ...formData,
        label: formatTermLabel(startYear, endYear),
        startYear,
        endYear,
      };
      if (editingTerm) {
        await api.updateTerm(editingTerm._id, termData);
      } else {
        await api.createTerm(termData);
      }
      setModalOpen(false);
      toast.success(editingTerm ? 'Term updated successfully' : 'Term created successfully');
      fetchTerms();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error saving term');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTerm(id);
      setDeleteConfirm(null);
      toast.success('Term deleted successfully');
      fetchTerms();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error deleting term');
    }
  };

  if (loading) {
    return <PageSkeleton rows={5} />;
  }

  const paginatedTerms = terms.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const hasCurrentTerm = terms.some(term => term.isCurrent);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Legislative Terms</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage Sangguniang Bayan council terms and presiding officers.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} /> Add Term
        </button>
      </div>

      {terms.length > 0 && !hasCurrentTerm && (
        <div role="status" className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          No term covers today’s date in the Philippines. Add or correct the term dates; current status updates automatically at noon on June 30.
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Term Label</th>
                <th className="px-6 py-3.5">Years</th>
                <th className="px-6 py-3.5">Presiding Officer</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTerms.map(term => (
                <tr key={term._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Calendar size={15} className="text-primary shrink-0" />
                      <span>{formatTermLabel(term.startYear, term.endYear)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-foreground whitespace-nowrap">
                    {term.startYear} – {term.endYear}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {term.presidingOfficer || '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {term.isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-300 text-emerald-800">
                        <CheckCircle2 size={11} className="text-emerald-600" /> Current Term
                      </span>
                    ) : term.isUpcoming ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
                        Upcoming Term
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-600">
                        Past Term
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleOpenModal(term)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                        title="Edit Term"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(term._id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                        title="Delete Term"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTerms.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-sm text-muted-foreground">
                    No terms recorded yet. Click "Add Term" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={Math.ceil(terms.length / ITEMS_PER_PAGE)} onPageChange={setPage} />
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTerm ? "Edit Term" : "Add Term"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Generated Term Label</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {formData.startYear ? formatTermLabel(formData.startYear, Number(formData.startYear) + TERM_LENGTH_YEARS) : 'Choose a start year'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">All legislative terms use a consistent three-year period.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Start Year *
              </label>
              <input 
                type="number" 
                min="1900"
                value={formData.startYear} 
                onChange={e => {
                  const startYear = parseInt(e.target.value, 10) || '';
                  setFormData(current => ({
                    ...current,
                    startYear,
                    endYear: startYear ? startYear + TERM_LENGTH_YEARS : ''
                  }));
                }} 
                required 
                className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                End Year
              </label>
              <input 
                type="number" 
                value={formData.endYear} 
                readOnly
                aria-readonly="true"
                className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Presiding Officer (Vice Mayor)
            </label>
            <input 
              type="text" 
              placeholder="e.g. Hon. Juan Dela Cruz"
              value={formData.presidingOfficer} 
              onChange={e => setFormData({...formData, presidingOfficer: e.target.value})} 
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Save Term
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this term? This may affect linked ordinances and members.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="px-3.5 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDelete(deleteConfirm)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-destructive rounded-md hover:bg-destructive/90 transition-colors"
            >
              Delete Term
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
