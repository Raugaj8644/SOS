import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { C } from '../../constants/colors';

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(user?.name ?? '');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { name: name.trim() });
      setUser(res.data.data);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('TERMINATE SESSION', 'ยืนยันการออกจากระบบ?', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'TERMINATE',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerSub}>OPERATOR</Text>
        <Text style={s.headerTitle}>PERSONNEL FILE</Text>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {/* Avatar card */}
        <View style={s.card}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {editing ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  onSubmitEditing={handleSave}
                />
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>SAVE</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { setName(user?.name ?? ''); setEditing(false); }}
                >
                  <Text style={s.cancelBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={s.userName}>{user?.name?.toUpperCase()}</Text>
                <TouchableOpacity onPress={() => setEditing(true)}>
                  <Text style={s.editLink}>✎ EDIT NAME</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <View style={{ alignItems: 'center', gap: 3 }}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>ONLINE</Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={s.infoCard}>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={s.rowIcon}><Text>👤</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>PERSONNEL ID</Text>
              <Text style={s.rowValue}>{user?.email}</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={s.rowIcon}><Text>🛡️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>CLEARANCE LEVEL</Text>
              <Text style={s.rowValue}>{(user?.role ?? 'USER').toUpperCase()}</Text>
            </View>
            <View style={s.activeBadge}><Text style={s.activeBadgeText}>ACTIVE</Text></View>
          </View>
        </View>

        {/* Status bar */}
        <View style={s.statusBar}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>CERP TACTICAL SYSTEM · ALL CHANNELS NOMINAL</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutCard} onPress={handleLogout} activeOpacity={0.75}>
          <View style={s.logoutIcon}><Text>⏻</Text></View>
          <Text style={s.logoutText}>TERMINATE SESSION</Text>
          <Text style={{ color: '#333', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerSub:   { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

  card:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(220,38,38,0.4)' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  userName:   { color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  editLink:   { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  onlineDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  onlineText: { color: C.textFaint, fontSize: 7, fontWeight: '700', letterSpacing: 1 },

  input:      { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.red, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 7, color: C.text, fontSize: 13 },
  saveBtn:    { backgroundColor: C.red, borderRadius: 4, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:{ color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cancelBtn:  { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border2, borderRadius: 4, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText:{ color: C.textDim, fontSize: 12 },

  infoCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon:  { width: 32, height: 32, backgroundColor: C.surface2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: C.textFaint, fontSize: 8, fontWeight: '700', letterSpacing: 2 },
  rowValue: { color: C.textMid, fontSize: 12, marginTop: 2 },
  activeBadge:    { backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redBorder, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  activeBadgeText:{ color: C.red, fontSize: 8, fontWeight: '700', letterSpacing: 1 },

  statusBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0d0d0d', borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: '#333', borderRadius: 8, padding: 12 },
  statusDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  statusText: { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  logoutCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14 },
  logoutIcon: { width: 32, height: 32, backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redBorder, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoutText: { flex: 1, color: C.red, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});
