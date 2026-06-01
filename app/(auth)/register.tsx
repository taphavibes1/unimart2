import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';
import { auth, db, storage } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { VERIFICATION_STATUSES } from '../../constants';

const DEPARTMENTS = [
  'Computer Science', 'Engineering', 'Medicine', 'Law', 'Business Admin',
  'Pharmacy', 'Education', 'Arts', 'Social Sciences', 'Agriculture', 'Other',
];

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser, setFirebaseUser } = useAuthStore();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [idImageUri, setIdImageUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    studentIdNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^[0-9]{11}$/.test(form.phone.replace(/\s/g, '')))
      newErrors.phone = 'Enter a valid 11-digit Nigerian number';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.department.trim()) newErrors.department = 'Department is required';
    if (!form.studentIdNumber.trim()) newErrors.studentIdNumber = 'Student ID is required';
    if (!idImageUri) newErrors.idImage = 'Student ID photo is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickIdImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Allow access to your photos.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setIdImageUri(result.assets[0].uri);
      setErrors((e) => ({ ...e, idImage: '' }));
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;
    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      let studentIdImageUrl = '';
      if (idImageUri) {
        setUploadProgress(0.3);
        const response = await fetch(idImageUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `student-ids/${credential.user.uid}`);
        await uploadBytes(storageRef, blob);
        setUploadProgress(0.7);
        studentIdImageUrl = await getDownloadURL(storageRef);
        setUploadProgress(1.0);
      }

      const userData = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department,
        studentIdNumber: form.studentIdNumber.trim(),
        studentIdImageUrl,
        verificationStatus: VERIFICATION_STATUSES.PENDING,
        rating: 0,
        totalSales: 0,
        isAdmin: false,
        walletBalance: 5000,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', credential.user.uid), userData);

      setFirebaseUser(credential.user);
      setUser({ id: credential.user.uid, ...userData });

      Toast.show({
        type: 'success',
        text1: 'Account Created!',
        text2: 'Your ID is pending verification by an admin.',
      });
      router.replace('/(tabs)/home');
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') message = 'An account already exists with this email.';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Step {step} of 2</Text>
          <ProgressBar
            progress={step / 2}
            color={Colors.accent}
            style={styles.progressBar}
          />
        </View>

        {step === 1 ? (
          <View style={styles.form}>
            <TextInput
              label="Full Name"
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
              left={<TextInput.Icon icon="account" />}
            />
            <HelperText type="error" visible={!!errors.name}>{errors.name}</HelperText>

            <TextInput
              label="Email Address"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              error={!!errors.email}
              left={<TextInput.Icon icon="email" />}
            />
            <HelperText type="error" visible={!!errors.email}>{errors.email}</HelperText>

            <TextInput
              label="Phone Number (e.g. 08012345678)"
              value={form.phone}
              onChangeText={(v) => updateField('phone', v)}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              error={!!errors.phone}
              left={<TextInput.Icon icon="phone" />}
            />
            <HelperText type="error" visible={!!errors.phone}>{errors.phone}</HelperText>

            <TextInput
              label="Password"
              value={form.password}
              onChangeText={(v) => updateField('password', v)}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              error={!!errors.password}
              left={<TextInput.Icon icon="lock" />}
            />
            <HelperText type="error" visible={!!errors.password}>{errors.password}</HelperText>

            <TextInput
              label="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              error={!!errors.confirmPassword}
              left={<TextInput.Icon icon="lock-check" />}
            />
            <HelperText type="error" visible={!!errors.confirmPassword}>{errors.confirmPassword}</HelperText>

            <Button
              mode="contained"
              onPress={() => validateStep1() && setStep(2)}
              style={styles.nextButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Next Step →
            </Button>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Student Verification</Text>
            <Text style={styles.sectionSubtitle}>
              We need your student details to verify your enrollment at UNIBEN.
            </Text>

            <TextInput
              label="Department / Faculty"
              value={form.department}
              onChangeText={(v) => updateField('department', v)}
              mode="outlined"
              style={styles.input}
              error={!!errors.department}
              left={<TextInput.Icon icon="school" />}
            />
            <HelperText type="error" visible={!!errors.department}>{errors.department}</HelperText>

            <TextInput
              label="Student ID Number"
              value={form.studentIdNumber}
              onChangeText={(v) => updateField('studentIdNumber', v)}
              mode="outlined"
              style={styles.input}
              error={!!errors.studentIdNumber}
              left={<TextInput.Icon icon="card-account-details" />}
            />
            <HelperText type="error" visible={!!errors.studentIdNumber}>{errors.studentIdNumber}</HelperText>

            <Text style={styles.uploadLabel}>Student ID Photo *</Text>
            <TouchableOpacity onPress={pickIdImage} style={styles.imageUploadArea}>
              {idImageUri ? (
                <Image source={{ uri: idImageUri }} style={styles.idPreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadText}>Tap to upload your Student ID</Text>
                  <Text style={styles.uploadHint}>Front side of your UNIBEN student ID card</Text>
                </View>
              )}
            </TouchableOpacity>
            {!!errors.idImage && (
              <HelperText type="error" visible>{errors.idImage}</HelperText>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ Your ID will be reviewed by an admin. You can browse the marketplace while waiting for verification.
              </Text>
            </View>

            {isLoading && uploadProgress > 0 && (
              <ProgressBar
                progress={uploadProgress}
                color={Colors.primary}
                style={styles.uploadProgressBar}
              />
            )}

            <View style={styles.stepButtons}>
              <Button
                mode="outlined"
                onPress={() => setStep(1)}
                style={styles.backButton}
                labelStyle={styles.backLabel}
                textColor={Colors.primary}
              >
                ← Back
              </Button>
              <Button
                mode="contained"
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Create Account
              </Button>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Button
            mode="text"
            onPress={() => router.push('/(auth)/login')}
            compact
            labelStyle={styles.loginLabel}
            textColor={Colors.primary}
          >
            Sign In
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg },
  header: { marginBottom: Spacing.xl, marginTop: Spacing.lg },
  title: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.primary },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.sm },
  progressBar: { height: 6, borderRadius: 3 },
  form: { gap: Spacing.xs },
  input: { backgroundColor: Colors.surface },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.primary, marginTop: Spacing.sm },
  sectionSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  uploadLabel: { fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.xs },
  imageUploadArea: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    minHeight: 150,
  },
  idPreview: { width: '100%', height: 200, resizeMode: 'cover' },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  uploadIcon: { fontSize: 40 },
  uploadText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
  uploadHint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoText: { fontSize: FontSize.sm, color: '#1565C0', lineHeight: 20 },
  uploadProgressBar: { height: 4, borderRadius: 2, marginTop: Spacing.sm },
  stepButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  backButton: { flex: 1, borderColor: Colors.primary },
  backLabel: { fontSize: FontSize.md },
  nextButton: { marginTop: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  submitButton: { flex: 2, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { fontSize: FontSize.md, color: Colors.textSecondary },
  loginLabel: { fontSize: FontSize.md, fontWeight: 'bold' },
});
