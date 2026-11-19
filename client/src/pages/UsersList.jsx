import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { getAvatarSource } from '../utils/avatar';
import { normalizeArray } from '../utils/normalizeResponse';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, X, UserCheck, UserX, Key } from 'lucide-react';
import { Badge } from '@ibosys/ui';
import { normalizeStatus } from '../constants/stages';
import { Avatar, Pagination, Modal } from '@ibosys/ui';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PageSkeleton from '../components/ui/PageSkeleton';

const CONTACT_RE = /^09\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateContact = (v) => {
  if (!v) return 'Contact number is required.';
  if (!CONTACT_RE.test(v)) return 'Must be a valid PH mobile number (e.g. 09171234567).';
  return '';
};

const validateEmail = (v) => {
  const email = v.trim();
  if (!email) return 'Email is required.';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return '';
};

const getRolePrefix = (role) => {
  if (role === 'System Admin') return 'SYS-';
  if (role === 'Secretary') return 'SEC-';
  if (role === 'Vice Mayor') return 'VM-';
  if (role === 'SB Member') return 'SBM-';
  return 'ID-';
};

const ROLES = ['', 'System Admin', 'Secretary', 'Vice Mayor', 'SB Member'];

const SB_POSITIONS = [
  'Vice Mayor',
  'Committee Chair on Appropriation, Infrastructure and Power and Energy',
  'Committee Chair on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability',
  'Committee Chair on Health, Livelihood and Civil Society Organizations',
  'Committee Chair on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise',
  'Committee Chair on Agriculture and Games and Amusement',
  'Committee Chair on Tourism, Transportation, Peace and Order and Beautification',
  'Committee Chair on Social Welfare, Disaster Risk Reduction and Management and Community Driven Development',
  'Committee Chair on Ways and Means, Trade and Industry, Land Use, Labor and Human Resource, Overseas Filipino Workers, Oversight and Sisterhood',
  'Committee Chair on Youth and Sports Development, Science and Technology and Information and Communication Technology',
  'Committee Chair on Barangay Affairs',
  'Councilor'
];

export default function UsersList() {
  const { user: currentUser } = useAuth();
  const allowedRoles = currentUser?.role === 'System Admin' ? ['Secretary', 'Vice Mayor', 'SB Member'] : ['Vice Mayor', 'SB Member'];
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', role: '', position: '', contactNumber: '', termStart: '2025-06-30', termEnd: '2028-06-30' });
  const [contactErr, setContactErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [passwordAlert, setPasswordAlert] = useState('');
  const [confirmReset, setConfirmReset] = useState(null);
  const [customResetPassword, setCustomResetPassword] = useState('');
  const [confirmToggle, setConfirmToggle] = useState(null);

  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => {
      setLoading(true);
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (role) p.set('role', role);
      if (status) p.set('status', status);
      api.getUsers(p.toString()).then(res => setUsers(normalizeArray(res))).catch(console.error).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, role, status]);

  const paginatedUsers = users.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCreate = async (e) => {
    e.preventDefault();
    const cErr = validateContact(form.contactNumber);
    const eErr = validateEmail(form.email);
    if (cErr) setContactErr(cErr);
    if (eErr) setEmailErr(eErr);
    if (cErr || eErr) return;
    setSaving(true);
    try {
      const res = await api.createUser({ ...form, email: form.email.trim().toLowerCase() });
      if (res.invitationSent === false) toast.warning(res.message);
      else toast.success(res.message || 'User account created and invitation sent.');
      setShowModal(false);
      setForm({ firstName: '', middleName: '', lastName: '', email: '', role: allowedRoles[0] || '', position: '', contactNumber: '', termStart: '2025-06-30', termEnd: '2028-06-30' });
      setContactErr('');
      setEmailErr('');
      if (res.message) setPasswordAlert(res.message);
      
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (role) p.set('role', role);
      if (status) p.set('status', status);
      api.getUsers(p.toString()).then(res => setUsers(normalizeArray(res))).catch(console.error);
    } catch (err) {
      toast.error(err.message || 'Failed to create user account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id, currentStatus, name) => {
    setConfirmToggle({ id, currentStatus, name });
  };

  const executeToggle = async () => {
    const { id, currentStatus } = confirmToggle;
    try {
      const newStatus = currentStatus === 'Active' ? 'Deactivated' : 'Active';
      await api.updateUserStatus(id, newStatus);
      setUsers(users.map(u => u._id === id ? { ...u, status: newStatus } : u));
      toast.success(`User status updated to ${newStatus}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to toggle user status.');
    } finally {
      setConfirmToggle(null);
    }
  };

  const triggerReset = (id, name, status) => {
    setConfirmReset({ id, name, status });
    setCustomResetPassword('');
  };

  const executeReset = async () => {
    try {
      const payload = customResetPassword ? { newPassword: customResetPassword } : {};
      const res = await api.resetPassword(confirmReset.id, payload);
      const isInvitation = confirmReset.status === 'Pending';
      setConfirmReset(null);
      setCustomResetPassword('');
      if (isInvitation) {
        setUsers(users.map(user => user._id === confirmReset.id ? { ...user, status: 'Active' } : user));
      }
      toast.success(isInvitation ? 'Invitation sent and account activated.' : 'Password reset email sent.');
      if (res.message) setPasswordAlert(res.message);
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    }
  };

  const handleModalOpen = () => {
    setForm({ firstName: '', middleName: '', lastName: '', email: '', role: allowedRoles[0] || '', position: '', contactNumber: '', termStart: '2025-06-30', termEnd: '2028-06-30' });
    setContactErr('');
    setEmailErr('');
    setShowModal(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage municipal portal accounts, roles, credentials, and access statuses.</p>
        </div>
        <button
          onClick={handleModalOpen}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary min-w-[140px]"
        >
          <option value="">All Roles</option>
          {ROLES.slice(1).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary min-w-[130px]"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Deactivated">Deactivated</option>
          <option value="Rejected">Rejected</option>
        </select>
        {(search || role || status) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setRole(''); setStatus(''); }}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <PageSkeleton rows={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">User Details</th>
                    <th className="px-6 py-3.5">Role &amp; Position</th>
                    <th className="px-6 py-3.5">Contact Info</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Last Login</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedUsers.map(u => (
                    <tr key={u._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={getAvatarSource(u.profilePicture)} alt={u.name} fallback={u.name?.charAt(0)?.toUpperCase() || '?'} size="sm" />
                          <div>
                            <div className="font-semibold text-foreground">{u.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {getRolePrefix(u.role)}{u._id.slice(-6).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-xs text-primary">{u.role}</div>
                        {u.position && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{u.position}</div>}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="text-foreground">{u.email}</div>
                        {u.contactNumber && <div className="text-muted-foreground mt-0.5">{u.contactNumber}</div>}
                      </td>
                      <td className="px-6 py-4"><Badge variant="status" status={normalizeStatus(u.status)} dot size="sm">{u.status || 'Active'}</Badge></td>
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.role !== 'System Admin' && u._id !== currentUser?._id && (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {u.status === 'Pending' ? (
                              <button
                                onClick={() => triggerReset(u._id, u.name, u.status)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Resend invitation"
                                aria-label={`Resend invitation to ${u.name}`}
                              >
                                <Key size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleStatus(u._id, u.status, u.name)}
                                className={`p-1.5 rounded-md transition-colors ${
                                  u.status === 'Active'
                                    ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                    : 'text-muted-foreground hover:text-primary-600 hover:bg-primary-50'
                                }`}
                                title={u.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                                aria-label={u.status === 'Active' ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                              >
                                {u.status === 'Active' ? <UserX size={15} /> : <UserCheck size={15} />}
                              </button>
                            )}
                            {u.status !== 'Pending' && (
                            <button
                              onClick={() => triggerReset(u._id, u.name, u.status)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="Reset Password"
                              aria-label={`Reset password for ${u.name}`}
                            >
                              <Key size={15} />
                            </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-sm text-muted-foreground">
                        No users found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={Math.ceil(users.length / ITEMS_PER_PAGE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create User Account">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">First Name *</label>
              <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Middle Name</label>
              <input value={form.middleName} onChange={e => setForm({ ...form, middleName: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Last Name *</label>
              <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Email Address *</label>
              <input type="email" value={form.email} onChange={e => {
                const val = e.target.value;
                setEmailErr(validateEmail(val));
                setForm({ ...form, email: val });
              }} required className={`w-full px-3 py-2 bg-background border rounded-md text-xs text-foreground outline-none focus:border-primary ${emailErr ? 'border-destructive' : 'border-input'}`} />
              {emailErr && <div className="text-[10px] text-destructive mt-0.5">{emailErr}</div>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Contact Number *</label>
              <input
                type="tel"
                placeholder="09171234567"
                maxLength={11}
                value={form.contactNumber}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setContactErr(validateContact(val));
                  setForm({ ...form, contactNumber: val });
                }}
                required
                className={`w-full px-3 py-2 bg-background border rounded-md text-xs text-foreground outline-none focus:border-primary ${contactErr ? 'border-destructive' : 'border-input'}`}
              />
              {contactErr ? <div className="text-[10px] text-destructive mt-0.5">{contactErr}</div> : <div className="text-[10px] text-muted-foreground mt-0.5">Format: 09XXXXXXXXX</div>}
            </div>
          </div>

          <div className="p-3 bg-secondary/60 border border-border rounded-lg text-xs text-muted-foreground">
            A temporary password will be emailed to the new user. It will not be displayed here.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, position: e.target.value === 'Vice Mayor' ? 'Vice Mayor' : '' })} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary">
                {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {['Vice Mayor', 'SB Member'].includes(form.role) && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Position / Title *</label>
                <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary">
                  {form.role === 'SB Member' && <option value="">Select position…</option>}
                  {(form.role === 'Vice Mayor' ? ['Vice Mayor'] : SB_POSITIONS.filter(position => position !== 'Vice Mayor')).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>

          {['Vice Mayor', 'SB Member'].includes(form.role) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Term Start *</label>
                <input type="date" value={form.termStart} onChange={e => setForm({ ...form, termStart: e.target.value })} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Term End *</label>
                <input type="date" value={form.termEnd} onChange={e => setForm({ ...form, termEnd: e.target.value })} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="px-3.5 py-1.5 text-xs text-muted-foreground bg-background border border-border rounded-md hover:bg-muted/50">Cancel</button>
            <button type="submit" disabled={saving || !!contactErr || !!emailErr} className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Alert Modal */}
      <Modal isOpen={!!passwordAlert} onClose={() => setPasswordAlert('')} title="Account Invitation Status" size="md">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Key size={24} />
          </div>
          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-mono bg-muted/40 p-3 rounded-lg border border-border">
            {passwordAlert}
          </p>
          <button onClick={() => setPasswordAlert('')} className="w-full py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90">
            Done &amp; Dismiss
          </button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!confirmReset} onClose={() => setConfirmReset(null)} title={confirmReset?.status === 'Pending' ? 'Resend Invitation' : 'Reset Password'} size="md">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {confirmReset?.status === 'Pending' ? 'Send a new temporary password to' : 'Reset password for'} <strong className="text-foreground">{confirmReset?.name}</strong>?
          </p>
          {confirmReset?.status !== 'Pending' && <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">New Password (Optional)</label>
            <input
              type="text"
              placeholder="Leave blank to auto-generate"
              value={customResetPassword}
              onChange={e => setCustomResetPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary"
            />
            {customResetPassword && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Custom passwords need 8+ characters, uppercase and lowercase letters, a number, and a special character.
              </p>
            )}
          </div>}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => setConfirmReset(null)} className="px-3.5 py-1.5 text-xs text-muted-foreground bg-background border border-border rounded-md hover:bg-muted/50">Cancel</button>
            <button type="button" onClick={executeReset} className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90">
              {confirmReset?.status === 'Pending' ? 'Send Invitation' : 'Reset Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Status Toggle Modal */}
      <Modal isOpen={!!confirmToggle} onClose={() => setConfirmToggle(null)} title="Toggle Status" size="md">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Are you sure you want to <strong>{confirmToggle?.currentStatus === 'Active' ? 'deactivate' : 'activate'}</strong> the account for <strong className="text-foreground">{confirmToggle?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => setConfirmToggle(null)} className="px-3.5 py-1.5 text-xs text-muted-foreground bg-background border border-border rounded-md hover:bg-muted/50">Cancel</button>
            <button
              type="button"
              onClick={executeToggle}
              className={`px-4 py-1.5 text-xs font-semibold text-white rounded-md ${
                confirmToggle?.currentStatus === 'Active' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {confirmToggle?.currentStatus === 'Active' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
