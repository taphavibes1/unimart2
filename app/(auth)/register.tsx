import { useState } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Image, TouchableOpacity, Modal, FlatList,
} from 'react-native';
import { Text, TextInput, Button, HelperText, ProgressBar, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';
import { auth, db, storage } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { VERIFICATION_STATUSES } from '../../constants';

const DEPARTMENTS = [
  'Agriculture', 'Arts', 'Basic Medical Sciences', 'Business Administration',
  'Computer Science', 'Dentistry', 'Education', 'Engineering',
  'Environmental Sciences', 'Law', 'Life Sciences',
  'Medicine & Surgery', 'Pharmacy', 'Physical Sciences',
  'Social Sciences', 'Veterinary Medicine', 'Other',
];

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser, setFirebaseUser } = useAuthStore();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [idImageUri, setIdImageUri] = useState<string | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    department: '', studentIdNumber: '',
    password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^(\+234|0)[789][01]\d{8}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid Nigerian number (e.g. 08012345678)';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.department) e.department = 'Select your department';
    if (!form.studentIdNumber.trim()) e.studentIdNumber = 'Student ID number is required';
    else if (form.studentIdNumber.trim().length < 4) e.studentIdNumber = 'Enter a valid ID number';
    if (!idImageUri) e.idImage = 'Please upload your student ID photo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pickIdImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Allow photo library access.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });
    if (!result.canceled) {
      setIdImageUri(result.assets[0].uri);
      setErrors((e) => ({ ...e, idImage: '' }));
    }
  };

  const takeIdPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Allow camera access.' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
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
        auth, form.email.trim(), form.password
      );

      setUploadProgress(0.2);
      const response = await fetch(idImageUri!);
      const blob = await response.blob();
      const storageRef = ref(storage, `student-ids/${credential.user.uid}`);
      await uploadBytes(storageRef, blob);
      setUploadProgress(0.7);
      const studentIdImageUrl = await getDownloadURL(storageRef);
      setUploadProgress(0.9);

      const userData = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        department: form.department,
        studentIdNumber: form.studentIdNumber.trim().toUpperCase(),
        studentIdImageUrl,
        verificationStatus: VERIFICATION_STATUSES.PENDING,
        rating: 0,
        totalSales: 0,
        isAdmin: false,
        walletBalance: 5000,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', credential.user.uid), userData);
      setUploadProgress(1.0);

      setFirebaseUser(credential.user);
      setUser({ id: credential.user.uid, ...userData });

      Toast.show({
        type: 'success',
        text1: 'Account Created! 🎉',
        text2: 'Your ID is under review. Browse while you wait.',
      });
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'An account already exists with this email.',
        'auth/weak-password': 'Password is too weak.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/network-request-failed': 'No internet connection.',
      };
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: msg[error.code] || 'Something went wrong. Try again.',
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.stepLabel}>Step {step} of 2</Text>
            <ProgressBar
              progress={step / 2}
              color={Colors.accent}
              style={styles.progressBar}
            />
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <TextInput
                label="Full Name *"
                value={form.name}
                onChangeText={(v) => set('name', v)}
                mode="outlined"
                style={styles.input}
                error={!!errors.name}
                autoCapitalize="words"
                left={<TextInput.Icon icon="account-outline" />}
              />
              <HelperText type="error" visible={!!errors.name}>{errors.name}</HelperText>

              <TextInput
                label="Email Address *"
                value={form.email}
                onChangeText={(v) => set('email', v)}
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
                label="Phone Number *"
                value={form.phone}
                onChangeText={(v) => set('phone', v)}
                keyboardType="phone-pad"
                mode="outlined"
                style={styles.input}
                error={!!errors.phone}
                placeholder="08012345678"
                left={<TextInput.Icon icon="phone-outline" />}
              />
              <HelperText type="error" visible={!!errors.phone}>{errors.phone}</HelperText>

              <TextInput
                label="Password *"
                value={form.password}
                onChangeText={(v) => set('password', v)}
                secureTextEntry
                mode="outlined"
                style={styles.input}
                error={!!errors.password}
                left={<TextInput.Icon icon="lock-outline" />}
              />
              <HelperText type="error" visible={!!errors.password}>{errors.password}</HelperText>

              <TextInput
                label="Confirm Password *"
                value={form.confirmPassword}
                onChangeText={(v) => set('confirmPassword', v)}
                secureTextEntry
                mode="outlined"
                style={styles.input}
                error={!!errors.confirmPassword}
                left={<TextInput.Icon icon="lock-check-outline" />}
              />
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>

              <Button
                mode="contained"
                onPress={() => validateStep1() && setStep(2)}
                style={styles.nextButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Next: Student Verification →
              </Button>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Student Verification</Text>
                <Text style={styles.sectionSubtitle}>
                  Required to create listings. You can browse while waiting for approval.
                </Text>
              </View>

              {/* Department picker */}
              <TouchableOpacity
                onPress={() => setShowDeptPicker(true)}
                style={[styles.pickerButton, !!errors.department && styles.pickerButtonError]}
              >
                <Text style={styles.pickerIcon}>🏫</Text>
                <Text style={[styles.pickerText, !form.department && styles.pickerPlaceholder]}>
                  {form.department || 'Select Department / Faculty *'}
                </Text>
                <Text style={styles.pickerChevron}>▾</Text>
              </TouchableOpacity>
              <HelperText type="error" visible={!!errors.department}>{errors.department}</HelperText>

              <TextInput
                label="Student ID Number *"
                value={form.studentIdNumber}
                onChangeText={(v) => set('studentIdNumber', v)}
                autoCapitalize="characters"
                mode="outlined"
                style={styles.input}
                error={!!errors.studentIdNumber}
                left={<TextInput.Icon icon="card-account-details-outline" />}
                placeholder="e.g. ENG/2021/001"
              />
              <HelperText type="error" visible={!!errors.studentIdNumber}>
                {errors.studentIdNumber}
              </HelperText>

              {/* ID Image Upload */}
              <Text style={styles.uploadLabel}>Student ID Card Photo *</Text>
              {idImageUri ? (
                <View style={styles.idPreviewContainer}>
                  <Image source={{ uri: idImageUri }} style={styles.idPreview} />
                  <TouchableOpacity
                    onPress={() => setIdImageUri(null)}
                    style={styles.removeImage}
                  >
                    <Text style={styles.removeImageText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadRow}>
                  <TouchableOpacity onPress={pickIdImage} style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnIcon}>🖼️</Text>
                    <Text style={styles.uploadBtnText}>Choose Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={takeIdPhoto} style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnIcon}>📷</Text>
                    <Text style={styles.uploadBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
              <HelperText type="error" visible={!!errors.idImage}>{errors.idImage}</HelperText>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️ An admin will review your ID within 24 hours. Your data is kept private.
                </Text>
              </View>

              {isLoading && uploadProgress > 0 && (
                <View style={styles.uploadProgress}>
                  <Text style={styles.uploadProgressText}>
                    {uploadProgress < 0.7 ? 'Uploading ID...' : uploadProgress < 0.9 ? 'Creating account...' : 'Almost done...'}
                  </Text>
                  <ProgressBar progress={uploadProgress} color={Colors.primary} style={styles.progressBar} />
                </View>
              )}

              <View style={styles.stepButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setStep(1)}
                  disabled={isLoading}
                  style={styles.backButton}
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
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Department Picker Modal */}
      <Modal visible={showDeptPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setShowDeptPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Divider />
            <FlatList
              data={DEPARTMENTS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.deptItem, form.department === item && styles.deptItemSelected]}
                  onPress={() => {
                    set('department', item);
                    setShowDeptPicker(false);
                  }}
                >
                  <Text style={[styles.deptText, form.department === item && styles.deptTextSelected]}>
                    {item}
                  </Text>
                  {form.department === item && <Text style={styles.deptCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.xl, marginTop: Spacing.lg },
  title: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.primary },
  stepLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.sm },
  progressBar: { height: 6, borderRadius: 3 },
  form: { gap: Spacing.xs },
  input: { backgroundColor: Colors.surface },
  sectionHeader: { marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.primary },
  sectionSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  pickerButtonError: { borderColor: Colors.error },
  pickerIcon: { fontSize: 18 },
  pickerText: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  pickerPlaceholder: { color: Colors.placeholder },
  pickerChevron: { fontSize: FontSize.md, color: Colors.textSecondary },
  uploadLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  uploadRow: { flexDirection: 'row', gap: Spacing.md },
  uploadBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  uploadBtnIcon: { fontSize: 28 },
  uploadBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  idPreviewContainer: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  idPreview: { width: '100%', height: 180, resizeMode: 'cover' },
  removeImage: {
    backgroundColor: Colors.error,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  removeImageText: { color: '#fff', fontSize: FontSize.sm, fontWeight: 'bold' },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoText: { fontSize: FontSize.sm, color: '#1565C0', lineHeight: 20 },
  uploadProgress: { gap: Spacing.xs },
  uploadProgressText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  stepButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  backButton: { flex: 1, borderColor: Colors.primary },
  submitButton: { flex: 2, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  nextButton: { marginTop: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  footerText: { fontSize: FontSize.md, color: Colors.textSecondary },
  footerLink: { fontSize: FontSize.md, color: Colors.primary, fontWeight: 'bold' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '70%',
    ...Shadow.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  modalClose: { fontSize: FontSize.xl, color: Colors.textSecondary, padding: Spacing.sm },
  deptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  deptItemSelected: { backgroundColor: Colors.primary + '0F' },
  deptText: { fontSize: FontSize.md, color: Colors.text },
  deptTextSelected: { color: Colors.primary, fontWeight: '600' },
  deptCheck: { fontSize: FontSize.lg, color: Colors.primary },
});
