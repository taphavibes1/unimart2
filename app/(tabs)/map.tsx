import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Marker, Circle, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { UGBOWO_CENTER, SAFE_MEETING_ZONES } from '../../constants';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Map</Text>
        <Text style={styles.headerSubtitle}>Safe meeting zones at UNIBEN Ugbowo</Text>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: UGBOWO_CENTER.latitude,
          longitude: UGBOWO_CENTER.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        {SAFE_MEETING_ZONES.map((zone) => (
          <View key={zone.id}>
            <Marker
              coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
              pinColor={Colors.success}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{zone.name}</Text>
                  <Text style={styles.calloutDesc}>{zone.description}</Text>
                  <Text style={styles.calloutTag}>✅ Safe Meeting Zone</Text>
                </View>
              </Callout>
            </Marker>
            <Circle
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={100}
              fillColor="rgba(46, 125, 50, 0.12)"
              strokeColor="rgba(46, 125, 50, 0.5)"
              strokeWidth={2}
            />
          </View>
        ))}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>🟢 Safe Meeting Zones</Text>
        {SAFE_MEETING_ZONES.map((zone) => (
          <View key={zone.id} style={styles.legendItem}>
            <Text style={styles.legendDot}>📍</Text>
            <View>
              <Text style={styles.legendName}>{zone.name}</Text>
              <Text style={styles.legendDesc}>{zone.description}</Text>
            </View>
          </View>
        ))}
        <View style={styles.safetyTip}>
          <Text style={styles.safetyTipText}>
            💡 Always meet in well-lit, public areas on campus. Let someone know where you're going.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    paddingTop: Spacing.xl + Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.textOnPrimary },
  headerSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  map: { flex: 1 },
  callout: { padding: Spacing.sm, minWidth: 180 },
  calloutTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  calloutDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  calloutTag: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  legend: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.medium,
  },
  legendTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  legendDot: { fontSize: 18 },
  legendName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  legendDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  safetyTip: {
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  safetyTipText: { fontSize: FontSize.sm, color: Colors.success, lineHeight: 20 },
});
