import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polygon, Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { areasApi, incidentsApi } from '../../../lib/api';
import { C } from '../../../constants/colors';

const INCIDENT_ICONS: Record<string, string> = {
  medical_emergency: '🏥', injury: '🩹', fire: '🔥',
  violence: '⚠️', missing_person: '🔍', suspicious_activity: '👁️',
  emergency: '🚨', other: '📢',
};

export default function AreaMapScreen() {
  const { areaId } = useLocalSearchParams<{ areaId: string }>();
  const [area, setArea]             = useState<any>(null);
  const [incidents, setIncidents]   = useState<any[]>([]);
  const [position, setPosition]     = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading]       = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    Promise.all([
      areasApi.findOne(areaId),
      incidentsApi.findAll(areaId, 'active'),
    ])
      .then(([areaRes, incRes]) => {
        setArea(areaRes.data.data);
        setIncidents(incRes.data.data ?? []);
      })
      .catch(() => Alert.alert('Error', 'Failed to load area data.'))
      .finally(() => setLoading(false));

    // Start watching position
    let sub: Location.LocationSubscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
    })();

    return () => { sub?.remove(); };
  }, [areaId]);

  // Build polygon coordinates from GeoJSON
  const polygonCoords = (() => {
    if (!area?.polygon) return null;
    try {
      const geo = typeof area.polygon === 'string' ? JSON.parse(area.polygon) : area.polygon;
      const coords: [number, number][] = geo?.coordinates?.[0] ?? [];
      return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    } catch { return null; }
  })();

  // Fit map to polygon
  useEffect(() => {
    if (!polygonCoords || !mapRef.current) return;
    const lats = polygonCoords.map((c) => c.latitude);
    const lngs = polygonCoords.map((c) => c.longitude);
    mapRef.current.fitToCoordinates(polygonCoords, {
      edgePadding: { top: 60, right: 40, bottom: 80, left: 40 },
      animated: true,
    });
  }, [polygonCoords]);

  const activeCount = incidents.filter((i) => i.status === 'active').length;

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.red} size="large" />
        <Text style={s.loadingText}>LOADING MAP…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.bg }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ BACK</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.areaName} numberOfLines={1}>{area?.name?.toUpperCase()}</Text>
            <Text style={s.areaStatus}>
              {activeCount > 0 ? `${activeCount} ACTIVE INCIDENT${activeCount > 1 ? 'S' : ''}` : 'ALL CLEAR'}
            </Text>
          </View>
          <View style={[s.statusDot, { backgroundColor: activeCount > 0 ? C.red : C.green }]} />
        </View>
      </SafeAreaView>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        mapType="satellite"
        showsUserLocation={false}
        showsCompass={false}
        initialRegion={{
          latitude: position?.lat ?? 13.7563,
          longitude: position?.lng ?? 100.5018,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Area polygon */}
        {polygonCoords && polygonCoords.length > 2 && (
          <Polygon
            coordinates={polygonCoords}
            strokeColor={C.red}
            strokeWidth={2.5}
            fillColor="rgba(220,38,38,0.08)"
            lineDashPattern={[8, 4]}
          />
        )}

        {/* User position */}
        {position && (
          <>
            <Circle
              center={{ latitude: position.lat, longitude: position.lng }}
              radius={25}
              fillColor="rgba(59,130,246,0.2)"
              strokeColor="rgba(59,130,246,0.5)"
              strokeWidth={1}
            />
            <Marker
              coordinate={{ latitude: position.lat, longitude: position.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={s.userMarker}>
                <View style={s.userDot} />
              </View>
            </Marker>
          </>
        )}

        {/* Incident markers */}
        {incidents.map((inc) => {
          if (!inc.location_geojson) return null;
          const [lng, lat] = inc.location_geojson.coordinates;
          const emoji = INCIDENT_ICONS[inc.type] ?? '🚨';
          return (
            <Marker
              key={inc.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={inc.type?.replace(/_/g, ' ')?.toUpperCase()}
              description={inc.description}
            >
              <View style={[s.incidentMarker, inc.status === 'active' && s.incidentActive]}>
                <Text style={{ fontSize: inc.status === 'active' ? 20 : 16 }}>{emoji}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Incident feed */}
      {incidents.length > 0 && (
        <View style={s.feed}>
          <Text style={s.feedLabel}>ACTIVE INCIDENTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {incidents.map((inc) => (
              <View key={inc.id} style={s.feedCard}>
                <Text style={{ fontSize: 16 }}>{INCIDENT_ICONS[inc.type] ?? '🚨'}</Text>
                <Text style={s.feedType}>{inc.type?.replace(/_/g, ' ')?.toUpperCase()}</Text>
                <View style={[s.feedDot, { backgroundColor: inc.status === 'active' ? C.red : C.green }]} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  loadingText: { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 3, marginTop: 12 },

  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:   { paddingRight: 4 },
  backText:  { color: C.red, fontSize: 14, fontWeight: '700' },
  areaName:  { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  areaStatus:{ color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  userMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.25)', alignItems: 'center', justifyContent: 'center' },
  userDot:    { width: 14, height: 14, borderRadius: 7, backgroundColor: C.blue, borderWidth: 2.5, borderColor: '#fff' },
  incidentMarker:       { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20, padding: 6, borderWidth: 1, borderColor: C.border2 },
  incidentActive:       { borderColor: C.red, backgroundColor: 'rgba(220,38,38,0.15)' },

  feed:      { backgroundColor: '#0d0d0d', borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 10 },
  feedLabel: { color: C.textFaint, fontSize: 8, fontWeight: '700', letterSpacing: 2 },
  feedCard:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginRight: 8 },
  feedType:  { color: C.textMid, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  feedDot:   { width: 5, height: 5, borderRadius: 3 },
});
