import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Key, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AuthBrandingPanel from '../components/features/AuthBrandingPanel';
import AuthMobileBrand from '../components/features/AuthMobileBrand';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const isStrongPassword = password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword;

  const handle = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('This password reset link is missing or invalid. Request a new link.');
      return;
    }
    if (!isStrongPassword || !passwordsMatch) return;
    setLoading(true);
    try {
      await api.resetPasswordWithToken(token, { password });
      toast.success('Password has been successfully reset. You can now sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password. The link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
      <AuthBrandingPanel>
          <h1 className="text-5xl font-black tracking-tight text-white mb-3">B-LIS</h1>
          <div className="h-1 w-20 bg-accent-400 rounded-full mb-6" />
          <h2 className="text-2xl font-bold text-primary-100 mb-4">Set New Password</h2>
          <p className="text-base text-primary-50/80 leading-relaxed">
            Create a secure password to protect your official municipal access credentials.
          </p>
      </AuthBrandingPanel>

      {/* Right Form Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex-1 lg:max-w-[500px] xl:max-w-[540px] flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-card border-l border-border relative"
      >
        <div className="w-full max-w-[380px]">
          <AuthMobileBrand />
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">New Password</h2>
            <p className="text-sm text-muted-foreground mt-1">Please enter a strong new password for your account.</p>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-foreground mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  id="reset-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-3 bg-background border border-input rounded-md text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                />
                <button
                  type="button"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Use at least 8 characters with uppercase and lowercase letters, a number, and a special character.
              </p>
            </div>

            <div>
              <label htmlFor="confirm-reset-password" className="block text-sm font-medium text-foreground mb-2">
                Confirm New Password
              </label>
              <input
                id="confirm-reset-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                aria-invalid={Boolean(confirmPassword) && !passwordsMatch}
                className="w-full px-3.5 py-3 bg-background border border-input rounded-md text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-destructive" role="alert">Passwords do not match.</p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading || !isStrongPassword || !passwordsMatch || !token}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground font-semibold text-sm rounded-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Key size={16} />
                  Reset Password
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
