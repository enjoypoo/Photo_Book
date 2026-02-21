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

type HomeStackParamList = RootStackParamList;

type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  AddTab: undefined;
  CalendarTab: undefined;
  SettingsTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** 탭바 높이 상수 - 다른 화면에서 bottomPadding에 활용 */
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 82 : 64;

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

/* ── 피그마 디자인 탭 아이템 ── */
const TAB_ITEMS: { name: keyof TabParamList; label: string }[] = [
  { name: 'HomeTab',     label: '홈'  },
  { name: 'AddTab',     label: '추가' },
  { name: 'CalendarTab', label: '달력' },
  { name: 'SettingsTab', label: '설정' },
];

/* ── SVG 스타일 탭 아이콘 ── */
function TabIconView({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#fff' : '#9CA3AF';
  const size = 22;

  if (name === 'HomeTab') {
    // 집 아이콘
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* 지붕 */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 9,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: color, marginBottom: 1,
        }} />
        {/* 벽 */}
        <View style={{ width: 14, height: 9, backgroundColor: color, borderRadius: 1 }}>
          {/* 문 */}
          <View style={{
            position: 'absolute', bottom: 0, left: '50%', marginLeft: -2.5,
            width: 5, height: 5, backgroundColor: active ? COLORS.gradientStart : '#E5E7EB',
            borderTopLeftRadius: 2, borderTopRightRadius: 2,
          }} />
        </View>
      </View>
    );
  }
  if (name === 'AddTab') {
    // + 아이콘
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 18, height: 2.5, backgroundColor: color, borderRadius: 1.5, position: 'absolute' }} />
        <View style={{ width: 2.5, height: 18, backgroundColor: color, borderRadius: 1.5, position: 'absolute' }} />
      </View>
    );
  }
  if (name === 'CalendarTab') {
    // 달력 아이콘
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 16, height: 15, borderWidth: 1.8, borderColor: color,
          borderRadius: 3,
        }}>
          {/* 상단 날짜 고리 2개 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: -4 }}>
            <View style={{ width: 2.5, height: 5, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 2.5, height: 5, backgroundColor: color, borderRadius: 1 }} />
          </View>
          {/* 날짜 점들 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 2 }}>
            <View style={{ width: 2.5, height: 2.5, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 2.5, height: 2.5, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 2.5, height: 2.5, backgroundColor: color, borderRadius: 1 }} />
          </View>
        </View>
      </View>
    );
  }
  // 설정 아이콘 (기어)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 2, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
      </View>
    </View>
  );
}

/* ── 커스텀 탭 바 ── */
function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={tabStyles.wrapper}>
      <View style={tabStyles.bar}>
        {TAB_ITEMS.map((tab, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const key = state.routes[index]?.key;
            if (!key) return;
            const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(tab.name);
          };
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={tabStyles.tabItem}
              activeOpacity={0.75}
            >
              {/* 아이콘 박스 - 활성: 그라디언트 rounded */}
              {isFocused ? (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={tabStyles.iconBoxActive}
                >
                  <TabIconView name={tab.name} active />
                </LinearGradient>
              ) : (
                <View style={tabStyles.iconBox}>
                  <TabIconView name={tab.name} active={false} />
                </View>
              )}
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ── 플레이스홀더 화면 (추가/달력) ── */
function AddPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: COLORS.bgPink }} />;
}
function CalendarPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: COLORS.bgPink }} />;
}

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="HomeTab" component={HomeStackNav} />
          <Tab.Screen name="AddTab" component={AddPlaceholder} />
          <Tab.Screen name="CalendarTab" component={CalendarPlaceholder} />
          <Tab.Screen name="SettingsTab" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 16,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  /* 비활성 아이콘 박스 */
  iconBox: {
    width: 44, height: 32, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  /* 활성 아이콘: 그라디언트 pill */
  iconBoxActive: {
    width: 52, height: 36, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 10, fontWeight: '500', color: '#9CA3AF',
  },
  labelActive: {
    color: COLORS.purple, fontWeight: '700',
  },
});
