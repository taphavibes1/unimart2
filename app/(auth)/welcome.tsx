import { View, StyleSheet, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { APP_NAME, UNIVERSITY_NAME, CAMPUS_LOCATION } from '../../constants';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🏪</Text>
        </View>
        <Text style={styles.appName}>{APP_NAME}</Text>
        <Text style={styles.tagline}>
          The campus marketplace for{'\n'}{UNIVERSITY_NAME} students
        </Text>
        <Text style={styles.location}>📍 {CAMPUS_LOCATION}</Text>
      </View>

      <View style={styles.featuresSection}>
        <FeatureItem icon="🛍️" text="Buy & sell with fellow students" />
        <FeatureItem icon="💬" text="Real-time chat & price negotiation" />
        <FeatureItem icon="🔒" text="Safe meeting zones on campus" />
        <FeatureItem icon="✅" text="Verified UNIBEN students only" />
      </View>

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
          textColor={Colors.primary}
        >
          I already have an account
        </Button>
        <Button
          mode="text"
          onPress={() => router.push('/(tabs)/home')}
          style={styles.guestButton}
          labelStyle={styles.guestButtonLabel}
          textColor={Colors.textOnPrimary}
        >
          Browse as Guest
        </Button>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: FontSize.display,
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  location: {
    fontSize: FontSize.md,
    color: Colors.accent,
    textAlign: 'center',
  },
  featuresSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: FontSize.md,
    color: Colors.textOnPrimary,
    flex: 1,
  },
  buttonSection: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
  },
  buttonContent: {
    height: 52,
  },
  primaryButtonLabel: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  secondaryButton: {
    borderColor: Colors.textOnPrimary,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'transparent',
  },
  secondaryButtonLabel: {
    fontSize: FontSize.lg,
  },
  guestButton: {
    borderRadius: BorderRadius.lg,
  },
  guestButtonLabel: {
    fontSize: FontSize.md,
    opacity: 0.8,
  },
});
