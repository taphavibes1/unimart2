import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { auth } from '../../lib/firebase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return; }
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (error: any) {
      let message = 'Could not send reset email.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>📧</Text>
        <Text style={styles.successTitle}>Email Sent!</Text>
        <Text style={styles.successText}>
          Check your inbox at {email} for password reset instructions.
        </Text>
        <Button
          mode="contained"
          onPress={() => router.push('/(auth)/login')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Back to Login
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>
      </View>

      <TextInput
        label="Email Address"
        value={email}
        onChangeText={(v) => { setEmail(v); setError(''); }}
        keyboardType="email-address"
        autoCapitalize="none"
        mode="outlined"
        style={styles.input}
        error={!!error}
        left={<TextInput.Icon icon="email" />}
      />
      <HelperText type="error" visible={!!error}>{error}</HelperText>

      <Button
        mode="contained"
        onPress={handleReset}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Send Reset Email
      </Button>

      <Button
        mode="text"
        onPress={() => router.back()}
        textColor={Colors.primary}
        style={styles.backButton}
      >
        ← Back to Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background, justifyContent: 'center' },
  successContainer: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  emoji: { fontSize: 48, marginBottom: Spacing.sm },
  successEmoji: { fontSize: 64 },
  title: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.sm },
  successTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.success },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  successText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  input: { backgroundColor: Colors.surface },
  button: { marginTop: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
  backButton: { marginTop: Spacing.sm },
});
