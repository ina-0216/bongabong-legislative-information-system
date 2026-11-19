import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../src/utils/api';
import type { ConsultationReceipt, ConsultationReviewStatus, PublicDocument } from '../src/utils/api';
import { BONGABONG_BARANGAYS } from '../src/utils/barangays';
import { guestFeedbackFields, validateFeedback } from '../src/utils/selectors';
import { Card, SectionHeading, colors } from './_ui';

const VOTES = ['Agree', 'Neutral', 'Disagree'] as const;
type Vote = (typeof VOTES)[number];
type VerificationMethod = 'email' | 'sms';

interface FormState {
  full_name: string;
  barangay: string;
  contact_number: string;
  email: string;
  otp: string;
  comment: string;
}

const EMPTY: FormState = {
  full_name: '',
  barangay: '',
  contact_number: '',
  email: '',
  otp: '',
  comment: '',
};

export default function FeedbackScreen() {
  const params = useLocalSearchParams<{ ordinanceId?: string | string[] }>();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [vote, setVote] = useState<Vote>('Agree');
  const routeOrdinanceId = Array.isArray(params.ordinanceId)
    ? params.ordinanceId[0]
    : params.ordinanceId;
  const [ordinanceId, setOrdinanceId] = useState(routeOrdinanceId ?? '');
  const [idImage, setIdImage] = useState<DocumentPickerAsset | null>(null);
  const [document, setDocument] = useState<PublicDocument | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('email');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [barangayPickerOpen, setBarangayPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [receipt, setReceipt] = useState<ConsultationReceipt | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ConsultationReviewStatus | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealTarget, setAppealTarget] = useState<'eligibility' | 'comment'>('eligibility');
  const [appealBusy, setAppealBusy] = useState(false);

  useEffect(() => {
    if (!routeOrdinanceId) return;
    let active = true;
    setOrdinanceId(routeOrdinanceId);
    setDocumentLoading(true);
    setDocumentError(null);
    api.getDocumentDetail(routeOrdinanceId)
      .then((found) => {
        if (!active) return;
        if (found.type !== 'Ordinance') {
          setDocument(null);
          setDocumentError('Public feedback is available for Ordinances only.');
          return;
        }
        setDocument(found);
      })
      .catch((error) => {
        if (!active) return;
        setDocument(null);
        setDocumentError(error instanceof Error ? error.message : 'Could not load this ordinance.');
      })
      .finally(() => {
        if (active) setDocumentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [routeOrdinanceId]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'contact_number' ? { otp: '' } : {}),
    }));
    if (key === 'contact_number') {
      setOtpSent(false);
      setTestOtp(null);
    }
    if (key === 'email') {
      setEmailCode('');
      setEmailCodeSent(false);
      setEmailVerificationToken('');
    }
  };

  const switchVerificationMethod = () => {
    setVerificationMethod((current) => current === 'email' ? 'sms' : 'email');
    setForm((current) => ({ ...current, otp: '' }));
    setOtpSent(false);
    setTestOtp(null);
    setEmailCode('');
    setEmailCodeSent(false);
    setEmailVerificationToken('');
  };

  const checkOrdinance = async () => {
    const id = ordinanceId.trim();
    if (!id) {
      setDocumentError('Enter an ordinance ID first.');
      return;
    }
    if (!/^[a-f\d]{24}$/i.test(id)) {
      setDocumentError('Enter a valid 24-character ordinance ID.');
      return;
    }
    setDocumentLoading(true);
    setDocumentError(null);
    try {
      const found = await api.getDocumentDetail(id);
      if (found.type !== 'Ordinance') {
        setDocument(null);
        setDocumentError('Public feedback is available for Ordinances only.');
        return;
      }
      setOrdinanceId(id);
      setDocument(found);
    } catch (error) {
      setDocument(null);
      setDocumentError(error instanceof Error ? error.message : 'Could not load this ordinance.');
    } finally {
      setDocumentLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!/^09\d{9}$/.test(form.contact_number)) {
      Alert.alert('Valid mobile number required', 'Enter an 11-digit number starting with 09.');
      return;
    }
    if (otpLoading) return;
    setOtpLoading(true);
    setTestOtp(null);
    try {
      const response = await api.sendOtp(form.contact_number);
      setOtpSent(true);
      if (response.testOtp) {
        setTestOtp(response.testOtp);
        Alert.alert('Test OTP ready', 'No SMS was sent. Use the development-only code shown below the OTP field.');
      } else {
        Alert.alert('OTP requested', 'The message was accepted for delivery. It should arrive shortly.');
      }
    } catch (error) {
      setOtpSent(false);
      Alert.alert('Unable to send OTP', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const sendEmailCode = async () => {
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      Alert.alert('Valid email required', 'Enter a valid email address up to 254 characters.');
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
      Alert.alert('Verification code sent', 'Check your email for the 6-digit code.');
    } catch (error) {
      Alert.alert('Unable to send email code', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!emailCodeSent || !/^\d{6}$/.test(emailCode) || emailVerifyLoading) return;
    setEmailVerifyLoading(true);
    try {
      const response = await api.verifyEmailCode(form.email.trim(), emailCode);
      if (!response.verificationToken) throw new Error('Email verification did not return a valid token.');
      setEmailVerificationToken(response.verificationToken);
      Alert.alert('Email verified', 'You can now submit your feedback.');
    } catch (error) {
      setEmailVerificationToken('');
      Alert.alert('Unable to verify email', error instanceof Error ? error.message : 'Please check the code and try again.');
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const chooseId = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > 25 * 1024 * 1024) {
          Alert.alert('Image is too large', 'Choose an image that is 25 MB or smaller.');
          return;
        }
        const extension = asset.name.split('.').pop()?.toLowerCase();
        const mimeType = (asset.mimeType || ({
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
        } as Record<string, string>)[extension ?? ''])?.toLowerCase();
        if (!mimeType || !['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType.toLowerCase())) {
          Alert.alert('Unsupported image', 'Choose a JPEG, PNG, WebP, or GIF image.');
          return;
        }
        setIdImage({ ...asset, mimeType });
      }
    } catch (error) {
      Alert.alert('Unable to choose image', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const submit = async () => {
    // `image` is captured so TypeScript can narrow it after validation; the
    // `!image` branch is defensive only.
    const image = idImage;
    const selectedDocument = document;
    const problem = validateFeedback({
      ordinanceId,
      draft: form,
      verificationMethod,
      otpSent,
      emailVerificationToken,
      hasIdImage: Boolean(image),
      hasPrivacyConsent: privacyConsent,
      documentType: selectedDocument?.type ?? null,
      ordinanceStatus: selectedDocument?.status ?? null,
    });
    if (problem || !image) {
      Alert.alert('Complete the form', problem ?? 'A valid ID image is required.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      const fields = guestFeedbackFields(
        form,
        vote,
        selectedDocument?.status ?? '',
        privacyConsent,
        verificationMethod,
        emailVerificationToken,
      );
      Object.entries(fields).forEach(([key, value]) => body.append(key, value));
      body.append('idImage', {
        uri: image.uri,
        name: image.name || 'valid-id.jpg',
        type: image.mimeType || 'image/jpeg',
      } as unknown as Blob);
      const response = await api.submitGuestConsultation(ordinanceId, body);
      if (response.feedbackId && response.appealToken) {
        setReceipt({ feedbackId: response.feedbackId, token: response.appealToken });
      }
      setDone(true);
    } catch (error) {
      Alert.alert('Submission failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const checkReviewStatus = async () => {
    if (!receipt) return;
    try {
      const status = await api.getGuestConsultationStatus(ordinanceId, receipt);
      setReviewStatus(status);
      if (status.eligibilityStatus === 'Rejected') setAppealTarget('eligibility');
      else if (status.commentStatus === 'Rejected') setAppealTarget('comment');
    } catch (error) {
      Alert.alert('Status unavailable', error instanceof Error ? error.message : 'Please check the reference code and try again.');
    }
  };

  const submitAppeal = async () => {
    if (!receipt || appealReason.trim().length < 8 || !reviewStatus) return;
    setAppealBusy(true);
    try {
      await api.appealGuestConsultation(ordinanceId, receipt, appealTarget, appealReason.trim());
      setAppealReason('');
      await checkReviewStatus();
      Alert.alert('Appeal submitted', 'Your appeal has been sent for independent review.');
    } catch (error) {
      Alert.alert('Appeal not submitted', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setAppealBusy(false);
    }
  };

  if (done) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="feedback-done">
        <Card>
          <Text style={styles.doneTitle}>Feedback submitted successfully</Text>
          <Text style={styles.muted}>
            Your vote and any comment are published now. Your identity details remain private to authorized staff. Keep the private reference below to check status or appeal a later moderation decision.
          </Text>
          {receipt && (
            <View style={styles.receiptBox}>
              <Text style={styles.receiptLabel}>Private appeal reference</Text>
              <Text selectable style={styles.receiptCode} testID="appeal-reference">{receipt.token}</Text>
              <Pressable style={styles.secondaryButton} onPress={checkReviewStatus} testID="check-review-status">
                <Text style={styles.secondaryButtonText}>Check submission status</Text>
              </Pressable>
              {reviewStatus && (
                <View style={styles.reviewStatus} testID="review-status">
                  <Text style={styles.muted}>Participation eligibility: {reviewStatus.eligibilityStatus}</Text>
                  <Text style={styles.muted}>Comment status: {reviewStatus.commentStatus}</Text>
                  {reviewStatus.eligibilityDecision ? <Text style={styles.muted}>Eligibility reason: {reviewStatus.eligibilityDecision}</Text> : null}
                  {reviewStatus.commentDecision ? <Text style={styles.muted}>Comment reason: {reviewStatus.commentDecision}</Text> : null}
                  {(reviewStatus.eligibilityStatus === 'Rejected' || reviewStatus.commentStatus === 'Rejected') && (
                    <View style={styles.appealForm}>
                      {reviewStatus.eligibilityStatus === 'Rejected' && reviewStatus.commentStatus === 'Rejected' && (
                        <View style={styles.voteRow}>
                          {(['eligibility', 'comment'] as const).map((target) => (
                            <Pressable key={target} onPress={() => setAppealTarget(target)} style={[styles.voteChip, appealTarget === target && styles.voteChipActive]}>
                              <Text style={[styles.voteText, appealTarget === target && styles.voteTextActive]}>{target === 'eligibility' ? 'Eligibility' : 'Comment'}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      <Text style={styles.receiptLabel}>Appeal reason (at least 8 characters)</Text>
                      <TextInput value={appealReason} onChangeText={setAppealReason} multiline maxLength={1000} style={styles.input} testID="appeal-reason" />
                      <Pressable style={[styles.primaryButton, appealBusy && styles.disabled]} disabled={appealBusy || appealReason.trim().length < 8} onPress={submitAppeal} testID="submit-appeal">
                        <Text style={styles.primaryButtonText}>{appealBusy ? 'Submitting appeal…' : 'Submit appeal'}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </Card>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        testID="feedback-screen"
      >
      <SectionHeading
        eyebrow="Public consultation"
        title={document?.status === 'Public Consultation' ? 'Participate in Public Consultation' : 'Submit Feedback'}
      />
      <Card>
        <Text style={styles.muted}>
          Votes and comments are verified before publication so that results reflect genuine public
          participation.
        </Text>

        <Field
          label="Ordinance ID"
          placeholder="Paste the 24-character ordinance ID"
          value={ordinanceId}
          onChangeText={(value) => {
            setOrdinanceId(value);
            setDocument(null);
            setDocumentError(null);
          }}
          testID="input-ordinance"
        />
        <Pressable
          style={[styles.secondaryButton, documentLoading && styles.disabled]}
          onPress={checkOrdinance}
          disabled={documentLoading}
          accessibilityRole="button"
          testID="check-ordinance"
        >
          <Text style={styles.secondaryButtonText}>
            {documentLoading ? 'Checking ordinance…' : document ? 'Refresh ordinance' : 'Check ordinance'}
          </Text>
        </Pressable>
        {documentError ? <Text style={styles.errorText}>{documentError}</Text> : null}
        {document ? (
          <View style={styles.documentSummary} testID="checked-ordinance">
            <Text style={styles.documentTitle}>{document.number} · {document.title}</Text>
            <Text style={styles.muted}>Status: {document.status}</Text>
          </View>
        ) : null}
        <Field
          label="Full Name *"
          placeholder="Juan Dela Cruz"
          value={form.full_name}
          onChangeText={(value) => update('full_name', value)}
          maxLength={100}
          testID="input-name"
        />
        <View>
          <Text style={styles.label}>Barangay *</Text>
          <Pressable
            style={styles.selectTrigger}
            onPress={() => setBarangayPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Barangay, ${form.barangay || 'select barangay'}`}
            accessibilityHint="Opens the list of Bongabong barangays"
            accessibilityState={{ expanded: barangayPickerOpen }}
            testID="select-barangay"
          >
            <Text style={form.barangay ? styles.selectValue : styles.selectPlaceholder}>
              {form.barangay || 'Select Barangay'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Field
          label="Contact Number *"
          placeholder="09171234567"
          keyboardType="phone-pad"
          maxLength={11}
          value={form.contact_number}
          onChangeText={(value) => {
            const contactNumber = value.replace(/\D/g, '').slice(0, 11);
            update('contact_number', contactNumber);
            if (contactNumber !== form.contact_number) {
              update('otp', '');
              setOtpSent(false);
            }
          }}
          testID="input-contact"
        />
        <Pressable
          style={[styles.secondaryButton, (otpLoading || emailCodeLoading || emailVerifyLoading) && styles.disabled]}
          onPress={switchVerificationMethod}
          disabled={otpLoading || emailCodeLoading || emailVerifyLoading}
          accessibilityRole="button"
          testID="switch-verification-method"
        >
          <Text style={styles.secondaryButtonText}>
            {verificationMethod === 'email' ? 'Use SMS OTP instead' : 'Use email verification instead'}
          </Text>
        </Pressable>
        {verificationMethod === 'email' ? <>
        <Field
          label="Email Address *"
          placeholder="resident@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={254}
          value={form.email}
          onChangeText={(value) => update('email', value.slice(0, 254))}
          testID="input-email"
        />
        <View>
          <Text style={styles.label}>Email verification code *</Text>
          <View style={styles.otpRow}>
            <TextInput
              style={[styles.input, styles.otpInput]}
              value={emailCode}
              onChangeText={(value) => setEmailCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              editable={!emailVerificationToken && emailCodeSent}
              accessibilityLabel="Email verification code"
              testID="input-email-code"
            />
            <Pressable
              style={[styles.goldButton, emailCodeLoading && styles.disabled]}
              onPress={sendEmailCode}
              disabled={emailCodeLoading || !!emailVerificationToken}
              accessibilityRole="button"
              testID="send-email-code"
            >
              <Text style={styles.goldButtonText}>
                {emailVerificationToken ? 'Email verified' : emailCodeLoading ? 'Sending…' : emailCodeSent ? 'Resend code' : 'Send email code'}
              </Text>
            </Pressable>
          </View>
          {emailCodeSent && !emailVerificationToken ? (
            <Pressable
              style={[styles.secondaryButton, (emailCode.length !== 6 || emailVerifyLoading) && styles.disabled]}
              onPress={verifyEmailCode}
              disabled={emailCode.length !== 6 || emailVerifyLoading}
              accessibilityRole="button"
              testID="verify-email-code"
            >
              <Text style={styles.secondaryButtonText}>
                {emailVerifyLoading ? 'Verifying…' : 'Verify email'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        </> : (
          <View>
            <Text style={styles.label}>SMS verification code *</Text>
            <View style={styles.otpRow}>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={form.otp}
                onChangeText={(value) => update('otp', value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="6-digit OTP"
                testID="input-otp"
              />
              <Pressable
                style={[styles.goldButton, otpLoading && styles.disabled]}
                onPress={sendOtp}
                disabled={otpLoading}
                accessibilityRole="button"
                testID="send-otp"
              >
                <Text style={styles.goldButtonText}>
                  {otpLoading ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
                </Text>
              </Pressable>
            </View>
            {testOtp ? (
              <View style={styles.testOtpHint} accessibilityRole="text" testID="test-otp-hint">
                <Text style={styles.testOtpLabel}>DEVELOPMENT ONLY · NO SMS SENT</Text>
                <Text selectable style={styles.testOtpCode}>Test OTP: {testOtp}</Text>
              </View>
            ) : null}
          </View>
        )}

        {document?.status === 'Public Consultation' ? (
          <>
            <Text style={styles.label}>Your Vote</Text>
            <View style={styles.voteRow} accessibilityRole="radiogroup">
              {VOTES.map((option) => {
                const isActive = vote === option;
                const activeStyle =
                  option === 'Agree'
                    ? { backgroundColor: colors.successTint, borderColor: colors.successBorder }
                    : option === 'Neutral'
                      ? { backgroundColor: colors.warningTint, borderColor: colors.warningBorder }
                      : { backgroundColor: colors.dangerTint, borderColor: colors.dangerBorder };
                const activeTextStyle =
                  option === 'Agree'
                    ? { color: colors.success }
                    : option === 'Neutral'
                      ? { color: colors.warning }
                      : { color: colors.danger };

                return (
                  <Pressable
                    key={option}
                    onPress={() => setVote(option)}
                    style={[styles.voteChip, isActive && activeStyle]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                    testID={`vote-${option}`}
                  >
                    <Text
                      style={[
                        styles.voteText,
                        isActive && [styles.voteTextActive, activeTextStyle],
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>
          {document?.status === 'Public Consultation' ? 'Comment (optional)' : 'Comment (required)'}
        </Text>
        <TextInput
          style={[styles.input, styles.commentInput]}
          value={form.comment}
          onChangeText={(value) => update('comment', value)}
          placeholder="Your comment"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
          accessibilityLabel="Comment"
          testID="input-comment"
        />

        <Text style={styles.label}>Valid ID *</Text>
        {idImage ? (
          <View style={styles.selectedImage} testID="selected-id-image">
            <Image
              source={{ uri: idImage.uri }}
              style={styles.selectedImagePreview}
              resizeMode="cover"
              accessibilityLabel="Selected ID photo preview"
            />
            <View style={styles.selectedImageInfo}>
              <Text style={styles.selectedImageTitle}>ID photo ready</Text>
              <Text style={styles.selectedImageName} numberOfLines={2}>{idImage.name}</Text>
            </View>
            <Pressable
              style={styles.changeImageButton}
              onPress={chooseId}
              accessibilityRole="button"
              accessibilityLabel="Change ID photo"
              testID="choose-id"
            >
              <Text style={styles.secondaryButtonText}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={chooseId} testID="choose-id">
            <Text style={styles.secondaryButtonText}>Choose valid ID image</Text>
          </Pressable>
        )}
        <Text style={styles.helperText}>Maximum photo size: 25 MB.</Text>

        <Pressable
          style={styles.consentRow}
          onPress={() => setPrivacyConsent((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: privacyConsent }}
          testID="privacy-consent"
        >
          <View style={[styles.checkbox, privacyConsent && styles.checkboxChecked]}>
            {privacyConsent ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
          </View>
          <Text style={styles.consentText}>
            I consent to the collection and processing of my personal data (Name, Contact Number,
            Email, Valid ID) strictly for identity verification in accordance with the Data Privacy
            Act of 2012. I understand that my ID will be automatically deleted after the
            consultation period.
          </Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, busy && styles.disabled]}
          onPress={submit}
          disabled={busy}
          testID="submit-feedback"
        >
          <Text style={styles.primaryButtonText}>
            {busy ? 'Submitting...' : 'Submit feedback'}
          </Text>
        </Pressable>
      </Card>
      </ScrollView>
      <Modal
        visible={barangayPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBarangayPickerOpen(false)}
      >
        <View style={styles.pickerOverlay} testID="barangay-picker">
          <Pressable
            style={styles.pickerBackdrop}
            onPress={() => setBarangayPickerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close barangay list"
          />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <View style={styles.pickerHeading}>
                <Text style={styles.pickerTitle}>Select Barangay</Text>
                <Text style={styles.pickerHint}>Choose your barangay from the list.</Text>
              </View>
              <Pressable
                onPress={() => setBarangayPickerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close barangay list"
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={BONGABONG_BARANGAYS}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              renderItem={({ item }) => {
                const selected = form.barangay === item;
                return (
                  <Pressable
                    style={styles.pickerOption}
                    onPress={() => {
                      update('barangay', item);
                      setBarangayPickerOpen(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    testID={`barangay-option-${item}`}
                  >
                    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionSelected]}>
                      {item}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={19} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Field({
  label,
  testID,
  ...props
}: {
  label: string;
  testID?: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        testID={testID}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    color: colors.textPrimary,
    fontSize: 14,
  },
  selectTrigger: {
    minHeight: 45,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: { color: colors.textPrimary, fontSize: 14 },
  selectPlaceholder: { color: colors.textSecondary, fontSize: 14 },
  helperText: { marginTop: 5, color: colors.textSecondary, fontSize: 12 },
  errorText: { marginTop: 6, color: colors.danger, fontSize: 12, lineHeight: 17 },
  documentSummary: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
  },
  documentTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  pickerSheet: {
    maxHeight: '82%',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.white,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerHeading: { flex: 1 },
  pickerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  pickerHint: { marginTop: 4, color: colors.textSecondary, fontSize: 12 },
  pickerOption: {
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerOptionText: { color: colors.textPrimary, fontSize: 14 },
  pickerOptionSelected: { color: colors.primary, fontWeight: '700' },
  commentInput: { minHeight: 90, textAlignVertical: 'top' },
  voteRow: { flexDirection: 'row', gap: 8 },
  voteChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  voteChipActive: { borderColor: colors.danger, backgroundColor: '#fff0f0' },
  voteText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  voteTextActive: { color: colors.danger },
  secondaryButton: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  selectedImage: {
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedImagePreview: { width: 60, height: 60, borderRadius: 6, backgroundColor: colors.surface },
  selectedImageInfo: { flex: 1, gap: 3 },
  selectedImageTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  selectedImageName: { color: colors.textSecondary, fontSize: 11 },
  changeImageButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
  },
  otpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  otpInput: { flex: 1 },
  testOtpHint: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff7df',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  testOtpLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  testOtpCode: { marginTop: 3, color: colors.textPrimary, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: 5,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  goldButton: { padding: 13, borderRadius: 8, backgroundColor: colors.accent },
  goldButtonText: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  primaryButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  receiptBox: { marginTop: 16, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface },
  receiptLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  receiptCode: { color: colors.textPrimary, fontSize: 12, lineHeight: 18 },
  reviewStatus: { gap: 6, marginTop: 12 },
  appealForm: { gap: 8, marginTop: 12 },
  disabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  muted: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  doneTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
});
