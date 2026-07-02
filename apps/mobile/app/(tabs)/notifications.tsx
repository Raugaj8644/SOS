import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificationsApi } from '../../lib/api';
import { C } from '../../constants/colors';

const INCIDENT_ICONS: Record<string, string> = {
  medical_emergency: '🏥', injury: '🩹', fire: '🔥',
  violence: '⚠️', missing_person: '🔍', suspicious_activity: '👁️',
  emergency: '🚨', other: '📢',
};

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'JUST NOW';
  if (m < 60) return `${m}M AGO`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H AGO`;
  return `${Math.floor(h / 24)}D AGO`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [unreadOnly, setUnreadOnly]       = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationsApi.findAll({ limit: 50, unread_only: unreadOnly });
      setNotifications(res.data.data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [unreadOnly]);

  useEffect(() => { load(); }, [unreadOnly]);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>INCIDENTS</Text>
          <Text style={s.headerTitle}>
            INCIDENT LOG
            {unreadCount > 0 && <Text style={{ color: C.red }}> [{unreadCount}]</Text>}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.allReadBtn} onPress={markAllRead}>
            <Text style={s.allReadText}>✓ ALL READ</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filter, !unreadOnly && s.filterActive]}
          onPress={() => setUnreadOnly(false)}
        >
          <Text style={[s.filterText, !unreadOnly && s.filterTextActive]}>ALL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filter, unreadOnly && s.filterActive]}
          onPress={() => setUnreadOnly(true)}
        >
          <Text style={[s.filterText, unreadOnly && s.filterTextActive]}>UNREAD</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.red} />
        }
      >
        {loading ? (
          [1, 2, 3].map((i) => <View key={i} style={s.skeleton} />)
        ) : notifications.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 40 }}>🟢</Text>
            <Text style={s.emptyText}>ALL CLEAR — NO INCIDENTS</Text>
          </View>
        ) : (
          notifications.map((n) => {
            const isAlert = n.type?.startsWith('incident');
            const emoji   = INCIDENT_ICONS[n.metadata?.incidentType ?? n.type] ?? '📢';
            return (
              <TouchableOpacity
                key={n.id}
                style={[s.card, !n.isRead && s.cardUnread]}
                onPress={() => !n.isRead && markRead(n.id)}
                activeOpacity={0.75}
              >
                <View style={s.cardLeft}>
                  <View style={[s.iconBox, isAlert && s.iconBoxAlert]}>
                    <Text style={{ fontSize: 18 }}>{emoji}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.nTitle}>{n.title}</Text>
                  {n.body ? <Text style={s.nBody} numberOfLines={2}>{n.body}</Text> : null}
                  <Text style={s.nTime}>{timeSince(n.createdAt)}</Text>
                </View>
                {!n.isRead && <View style={s.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerSub:   { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  allReadBtn:  { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6 },
  allReadText: { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  filterRow:       { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filter:          { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: C.border2 },
  filterActive:    { borderColor: C.red, backgroundColor: C.redDim },
  filterText:      { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  filterTextActive:{ color: C.red },

  skeleton:  { height: 72, backgroundColor: C.surface, marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  empty:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#333', fontSize: 10, fontWeight: '700', letterSpacing: 3 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 16, marginTop: 6,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, padding: 14,
  },
  cardUnread: { borderColor: 'rgba(220,38,38,0.25)', backgroundColor: '#130a0a' },
  cardLeft:   { paddingTop: 1 },
  iconBox:    { width: 38, height: 38, backgroundColor: C.surface2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBoxAlert:{ backgroundColor: 'rgba(220,38,38,0.12)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' },
  nTitle:    { color: C.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  nBody:     { color: C.textMid, fontSize: 11, marginTop: 3, lineHeight: 16 },
  nTime:     { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.red, marginTop: 4 },
});
