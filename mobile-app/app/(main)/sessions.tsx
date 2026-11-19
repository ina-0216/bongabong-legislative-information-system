import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { api } from '../../src/utils/api';
import { pdfFilename } from '../../src/utils/pdfFilename';
import type { Paginated, PublicSession } from '../../src/utils/api';
import { hasNextPage } from '../../src/utils/selectors';
import { Card, EmptyState, ErrorState, Loading, SectionHeading, colors } from '../_ui';

const PAGE_SIZE = 20;

function formatSessionDateParts(value?: string | null): { month: string; day: string; year: string } {
  if (!value) return { month: 'TBA', day: '—', year: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { month: 'TBA', day: '—', year: '' };
  return {
    month: d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase(),
    day: d.toLocaleDateString('en-PH', { day: 'numeric' }),
    year: d.toLocaleDateString('en-PH', { year: 'numeric' }),
  };
}

export default function SessionsScreen() {
  const [result, setResult] = useState<Paginated<PublicSession> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingSessionId, setDownloadingSessionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.getSessions({ page, limit: PAGE_SIZE }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const downloadMinutes = async (session: PublicSession) => {
    if (downloadingSessionId) return;
    const directory = FileSystem.documentDirectory;
    if (!directory) {
      Alert.alert('Download unavailable', 'This device does not provide a location for saving files.');
      return;
    }

    setDownloadingSessionId(session._id);
    try {
      const date = session.date && !Number.isNaN(new Date(session.date).getTime())
        ? new Date(session.date).toISOString().slice(0, 10)
        : undefined;
      const destination = `${directory}${pdfFilename('Official Minutes', session.sessionNumber, session.title, date)}`;
      await FileSystem.deleteAsync(destination, { idempotent: true });
      const result = await FileSystem.downloadAsync(
        api.getMinutesPdfUrl(session._id, true),
        destination,
      );
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`The server returned status ${result.status}.`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `Session minutes: ${session.title}`,
        });
      } else {
        await Linking.openURL(api.getMinutesPdfUrl(session._id, true));
      }
    } catch (err) {
      Alert.alert(
        'Unable to download minutes',
        err instanceof Error ? err.message : 'Please try again or open the portal in a browser.',
      );
    } finally {
      setDownloadingSessionId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !result) return <Loading label="Loading legislative sessions" variant="list" />;

  const sessions = result?.docs ?? [];

  return (
    <View style={styles.screen} testID="sessions-screen">
      <FlatList
        data={sessions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.content}
        testID="sessions-list"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerBanner}>
              <Ionicons name="calendar" size={18} color={colors.accentGold} />
              <Text style={styles.headerBannerText}>
                LEGISLATIVE MEETINGS & SANGGUNIANG BAYAN SESSIONS
              </Text>
            </View>

            {error ? <ErrorState message={error} onRetry={load} /> : null}

            <SectionHeading
              eyebrow="Deliberations & minutes"
              title={`${result?.total ?? 0} Recorded Sessions`}
            />
          </View>
        }
        renderItem={({ item }) => {
          const dateParts = formatSessionDateParts(item.date);
          const isFinal = item.status === 'Final';

          return (
            <Card testID={`session-${item._id}`}>
              <View style={styles.sessionRow}>
                {/* Calendar Date Block */}
                <View style={styles.dateBlock}>
                  <Text style={styles.dateMonth}>{dateParts.month}</Text>
                  <Text style={styles.dateDay}>{dateParts.day}</Text>
                  <Text style={styles.dateYear}>{dateParts.year}</Text>
                </View>

                {/* Session Details */}
                <View style={styles.flex}>
                  <View style={styles.sessionStatusRow}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isFinal ? colors.successTint : colors.primaryTint,
                          borderColor: isFinal ? colors.successBorder : '#bfdbfe',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isFinal ? colors.success : colors.primary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isFinal ? colors.success : colors.primary },
                        ]}
                      >
                        {isFinal ? 'FINALIZED MINUTES' : item.status?.toUpperCase() || 'SESSION RECORD'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.title}>{item.title}</Text>

                  {item.itemsDiscussed?.length ? (
                    <View style={styles.itemsRow}>
                      <Ionicons name="list-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.itemsText}>
                        {item.itemsDiscussed.length} agenda items recorded
                      </Text>
                    </View>
                  ) : null}

                  {isFinal ? (
                    <View style={styles.pdfActions}>
                      <Pressable
                        style={styles.viewPdfButton}
                        accessibilityRole="link"
                        accessibilityLabel={`View finalized minutes PDF for ${item.title}`}
                        onPress={() => {
                          Linking.openURL(api.getMinutesPdfUrl(item._id)).catch(() =>
                            Alert.alert(
                              'Unable to open minutes',
                              'Please try again or open the portal in a browser.',
                            ),
                          );
                        }}
                        testID={`session-view-pdf-${item._id}`}
                      >
                        <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                        <Text style={styles.viewPdfButtonText}>View PDF</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.downloadPdfButton, downloadingSessionId && styles.pdfButtonDisabled]}
                        accessibilityRole="button"
                        accessibilityLabel={`Download finalized minutes PDF for ${item.title}`}
                        disabled={Boolean(downloadingSessionId)}
                        onPress={() => downloadMinutes(item)}
                        testID={`session-download-pdf-${item._id}`}
                      >
                        {downloadingSessionId === item._id ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Ionicons name="download-outline" size={15} color={colors.white} />
                        )}
                        <Text style={styles.downloadPdfButtonText}>
                          {downloadingSessionId === item._id ? 'Preparing…' : 'Download PDF'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              title="No session records"
              message="No legislative sessions have been recorded in the archive yet."
            />
          )
        }
        ListFooterComponent={
          sessions.length > 0 ? (
            <View style={styles.pager}>
              <Pressable
                style={[styles.pagerButton, page <= 1 && styles.pagerDisabled]}
                disabled={page <= 1 || loading}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                testID="sessions-prev-page"
              >
                <Ionicons
                  name="chevron-back"
                  size={15}
                  color={page <= 1 ? colors.borderDark : colors.primary}
                />
                <Text style={[styles.pagerText, page <= 1 && styles.pagerTextDisabled]}>
                  Previous
                </Text>
              </Pressable>
              <Text style={styles.pagerLabel}>
                Page {page} of {Math.max(1, result?.pages ?? 1)}
              </Text>
              <Pressable
                style={[
                  styles.pagerButton,
                  !hasNextPage(page, result?.pages ?? 0) && styles.pagerDisabled,
                ]}
                disabled={!hasNextPage(page, result?.pages ?? 0) || loading}
                onPress={() => setPage((current) => current + 1)}
                testID="sessions-next-page"
              >
                <Text
                  style={[
                    styles.pagerText,
                    !hasNextPage(page, result?.pages ?? 0) && styles.pagerTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={
                    !hasNextPage(page, result?.pages ?? 0) ? colors.borderDark : colors.primary
                  }
                />
              </Pressable>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 36 },
  header: { marginBottom: 6 },
  flex: { flex: 1 },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.navy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 44, 0.3)',
    marginBottom: 4,
  },
  headerBannerText: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  dateBlock: {
    width: 60,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.paperSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentText,
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.navy,
    lineHeight: 24,
  },
  dateYear: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  sessionStatusRow: {
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  itemsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pdfActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  viewPdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  downloadPdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  pdfButtonDisabled: { opacity: 0.6 },
  viewPdfButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  downloadPdfButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pagerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 9,
    backgroundColor: colors.white,
  },
  pagerDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.paperSecondary,
  },
  pagerText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  pagerTextDisabled: { color: colors.borderDark },
  pagerLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});
