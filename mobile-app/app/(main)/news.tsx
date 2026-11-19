import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, mediaUrl } from '../../src/utils/api';
import type { NewsPage } from '../../src/utils/api';
import { hasNextPage } from '../../src/utils/selectors';
import { Card, EmptyState, ErrorState, Loading, SectionHeading, colors, formatDate } from '../_ui';

const PAGE_SIZE = 20;

export default function NewsScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<NewsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.getNews({ page, limit: PAGE_SIZE }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && result === null) return <Loading label="Loading public announcements" variant="list" />;

  const items = result?.data ?? [];

  return (
    <View style={styles.screen} testID="news-screen">
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.content}
        testID="news-list"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.banner}>
              <Ionicons name="newspaper" size={17} color={colors.accentGold} />
              <Text style={styles.bannerText}>
                OFFICIAL MUNICIPAL NOTICES & PUBLIC ANNOUNCEMENTS
              </Text>
            </View>

            {error ? <ErrorState message={error} onRetry={load} /> : null}

            <SectionHeading
              eyebrow="Public advisories"
              title={`${result?.total ?? 0} Published Updates`}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/news/${item._id}`)}
            testID={`news-${item._id}`}
          >
            {item.coverImage ? (
              <Image
                source={{ uri: mediaUrl(item.coverImage) }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : null}

            <View style={styles.badgeRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>
                  {item.category?.toUpperCase() || 'PUBLIC UPDATE'}
                </Text>
              </View>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={styles.date}>
                  {formatDate(item.publishedAt || item.createdAt)}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>{item.title}</Text>

            {item.excerpt ? (
              <Text style={styles.excerpt} numberOfLines={3}>
                {item.excerpt}
              </Text>
            ) : null}

            <View style={styles.readMoreRow}>
              <Text style={styles.readMoreText}>Read full announcement</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.primary} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              title="No announcements found"
              message="No published municipal advisories or announcements are available yet."
            />
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
            <View style={styles.pager}>
              <Pressable
                style={[styles.pagerButton, page <= 1 && styles.pagerDisabled]}
                disabled={page <= 1 || loading}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                testID="news-prev-page"
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
                testID="news-next-page"
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
  header: { marginBottom: 4 },
  banner: {
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
  bannerText: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  image: {
    width: '100%',
    height: 175,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: colors.paperSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  categoryText: {
    color: colors.accentText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: { fontSize: 11, color: colors.textMuted },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  excerpt: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  readMoreText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
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
