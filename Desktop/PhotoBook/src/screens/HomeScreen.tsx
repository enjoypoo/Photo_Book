import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, StatusBar, Dimensions, Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Child, GroupType, RootStackParamList } from '../types';
import { loadChildren, deleteChild, loadAlbumsByChild } from '../store/albumStore';
import { COLORS } from '../constants';
import { TAB_BAR_HEIGHT } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
const { width } = Dimensions.get('window');

const GROUP_LABEL: Record<GroupType, string> = {
  parent: '부모', friend: '친구', child: '자녀',
  work: '직장', club: '모임', other: '기타',
};
const GROUP_EMOJI: Record<GroupType, string> = {
  parent: '👨‍👩‍👧', friend: '👫', child: '👦',
  work: '💼', club: '🎉', other: '🌟',
};

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [children, setChildren] = useState<Child[]>([]);
  const [albumCounts, setAlbumCounts] = useState<Record<string, number>>({});

  // PDF 선택 모드
  const [pdfMode, setPdfMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0); slideAnim.setValue(20);
    setPdfMode(false);
    setSelectedIds(new Set());
    loadChildren().then(async (list) => {
      setChildren(list);
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

  // PDF 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // PDF 내보내기 실행
  const handleExportPDF = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('알림', 'PDF로 내보낼 그룹을 선택해주세요.');
      return;
    }
    setExporting(true);
    try {
      const albumIds: string[] = [];
      for (const childId of selectedIds) {
        const albums = await loadAlbumsByChild(childId);
        albums.forEach(a => albumIds.push(a.id));
      }
      if (albumIds.length === 0) {
        Alert.alert('알림', '선택한 그룹에 앨범이 없습니다.');
        setExporting(false);
        return;
      }
      setPdfMode(false);
      setSelectedIds(new Set());
      navigation.navigate('ExportPDF', { albumIds });
    } catch (e) {
      Alert.alert('오류', 'PDF 준비 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
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
          <Text style={styles.headerTitle}>우리 추억 앨범</Text>
          <Text style={styles.headerSub}>소중한 순간을 기록해요 💕</Text>
        </View>

        {pdfMode ? (
          /* PDF 선택 모드 헤더 버튼 */
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setPdfMode(false); setSelectedIds(new Set()); }}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportConfirmBtn, selectedIds.size === 0 && styles.exportConfirmBtnDisabled]}
              onPress={handleExportPDF}
              disabled={exporting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={selectedIds.size > 0 ? [COLORS.gradientStart, COLORS.gradientEnd] : ['#D1D5DB', '#D1D5DB']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.exportConfirmGrad}
              >
                <Text style={styles.exportConfirmText}>
                  {exporting ? '준비 중...' : `PDF 내보내기 ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          /* 일반 모드 헤더 버튼 */
          <View style={styles.headerActions}>
            {children.length > 0 && (
              <TouchableOpacity
                style={styles.pdfIconBtn}
                onPress={() => setPdfMode(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.pdfIconText}>📄</Text>
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
                <Text style={styles.addBtnText}>+</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* ── 배경 ── */}
      <LinearGradient
        colors={[COLORS.bgPink, COLORS.bgPurple, COLORS.bgBlue]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* PDF 선택 모드 안내 배너 */}
      {pdfMode && (
        <View style={styles.pdfBanner}>
          <Text style={styles.pdfBannerText}>📄 PDF로 내보낼 그룹을 선택하세요</Text>
        </View>
      )}

      {children.length === 0 ? (
        /* ── 빈 상태 ── */
        <Animated.View style={[styles.empty, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.emptyIcon}>🎨</Text>
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
              <Text style={styles.emptyBtnText}>+ 그룹 추가하기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 16 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <ChildCard
              item={item}
              albumCount={albumCounts[item.id] ?? 0}
              index={index}
              pdfMode={pdfMode}
              selected={selectedIds.has(item.id)}
              onPress={() => {
                if (pdfMode) {
                  toggleSelect(item.id);
                } else {
                  navigation.navigate('AlbumList', { childId: item.id });
                }
              }}
              onLongPress={() => {
                if (pdfMode) return;
                Alert.alert(item.name, '무엇을 할까요?', [
                  { text: '수정', onPress: () => navigation.navigate('CreateChild', { childId: item.id }) },
                  { text: '삭제', style: 'destructive', onPress: () => handleDeleteChild(item) },
                  { text: '취소', style: 'cancel' },
                ]);
              }}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>그룹 목록</Text>
              <Text style={styles.listHeaderCount}>{children.length}개</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/* ── 그룹 카드 컴포넌트 ── */
interface CardProps {
  item: Child;
  albumCount: number;
  index: number;
  pdfMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}
function ChildCard({ item, albumCount, index, pdfMode, selected, onPress, onLongPress }: CardProps) {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 380, delay: index * 70, useNativeDriver: true,
    }).start();
  }, []);
  const slideY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  const groupLabel = item.groupType === 'other' && item.groupTypeCustom
    ? item.groupTypeCustom
    : GROUP_LABEL[item.groupType] ?? '그룹';
  const groupEmoji = GROUP_EMOJI[item.groupType] ?? '🌟';

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slideY }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: item.color + '12' },
          selected && styles.cardSelected,
          selected && { borderColor: item.color, borderWidth: 2 },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.82}
      >
        {/* PDF 선택 체크박스 */}
        {pdfMode && (
          <View style={[
            styles.checkbox,
            { borderColor: item.color },
            selected && { backgroundColor: item.color },
          ]}>
            {selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}

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
              <Text style={styles.metaItem}>📅 {item.birthDate}</Text>
            ) : null}
            <Text style={[styles.metaItem, styles.albumCountText]}>📷 {albumCount}개의 앨범</Text>
          </View>
        </View>

        {/* 화살표 or 체크 여백 */}
        {!pdfMode && <Text style={styles.chevron}>›</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 64, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#F3E8FF',
    zIndex: 10,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  /* PDF 아이콘 버튼 */
  pdfIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  pdfIconText: { fontSize: 20 },

  /* + 버튼 */
  addBtnWrap: {},
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },

  /* PDF 취소 버튼 */
  cancelBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, backgroundColor: '#F3F4F6',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  /* PDF 내보내기 확인 버튼 */
  exportConfirmBtn: { borderRadius: 20, overflow: 'hidden' },
  exportConfirmBtnDisabled: { opacity: 0.6 },
  exportConfirmGrad: { paddingHorizontal: 16, paddingVertical: 10 },
  exportConfirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* PDF 안내 배너 */
  pdfBanner: {
    backgroundColor: COLORS.purple + '18',
    paddingVertical: 10, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: COLORS.purple + '30',
    zIndex: 5,
  },
  pdfBannerText: { fontSize: 13, color: COLORS.purple, fontWeight: '600', textAlign: 'center' },

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
  cardSelected: {
    shadowOpacity: 0.2,
  },

  /* PDF 선택 체크박스 */
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    marginRight: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 18 },

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

  /* 빈 상태 */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  emptyDesc: {
    fontSize: 15, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 24, marginBottom: 32,
  },
  emptyBtn: {
    borderRadius: 28, paddingHorizontal: 32, paddingVertical: 15,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
