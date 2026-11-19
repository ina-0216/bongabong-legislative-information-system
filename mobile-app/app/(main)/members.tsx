import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import groupPhoto from '../../assets/bongabong-sb-group.jpg';
import { officialCouncilPortrait } from '../../src/utils/officialCouncilPortraits';

import { api } from '../../src/utils/api';
import type { PublicMember, Term } from '../../src/utils/api';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  SectionHeading,
  TermSelector,
  colors,
  initials,
  memberName,
} from '../_ui';

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<PublicMember[] | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load: Fetch terms and pick current term
  useEffect(() => {
    let active = true;
    api.getTerms()
      .then((termsList) => {
        if (!active) return;
        setTerms(termsList);
        const currentTerm = termsList.find((t) => t.isCurrent) ?? null;
        if (currentTerm) {
          setActiveTermId(currentTerm._id);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load terms');
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch members whenever activeTermId changes
  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getMembers(activeTermId ? { termId: activeTermId } : undefined);
      setMembers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [activeTermId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const activeTerm = terms.find((t) => t._id === activeTermId);
  const list = members ?? [];

  if (loading && members === null) return <Loading label="Loading council members" variant="members" />;

  return (
    <View style={styles.screen} testID="members-screen">
      <FlatList
        data={list}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        testID="members-list"
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Term & Council Banner */}
            <View style={styles.banner}>
              <Ionicons name="people" size={17} color={colors.accentGold} />
              <Text style={styles.bannerText}>
                {activeTerm?.label ? `TERM ${activeTerm.label.toUpperCase()}` : 'COUNCIL DIRECTORY'}
              </Text>
            </View>

            {/* Term Selector Bar & Chips */}
            <TermSelector
              terms={terms}
              activeTermId={activeTermId}
              onSelectTerm={(id) => setActiveTermId(id)}
            />

            {/* Council Hero Card */}
            <View style={styles.groupPhotoCard}>
              <Image source={groupPhoto} style={styles.groupPhotoImage} resizeMode="cover" />
              <View style={styles.groupPhotoOverlay}>
                <Text style={styles.groupPhotoTitle}>The Sangguniang Bayan</Text>
                <Text style={styles.groupPhotoSubtitle}>
                  {activeTerm
                    ? `${activeTerm.label} (${activeTerm.startYear} – ${activeTerm.endYear})`
                    : 'Municipal Legislative Council'}
                </Text>
                {activeTerm?.presidingOfficer ? (
                  <Text style={styles.groupPhotoPresiding}>
                    Presiding Officer: {activeTerm.presidingOfficer}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Quick Action to Standing Committees */}
            <Pressable
              style={styles.committeeBtn}
              onPress={() => router.push('/committees')}
            >
              <View style={styles.committeeBtnLeft}>
                <Ionicons name="grid-outline" size={16} color={colors.primary} />
                <Text style={styles.committeeBtnText}>View Standing Committees</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>

            {error ? <ErrorState message={error} onRetry={loadMembers} /> : null}

            <SectionHeading
              eyebrow={
                activeTerm ? `Term ${activeTerm.label}` : 'All Historical Members'
              }
              title={`${list.length} Council Members`}
            />
          </View>
        }
        renderItem={({ item }) => {
          const isPresiding =
            item.position?.toLowerCase().includes('vice mayor') ||
            item.position?.toLowerCase().includes('presiding');
          const officialPortrait = officialCouncilPortrait(item);

          return (
            <Card
              testID={`member-${item._id}`}
              style={[styles.memberCard, isPresiding && styles.presidingCard]}
            >
              {officialPortrait ? (
                <Image
                  source={officialPortrait}
                  style={styles.photo}
                  accessibilityLabel={memberName(item)}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    isPresiding && {
                      backgroundColor: colors.accentTint,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      isPresiding && { color: colors.accentText },
                    ]}
                  >
                    {initials(memberName(item))}
                  </Text>
                </View>
              )}

              <Text style={styles.name} numberOfLines={2}>
                {memberName(item)}
              </Text>

              <View
                style={[
                  styles.positionPill,
                  isPresiding && {
                    backgroundColor: colors.accentTint,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.position,
                    isPresiding && { color: colors.accentText, fontWeight: '800' },
                  ]}
                  numberOfLines={2}
                >
                  {item.position || 'SB Member'}
                </Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              title="No members listed"
              message="No council members are recorded for this term."
            />
          )
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
    marginBottom: 10,
  },
  bannerText: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  groupPhotoCard: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.navyDark,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupPhotoImage: {
    width: '100%',
    height: 140,
    opacity: 0.88,
  },
  groupPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(9, 16, 31, 0.82)',
  },
  groupPhotoTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  groupPhotoSubtitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 11,
    marginTop: 2,
  },
  groupPhotoPresiding: {
    color: colors.accentGold,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  committeeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 8,
  },
  committeeBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  committeeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  column: { gap: 10 },
  memberCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    minHeight: 180,
    justifyContent: 'center',
  },
  presidingCard: {
    borderColor: colors.accentBorder,
    borderWidth: 1.5,
    backgroundColor: colors.paper,
  },
  photo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d0e0f7',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  positionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.paperSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  position: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
