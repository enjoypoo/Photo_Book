import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, Alert, ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../../App';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, Child, RootStackParamList } from '../types';
import { loadAlbums, loadChildren } from '../store/albumStore';
import { generatePDF, requestNotificationPermission, PageSize, LayoutType, ProgressCallback, PdfThemeKey, PdfThemeConfig, PDF_THEMES, PhotoSizeType } from '../utils/pdfGenerator';
import { generateAIPDF } from '../utils/aiPdfGenerator';
import { COLORS, WEATHER_LABEL } from '../constants';
import { formatDateKorean } from '../utils/dateUtils';
import { showRewardedAd } from '../utils/admob';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExportPDF'>;
type Route = RouteProp<RootStackParamList, 'ExportPDF'>;

/* ── 용지 크기 옵션 ──────────────────────────────────── */
const PAGE_SIZES: { key: PageSize; label: string; desc: string }[] = [
  { key: 'A4', label: 'A4', desc: '210 × 297mm\n일반 인쇄 표준' },
  { key: 'A5', label: 'A5', desc: '148 × 210mm\n소책자 / 포토북' },
];

/* ── 레이아웃 옵션 (photoSize 자동 연동) ─────────────── */
const LAYOUTS: { key: LayoutType; label: string; desc: string; photoSize: PhotoSizeType; perPage: number }[] = [
  { key: 'diary',     label: '일기형',     desc: '상단 사진+\n하단 일기',  photoSize: 'medium', perPage: 6 },
  { key: 'single',    label: '1장 크게',   desc: '1장씩\n큰 사이즈로',   photoSize: 'large',  perPage: 1 },
  { key: 'feature',   label: '2장 배치',   desc: '2장씩\n순서대로',      photoSize: 'medium', perPage: 2 },
  { key: 'magazine',  label: '잡지형',     desc: '2장씩\n넓은 감성',     photoSize: 'medium', perPage: 2 },
  { key: 'two_col',   label: '4장 격자',   desc: '4장씩\n2×2 배치',     photoSize: 'small',  perPage: 4 },
  { key: 'three_col', label: '빽빽이',     desc: '4장씩\n아기자기하게',  photoSize: 'small',  perPage: 4 },
];

/* ── 레이아웃 시각 미리보기 컴포넌트 ─────────────────── */
function LayoutPreview({ layoutKey, isActive }: { layoutKey: LayoutType; isActive: boolean }) {
  const fill = isActive ? COLORS.pink : '#C4C4C4';
  const bg   = isActive ? COLORS.pinkPastel : '#F0F0F0';
  return (
    <View style={{ width: 80, height: 62, borderRadius: 6, backgroundColor: bg,
      padding: 6, overflow: 'hidden', marginBottom: 8,
      borderWidth: 1.5, borderColor: isActive ? COLORS.pink : '#DEDEDE' }}>
      {layoutKey === 'diary' ? (
        /* 일기형: 상단 사진 블록 + 하단 줄 공책 */
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1.1, backgroundColor: fill, borderRadius: 3, marginBottom: 4 }} />
          <View style={{ flex: 1, justifyContent: 'space-evenly' }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ height: 1.5, backgroundColor: fill, opacity: 0.38, borderRadius: 1 }} />
            ))}
          </View>
        </View>
      ) : layoutKey === 'single' ? (
        /* 1장 크게 */
        <View style={{ flex: 1, backgroundColor: fill, borderRadius: 3 }} />
      ) : layoutKey === 'feature' ? (
        /* 2장 배치: 2장 균등 세로 */
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flex: 1, backgroundColor: fill, borderRadius: 3 }} />
          <View style={{ flex: 1, backgroundColor: fill, borderRadius: 3, opacity: 0.8 }} />
        </View>
      ) : layoutKey === 'magazine' ? (
        /* 잡지형: 2장 동등하게 쌓기 */
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flex: 1, backgroundColor: fill, borderRadius: 3 }} />
          <View style={{ flex: 0.9, backgroundColor: fill, borderRadius: 3, opacity: 0.72 }} />
        </View>
      ) : layoutKey === 'two_col' ? (
        /* 4장 격자: 2×2 */
        <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flex: 1, backgroundColor: fill, borderRadius: 2 }} />
            <View style={{ flex: 1, backgroundColor: fill, borderRadius: 2 }} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flex: 1, backgroundColor: fill, borderRadius: 2 }} />
            <View style={{ flex: 1, backgroundColor: fill, borderRadius: 2 }} />
          </View>
        </View>
      ) : (
        /* 빽빽이: 3열 × 2행 */
        <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
          {[0, 1, 2].map((c) => (
            <View key={c} style={{ flex: 1, gap: 2 }}>
              <View style={{ flex: 1, backgroundColor: fill, borderRadius: 2 }} />
              <View style={{ flex: 1, backgroundColor: fill, borderRadius: 2 }} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ── 테마별 미리보기 설정 ──────────────────────────────── */
type ThemeVisualConfig = {
  bgColor: string;
  bgGradient?: [string, string];
  frameColor: string;
  frameBorderColor: string;
  frameBorderWidth: number;
  frameRadius: number;
  accentColor: string;
  textColor: string;
  description: string;
  style: 'clean' | 'rotated' | 'polaroid' | 'film';
};

const THEME_VISUAL: Record<string, ThemeVisualConfig> = {
  modern:   { bgColor:'#FAFAFA', frameColor:'#FFFFFF', frameBorderColor:'#EAEAEA', frameBorderWidth:1, frameRadius:8,  accentColor:'#9CA3AF', textColor:'#333333', description:'깔끔한 화이트 갤러리 스타일', style:'clean'    },
  retro:    { bgColor:'#2b3a30', frameColor:'#1a241d', frameBorderColor:'#D4AF37', frameBorderWidth:3, frameRadius:0,  accentColor:'#D4AF37', textColor:'#E8DCC4', description:'감성 다꾸 & 빈티지 저널', style:'clean'    },
  grid:     { bgColor:'#FFFFFF', frameColor:'#FFFFFF', frameBorderColor:'#DDDDDD', frameBorderWidth:1, frameRadius:0,  accentColor:'#888888', textColor:'#555555', description:'살짝 기운 폴라로이드 여행 감성', style:'rotated'  },
  baby:     { bgColor:'#FFFDE7', bgGradient:['#FFFDE7','#FFF9C4'], frameColor:'#FFFFFF', frameBorderColor:'#FFF59D', frameBorderWidth:3, frameRadius:20, accentColor:'#FFA000', textColor:'#795548', description:'사랑스러운 베이비 포토북', style:'clean'    },
  polaroid: { bgColor:'#EFEFEF', frameColor:'#FFFFFF', frameBorderColor:'#E0E0E0', frameBorderWidth:1, frameRadius:0,  accentColor:'#888888', textColor:'#222222', description:'두꺼운 하단 폴라로이드 감성', style:'polaroid' },
  film:     { bgColor:'#111111', frameColor:'#000000', frameBorderColor:'#333333', frameBorderWidth:2, frameRadius:0,  accentColor:'#CCCCCC', textColor:'#F3F3F3', description:'흑백 필름 느와르 무드', style:'film'     },
  lined:    { bgColor:'#FDFBF7', frameColor:'#FFFFFF', frameBorderColor:'#EAEAEA', frameBorderWidth:1, frameRadius:0,  accentColor:'#A0856C', textColor:'#4A4A4A', description:'카페 감성 살짝 기운 레이아웃', style:'rotated'  },
  nature:   { bgColor:'#F1F8E9', bgGradient:['#F1F8E9','#DCEDC8'], frameColor:'#FFFFFF', frameBorderColor:'#AED581', frameBorderWidth:1, frameRadius:4,  accentColor:'#33691E', textColor:'#33691E', description:'자연 속 보태니컬 피크닉', style:'clean'    },
  airmail:  { bgColor:'#FAFAFA', frameColor:'#FFFFFF', frameBorderColor:'#CCCCCC', frameBorderWidth:1, frameRadius:0,  accentColor:'#888888', textColor:'#111111', description:'클래식 흑백 헤리티지 앨범', style:'clean'    },
  midnight: { bgColor:'#121212', frameColor:'#1E1E1E', frameBorderColor:'#444444', frameBorderWidth:1, frameRadius:8,  accentColor:'#BB86FC', textColor:'#E0E0E0', description:'연말결산 미드나잇 다크 무드', style:'clean'    },
};

/* 썸네일 — 테마 카드 내 작은 미리보기 */
function ThemePreviewThumbnail({ themeKey }: { themeKey: string }) {
  const cfg = THEME_VISUAL[themeKey] ?? THEME_VISUAL['modern'];
  const isRotated = cfg.style === 'rotated';
  const isPolaroid = cfg.style === 'polaroid';
  const isFilm = cfg.style === 'film';
  return (
    <View style={{ width: 60, height: 44, borderRadius: 8, overflow: 'hidden', backgroundColor: cfg.bgColor }}>
      {cfg.bgGradient && (
        <LinearGradient colors={cfg.bgGradient} style={StyleSheet.absoluteFillObject} />
      )}
      {isFilm && (
        <>
          <View style={{ position:'absolute', left:0, top:0, bottom:0, width:8, backgroundColor:'#000' }} />
          <View style={{ position:'absolute', right:0, top:0, bottom:0, width:8, backgroundColor:'#000' }} />
        </>
      )}
      {isRotated ? (
        <>
          <View style={{ position:'absolute', left:6, top:6, width:26, height:18,
            backgroundColor:cfg.frameColor, borderWidth:cfg.frameBorderWidth, borderColor:cfg.frameBorderColor, borderRadius:cfg.frameRadius,
            transform:[{rotate:'-2deg'}], overflow:'hidden' }}>
            <View style={{ flex:1, margin:2, backgroundColor:`${cfg.accentColor}33` }} />
          </View>
          <View style={{ position:'absolute', left:24, top:14, width:26, height:18,
            backgroundColor:cfg.frameColor, borderWidth:cfg.frameBorderWidth, borderColor:cfg.frameBorderColor, borderRadius:cfg.frameRadius,
            transform:[{rotate:'2deg'}], overflow:'hidden' }}>
            <View style={{ flex:1, margin:2, backgroundColor:`${cfg.accentColor}33` }} />
          </View>
        </>
      ) : isPolaroid ? (
        <View style={{ position:'absolute', left:10, top:4, width:40, height:32,
          backgroundColor:cfg.frameColor, borderWidth:cfg.frameBorderWidth, borderColor:cfg.frameBorderColor }}>
          <View style={{ height:20, margin:2, backgroundColor:`${cfg.accentColor}33` }} />
        </View>
      ) : (
        <>
          <View style={{ position:'absolute', left:isFilm?10:6, top:5, width:isFilm?40:20, height:13,
            backgroundColor:cfg.frameColor, borderWidth:cfg.frameBorderWidth, borderColor:cfg.frameBorderColor, borderRadius:cfg.frameRadius, overflow:'hidden' }}>
            <View style={{ flex:1, margin:1, backgroundColor:`${cfg.accentColor}33` }} />
          </View>
          {!isFilm && (
            <View style={{ position:'absolute', left:30, top:5, width:20, height:13,
              backgroundColor:cfg.frameColor, borderWidth:cfg.frameBorderWidth, borderColor:cfg.frameBorderColor, borderRadius:cfg.frameRadius, overflow:'hidden' }}>
              <View style={{ flex:1, margin:1, backgroundColor:`${cfg.accentColor}33` }} />
            </View>
          )}
          <View style={{ position:'absolute', left:isFilm?10:6, top:22, width:isFilm?40:48, height:15,
            backgroundColor:cfg.frameColor, borderWidth:cfg.frameBorderWidth, borderColor:cfg.frameBorderColor, borderRadius:cfg.frameRadius, overflow:'hidden' }}>
            <View style={{ flex:1, margin:1, backgroundColor:`${cfg.accentColor}33` }} />
          </View>
        </>
      )}
    </View>
  );
}

/* 확대 미리보기 — 모달 내 A5 비율 페이지 */
function ThemePagePreview({ themeKey, width = 260 }: { themeKey: string; width?: number }) {
  const cfg = THEME_VISUAL[themeKey] ?? THEME_VISUAL['modern'];
  const height = Math.round(width * 210 / 148);
  const pad = 16;
  const isRotated = cfg.style === 'rotated';
  const isPolaroid = cfg.style === 'polaroid';
  const isFilm = cfg.style === 'film';
  const filmPad = isFilm ? 26 : 0;
  const photoW = width - pad * 2 - filmPad * 2;
  const photoH = Math.round((height - pad * 3 - 54) / 2);
  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', backgroundColor: cfg.bgColor,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }}>
      {cfg.bgGradient && (
        <LinearGradient colors={cfg.bgGradient} style={StyleSheet.absoluteFillObject} />
      )}
      {/* 필름 사이드 바 */}
      {isFilm && (
        <>
          <View style={{ position:'absolute', left:0, top:0, bottom:0, width:filmPad, backgroundColor:'rgba(0,0,0,0.92)', zIndex:10 }}>
            {[0,1,2,3,4,5,6].map((i) => (
              <View key={i} style={{ position:'absolute', top:16+i*38, left:4, width:18, height:10, backgroundColor:'#111', borderRadius:2 }} />
            ))}
          </View>
          <View style={{ position:'absolute', right:0, top:0, bottom:0, width:filmPad, backgroundColor:'rgba(0,0,0,0.92)', zIndex:10 }}>
            {[0,1,2,3,4,5,6].map((i) => (
              <View key={i} style={{ position:'absolute', top:16+i*38, right:4, width:18, height:10, backgroundColor:'#111', borderRadius:2 }} />
            ))}
          </View>
        </>
      )}
      {/* 헤더 */}
      <View style={{ paddingHorizontal: pad + filmPad, paddingTop: 14, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: cfg.frameBorderColor }}>
        <View style={{ height: 9, width: 88, backgroundColor: cfg.accentColor, borderRadius: 5, marginBottom: 6, opacity: 0.7 }} />
        <View style={{ height: 5, width: 52, backgroundColor: cfg.accentColor, borderRadius: 3, opacity: 0.38 }} />
      </View>
      {/* 사진 2장 */}
      <View style={{ paddingHorizontal: pad + filmPad, paddingTop: pad, gap: 10 }}>
        {[0, 1].map((i) => {
          const rot = isRotated ? (i === 0 ? -1.5 : 1.5) : 0;
          return (
            <View key={i} style={{
              width: photoW,
              backgroundColor: cfg.frameColor,
              borderWidth: cfg.frameBorderWidth,
              borderColor: cfg.frameBorderColor,
              borderRadius: cfg.frameRadius,
              overflow: 'hidden',
              ...(rot ? { transform: [{ rotate: `${rot}deg` }] } : {}),
              shadowColor: '#000', shadowOffset:{ width:1, height:2 }, shadowOpacity:0.1, shadowRadius:3, elevation:2,
            }}>
              <View style={{ height: photoH, backgroundColor: `${cfg.accentColor}18`,
                alignItems:'center', justifyContent:'center' }}>
                <View style={{ width:32, height:32, borderRadius:16, backgroundColor:`${cfg.accentColor}30` }} />
                <View style={{ marginTop:6, width:48, height:4, borderRadius:2, backgroundColor:`${cfg.accentColor}28` }} />
              </View>
              {isPolaroid && <View style={{ height:22, backgroundColor:cfg.frameColor }} />}
              {!isFilm && (
                <View style={{ paddingHorizontal:8, paddingVertical:5 }}>
                  <View style={{ height:4, width:'55%', backgroundColor:cfg.textColor, borderRadius:2, opacity:0.22 }} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

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
  // 첫 번째 선택 앨범의 유형 — null이면 제한 없음
  // ref: FlatList stale closure 방지 (renderItem이 재렌더링되지 않아도 최신값 읽기)
  const [lockedType, setLockedType] = useState<'diary' | 'album' | null>(null);
  const lockedTypeRef = useRef<'diary' | 'album' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; albumTitle: string; step: string } | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>('A5');
  const [layout, setLayout] = useState<LayoutType>('feature');
  const [pdfTheme, setPdfTheme] = useState<PdfThemeConfig>(PDF_THEMES[0]);
  const [previewTheme, setPreviewTheme] = useState<PdfThemeConfig | null>(null);
  const [useAILayout, setUseAILayout] = useState(false);
  const photoSize: PhotoSizeType = LAYOUTS.find(l => l.key === layout)?.photoSize ?? 'medium';
  // 선택 진입 시: 선택된 앨범만 표시 / false면 전체 표시
  const [showSelectedOnly, setShowSelectedOnly] = useState(hasPreselected);
  const [filterChildId, setFilterChildId] = useState<string | null>(null);

  // 선택된 앨범이 모두 일기형인지 판단
  const selectedAlbums = albums.filter(a => selected.has(a.id));
  const allDiary = selectedAlbums.length > 0 && selectedAlbums.every(a => (a.albumType ?? 'album') === 'diary');

  // 앨범 유형 변경 시 레이아웃 자동 보정
  useEffect(() => {
    if (allDiary && layout !== 'diary') setLayout('diary');
    else if (!allDiary && layout === 'diary') setLayout('feature');
  }, [allDiary]);

  // lockedType 상태 + ref 동기 업데이트 헬퍼
  const updateLockedType = (val: 'diary' | 'album' | null) => {
    lockedTypeRef.current = val;
    setLockedType(val);
  };

  useEffect(() => {
    loadAlbums().then((data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAlbums(sorted);
      // 사전 선택 앨범이 있을 때 lockedType 초기화
      if (preselectedIds.length > 0) {
        const first = sorted.find(a => preselectedIds.includes(a.id));
        if (first) {
          updateLockedType(first.albumType ?? 'album');
          setFilterChildId(first.childId);
        }
      }
    });
    loadChildren().then((children) => {
      const map: Record<string, string> = {};
      children.forEach((c) => { if (c.color) map[c.id] = c.color; });
      setChildColorMap(map);
    });
    requestNotificationPermission();
  }, []);

  const toggleSelect = (id: string) => {
    // ref에서 최신값 읽기 — stale closure 방지
    const currentLockedType = lockedTypeRef.current;
    if (selected.has(id)) {
      const nextSize = selected.size - 1;
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      if (nextSize === 0) updateLockedType(null);
      return;
    }
    const album = albums.find(a => a.id === id);
    if (!album) return;
    const albumType = album.albumType ?? 'album';
    if (currentLockedType !== null && albumType !== currentLockedType) {
      Alert.alert(
        '앨범 유형 불일치',
        `${currentLockedType === 'diary' ? '📔 일기형' : '📷 앨범형'} 앨범만 함께 선택할 수 있어요.\n유형이 다른 앨범은 별도로 내보내기 해주세요.`,
      );
      return;
    }
    if (currentLockedType === null) updateLockedType(albumType);
    setSelected((prev) => { const next = new Set(prev); next.add(id); return next; });
  };

  // 같은 그룹 필터링
  const baseAlbums = filterChildId ? albums.filter(a => a.childId === filterChildId) : albums;

  const selectAll = () => {
    const type = lockedTypeRef.current ?? (baseAlbums.length > 0 ? (baseAlbums[0].albumType ?? 'album') : 'album');
    updateLockedType(type);
    setSelected(new Set(baseAlbums.filter(a => (a.albumType ?? 'album') === type).map(a => a.id)));
  };
  const clearAll = () => { setSelected(new Set()); updateLockedType(null); };

  // 현재 표시할 앨범 목록: 그룹 필터 → 선택 필터 → 같은 유형 상위 정렬
  const displayedAlbums = (() => {
    const list = showSelectedOnly ? baseAlbums.filter(a => selected.has(a.id)) : baseAlbums;
    if (!lockedType) return list;
    const compatible = list.filter(a => (a.albumType ?? 'album') === lockedType);
    const incompatible = list.filter(a => (a.albumType ?? 'album') !== lockedType);
    return [...compatible, ...incompatible];
  })();

  // 헤더 버튼 상태 계산
  const hasSelection = selected.size > 0;
  const compatibleIdsForHeader = lockedType
    ? baseAlbums.filter(a => (a.albumType ?? 'album') === lockedType).map(a => a.id)
    : [];
  const allCompatibleSelected = compatibleIdsForHeader.length > 0
    && compatibleIdsForHeader.every(id => selected.has(id));

  const handleGenerate = () => {
    if (selected.size === 0) {
      Alert.alert('알림', '내보낼 앨범을 선택해주세요.');
      return;
    }

    // 보상형 광고 표시 후 PDF 생성
    showRewardedAd(
      () => { startGenerate(); },  // 광고 완료 or 광고 닫힘
      () => { startGenerate(); },  // 광고 로드 실패 → 바로 생성
    );
  };

  const startGenerate = async () => {
    setGenerating(true);
    setProgress(null);
    const sorted = [...albums.filter((a) => selected.has(a.id))].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const onDone = (count: number) => {
      setGenerating(false);
      setProgress(null);
      Alert.alert(
        'PDF 생성 완료!',
        count === 1 ? 'PDF 1개가 생성되었어요!' : `PDF ${count}개가 모두 생성되었어요!`,
        [{ text: '확인', style: 'default', onPress: () => navigation.goBack() }]
      );
    };
    const onProg = (percent: number, albumTitle: string, step: string) =>
      setProgress({ percent, albumTitle, step });
    try {
      if (useAILayout) {
        await generateAIPDF(sorted, pageSize, onProg, onDone);
      } else {
        await generatePDF(sorted, pageSize, layout, onProg, onDone, childColorMap, pdfTheme, photoSize);
      }
    } catch {
      Alert.alert('오류', 'PDF 생성 중 문제가 발생했습니다.');
      setGenerating(false);
      setProgress(null);
    }
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
        {hasSelection ? (
          <TouchableOpacity onPress={clearAll} style={styles.selectCancelBtn}>
            <Text style={styles.selectCancelBtnText}>
              {allCompatibleSelected ? '전체 해제' : '선택 해제'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={selectAll}>
            <Text style={styles.selectAllText}>전체 선택</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayedAlbums}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        extraData={`${[...selected].sort().join(',')}-${lockedType ?? ''}`}
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

            {/* ── AI 자동 레이아웃 토글 (PRO 기능 - 다음 업데이트에서 활성화 예정) ── */}
            {false /* PRO: 아래 코드는 PRO 모델 적용 시 활성화 */ && (
            <TouchableOpacity
              style={[styles.aiToggleCard, useAILayout && styles.aiToggleCardActive]}
              onPress={() => setUseAILayout((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.aiToggleLeft}>
                <View style={[styles.aiIconBox, useAILayout && styles.aiIconBoxActive]}>
                  <Ionicons name="sparkles" size={20} color={useAILayout ? '#fff' : COLORS.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.aiToggleTitle, useAILayout && styles.aiToggleTitleActive]}>
                      AI 자동 레이아웃
                    </Text>
                    <View style={[styles.aiBetaBadge, useAILayout && styles.aiBetaBadgeActive]}>
                      <Text style={styles.aiBetaText}>AI</Text>
                    </View>
                  </View>
                  <Text style={[styles.aiToggleDesc, useAILayout && styles.aiToggleDescActive]}>
                    {useAILayout
                      ? `사진 분석 후 자동 배치 · ${pageSize === 'A5' ? '4장' : '6장'}/페이지 · 표지 자동 생성`
                      : '사진을 AI로 분석해 표지·캡션·배치를 자동 생성'}
                  </Text>
                </View>
              </View>
              {/* 토글 스위치 */}
              <View style={[styles.toggleTrack, useAILayout && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, useAILayout && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
            )}

            {/* ── 레이아웃 선택 (앨범 유형에 따라 가용 항목 필터) ── */}
            {(() => {
              const visibleLayouts = LAYOUTS.filter(lt => allDiary ? lt.key === 'diary' : lt.key !== 'diary');
              return (
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="images-outline" size={14} color={COLORS.text} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>사진 배치 레이아웃</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layoutScroll}>
                    {visibleLayouts.map((lt) => {
                      const isActive = layout === lt.key;
                      return (
                        <TouchableOpacity
                          key={lt.key}
                          style={[styles.layoutCard, isActive && styles.layoutCardActive]}
                          onPress={() => setLayout(lt.key)}
                          activeOpacity={0.8}
                        >
                          <LayoutPreview layoutKey={lt.key} isActive={isActive} />
                          <Text style={[styles.layoutLabel, isActive && styles.layoutLabelActive]}>
                            {lt.label}
                          </Text>
                          <Text style={[styles.layoutDesc, isActive && styles.layoutDescActive]}>
                            {lt.desc}
                          </Text>
                          <View style={[styles.perPageBadge, isActive && styles.perPageBadgeActive]}>
                            <Text style={[styles.perPageText, isActive && styles.perPageTextActive]}>
                              {lt.perPage}장/페이지
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })()}

            {/* ── PDF 배경 테마 선택 ── */}
            {/* PRO 테마: PDF_THEMES.filter(t => !t.isPro) 로 베이직 갤러리만 표시.
                PRO 테마(isPro: true)는 다음 업데이트에서 활성화 예정.
                활성화 시 아래 filter 제거하면 됨 */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="color-palette-outline" size={14} color={COLORS.text} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>배경 테마</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layoutScroll}>
                {PDF_THEMES.filter(t => !t.isPro).map((t) => {
                  const isActive = pdfTheme.key === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.themeCard, isActive && styles.themeCardActive]}
                      onPress={() => { setPdfTheme(t); setPreviewTheme(t); }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.themePreviewBox}>
                        <ThemePreviewThumbnail themeKey={t.key} />
                        {isActive && (
                          <View style={styles.themeActiveBadge}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={`soon-${i}`} style={styles.themeCardSoon}>
                    <View style={styles.themePreviewBoxSoon} />
                    <Text style={styles.themeLabelSoon}>Coming{'\n'}Soon</Text>
                  </View>
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
              {showSelectedOnly ? (
                <TouchableOpacity
                  onPress={() => setShowSelectedOnly(false)}
                  style={styles.showSelectedBtn}
                >
                  <Text style={styles.showSelectedBtnText}>+ 앨범 추가</Text>
                </TouchableOpacity>
              ) : selected.size > 0 ? (
                <TouchableOpacity
                  onPress={() => setShowSelectedOnly(true)}
                  style={styles.showSelectedBtn}
                >
                  <Text style={styles.showSelectedBtnText}>선택만 보기</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const cover = item.photos[0];
          const weatherStr = item.weatherEmoji
            ? `${item.weatherEmoji} ${WEATHER_LABEL[item.weather] ?? item.weather}`
            : '';
          const itemType = item.albumType ?? 'album';
          // lockedTypeRef.current 사용 — FlatList stale closure 문제를 ref로 해결
          const isDisabled = lockedTypeRef.current !== null && !isSelected && itemType !== lockedTypeRef.current;
          return (
            <TouchableOpacity
              style={[styles.albumRow, isSelected && styles.albumRowSelected, isDisabled && styles.albumRowIncompatible]}
              onPress={() => {
                // onPress 실행 시점에도 ref로 최신 lockedType 재확인
                const ct = lockedTypeRef.current;
                if (ct !== null && !selected.has(item.id) && (item.albumType ?? 'album') !== ct) return;
                toggleSelect(item.id);
              }}
              activeOpacity={isDisabled ? 1 : 0.8}
            >
              {/* 체크 또는 잠금 아이콘 */}
              <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected, isDisabled && styles.checkCircleLocked]}>
                {isSelected
                  ? <Ionicons name="checkmark" size={16} color="#fff" />
                  : isDisabled
                    ? <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
                    : null}
              </View>

              {/* 썸네일 */}
              {cover ? (
                <Image source={{ uri: cover.uri }} style={[styles.thumb, isDisabled && styles.thumbDisabled]} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, isDisabled && styles.thumbDisabled]}>
                  <Ionicons name="camera-outline" size={24} color={COLORS.textMuted} />
                </View>
              )}

              {/* 정보 */}
              <View style={[styles.albumInfo, isDisabled && styles.albumInfoDisabled]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={[styles.albumTitle, { flex: 1 }, isDisabled && styles.albumTitleDisabled]} numberOfLines={1}>{item.title || '제목 없음'}</Text>
                  <View style={[styles.typeBadge, itemType === 'diary' ? styles.typeBadgeDiary : styles.typeBadgeAlbum, isDisabled && styles.typeBadgeDisabled, { marginLeft: 6 }]}>
                    <Text style={[styles.typeBadgeText, isDisabled && styles.typeBadgeTextDisabled]}>{itemType === 'diary' ? '📔 일기형' : '📷 앨범형'}</Text>
                  </View>
                </View>
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
                {isDisabled && (
                  <Text style={styles.incompatibleNote}>
                    {lockedTypeRef.current === 'diary' ? '📔 일기형 앨범만 함께 선택 가능' : '📷 앨범형 앨범만 함께 선택 가능'}
                  </Text>
                )}
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

      {/* ── 테마 확대 미리보기 모달 ── */}
      <Modal
        visible={!!previewTheme}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewTheme(null)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPreviewTheme(null)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{previewTheme?.label}</Text>
                <Text style={styles.modalDesc}>{THEME_VISUAL[previewTheme?.key ?? '']?.description}</Text>
              </View>
              {previewTheme?.isPro && (
                <View style={styles.modalProBadge}>
                  <Text style={styles.modalProText}>PRO</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setPreviewTheme(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {/* 페이지 미리보기 */}
            <View style={styles.modalPreviewContainer}>
              {previewTheme && <ThemePagePreview themeKey={previewTheme.key} width={260} />}
            </View>
            {/* 선택 버튼 */}
            <TouchableOpacity
              style={[styles.modalSelectBtn, pdfTheme.key === previewTheme?.key && styles.modalSelectBtnActive]}
              onPress={() => { if (previewTheme) setPdfTheme(previewTheme); setPreviewTheme(null); }}
            >
              <Ionicons
                name={pdfTheme.key === previewTheme?.key ? 'checkmark-circle' : 'color-palette-outline'}
                size={16} color="#fff" style={{ marginRight: 6 }}
              />
              <Text style={styles.modalSelectBtnText}>
                {pdfTheme.key === previewTheme?.key ? '현재 선택된 테마' : '이 테마 사용하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
            <Ionicons name="color-palette-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.footerSummaryItem}>{pdfTheme.label}</Text>
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
  selectCancelBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: COLORS.purple, borderRadius: 14,
  },
  selectCancelBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

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
    width: 104, marginRight: 10, padding: 10,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center',
  },
  layoutCardActive: {
    borderColor: COLORS.pink, backgroundColor: COLORS.pinkPastel,
  },
  layoutLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 2,
    textAlign: 'center',
  },
  layoutLabelActive: { color: COLORS.pink },
  layoutDesc: {
    fontSize: 10, color: COLORS.textMuted, textAlign: 'center', lineHeight: 14, marginBottom: 6,
  },
  layoutDescActive: { color: COLORS.pink },
  perPageBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: COLORS.border, borderRadius: 8,
  },
  perPageBadgeActive: { backgroundColor: COLORS.pink },
  perPageText: { fontSize: 9.5, fontWeight: '700', color: COLORS.textMuted },
  perPageTextActive: { color: '#fff' },

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

  /* ── 테마 카드 ── */
  themeCard: {
    width: 88, marginRight: 10, padding: 10,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center',
  },
  themeCardActive: {
    borderColor: COLORS.purple, backgroundColor: COLORS.purplePastel,
  },
  themePreviewBox: {
    width: 60, height: 44, borderRadius: 8,
    marginBottom: 7, overflow: 'visible',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  probadge: {
    position: 'absolute', top: 3, right: 3,
    backgroundColor: '#F59E0B', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  probadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  themeActiveBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.purple,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.card,
  },
  themeLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
    textAlign: 'center',
  },
  themeLabelActive: { color: COLORS.purple, fontWeight: '700' },
  themeCardSoon: {
    width: 88, marginRight: 10, padding: 10,
    backgroundColor: '#F9F6EE', borderRadius: 16,
    borderWidth: 2, borderColor: '#E8DEB5',
    alignItems: 'center', opacity: 0.75,
  },
  themePreviewBoxSoon: {
    width: 60, height: 44, borderRadius: 8,
    marginBottom: 7,
    backgroundColor: '#EDE8D0',
    borderWidth: 1, borderColor: '#D4C98A',
  },
  themeLabelSoon: {
    fontSize: 11, fontWeight: '700', color: '#B8962E',
    textAlign: 'center', lineHeight: 15,
  },

  /* ── 테마 미리보기 모달 ── */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: COLORS.card, borderRadius: 24,
    width: '100%', maxWidth: 340,
    paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  modalDesc: { fontSize: 12, color: COLORS.textSecondary },
  modalProBadge: {
    backgroundColor: '#F59E0B', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3, marginRight: 10, marginTop: 2,
  },
  modalProText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  modalCloseBtn: { padding: 4, marginLeft: 4 },
  modalPreviewContainer: {
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  modalSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, paddingVertical: 13,
    backgroundColor: COLORS.purple, borderRadius: 16,
  },
  modalSelectBtnActive: { backgroundColor: COLORS.pink },
  modalSelectBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* ── AI 자동 레이아웃 토글 ── */
  aiToggleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 4, marginTop: 4,
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 14, borderWidth: 2, borderColor: COLORS.border,
  },
  aiToggleCardActive: {
    borderColor: COLORS.purple, backgroundColor: COLORS.purplePastel,
  },
  aiToggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  aiIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.purplePastel,
    alignItems: 'center', justifyContent: 'center',
  },
  aiIconBoxActive: { backgroundColor: COLORS.purple },
  aiToggleTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  aiToggleTitleActive: { color: COLORS.purple },
  aiBetaBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: COLORS.border, borderRadius: 6,
  },
  aiBetaBadgeActive: { backgroundColor: COLORS.purple },
  aiBetaText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  aiToggleDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 15, flexShrink: 1 },
  aiToggleDescActive: { color: COLORS.purple },
  toggleTrack: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: COLORS.border,
    justifyContent: 'center', padding: 2, marginLeft: 10,
  },
  toggleTrackActive: { backgroundColor: COLORS.purple },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },

  /* ── 비활성화 상태 ── */
  sectionDisabled: { opacity: 0.45 },
  sectionTitleDisabled: { color: COLORS.textMuted },
  disabledNote: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  cardDisabled: { borderColor: COLORS.border, backgroundColor: COLORS.card },
  textDisabled: { color: COLORS.textMuted },

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
  albumRowIncompatible: {
    opacity: 0.42,
    backgroundColor: '#F5F5F5',
  },
  checkCircleLocked: {
    backgroundColor: '#F0F0F0',
    borderColor: '#CCCCCC',
  },
  thumbDisabled: {
    opacity: 0.35,
  },
  albumInfoDisabled: {
    opacity: 0.5,
  },
  albumTitleDisabled: {
    color: COLORS.textMuted,
  },
  typeBadgeDisabled: {
    backgroundColor: '#E8E8E8',
    borderColor: '#CCCCCC',
  },
  typeBadgeTextDisabled: {
    color: COLORS.textMuted,
  },
  incompatibleNote: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeBadge: {
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0,
  },
  typeBadgeDiary: { backgroundColor: '#FFF3E0' },
  typeBadgeAlbum: { backgroundColor: '#F3E8FF' },
  typeBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.purple },
});
