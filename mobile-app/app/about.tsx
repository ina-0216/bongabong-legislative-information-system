import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, CivicNoticeStrip, colors } from './_ui';

const STEPS = [
  ['01', 'First reading', 'The proposed measure is read by title and referred to the appropriate committee for study.'],
  ['02', 'Committee hearing & public consultation', 'The committee deliberates and conducts hearings. For ordinances, a public consultation is often held where citizens can voice their opinions.'],
  ['03', 'Second & third reading', 'The measure is debated and voted upon by the entire council.'],
  ['04', 'Approval', 'If passed, it is forwarded to the Mayor for signature and approval.'],
];

export default function AboutScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <CivicNoticeStrip />
      <View style={styles.pageHead}>
        <Text style={styles.kicker}>ABOUT</Text>
        <Text style={styles.title}>About the Sangguniang Bayan</Text>
        <Text style={styles.lede}>Tungkol sa Sangguniang Bayan ng Bongabong.</Text>
      </View>

      <Card style={styles.article}>
        <View style={styles.sealRow}>
          <Image source={require('../assets/bongabong-seal.png')} style={styles.seal} resizeMode="contain" accessibilityLabel="Official seal of the Municipality of Bongabong" />
          <View style={styles.articleCopy}>
            <Text style={styles.articleTitle}>The official seal</Text>
            <Text style={styles.body}>The Official Seal of the Municipality of Bongabong represents the authority and identity of our local government. It symbolizes our rich cultural heritage, our agricultural roots, and our vision for a progressive future.</Text>
            <Text style={styles.body}>Used in all official documents, resolutions, and ordinances enacted by the Sangguniang Bayan, the seal guarantees the authenticity and legal force of the council&apos;s legislative acts.</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.article}>
        <Text style={styles.articleTitle}>The legislative body</Text>
        <Text style={styles.body}>The Sangguniang Bayan (SB) is the local legislative body of the Municipality of Bongabong. It is composed of the Municipal Vice Mayor as the presiding officer, eight regular Sanggunian members, the President of the Association of Barangay Captains (ABC), and the President of the Sangguniang Kabataan (SK) Federation.</Text>
        <Text style={styles.body}>Their primary mandate is to enact ordinances, approve resolutions, and appropriate funds for the general welfare of the municipality and its inhabitants.</Text>
        <View style={styles.quote}>
          <Text style={styles.quoteText}>Ang Sangguniang Bayan (SB) ay ang lokal na tagapagbatas ng Munisipalidad ng Bongabong. Ito ay binubuo ng Municipal Vice Mayor bilang presiding officer, walong regular na miyembro, Pangulo ng ABC, at Pangulo ng SK Federation.</Text>
          <Text style={styles.quoteText}>Ang pangunahing tungkulin nila ay gumawa ng mga ordinansa, magpasa ng mga resolusyon, at maglaan ng pondo para sa pangkalahatang kapakanan ng munisipalidad at ng mga mamamayan nito.</Text>
        </View>
      </Card>

      <Card style={styles.article}>
        <Text style={styles.articleTitle}>The legislative process</Text>
        <Text style={styles.eyebrow}>How a proposed measure becomes a municipal law.</Text>
        {STEPS.map(([number, title, body]) => (
          <View key={number} style={styles.step}>
            <Text style={styles.stepNumber}>{number}</Text>
            <View style={styles.grow}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.contact}>
        <Ionicons name="location-outline" size={30} color={colors.accentGold} />
        <Text style={styles.contactTitle}>Contact us</Text>
        <Text style={styles.contactLine}>Sangguniang Bayan Office</Text>
        <Text style={styles.contactLine}>Municipal Hall, Poblacion, Bongabong</Text>
        <Text style={styles.contactLine}>Oriental Mindoro, Philippines 5211</Text>
        <Pressable onPress={() => Linking.openURL('mailto:sangguniangbayan@bongabong.gov.ph')}>
          <Text style={styles.contactMail}>sangguniangbayan@bongabong.gov.ph</Text>
        </Pressable>
        <Pressable style={styles.contactButton} onPress={() => Linking.openURL('https://facebook.com')}>
          <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.navy} />
          <Text style={styles.contactButtonText}>Follow us on Facebook</Text>
        </Pressable>
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
  article: { marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 2, shadowOpacity: 0, elevation: 0 },
  sealRow: { alignItems: 'stretch', gap: 16 },
  seal: { width: 112, height: 112, alignSelf: 'center' },
  grow: { flex: 1 },
  articleCopy: { width: '100%' },
  articleTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '700', lineHeight: 28, paddingBottom: 10, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 23, marginBottom: 12 },
  quote: { backgroundColor: colors.primaryTint, borderLeftWidth: 3, borderLeftColor: colors.accent, padding: 14, marginTop: 4 },
  quoteText: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', lineHeight: 21, marginBottom: 10 },
  eyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  step: { flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 16 },
  stepNumber: { width: 32, color: colors.accentText, fontSize: 17, fontVariant: ['tabular-nums'] },
  stepTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 5 },
  contact: { marginHorizontal: 16, marginTop: 16, padding: 24, alignItems: 'center', backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.navy },
  contactTitle: { width: '100%', color: colors.white, fontSize: 21, fontWeight: '700', textAlign: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.25)', paddingBottom: 12, marginBottom: 8 },
  contactLine: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  contactMail: { color: colors.accentGold, fontSize: 14, paddingVertical: 12 },
  contactButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, backgroundColor: colors.accentGold, borderRadius: 2 },
  contactButtonText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 },
  backLinkText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
