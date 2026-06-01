import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone is required';
    if (!form.department.trim()) newErrors.department = 'Department is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        department: form.department.trim(),
      });
      setUser({ ...user, name: form.name.trim(), phone: form.phone.trim(), department: form.department.trim() });
      Toast.show({ type: 'success', text1: 'Profile Updated!' });
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
            label="Phone Number"
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
            label="Department"
            value={form.department}
            onChangeText={(v) => updateField('department', v)}
            mode="outlined"
            style={styles.input}
            error={!!errors.department}
            left={<TextInput.Icon icon="school" />}
          />
          <HelperText type="error" visible={!!errors.department}>{errors.department}</HelperText>

          <View style={styles.readOnly}>
            <Text style={styles.readOnlyLabel}>Email (cannot be changed)</Text>
            <Text style={styles.readOnlyValue}>{user?.email}</Text>
          </View>

          <View style={styles.readOnly}>
            <Text style={styles.readOnlyLabel}>Student ID Number (cannot be changed)</Text>
            <Text style={styles.readOnlyValue}>{user?.studentIdNumber}</Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
            style={styles.saveButton}
            contentStyle={styles.saveContent}
            labelStyle={styles.saveLabel}
          >
            Save Changes
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.xs, paddingBottom: Spacing.xxl },
  input: { backgroundColor: Colors.surface },
  readOnly: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4 },
  readOnlyLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  readOnlyValue: { fontSize: FontSize.md, color: Colors.text },
  saveButton: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  saveContent: { height: 52 },
  saveLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
});
