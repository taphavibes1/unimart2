import { useState } from 'react';
import {
  View, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { auth, db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setFirebaseUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
      if (userDoc.exists()) {
        setFirebaseUser(credential.user);
        setUser({ id: credential.user.uid, ...userDoc.data() } as any);
      }
      Toast.show({ type: 'success', text1: 'Welcome back! 👋' });
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Try again.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes.',
        'auth/network-request-failed': 'No internet connection.',
      };
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: msg[error.code] || 'Something went wrong. Try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🏪</Text>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back to Ugbowo Market</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email Address"
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            mode="outlined"
            style={styles.input}
            error={!!errors.email}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <HelperText type="error" visible={!!errors.email}>{errors.email}</HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            error={!!errors.password}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          <HelperText type="error" visible={!!errors.password}>{errors.password}</HelperText>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Sign In
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          style={styles.guestRow}
        >
          <Text style={styles.guestText}>Continue as guest (browse only)</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  headerEmoji: { fontSize: 52, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.primary },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4 },
  form: { gap: Spacing.xs },
  input: { backgroundColor: Colors.surface },
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.xs },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  loginButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: { fontSize: FontSize.md, color: Colors.textSecondary },
  footerLink: { fontSize: FontSize.md, color: Colors.primary, fontWeight: 'bold' },
  guestRow: { alignItems: 'center', marginTop: Spacing.md },
  guestText: { fontSize: FontSize.sm, color: Colors.placeholder, textDecorationLine: 'underline' },
});
