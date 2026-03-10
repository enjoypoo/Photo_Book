import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, StatusBar, Dimensions, Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Child, GroupType, RootStackParamList } from '../types';
import SortableList, { DragHandleProps } from '../components/SortableList';
import { loadChildrenOrdered, deleteChild, loadAlbumsByChild, saveChildrenOrder, toggleChildFavorite } from '../store/albumStore';
import { COLORS } from '../constants';
import { TAB_BAR_HEIGHT } from '../../App';
import BannerAdItem from '../components/BannerAdItem';

const Logo = require('../../assets/Logo.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

/* ── 그룹 목록 + 배너 광고 인터리빙 ──────────────────
   10개 단위 그룹마다 광고 1개를 그룹 내 랜덤 위치에 삽입
   (1개뿐인 경우에도 광고 1개 삽입)
─────────────────────────────────────────────────── */
type ListItem =
  | { type: 'child'; child: Child }
  | { type: 'ad'; id: number };

function buildListData(children: Child[]): ListItem[] {
  if (children.length === 0) return [];
  const result: ListItem[] = [];
  let adIdx = 0;
  const n = children.length;

  for (let groupStart = 0; groupStart < n; groupStart += 10) {
    const groupEnd = Math.min(groupStart + 10, n);
    const groupSize = groupEnd - groupStart;
    // 그룹 내 랜덤 위치(1번째 항목 이후~마지막 항목 이후 사이) 에 광고 삽입
    const adPos = 1 + Math.floor(Math.random() * groupSize);
    for (let i = 0; i < groupSize; i++) {
      result.push({ type: 'child', child: children[groupStart + i] });
      if (i + 1 === adPos) result.push({ type: 'ad', id: adIdx++ });
    }
  }
  return result;
}
const { width } = Dimensions.get('window');

const GROUP_LABEL: Record<GroupType, string> = {
  parent: '부모', friend: '친구', child: '자녀',
  work: '직장', club: '모임', other: '기타',
};
const GROUP_EMOJI: Record<GroupType, string> = {
  parent: '👨‍👩‍👧', friend: '👫', child: '👦',
  work: '💼', club: '🎉', other: '🌟',
};

const CHILD_CARD_HEIGHT = 116; // card padding(16*2) + avatar(72) + marginBottom(12)

function sortFavoritesFirst<T extends { isFavorite?: boolean }>(list: T[]): T[] {
  return [...list.filter(x => x.isFavorite), ...list.filter(x => !x.isFavorite)];
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [children, setChildren] = useState<Child[]>([]);
  const [albumCounts, setAlbumCounts] = useState<Record<string, number>>({});
  const [sortMode, setSortMode] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const listRef = useRef<FlatList<ListItem>>(null);
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

  useFocusEffect(useCallback(() => {
    setSortMode(false);
    fadeAnim.setValue(0); slideAnim.setValue(20);
    loadChildrenOrdered().then(async (list) => {
      setChildren(sortFavoritesFirst(list));
      const counts: Record<string, number> = {};
      for (const c of list) {
        const albums = await loadAlbumsByChild(c.id);
        counts[c.id] = albums.length;
      }
      setAlbumCounts(counts);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }, []));

  const handleFavoriteToggle = async (child: Child) => {
    await toggleChildFavorite(child.id);
    setChildren(prev =>
      sortFavoritesFirst(prev.map(c => c.id === child.id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };

  const handleDeleteChild = (child: Child) => {
    Alert.alert('삭제', `"${child.name}" 그룹을 삭제할까요?\n모든 사진과 앨범이 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await deleteChild(child.id);
          setChildren(prev => prev.filter(c => c.id !== child.id));
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── 헤더 ── */}
      <LinearGradient
        colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Image source={Logo} style={styles.headerLogo} resizeMode="contain" />
        </View>

        <View style={styles.headerActions}>
          {children.length > 0 && (
            <TouchableOpacity
              style={[styles.sortBtn, sortMode && styles.sortBtnActive]}
              onPress={async () => {
                if (sortMode) {
                  await saveChildrenOrder(children.map(c => c.id));
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
          <TouchableOpacity
            style={styles.addBtnWrap}
            onPress={() => navigation.navigate('CreateChild', {})}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── 배경 ── */}
      <LinearGradient
        colors={[COLORS.bgPink, COLORS.bgPurple, COLORS.bgBlue]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {children.length === 0 ? (
        /* ── 빈 상태 ── */
        <Animated.View style={[styles.empty, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Ionicons name="color-palette-outline" size={80} color={COLORS.purple} style={{ marginBottom: 20 }} />
          <Text style={styles.emptyTitle}>첫 그룹을 만들어보세요</Text>
          <Text style={styles.emptyDesc}>
            그룹을 등록하고{'\n'}소중한 순간을 기록하세요
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateChild', {})}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.emptyBtn}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyBtnText}>그룹 추가하기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : sortMode ? (
        <>
          {/* 정렬 모드 힌트 바 */}
          <View style={styles.sortHintBar}>
            <Ionicons name="reorder-three-outline" size={16} color={COLORS.purple} style={{ marginRight: 6 }} />
            <Text style={styles.sortHintText}>길게 누르고 드래그하여 순서를 변경하세요</Text>
          </View>
          <SortableList
            data={children}
            keyExtractor={c => c.id}
            itemHeight={CHILD_CARD_HEIGHT}
            onOrderChange={newChildren => setChildren(newChildren)}
            contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 16 }]}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>그룹 목록</Text>
                <Text style={styles.listHeaderCount}>{children.length}개</Text>
              </View>
            }
            renderItem={(child, index, isDragging, handle) => (
              <ChildCard
                item={child}
                albumCount={albumCounts[child.id] ?? 0}
                index={index}
                sortMode
                isDragging={isDragging}
                dragHandleProps={handle}
                onPress={() => {}}
                onLongPress={() => {}}
                onFavoriteToggle={() => handleFavoriteToggle(child)}
              />
            )}
          />
        </>
      ) : (
        <FlatList
          ref={listRef}
          data={buildListData(children)}
          keyExtractor={item => item.type === 'ad' ? `ad-${item.id}` : item.child.id}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 16 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => {
            if (item.type === 'ad') return <BannerAdItem />;
            return (
              <ChildCard
                item={item.child}
                albumCount={albumCounts[item.child.id] ?? 0}
                index={index}
                onPress={() => navigation.navigate('AlbumList', { childId: item.child.id })}
                onLongPress={() => {
                  Alert.alert(item.child.name, '무엇을 할까요?', [
                    { text: '수정', onPress: () => navigation.navigate('CreateChild', { childId: item.child.id }) },
                    { text: '삭제', style: 'destructive', onPress: () => handleDeleteChild(item.child) },
                    { text: '취소', style: 'cancel' },
                  ]);
                }}
                onFavoriteToggle={() => handleFavoriteToggle(item.child)}
              />
            );
          }}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>그룹 목록</Text>
              <Text style={styles.listHeaderCount}>{children.length}개</Text>
            </View>
          }
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
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          style={styles.scrollTopBtnInner}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-up" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

/* ── 그룹 카드 컴포넌트 ── */
interface CardProps {
  item: Child;
  albumCount: number;
  index: number;
  sortMode?: boolean;
  isDragging?: boolean;
  dragHandleProps?: DragHandleProps;
  onPress: () => void;
  onLongPress: () => void;
  onFavoriteToggle: () => void;
}
function ChildCard({ item, albumCount, index, sortMode, isDragging, dragHandleProps, onPress, onLongPress, onFavoriteToggle }: CardProps) {
  const anim = useRef(new Animated.Value(sortMode ? 1 : 0)).current;
  React.useEffect(() => {
    if (sortMode) return;
    Animated.timing(anim, {
      toValue: 1, duration: 380, delay: index * 70, useNativeDriver: true,
    }).start();
  }, [sortMode]);
  const slideY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  const groupLabel = item.groupType === 'other' && item.groupTypeCustom
    ? item.groupTypeCustom
    : GROUP_LABEL[item.groupType] ?? '그룹';
  const groupEmoji = GROUP_EMOJI[item.groupType] ?? '🌟';

  const cardInner = (
    <>
      {/* 왼쪽: 아바타 */}
      <View style={styles.cardLeft}>
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.emojiBox, { backgroundColor: item.color + '28' }]}>
            <Text style={styles.emojiText}>{item.emoji}</Text>
          </View>
        )}
        {/* 색상 점 */}
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      </View>

      {/* 오른쪽: 정보 */}
      <View style={styles.cardInfo}>
        <View style={styles.cardRow}>
          <Text style={styles.childName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.groupBadge, { backgroundColor: item.color + '20', borderColor: item.color + '60' }]}>
            <Text style={[styles.groupBadgeText, { color: item.color }]}>{groupEmoji} {groupLabel}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          {item.birthDate ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.metaItem}>{item.birthDate}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="camera-outline" size={13} color={COLORS.purple} style={{ marginRight: 4 }} />
            <Text style={[styles.metaItem, styles.albumCountText]}>{albumCount}개의 앨범</Text>
          </View>
        </View>
      </View>

      {/* 즐겨찾기 하트 버튼 */}
      <TouchableOpacity
        onPress={onFavoriteToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.heartBtn}
      >
        <Ionicons
          name={item.isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={item.isFavorite ? '#EF4444' : COLORS.textMuted}
        />
      </TouchableOpacity>

      {sortMode ? (
        <View
          {...(dragHandleProps?.panHandlers ?? {})}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.dragHandle}
        >
          <Ionicons name="reorder-three-outline" size={28} color={COLORS.textMuted} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
      )}
    </>
  );

  const cardStyle = [styles.card, { backgroundColor: item.color + '12' }, ...(isDragging ? [styles.cardDragging] : [])];

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slideY }] }}>
      {sortMode ? (
        // 정렬 모드: View 사용 — TouchableOpacity가 PanResponder와 경쟁하지 않도록
        <View style={cardStyle}>{cardInner}</View>
      ) : (
        <TouchableOpacity style={cardStyle} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.82}>
          {cardInner}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 64, paddingHorizontal: 5, paddingTop: 1, paddingBottom: 1,
    borderBottomWidth: 1, borderBottomColor: '#F3E8FF',
    zIndex: 10,
  },
  headerLeft: { flex: 3 },
  headerLogo: { width: width * 0.5, height: 60},
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  /* + 버튼 */
  addBtnWrap: {},
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* 리스트 */
  list: { padding: 16 },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingHorizontal: 4,
  },
  listHeaderText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  listHeaderCount: { fontSize: 13, color: COLORS.textSecondary },

  /* 카드 */
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, padding: 16, marginBottom: 12,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },

  cardLeft: { marginRight: 14, position: 'relative' },
  avatarImg: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
  },
  emojiBox: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiText: { fontSize: 34 },
  colorDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#fff',
  },
  cardInfo: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  childName: { fontSize: 17, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  groupBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1,
  },
  groupBadgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { fontSize: 13, color: COLORS.textSecondary },
  albumCountText: { color: COLORS.purple, fontWeight: '600' },
  chevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: 8 },

  /* 정렬 버튼 */
  sortBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.2)',
  },
  sortBtnActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  sortBtnDoneText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* 정렬 힌트 바 */
  sortHintBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: 'rgba(168,85,247,0.08)',
    marginHorizontal: 16, marginTop: 8, borderRadius: 12,
  },
  sortHintText: { fontSize: 13, color: COLORS.purple, fontWeight: '500' },

  /* 즐겨찾기 하트 버튼 */
  heartBtn: { marginLeft: 4, padding: 4, alignItems: 'center', justifyContent: 'center' },

  /* 드래그 핸들 */
  dragHandle: { marginLeft: 4, padding: 4, alignItems: 'center', justifyContent: 'center' },
  cardDragging: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderColor: COLORS.purple,
  },

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

  /* 빈 상태 */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  emptyDesc: {
    fontSize: 15, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 24, marginBottom: 32,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 28, paddingHorizontal: 32, paddingVertical: 15,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
