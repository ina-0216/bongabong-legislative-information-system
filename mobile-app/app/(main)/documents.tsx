import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, getDocumentSponsorNames } from '../../src/utils/api';
import type { Committee, Paginated, PublicDocument, Term } from '../../src/utils/api';
import {
  DOCUMENT_TYPES,
  documentQueryParams,
  documentStatusesForType,
  hasNextPage,
} from '../../src/utils/selectors';
import type { DocumentStatusFilter, DocumentTypeFilter } from '../../src/utils/selectors';
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

const PAGE_SIZE = 20;

export default function DocumentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string | string[];
    status?: string | string[];
    search?: string | string[];
    termId?: string | string[];
    year?: string | string[];
    committee?: string | string[];
  }>();

  const [query, setQuery] = useState(() => (typeof params.search === 'string' ? params.search : ''));
  const [type, setType] = useState<DocumentTypeFilter>(() => parseType(params.type));
  const [status, setStatus] = useState<DocumentStatusFilter>(() => parseStatus(params.status, parseType(params.type)));
  const [termId, setTermId] = useState(() => firstParam(params.termId) ?? '');
  const [year, setYear] = useState(() => firstParam(params.year) ?? '');
  const [committee, setCommittee] = useState(() => firstParam(params.committee) ?? '');
  const [terms, setTerms] = useState<Term[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<PublicDocument> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDocuments(
        documentQueryParams(query, type, page, PAGE_SIZE, status, { termId, year, committee }),
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [committee, page, query, status, termId, type, year]);

  useEffect(() => {
    let active = true;
    api.getTerms().then((data) => { if (active) setTerms(data); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.getCommittees(termId ? { termId } : undefined)
      .then((data) => { if (active) setCommittees(data); })
      .catch(() => { if (active) setCommittees([]); });
    return () => { active = false; };
  }, [termId]);

  useEffect(() => {
    const nextType = parseType(params.type);
    const nextStatus = parseStatus(params.status, nextType);
    if (typeof params.search === 'string') {
      setQuery(params.search);
    }
    setType(nextType);
    setStatus(nextStatus);
    setTermId(firstParam(params.termId) ?? '');
    setYear(firstParam(params.year) ?? '');
    setCommittee(firstParam(params.committee) ?? '');
    setPage(1);
  }, [params.committee, params.search, params.status, params.termId, params.type, params.year]);

  const updateFilters = (nextType: DocumentTypeFilter, nextStatus: DocumentStatusFilter) => {
    const supportedStatuses = documentStatusesForType(nextType);
    const resolvedStatus = supportedStatuses.includes(nextStatus) ? nextStatus : 'All';
    setType(nextType);
    setStatus(resolvedStatus);
    setPage(1);
    router.setParams({
      type: nextType === 'All' ? undefined : nextType,
      status: resolvedStatus === 'All' ? undefined : resolvedStatus,
    });
  };

  const updateAdvancedFilters = (next: { termId?: string; year?: string; committee?: string }) => {
    const nextTermId = next.termId ?? termId;
    const nextYear = next.year ?? year;
    const nextCommittee = next.committee ?? committee;
    setTermId(nextTermId);
    setYear(nextYear);
    setCommittee(nextCommittee);
    setPage(1);
    router.setParams({
      termId: nextTermId || undefined,
      year: nextYear || undefined,
      committee: nextCommittee || undefined,
    });
  };

  const clearAdvancedFilters = () => {
    setTermId('');
    setYear('');
    setCommittee('');
    setStatus('All');
    setPage(1);
    router.setParams({ termId: undefined, year: undefined, committee: undefined, status: undefined });
  };

  useEffect(() => {
    const timer = setTimeout(load, query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const docs = result?.docs ?? [];
  const total = result?.total ?? 0;
  const lastPage = result?.pages ?? 1;
  const statusOptions = documentStatusesForType(type);
  const activeFilterCount = [termId, year, committee, status !== 'All' ? status : ''].filter(Boolean).length;
  const termYears = terms.flatMap((term) => {
    const end = Math.min(term.endYear, new Date().getFullYear() + 1);
    return Array.from({ length: Math.max(0, end - term.startYear + 1) }, (_, index) => end - index);
  });
  const availableYears = [...new Set(termYears.length ? termYears : Array.from(
    { length: 20 }, (_, index) => new Date().getFullYear() - index,
  ))].sort((a, b) => b - a);

  if (loading && !result) {
    return <Loading label="Loading legislative archive" variant="list" />;
  }

  return (
    <View style={styles.screen} testID="documents-screen">
      <FlatList
        data={docs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        testID="documents-list"
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.primary} />
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setPage(1);
                }}
                placeholder="Search by title, number, or keyword..."
                placeholderTextColor={colors.textMuted}
                testID="documents-search"
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Record Type Filter Segmented Control */}
            <Text style={styles.filterLabel}>RECORD TYPE</Text>
            <View style={styles.chipRow}>
              {DOCUMENT_TYPES.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => updateFilters(option, status)}
                  style={[styles.chip, type === option && styles.chipActive]}
                  testID={`filter-${option}`}
                >
                  <Text style={[styles.chipText, type === option && styles.chipTextActive]}>
                    {option === 'All' ? 'All Records' : `${option}s`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Status Filter Scroll */}
            <Text style={styles.filterLabel}>LEGISLATIVE STATUS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusScroll}
            >
              {statusOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => updateFilters(type, option)}
                  style={[styles.statusChip, status === option && styles.statusChipActive]}
                  testID={`status-${option}`}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      status === option && styles.statusChipTextActive,
                    ]}
                  >
                    {option === 'All' ? 'Any Status' : option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.advancedFilterHeader}>
              <Pressable
                style={styles.moreFiltersButton}
                onPress={() => setFiltersExpanded((expanded) => !expanded)}
                accessibilityRole="button"
                accessibilityState={{ expanded: filtersExpanded }}
                testID="toggle-more-filters"
              >
                <Ionicons name="options-outline" size={16} color={colors.primary} />
                <Text style={styles.moreFiltersText}>
                  {activeFilterCount ? `More filters (${activeFilterCount})` : 'More filters'}
                </Text>
                <Ionicons name={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
              </Pressable>
              {activeFilterCount > 0 ? (
                <Pressable onPress={clearAdvancedFilters} accessibilityRole="button" testID="clear-document-filters">
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>

            {filtersExpanded ? (
              <View style={styles.advancedFilters} testID="advanced-document-filters">
                <Text style={styles.filterLabel}>LEGISLATIVE TERM</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
                  <FilterChip label="All Terms" active={!termId} onPress={() => updateAdvancedFilters({ termId: '', committee: '' })} testID="term-any" />
                  {terms.map((term) => (
                    <FilterChip
                      key={term._id}
                      label={term.label}
                      active={termId === term._id}
                      onPress={() => updateAdvancedFilters({ termId: term._id, committee: '' })}
                      testID={`term-${term._id}`}
                    />
                  ))}
                </ScrollView>

                <Text style={styles.filterLabel}>YEAR FILED</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
                  <FilterChip label="Any Year" active={!year} onPress={() => updateAdvancedFilters({ year: '' })} testID="year-any" />
                  {availableYears.map((option) => (
                    <FilterChip
                      key={option}
                      label={String(option)}
                      active={year === String(option)}
                      onPress={() => updateAdvancedFilters({ year: String(option) })}
                      testID={`year-${option}`}
                    />
                  ))}
                </ScrollView>

                <Text style={styles.filterLabel}>COMMITTEE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
                  <FilterChip label="All Committees" active={!committee} onPress={() => updateAdvancedFilters({ committee: '' })} testID="committee-any" />
                  {committees.map((option) => (
                    <FilterChip
                      key={option._id}
                      label={option.name}
                      active={committee === option.name}
                      onPress={() => updateAdvancedFilters({ committee: option.name })}
                      testID={`committee-${option._id}`}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {error ? <ErrorState message={error} onRetry={load} /> : null}

            <SectionHeading
              eyebrow="Archival record"
              title={`${total} ${total === 1 ? 'Record' : 'Records'} Found`}
            />
          </View>
        }
        renderItem={({ item }) => {
          const summary = item.plainLanguageSummary || item.plainLanguageSummary_tl;
          const sponsors = getDocumentSponsorNames(item);
          return (
            <Card
              onPress={() => router.push(`/document/${item._id}`)}
              testID={`document-${item._id}`}
            >
              <View style={styles.row}>
                <TypeBadge type={item.type} />
                <View style={styles.flex}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.number}>{item.number}</Text>
                    <StatusPill status={item.status} />
                  </View>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {summary ? (
                    <Text style={styles.summary} numberOfLines={3}>{summary}</Text>
                  ) : null}
                  {sponsors.length ? (
                    <Text style={styles.sponsors} numberOfLines={2}>
                      {sponsors.join(', ')}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Ionicons name="briefcase-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.committee || 'General Legislative'}
                    </Text>
                    <Text style={styles.dot}>•</Text>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.meta}>{formatDate(item.filedAt || item.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              title="No records found"
              message={query || activeFilterCount
                ? 'Try changing or clearing your search and filters.'
                : 'No public records are available in this category yet.'}
            />
          )
        }
        ListFooterComponent={
          docs.length > 0 ? (
            <View style={styles.pager}>
              <Pressable
                style={[styles.pagerButton, page <= 1 && styles.pagerDisabled]}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                testID="prev-page"
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
                Page {page} of {Math.max(1, lastPage)}
              </Text>
              <Pressable
                style={[styles.pagerButton, !hasNextPage(page, lastPage) && styles.pagerDisabled]}
                disabled={!hasNextPage(page, lastPage)}
                onPress={() => setPage((p) => p + 1)}
                testID="next-page"
              >
                <Text
                  style={[
                    styles.pagerText,
                    !hasNextPage(page, lastPage) && styles.pagerTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={!hasNextPage(page, lastPage) ? colors.borderDark : colors.primary}
                />
              </Pressable>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

function FilterChip({ label, active, onPress, testID }: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.statusChip, active && styles.statusChipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={testID}
    >
      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 36 },
  header: { marginBottom: 4 },
  flex: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#171717',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  search: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentText,
    letterSpacing: 1,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '800' },
  statusScroll: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  statusChipActive: {
    borderColor: colors.accentDark,
    backgroundColor: colors.accentTint,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: colors.accentText,
    fontWeight: '800',
  },
  advancedFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  moreFiltersButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  moreFiltersText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  clearFiltersText: { color: colors.accentText, fontSize: 12, fontWeight: '700' },
  advancedFilters: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  number: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  summary: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  sponsors: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15,
    color: colors.accentText,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  meta: { fontSize: 11, color: colors.textMuted },
  dot: { color: colors.borderDark, fontSize: 10 },
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

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseType(value?: string | string[]): DocumentTypeFilter {
  const candidate = firstParam(value);
  return candidate && (DOCUMENT_TYPES as readonly string[]).includes(candidate)
    ? (candidate as DocumentTypeFilter)
    : 'All';
}

function parseStatus(value: string | string[] | undefined, type: DocumentTypeFilter): DocumentStatusFilter {
  const candidate = firstParam(value);
  return candidate && (documentStatusesForType(type) as readonly string[]).includes(candidate)
    ? (candidate as DocumentStatusFilter)
    : 'All';
}
