import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import SelectField from './v11/SelectField';
import { CheckCircle2, ShieldCheck, UploadCloud, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, Input, Textarea, Button, Alert } from '@ibosys/ui';
import { useLanguage } from '../context/LanguageContext';
import { isPhotoUploadWithinLimit, PHOTO_UPLOAD_SIZE_ERROR } from '@ibosys/api';
import { sanitizeGuestPayload } from '../utils/sanitizeHtml';

const BARANGAYS = [
  'Anilao', 'Aplaya', 'Bagumbayan I', 'Bagumbayan II', 'Batangan', 'Bukal',
  'Camantigue', 'Carmundo', 'Cawayan', 'Dayhagan', 'Formon', 'Hagan',
  'Hagupit', 'Ipil', 'Kaligtasan', 'Labasan', 'Labonan', 'Libertad',
  'Lisap', 'Luna', 'Malitbog', 'Mapang', 'Masaguisi', 'Mina de Oro',
  'Morente', 'Ogbot', 'Orconuma', 'Poblacion', 'Polusahi', 'Sagana',
  'San Isidro', 'San Jose', 'San Juan', 'Santa Cruz', 'Sigange', 'Tawas',
];

// `value` is the API contract and stays English: it is what gets POSTed and what
// the tally is keyed by. `labelKey` is what the visitor reads, so it is
// translated. Keeping the two separate is what lets the wire format remain
// stable while the interface is localised.
const VOTE_OPTIONS = [
  // The selected option tints its label with the same hue as its fill, so the text
// needs a darker step of that hue than the swatch does: success-600 on
// success-50 measured 3.58:1. This is the label only; the unselected options
// inherit --ibosys-text-secondary and already clear the threshold comfortably.
{ value: 'Agree', labelKey: 'voteAgree', icon: ThumbsUp, colorClass: 'text-[var(--ibosys-success-700)]', bgClass: 'bg-[var(--ibosys-success-50)]', borderClass: 'border-[var(--ibosys-success-200)]' },
  { value: 'Neutral', labelKey: 'voteNeutral', icon: Minus, colorClass: 'text-[var(--ibosys-text-secondary)]', bgClass: 'bg-[var(--ibosys-neutral-100)]', borderClass: 'border-[var(--ibosys-border-default)]' },
  { value: 'Disagree', labelKey: 'voteDisagree', icon: ThumbsDown, colorClass: 'text-[var(--ibosys-danger-600)]', bgClass: 'bg-[var(--ibosys-danger-50)]', borderClass: 'border-[var(--ibosys-danger-200)]' },
];

const VERIFICATION_METHODS = { EMAIL: 'email', SMS: 'sms' };

const publicApiBase = () => {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
  if (!configured) return 'http://localhost:5001/api/public';
  return configured.endsWith('/public') ? configured : `${configured}/public`;
};

const readReceipt = (ordinanceId) => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(`ibosys:consultation-receipt:${ordinanceId}`) || 'null');
  } catch {
    return null;
  }
};

const saveReceipt = (ordinanceId, receipt) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`ibosys:consultation-receipt:${ordinanceId}`, JSON.stringify(receipt));
  } catch {
    // Keep the receipt available in the current view even when browser storage is disabled.
  }
};

export default function GuestForm({ ordinanceId, ordinanceStatus, onSubmitted }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    contact_number: '',
    email: '',
    full_name: '',
    barangay: '',
    vote: 'Agree',
    comment: '',
    data_privacy_consent: false,
  });

  const [idImage, setIdImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [testOtp, setTestOtp] = useState('');
  const [verificationMethod, setVerificationMethod] = useState(VERIFICATION_METHODS.EMAIL);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [success, setSuccess] = useState(false);
  const [receipt, setReceipt] = useState(() => readReceipt(ordinanceId));
  const [receiptStatus, setReceiptStatus] = useState(null);
  const [receiptError, setReceiptError] = useState('');
  const [appealTarget, setAppealTarget] = useState('eligibility');
  const [appealReason, setAppealReason] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setReceipt(readReceipt(ordinanceId));
    setReceiptStatus(null);
    setReceiptError('');
  }, [ordinanceId]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    if (name === 'contact_number') {
      const sanitized = value.replace(/\D/g, '').slice(0, 11);
      setFormData((current) => ({ ...current, [name]: sanitized }));
      if (sanitized !== formData.contact_number) {
        setOtp('');
        setOtpSent(false);
        setTestOtp('');
      }
      return;
    }

    if (name === 'email') {
      const nextEmail = value.slice(0, 254);
      setFormData((current) => ({ ...current, email: nextEmail }));
      setEmailCode('');
      setEmailCodeSent(false);
      setEmailVerificationToken('');
      setErrors((current) => ({ ...current, email: '', emailVerification: '' }));
      return;
    }

    const finalValue = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: finalValue });

    // Clear error on change
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const switchVerificationMethod = () => {
    setVerificationMethod((current) => current === VERIFICATION_METHODS.EMAIL
      ? VERIFICATION_METHODS.SMS
      : VERIFICATION_METHODS.EMAIL);
    setOtp('');
    setOtpSent(false);
    setTestOtp('');
    setEmailCode('');
    setEmailCodeSent(false);
    setEmailVerificationToken('');
    setErrors((current) => ({ ...current, email: '', otp: '', emailVerification: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.full_name.trim().length < 3) {
      newErrors.full_name = 'Full name must be at least 3 characters';
    }
    if (!formData.contact_number || !/^09\d{9}$/.test(formData.contact_number)) {
      newErrors.contact_number = 'Please enter a valid 11-digit mobile number (09xxxxxxxxx)';
    }
    if (verificationMethod === VERIFICATION_METHODS.EMAIL) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = t('guestEmailInvalid');
      }
      if (!emailVerificationToken) {
        newErrors.emailVerification = t('guestEmailVerificationRequired');
      }
    } else if (!otpSent || !/^\d{6}$/.test(otp)) {
      newErrors.otp = t('guestOtpInvalid');
    }
    if (!formData.barangay) {
      newErrors.barangay = 'Please select a barangay';
    }
    if (!idImage) {
      newErrors.idImage = 'Valid ID image is required';
    }
    if (ordinanceStatus !== 'Public Consultation' && formData.comment.trim().length < 5) {
      newErrors.comment = 'Feedback must be at least 5 characters';
    }
    if (!formData.data_privacy_consent) {
      newErrors.data_privacy_consent = 'You must agree to the Data Privacy terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendEmailCode = async () => {
    const email = formData.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((current) => ({ ...current, email: t('guestEmailInvalid') }));
      return;
    }
    if (emailCodeLoading) return;
    setEmailCodeLoading(true);
    setEmailCodeSent(false);
    setEmailCode('');
    setEmailVerificationToken('');
    try {
      await api.sendEmailVerification(email);
      setEmailCodeSent(true);
      setErrors((current) => ({ ...current, emailVerification: '' }));
      toast.success(t('guestEmailCodeSent'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('guestEmailCodeSendFailed'));
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!emailCodeSent || !/^\d{6}$/.test(emailCode) || emailVerifyLoading) return;
    setEmailVerifyLoading(true);
    try {
      const response = await api.verifyEmailCode(formData.email.trim(), emailCode);
      setEmailVerificationToken(response.verificationToken || '');
      setErrors((current) => ({ ...current, emailVerification: '' }));
      toast.success(t('guestEmailVerified'));
    } catch (err) {
      setEmailVerificationToken('');
      toast.error(err instanceof Error ? err.message : t('guestEmailVerifyFailed'));
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!/^09\d{9}$/.test(formData.contact_number)) {
      setErrors((current) => ({ ...current, contact_number: t('guestOtpContactInvalid') }));
      return;
    }
    if (otpLoading) return;

    setOtpLoading(true);
    setOtpSent(false);
    setOtp('');
    setTestOtp('');
    try {
      const response = await api.sendOtp(formData.contact_number);
      setOtpSent(true);
      if (response?.testOtp) setTestOtp(response.testOtp);
      setErrors((current) => ({ ...current, otp: '' }));
      toast.success(response?.testOtp ? t('guestOtpTestReady') : t('guestOtpSent'));
    } catch (err) {
      setOtpSent(false);
      toast.error(err instanceof Error ? err.message : t('guestOtpSendFailed'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Sanitize all text payload fields before submission
    const sanitized = sanitizeGuestPayload(formData);
    setFormData(sanitized);

    setLoading(true);

    const submitData = new FormData();
    Object.entries(sanitized).forEach(([key, value]) => {
      if (key !== 'email' || verificationMethod === VERIFICATION_METHODS.EMAIL) {
        submitData.append(key, value);
      }
    });
    if (verificationMethod === VERIFICATION_METHODS.SMS) submitData.append('otp', otp);
    if (verificationMethod === VERIFICATION_METHODS.EMAIL) {
      submitData.append('emailVerificationToken', emailVerificationToken);
    }
    if (idImage) submitData.append('idImage', idImage);

    try {
      const res = await api.submitGuestForm(ordinanceId, submitData);
      toast.success(res.message || 'Submission received!');
      try {
        await onSubmitted?.();
      } catch (refreshError) {
        console.error('[GuestForm] Could not refresh the public vote totals:', refreshError);
      }
      if (res.feedbackId && res.appealToken) {
        const nextReceipt = { feedbackId: res.feedbackId, token: res.appealToken };
        saveReceipt(ordinanceId, nextReceipt);
        setReceipt(nextReceipt);
      }
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkReceiptStatus = async () => {
    if (!receipt) return;
    setReceiptError('');
    try {
      const response = await fetch(`${publicApiBase()}/consult/${ordinanceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: receipt.feedbackId, token: receipt.token }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to check submission status.');
      setReceiptStatus(body);
      if (body.eligibilityStatus === 'Rejected') setAppealTarget('eligibility');
      else if (body.commentStatus === 'Rejected') setAppealTarget('comment');
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : 'Unable to check submission status.');
    }
  };

  const submitAppeal = async (event) => {
    event.preventDefault();
    if (!receipt || appealReason.trim().length < 8) return;
    setAppealLoading(true);
    setReceiptError('');
    try {
      const response = await fetch(`${publicApiBase()}/consult/${ordinanceId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: receipt.feedbackId,
          token: receipt.token,
          target: appealTarget,
          reason: appealReason.trim(),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to submit your appeal.');
      setAppealReason('');
      await checkReceiptStatus();
      toast.success(body.message || 'Appeal submitted for independent review.');
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : 'Unable to submit your appeal.');
    } finally {
      setAppealLoading(false);
    }
  };

  const receiptPanel = receipt && (
    <div className="space-y-3 rounded-[var(--ibosys-radius-md)] border border-[var(--ibosys-border-default)] p-4 text-left" aria-live="polite">
      <div>
        <h4 className="font-semibold text-[var(--ibosys-text-primary)]">{t('guestReceiptHeading')}</h4>
        <p className="text-[var(--ibosys-text-sm)] text-[var(--ibosys-text-secondary)]">{t('guestReceiptInstructions')}</p>
      </div>
      <code className="block break-all rounded bg-[var(--ibosys-surface-secondary)] p-2 text-xs">{receipt.token}</code>
      <button type="button" onClick={checkReceiptStatus} className="rounded border border-[var(--ibosys-border-default)] px-3 py-2 text-sm font-medium">
        {t('guestCheckStatus')}
      </button>
      {receiptStatus && (
        <div className="text-sm text-[var(--ibosys-text-secondary)]">
          <p>{t('guestEligibilityStatus')}: <strong>{receiptStatus.eligibilityStatus}</strong></p>
          <p>{t('guestCommentStatus')}: <strong>{receiptStatus.commentStatus}</strong></p>
          {receiptStatus.eligibilityDecision && <p className="mt-2">{t('guestDecisionReason')}: {receiptStatus.eligibilityDecision}</p>}
          {receiptStatus.commentDecision && <p className="mt-2">{t('guestDecisionReason')}: {receiptStatus.commentDecision}</p>}
          {(receiptStatus.eligibilityStatus === 'Rejected' || receiptStatus.commentStatus === 'Rejected') && (
            <form onSubmit={submitAppeal} className="mt-3 space-y-2">
              {receiptStatus.eligibilityStatus === 'Rejected' && receiptStatus.commentStatus === 'Rejected' && (
                <select value={appealTarget} onChange={(event) => setAppealTarget(event.target.value)} className="w-full rounded border border-[var(--ibosys-border-default)] p-2">
                  <option value="eligibility">{t('guestEligibilityStatus')}</option>
                  <option value="comment">{t('guestCommentStatus')}</option>
                </select>
              )}
              <label className="block text-sm font-medium" htmlFor={`appeal-reason-${ordinanceId}`}>{t('guestAppealReason')}</label>
              <textarea id={`appeal-reason-${ordinanceId}`} value={appealReason} onChange={(event) => setAppealReason(event.target.value)} minLength={8} maxLength={1000} required rows={3} className="w-full rounded border border-[var(--ibosys-border-default)] p-2" />
              <button type="submit" disabled={appealLoading} className="rounded bg-[var(--ibosys-primary-500)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {appealLoading ? t('guestAppealSending') : t('guestSubmitAppeal')}
              </button>
            </form>
          )}
        </div>
      )}
      {receiptError && <p role="alert" className="text-sm text-[var(--ibosys-danger-600)]">{receiptError}</p>}
    </div>
  );

  if (success) {
    return (
      <Alert variant="success" title={t('guestFeedbackSubmittedTitle')} className="p-6 text-center">
        <CheckCircle2 size={56} className="text-[var(--ibosys-success-600)] mb-4 mx-auto" />
        <p className="mx-auto max-w-sm text-[var(--ibosys-text-secondary)]">{t('guestFeedbackPending')}</p>
        {receiptPanel}
      </Alert>
    );
  }

  return (
    <Card variant="outlined" padding="md" className="guest-form-card flex flex-col gap-6">
      {!success && receiptPanel}
      {/* Header */}
      <div className="border-b border-[var(--ibosys-border-default)] pb-4">
        <h3 className="flex items-start gap-2 text-[var(--ibosys-text-2xl)] font-semibold text-[var(--ibosys-text-primary)] mb-1">
          <ShieldCheck size={24} className="mt-0.5 shrink-0 text-[var(--ibosys-primary-500)]" />
          {ordinanceStatus === 'Public Consultation' ? t('participateInConsultation') : t('submitFeedbackHeading')}
        </h3>
        <p className="text-[var(--ibosys-text-sm)] text-[var(--ibosys-text-tertiary)]">
          {t('guestFormLede')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Personal Information Section */}
        <div className="space-y-4 p-4 bg-[var(--ibosys-surface-secondary)] rounded-[var(--ibosys-radius-md)]">
          <h4 className="text-[var(--ibosys-text-sm)] font-semibold text-[var(--ibosys-text-primary)] uppercase tracking-wider border-b border-[var(--ibosys-border-default)] pb-2">
            {t('personalInformationHeading')}
          </h4>

          <Button type="button" variant="secondary" className="w-fit" onClick={switchVerificationMethod} disabled={otpLoading || emailCodeLoading || emailVerifyLoading}>
            {verificationMethod === VERIFICATION_METHODS.EMAIL ? t('guestUseSmsOtp') : t('guestUseEmailVerification')}
          </Button>

          <div className="guest-form-grid">
            <Input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              label={t('guestFullNameLabel')}
              placeholder={t('guestNamePlaceholder')}
              error={errors.full_name}
              required
              minLength={3}
              maxLength={100}
            />

            <Input
              name="contact_number"
              type="tel"
              value={formData.contact_number}
              onChange={handleChange}
              label={t('guestContactLabel')}
              placeholder={t('guestContactPlaceholder')}
              error={errors.contact_number}
              required
              pattern="^09\d{9}$"
              maxLength={11}
            />

            {verificationMethod === VERIFICATION_METHODS.EMAIL ? <>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              label={t('guestEmailLabel')}
              placeholder={t('guestEmailPlaceholder')}
              error={errors.email}
              required
              maxLength={254}
              autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="guest-email-code" className="text-[var(--ibosys-text-sm)] font-medium text-[var(--ibosys-text-primary)]">
                {t('guestEmailCodeLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id="guest-email-code"
                  name="emailCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('guestEmailCodePlaceholder')}
                  maxLength={6}
                  disabled={!emailCodeSent || !!emailVerificationToken}
                  aria-invalid={!!errors.emailVerification}
                  aria-describedby={errors.emailVerification ? 'guest-email-verification-error' : undefined}
                  className="min-w-0 flex-1 rounded-[var(--ibosys-radius-md)] border border-[var(--ibosys-border-default)] bg-[var(--ibosys-surface-primary)] px-3 py-2 text-[var(--ibosys-text-sm)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ibosys-border-focus)]"
                />
                <Button type="button" variant="secondary" className="min-w-[9.5rem] shrink-0 justify-center text-center whitespace-nowrap" onClick={handleSendEmailCode} loading={emailCodeLoading} disabled={emailCodeLoading || !!emailVerificationToken}>
                  {emailVerificationToken ? t('guestEmailVerified') : emailCodeLoading ? t('guestEmailSending') : emailCodeSent ? t('guestEmailResend') : t('guestEmailSendCode')}
                </Button>
              </div>
              {emailCodeSent && !emailVerificationToken && (
                <Button type="button" variant="secondary" onClick={handleVerifyEmailCode} loading={emailVerifyLoading} disabled={emailCode.length !== 6 || emailVerifyLoading}>
                  {emailVerifyLoading ? t('guestEmailVerifying') : t('guestEmailVerifyCode')}
                </Button>
              )}
              {errors.emailVerification && <p id="guest-email-verification-error" className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-danger-600)]" role="alert">{errors.emailVerification}</p>}
            </div>
            </> : <div className="flex flex-col gap-1.5">
              <label htmlFor="guest-otp" className="text-[var(--ibosys-text-sm)] font-medium text-[var(--ibosys-text-primary)]">
                {t('guestOtpRequiredLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id="guest-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                    if (errors.otp) setErrors((current) => ({ ...current, otp: '' }));
                  }}
                  placeholder={t('guestOtpPlaceholder')}
                  maxLength={6}
                  aria-invalid={!!errors.otp}
                  aria-describedby={errors.otp ? 'guest-otp-error' : undefined}
                  className="min-w-0 flex-1 rounded-[var(--ibosys-radius-md)] border border-[var(--ibosys-border-default)] bg-[var(--ibosys-surface-primary)] px-3 py-2 text-[var(--ibosys-text-sm)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ibosys-border-focus)]"
                />
                <Button type="button" variant="secondary" className="min-w-[9.5rem] shrink-0 justify-center text-center whitespace-nowrap" onClick={handleSendOtp} loading={otpLoading}>
                  {otpLoading ? t('guestOtpSending') : otpSent ? t('guestOtpResend') : t('guestOtpSend')}
                </Button>
              </div>
              {errors.otp && <p id="guest-otp-error" className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-danger-600)]" role="alert">{errors.otp}</p>}
              {testOtp && <p className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-text-secondary)]" role="status">{t('guestOtpDevelopmentHint')} <strong>{testOtp}</strong></p>}
            </div>}
          </div>

          <div className="guest-form-grid">
            <SelectField
              id="barangay"
              name="barangay"
              label={t('guestBarangayLabel')}
              labelClassName="block text-[var(--ibosys-text-sm)] font-medium text-[var(--ibosys-text-primary)]"
              required
              allLabel={t('guestBarangayPrompt')}
              value={formData.barangay}
              onValueChange={(next) => handleChange({ target: { name: 'barangay', value: next } })}
              options={BARANGAYS.map((barangay) => ({ value: barangay, label: barangay }))}
              error={errors.barangay}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="guest-id-image" className="text-[var(--ibosys-text-sm)] font-medium text-[var(--ibosys-text-primary)]">
                {t('guestValidIdLabel')}
              </label>
              <div className="relative">
                <input
                  id="guest-id-image"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && !isPhotoUploadWithinLimit(file)) {
                      setIdImage(null);
                      setErrors((current) => ({ ...current, idImage: PHOTO_UPLOAD_SIZE_ERROR }));
                      e.target.value = '';
                      return;
                    }
                    setIdImage(file);
                    if (errors.idImage) setErrors((current) => ({ ...current, idImage: '' }));
                  }}
                  accept="image/*"
                  required
                  className={`
                    w-full px-3 py-1.5 bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)]
                    rounded-[var(--ibosys-radius-md)] focus-visible:outline-none focus-visible:ring-1
                    focus-visible:ring-[var(--ibosys-border-focus)] focus-visible:border-[var(--ibosys-border-focus)]
                    text-[var(--ibosys-text-sm)] text-[var(--ibosys-text-tertiary)]
                    file:mr-4 file:py-1 file:px-3 file:rounded file:border-0
                    file:text-[var(--ibosys-text-xs)] file:font-semibold
                    file:bg-[var(--ibosys-surface-secondary)] file:text-[var(--ibosys-primary-500)]
                    hover:file:bg-[var(--ibosys-neutral-200)] cursor-pointer
                    ${errors.idImage ? 'border-[var(--ibosys-danger-500)]' : ''}
                  `}
                />
              </div>
              <p className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-text-tertiary)]">{t('maximumPhotoSize')}</p>
              {errors.idImage && (
                <p className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-danger-600)]" role="alert">
                  {errors.idImage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="guest-feedback-section space-y-4 p-4 bg-[var(--ibosys-surface-secondary)] rounded-[var(--ibosys-radius-md)]">
          <h4 className="text-[var(--ibosys-text-sm)] font-semibold text-[var(--ibosys-text-primary)] uppercase tracking-wider border-b border-[var(--ibosys-border-default)] pb-2">
            {t('yourFeedbackHeading')}
          </h4>

          {ordinanceStatus === 'Public Consultation' && (
            <div>
              <label className="block text-[var(--ibosys-text-sm)] font-semibold text-[var(--ibosys-text-primary)] mb-2">
                {t('yourVoteLabel')}
              </label>
              <div className="guest-vote-options" role="radiogroup" aria-label={t('ariaVoteOptions')}>
                {VOTE_OPTIONS.map(({ value, labelKey, icon: Icon, colorClass, bgClass, borderClass }) => {
                  const isSelected = formData.vote === value;
                  return (
                    <label
                      key={value}
                      className={`guest-vote-option
                        flex items-center justify-center gap-2 rounded-[var(--ibosys-radius-md)]
                        border cursor-pointer transition-colors
                        ${isSelected
                          ? `${bgClass} ${borderClass} ${colorClass} shadow-sm ring-2 ring-inset`
                          : 'bg-[var(--ibosys-surface-primary)] border-[var(--ibosys-border-default)] text-[var(--ibosys-text-secondary)] hover:bg-[var(--ibosys-surface-tertiary)]'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="vote"
                        value={value}
                        checked={isSelected}
                        onChange={handleChange}
                        className="sr-only"
                        aria-label={t(labelKey)}
                      />
                      <Icon size={16} className={isSelected ? colorClass : 'text-[var(--ibosys-text-tertiary)]'} />
                      <span className={`text-[var(--ibosys-text-sm)] font-semibold ${isSelected ? 'font-bold' : 'font-medium'}`}>
                        {t(labelKey)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <Textarea
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            label={t('guestCommentLabel')}
            placeholder={t('guestFeedbackPlaceholder')}
            rows={4}
            error={errors.comment}
            required={ordinanceStatus !== 'Public Consultation'}
            minLength={ordinanceStatus !== 'Public Consultation' ? 5 : 0}
            maxLength={1000}
            helperText={ordinanceStatus === 'Public Consultation' ? t('optionalForConsultation') : undefined}
          />
        </div>

        {/* Consent & Submit */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 bg-[var(--ibosys-surface-secondary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-md)] cursor-pointer hover:bg-[var(--ibosys-neutral-100)] transition-colors">
            <input
              type="checkbox"
              name="data_privacy_consent"
              checked={formData.data_privacy_consent}
              onChange={handleChange}
              // shrink-0 is load-bearing: the label is a flex row and the consent sentence is
// long, so the checkbox was being flex-shrunk from 24px to 13px wide while
// keeping its height. It now holds a 24x24 target, which is the WCAG 2.2 SC
// 2.5.8 minimum.
className="mt-1 w-6 h-6 shrink-0 text-[var(--ibosys-primary-500)] bg-[var(--ibosys-surface-primary)] border-[var(--ibosys-border-default)] rounded focus-visible:ring-2 focus-visible:ring-[var(--ibosys-primary-500)]"
              aria-invalid={!!errors.data_privacy_consent}
            />
            <span className="text-[var(--ibosys-text-sm)] text-[var(--ibosys-text-secondary)] leading-relaxed">
              {t('dataPrivacyConsent')}
            </span>
          </label>

          {errors.data_privacy_consent && (
            <p className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-danger-600)] ml-9" role="alert">
              {errors.data_privacy_consent}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full text-[var(--ibosys-text-inverse)]"
          >
            {!loading && <UploadCloud size={18} aria-hidden="true" />}
            {loading ? t('submittingFeedback') : t('submitFeedback')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
