import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { sendOtp, sendEmailVerification, verifyEmailCode, submitGuestForm } = vi.hoisted(() => ({
  sendOtp: vi.fn(),
  sendEmailVerification: vi.fn(),
  verifyEmailCode: vi.fn(),
  submitGuestForm: vi.fn(),
}));

vi.mock('../utils/api', () => ({
  api: { sendOtp, sendEmailVerification, verifyEmailCode, submitGuestForm },
}));

vi.mock('../components/v11/SelectField.jsx', () => ({
  default: ({ id, label, onValueChange, options }) => (
    <label htmlFor={id}>
      {label}
      <select id={id} aria-label={label} onChange={(event) => onValueChange(event.target.value)}>
        <option value="">Select Barangay</option>
        {options.map(({ value, label: optionLabel }) => (
          <option key={value} value={value}>{optionLabel}</option>
        ))}
      </select>
    </label>
  ),
}));

import GuestForm from '../components/GuestForm.jsx';
import { LanguageProvider } from '../context/LanguageContext.jsx';

if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn();

describe('public feedback email or SMS verification', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('verifies the email before submission without requiring an SMS OTP', async () => {
    const user = userEvent.setup();
    sendOtp.mockResolvedValue({});
    sendEmailVerification.mockResolvedValue({ message: 'Verification code sent' });
    verifyEmailCode.mockResolvedValue({ verificationToken: 'v'.repeat(43) });
    submitGuestForm.mockResolvedValue({ message: 'Submission received' });

    render(
      <LanguageProvider>
        <GuestForm ordinanceId="doc-3" ordinanceStatus="Public Consultation" />
      </LanguageProvider>,
    );

    expect(screen.getByLabelText('Email verification code *')).toBeInTheDocument();
    expect(screen.queryByLabelText('SMS verification code *')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send OTP' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use SMS OTP instead' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send email code' })).toHaveClass('justify-center', 'text-center');

    await user.type(screen.getByLabelText('Contact Number *'), '09171234567');
    await user.type(screen.getByLabelText('Email Address *'), 'resident@example.com');
    await user.click(screen.getByRole('button', { name: 'Send email code' }));
    await waitFor(() => expect(sendEmailVerification).toHaveBeenCalledWith('resident@example.com'));
    await user.type(screen.getByLabelText('Email verification code *'), '482913');
    await user.click(screen.getByRole('button', { name: 'Verify email' }));
    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith('resident@example.com', '482913'));
    await user.type(screen.getByLabelText('Full Name *'), 'Juan Dela Cruz');

    await user.selectOptions(screen.getByLabelText('Barangay'), 'Anilao');

    const idImage = new File(['image'], 'valid-id.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('#guest-id-image'), { target: { files: [idImage] } });
    await user.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: /submit feedback/i }).closest('form'));

    await waitFor(() => expect(submitGuestForm).toHaveBeenCalledTimes(1));
    const submittedData = submitGuestForm.mock.calls[0][1];
    expect(submittedData.get('email')).toBe('resident@example.com');
    expect(submittedData.get('emailVerificationToken')).toBe('v'.repeat(43));
    expect(submittedData.get('otp')).toBeNull();
    expect(submittedData.get('contact_number')).toBe('09171234567');
    expect(sendOtp).not.toHaveBeenCalled();
  });

  it('submits with SMS OTP alone and omits email verification fields', async () => {
    const user = userEvent.setup();
    sendOtp.mockResolvedValue({});
    submitGuestForm.mockResolvedValue({ message: 'Submission received' });
    render(
      <LanguageProvider>
        <GuestForm ordinanceId="doc-3" ordinanceStatus="Public Consultation" />
      </LanguageProvider>,
    );

    await user.type(screen.getByLabelText('Contact Number *'), '09171234567');
    await user.click(screen.getByRole('button', { name: 'Use SMS OTP instead' }));
    expect(screen.queryByLabelText('Email Address *')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email verification code *')).not.toBeInTheDocument();
    expect(screen.getByLabelText('SMS verification code *')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await waitFor(() => expect(sendOtp).toHaveBeenCalledWith('09171234567'));
    await user.type(screen.getByLabelText('SMS verification code *'), '482913');
    await user.type(screen.getByLabelText('Full Name *'), 'Juan Dela Cruz');
    await user.selectOptions(screen.getByLabelText('Barangay'), 'Anilao');
    const idImage = new File(['image'], 'valid-id.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('#guest-id-image'), { target: { files: [idImage] } });
    await user.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: /submit feedback/i }).closest('form'));

    await waitFor(() => expect(submitGuestForm).toHaveBeenCalledTimes(1));
    const submittedData = submitGuestForm.mock.calls[0][1];
    expect(submittedData.get('otp')).toBe('482913');
    expect(submittedData.get('email')).toBeNull();
    expect(submittedData.get('emailVerificationToken')).toBeNull();
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it('clears each method verification when switching back and forth', async () => {
    const user = userEvent.setup();
    sendEmailVerification.mockResolvedValue({});
    verifyEmailCode.mockResolvedValue({ verificationToken: 'v'.repeat(43) });
    render(
      <LanguageProvider>
        <GuestForm ordinanceId="doc-3" ordinanceStatus="Public Consultation" />
      </LanguageProvider>,
    );

    await user.type(screen.getByLabelText('Email Address *'), 'resident@example.com');
    await user.click(screen.getByRole('button', { name: 'Send email code' }));
    await user.type(screen.getByLabelText('Email verification code *'), '482913');
    await user.click(screen.getByRole('button', { name: 'Verify email' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Email verified' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Use SMS OTP instead' }));
    expect(screen.queryByLabelText('Email Address *')).not.toBeInTheDocument();
    expect(screen.getByLabelText('SMS verification code *')).toHaveValue('');
    await user.type(screen.getByLabelText('SMS verification code *'), '123456');
    await user.click(screen.getByRole('button', { name: 'Use email verification instead' }));

    expect(screen.getByLabelText('Email verification code *')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send email code' })).toBeInTheDocument();
    expect(screen.queryByLabelText('SMS verification code *')).not.toBeInTheDocument();
  });
});
