import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../src/utils/api';
import type { Committee, Term } from '../src/utils/api';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  SectionHeading,
  TermSelector,
  colors,
} from './_ui';

export default function CommitteesScreen() {
  const [committees, setCommittees] = useState<Committee[] | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
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

  // Fetch committees whenever activeTermId changes
  const loadCommittees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getCommittees(activeTermId ? { termId: activeTermId } : undefined);
      setCommittees(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load committees');
    } finally {
      setLoading(false);
    }
  }, [activeTermId]);

  useEffect(() => {
    // Only load if terms have been processed
    loadCommittees();
  }, [loadCommittees]);

  const activeTerm = terms.find((t) => t._id === activeTermId);
  const list = committees ?? [];

  const needle = search.trim().toLowerCase();
  const filtered = list.filter(
    (c) =>
      !needle ||
      c.name?.toLowerCase().includes(needle) ||
      c.chairperson?.toLowerCase().includes(needle) ||
      c.viceChairperson?.toLowerCase().includes(needle) ||
      c.description?.toLowerCase().includes(needle),
  );

  if (loading && committees === null) return <Loading label="Loading legislative committees" variant="committees" />;

  return (
    <View style={styles.screen} testID="committees-screen">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.content}
        testID="committees-list"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.banner}>
              <Ionicons name="grid" size={17} color={colors.accentGold} />
              <Text style={styles.bannerText}>
                SANGGUNIANG BAYAN STANDING COMMITTEES & JURISDICTIONS
              </Text>
            </View>

            {/* Term Selector Bar & Chips */}
            <TermSelector
              terms={terms}
              activeTermId={activeTermId}
              onSelectTerm={(id) => setActiveTermId(id)}
            />

            {/* Search Box */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={17} color={colors.primary} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search committee name, chair, or topic..."
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {error ? <ErrorState message={error} onRetry={loadCommittees} /> : null}

            <SectionHeading
              eyebrow={
                activeTerm ? `Term ${activeTerm.label}` : 'All Historical Terms'
              }
              title={`${filtered.length} Standing Committees`}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Card testID={`committee-${item._id}`}>
            <View style={styles.committeeHeader}>
              <View style={styles.iconWrap}>
                <Ionicons name="hammer-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
            </View>

            <View style={styles.officerBox}>
              <View style={styles.officerRow}>
                <Text style={styles.officerRole}>Chairperson:</Text>
                <Text style={styles.officerName}>{item.chairperson || 'To be designated'}</Text>
              </View>
              {item.viceChairperson ? (
                <View style={styles.officerRow}>
                  <Text style={styles.officerRole}>Vice Chair:</Text>
                  <Text style={styles.officerName}>{item.viceChairperson}</Text>
                </View>
              ) : null}
            </View>

            {item.description ? (
              <Text style={styles.desc}>{item.description}</Text>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              title={search ? 'No matching committees' : 'No committees in this term'}
              message={
                search
                  ? `No committees match "${search}". Try searching another keyword.`
                  : 'No standing committee assignments have been recorded for this term.'
              }
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
  header: { marginBottom: 6 },
  flex: { flex: 1 },
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
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  committeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d0e0f7',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  officerBox: {
    backgroundColor: colors.paperSecondary,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  officerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  officerRole: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentText,
    width: 82,
  },
  officerName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  desc: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
