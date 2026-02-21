import React from 'react';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './src/constants';
import { RootStackParamList } from './src/types';

import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CreateChildScreen from './src/screens/CreateChildScreen';
import AlbumListScreen from './src/screens/AlbumListScreen';
import AlbumDetailScreen from './src/screens/AlbumDetailScreen';
import CreateAlbumScreen from './src/screens/CreateAlbumScreen';
import ExportPDFScreen from './src/screens/ExportPDFScreen';

// RootStackParamList를 홈 스택 타입으로 사용
type HomeStackParamList = RootStackParamList;

/* ─── 탭 타입 ────────────────────────────────────────────── */
type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SettingsTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/* ─── 홈 스택 네비게이터 ────────────────────────────────── */
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="CreateChild" component={CreateChildScreen} />
      <HomeStack.Screen name="AlbumList" component={AlbumListScreen} />
      <HomeStack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <HomeStack.Screen name="CreateAlbum" component={CreateAlbumScreen} />
      <HomeStack.Screen name="ExportPDF" component={ExportPDFScreen} />
    </HomeStack.Navigator>
  );
}

/* ─── 커스텀 탭 바 ──────────────────────────────────────── */
function CustomTabBar({ state, descriptors, navigation }: any) {
  const tabs = [
    { name: 'HomeTab', label: '홈', icon: '🏠' },
    { name: 'SettingsTab', label: '설정', icon: '⚙️' },
  ];

  return (
    <View style={tabStyles.wrapper}>
      <LinearGradient
        colors={['rgba(255,255,255,0.97)', '#ffffff']}
        style={tabStyles.bar}
      >
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(tab.name);
          };
          return (
            <TouchableOpacity key={tab.name} onPress={onPress} style={tabStyles.tabBtn} activeOpacity={0.8}>
              {isFocused ? (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={tabStyles.pill}
                >
                  <Text style={tabStyles.activeIcon}>{tab.icon}</Text>
                  <Text style={tabStyles.activeLabel}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={tabStyles.pill}>
                  <Text style={tabStyles.inactiveIcon}>{tab.icon}</Text>
                  <Text style={tabStyles.inactiveLabel}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

/* ─── 메인 탭 네비게이터 ─────────────────────────────────── */
export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="HomeTab" component={HomeStackNav} />
          <Tab.Screen name="SettingsTab" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderTopWidth: 1, borderColor: 'rgba(243,232,255,0.9)',
  },
  tabBtn: { flex: 1, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 24, minWidth: 80, justifyContent: 'center',
  },
  activeIcon: { fontSize: 17 },
  activeLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  inactiveIcon: { fontSize: 17 },
  inactiveLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
});
