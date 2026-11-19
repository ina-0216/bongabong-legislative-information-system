import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getAvatarSource } from '../utils/avatar';
import { Save, Eye, EyeOff, Camera, Loader2, Edit3, Shield, AlertTriangle } from 'lucide-react';
import { Avatar } from '@ibosys/ui';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { isPhotoUploadWithinLimit, PHOTO_UPLOAD_SIZE_ERROR } from '@ibosys/api';

const CONTACT_RE = /^09\d{9}$/;
const PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const validateContact = (v) => {
  if (!v) return '';
  if (!CONTACT_RE.test(v)) return 'Must be a valid PH mobile number (e.g. 09171234567).';
  return '';
};

const validatePassword = (v) => {
  if (!v) return '';
  if (!PW_RE.test(v))
    return 'Must be at least 8 characters with uppercase, lowercase, a number, and a special character.';
  return '';
};

const validateEmail = (v) => {
  if (!v) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return '';
};

const inputCls = (err) =>
  `w-full px-3.5 py-2.5 bg-background border rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all ${err ? 'border-destructive' : 'border-input'}`;

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    middleName: user?.middleName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [contactErr, setContactErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [newPwErr, setNewPwErr] = useState('');
  const [confirmPwErr, setConfirmPwErr] = useState('');

  const [pErr, setPErr] = useState('');
  const [pSucc, setPSucc] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwSucc, setPwSucc] = useState('');
  const [loading, setLoading] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');
  const fileInputRef = useRef(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();
  const isForced = Boolean(user?.mustChangePassword);

  const [isEditingProfile, setIsEditingProfile] = useState(isForced);

  useEffect(() => {
    if (isEditingProfile) return;
    setProfile({
      firstName: user?.firstName || '',
      middleName: user?.middleName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      contactNumber: user?.contactNumber || '',
    });
  }, [user?.firstName, user?.middleName, user?.lastName, user?.email, user?.contactNumber, isEditingProfile]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isPhotoUploadWithinLimit(file)) {
      setAvatarErr(PHOTO_UPLOAD_SIZE_ERROR);
      setAvatarFile(null);
      setAvatarPreview(null);
      e.target.value = '';
      return;
    }
    setAvatarErr('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true); setAvatarErr('');
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      await api.uploadAvatar(fd);
      await refreshUser();
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Profile photo updated!');
    } catch (err) {
      setAvatarErr(err.message || 'Upload failed.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const cancelAvatarPreview = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarErr('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProfileChange = (field, value) => {
    setPErr('');
    if (field === 'contactNumber') {
      value = value.replace(/\D/g, '');
      setContactErr(validateContact(value));
    }
    if (field === 'email') {
      setEmailErr(validateEmail(value));
    }
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePwChange = (field, value) => {
    setPwErr('');
    if (field === 'newPassword') {
      setNewPwErr(validatePassword(value));
      if (pw.confirmPassword) setConfirmPwErr(value !== pw.confirmPassword ? 'Passwords do not match.' : '');
    }
    if (field === 'confirmPassword') setConfirmPwErr(value !== pw.newPassword ? 'Passwords do not match.' : '');
    setPw(prev => ({ ...prev, [field]: value }));
  };

  const handleProfile = async (e) => {
    e.preventDefault();
    const cErr = validateContact(profile.contactNumber);
    const eErr = validateEmail(profile.email);
    if (cErr) setContactErr(cErr);
    if (eErr) setEmailErr(eErr);
    if (cErr || eErr) return;
    setLoading(true); setPErr(''); setPSucc('');
    try {
      const updatedUser = await api.updateProfile(profile);
      await refreshUser();
      setProfile({
        firstName: updatedUser.firstName || '',
        middleName: updatedUser.middleName || '',
        lastName: updatedUser.lastName || '',
        email: updatedUser.email || '',
        contactNumber: updatedUser.contactNumber || '',
      });
      setPSucc('Profile updated successfully.');
      setIsEditingProfile(false);
      toast.success('Profile updated!');
    } catch (err) {
      setPErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    const npErr = validatePassword(pw.newPassword);
    if (npErr) { setNewPwErr(npErr); return; }
    if (pw.newPassword !== pw.confirmPassword) { setConfirmPwErr('Passwords do not match.'); return; }
    setLoading(true); setPwErr(''); setPwSucc('');
    try {
      await api.changePassword(user._id, { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      // The server revokes existing tokens after a password change, so the
      // current token cannot be used by refreshUser(). Require a fresh login.
      logout();
      toast.success('Password changed. Sign in again with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information, photo, and security credentials.</p>
      </div>

      {isForced && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span><strong>Security Notice:</strong> You must change your temporary password before accessing the system.</span>
        </div>
      )}

      {/* Identity Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
        {/* Avatar Row */}
        <div className="flex items-center gap-5 pb-5 mb-5 border-b border-border">
          <div className="relative shrink-0">
            {avatarPreview
              ? <Avatar src={avatarPreview} alt={user?.name} size="xl" className="border-2 border-primary shadow-md" />
              : <Avatar src={getAvatarSource(user?.profilePicture)} alt={user?.name} fallback={user?.name?.charAt(0)?.toUpperCase() || '?'} size="xl" className="border-2 border-primary shadow-md" />
            }
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground border-2 border-card flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground">{user?.name}</h3>
            <div className="text-xs text-muted-foreground mt-0.5">
              {user?.role}{user?.position && ` · ${user.position}`}
            </div>
            {avatarFile && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {avatarUploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : 'Save Photo'}
                </button>
                <button type="button" onClick={cancelAvatarPreview} disabled={avatarUploading} className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-background border border-border rounded-md hover:bg-muted/50">
                  Cancel
                </button>
              </div>
            )}
            {avatarErr && <div className="text-[11px] text-destructive mt-1">{avatarErr}</div>}
            {!avatarFile && <div className="text-[11px] text-muted-foreground mt-1.5">Click the camera icon to update your photo · Max 25 MB</div>}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleProfile} className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Personal Information</h4>
            {!isEditingProfile && (
              <button type="button" onClick={() => setIsEditingProfile(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted-foreground bg-background border border-border hover:bg-muted/50 rounded-md transition-colors">
                <Edit3 size={13} /> Edit
              </button>
            )}
          </div>

          {pErr && <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md font-medium">{pErr}</div>}
          {pSucc && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-md font-medium">{pSucc}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">First Name</label>
              <input value={profile.firstName} onChange={e => handleProfileChange('firstName', e.target.value)} required disabled={!isEditingProfile || isForced} className={inputCls('') + ' disabled:bg-muted/40 disabled:text-muted-foreground'} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Middle Name <span className="font-normal text-muted-foreground">(opt.)</span></label>
              <input value={profile.middleName} onChange={e => handleProfileChange('middleName', e.target.value)} disabled={!isEditingProfile || isForced} className={inputCls('') + ' disabled:bg-muted/40 disabled:text-muted-foreground'} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Last Name</label>
              <input value={profile.lastName} onChange={e => handleProfileChange('lastName', e.target.value)} required disabled={!isEditingProfile || isForced} className={inputCls('') + ' disabled:bg-muted/40 disabled:text-muted-foreground'} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Email Address</label>
              <input type="email" value={profile.email} onChange={e => handleProfileChange('email', e.target.value)} required disabled={!isEditingProfile || isForced} className={inputCls(emailErr) + ' disabled:bg-muted/40 disabled:text-muted-foreground'} />
              {emailErr && <div className="text-[10px] text-destructive mt-0.5">{emailErr}</div>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Contact Number</label>
              <input type="tel" placeholder="09171234567" maxLength={11} value={profile.contactNumber} onChange={e => handleProfileChange('contactNumber', e.target.value)} disabled={!isEditingProfile || isForced} className={inputCls(contactErr) + ' disabled:bg-muted/40 disabled:text-muted-foreground'} />
              {contactErr ? <div className="text-[10px] text-destructive mt-0.5">{contactErr}</div> : <div className="text-[10px] text-muted-foreground mt-0.5">Format: 09XXXXXXXXX</div>}
            </div>
          </div>

          {isEditingProfile && (
            <div className="flex items-center gap-2 pt-2">
              <button type="submit" disabled={loading || isForced || !!contactErr || !!emailErr} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 disabled:opacity-50">
                <Save size={14} /> Save Changes
              </button>
              {!isForced && (
                <button type="button" onClick={() => {
                  setIsEditingProfile(false);
                  setProfile({ firstName: user?.firstName || '', middleName: user?.middleName || '', lastName: user?.lastName || '', email: user?.email || '', contactNumber: user?.contactNumber || '' });
                  setContactErr(''); setEmailErr(''); setPErr('');
                }} disabled={loading} className="px-3.5 py-2 text-xs font-semibold text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted/50">
                  Cancel
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Security / Password Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
          <Shield size={18} className="text-primary" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Change Password</h4>
        </div>

        <form onSubmit={handlePassword} className="space-y-4">
          {pwErr && <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md font-medium">{pwErr}</div>}
          {pwSucc && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-md font-medium">{pwSucc}</div>}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Current Password</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={pw.currentPassword} onChange={e => handlePwChange('currentPassword', e.target.value)} required className={inputCls('') + ' pr-10'} />
              <button type="button" onClick={() => setShowCurrent(v => !v)} aria-label={showCurrent ? 'Hide current password' : 'Show current password'} aria-pressed={showCurrent} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={pw.newPassword} onChange={e => handlePwChange('newPassword', e.target.value)} required className={inputCls(newPwErr) + ' pr-10'} />
                <button type="button" onClick={() => setShowNew(v => !v)} aria-label={showNew ? 'Hide new password' : 'Show new password'} aria-pressed={showNew} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPwErr ? <div className="text-[10px] text-destructive mt-0.5">{newPwErr}</div> : <div className="text-[10px] text-muted-foreground mt-0.5">Min. 8 chars · uppercase · lowercase · number · special char</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={pw.confirmPassword} onChange={e => handlePwChange('confirmPassword', e.target.value)} required className={inputCls(confirmPwErr) + ' pr-10'} />
                <button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirm} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPwErr && <div className="text-[10px] text-destructive mt-0.5">{confirmPwErr}</div>}
            </div>
          </div>

          <button type="submit" disabled={loading || !!newPwErr || !!confirmPwErr} className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground font-semibold text-xs rounded-lg hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50">
            <Shield size={13} /> {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
