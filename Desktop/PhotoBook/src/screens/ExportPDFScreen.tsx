import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, Alert, ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../../App';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, Child, RootStackParamList } from '../types';
import { loadAlbums, loadChildren } from '../store/albumStore';
import { generatePDF, requestNotificationPermission, PageSize, LayoutType, ProgressCallback } from '../utils/pdfGenerator';
import { COLORS, WEATHER_LABEL } from '../constants';
import { formatDateKorean } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExportPDF'>;
type Route = RouteProp<RootStackParamList, 'ExportPDF'>;

/* ── 용지 크기 옵션 ──────────────────────────────────── */
const PAGE_SIZES: { key: PageSize; label: string; desc: string }[] = [
  { key: 'A4', label: 'A4', desc: '210 × 297mm\n일반 인쇄 표준' },
  { key: 'A5', label: 'A5', desc: '148 × 210mm\n소책자 / 포토북' },
];

/* ── 레이아웃 옵션 ───────────────────────────────────── */
const LAYOUTS: { key: LayoutType; label: string; preview: string; desc: string }[] = [
  {
    key: 'single',
    label: '1열 세로',
    desc: '사진 1장씩\n순서대로 배치',
    preview: '┌────────┐\n│  사진  │\n├────────┤\n│  사진  │\n└────────┘',
  },
  {
    key: 'two_col',
    label: '2열 격자',
    desc: '2장씩 나란히\n깔끔한 격자형',
    preview: '┌────┬────┐\n│사진│사진│\n├────┼────┤\n│사진│사진│\n└────┴────┘',
  },
  {
    key: 'feature',
    label: '피처 + 2열',
    desc: '첫 사진 크게\n나머지 2열 배치',
    preview: '┌──────────┐\n│  큰사진  │\n├────┬─────┤\n│사진│ 사진│\n└────┴─────┘',
  },
  {
    key: 'magazine',
    label: '잡지형',
    desc: '와이드 + 하단 2장\n고급스러운 레이아웃',
    preview: '┌──────────┐\n│ 와이드사진│\n├────┬─────┤\n│사진│ 사진│\n└────┴─────┘',
  },
  {
    key: 'three_col',
    label: '3열 격자',
    desc: '3장씩 배치\n많은 사진에 적합',
    preview: '┌───┬───┬───┐\n│사진│사진│사진│\n├───┼───┼───┤\n│사진│사진│사진│\n└───┴───┴───┘',
  },
];

export default function ExportPDFScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const preselectedIds = route.params?.albumIds ?? [];
  // 특정 앨범을 선택해서 진입했는지 여부
  const hasPreselected = preselectedIds.length > 0;
  const insets = useSafeAreaInsets();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [childColorMap, setChildColorMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set(preselectedIds));
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; albumTitle: string; step: string } | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>('A5');
  const [layout, setLayout] = useState<LayoutType>('feature');
  // 선택 진입 시: 선택된 앨범만 표시 / false면 전체 표시
  const [showSelectedOnly, setShowSelectedOnly] = useState(hasPreselected);

  useEffect(() => {
    loadAlbums().then((data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAlbums(sorted);
    });
    loadChildren().then((children) => {
      const map: Record<string, string> = {};
      children.forEach((c) => { if (c.color) map[c.id] = c.color; });
      setChildColorMap(map);
    });
    // 알림 권한 미리 요청
    requestNotificationPermission();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(albums.map((a) => a.id)));
  const clearAll = () => setSelected(new Set());

  // 현재 표시할 앨범 목록 (선택된 것만 or 전체)
  const displayedAlbums = showSelectedOnly
    ? albums.filter((a) => selected.has(a.id))
    : albums;

  const handleGenerate = async () => {
    if (selected.size === 0) {
      Alert.alert('알림', '내보낼 앨범을 선택해주세요.');
      return;
    }
    setGenerating(true);
    setProgress(null);
    try {
      const toExport = albums.filter((a) => selected.has(a.id));
      const sorted = [...toExport].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      await generatePDF(
        sorted,
        pageSize,
        layout,
        (percent, albumTitle, step) => {
          setProgress({ percent, albumTitle, step });
        },
        (count) => {
          // 모든 PDF 완료 → 팝업 + 확인 누르면 이전 화면으로
          setGenerating(false);
          setProgress(null);
          Alert.alert(
            'PDF 생성 완료!',
            count === 1
              ? 'PDF 1개가 생성되었어요!'
              : `PDF ${count}개가 모두 생성되었어요!`,
            [{
              text: '확인',
              style: 'default',
              onPress: () => navigation.goBack(),
            }]
          );
        },
        childColorMap,
      );
    } catch (e) {
      Alert.alert('오류', 'PDF 생성 중 문제가 발생했습니다.');
      setGenerating(false);
      setProgress(null);
    }
    // onComplete에서 이미 setGenerating(false) 처리하므로 finally 불필요
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPink} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="document-text-outline" size={18} color={COLORS.text} style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>PDF 내보내기</Text>
        </View>
        {showSelectedOnly ? (
          /* 선택된 앨범만 보기 모드: 앨범 추가 버튼 */
          <TouchableOpacity onPress={() => setShowSelectedOnly(false)}>
            <Text style={styles.selectAllText}>+ 앨범 추가</Text>
          </TouchableOpacity>
        ) : (
          /* 전체 보기 모드: 전체선택/해제 */
          <TouchableOpacity onPress={selected.size === albums.length ? clearAll : selectAll}>
            <Text style={styles.selectAllText}>
              {selected.size === albums.length ? '전체 해제' : '전체 선택'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayedAlbums}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── 용지 크기 선택 ── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="resize-outline" size={14} color={COLORS.text} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>용지 크기</Text>
              </View>
              <View style={styles.pageSizeRow}>
                {PAGE_SIZES.map((ps) => (
                  <TouchableOpacity
                    key={ps.key}
                    style={[styles.pageSizeCard, pageSize === ps.key && styles.pageSizeCardActive]}
                    onPress={() => setPageSize(ps.key)}
                    activeOpacity={0.8}
                  >
                    {/* 용지 모형 */}
                    <View style={[
                      styles.paperIcon,
                      ps.key === 'A5' && styles.paperIconA5,
                      pageSize === ps.key && styles.paperIconActive,
                    ]}>
                      <Text style={[styles.paperIconLabel, pageSize === ps.key && styles.paperIconLabelActive]}>
                        {ps.label}
                      </Text>
                    </View>
                    <Text style={[styles.pageSizeLabel, pageSize === ps.key && styles.pageSizeLabelActive]}>
                      {ps.label}
                    </Text>
                    <Text style={[styles.pageSizeDesc, pageSize === ps.key && styles.pageSizeDescActive]}>
                      {ps.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── 레이아웃 선택 ── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="images-outline" size={14} color={COLORS.text} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>사진 배치 레이아웃</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layoutScroll}>
                {LAYOUTS.map((lt) => (
                  <TouchableOpacity
                    key={lt.key}
                    style={[styles.layoutCard, layout === lt.key && styles.layoutCardActive]}
                    onPress={() => setLayout(lt.key)}
                    activeOpacity={0.8}
                  >
                    {/* 미리보기 ASCII */}
                    <View style={[styles.layoutPreview, layout === lt.key && styles.layoutPreviewActive]}>
                      <Text style={[styles.layoutPreviewText, layout === lt.key && styles.layoutPreviewTextActive]}>
                        {lt.preview}
                      </Text>
                    </View>
                    <Text style={[styles.layoutLabel, layout === lt.key && styles.layoutLabelActive]}>
                      {lt.label}
                    </Text>
                    <Text style={[styles.layoutDesc, layout === lt.key && styles.layoutDescActive]}>
                      {lt.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 앨범 섹션 헤더 */}
            <View style={styles.albumSectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="book-outline" size={14} color={COLORS.text} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>
                  {showSelectedOnly ? `선택된 앨범 (${selected.size}개)` : `전체 앨범 (${albums.length}개)`}
                </Text>
              </View>
              {!showSelectedOnly && selected.size > 0 && (
                <TouchableOpacity
                  onPress={() => setShowSelectedOnly(true)}
                  style={styles.showSelectedBtn}
                >
                  <Text style={styles.showSelectedBtnText}>선택만 보기</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const cover = item.photos[0];
          const weatherStr = item.weatherEmoji
            ? `${item.weatherEmoji} ${WEATHER_LABEL[item.weather] ?? item.weather}`
            : '';
          return (
            <TouchableOpacity
              style={[styles.albumRow, isSelected && styles.albumRowSelected]}
              onPress={() => toggleSelect(item.id)}
              activeOpacity={0.8}
            >
              {/* 체크 */}
              <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>

              {/* 썸네일 */}
              {cover ? (
                <Image source={{ uri: cover.uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="camera-outline" size={24} color={COLORS.textMuted} />
                </View>
              )}

              {/* 정보 */}
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={1}>{item.title || '제목 없음'}</Text>
                <View style={styles.albumMetaRow}>
                  <Ionicons name="calendar-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
                  <Text style={styles.albumMeta}>{formatDateKorean(item.date)}</Text>
                </View>
                {item.location ? (
                  <View style={styles.albumMetaRow}>
                    <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={styles.albumMeta} numberOfLines={1}>{item.location}</Text>
                  </View>
                ) : null}
                {weatherStr ? (
                  <Text style={styles.albumMeta}>{weatherStr}</Text>
                ) : null}
                <View style={styles.albumMetaRow}>
                  <Ionicons name="images-outline" size={11} color={COLORS.purple} style={{ marginRight: 3 }} />
                  <Text style={styles.albumCount}>{item.photos.length}장의 사진</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={showSelectedOnly ? 'checkmark-circle-outline' : 'mail-outline'}
              size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyText}>
              {showSelectedOnly ? '선택된 앨범이 없습니다.' : '앨범이 없습니다.'}
            </Text>
            {showSelectedOnly && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowSelectedOnly(false)}
              >
                <Text style={styles.emptyAddBtnText}>+ 앨범 선택하러 가기</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* 하단 푸터 */}
      <View style={[styles.footer, { paddingBottom: TAB_BAR_HEIGHT + 6 }]}>
        {/* 선택 요약 */}
        <View style={styles.footerSummary}>
          <View style={styles.footerSummaryItemRow}>
            <Ionicons name="resize-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.footerSummaryItem}>
              {pageSize === 'A4' ? 'A4 (210×297mm)' : 'A5 (148×210mm)'}
            </Text>
          </View>
          <Text style={styles.footerSummaryDot}>·</Text>
          <View style={styles.footerSummaryItemRow}>
            <Ionicons name="images-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.footerSummaryItem}>
              {LAYOUTS.find(l => l.key === layout)?.label}
            </Text>
          </View>
          <Text style={styles.footerSummaryDot}>·</Text>
          <View style={styles.footerSummaryItemRow}>
            <Ionicons name="checkmark-circle-outline" size={11} color={selected.size > 0 ? COLORS.purple : COLORS.textSecondary} style={{ marginRight: 3 }} />
            <Text style={[styles.footerSummaryItem, selected.size > 0 && { color: COLORS.purple }]}>
              {selected.size}개 앨범
            </Text>
          </View>
        </View>
        {/* 진행상황 표시 */}
        {generating && (
          <View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${progress?.percent ?? 0}%` as any }
              ]} />
              <Text style={styles.progressText}>
                {!progress
                  ? 'PDF 생성 준비 중...'
                  : `「${progress.albumTitle}」 ${progress.step}`}
              </Text>
            </View>
            <View style={styles.progressPercentRow}>
              <View style={styles.progressTrack}>
                <View style={[
                  styles.progressThumb,
                  { width: `${progress?.percent ?? 0}%` as any }
                ]} />
              </View>
              <Text style={styles.progressPercent}>
                {progress?.percent ?? 0}%
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.genBtn, (generating || selected.size === 0) && styles.genBtnDisabled]}
          onPress={handleGenerate}
          disabled={generating || selected.size === 0}
        >
          {generating ? (
            <View style={styles.genBtnContent}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.genBtnText}>
                {'  '}
                {!progress
                  ? 'PDF 생성 준비 중...'
                  : `${progress.percent}% · ${progress.step}`}
              </Text>
            </View>
          ) : (
            <View style={styles.genBtnContent}>
              <Ionicons name="document-text-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.genBtnText}>PDF 생성하기</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  selectAllText: { fontSize: 14, color: COLORS.purple, fontWeight: '600' },

  list: { paddingBottom: 16 },

  /* ── 섹션 ── */
  section: { marginBottom: 4 },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.text,
  },

  /* ── 용지 크기 ── */
  pageSizeRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16,
  },
  pageSizeCard: {
    flex: 1, alignItems: 'center', padding: 14,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border,
  },
  pageSizeCardActive: {
    borderColor: COLORS.purple, backgroundColor: COLORS.purplePastel,
  },
  paperIcon: {
    width: 44, height: 62,
    backgroundColor: '#F3F4F6', borderRadius: 4,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  paperIconA5: {
    width: 44, height: 50,
  },
  paperIconActive: {
    backgroundColor: COLORS.purplePastel,
    borderColor: COLORS.purple,
  },
  paperIconLabel: {
    fontSize: 11, fontWeight: '800', color: '#9CA3AF',
  },
  paperIconLabelActive: {
    color: COLORS.purple,
  },
  pageSizeLabel: {
    fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4,
  },
  pageSizeLabelActive: { color: COLORS.purple },
  pageSizeDesc: {
    fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 16,
  },
  pageSizeDescActive: { color: COLORS.purple },

  /* ── 레이아웃 ── */
  layoutScroll: { paddingLeft: 16 },
  layoutCard: {
    width: 130, marginRight: 10, padding: 12,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center',
  },
  layoutCardActive: {
    borderColor: COLORS.pink, backgroundColor: COLORS.pinkPastel,
  },
  layoutPreview: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, marginBottom: 8,
    width: '100%', alignItems: 'center',
  },
  layoutPreviewActive: {
    backgroundColor: COLORS.pinkPastel,
  },
  layoutPreviewText: {
    fontFamily: 'Courier', fontSize: 7.5, color: '#6B7280', lineHeight: 11,
    textAlign: 'center',
  },
  layoutPreviewTextActive: { color: COLORS.pink },
  layoutLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3,
    textAlign: 'center',
  },
  layoutLabelActive: { color: COLORS.pink },
  layoutDesc: {
    fontSize: 10.5, color: COLORS.textMuted, textAlign: 'center', lineHeight: 15,
  },
  layoutDescActive: { color: COLORS.pink },

  /* ── 앨범 목록 ── */
  albumRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 16, padding: 12,
    marginBottom: 10, marginHorizontal: 16,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  albumRowSelected: {
    borderColor: COLORS.pink, backgroundColor: COLORS.pinkPastel,
  },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    backgroundColor: COLORS.inputBg,
  },
  checkCircleSelected: { borderColor: COLORS.pink, backgroundColor: COLORS.pink },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  albumMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  thumb: { width: 64, height: 64, borderRadius: 12, marginRight: 12 },
  thumbPlaceholder: {
    backgroundColor: COLORS.bgPurple, alignItems: 'center', justifyContent: 'center',
  },
  albumInfo: { flex: 1 },
  albumTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  albumMeta: { fontSize: 12, color: COLORS.textSecondary },
  albumCount: { fontSize: 12, color: COLORS.purple, fontWeight: '600', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
  emptyAddBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.purple, borderRadius: 20,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* ── 앨범 섹션 헤더 ── */
  albumSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingRight: 16,
  },
  showSelectedBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: COLORS.pinkPastel, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.pink,
  },
  showSelectedBtnText: { fontSize: 12, color: COLORS.pink, fontWeight: '600' },

  /* ── 푸터 ── */
  footer: {
    padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.card, gap: 10,
  },
  footerSummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, flexWrap: 'wrap',
  },
  footerSummaryItemRow: { flexDirection: 'row', alignItems: 'center' },
  footerSummaryItem: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  footerSummaryDot: { fontSize: 12, color: COLORS.textMuted },
  genBtn: {
    backgroundColor: COLORS.purple, borderRadius: 24,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  genBtnDisabled: { opacity: 0.45 },
  genBtnContent: { flexDirection: 'row', alignItems: 'center' },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* ── 진행상황 바 ── */
  progressBar: {
    height: 36, borderRadius: 12,
    backgroundColor: COLORS.bgPurple,
    overflow: 'hidden', justifyContent: 'center',
    marginBottom: 6,
  },
  progressFill: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: COLORS.purple, opacity: 0.25, borderRadius: 12,
  },
  progressText: {
    fontSize: 12, fontWeight: '600', color: COLORS.purple,
    textAlign: 'center', paddingHorizontal: 8,
  },
  progressPercentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2,
  },
  progressTrack: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: COLORS.border, overflow: 'hidden',
  },
  progressThumb: {
    height: 6, borderRadius: 3,
    backgroundColor: COLORS.purple,
  },
  progressPercent: {
    fontSize: 12, fontWeight: '800', color: COLORS.purple, minWidth: 34, textAlign: 'right',
  },
});
