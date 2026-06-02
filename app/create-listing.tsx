import { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput, Button, HelperText, Chip, ProgressBar } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { db, storage } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { LISTING_CATEGORIES, VERIFICATION_STATUSES, UGBOWO_CENTER } from '../constants';
import { isInsideUgbowo, generateId, formatPrice } from '../lib/utils';

const TITLE_MAX = 80;
const DESC_MAX = 500;

type UploadStep = 'idle' | 'location' | 'uploading' | 'saving' | 'done';

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  location: 'Checking campus location…',
  uploading: 'Uploading photos…',
  saving: 'Publishing listing…',
  done: 'Done!',
};

export default function CreateListingScreen() {
  const router = useRouter();
  const { user, firebaseUser } = useAuthStore();
  const [step, setStep] = useState<UploadStep>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: '', description: '', price: '', category: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isLoading = step !== 'idle' && step !== 'done';

  if (!firebaseUser || user?.verificationStatus !== VERIFICATION_STATUSES.VERIFIED) {
    return (
      <View style={styles.restricted}>
        <Text style={styles.restrictedEmoji}>🔒</Text>
        <Text style={styles.restrictedTitle}>Verification Required</Text>
        <Text style={styles.restrictedText}>
          Only verified UNIBEN students can create listings.
          {user?.verificationStatus === VERIFICATION_STATUSES.PENDING
            ? '\nYour ID is pending admin review.'
            : ' Register and submit your student ID to get verified.'}
        </Text>
        <Button onPress={() => router.back()} textColor={Colors.primary} style={{ marginTop: Spacing.md }}>
          Go Back
        </Button>
      </View>
    );
  }

  const updateField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const pickFromGallery = async () => {
    if (images.length >= 4) {
      Toast.show({ type: 'info', text1: 'Maximum 4 photos allowed' });
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Allow photo access in Settings.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
    }
  };

  const pickFromCamera = async () => {
    if (images.length >= 4) {
      Toast.show({ type: 'info', text1: 'Maximum 4 photos allowed' });
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Allow camera access in Settings.' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    else if (form.title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.price) newErrors.price = 'Price is required';
    else if (isNaN(Number(form.price)) || Number(form.price) <= 0) newErrors.price = 'Enter a valid price above ₦0';
    if (!form.category) newErrors.category = 'Please select a category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      // Step 1: Location
      setStep('location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      let userLocation = UGBOWO_CENTER;
      let locationLabel = 'UNIBEN Ugbowo';

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isInsideUgbowo(loc.coords.latitude, loc.coords.longitude)) {
          Toast.show({
            type: 'error',
            text1: 'Outside Campus',
            text2: 'You must be within UNIBEN Ugbowo to create listings.',
          });
          setStep('idle');
          return;
        }
        userLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        try {
          const [place] = await Location.reverseGeocodeAsync(loc.coords);
          locationLabel = place?.district || place?.subregion || 'UNIBEN Ugbowo';
        } catch {
          // reverse geocode is best-effort
        }
      }

      // Step 2: Upload images
      setStep('uploading');
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setUploadProgress((i + 0.5) / Math.max(images.length, 1));
        const response = await fetch(images[i]);
        const blob = await response.blob();
        const imgRef = ref(storage, `listings/${firebaseUser.uid}/${generateId()}`);
        await uploadBytes(imgRef, blob);
        const url = await getDownloadURL(imgRef);
        imageUrls.push(url);
        setUploadProgress((i + 1) / Math.max(images.length, 1));
      }

      // Step 3: Save to Firestore
      setStep('saving');
      await addDoc(collection(db, 'listings'), {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        imageUrls,
        sellerId: firebaseUser.uid,
        sellerName: user.name,
        sellerRating: user.rating || 0,
        status: 'available',
        location: userLocation,
        locationLabel,
        createdAt: new Date().toISOString(),
        savedBy: [],
      });

      setStep('done');
      Toast.show({ type: 'success', text1: '🎉 Listing Published!', text2: 'Your item is now live on the marketplace.' });
      router.back();
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not create listing. Try again.' });
      setStep('idle');
    }
  };

  const priceNum = Number(form.price);
  const showPricePreview = form.price && !isNaN(priceNum) && priceNum > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Listing',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.textOnPrimary,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Progress bar shown during submission */}
          {isLoading && (
            <View style={styles.progressBox}>
              <Text style={styles.progressLabel}>{STEP_LABELS[step]}</Text>
              <ProgressBar
                progress={step === 'uploading' ? uploadProgress : step === 'saving' ? 0.95 : 0.2}
                color={Colors.primary}
                style={styles.progressBar}
              />
              {step === 'uploading' && images.length > 0 && (
                <Text style={styles.progressSub}>
                  {Math.round(uploadProgress * images.length)} of {images.length} photo{images.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}

          {/* Photos */}
          <Text style={styles.sectionTitle}>Photos <Text style={styles.optional}>(optional, up to 4)</Text></Text>
          <View style={styles.imageGrid}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
                <TouchableOpacity onPress={() => removeImage(i)} style={styles.removeBtn}>
                  <MaterialCommunityIcons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 4 && (
              <View style={styles.addPhotoRow}>
                <TouchableOpacity onPress={pickFromGallery} style={styles.addPhoto}>
                  <MaterialCommunityIcons name="image-multiple" size={24} color={Colors.primary} />
                  <Text style={styles.addPhotoText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFromCamera} style={styles.addPhoto}>
                  <MaterialCommunityIcons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.addPhotoText}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Details */}
          <Text style={styles.sectionTitle}>Details</Text>

          <View>
            <TextInput
              label="Title *"
              value={form.title}
              onChangeText={(v) => updateField('title', v.slice(0, TITLE_MAX))}
              mode="outlined"
              style={styles.input}
              error={!!errors.title}
              placeholder="e.g. Engineering Mathematics Textbook"
              maxLength={TITLE_MAX}
            />
            <View style={styles.counterRow}>
              {errors.title ? (
                <HelperText type="error" visible style={styles.helperText}>{errors.title}</HelperText>
              ) : <View style={{ flex: 1 }} />}
              <Text style={styles.counter}>{form.title.length}/{TITLE_MAX}</Text>
            </View>
          </View>

          <View>
            <TextInput
              label="Description *"
              value={form.description}
              onChangeText={(v) => updateField('description', v.slice(0, DESC_MAX))}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={4}
              error={!!errors.description}
              placeholder="Describe your item — condition, why you're selling, included accessories…"
              maxLength={DESC_MAX}
            />
            <View style={styles.counterRow}>
              {errors.description ? (
                <HelperText type="error" visible style={styles.helperText}>{errors.description}</HelperText>
              ) : <View style={{ flex: 1 }} />}
              <Text style={styles.counter}>{form.description.length}/{DESC_MAX}</Text>
            </View>
          </View>

          <View>
            <TextInput
              label="Price (₦) *"
              value={form.price}
              onChangeText={(v) => updateField('price', v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              error={!!errors.price}
              left={<TextInput.Affix text="₦" />}
              placeholder="e.g. 3500"
            />
            {showPricePreview && (
              <Text style={styles.pricePreview}>= {formatPrice(priceNum)}</Text>
            )}
            {errors.price && (
              <HelperText type="error" visible>{errors.price}</HelperText>
            )}
          </View>

          {/* Category */}
          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.categoryGrid}>
            {LISTING_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                selected={form.category === cat.id}
                onPress={() => updateField('category', cat.id)}
                style={[styles.catChip, form.category === cat.id && styles.catChipSelected]}
                textStyle={[styles.catChipText, form.category === cat.id && styles.catChipTextSelected]}
                icon={cat.icon as any}
              >
                {cat.label}
              </Chip>
            ))}
          </View>
          {!!errors.category && <HelperText type="error" visible>{errors.category}</HelperText>}

          {/* Location note */}
          <View style={styles.locationNote}>
            <MaterialCommunityIcons name="map-marker-check" size={16} color="#1565C0" />
            <Text style={styles.locationNoteText}>
              Your approximate campus location is attached automatically. You must be within UNIBEN Ugbowo to list.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
            contentStyle={styles.submitContent}
            labelStyle={styles.submitLabel}
          >
            {isLoading ? STEP_LABELS[step] : 'Publish Listing'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.xs, paddingBottom: Spacing.xxl },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  restrictedEmoji: { fontSize: 56 },
  restrictedTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text },
  restrictedText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  progressBox: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.xs,
  },
  progressLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3 },
  progressSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  sectionTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.xs },
  optional: { fontSize: FontSize.sm, fontWeight: 'normal', color: Colors.textSecondary },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'flex-start' },
  imageThumb: { width: 90, height: 90, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  mainBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(26,35,126,0.75)', paddingVertical: 2, alignItems: 'center',
  },
  mainBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: BorderRadius.round,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  addPhotoRow: { flexDirection: 'row', gap: Spacing.sm },
  addPhoto: {
    width: 90, height: 90, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  input: { backgroundColor: Colors.surface },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  helperText: { flex: 1 },
  counter: { fontSize: FontSize.xs, color: Colors.textSecondary, paddingRight: Spacing.xs },
  pricePreview: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', paddingLeft: Spacing.sm, marginTop: 2 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: { backgroundColor: Colors.surface },
  catChipSelected: { backgroundColor: Colors.primary },
  catChipText: { color: Colors.text, fontSize: FontSize.sm },
  catChipTextSelected: { color: Colors.textOnPrimary },
  locationNote: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: '#E3F2FD', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm,
  },
  locationNoteText: { flex: 1, fontSize: FontSize.sm, color: '#1565C0', lineHeight: 18 },
  submitButton: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  submitContent: { height: 52 },
  submitLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
});
