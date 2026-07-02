'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { areasApi } from '../../lib/api';
import { C } from '../../constants/colors';

type Tab = 'code' | 'scan';

export default function JoinAreaScreen() {
  const [tab, setTab]           = useState<Tab>('code');
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [scanned, setScanned]   = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleJoin = useCallback(async (raw: string) => {
    let t = raw.trim();
    if (!t) return;
    let isQrToken = false;

    // Extract token from full URL (QR code)
    try {
      const url = new URL(t);
      const param = url.searchParams.get('token');
      if (param) { t = param; isQrToken = true; }
    } catch {}

    // Invite codes are uppercase; QR tokens are lowercase hex
    if (!isQrToken) t = t.toUpperCase();

    setLoading(true);
    try {
      await areasApi.join({ token: t });
      Vibration.vibrate([0, 100, 50, 100]);
      Alert.alert('✅ ACCESS GRANTED', 'Successfully joined the Area!', [
        { text: 'VIEW MY AREAS', onPress: () => router.replace('/(tabs)/areas') },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      Alert.alert('ACCESS DENIED', Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid code or token.'));
      setScanned(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const onBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (scanned || loading) return;
    setScanned(true);
    Vibration.vibrate(200);
    handleJoin(result.data);
  }, [scanned, loading, handleJoin]);

  const handleScanTab = async () => {
    setTab('scan');
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to scan QR codes.');
        setTab('code');
      }
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'code' && s.tabActive]}
          onPress={() => setTab('code')}
        >
          <Text style={[s.tabText, tab === 'code' && s.tabTextActive]}># INVITE CODE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'scan' && s.tabActive]}
          onPress={handleScanTab}
        >
          <Text style={[s.tabText, tab === 'scan' && s.tabTextActive]}>⊡ SCAN QR</Text>
        </TouchableOpacity>
      </View>

      {/* Code tab */}
      {tab === 'code' && (
        <View style={s.padded}>
          <View style={s.card}>
            <Text style={s.cardLabel}>ENTER INVITE CODE</Text>
            <TextInput
              style={s.codeInput}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="XXXXXXXX"
              placeholderTextColor="#333"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <TouchableOpacity
              style={[s.btn, (!code.trim() || loading) && s.btnDisabled]}
              onPress={() => handleJoin(code)}
              disabled={!code.trim() || loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>⊕ JOIN AREA</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={s.info}>
            <Text style={s.infoText}>
              ℹ️ รหัสเชิญได้จากผู้ดูแล Area หรือสแกน QR Code จากหน้า MY AREAS
            </Text>
          </View>
        </View>
      )}

      {/* Scan tab */}
      {tab === 'scan' && permission?.granted && (
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned}
          >
            {/* Overlay */}
            <View style={s.scanOverlay}>
              <View style={s.scanFrame}>
                {/* Corner brackets */}
                {[
                  { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
                  { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
                  { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
                  { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
                ].map((style, i) => (
                  <View key={i} style={[s.corner, style as any]} />
                ))}
              </View>
              <Text style={s.scanHint}>วาง QR ให้อยู่ในกรอบแดง</Text>
            </View>
          </CameraView>

          {scanned && (
            <View style={s.scanStatus}>
              <ActivityIndicator color={C.red} />
              <Text style={s.scanStatusText}>PROCESSING…</Text>
            </View>
          )}
        </View>
      )}

      {tab === 'scan' && !permission?.granted && (
        <View style={s.permWrap}>
          <Text style={{ fontSize: 40 }}>📵</Text>
          <Text style={s.permText}>CAMERA ACCESS REQUIRED</Text>
          <TouchableOpacity style={s.btn} onPress={requestPermission}>
            <Text style={s.btnText}>GRANT ACCESS</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  padded:{ padding: 16, gap: 12 },

  tabs:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:   { borderBottomColor: C.red },
  tabText:     { color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  tabTextActive:{ color: C.red },

  card:      { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 16, gap: 12 },
  cardLabel: { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  codeInput: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border2,
    borderRadius: 6, paddingHorizontal: 16, paddingVertical: 14,
    color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: 8,
    textAlign: 'center', fontFamily: 'monospace',
  },
  btn:        { backgroundColor: C.red, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  btnDisabled:{ opacity: 0.4 },
  btnText:    { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 3 },

  info:     { backgroundColor: '#0d0d0d', borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: '#333', borderRadius: 8, padding: 12 },
  infoText: { color: C.textFaint, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, lineHeight: 16 },

  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame:   { width: 220, height: 220, position: 'relative' },
  corner:      { position: 'absolute', width: 28, height: 28, borderColor: C.red, borderRadius: 2 },
  scanHint:    { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 24, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4 },

  scanStatus:     { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  scanStatusText: { color: C.red, fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  permText: { color: C.text, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});
