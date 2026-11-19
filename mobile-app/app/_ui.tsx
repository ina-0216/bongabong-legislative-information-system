import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  formatDate,
  initials,
  memberName,
  statusTone,
} from '../src/utils/selectors';
import type { Term } from '../src/utils/api';

// Pure view logic lives in `src/utils/selectors` so it is unit testable without
// a React Native runtime; re-exported here so the screens keep a single import.
export { formatDate, initials, memberName, statusTone };

export const colors = {
  // Institutional Navy & Blue (matches public-portal --v11-navy, --ibosys-primary-500)
  navy: '#0e1f3f',
  navyDark: '#09101f',
  navyLight: '#132f5e',
  primary: '#1f4f9d',
  primaryDark: '#132f5e',
  primaryTint: '#eef3fb',
  primaryMuted: '#d9e4f1',

  // Antique Gold & Bronze (matches public-portal --v11-gold, --v11-gold-bright)
  accent: '#d4a72c',
  accentGold: '#ffd975',
  accentDark: '#b88626',
  accentText: '#9c6520',
  accentTint: '#fdf8ea',
  accentBorder: '#fce7b2',

  // Semantic & Status
  success: '#047857',
  successTint: '#ecfdf5',
  successBorder: '#a7f3d0',
  warning: '#b45309',
  warningTint: '#fffbeb',
  warningBorder: '#fde68a',
  danger: '#b91c1c',
  dangerDark: '#991b1b',
  dangerTint: '#fef2f2',
  dangerBorder: '#fecaca',

  // Warm Paper & Surfaces (matches public-portal --v11-paper, --v11-paper-2)
  paper: '#fdfbf7',
  paperSecondary: '#f7f5ef',
  surface: '#f8f6f0',
  cardBg: '#ffffff',
  white: '#ffffff',

  // Borders & Hairline Rules (matches public-portal --v11-rule, --v11-rule-2)
  border: '#e6e2d8',
  borderLight: '#f0ede6',
  borderDark: '#c8c2b4',
  rule: '#e2dfd7',

  // Typography & Ink (matches public-portal --v11-ink, --v11-ink-2, --v11-ink-3)
  textPrimary: '#171717',
  textSecondary: '#525252',
  textMuted: '#737373',
  textInverse: '#ffffff',
  textOnDark: '#ffffff',
  textOnDarkMuted: 'rgba(255, 255, 255, 0.78)',
};

export const CivicNoticeStrip = ({ text }: { text?: string }) => (
  <View style={styles.noticeStrip}>
    <Ionicons name="shield-checkmark" size={13} color={colors.accentGold} />
    <Text style={styles.noticeStripText} numberOfLines={1}>
      {text || 'OFFICIAL PUBLIC SERVICE • BONGABONG, ORIENTAL MINDORO • OPEN PARTICIPATION WELCOME'}
    </Text>
  </View>
);

export const Loading = ({ label = 'Loading', variant = 'list' }: { label?: string; variant?: 'home' | 'list' | 'detail' | 'members' | 'committees' }) => (
  <View style={styles.loadingPage} testID="loading" accessibilityRole="progressbar" accessibilityLabel={label}>
    <Text style={styles.loadingLabel}>{label}</Text>
    {variant === 'home' ? <>
      <View style={styles.loadingHero} />
      <View style={styles.loadingMetricGrid}>
        {[0, 1, 2, 3].map((item) => <View key={item} style={styles.loadingMetric} />)}
      </View>
      <View style={styles.loadingLineLong} />
      <View style={styles.loadingLineShort} />
    </> : null}
    {variant === 'detail' ? <>
      <View style={styles.loadingLineShort} />
      <View style={styles.loadingTitleLine} />
      <View style={styles.loadingLineLong} />
      <View style={styles.loadingDetailBody} />
    </> : null}
    {variant === 'members' ? <View style={styles.loadingMetricGrid}>
      {[0, 1, 2, 3].map((item) => <View key={item} style={styles.loadingMemberCard}><View style={styles.loadingPortrait} /><View style={styles.loadingLineLong} /><View style={styles.loadingLineShort} /></View>)}
    </View> : null}
    {variant !== 'home' && variant !== 'detail' && variant !== 'members' ? <>
      {variant === 'committees' ? <View style={styles.loadingTitleLine} /> : null}
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.loadingCard}>
          <View style={styles.loadingIcon} />
          <View style={styles.loadingCardContent}>
            <View style={styles.loadingLineLong} />
            <View style={styles.loadingLineShort} />
          </View>
        </View>
      ))}
    </> : null}
  </View>
);

export const StartupScreen = () => (
  <View style={styles.startupScreen} testID="startup-screen" accessibilityRole="progressbar" accessibilityLabel="Starting B-LIS">
    <Image source={require('../assets/bongabong-seal.png')} style={styles.startupSeal} resizeMode="contain" />
    <Text style={styles.startupTitle}>B-LIS</Text>
    <Text style={styles.startupSubtitle}>SANGGUNIANG BAYAN NG BONGABONG</Text>
    <ActivityIndicator color={colors.accentGold} size="small" style={styles.startupIndicator} />
    <Text style={styles.startupMessage}>Preparing the public portal…</Text>
  </View>
);

export const EmptyState = ({
  title = 'No records found',
  message,
}: {
  title?: string;
  message: string;
}) => (
  <View style={styles.empty} testID="empty-state">
    <View style={styles.emptyIconWrap}>
      <Ionicons name="archive-outline" size={30} color={colors.accentText} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.muted}>{message}</Text>
  </View>
);

export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <View style={styles.errorBox} testID="error-state">
    <View style={styles.errorHeader}>
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={styles.errorTitle}>Unable to load records</Text>
    </View>
    <Text style={styles.errorText}>{message}</Text>
    {onRetry ? (
      <Pressable style={styles.retryButton} onPress={onRetry} testID="retry-button">
        <Ionicons name="refresh" size={13} color={colors.white} />
        <Text style={styles.retryText}>Retry Connection</Text>
      </Pressable>
    ) : null}
  </View>
);

export const Card = ({
  children,
  onPress,
  testID,
  style,
  variant = 'default',
}: {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'paper' | 'navy';
}) => {
  const cardStyle = [
    styles.card,
    variant === 'paper' && styles.cardPaper,
    variant === 'navy' && styles.cardNavy,
    style,
  ];

  if (!onPress) {
    return (
      <View style={cardStyle} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}
      onPress={onPress}
      testID={testID}
    >
      {children}
    </Pressable>
  );
};

export const SectionHeading = ({
  eyebrow,
  title,
  action,
  onPress,
  tone = 'default',
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onPress?: () => void;
  tone?: 'default' | 'light';
}) => (
  <View style={styles.sectionHeading}>
    <View style={styles.flex}>
      {eyebrow ? <Text style={[styles.eyebrow, tone === 'light' && styles.eyebrowLight]}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={[styles.sectionTitle, tone === 'light' && styles.sectionTitleLight]}>{title}</Text>
    </View>
    {action && onPress ? (
      <Pressable onPress={onPress} style={[styles.actionPressable, tone === 'light' && styles.actionPressableLight]} testID="section-action">
        <Text style={[styles.link, tone === 'light' && styles.linkLight]}>{action}</Text>
        <Ionicons name="arrow-forward" size={12} color={tone === 'light' ? colors.accentGold : colors.primary} />
      </Pressable>
    ) : null}
  </View>
);

export const StatusPill = ({ status }: { status?: string }) => {
  const tone = statusTone(status);
  const isApproved = (status ?? '').toLowerCase().includes('approved');
  const isConsultation = (status ?? '').toLowerCase().includes('consultation');
  const borderColor = isApproved
    ? colors.successBorder
    : isConsultation
      ? colors.warningBorder
      : (status ?? '').toLowerCase().includes('reading') ||
        (status ?? '').toLowerCase().includes('committee')
        ? '#bfdbfe'
        : '#e5e7eb';

  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, borderColor }]}>
      <View style={[styles.pillDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.pillText, { color: tone.fg }]} testID="status-pill">
        {(status ?? 'Unknown').toUpperCase()}
      </Text>
    </View>
  );
};

export const TypeBadge = ({ type }: { type?: string }) => {
  const isOrdinance = type === 'Ordinance';
  return (
    <View
      style={[
        styles.typeBadge,
        {
          backgroundColor: isOrdinance ? colors.primaryTint : colors.accentTint,
          borderColor: isOrdinance ? '#c7d9f2' : colors.accentBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.typeBadgeText,
          { color: isOrdinance ? colors.primary : colors.accentText },
        ]}
      >
        {isOrdinance ? 'ORD' : 'RES'}
      </Text>
    </View>
  );
};

/**
 * TermSelector: Institutional civic term filter bar & picker.
 * Allows citizens to switch between legislative periods (e.g. 2025-2028, 2022-2025)
 * or view all historical terms, mirroring public-portal's TermSidebarLayout.
 */
export const TermSelector = ({
  terms,
  activeTermId,
  onSelectTerm,
}: {
  terms: Term[];
  activeTermId: string | null;
  onSelectTerm: (termId: string | null) => void;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const activeTerm = terms.find((t) => t._id === activeTermId);
  const activeLabel = activeTerm ? activeTerm.label : 'All Terms (Historical)';

  if (!terms.length) return null;

  return (
    <View style={termStyles.container}>
      {/* Top Banner & Quick Trigger */}
      <Pressable
        style={termStyles.bar}
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Legislative Term: ${activeLabel}`}
        testID="term-selector-trigger"
      >
        <View style={termStyles.barLeft}>
          <View style={termStyles.barIconWrap}>
            <Ionicons name="calendar" size={17} color={colors.accentGold} />
          </View>
          <View style={termStyles.flex}>
            <Text style={termStyles.barKicker}>LEGISLATIVE TERM</Text>
            <View style={termStyles.activeRow}>
              <Text style={termStyles.activeTitle} numberOfLines={1}>
                {activeLabel}
              </Text>
              {activeTerm?.isCurrent ? (
                <View style={termStyles.currentTag}>
                  <Text style={termStyles.currentTagText}>CURRENT</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={termStyles.changeBtn}>
          <Text style={termStyles.changeBtnText}>Change</Text>
          <Ionicons name="chevron-down" size={14} color={colors.primary} />
        </View>
      </Pressable>

      {/* Horizontal Term Chips for 1-Tap Switching */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={termStyles.chipsScroll}
      >
        {terms.map((term) => {
          const isSelected = activeTermId === term._id;
          return (
            <Pressable
              key={term._id}
              style={[termStyles.chip, isSelected && termStyles.chipActive]}
              onPress={() => onSelectTerm(term._id)}
              testID={`term-chip-${term._id}`}
            >
              <Text style={[termStyles.chipText, isSelected && termStyles.chipTextActive]}>
                {term.label}
              </Text>
              {term.isCurrent ? (
                <View
                  style={[
                    termStyles.chipCurrentDot,
                    isSelected && termStyles.chipCurrentDotActive,
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          style={[termStyles.chip, activeTermId === null && termStyles.chipActive]}
          onPress={() => onSelectTerm(null)}
          testID="term-chip-all"
        >
          <Text style={[termStyles.chipText, activeTermId === null && termStyles.chipTextActive]}>
            All Terms
          </Text>
        </Pressable>
      </ScrollView>

      {/* Full Modal Picker Sheet */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={termStyles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalOpen(false)} />
          <View style={termStyles.modalSheet}>
            <View style={termStyles.modalHeader}>
              <View>
                <Text style={termStyles.modalKicker}>SELECT LEGISLATIVE TERM</Text>
                <Text style={termStyles.modalTitle}>Sangguniang Bayan Archive</Text>
              </View>
              <Pressable
                onPress={() => setModalOpen(false)}
                hitSlop={10}
                testID="close-term-modal"
              >
                <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={termStyles.modalList}>
              {terms.map((term) => {
                const isSelected = activeTermId === term._id;
                return (
                  <Pressable
                    key={term._id}
                    style={[termStyles.modalItem, isSelected && termStyles.modalItemActive]}
                    onPress={() => {
                      onSelectTerm(term._id);
                      setModalOpen(false);
                    }}
                    testID={`term-modal-option-${term._id}`}
                  >
                    <View style={termStyles.flex}>
                      <View style={termStyles.modalItemTitleRow}>
                        <Text
                          style={[
                            termStyles.modalItemTitle,
                            isSelected && termStyles.modalItemTitleActive,
                          ]}
                        >
                          {term.label}
                        </Text>
                        {term.isCurrent ? (
                          <View style={termStyles.currentTag}>
                            <Text style={termStyles.currentTagText}>CURRENT</Text>
                          </View>
                        ) : null}
                      </View>
                      {term.presidingOfficer ? (
                        <Text style={termStyles.modalItemSubtitle}>
                          Presiding: {term.presidingOfficer}
                        </Text>
                      ) : null}
                      <Text style={termStyles.modalItemYears}>
                        {term.startYear} – {term.endYear}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}

              {/* All terms historical option */}
              <Pressable
                style={[termStyles.modalItem, activeTermId === null && termStyles.modalItemActive]}
                onPress={() => {
                  onSelectTerm(null);
                  setModalOpen(false);
                }}
                testID="term-modal-option-all"
              >
                <View style={termStyles.flex}>
                  <Text
                    style={[
                      termStyles.modalItemTitle,
                      activeTermId === null && termStyles.modalItemTitleActive,
                    ]}
                  >
                    All Terms (Show Entire History)
                  </Text>
                  <Text style={termStyles.modalItemSubtitle}>
                    Display all records and committees across all legislative periods
                  </Text>
                </View>
                {activeTermId === null ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const termStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.navy,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 44, 0.35)',
    shadowColor: '#171717',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  barIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 217, 117, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 217, 117, 0.3)',
  },
  barKicker: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accentGold,
    letterSpacing: 0.8,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  currentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  currentTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.5,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  chipCurrentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
  chipCurrentDotActive: {
    backgroundColor: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 16, 31, 0.6)',
  },
  modalSheet: {
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentText,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  modalList: {
    marginTop: 10,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemActive: {
    backgroundColor: colors.primaryTint,
    borderColor: '#c7d9f2',
    borderWidth: 1,
    borderBottomWidth: 1,
  },
  modalItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalItemTitleActive: {
    color: colors.primary,
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  modalItemYears: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingPage: { flex: 1, padding: 20, backgroundColor: colors.surface },
  loadingLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 14 },
  loadingHero: { height: 156, borderRadius: 16, backgroundColor: colors.borderLight, marginBottom: 18 },
  loadingMetricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  loadingMetric: { width: '47%', height: 82, borderRadius: 12, backgroundColor: colors.borderLight },
  loadingTitleLine: { width: '82%', height: 24, borderRadius: 7, backgroundColor: colors.borderLight, marginVertical: 10 },
  loadingDetailBody: { height: 280, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, marginTop: 18 },
  loadingMemberCard: { width: '47%', padding: 12, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight },
  loadingPortrait: { height: 120, borderRadius: 9, backgroundColor: colors.borderLight, marginBottom: 12 },
  loadingLineLong: { width: '72%', height: 14, borderRadius: 7, backgroundColor: colors.borderLight, marginBottom: 8 },
  loadingLineShort: { width: '44%', height: 11, borderRadius: 6, backgroundColor: colors.borderLight },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 14, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight },
  loadingIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.borderLight },
  loadingCardContent: { flex: 1, paddingTop: 6 },
  startupScreen: { ...StyleSheet.absoluteFill, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy, padding: 24 },
  startupSeal: { width: 104, height: 104, marginBottom: 18 },
  startupTitle: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  startupSubtitle: { color: colors.accentGold, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 4, textAlign: 'center' },
  startupIndicator: { marginTop: 32 },
  startupMessage: { color: colors.textOnDarkMuted, fontSize: 12, marginTop: 12 },
  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navyDark,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 217, 117, 0.2)',
  },
  noticeStripText: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: colors.surface,
  },
  loadingSpinnerWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  centerText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  centerSubtext: { color: colors.textMuted, fontSize: 12 },
  card: {
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    backgroundColor: colors.white,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardPaper: {
    backgroundColor: colors.paper,
    borderColor: colors.borderLight,
  },
  cardNavy: {
    backgroundColor: colors.navy,
    borderColor: 'rgba(255, 217, 117, 0.25)',
  },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  eyebrow: {
    color: colors.accentText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    marginTop: 3,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionTitleLight: { color: colors.white },
  eyebrowLight: { color: colors.accentGold },
  actionPressableLight: { backgroundColor: 'rgba(255,255,255,0.08)' },
  linkLight: { color: colors.accentGold },
  actionPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 2,
    backgroundColor: colors.primaryTint,
  },
  link: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  muted: { marginTop: 6, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  empty: {
    alignItems: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  errorBox: {
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    backgroundColor: colors.dangerTint,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: { color: colors.danger, fontWeight: '800', fontSize: 14 },
  errorText: { marginTop: 6, color: colors.dangerDark, fontSize: 12, lineHeight: 18 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.danger,
  },
  retryText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 2,
    borderWidth: 1,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  typeBadge: {
    width: 44,
    height: 44,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
});
