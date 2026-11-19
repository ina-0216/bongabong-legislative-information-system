import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Eye, EyeOff, LogIn, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AuthBrandingPanel from '../components/features/AuthBrandingPanel';
import AuthMobileBrand from '../components/features/AuthMobileBrand';
import { getPostLoginPath } from '../utils/routePermissions';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success('Welcome back! Signed in successfully.');
      navigate(getPostLoginPath(user, location.state?.from), { replace: true });
    } catch (err) {
      let message = err.message || 'Failed to sign in. Please check your credentials.';
      if (err.status === 401) {
        let health;
        try {
          health = await api.getHealth();
        } catch (healthError) {
          health = healthError.data;
        }
        if (health && (health.checks?.dataSource !== 'configured' || health.checks?.db !== 'ok')) {
          message = 'The sign-in service cannot reach the configured database. Contact the system administrator.';
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
      <AuthBrandingPanel>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <p className="text-sm font-semibold tracking-wide text-white/85 mb-3">B-LIS · Legislative records</p>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight tracking-tight text-white mb-5">
              Sangguniang Bayan of Bongabong
            </h1>
            <p className="text-base text-white/90 leading-relaxed max-w-lg">
              Manage ordinances, sessions, committees, and citizen consultations in one workspace.
            </p>
          </motion.div>
      </AuthBrandingPanel>

      {/* Right Login Form Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex-1 lg:max-w-[500px] xl:max-w-[540px] flex items-center justify-center p-6 sm:p-12 lg:p-14 bg-card border-l border-border relative"
      >
        <div className="w-full max-w-[380px]">
          <AuthMobileBrand />

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Continue with your official staff account.</p>
          </div>

          <form onSubmit={handle} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-md text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
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
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground font-semibold text-sm rounded-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
            {loading ? (
              <p role="status" aria-live="polite" className="text-center text-xs leading-relaxed text-muted-foreground">
                The service may take up to a minute to start after being inactive. Please wait while we sign you in.
              </p>
            ) : null}
          </form>

          <p className="mt-7 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
            For authorized personnel. Contact your system administrator if your account is not active.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
