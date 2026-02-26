import React, { useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View, Text, TouchableOpacity, Platform, StyleSheet,
  Animated, FlatList, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from './src/constants';
import { RootStackParamList } from './src/types';
import { Child } from './src/types';
import { loadChildren } from './src/store/albumStore';

// 앱 포그라운드에서도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CreateChildScreen from './src/screens/CreateChildScreen';
import AlbumListScreen from './src/screens/AlbumListScreen';
import AlbumDetailScreen from './src/screens/AlbumDetailScreen';
import CreateAlbumScreen from './src/screens/CreateAlbumScreen';
import ExportPDFScreen from './src/screens/ExportPDFScreen';
import CalendarScreen from './src/screens/CalendarScreen';

type HomeStackParamList = RootStackParamList;

type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  AddTab: undefined;
  CalendarTab: undefined;
  SettingsTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CalendarStack = createNativeStackNavigator<HomeStackParamList>();
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

function CalendarStackNav() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <CalendarStack.Screen name="Home" component={CalendarScreen} />
      <CalendarStack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <CalendarStack.Screen name="CreateAlbum" component={CreateAlbumScreen} />
      <CalendarStack.Screen name="ExportPDF" component={ExportPDFScreen} />
    </CalendarStack.Navigator>
  );
}

/* ── 피그마 디자인 탭 아이템 ── */
const TAB_ITEMS: { name: keyof TabParamList; label: string }[] = [
  { name: 'HomeTab',     label: '홈'  },
  { name: 'AddTab',     label: '추가' },
  { name: 'CalendarTab', label: '달력' },
  { name: 'SettingsTab', label: '설정' },
];

/* ── Ionicons 탭 아이콘 ── */
function TabIconView({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#fff' : '#9CA3AF';
  const size = 22;

  if (name === 'HomeTab') {
    return <Ionicons name={active ? 'home' : 'home-outline'} size={size} color={color} />;
  }
  if (name === 'AddTab') {
    return <Ionicons name="add" size={size} color={color} />;
  }
  if (name === 'CalendarTab') {
    return <Ionicons name={active ? 'calendar' : 'calendar-outline'} size={size} color={color} />;
  }
  // SettingsTab
  return <Ionicons name={active ? 'settings' : 'settings-outline'} size={size} color={color} />;
}

/* ── 추가 바텀시트 (그룹/앨범 선택) - 탭바 위에 떠서 탭바가 항상 보임 ── */
interface AddBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

function AddBottomSheet({ visible, onClose, navigation }: AddBottomSheetProps) {
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<'select' | 'group-list'>('select');
  const [children, setChildren] = useState<Child[]>([]);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setStep('select');
      setMounted(true);
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 1, damping: 20, useNativeDriver: true }),
        Animated.timing(dimAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(dimAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const translateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  const handleAddGroup = () => {
    onClose();
    setTimeout(() => {
      navigation.navigate('HomeTab', { screen: 'CreateChild', params: {} });
    }, 250);
  };

  const handleAddAlbum = async () => {
    const list = await loadChildren();
    setChildren(list);
    setStep('group-list');
  };

  const handleSelectGroup = (childId: string) => {
    onClose();
    setTimeout(() => {
      navigation.navigate('HomeTab', { screen: 'CreateAlbum', params: { childId } });
    }, 250);
  };

  if (!mounted) return null;

  return (
    /* 전체 화면 딤 + 시트 - position absolute로 탭바 위에 렌더링 */
    <View style={addSheetStyles.container} pointerEvents="box-none">
      {/* 딤 배경 (탭바 위까지 덮음) */}
      <Animated.View
        style={[addSheetStyles.dim, { opacity: dimAnim }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* 시트 - 탭바 바로 위에 위치 */}
      <Animated.View
        style={[addSheetStyles.sheet, { transform: [{ translateY }] }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          {/* 핸들 */}
          <View style={addSheetStyles.handle} />

          {step === 'select' ? (
            <>
              <Text style={addSheetStyles.title}>무엇을 추가할까요?</Text>

              {/* 그룹 추가 */}
              <TouchableOpacity style={addSheetStyles.row} onPress={handleAddGroup} activeOpacity={0.8}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={addSheetStyles.rowIconBox}
                >
                  <Ionicons name="people-outline" size={26} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={addSheetStyles.rowTitle}>그룹 추가</Text>
                  <Text style={addSheetStyles.rowSub}>새로운 그룹(인물)을 만들어요</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* 앨범 추가 */}
              <TouchableOpacity style={addSheetStyles.row} onPress={handleAddAlbum} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#818CF8', '#A78BFA']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={addSheetStyles.rowIconBox}
                >
                  <Ionicons name="book-outline" size={26} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={addSheetStyles.rowTitle}>앨범 추가</Text>
                  <Text style={addSheetStyles.rowSub}>그룹에 새 앨범을 만들어요</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={addSheetStyles.stepHeader}>
                <TouchableOpacity onPress={() => setStep('select')} style={addSheetStyles.backBtn}>
                  <Ionicons name="arrow-back-outline" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={addSheetStyles.title}>어떤 그룹에 추가할까요?</Text>
              </View>

              {children.length === 0 ? (
                <View style={addSheetStyles.emptyGroup}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
                  <Text style={addSheetStyles.emptyGroupText}>먼저 그룹을 만들어주세요!</Text>
                  <TouchableOpacity style={addSheetStyles.emptyGroupBtn} onPress={handleAddGroup}>
                    <Text style={addSheetStyles.emptyGroupBtnText}>+ 그룹 만들기</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={children}
                  keyExtractor={c => c.id}
                  style={{ maxHeight: 280 }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[addSheetStyles.groupRow, { backgroundColor: item.color + '12' }]}
                      onPress={() => handleSelectGroup(item.id)}
                      activeOpacity={0.8}
                    >
                      {item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={addSheetStyles.groupAvatar} />
                      ) : (
                        <View style={[addSheetStyles.groupEmojiBox, { backgroundColor: item.color + '28' }]}>
                          <Text style={addSheetStyles.groupEmoji}>{item.emoji}</Text>
                        </View>
                      )}
                      <View style={[addSheetStyles.colorDot, { backgroundColor: item.color }]} />
                      <Text style={addSheetStyles.groupName} numberOfLines={1}>{item.name}</Text>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}

          {/* 하단 여백 */}
          <View style={{ height: Platform.OS === 'ios' ? 16 : 8 }} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const addSheetStyles = StyleSheet.create({
  /* 전체 화면을 덮는 컨테이너 (탭바 포함한 전체) */
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 50,
    elevation: 50,
  },
  /* 딤 배경 */
  dim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  /* 시트: 탭바 바로 위에 */
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? 8 : 4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 60,
    zIndex: 51,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    marginBottom: 16, flex: 1,
  },
  stepHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8,
  },
  backBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },

  /* 추가 선택 행 */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F9FAFB', borderRadius: 20,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  rowIconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  rowSub: { fontSize: 13, color: COLORS.textSecondary },

  /* 그룹 선택 행 */
  groupRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    position: 'relative',
  },
  groupAvatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
    marginRight: 12,
  },
  groupEmojiBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  groupEmoji: { fontSize: 24 },
  colorDot: {
    position: 'absolute', left: 48, bottom: 10,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#fff',
  },
  groupName: {
    flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text,
  },

  /* 빈 그룹 상태 */
  emptyGroup: {
    alignItems: 'center', paddingVertical: 32,
  },
  emptyGroupText: {
    fontSize: 15, color: COLORS.textSecondary, marginBottom: 16,
  },
  emptyGroupBtn: {
    backgroundColor: COLORS.purple, borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyGroupBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

/* ── 커스텀 탭 바 ── */
function CustomTabBar({ state, navigation }: any) {
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  return (
    /* View가 탭바 + 시트 모두를 포함하는 컨테이너 역할 */
    <View style={tabStyles.outerWrapper} pointerEvents="box-none">
      {/* AddBottomSheet: 탭바보다 위에 absolute로 표시, 탭바는 항상 보임 */}
      <AddBottomSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        navigation={navigation}
      />

      {/* 탭바 본체 */}
      <View style={tabStyles.wrapper}>
        <View style={tabStyles.bar}>
          {TAB_ITEMS.map((tab, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              if (tab.name === 'AddTab') {
                setAddSheetVisible(true);
                return;
              }
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
    </View>
  );
}

/* AddTab 더미 컴포넌트 */
function AddPlaceholder() {
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
          <Tab.Screen name="CalendarTab" component={CalendarStackNav} />
          <Tab.Screen name="SettingsTab" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  /* 탭바 + 시트를 모두 감싸는 절대 위치 컨테이너 */
  outerWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    pointerEvents: 'box-none',
  },
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
  iconBox: {
    width: 44, height: 32, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
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
