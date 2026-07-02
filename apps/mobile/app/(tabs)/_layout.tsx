import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../../constants/colors';

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View style={s.icon}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.35 }}>{emoji}</Text>
      <Text style={[s.label, focused && s.labelActive]}>{label}</Text>
      {focused && <View style={s.dot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'MAP',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🗺" label="MAP" />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'INCIDENTS',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="⚠️" label="INCIDENTS" />,
        }}
      />
      <Tabs.Screen
        name="areas"
        options={{
          title: 'MY AREAS',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📡" label="MY AREAS" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'COMMS',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="👤" label="COMMS" />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  icon:       { alignItems: 'center', gap: 2 },
  label:      { color: C.textFaint, fontSize: 7, fontWeight: '700', letterSpacing: 1 },
  labelActive:{ color: C.red },
  dot:        { position: 'absolute', bottom: -6, width: 4, height: 4, borderRadius: 2, backgroundColor: C.red },
});
