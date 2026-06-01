import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';

export default function Index() {
  const { isInitialized, firebaseUser } = useAuthStore();

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (firebaseUser) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
