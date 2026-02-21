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
  SettingsTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/* 탭바 높이 (다른 화면에서 bottomPadding에 활용) */
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

/* ── 탭 아이템 정의 ── */
const TAB_ITEMS = [
  { name: 'HomeTab',     label: '홈',  svgPath: 'home'     },
  { name: 'SettingsTab', label: '설정', svgPath: 'settings' },
];

/* ── 커스텀 탭 바 ── */
function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={tabStyles.wrapper}>
      {/* 배경 */}
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
              style={tabStyles.tabBtn}
              activeOpacity={0.75}
            >
              {/* 이미지처럼: 아이콘 박스 + 라벨 수직 배치 */}
              <View style={[tabStyles.iconWrap, isFocused && tabStyles.iconWrapActive]}>
                {isFocused ? (
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={tabStyles.iconGrad}
                  >
                    <TabIcon name={tab.name} active />
                  </LinearGradient>
                ) : (
                  <View style={tabStyles.iconGrad}>
                    <TabIcon name={tab.name} active={false} />
                  </View>
                )}
              </View>
              <Text style={[tabStyles.tabLabel, isFocused && tabStyles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ── 탭 아이콘 (이모티콘 없는 SVG 스타일 텍스트) ── */
function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#fff' : COLORS.textMuted;
  if (name === 'HomeTab') {
    return (
      <View style={tabStyles.svgIcon}>
        {/* 집 지붕 삼각형 느낌 */}
        <View style={[tabStyles.roofTop, { borderBottomColor: color }]} />
        <View style={[tabStyles.roofBody, { borderColor: color }]} />
      </View>
    );
  }
  // 설정: 기어 느낌 원
  return (
    <View style={tabStyles.svgIcon}>
      <View style={[tabStyles.gearOuter, { borderColor: color }]}>
        <View style={[tabStyles.gearInner, { backgroundColor: color }]} />
      </View>
    </View>
  );
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
          <Tab.Screen name="SettingsTab" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 16,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F3E8FF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'space-around',
  },
  tabBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  iconWrap: {
    width: 48, height: 32, borderRadius: 16,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: {},
  iconGrad: {
    width: 48, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11, fontWeight: '500', color: COLORS.textMuted, marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.purple, fontWeight: '700',
  },
  /* 집 아이콘 */
  svgIcon: { alignItems: 'center', justifyContent: 'center' },
  roofTop: {
    width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#9CA3AF',
    marginBottom: 1,
  },
  roofBody: {
    width: 11, height: 8,
    borderWidth: 1.5, borderColor: '#9CA3AF', borderRadius: 1,
  },
  /* 기어 아이콘 */
  gearOuter: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#9CA3AF',
    alignItems: 'center', justifyContent: 'center',
  },
  gearInner: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#9CA3AF',
  },
});
