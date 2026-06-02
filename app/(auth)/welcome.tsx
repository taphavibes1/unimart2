import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { APP_NAME, UNIVERSITY_NAME, CAMPUS_LOCATION } from '../../constants';

const FEATURES = [
  { icon: '🛍️', text: 'Buy & sell with fellow students' },
  { icon: '💬', text: 'Negotiate prices in real-time chat' },
  { icon: '🔒', text: 'Escrow holds funds until item received' },
  { icon: '✅', text: 'Verified UNIBEN students only' },
];

const HOW_IT_WORKS = [
  { icon: 'shopping-outline', label: 'Browse', desc: 'Find items from verified students' },
  { icon: 'chat-processing-outline', label: 'Chat', desc: 'Negotiate and agree on a price' },
  { icon: 'lock-outline', label: 'Escrow', desc: 'Funds held safely until meetup' },
  { icon: 'qrcode-scan', label: 'Scan', desc: 'Scan QR to release payment' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🏪</Text>
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>
            The campus marketplace for{'\n'}{UNIVERSITY_NAME} students
          </Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color={Colors.accent} />
            <Text style={styles.location}>{CAMPUS_LOCATION}</Text>
          </View>
        </View>

        {/* Feature list */}
        <View style={styles.featuresSection}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <View style={styles.howSection}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={styles.howRow}>
            {HOW_IT_WORKS.map((step, i) => (
              <View key={step.label} style={styles.howStep}>
                <View style={styles.howIconWrap}>
                  <MaterialCommunityIcons name={step.icon as any} size={20} color={Colors.primary} />
                </View>
                <Text style={styles.howLabel}>{step.label}</Text>
                <Text style={styles.howDesc}>{step.desc}</Text>
                {i < HOW_IT_WORKS.length - 1 && (
                  <View style={styles.howArrow}>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={() => router.push('/(auth)/register')}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.primaryButtonLabel}
          >
            Get Started
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.secondaryButtonLabel}
            textColor={Colors.textOnPrimary}
          >
            I already have an account
          </Button>
          <Button
            mode="text"
            onPress={() => router.push('/(tabs)/home')}
            style={styles.guestButton}
            labelStyle={styles.guestButtonLabel}
            textColor="rgba(255,255,255,0.6)"
          >
            Browse as Guest
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xl },

  heroSection: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  logoContainer: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  logoEmoji: { fontSize: 44 },
  appName: {
    fontSize: FontSize.display, fontWeight: 'bold',
    color: Colors.textOnPrimary, textAlign: 'center',
  },
  tagline: {
    fontSize: FontSize.lg, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 24,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: FontSize.sm, color: Colors.accent },

  featuresSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureIcon: { fontSize: 20 },
  featureText: { fontSize: FontSize.md, color: Colors.textOnPrimary, flex: 1 },

  howSection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  howTitle: {
    fontSize: FontSize.md, fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)', textAlign: 'center', letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  howRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  howStep: { flex: 1, alignItems: 'center', gap: 4, position: 'relative' },
  howIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  howLabel: { fontSize: FontSize.xs, fontWeight: 'bold', color: Colors.textOnPrimary },
  howDesc: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 13 },
  howArrow: { position: 'absolute', right: -4, top: 12 },

  buttonSection: { gap: Spacing.sm, marginTop: Spacing.lg },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: BorderRadius.lg },
  buttonContent: { height: 52 },
  primaryButtonLabel: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  secondaryButton: { borderColor: Colors.textOnPrimary, borderRadius: BorderRadius.lg },
  secondaryButtonLabel: { fontSize: FontSize.lg },
  guestButton: { borderRadius: BorderRadius.lg },
  guestButtonLabel: { fontSize: FontSize.md },
});
