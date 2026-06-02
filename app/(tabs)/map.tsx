import { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Marker, Circle, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { UGBOWO_CENTER, SAFE_MEETING_ZONES } from '../../constants';

const INITIAL_REGION: Region = {
  latitude: UGBOWO_CENTER.latitude,
  longitude: UGBOWO_CENTER.longitude,
  latitudeDelta: 0.022,
  longitudeDelta: 0.022,
};

const SAFETY_RULES = [
  { icon: 'clock-outline', text: 'Meet during daylight hours only' },
  { icon: 'account-group', text: 'Bring a friend or meet in a crowd' },
  { icon: 'phone', text: 'Tell someone where you are going' },
  { icon: 'eye-outline', text: 'Inspect items before any payment' },
  { icon: 'currency-usd-off', text: 'Never pay before receiving the item' },
];

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const goToMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.012, longitudeDelta: 0.012 },
        600
      );
    } catch {
      // permission denied or unavailable — silently ignore
    } finally {
      setLocating(false);
    }
  };

  const goToCampus = () => {
    mapRef.current?.animateToRegion(INITIAL_REGION, 600);
    setSelectedZone(null);
  };

  const focusZone = (zone: typeof SAFE_MEETING_ZONES[0]) => {
    setSelectedZone(zone.id);
    mapRef.current?.animateToRegion(
      { latitude: zone.latitude, longitude: zone.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      500
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Map</Text>
        <Text style={styles.headerSubtitle}>Safe meeting zones · UNIBEN Ugbowo</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
        >
          {SAFE_MEETING_ZONES.map((zone) => (
            <Marker
              key={zone.id}
              coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
              onPress={() => setSelectedZone(zone.id)}
            >
              <View style={[styles.markerPin, selectedZone === zone.id && styles.markerPinSelected]}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={18}
                  color={selectedZone === zone.id ? Colors.textOnPrimary : Colors.success}
                />
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{zone.name}</Text>
                  <Text style={styles.calloutDesc}>{zone.description}</Text>
                  <View style={styles.calloutBadge}>
                    <Text style={styles.calloutBadgeText}>✅ Safe Meeting Zone</Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          ))}

          {SAFE_MEETING_ZONES.map((zone) => (
            <Circle
              key={`circle-${zone.id}`}
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={120}
              fillColor="rgba(46, 125, 50, 0.10)"
              strokeColor={selectedZone === zone.id ? Colors.success : 'rgba(46, 125, 50, 0.4)'}
              strokeWidth={selectedZone === zone.id ? 3 : 2}
            />
          ))}
        </MapView>

        {/* Map control buttons */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapBtn} onPress={goToCampus}>
            <MaterialCommunityIcons name="school" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn} onPress={goToMyLocation} disabled={locating}>
            <MaterialCommunityIcons
              name={locating ? 'loading' : 'crosshairs-gps'}
              size={20}
              color={userLocation ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend + safety tips */}
      <ScrollView style={styles.legend} contentContainerStyle={styles.legendContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.legendTitle}>📍 Safe Meeting Zones</Text>
        <View style={styles.zoneList}>
          {SAFE_MEETING_ZONES.map((zone) => (
            <TouchableOpacity
              key={zone.id}
              style={[styles.zoneRow, selectedZone === zone.id && styles.zoneRowSelected]}
              onPress={() => focusZone(zone)}
              activeOpacity={0.75}
            >
              <View style={[styles.zoneDot, selectedZone === zone.id && styles.zoneDotSelected]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <Text style={styles.zoneDesc}>{zone.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.rulesTitle}>🛡️ Safety Rules</Text>
        {SAFETY_RULES.map((rule, i) => (
          <View key={i} style={styles.ruleRow}>
            <View style={styles.ruleIconWrap}>
              <MaterialCommunityIcons name={rule.icon as any} size={16} color={Colors.primary} />
            </View>
            <Text style={styles.ruleText}>{rule.text}</Text>
          </View>
        ))}
      </ScrollView>
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
  headerSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  mapContainer: { flex: 1.4, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapControls: {
    position: 'absolute', right: Spacing.md, bottom: Spacing.md,
    gap: Spacing.sm,
  },
  mapBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    ...Shadow.medium,
  },
  markerPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.success,
    ...Shadow.small,
  },
  markerPinSelected: {
    backgroundColor: Colors.success, borderColor: Colors.success,
  },
  callout: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, minWidth: 200, maxWidth: 240,
    ...Shadow.medium,
  },
  calloutTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  calloutDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 },
  calloutBadge: {
    backgroundColor: '#E8F5E9', borderRadius: BorderRadius.round,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  calloutBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  legend: { flex: 1, backgroundColor: Colors.surface, ...Shadow.medium },
  legendContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  legendTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.xs },
  zoneList: { gap: 4, marginBottom: Spacing.sm },
  zoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  zoneRowSelected: { backgroundColor: '#E8F5E9' },
  zoneDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, opacity: 0.5 },
  zoneDotSelected: { opacity: 1, width: 12, height: 12, borderRadius: 6 },
  zoneName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  zoneDesc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  rulesTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.sm },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  ruleText: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
});
