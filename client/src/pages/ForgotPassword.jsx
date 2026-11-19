import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AuthBrandingPanel from '../components/features/AuthBrandingPanel';
import AuthMobileBrand from '../components/features/AuthMobileBrand';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword({ email });
      toast.success('Password reset link sent to your email.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
      <AuthBrandingPanel>
          <h1 className="text-5xl font-black tracking-tight text-white mb-3">B-LIS</h1>
          <div className="h-1 w-20 bg-accent-400 rounded-full mb-6" />
          <h2 className="text-2xl font-bold text-primary-100 mb-4">Account Recovery</h2>
          <p className="text-base text-primary-50/80 leading-relaxed">
            Enter your official municipal email address to verify your identity and receive password reset instructions.
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
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Forgot Password</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your registered email address to receive a recovery link.</p>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label htmlFor="recovery-email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-md text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground font-semibold text-sm rounded-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} />
                  Send Reset Link
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
