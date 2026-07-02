import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import { C } from '../constants/colors';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      Alert.alert('AUTH FAILED', Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.signalRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[s.bar, { height: 4 + i * 3 }]} />
          ))}
        </View>
        <Text style={s.system}>CERP TACTICAL SYSTEM</Text>
        <Text style={s.title}>EMERGENCY OPS</Text>
        <Text style={s.subtitle}>Community Emergency Response Platform</Text>
      </View>

      {/* Form */}
      <View style={s.card}>
        <Text style={s.cardLabel}>OPERATOR LOGIN</Text>

        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>PERSONNEL ID (EMAIL)</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="operator@cerp.io"
            placeholderTextColor={C.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>ACCESS CODE</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={C.textFaint}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>⊕ AUTHENTICATE</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.dot} />
        <Text style={s.footerText}>SECURE CHANNEL · ENCRYPTED</Text>
        <View style={s.dot} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg, justifyContent: 'center', paddingHorizontal: 24 },
  header:    { alignItems: 'center', marginBottom: 32 },
  signalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 16 },
  bar:       { width: 4, backgroundColor: C.red, borderRadius: 1 },
  system:    { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  title:     { color: C.red, fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  subtitle:  { color: C.textDim, fontSize: 10, letterSpacing: 2, marginTop: 4 },

  card:      { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 20 },
  cardLabel: { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 20 },

  fieldGroup:  { marginBottom: 16 },
  fieldLabel:  { color: C.textDim, fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 1, borderColor: C.border2,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12,
    color: C.text, fontSize: 14, letterSpacing: 0.5,
  },

  btn:        { backgroundColor: C.red, borderRadius: 6, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled:{ opacity: 0.5 },
  btnText:    { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 3 },

  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 },
  dot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: C.border2 },
  footerText: { color: C.textFaint, fontSize: 8, fontWeight: '700', letterSpacing: 2 },
});
