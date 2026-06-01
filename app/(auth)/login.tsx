import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        Toast.show({ type: 'success', text1: 'Welcome back!', text2: `Signed in as ${email}` });
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      let message = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait.';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🔑</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your Ugbowo Market account</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            error={!!errors.email}
            left={<TextInput.Icon icon="email" />}
          />
          <HelperText type="error" visible={!!errors.email}>{errors.email}</HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            error={!!errors.password}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          <HelperText type="error" visible={!!errors.password}>{errors.password}</HelperText>

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotButton}
            labelStyle={styles.forgotLabel}
            textColor={Colors.primary}
          >
            Forgot Password?
          </Button>

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
          <Button
            mode="text"
            onPress={() => router.push('/(auth)/register')}
            compact
            labelStyle={styles.registerLabel}
            textColor={Colors.primary}
          >
            Sign Up
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: { gap: Spacing.xs },
  input: { backgroundColor: Colors.surface },
  forgotButton: { alignSelf: 'flex-end' },
  forgotLabel: { fontSize: FontSize.sm },
  loginButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: { fontSize: FontSize.md, color: Colors.textSecondary },
  registerLabel: { fontSize: FontSize.md, fontWeight: 'bold' },
});
