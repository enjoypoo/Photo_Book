import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, SafeAreaView, StatusBar, TextInput,
  ScrollView, SectionList,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, Child, FilterType, RootStackParamList } from '../types';
import { loadAlbumsByChild, loadChildren, deleteAlbum } from '../store/albumStore';
import { COLORS } from '../constants';
import { formatDateKorean, formatMonthYear } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumList'>;
type Route = RouteProp<RootStackParamList, 'AlbumList'>;

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'year', label: '년도별' },
  { key: 'month', label: '월별' },
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

  // 필터링
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

  // 그룹핑
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

  const AlbumCard = ({ item }: { item: Album }) => {
    const cover = item.photos[0];
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => selectMode ? toggleSelect(item.id) : navigation.navigate('AlbumDetail', { albumId: item.id, childId })}
        onLongPress={() => {
          if (!selectMode) Alert.alert(item.title, '무엇을 할까요?', [
            { text: '수정', onPress: () => navigation.navigate('CreateAlbum', { childId, albumId: item.id }) },
            { text: '삭제', style: 'destructive', onPress: () => handleDelete(item.id) },
            { text: '취소', style: 'cancel' },
          ]);
        }}
        activeOpacity={0.85}
      >
        {selectMode && (
          <View style={[styles.check, isSelected && styles.checkActive]}>
            {isSelected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        )}
        <View style={styles.cardRow}>
          {cover ? (
            <Image source={{ uri: cover.uri }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbEmpty}><Text style={{ fontSize: 28 }}>📷</Text></View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{formatDateKorean(item.date)}</Text>
            </View>
            {item.location ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
            {item.weatherEmoji ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>{item.weatherEmoji}</Text>
                <Text style={styles.metaText}>{item.photos.length}장의 사진</Text>
              </View>
            ) : (
              <Text style={styles.metaText}>📷 {item.photos.length}장의 사진</Text>
            )}
            {item.story ? <Text style={styles.storyPreview} numberOfLines={1}>{item.story}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const sections = grouped();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPink} />
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {child && <Text style={styles.headerEmoji}>{child.emoji}</Text>}
          <Text style={styles.headerTitle} numberOfLines={1}>{child?.name ?? ''}</Text>
        </View>
        <View style={styles.headerRight}>
          {albums.length > 0 && (
            <TouchableOpacity style={styles.iconBtn}
              onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }}>
              <Text style={styles.iconBtnText}>{selectMode ? '취소' : 'PDF'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn}
            onPress={() => navigation.navigate('CreateAlbum', { childId })}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색 */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput} placeholder="제목, 장소, 날짜 검색..."
          placeholderTextColor={COLORS.textMuted}
          value={searchText} onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>✕</Text>
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
            <Text style={styles.pdfBtnText}>📄 PDF 내보내기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 앨범 목록 */}
      {albums.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>첫 앨범을 만들어보세요!</Text>
          <TouchableOpacity style={styles.emptyBtn}
            onPress={() => navigation.navigate('CreateAlbum', { childId })}>
            <Text style={styles.emptyBtnText}>+ 앨범 만들기</Text>
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bgPink,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backText: { fontSize: 24, color: COLORS.text },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.pink,
  },
  iconBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.pink },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.pink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300', lineHeight: 28 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 10 },
  filterScroll: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
  },
  filterTabActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  filterTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTabTextActive: { color: '#fff' },
  selectBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FDF2F8', paddingHorizontal: 16, paddingVertical: 10,
    marginHorizontal: 16, borderRadius: 12, marginBottom: 8,
  },
  selectInfo: { fontSize: 14, color: COLORS.pink, fontWeight: '600' },
  pdfBtn: { backgroundColor: COLORS.pink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  pdfBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textSecondary },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  cardSelected: { borderWidth: 2, borderColor: COLORS.pink },
  check: {
    position: 'absolute', top: 12, right: 12, width: 26, height: 26,
    borderRadius: 13, borderWidth: 2, borderColor: COLORS.pink,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  checkActive: { backgroundColor: COLORS.pink },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  cardRow: { flexDirection: 'row', gap: 14 },
  thumb: { width: 80, height: 80, borderRadius: 14, resizeMode: 'cover' },
  thumbEmpty: {
    width: 80, height: 80, borderRadius: 14,
    backgroundColor: COLORS.bgPurple, alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaIcon: { fontSize: 12 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  storyPreview: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: COLORS.pink, borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
