import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../stores/authStore';
import { areasApi, incidentsApi } from '../../lib/api';
import { C } from '../../constants/colors';

const SOS_TYPES = [
  { key: 'medical_emergency', label: 'MEDICAL',    emoji: '🏥' },
  { key: 'fire',              label: 'FIRE',        emoji: '🔥' },
  { key: 'violence',          label: 'VIOLENCE',    emoji: '⚠️' },
  { key: 'missing_person',    label: 'MISSING',     emoji: '🔍' },
  { key: 'other',             label: 'GENERAL SOS', emoji: '🚨' },
];

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [areas, setAreas]               = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [sosOpen, setSosOpen]           = useState(false);
  const [sosActive, setSosActive]       = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user's areas
  useEffect(() => {
    areasApi.myAreas()
      .then((res) => {
        const list = res.data.data ?? [];
        setAreas(list);
        if (list.length > 0) setSelectedArea(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingAreas(false));
  }, []);

  // Pulse animation when SOS open
  useEffect(() => {
    if (sosOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [sosOpen]);

  const handleSosPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSosOpen(true);
  };

  const sendSos = async (type: string) => {
    if (!selectedArea) {
      Alert.alert('NO AREA', 'Join an area first to send an SOS.');
      return;
    }
    setSosActive(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let location: Location.LocationObject | null = null;
      if (status === 'granted') {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      }
      await incidentsApi.create(selectedArea.areaId, {
        type,
        description: `SOS Alert from ${user?.name}`,
        location: location ? {
          type: 'Point',
          coordinates: [location.coords.longitude, location.coords.latitude],
        } : undefined,
      });
      Alert.alert('🚨 SOS SENT', 'Emergency services have been notified. Stay calm.', [
        { text: 'OK', onPress: () => { setSosOpen(false); setSosActive(false); } },
      ]);
    } catch {
      Alert.alert('SEND FAILED', 'Could not send SOS. Try again.');
      setSosActive(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.signalRow}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[s.bar, { height: 3 + i * 2, opacity: i <= 3 ? 1 : 0.3 }]} />
            ))}
          </View>
          <Text style={s.headerTitle}>EMERGENCY OPS</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>ONLINE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Area selector */}
        {areas.length > 0 && (
          <View style={s.sectorRow}>
            <Text style={s.sectorLabel}>ACTIVE SECTOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {areas.map((a) => (
                <TouchableOpacity
                  key={a.areaId}
                  onPress={() => setSelectedArea(a)}
                  style={[s.sectorChip, selectedArea?.areaId === a.areaId && s.sectorChipActive]}
                >
                  <Text style={[s.sectorChipText, selectedArea?.areaId === a.areaId && s.sectorChipTextActive]}>
                    {a.area?.name?.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* SOS Button */}
        <View style={s.sosWrap}>
          {!sosOpen ? (
            <TouchableOpacity onPress={handleSosPress} activeOpacity={0.85}>
              <View style={s.sosOuter}>
                <View style={s.sosMid}>
                  <View style={s.sosInner}>
                    <Text style={s.sosBig}>SOS</Text>
                    <Text style={s.sosHint}>HOLD TO ACTIVATE</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.sosMenuWrap}>
              <Animated.View style={[s.sosOuter, s.sosOuterActive, { transform: [{ scale: pulseAnim }] }]}>
                <View style={[s.sosMid, s.sosMidActive]}>
                  <View style={[s.sosInner, s.sosInnerActive]}>
                    <Text style={s.sosBig}>SOS</Text>
                    <Text style={[s.sosHint, { color: '#fff' }]}>SELECT TYPE</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Type buttons */}
              <View style={s.typeGrid}>
                {SOS_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={s.typeBtn}
                    onPress={() => sendSos(t.key)}
                    disabled={sosActive}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                    <Text style={s.typeBtnLabel}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => setSosOpen(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>✕ CANCEL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick actions */}
        {!sosOpen && (
          <View style={s.quickRow}>
            <TouchableOpacity
              style={s.quickBtn}
              onPress={() => router.push('/areas/join')}
            >
              <Text style={s.quickEmoji}>⊕</Text>
              <Text style={s.quickLabel}>JOIN AREA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickBtn}
              onPress={() => router.push('/(tabs)/areas')}
            >
              <Text style={s.quickEmoji}>📡</Text>
              <Text style={s.quickLabel}>MY AREAS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickBtn}
              onPress={() => router.push('/(tabs)/notifications')}
            >
              <Text style={s.quickEmoji}>⚠️</Text>
              <Text style={s.quickLabel}>INCIDENTS</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signalRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar:         { width: 3, backgroundColor: C.red, borderRadius: 1 },
  headerTitle: { color: C.red, fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  onlineText:  { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

  sectorRow:       { paddingHorizontal: 16, paddingTop: 16 },
  sectorLabel:     { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  sectorChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5, borderWidth: 1, borderColor: C.border2, marginRight: 8, backgroundColor: C.surface },
  sectorChipActive:{ borderColor: C.red, backgroundColor: C.redDim },
  sectorChipText:  { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  sectorChipTextActive: { color: C.red },

  sosWrap:       { alignItems: 'center', paddingVertical: 40 },
  sosOuter:      { width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#2a0a0a', alignItems: 'center', justifyContent: 'center' },
  sosOuterActive:{ borderColor: C.red, shadowColor: C.red, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  sosMid:        { width: 170, height: 170, borderRadius: 85, borderWidth: 2, borderColor: '#3d0d0d', alignItems: 'center', justifyContent: 'center' },
  sosMidActive:  { borderColor: 'rgba(220,38,38,0.6)' },
  sosInner:      { width: 140, height: 140, borderRadius: 70, backgroundColor: '#1a0505', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4d1010' },
  sosInnerActive:{ backgroundColor: C.red },
  sosBig:        { color: C.red, fontSize: 36, fontWeight: '900', letterSpacing: 4 },
  sosHint:       { color: C.textFaint, fontSize: 7, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  sosMenuWrap:   { alignItems: 'center', gap: 24, width: '100%' },
  typeGrid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  typeBtn:       { width: 90, paddingVertical: 14, alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8 },
  typeBtnLabel:  { color: C.text, fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  cancelBtn:     { paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: C.border2, borderRadius: 6 },
  cancelText:    { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  quickRow:      { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  quickBtn:      { flex: 1, paddingVertical: 16, alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8 },
  quickEmoji:    { fontSize: 20 },
  quickLabel:    { color: C.textDim, fontSize: 8, fontWeight: '700', letterSpacing: 1.5 },
});
