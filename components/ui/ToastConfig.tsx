import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={styles.successToast}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastSubtitle}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={styles.errorToast}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastSubtitle}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={styles.infoToast}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastSubtitle}
    />
  ),
};

const styles = StyleSheet.create({
  successToast: {
    borderLeftColor: Colors.success,
    borderRadius: BorderRadius.md,
    height: 'auto',
    minHeight: 60,
  },
  errorToast: {
    borderLeftColor: Colors.error,
    borderRadius: BorderRadius.md,
    height: 'auto',
    minHeight: 60,
  },
  infoToast: {
    borderLeftColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 'auto',
    minHeight: 60,
  },
  toastContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  toastTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text },
  toastSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
