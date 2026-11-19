import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import municipalBuilding from '../../assets/municipal-building.jpg';
import groupPhoto from '../../assets/bongabong-sb-group.jpg';

import { api, mediaUrl } from '../../src/utils/api';
import type { PublicAnnouncement, PublicDocument, PublicMember, PublicSession, PublicStats } from '../../src/utils/api';
import { memberName } from '../../src/utils/selectors';
import { officialCouncilPortrait } from '../../src/utils/officialCouncilPortraits';
import {
  Card,
  CivicNoticeStrip,
  EmptyState,
  ErrorState,
  Loading,
  SectionHeading,
  StatusPill,
  colors,
  formatDate,
} from '../_ui';

const QUICK_LINKS: Array<{
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href: string;
}> = [
  {
    title: 'Legislative Archive',
    subtitle: 'Browse official ordinances & resolutions',
    icon: 'document-text-outline',
    href: '/documents?type=All&status=All',
  },
  {
    title: 'Session Minutes',
    subtitle: 'Review public meeting deliberations & minutes',
    icon: 'calendar-outline',
    href: '/sessions',
  },
  {
    title: 'Council Terms & Members',
    subtitle: 'Browse members by current or historical term',
    icon: 'people-outline',
    href: '/members',
  },
  {
    title: 'Standing Committees',
    subtitle: 'Legislative committees and chairpersons',
    icon: 'grid-outline',
    href: '/committees',
  },
  {
    title: 'Citizen Consultation',
    subtitle: 'Participate and submit formal civic feedback',
    icon: 'chatbubble-ellipses-outline',
    href: '/feedback',
  },
  {
    title: 'About the Sangguniang Bayan',
    subtitle: 'Learn how the local legislative body works',
    icon: 'information-circle-outline',
    href: '/about',
  },
  {
    title: 'Vision, Mission & Values',
    subtitle: 'Read the municipality’s guiding principles',
    icon: 'compass-outline',
    href: '/mission-vision',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [latest, setLatest] = useState<PublicDocument[]>([]);
  const [consultations, setConsultations] = useState<PublicDocument[]>([]);
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsResult, latestResult, consultationResult, sessionResult, newsResult, termsResult] = await Promise.allSettled([
        api.getStats(),
        api.getLatest(),
        api.getDocuments({ status: 'Public Consultation', limit: 3, page: 1 }),
        api.getSessions({ limit: 4, page: 1 }),
        api.getNews({ limit: 4, page: 1 }),
        api.getTerms(),
      ]);
      const failures = [statsResult, latestResult, consultationResult, sessionResult, newsResult, termsResult]
        .filter((result) => result.status === 'rejected');
      let memberLoadFailed = false;
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (latestResult.status === 'fulfilled') setLatest(Array.isArray(latestResult.value) ? latestResult.value : []);
      if (consultationResult.status === 'fulfilled') setConsultations(Array.isArray(consultationResult.value.docs) ? consultationResult.value.docs : []);
      if (sessionResult.status === 'fulfilled') setSessions(Array.isArray(sessionResult.value.docs) ? sessionResult.value.docs : []);
      if (newsResult.status === 'fulfilled') {
        setAnnouncements(Array.isArray(newsResult.value.data) ? newsResult.value.data.slice(0, 3) : []);
      }
      if (termsResult.status === 'fulfilled') {
        const currentTerm = termsResult.value.find((term) => term.isCurrent);
        if (currentTerm) {
          try {
            const currentMembers = await api.getMembers({ termId: currentTerm._id });
            setMembers(Array.isArray(currentMembers) ? currentMembers : []);
          } catch {
            setMembers([]);
            memberLoadFailed = true;
          }
        }
      }
      if (failures.length || memberLoadFailed) {
        const firstFailure = failures[0];
        setError(firstFailure?.status === 'rejected' && firstFailure.reason instanceof Error
          ? firstFailure.reason.message
          : 'Some public information is temporarily unavailable.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load public information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recentDocuments = useMemo(() => latest.slice(0, 5), [latest]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSearchSubmit = () => {
    const term = searchQuery.trim();
    router.push({
      pathname: '/documents',
      params: term ? { type: 'All', status: 'All', search: term } : { type: 'All', status: 'All' },
    });
  };

  if (loading) {
    return <Loading label="Loading legislative portal" variant="home" />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="home-screen"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accentGold}
        />
      }
    >
      {/* 1. Official Government Masthead Notice */}
      <CivicNoticeStrip />

      {/* 2. Public Portal Hero Banner */}
      <ImageBackground
        source={municipalBuilding}
        style={styles.hero}
        imageStyle={styles.heroImage}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.heroShade} />
        <Text style={styles.heroKicker}>OFFICIAL PUBLIC RECORD</Text>
        <Text style={styles.heroTitle}>Good government starts with knowing what happened.</Text>

        <Text style={styles.heroLede}>
          Follow the decisions that shape your streets, schools, businesses, and future. Then make
          your voice easier to hear.
        </Text>

        {/* Hero Primary Actions */}
        <View style={styles.heroActions}>
          <Pressable
            style={styles.heroBtnPrimary}
            onPress={() =>
              router.push({ pathname: '/documents', params: { type: 'All', status: 'All' } })
            }
          >
            <Ionicons name="library-outline" size={16} color={colors.navyDark} />
            <Text style={styles.heroBtnPrimaryText}>Explore the record</Text>
          </Pressable>

          <Pressable style={styles.heroBtnSecondary} onPress={() => router.push('/news')}>
            <Ionicons name="newspaper-outline" size={16} color={colors.white} />
            <Text style={styles.heroBtnSecondaryText}>What’s new</Text>
          </Pressable>
        </View>
        <View style={styles.heroNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.accentGold} />
          <Text style={styles.heroNoteText}>Official records published by the Sangguniang Bayan of Bongabong</Text>
        </View>
      </ImageBackground>

      {/* Error state if connection fails */}
      {error ? (
        <View style={styles.sectionWrap}>
          <ErrorState message={error} onRetry={onRefresh} />
        </View>
      ) : null}

      {/* 3. Archive at a Glance (Civic Overview) */}
      {stats ? (
        <View style={styles.statsSection}>
          <View style={styles.statsHeading}>
            <Text style={styles.statsKicker}>PUBLIC ARCHIVE</Text>
            <Text style={styles.statsTitle}>The record at a glance</Text>
          </View>
          <View style={styles.statsList}>
            <StatRow value={stats.approvedOrdinances} label="Approved ordinances" onPress={() => router.push({ pathname: '/documents', params: { type: 'Ordinance', status: 'Approved' } })} />
            <StatRow value={stats.approvedResolutions} label="Approved resolutions" onPress={() => router.push({ pathname: '/documents', params: { type: 'Resolution', status: 'Approved' } })} />
            <StatRow value={stats.totalOrdinances} label="Ordinances recorded" onPress={() => router.push({ pathname: '/documents', params: { type: 'Ordinance' } })} />
            <StatRow value={stats.totalResolutions} label="Resolutions recorded" onPress={() => router.push({ pathname: '/documents', params: { type: 'Resolution' } })} />
            <StatRow value={stats.inConsultation} label="Open for comment" onPress={() => router.push({ pathname: '/documents', params: { type: 'Ordinance', status: 'Public Consultation' } })} last />
          </View>
        </View>
      ) : null}

      {/* 4. Sangguniang Bayan Council Feature */}
      <View style={styles.sectionWrap}>
        <SectionHeading
          eyebrow="Municipal legislature"
          title="The Sangguniang Bayan"
          action="View Council"
          onPress={() => router.push('/members')}
        />
        <Card variant="paper" onPress={() => router.push('/members')}>
          <View style={styles.councilBannerWrap}>
            <Image source={groupPhoto} style={styles.councilImage} resizeMode="cover" />
            <View style={styles.councilOverlay}>
              <View style={styles.councilPill}>
                <Ionicons name="people" size={13} color={colors.accentGold} />
              <Text style={styles.councilPillText}>12TH SANGGUNIANG BAYAN</Text>
              </View>
              <Text style={styles.councilTitle}>The Sangguniang Bayan of Bongabong</Text>
              <Text style={styles.councilSubtitle}>
                Elected municipal legislators serving the citizens of Bongabong.
              </Text>
            </View>
          </View>
          <View style={styles.councilFooter}>
            <Text style={styles.councilLinkText}>View member directory & chairmanships</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
          </View>
        </Card>
        {members.slice(0, 11).map((member) => (
          <Pressable key={member._id} style={styles.homeMemberRow} onPress={() => router.push('/members')}>
            {officialCouncilPortrait(member)
              ? <Image source={officialCouncilPortrait(member) ?? undefined} style={styles.homeMemberPhoto} resizeMode="cover" />
              : <View style={styles.homeMemberInitial}><Text style={styles.homeMemberInitialText}>{memberName(member).split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</Text></View>}
            <View style={styles.flex}>
              <Text style={styles.homeMemberName}>{memberName(member)}</Text>
              <Text style={styles.homeMemberPosition}>{member.position || 'Sangguniang Bayan Member'}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        ))}
      </View>

      {/* 5. Public updates and session records, in the same order as the portal */}
      <View style={styles.sectionWrap}>
        <SectionHeading eyebrow="News and updates" title="What is happening in Bongabong" action="All News" onPress={() => router.push('/news')} />
        {announcements.length ? announcements.map((item) => (
          <Card key={item._id} onPress={() => router.push(`/news/${item._id}`)}>
            {item.coverImage ? <Image source={{ uri: mediaUrl(item.coverImage) }} style={styles.newsImage} resizeMode="cover" /> : null}
            <View style={styles.newsBadgeRow}>
              <Text style={styles.newsCategoryText}>{item.category?.toUpperCase() || 'PUBLIC UPDATE'}</Text>
              <Text style={styles.cardDate}>{formatDate(item.publishedAt || item.createdAt)}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.excerpt ? <Text style={styles.newsExcerpt}>{item.excerpt}</Text> : null}
            <Text style={styles.portalTextLink}>Read full report  →</Text>
          </Card>
        )) : <Text style={styles.portalEmpty}>No public updates have been published yet.</Text>}
      </View>

      <View style={[styles.sectionWrap, styles.sessionSection]}>
        <SectionHeading eyebrow="Public calendar" title="Sessions" action="View calendar" onPress={() => router.push('/sessions')} tone="light" />
        {sessions.length ? sessions.slice(0, 4).map((session) => (
          <View key={session._id} style={styles.sessionRow}>
            <Text style={styles.sessionDate}>{formatSessionDate(session.date)}</Text>
            <Text style={styles.sessionTitle}>{session.title || 'Regular session'}</Text>
            <Text style={styles.sessionVenue}>{session.location || session.venue || 'Sangguniang Bayan Session Hall'}</Text>
          </View>
        )) : <Text style={styles.portalEmptyDark}>No sessions have been recorded yet.</Text>}
        <Pressable style={styles.outlineButton} onPress={() => router.push('/sessions')}>
          <Text style={styles.outlineButtonText}>See the public calendar</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.white} />
        </Pressable>
      </View>

      {/* 6. Open consultations and latest public records */}
      <View style={styles.sectionWrap}>
        <SectionHeading eyebrow="Take part" title="Open for comment" />
        {consultations.length ? consultations.map((doc) => (
          <RecordRow key={doc._id} doc={doc} onPress={() => router.push(`/document/${doc._id}`)} />
        )) : <Text style={styles.portalEmpty}>There are no open public consultations right now.</Text>}
        <Pressable style={styles.primaryPortalButton} onPress={() => router.push({ pathname: '/documents', params: { type: 'Ordinance', status: 'Public Consultation' } })}>
          <Text style={styles.primaryPortalButtonText}>See open consultations</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.white} />
        </Pressable>
      </View>

      {latest.length > 0 ? (
        <View style={styles.sectionWrap}>
          <SectionHeading eyebrow="Decisions" title="Latest records" action="View full archive" onPress={() => router.push({ pathname: '/documents', params: { type: 'All', status: 'All' } })} />
          {recentDocuments.map((doc) => <RecordRow key={doc._id} doc={doc} onPress={() => router.push(`/document/${doc._id}`)} />)}
        </View>
      ) : null}

      {/* 7. Search and service links follow the portal's public-help section */}
      <View style={styles.searchSection}>
        <Text style={styles.searchSectionTitle}>Find a public record</Text>
        <Text style={styles.searchSectionCopy}>Search by ordinance number, title, committee, or keyword.</Text>
        <View style={styles.archiveSearch}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.archiveSearchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholder="Title, number, committee, or keyword"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.archiveSearchButton} onPress={handleSearchSubmit} accessibilityRole="button" accessibilityLabel="Search public records">
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* 8. Additional destinations keep less-used portal functions discoverable */}
      <View style={styles.sectionWrap}>
        <SectionHeading eyebrow="Explore" title="More from the portal" />
        {QUICK_LINKS.map((link) => (
          <Card key={link.href} onPress={() => router.push(link.href as never)}>
            <View style={styles.quickLinkRow}>
              <View style={styles.quickLinkIcon}>
                <Ionicons name={link.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.quickLinkTitle}>{link.title}</Text>
                <Text style={styles.quickLinkSubtitle}>{link.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
            </View>
          </Card>
        ))}
      </View>

      {/* Empty archive state */}
      {latest.length === 0 && announcements.length === 0 && !error ? (
        <View style={styles.sectionWrap}>
          <EmptyState
            title="No records available"
            message="No public records or announcements have been published yet."
          />
        </View>
      ) : null}

      {/* Civic Footer Note */}
      <View style={styles.footerNote}>
        <Image source={require('../../assets/bongabong-seal.png')} style={styles.footerSeal} resizeMode="contain" />
        <Text style={styles.footerNoteText}>
          Sangguniang Bayan of Bongabong
        </Text>
        <Text style={styles.footerNoteSub}>Municipal Hall, Poblacion, Bongabong, Oriental Mindoro 5211</Text>
        <Text style={styles.footerNoteSub}>Republic of the Philippines</Text>
      </View>
    </ScrollView>
  );
}

function StatRow({ value, label, onPress, last = false }: { value: number; label: string; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.statRow, last && styles.statRowLast]}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value ?? 0}</Text>
    </Pressable>
  );
}

function RecordRow({ doc, onPress }: { doc: PublicDocument; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.recordRow}>
      <View style={styles.recordTopLine}>
        <Text style={styles.documentNumber}>{doc.number || 'Unnumbered'}</Text>
        <StatusPill status={doc.status} />
      </View>
      <Text style={styles.documentTitle}>{doc.title}</Text>
      <Text style={styles.recordMeta}>{doc.committee || 'The Sangguniang Bayan'} · {formatDate(doc.createdAt)}</Text>
    </Pressable>
  );
}

function formatSessionDate(value?: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Date to be announced';
  return new Date(value).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 40 },
  flex: { flex: 1 },
  sectionWrap: { paddingHorizontal: 16, marginTop: 4 },

  // Hero Section
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(212, 167, 44, 0.35)',
    overflow: 'hidden',
  },
  heroImage: {
    borderRadius: 0,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 16, 31, 0.82)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroEmblem: {
    width: 62,
    height: 62,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 217, 117, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 217, 117, 0.3)',
  },
  heroBadgeText: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroKicker: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.7,
  },
  heroLede: {
    marginTop: 10,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 25,
  },
  heroSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 217, 117, 0.25)',
  },
  heroSearchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    paddingVertical: 0,
  },
  heroSearchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.accent,
    borderRadius: 7,
  },
  heroSearchBtnText: {
    color: colors.navyDark,
    fontSize: 12,
    fontWeight: '800',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
  heroBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    borderRadius: 2,
  },
  heroBtnPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  heroBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    borderRadius: 2,
  },
  heroBtnSecondaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  heroNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  heroNoteText: { flex: 1, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 18 },
  // Flat typographic metrics match the portal's archive band.
  statsSection: { paddingHorizontal: 20, paddingVertical: 22, backgroundColor: colors.paper },
  statsHeading: { marginBottom: 12 },
  statsKicker: { color: colors.accentText, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  statsTitle: { color: colors.textPrimary, fontSize: 23, lineHeight: 29, fontWeight: '700', marginTop: 3 },
  statsList: { borderTopWidth: 1, borderTopColor: colors.borderDark, borderBottomWidth: 1, borderBottomColor: colors.borderDark },
  statRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 },
  statRowLast: { borderBottomWidth: 0 },
  statValue: {
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.textMuted,
    lineHeight: 15,
  },

  // Council Feature
  councilBannerWrap: {
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.navyDark,
  },
  councilImage: {
    width: '100%',
    height: 150,
    opacity: 0.88,
  },
  councilOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(9, 16, 31, 0.78)',
  },
  councilPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  councilPillText: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  councilTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  councilSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  councilFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  councilLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  homeMemberRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8 },
  homeMemberPhoto: { width: 40, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 2 },
  homeMemberInitial: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderDark, backgroundColor: colors.paperSecondary },
  homeMemberInitialText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  homeMemberName: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  homeMemberPosition: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sessionSection: { backgroundColor: colors.navy, paddingTop: 6, paddingBottom: 20 },
  sessionRow: { paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.24)' },
  sessionDate: { color: colors.accentGold, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  sessionTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginTop: 4 },
  sessionVenue: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 3 },
  portalEmpty: { paddingVertical: 14, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  portalEmptyDark: { paddingVertical: 14, color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 20 },
  outlineButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 2 },
  outlineButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  primaryPortalButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 16, backgroundColor: colors.danger, borderRadius: 2 },
  primaryPortalButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  recordRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 5 },
  recordTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  recordMeta: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  portalTextLink: { color: colors.primary, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', marginTop: 8 },
  searchSection: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 24, backgroundColor: colors.paper },
  searchSectionTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  searchSectionCopy: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 7 },
  archiveSearch: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingLeft: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.white },
  archiveSearchInput: { flex: 1, minWidth: 0, paddingVertical: 11, color: colors.textPrimary, fontSize: 14 },
  archiveSearchButton: { alignSelf: 'stretch', width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger },

  // Recent Documents
  documentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  documentMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dotSeparator: {
    color: colors.borderDark,
    fontSize: 10,
  },

  // Announcements
  newsImage: {
    width: '100%',
    height: 165,
    borderRadius: 2,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  newsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  newsCategoryPill: {
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  newsCategoryText: {
    color: colors.accentText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  newsExcerpt: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Quick Links
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: '#d0e0f7',
  },
  quickLinkTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  quickLinkSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Footer Note
  footerNote: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
  },
  footerSeal: { width: 48, height: 48, marginBottom: 10 },
  footerNoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  footerNoteSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },
});
