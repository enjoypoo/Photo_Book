import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, SafeAreaView, StatusBar, TextInput,
  ScrollView, SectionList, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, Child, FilterType, RootStackParamList } from '../types';
import SortableList, { DragHandleProps } from '../components/SortableList';
import { loadAlbumsByChild, loadChildren, deleteAlbum, saveAlbumsOrder, toggleAlbumFavorite } from '../store/albumStore';
import { COLORS, WEATHER_LABEL } from '../constants';
import { formatAlbumDate, formatMonthYear } from '../utils/dateUtils';
import { TAB_BAR_HEIGHT } from '../../App';
import BannerAdItem from '../components/BannerAdItem';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumList'>;
type Route = RouteProp<RootStackParamList, 'AlbumList'>;

/* ── 섹션 데이터에 배너 광고 삽입 ────────────────────
   10개 단위 그룹마다 광고 1개를 그룹 내 랜덤 위치에 삽입
   (1개뿐인 경우에도 광고 1개 삽입)
─────────────────────────────────────────────────── */
type AlbumListItem = Album | { __adId: string };
function injectAds(albums: Album[], sectionIdx: number): AlbumListItem[] {
  if (albums.length === 0) return [];
  const result: AlbumListItem[] = [];
  let adCount = 0;
  const n = albums.length;

  for (let groupStart = 0; groupStart < n; groupStart += 10) {
    const groupEnd = Math.min(groupStart + 10, n);
    const groupSize = groupEnd - groupStart;
    // 그룹 내 랜덤 위치(1번째 항목 이후~마지막 항목 이후 사이) 에 광고 삽입
    const adPos = 1 + Math.floor(Math.random() * groupSize);
    for (let i = 0; i < groupSize; i++) {
      result.push(albums[groupStart + i]);
      if (i + 1 === adPos) result.push({ __adId: `ad-${sectionIdx}-${adCount++}` });
    }
  }
  return result;
}

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
  const [sortMode, setSortMode] = useState(false);
  // 첫 번째 선택 앨범 유형으로 잠금 — ref로 stale closure 방지
  const lockedTypeRef = useRef<'diary' | 'album' | null>(null);
  const [lockedType, setLockedType] = useState<'diary' | 'album' | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listRef = useRef<SectionList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopAnim = useRef(new Animated.Value(0)).current;
  const scrollTopPrevRef = useRef(false);

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const show = y > 300;
    if (show !== scrollTopPrevRef.current) {
      scrollTopPrevRef.current = show;
      setShowScrollTop(show);
      Animated.timing(scrollTopAnim, { toValue: show ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [scrollTopAnim]);

  const updateLockedType = (val: 'diary' | 'album' | null) => {
    lockedTypeRef.current = val;
    setLockedType(val);
  };

  const showToast = (type: 'diary' | 'album') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    toastTimerRef.current = setTimeout(() => { toastAnim.setValue(0); }, 2600);
  };

  useFocusEffect(useCallback(() => {
    loadChildren().then(list => setChild(list.find(c => c.id === childId) ?? null));
    loadAlbumsByChild(childId).then(list => setAlbums(sortFavoritesFirst(list)));
    setSelectMode(false);
    setSelected(new Set());
    setSortMode(false);
    updateLockedType(null);
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

  const grouped = (): { title: string; data: AlbumListItem[] }[] => {
    if (filter === 'all') return [{ title: '', data: injectAds(filtered, 0) }];
    const map: Record<string, Album[]> = {};
    for (const a of filtered) {
      let key = '';
      if (filter === 'year') key = a.date.slice(0, 4) + '년';
      else if (filter === 'month') key = formatMonthYear(a.date);
      else if (filter === 'location') key = a.location || '장소 미입력';
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return Object.entries(map).map(([title, data], sIdx) => ({ title, data: injectAds(data, sIdx) }));
  };

  const toggleSelect = (id: string) => {
    const ct = lockedTypeRef.current;
    const album = albums.find(a => a.id === id);
    if (!album) return;
    const albumType = album.albumType ?? 'album';

    if (selected.has(id)) {
      // 선택 해제 — 마지막 선택이면 잠금 해제
      const nextSize = selected.size - 1;
      if (nextSize === 0) updateLockedType(null);
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
      return;
    }

    // 유형 불일치 차단 (ref로 최신값 읽기)
    if (ct !== null && albumType !== ct) return;

    // 첫 번째 선택 시 유형 잠금 + 토스트
    if (ct === null) {
      updateLockedType(albumType);
      showToast(albumType);
    }

    setSelected(prev => { const next = new Set(prev); next.add(id); return next; });
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

  function sortFavoritesFirst<T extends { isFavorite?: boolean }>(list: T[]): T[] {
    return [...list.filter(x => x.isFavorite), ...list.filter(x => !x.isFavorite)];
  }

  const handleFavoriteToggleAlbum = async (id: string) => {
    await toggleAlbumFavorite(id);
    setAlbums(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a);
      return filter === 'all' ? sortFavoritesFirst(updated) : updated;
    });
  };

  const ALBUM_CARD_HEIGHT = 120; // thumb(72) + padding(12*2) + marginBottom(12) + meta text

  /* ── 앨범 카드 ── */
  const AlbumCard = ({ item, isSortMode = false, isDragging = false, dragHandleProps }: {
    item: Album;
    isSortMode?: boolean;
    isDragging?: boolean;
    dragHandleProps?: DragHandleProps;
  }) => {
    const cover = item.coverPhotoId
      ? item.photos.find(p => p.id === item.coverPhotoId) ?? item.photos[0]
      : item.photos[0];
    const isSelected = selected.has(item.id);
    const themeColor = child?.color;
    const itemType = item.albumType ?? 'album';
    // selectMode에서만 비활성화 계산 — ref로 최신값 읽기
    const isDisabled = selectMode && lockedTypeRef.current !== null && !isSelected && itemType !== lockedTypeRef.current;

    const weatherDisplay = item.weather === 'other' && item.weatherCustom
      ? item.weatherCustom
      : item.weatherEmoji
        ? `${item.weatherEmoji} ${WEATHER_LABEL[item.weather] ?? ''}`
        : '';

    const cardStyle = [
      styles.card,
      isSelected && [styles.cardSelected, themeColor && { borderColor: themeColor }],
      isDisabled && styles.cardDisabled,
      isDragging && styles.cardDragging,
    ];

    const cardContent = (
      <>
        {selectMode && (
          <View style={[styles.check, isSelected && styles.checkActive, isDisabled && styles.checkDisabled]}>
            {isSelected
              ? <Ionicons name="checkmark" size={14} color="#fff" />
              : isDisabled
                ? <Ionicons name="lock-closed" size={10} color={COLORS.textMuted} />
                : null}
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

        {/* 오른쪽 컬럼: 위=유형배지, 아래=하트+화살표 */}
        <View style={styles.cardRightCol}>
          <View style={[styles.typeBadge, (item.albumType ?? 'album') === 'diary' ? styles.typeBadgeDiary : styles.typeBadgeAlbum]}>
            <Text style={styles.typeBadgeText}>
              {(item.albumType ?? 'album') === 'diary' ? '📔 일기형' : '📷 앨범형'}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => handleFavoriteToggleAlbum(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.heartBtn}
            >
              <Ionicons
                name={item.isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={item.isFavorite ? '#EF4444' : COLORS.textMuted}
              />
            </TouchableOpacity>
            {isSortMode ? (
              <View
                {...(dragHandleProps?.panHandlers ?? {})}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.dragHandle}
              >
                <Ionicons name="reorder-three-outline" size={28} color={COLORS.textMuted} />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={{ paddingLeft: 4 }} />
            )}
          </View>
        </View>
      </>
    );

    if (isSortMode) {
      // 정렬 모드: View 사용 — TouchableOpacity가 PanResponder와 경쟁하지 않도록
      return <View style={cardStyle}>{cardContent}</View>;
    }

    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => {
          if (selectMode) {
            const ct = lockedTypeRef.current;
            if (ct !== null && !selected.has(item.id) && itemType !== ct) return;
            toggleSelect(item.id);
          } else {
            navigation.navigate('AlbumDetail', { albumId: item.id, childId });
          }
        }}
        onLongPress={() => {
          if (selectMode) return;
          Alert.alert(item.title, '무엇을 할까요?', [
            { text: '수정',  onPress: () => navigation.navigate('CreateAlbum', { childId, albumId: item.id }) },
            { text: '삭제', style: 'destructive', onPress: () => handleDelete(item.id) },
            { text: '취소', style: 'cancel' },
          ]);
        }}
        activeOpacity={isDisabled ? 1 : 0.85}
      >
        {cardContent}
      </TouchableOpacity>
    );
  };

  const sections = grouped();

  /* 화면 배경색: 그룹 테마 12% 투명도 */
  const screenBg = child?.color ? child.color + '12' : COLORS.bgPink;

  // selectBar 버튼 상태 계산
  const selectBarType = lockedType ?? (albums[0]?.albumType ?? 'album');
  const selectBarSelectableIds = albums.filter(a => (a.albumType ?? 'album') === selectBarType).map(a => a.id);
  const selectBarHasSelection = selected.size > 0;
  const selectBarIsAllSelected = selectBarSelectableIds.length > 0 && selectBarSelectableIds.every(id => selected.has(id));

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
          {albums.length > 0 && !sortMode && (
            <TouchableOpacity
              style={selectMode ? styles.cancelBtn : styles.pdfIconBtn}
              onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); updateLockedType(null); }}
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
          {albums.length > 0 && !selectMode && filter === 'all' && (
            <TouchableOpacity
              style={[styles.sortBtn, sortMode && styles.sortBtnActive]}
              onPress={async () => {
                if (sortMode) {
                  await saveAlbumsOrder(childId, albums.map(a => a.id));
                }
                setSortMode(v => !v);
              }}
              activeOpacity={0.8}
            >
              {sortMode ? (
                <Text style={styles.sortBtnDoneText}>완료</Text>
              ) : (
                <Ionicons name="reorder-three-outline" size={22} color={COLORS.purple} />
              )}
            </TouchableOpacity>
          )}
          {!sortMode && (
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
          )}
        </View>
      </View>

      {/* 정렬 모드 힌트 바 */}
      {sortMode && (
        <View style={styles.sortHintBar}>
          <Ionicons name="reorder-three-outline" size={16} color={COLORS.purple} style={{ marginRight: 6 }} />
          <Text style={styles.sortHintText}>길게 누르고 드래그하여 순서를 변경하세요</Text>
        </View>
      )}

      {/* 검색 */}
      <View style={[styles.searchBox, sortMode && styles.dimmed]} pointerEvents={sortMode ? 'none' : 'auto'}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, sortMode && styles.dimmed]}
        pointerEvents={sortMode ? 'none' : 'auto'}
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
          <TouchableOpacity
            onPress={() => {
              if (selectBarHasSelection) {
                setSelected(new Set());
                updateLockedType(null);
              } else {
                updateLockedType(selectBarType);
                setSelected(new Set(selectBarSelectableIds));
              }
            }}
            style={[styles.selectAllBtn, selectBarHasSelection && styles.selectAllBtnActive]}
          >
            <Text style={styles.selectAllBtnText}>
              {!selectBarHasSelection ? '전체 선택' : selectBarIsAllSelected ? '전체 해제' : '선택 해제'}
            </Text>
          </TouchableOpacity>
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
      ) : sortMode ? (
        <View style={{ flex: 1 }}>
          <SortableList
            data={albums}
            keyExtractor={a => a.id}
            itemHeight={ALBUM_CARD_HEIGHT}
            onOrderChange={newAlbums => setAlbums(newAlbums)}
            contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_HEIGHT + 20 }]}
            renderItem={(album, _index, isDragging, handle) => (
              <AlbumCard
                item={album}
                isSortMode
                isDragging={isDragging}
                dragHandleProps={handle}
              />
            )}
          />
        </View>
      ) : (
        <SectionList
          ref={listRef}
          style={{ flex: 1 }}
          sections={sections}
          keyExtractor={item => '__adId' in item ? item.__adId : item.id}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length}개</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if ('__adId' in item) return <BannerAdItem />;
            return <AlbumCard item={item} />;
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_HEIGHT + 20 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      )}

      {/* 맨위로 버튼 */}
      <Animated.View
        pointerEvents={showScrollTop ? 'auto' : 'none'}
        style={[styles.scrollTopBtn, {
          opacity: scrollTopAnim,
          transform: [{ scale: scrollTopAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          bottom: TAB_BAR_HEIGHT + 16,
        }]}
      >
        <TouchableOpacity
          onPress={() => listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true })}
          style={styles.scrollTopBtnInner}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-up" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* 유형 잠금 토스트 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
          },
        ]}
      >
        <Ionicons
          name={lockedType === 'diary' ? 'book-outline' : 'camera-outline'}
          size={15}
          color="#fff"
          style={{ marginRight: 7 }}
        />
        <Text style={styles.toastText}>
          {lockedType === 'diary'
            ? '📔 일기형 앨범만 함께 선택할 수 있어요'
            : '📷 앨범형 앨범만 함께 선택할 수 있어요'}
        </Text>
      </Animated.View>
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
  selectAllBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.pink },
  selectAllBtnActive: { backgroundColor: COLORS.purple },
  selectAllBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
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
  cardDisabled: { opacity: 0.38, backgroundColor: '#F5F5F5' },
  check: {
    position: 'absolute', top: 10, right: 10, width: 24, height: 24,
    borderRadius: 12, borderWidth: 2, borderColor: COLORS.pink,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  checkActive: { backgroundColor: COLORS.pink },
  checkDisabled: { borderColor: '#CCCCCC', backgroundColor: '#F0F0F0' },

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
    fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6,
  },
  typeBadge: {
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0, alignSelf: 'flex-start',
  },
  typeBadgeDiary: { backgroundColor: '#FFF3E0' },
  typeBadgeAlbum: { backgroundColor: '#F3E8FF' },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.purple },
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

  /* 정렬 버튼 */
  sortBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.2)',
  },
  sortBtnActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  sortBtnDoneText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* 정렬 힌트 바 */
  sortHintBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, paddingHorizontal: 16,
    backgroundColor: 'rgba(168,85,247,0.08)',
    marginHorizontal: 16, marginBottom: 6, borderRadius: 10,
  },
  sortHintText: { fontSize: 12, color: COLORS.purple, fontWeight: '500' },

  cardRightCol: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center' },

  /* 즐겨찾기 하트 버튼 */
  heartBtn: { padding: 4, alignItems: 'center', justifyContent: 'center' },

  /* 드래그 핸들 */
  dragHandle: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  cardDragging: {
    borderColor: COLORS.purple,
    borderWidth: 2,
  },

  /* 딤드 상태 (정렬 모드에서 비활성 UI) */
  dimmed: { opacity: 0.35 },

  /* 유형 잠금 토스트 */
  toast: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40,40,40,0.92)',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* 맨위로 버튼 */
  scrollTopBtn: {
    position: 'absolute', right: 16,
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  scrollTopBtnInner: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.purple,
    alignItems: 'center', justifyContent: 'center',
  },
});
