import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { areasApi } from '../../lib/api';
import { C } from '../../constants/colors';

const TYPE_ICON: Record<string, string> = {
  university: '🎓', school: '🏫', company: '🏢', concert: '🎵',
  camp: '⛺', marathon: '🏃', community: '🏘️', open_house: '🏠', other: '📍',
};

export default function MyAreasScreen() {
  const [areas, setAreas]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await areasApi.myAreas();
      setAreas(res.data.data ?? []);
    } catch {
      Alert.alert('Error', 'Failed to load areas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const shareQr = async (areaId: string, areaName: string) => {
    try {
      const areaRes = await areasApi.findOne(areaId);
      const areaData = areaRes.data.data;
      const joinUrl = `http://192.168.1.7:3000/areas/join?token=${areaData.qrToken}`;
      await Share.share({
        message: `Join "${areaName}" on CERP:\n\nInvite code: ${areaData.inviteCode}\nLink: ${joinUrl}`,
        title: `Join ${areaName}`,
      });
    } catch {
      Alert.alert('Error', 'Cannot load area info (admin only).');
    }
  };

  const activeCount = areas.filter((a) => a.area?.isActive).length;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>MY AREAS</Text>
          <Text style={s.headerTitle}>ACTIVE SECTORS: {String(activeCount).padStart(2, '0')}</Text>
        </View>
        <TouchableOpacity
          style={s.joinBtn}
          onPress={() => router.push('/areas/join')}
        >
          <Text style={s.joinBtnText}>⊕ JOIN</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.red} />}
      >
        {loading ? (
          [1, 2, 3].map((i) => <View key={i} style={s.skeleton} />)
        ) : areas.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 40 }}>📡</Text>
            <Text style={s.emptyText}>NO SECTORS ASSIGNED</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/areas/join')}>
              <Text style={s.emptyBtnText}>JOIN AREA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          areas.map(({ area, role, areaId }) => (
            <TouchableOpacity
              key={areaId}
              style={[s.card, { borderLeftColor: area?.isActive ? C.red : '#444' }]}
              onPress={() => router.push(`/areas/${areaId}/map`)}
              activeOpacity={0.75}
            >
              {/* Icon */}
              <View style={s.icon}>
                <Text style={{ fontSize: 18 }}>{TYPE_ICON[area?.type] ?? '📍'}</Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.name}>{area?.name?.toUpperCase()}</Text>
                  {role === 'admin' && (
                    <View style={s.adminBadge}><Text style={s.adminText}>ADMIN</Text></View>
                  )}
                </View>
                <Text style={s.status}>{area?.isActive ? 'ACTIVE' : 'OFFLINE'}</Text>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {role === 'admin' && (
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={() => shareQr(areaId, area?.name)}
                  >
                    <Text style={{ fontSize: 14 }}>⎘</Text>
                  </TouchableOpacity>
                )}
                <View style={[s.dot, { backgroundColor: area?.isActive ? C.red : '#444' }]} />
                <Text style={s.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Join button */}
      {!loading && areas.length > 0 && (
        <View style={{ padding: 16, paddingTop: 0 }}>
          <TouchableOpacity
            style={s.bigJoinBtn}
            onPress={() => router.push('/areas/join')}
          >
            <Text style={s.bigJoinText}>⊕ JOIN NEW AREA</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerSub:   { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  joinBtn:     { backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redBorder, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6 },
  joinBtnText: { color: C.red, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  skeleton:  { height: 64, backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  empty:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#333', fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  emptyBtn:  { backgroundColor: C.red, borderRadius: 4, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 3, borderRadius: 8, padding: 12,
  },
  icon:    { width: 38, height: 38, backgroundColor: C.surface2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  name:    { color: C.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  status:  { color: C.textDim, fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  adminBadge: { backgroundColor: C.red, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  adminText:  { color: '#fff', fontSize: 7, fontWeight: '700', letterSpacing: 1 },
  iconBtn: { width: 28, height: 28, backgroundColor: C.surface2, borderRadius: 5, borderWidth: 1, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
  dot:     { width: 7, height: 7, borderRadius: 4 },
  chevron: { color: '#333', fontSize: 22, lineHeight: 22 },

  bigJoinBtn:  { borderWidth: 1, borderColor: C.red, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  bigJoinText: { color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
});
