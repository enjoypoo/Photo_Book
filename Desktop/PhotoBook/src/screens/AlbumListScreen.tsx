import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, SafeAreaView, StatusBar, TextInput,
  ScrollView, SectionList, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, Child, FilterType, RootStackParamList } from '../types';
import { loadAlbumsByChild, loadChildren, deleteAlbum } from '../store/albumStore';
import { COLORS, WEATHER_LABEL } from '../constants';
import { formatAlbumDate, formatMonthYear } from '../utils/dateUtils';
import { TAB_BAR_HEIGHT } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumList'>;
type Route = RouteProp<RootStackParamList, 'AlbumList'>;

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all',      label: '전체'   },
  { key: 'year',     label: '년도별' },
  { key: 'month',    label: '월별'   },
  { key: 'location', label: '장소별' },
];

export default function AlbumListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { childId } = route.params;

  const [child, setChild] = useState<Child | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchText, setSearchText] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    loadChildren().then(list => setChild(list.find(c => c.id === childId) ?? null));
    loadAlbumsByChild(childId).then(setAlbums);
    setSelectMode(false);
    setSelected(new Set());
  }, [childId]));

  const filtered = albums.filter(a => {
    if (searchText) {
      const q = searchText.toLowerCase();
      return a.title.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.story.toLowerCase().includes(q) ||
        a.date.includes(q);
    }
    return true;
  });

  const grouped = (): { title: string; data: Album[] }[] => {
    if (filter === 'all') return [{ title: '', data: filtered }];
    const map: Record<string, Album[]> = {};
    for (const a of filtered) {
      let key = '';
      if (filter === 'year') key = a.date.slice(0, 4) + '년';
      else if (filter === 'month') key = formatMonthYear(a.date);
      else if (filter === 'location') key = a.location || '장소 미입력';
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return Object.entries(map).map(([title, data]) => ({ title, data }));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('삭제', '이 앨범을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteAlbum(id);
        setAlbums(prev => prev.filter(a => a.id !== id));
      }},
    ]);
  };

  /* ── 앨범 카드 ── */
  const AlbumCard = ({ item }: { item: Album }) => {
    const cover = item.coverPhotoId
      ? item.photos.find(p => p.id === item.coverPhotoId) ?? item.photos[0]
      : item.photos[0];
    const isSelected = selected.has(item.id);
    const themeColor = child?.color;

    const weatherDisplay = item.weather === 'other' && item.weatherCustom
      ? item.weatherCustom
      : item.weatherEmoji
        ? `${item.weatherEmoji} ${WEATHER_LABEL[item.weather] ?? ''}`
        : '';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          /* 카드 배경: 항상 흰색, 선택 시 테마색 테두리 */
          isSelected && [
            styles.cardSelected,
            themeColor && { borderColor: themeColor },
          ],
        ]}
        onPress={() => selectMode
          ? toggleSelect(item.id)
          : navigation.navigate('AlbumDetail', { albumId: item.id, childId })}
        onLongPress={() => {
          if (!selectMode) Alert.alert(item.title, '무엇을 할까요?', [
            { text: '수정',  onPress: () => navigation.navigate('CreateAlbum', { childId, albumId: item.id }) },
            { text: '삭제', style: 'destructive', onPress: () => handleDelete(item.id) },
            { text: '취소', style: 'cancel' },
          ]);
        }}
        activeOpacity={0.85}
      >
        {selectMode && (
          <View style={[styles.check, isSelected && styles.checkActive]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}

        {/* 썸네일 - 카드 내부 패딩 + 둥근 모서리 (그룹카드 이미지 스타일) */}
        <View style={styles.thumbWrap}>
          {cover ? (
            <Image source={{ uri: cover.uri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Ionicons name="camera-outline" size={28} color={COLORS.purple} />
            </View>
          )}
        </View>

        {/* 정보 영역 */}
        <View style={styles.cardBody}>
          {/* 제목 */}
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>

          {/* 메타 정보 */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.calendarIcon} style={{ marginRight: 4 }} />
              <Text style={styles.metaText} numberOfLines={1}>
                {formatAlbumDate(item.date, item.dateEnd)}
              </Text>
            </View>
            {item.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color={COLORS.purple} style={{ marginRight: 4 }} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
            {weatherDisplay ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaText}>{weatherDisplay}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Ionicons name="images-outline" size={12} color={COLORS.purple} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: COLORS.purple, fontWeight: '600' }]}>
                {item.photos.length}장
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={{ paddingLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  const sections = grouped();

  /* 화면 배경색: 그룹 테마 12% 투명도 */
  const screenBg = child?.color ? child.color + '12' : COLORS.bgPink;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 배경: 테마 색상 12% + 베이스 그라디언트 */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: screenBg }]} />
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.08)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {child?.photoUri ? (
            <Image source={{ uri: child.photoUri }} style={styles.headerAvatar} />
          ) : (
            <Text style={styles.headerEmoji}>{child?.emoji ?? ''}</Text>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{child?.name ?? ''}</Text>
        </View>
        <View style={styles.headerRight}>
          {albums.length > 0 && (
            <TouchableOpacity
              style={selectMode ? styles.cancelBtn : styles.pdfIconBtn}
              onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
              activeOpacity={0.8}
            >
              {selectMode ? (
                <Text style={styles.cancelBtnText}>취소</Text>
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={15} color="#fff" style={{ marginRight: 5 }} />
                  <Text style={styles.pdfIconBtnText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateAlbum', { childId })}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.addBtn}
            >
              <Text style={styles.addBtnText}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색 */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput} placeholder="제목, 장소, 날짜 검색..."
          placeholderTextColor={COLORS.textMuted}
          value={searchText} onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 필터 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}>
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* PDF 선택 바 */}
      {selectMode && (
        <View style={styles.selectBar}>
          <Text style={styles.selectInfo}>{selected.size}개 선택</Text>
          <TouchableOpacity style={styles.pdfBtn}
            onPress={() => {
              if (selected.size === 0) { Alert.alert('알림', '앨범을 선택해주세요.'); return; }
              navigation.navigate('ExportPDF', { albumIds: Array.from(selected) });
            }}>
            <View style={styles.pdfBtnInner}>
              <Ionicons name="document-text-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.pdfBtnText}>PDF 내보내기</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* 앨범 목록 */}
      {albums.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={64} color={COLORS.purple} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>첫 앨범을 만들어보세요!</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateAlbum', { childId })}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>+ 앨범 만들기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length}개</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => <AlbumCard item={item} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_HEIGHT + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAvatar: { width: 30, height: 30, borderRadius: 15 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /* 헤더 PDF 버튼 - 홈화면 pdfIconBtn과 동일한 스타일 */
  pdfIconBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 36, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: COLORS.purple,
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  pdfIconBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  /* 취소 버튼 */
  cancelBtn: {
    height: 36, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5, borderColor: COLORS.pink,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.pink },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300', lineHeight: 28 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 10 },

  filterScroll: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterTabActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  filterTabText: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  filterTabTextActive: { color: '#fff' },

  selectBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FDF2F8', paddingHorizontal: 16, paddingVertical: 10,
    marginHorizontal: 16, borderRadius: 12, marginBottom: 8,
  },
  selectInfo: { fontSize: 14, color: COLORS.pink, fontWeight: '600' },
  pdfBtn: { backgroundColor: COLORS.pink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  pdfBtnInner: { flexDirection: 'row', alignItems: 'center' },
  pdfBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textSecondary },

  listContent: { paddingHorizontal: 16, paddingTop: 8 },

  /* ── 앨범 카드 ── */
  card: {
    flexDirection: 'row', alignItems: 'center',
    /* 카드 배경: 흰색 */
    backgroundColor: '#FFFFFF',
    borderRadius: 20, marginBottom: 12,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    /* padding으로 이미지와 내용 간격 확보 */
    padding: 12,
  },
  cardSelected: { borderWidth: 2, borderColor: COLORS.pink },
  check: {
    position: 'absolute', top: 10, right: 10, width: 24, height: 24,
    borderRadius: 12, borderWidth: 2, borderColor: COLORS.pink,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  checkActive: { backgroundColor: COLORS.pink },

  /* ── 썸네일: 카드 내부 + 둥근 모서리 (그룹카드 스타일) ── */
  thumbWrap: {
    marginRight: 12,
  },
  thumb: {
    width: 72, height: 72,
    borderRadius: 16,   /* 그룹카드 emojiBox와 동일한 radius */
    resizeMode: 'cover',
  },
  thumbEmpty: {
    backgroundColor: COLORS.bgPurple,
    alignItems: 'center', justifyContent: 'center',
  },

  /* 카드 정보 */
  cardBody: { flex: 1, paddingRight: 4 },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text,
    marginBottom: 8,
  },
  metaGrid: { gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },

  /* 빈 상태 */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 24 },
  emptyBtn: {
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 13,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
