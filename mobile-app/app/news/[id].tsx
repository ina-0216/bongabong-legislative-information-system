import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, mediaUrl } from '../../src/utils/api';
import { htmlToText } from '../../src/utils/htmlToText';
import type { PublicAnnouncement } from '../../src/utils/api';
import { Card, EmptyState, ErrorState, Loading, colors, formatDate } from '../_ui';
import { announcementPhotos } from '../../src/utils/publicContent';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<PublicAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await api.getNewsDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading announcement" variant="detail" />;

  if (error) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ErrorState message={error} onRetry={load} />
      </ScrollView>
    );
  }

  if (!item) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState
          title="Announcement not found"
          message="This announcement could not be found or has been unlisted."
        />
      </ScrollView>
    );
  }

  const photos = announcementPhotos(item);
  const activePhoto = activePhotoIndex === null ? null : photos[activePhotoIndex];
  const movePhoto = (direction: number) => {
    if (!photos.length || activePhotoIndex === null) return;
    setActivePhotoIndex((activePhotoIndex + direction + photos.length) % photos.length);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="news-detail"
      showsVerticalScrollIndicator={false}
    >
      <Card>
        {item.coverImage ? (
          <Image
            source={{ uri: mediaUrl(item.coverImage) }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>
              {item.category?.toUpperCase() || 'PUBLIC NOTICE'}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.date}>
              {formatDate(item.publishedAt || item.createdAt)}
            </Text>
          </View>
        </View>

        {item.author ? <Text style={styles.author}>By {item.author}</Text> : null}

        <Text style={styles.title}>{item.title}</Text>
        {item.excerpt ? <Text style={styles.excerpt}>{item.excerpt}</Text> : null}

        <View style={styles.divider} />

        {item.content ? (
          <Text style={styles.body}>{htmlToText(item.content)}</Text>
        ) : null}

        {photos.length ? (
          <View style={styles.gallery}>
            <View style={styles.galleryHeading}>
              <Text style={styles.galleryTitle}>Photo gallery</Text>
              <Text style={styles.galleryCount}>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</Text>
            </View>
            <View style={styles.galleryGrid}>
              {photos.map((photo, index) => (
                <Pressable
                  key={photo.key}
                  style={styles.galleryItem}
                  onPress={() => setActivePhotoIndex(index)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`View photo ${index + 1}${photo.caption ? `: ${photo.caption}` : ''}`}
                >
                  <Image source={{ uri: mediaUrl(photo.url) }} style={styles.galleryImage} resizeMode="cover" accessibilityLabel={photo.altText} />
                  {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Ionicons name="shield-checkmark" size={14} color={colors.accentGold} />
          <Text style={styles.footerText}>Official Public Notice • Municipality of Bongabong</Text>
        </View>
      </Card>
      <Modal
        visible={Boolean(activePhoto)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setActivePhotoIndex(null)}
      >
        <View style={styles.viewer}>
          <Pressable style={styles.viewerClose} onPress={() => setActivePhotoIndex(null)} accessibilityRole="button" accessibilityLabel="Close photo viewer">
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
          {activePhoto ? (
            <Image
              source={{ uri: mediaUrl(activePhoto.url) }}
              style={{ width: screenWidth, height: Math.min(screenHeight * 0.68, 560) }}
              resizeMode="contain"
              accessibilityLabel={activePhoto.altText}
            />
          ) : null}
          {photos.length > 1 ? (
            <View style={styles.viewerControls}>
              <Pressable style={styles.viewerButton} onPress={() => movePhoto(-1)} accessibilityRole="button" accessibilityLabel="Previous photo">
                <Ionicons name="chevron-back" size={24} color={colors.white} />
              </Pressable>
              <Text style={styles.viewerCount}>{activePhotoIndex === null ? '' : `${activePhotoIndex + 1} / ${photos.length}`}</Text>
              <Pressable style={styles.viewerButton} onPress={() => movePhoto(1)} accessibilityRole="button" accessibilityLabel="Next photo">
                <Ionicons name="chevron-forward" size={24} color={colors.white} />
              </Pressable>
            </View>
          ) : null}
          {activePhoto?.caption ? <Text style={styles.viewerCaption}>{activePhoto.caption}</Text> : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: colors.paperSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
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
  date: { fontSize: 12, color: colors.textMuted },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 27,
  },
  author: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: -4, marginBottom: 10 },
  excerpt: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 9, fontStyle: 'italic' },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14,
  },
  body: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  gallery: { borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 22, paddingTop: 16 },
  galleryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  galleryTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  galleryCount: { color: colors.textMuted, fontSize: 12 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryItem: { width: '48%', marginBottom: 4 },
  galleryImage: { width: '100%', aspectRatio: 1.35, borderRadius: 8, backgroundColor: colors.paperSecondary },
  caption: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 5 },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5, 12, 25, 0.97)', paddingHorizontal: 12 },
  viewerClose: { position: 'absolute', zIndex: 1, top: 52, right: 20, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewerControls: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  viewerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  viewerCount: { color: colors.white, fontSize: 13, fontWeight: '700' },
  viewerCaption: { color: colors.white, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 10 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
