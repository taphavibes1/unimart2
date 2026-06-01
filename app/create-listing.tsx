import { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';
import { db, storage } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { LISTING_CATEGORIES, VERIFICATION_STATUSES, UGBOWO_CENTER } from '../constants';
import { isInsideUgbowo, generateId } from '../lib/utils';

export default function CreateListingScreen() {
  const router = useRouter();
  const { user, firebaseUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!firebaseUser || user?.verificationStatus !== VERIFICATION_STATUSES.VERIFIED) {
    return (
      <View style={styles.restricted}>
        <Text style={styles.restrictedEmoji}>🔒</Text>
        <Text style={styles.restrictedTitle}>Verification Required</Text>
        <Text style={styles.restrictedText}>
          Only verified UNIBEN students can create listings.
          {user?.verificationStatus === VERIFICATION_STATUSES.PENDING
            ? ' Your ID is pending review.'
            : ''}
        </Text>
        <Button onPress={() => router.back()} textColor={Colors.primary}>Go Back</Button>
      </View>
    );
  }

  const updateField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const pickImages = async () => {
    if (images.length >= 4) {
      Toast.show({ type: 'info', text1: 'Maximum 4 photos allowed' });
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.price) newErrors.price = 'Price is required';
    else if (isNaN(Number(form.price)) || Number(form.price) <= 0) newErrors.price = 'Enter a valid price';
    if (!form.category) newErrors.category = 'Please select a category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      // Check geofence
      const { status } = await Location.requestForegroundPermissionsAsync();
      let userLocation = UGBOWO_CENTER;
      let locationLabel = 'UNIBEN Ugbowo';

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isInsideUgbowo(loc.coords.latitude, loc.coords.longitude)) {
          Toast.show({
            type: 'error',
            text1: 'Outside Campus',
            text2: 'You must be in UNIBEN Ugbowo to create listings.',
          });
          setIsLoading(false);
          return;
        }
        userLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        const [place] = await Location.reverseGeocodeAsync(loc.coords);
        locationLabel = place?.district || place?.subregion || 'UNIBEN Ugbowo';
      }

      // Upload images
      const imageUrls: string[] = [];
      for (const uri of images) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const imgRef = ref(storage, `listings/${firebaseUser.uid}/${generateId()}`);
        await uploadBytes(imgRef, blob);
        const url = await getDownloadURL(imgRef);
        imageUrls.push(url);
      }

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

      Toast.show({ type: 'success', text1: 'Listing Created!', text2: 'Your item is now live on the marketplace.' });
      router.back();
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not create listing. Try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create Listing', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.imageGrid}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity onPress={() => removeImage(i)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 4 && (
              <TouchableOpacity onPress={pickImages} style={styles.addPhoto}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>{images.length === 0 ? 'Add Photos' : 'Add More'}</Text>
                <Text style={styles.addPhotoHint}>{images.length}/4</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Details</Text>

          <TextInput
            label="Title *"
            value={form.title}
            onChangeText={(v) => updateField('title', v)}
            mode="outlined"
            style={styles.input}
            error={!!errors.title}
            placeholder="e.g. Engineering Mathematics Textbook"
          />
          <HelperText type="error" visible={!!errors.title}>{errors.title}</HelperText>

          <TextInput
            label="Description *"
            value={form.description}
            onChangeText={(v) => updateField('description', v)}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={4}
            error={!!errors.description}
            placeholder="Describe your item — condition, why selling, etc."
          />
          <HelperText type="error" visible={!!errors.description}>{errors.description}</HelperText>

          <TextInput
            label="Price (₦) *"
            value={form.price}
            onChangeText={(v) => updateField('price', v)}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            error={!!errors.price}
            left={<TextInput.Affix text="₦" />}
            placeholder="e.g. 3500"
          />
          <HelperText type="error" visible={!!errors.price}>{errors.price}</HelperText>

          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.categoryGrid}>
            {LISTING_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                selected={form.category === cat.id}
                onPress={() => { updateField('category', cat.id); }}
                style={[styles.catChip, form.category === cat.id && styles.catChipSelected]}
                textStyle={[styles.catChipText, form.category === cat.id && styles.catChipTextSelected]}
                icon={cat.icon as any}
              >
                {cat.label}
              </Chip>
            ))}
          </View>
          {!!errors.category && <HelperText type="error" visible>{errors.category}</HelperText>}

          <View style={styles.locationNote}>
            <Text style={styles.locationNoteText}>
              📍 Your approximate campus location will be attached to this listing.
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
            {isLoading ? 'Publishing...' : 'Publish Listing'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  restrictedEmoji: { fontSize: 56 },
  restrictedTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text },
  restrictedText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.md },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  imageThumb: { width: 80, height: 80, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeBtn: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: BorderRadius.round,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  addPhoto: {
    width: 80, height: 80, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  addPhotoIcon: { fontSize: 22 },
  addPhotoText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  addPhotoHint: { fontSize: 9, color: Colors.textSecondary },
  input: { backgroundColor: Colors.surface },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: { backgroundColor: Colors.surface },
  catChipSelected: { backgroundColor: Colors.primary },
  catChipText: { color: Colors.text, fontSize: FontSize.sm },
  catChipTextSelected: { color: Colors.textOnPrimary },
  locationNote: { backgroundColor: '#E3F2FD', borderRadius: BorderRadius.md, padding: Spacing.md },
  locationNoteText: { fontSize: FontSize.sm, color: '#1565C0' },
  submitButton: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  submitContent: { height: 52 },
  submitLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
});
