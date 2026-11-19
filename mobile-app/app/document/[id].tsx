import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, getDocumentSponsorNames, mediaUrl } from '../../src/utils/api';
import type { PublicDocument, PublicFeedback } from '../../src/utils/api';
import { pdfFilename } from '../../src/utils/pdfFilename';
import { documentReference, legislativeStages, publicVoteSummary } from '../../src/utils/publicContent';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  SectionHeading,
  StatusPill,
  TypeBadge,
  colors,
  formatDate,
} from '../_ui';

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [document, setDocument] = useState<PublicDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicFeedback, setPublicFeedback] = useState<PublicFeedback[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setFeedbackError(null);
    try {
      const found = await api.getDocumentDetail(id);
      setDocument(found);
      if (found.type === 'Ordinance') {
        try {
          const entries = await api.getPublicFeedback(id);
          setPublicFeedback(Array.isArray(entries) ? entries : []);
        } catch (err) {
          setFeedbackError(err instanceof Error ? err.message : 'Could not load public comments.');
        }
      } else {
        setPublicFeedback([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  if (loading) return <Loading label="Loading legislative record" variant="detail" />;

  if (error) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ErrorState message={error} onRetry={load} />
      </ScrollView>
    );
  }

  if (!document) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState
          title="Document not found"
          message="This legislative record could not be found or has been moved."
        />
      </ScrollView>
    );
  }

  const sponsors = getDocumentSponsorNames(document);
  const voteSummary = publicVoteSummary(document);
  const amendedBy = documentReference(document.amendedByOrdinanceId);
  const amends = documentReference(document.amendsOrdinanceId);
  const progressStages = legislativeStages(document.type, document.status);
  const documentPdfUrl = document.pdfUrl ? mediaUrl(document.pdfUrl) : api.getDocumentPdfUrl(document._id);

  const downloadPdf = async () => {
    const directory = FileSystem.documentDirectory;
    if (!directory) {
      Alert.alert('Download unavailable', 'This device does not provide a location for saving files.');
      return;
    }
    setDownloadingPdf(true);
    try {
      const filename = pdfFilename(document.type, document.number, document.title);
      const destination = `${directory}${filename}`;
      await FileSystem.deleteAsync(destination, { idempotent: true });
      const result = await FileSystem.downloadAsync(
        document.pdfUrl ? documentPdfUrl : api.getDocumentPdfUrl(document._id, true),
        destination,
      );
      if (result.status < 200 || result.status >= 300) throw new Error(`The server returned status ${result.status}.`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
      } else {
        await Linking.openURL(result.uri);
      }
    } catch (err) {
      Alert.alert('Unable to download document', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const openPdf = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Unable to open PDF', err instanceof Error ? err.message : 'Please try downloading the document.');
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="document-detail"
      showsVerticalScrollIndicator={false}
    >
      {/* Official Document Masthead Card */}
      <Card>
        <View style={styles.headerRow}>
          <TypeBadge type={document.type} />
          <View style={styles.flex}>
            <Text style={styles.number}>{document.number}</Text>
            <Text style={styles.type}>
              {document.type === 'Ordinance' ? 'Municipal Ordinance' : 'Municipal Resolution'}
            </Text>
          </View>
          <StatusPill status={document.status} />
        </View>

        <Text style={styles.title}>{document.title}</Text>

        {document.title_tl ? (
          <View style={styles.tlBox}>
            <Text style={styles.tlLabel}>TAGALOG / WIKANG PAMBANSA</Text>
            <Text style={styles.subtitle}>{document.title_tl}</Text>
          </View>
        ) : null}
      </Card>

      {amendedBy ? (
        <Card style={styles.amendmentCard}>
          <View style={styles.noticeHeading}>
            <Ionicons name="alert-circle-outline" size={19} color={colors.warning} />
            <Text style={styles.noticeTitle}>This ordinance has been amended</Text>
          </View>
          <Pressable style={styles.inlineLink} onPress={() => router.push(`/document/${amendedBy.id}`)} accessibilityRole="link">
            <Text style={styles.inlineLinkText}>View amended version: {amendedBy.label}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </Pressable>
        </Card>
      ) : null}
      {amends ? (
        <Card style={styles.amendmentCard}>
          <View style={styles.noticeHeading}>
            <Ionicons name="git-branch-outline" size={19} color={colors.primary} />
            <Text style={styles.noticeTitle}>This ordinance amends an earlier measure</Text>
          </View>
          <Pressable style={styles.inlineLink} onPress={() => router.push(`/document/${amends.id}`)} accessibilityRole="link">
            <Text style={styles.inlineLinkText}>View earlier ordinance: {amends.label}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </Pressable>
        </Card>
      ) : null}

      {/* Record Information Matrix */}
      <SectionHeading eyebrow="Archival metadata" title="Official Record Details" />
      <Card variant="paper">
        <InfoRow
          icon="calendar-outline"
          label="DATE FILED"
          value={formatDate(document.filedAt || document.createdAt) || 'Not recorded'}
        />
        <InfoRow
          icon="business-outline"
          label="COMMITTEE"
          value={document.committee || 'Sangguniang Bayan'}
        />
        {sponsors.length ? (
          <InfoRow
            icon="people-outline"
            label={sponsors.length > 1 ? 'SPONSORS' : 'SPONSOR'}
            value={sponsors.join(', ')}
          />
        ) : null}
        {document.sectorTag ? (
          <InfoRow
            icon="pricetag-outline"
            label="SECTOR TAG"
            value={document.sectorTag}
          />
        ) : null}
        {document.effectivityDate ? (
          <InfoRow
            icon="checkmark-circle-outline"
            label="EFFECTIVITY DATE"
            value={formatDate(document.effectivityDate)}
          />
        ) : null}
      </Card>

      <SectionHeading eyebrow="Official copy" title="View or Download PDF" />
      <Card>
        <View style={styles.pdfActions}>
          <Pressable style={styles.pdfButton} onPress={() => openPdf(documentPdfUrl)} accessibilityRole="button">
            <Ionicons name="eye-outline" size={18} color={colors.white} />
            <Text style={styles.pdfButtonText}>View PDF</Text>
          </Pressable>
          <Pressable style={[styles.pdfButton, styles.pdfButtonSecondary]} onPress={downloadPdf} disabled={downloadingPdf} accessibilityRole="button">
            <Ionicons name={downloadingPdf ? 'hourglass-outline' : 'download-outline'} size={18} color={colors.primary} />
            <Text style={styles.pdfButtonSecondaryText}>{downloadingPdf ? 'Preparing…' : 'Download Copy'}</Text>
          </Pressable>
        </View>
      </Card>

      {document.sessions?.length ? (
        <>
          <SectionHeading eyebrow="Legislative record" title="Session History" />
          <Card variant="paper">
            {document.sessions.map((session, index) => (
              <View key={session._id} style={[styles.sessionRow, index === document.sessions!.length - 1 && styles.lastRow]}>
                <View style={styles.flex}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionMeta}>{formatDate(session.date)}{session.status ? ` · ${session.status}` : ''}</Text>
                </View>
                {session.status === 'Final' ? (
                  <Pressable onPress={() => openPdf(api.getMinutesPdfUrl(session._id))} style={styles.sessionPdf} accessibilityRole="button" accessibilityLabel={`View minutes for ${session.title}`}>
                    <Ionicons name="document-text-outline" size={17} color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeading eyebrow="Legislative progress" title="Measure Status" />
      <Card variant="paper">
        {progressStages.map((stage, index) => (
          <View key={stage.label} style={[styles.progressRow, index === progressStages.length - 1 && styles.lastRow]}>
            <View style={styles.progressMarkerColumn}>
              <View style={[styles.progressMarker, stage.completed && styles.progressMarkerDone, stage.current && styles.progressMarkerCurrent]}>
                {stage.completed ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
                {stage.current ? <View style={styles.progressCurrentDot} /> : null}
              </View>
              {index < progressStages.length - 1 ? <View style={[styles.progressConnector, stage.completed && styles.progressConnectorDone]} /> : null}
            </View>
            <Text style={[styles.progressLabel, stage.current && styles.progressLabelCurrent]}>{stage.label}{stage.current ? ' · Current' : ''}</Text>
          </View>
        ))}
      </Card>

      {/* Plain Language Summary */}
      <SectionHeading eyebrow="Civic summary" title="Plain-Language Overview" />
      <Card>
        <View style={styles.summaryHeader}>
          <Ionicons name="bulb-outline" size={18} color={colors.accentText} />
          <Text style={styles.summaryTitle}>Digest for the Public</Text>
        </View>
        <Text style={styles.summaryText}>
          {document.plainLanguageSummary || document.plainLanguageSummary_tl ||
            'No plain-language summary has been provided for this legislative record yet.'}
        </Text>
      </Card>

      {document.type === 'Ordinance' ? (
        <>
          <SectionHeading eyebrow="Public consultation" title="Public Comments & Sentiment" />
          <Card>
            <View style={styles.voteHeader}>
              <Text style={styles.voteTotal}>{voteSummary.total} participants</Text>
            </View>
            <View style={styles.voteRow}>
              <VoteCount label="Agree" count={voteSummary.tally.Agree} tone={colors.success} />
              <VoteCount label="Neutral" count={voteSummary.tally.Neutral} tone={colors.textMuted} />
              <VoteCount label="Disagree" count={voteSummary.tally.Disagree} tone={colors.danger} />
            </View>
          </Card>
          {feedbackError ? <Text style={styles.feedbackNotice}>Public comments are temporarily unavailable.</Text> : null}
          {!feedbackError && publicFeedback.length ? publicFeedback.map((entry) => (
            <Card key={entry._id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Text style={styles.feedbackVote}>{entry.vote || 'Comment'}</Text>
                <Text style={styles.feedbackDate}>{formatDate(entry.createdAt)}</Text>
              </View>
              {entry.sentiment ? <Text style={styles.feedbackSentiment}>{entry.sentiment} sentiment</Text> : null}
              {entry.comment ? <Text style={styles.feedbackComment}>{entry.comment}</Text> : null}
            </Card>
          )) : null}
          {!feedbackError && !publicFeedback.length ? <Text style={styles.feedbackNotice}>No public comments have been submitted yet.</Text> : null}
        </>
      ) : null}

      {/* Citizen Consultation Callout */}
      {document.type === 'Ordinance' ? (
        <>
          <SectionHeading eyebrow="Civic participation" title="Public Consultation" />
          <Card style={styles.consultCard}>
            <View style={styles.consultHeader}>
              <View style={styles.consultIconWrap}>
                <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.consultTitle}>Have Your Say on this Ordinance</Text>
                <Text style={styles.muted}>
                  Share verified feedback on this municipal ordinance. Submissions are reviewed
                  by the Sangguniang Bayan.
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.consultButton}
              onPress={() => router.push({ pathname: '/feedback', params: { ordinanceId: id } })}
              testID="go-to-feedback"
            >
              <Ionicons name="create-outline" size={16} color={colors.white} />
              <Text style={styles.consultButtonText}>Submit Citizen Feedback</Text>
            </Pressable>
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconCol}>
        <Ionicons name={icon} size={15} color={colors.accentText} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function VoteCount({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <View style={styles.voteItem}>
      <Text style={[styles.voteCount, { color: tone }]}>{count}</Text>
      <Text style={styles.voteLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  number: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  type: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 25,
  },
  tlBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.paperSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tlLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accentText,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoIconCol: {
    width: 24,
    paddingTop: 2,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentText,
    letterSpacing: 0.8,
  },
  infoValue: {
    marginTop: 3,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 19,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  consultCard: {
    borderColor: '#c7d9f2',
    backgroundColor: colors.primaryTint,
  },
  consultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  consultIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  consultTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  muted: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  consultButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  amendmentCard: { borderColor: colors.warningBorder, backgroundColor: colors.accentTint, marginTop: 12 },
  noticeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  noticeTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', flex: 1 },
  inlineLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inlineLinkText: { flex: 1, color: colors.primary, fontSize: 13, fontWeight: '700' },
  pdfActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pdfButton: { minHeight: 46, flexGrow: 1, flexBasis: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9, paddingHorizontal: 12, backgroundColor: colors.primary },
  pdfButtonSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primaryMuted },
  pdfButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  pdfButtonSecondaryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  lastRow: { borderBottomWidth: 0 },
  sessionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  sessionMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  sessionPdf: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white },
  progressRow: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  progressMarkerColumn: { width: 28, alignItems: 'center', alignSelf: 'stretch' },
  progressMarker: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 2, borderColor: colors.borderDark, backgroundColor: colors.white, zIndex: 1 },
  progressMarkerDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  progressMarkerCurrent: { borderColor: colors.primaryMuted, backgroundColor: colors.primaryTint },
  progressCurrentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  progressConnector: { position: 'absolute', top: 23, bottom: -1, width: 2, backgroundColor: colors.borderLight },
  progressConnectorDone: { backgroundColor: colors.primaryMuted },
  progressLabel: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingTop: 2, paddingBottom: 13 },
  progressLabelCurrent: { color: colors.primary, fontWeight: '800' },
  voteHeader: { marginBottom: 12 },
  voteTotal: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  voteRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 },
  voteItem: { alignItems: 'center', minWidth: 70 },
  voteCount: { fontSize: 22, fontWeight: '800' },
  voteLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  feedbackNotice: { color: colors.textMuted, fontSize: 13, lineHeight: 19, paddingHorizontal: 4, paddingVertical: 10 },
  feedbackCard: { marginTop: 8 },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  feedbackVote: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  feedbackDate: { color: colors.textMuted, fontSize: 11 },
  feedbackSentiment: { color: colors.accentText, fontSize: 11, fontWeight: '700', marginTop: 7 },
  feedbackComment: { color: colors.textPrimary, fontSize: 13, lineHeight: 19, marginTop: 7 },
});
