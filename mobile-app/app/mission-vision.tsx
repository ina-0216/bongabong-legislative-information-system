import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, CivicNoticeStrip, colors } from './_ui';

const MISSION = [
  'To enact responsive and inclusive ordinances that promote economic vitality and social equity.',
  'To institutionalize transparency and accountability in all facets of local governance.',
  'To safeguard our natural resources through sustainable environmental policies.',
  'To empower constituent participation in the legislative process, bridging the gap between the government and the governed.',
];

const VALUES = [
  ['Integrity', 'Unwavering adherence to moral and ethical principles in public service.'],
  ['Transparency', 'Open and accessible governance processes fostering public trust.'],
  ['Resilience', 'Legislative foresight to build a community capable of withstanding future challenges.'],
  ['Equity', 'Ensuring fair and impartial allocation of resources and opportunities for all.'],
];

export default function MissionVisionScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <CivicNoticeStrip />
      <View style={styles.pageHead}>
        <Text style={styles.kicker}>ABOUT THE MUNICIPALITY</Text>
        <Text style={styles.title}>Institutional vision, mission &amp; core values</Text>
        <Text style={styles.lede}>The guiding principles and long-term aspirations that direct the legislative priorities and public service commitments of the Municipality of Bongabong.</Text>
      </View>

      <View style={styles.vision}>
        <Text style={styles.visionKicker}>MUNICIPAL VISION</Text>
        <Text style={styles.visionQuote}>“To forge a resilient, transparent, and progressively sustainable Bongabong, where legislative rigor meets the profound needs of every citizen, ensuring enduring prosperity and justice for future generations.”</Text>
      </View>

      <View style={styles.twoColumn}>
        <Card style={styles.article}>
          <Text style={styles.sectionTitle}>Strategic mission</Text>
          {MISSION.map((item) => (
            <View key={item} style={styles.missionPoint}>
              <View style={styles.goldRule} />
              <Text style={styles.body}>{item}</Text>
            </View>
          ))}
        </Card>
        <Card style={styles.article}>
          <Text style={styles.sectionTitle}>Core principles</Text>
          {VALUES.map(([title, description]) => (
            <View key={title} style={styles.value}>
              <Text style={styles.valueTitle}>{title}</Text>
              <Text style={styles.valueCopy}>{description}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.commitment}>
        <Text style={styles.sectionTitle}>A commitment to the people</Text>
        <Text style={styles.body}>We, the Sangguniang Bayan of Bongabong, hereby affirm our dedication to these ideals. Through rigorous debate, careful study, and steadfast public service, we commit to realizing this vision for our municipality.</Text>
        <Text style={styles.signature}>THE SANGGUNIANG BAYAN</Text>
      </View>

      <Pressable style={styles.backLink} onPress={() => router.replace('/')}>
        <Ionicons name="arrow-back" size={16} color={colors.primary} />
        <Text style={styles.backLinkText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paperSecondary },
  content: { paddingBottom: 40 },
  pageHead: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.borderDark },
  kicker: { color: colors.accentText, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: colors.textPrimary, fontSize: 29, fontWeight: '700', lineHeight: 34, marginTop: 7 },
  lede: { color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: 10 },
  vision: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 26, backgroundColor: colors.navy },
  visionKicker: { color: colors.accentGold, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  visionQuote: { maxWidth: 520, color: colors.white, fontSize: 22, fontStyle: 'italic', lineHeight: 31, marginTop: 14 },
  twoColumn: { paddingHorizontal: 16 },
  article: { marginTop: 16, padding: 20, borderRadius: 2, shadowOpacity: 0, elevation: 0 },
  sectionTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '700', lineHeight: 28, marginBottom: 14 },
  missionPoint: { flexDirection: 'row', gap: 12, marginBottom: 13 },
  goldRule: { width: 12, height: 1, marginTop: 10, backgroundColor: colors.accentDark },
  body: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 23 },
  value: { padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paperSecondary },
  valueTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 5 },
  valueCopy: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  commitment: { marginHorizontal: 20, marginTop: 24, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.borderDark, alignItems: 'center' },
  signature: { marginTop: 18, color: colors.textPrimary, fontSize: 13, letterSpacing: 1.2, fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 },
  backLinkText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
