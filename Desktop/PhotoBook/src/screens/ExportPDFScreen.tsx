import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, Alert, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, RootStackParamList } from '../types';
import { loadAlbums } from '../store/albumStore';
import { generatePDF } from '../utils/pdfGenerator';
import { COLORS, WEATHER_LABEL } from '../constants';
import { formatDateKorean } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExportPDF'>;
type Route = RouteProp<RootStackParamList, 'ExportPDF'>;

export default function ExportPDFScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const preselectedIds = route.params?.albumIds ?? [];

  const [albums, setAlbums] = useState<Album[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(preselectedIds));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadAlbums().then((data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAlbums(sorted);
    });
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

  const handleGenerate = async () => {
    if (selected.size === 0) {
      Alert.alert('알림', '내보낼 앨범을 선택해주세요.');
      return;
    }
    setGenerating(true);
    try {
      const toExport = albums.filter((a) => selected.has(a.id));
      const sorted = [...toExport].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      await generatePDF(sorted);
    } catch (e) {
      Alert.alert('오류', 'PDF 생성 중 문제가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPink} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📄 PDF 내보내기</Text>
        <TouchableOpacity
          onPress={selected.size === albums.length ? clearAll : selectAll}
        >
          <Text style={styles.selectAllText}>
            {selected.size === albums.length ? '전체 해제' : '전체 선택'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 안내 */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📖 선택한 앨범들이 날짜순으로 정렬되어 소책자 형태의 PDF로 생성됩니다.
        </Text>
      </View>

      {/* 앨범 목록 */}
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </View>

              {/* 썸네일 */}
              {cover ? (
                <Image source={{ uri: cover.uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={{ fontSize: 24 }}>📷</Text>
                </View>
              )}

              {/* 정보 */}
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={1}>{item.title || '제목 없음'}</Text>
                <Text style={styles.albumMeta}>📅 {formatDateKorean(item.date)}</Text>
                {item.location ? (
                  <Text style={styles.albumMeta} numberOfLines={1}>📍 {item.location}</Text>
                ) : null}
                {weatherStr ? (
                  <Text style={styles.albumMeta}>{weatherStr}</Text>
                ) : null}
                <Text style={styles.albumCount}>🖼️ {item.photos.length}장의 사진</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>앨범이 없습니다.</Text>
          </View>
        }
      />

      {/* 하단 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.footerInfo}>
          {selected.size > 0
            ? `✅ ${selected.size}개 앨범 선택됨`
            : '앨범을 선택해주세요'}
        </Text>
        <TouchableOpacity
          style={[styles.genBtn, (generating || selected.size === 0) && styles.genBtnDisabled]}
          onPress={handleGenerate}
          disabled={generating || selected.size === 0}
        >
          {generating ? (
            <View style={styles.genBtnContent}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.genBtnText}>  PDF 생성 중...</Text>
            </View>
          ) : (
            <Text style={styles.genBtnText}>📄 PDF 생성하기</Text>
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
  backText: { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  selectAllText: { fontSize: 14, color: COLORS.purple, fontWeight: '600' },
  infoBox: {
    backgroundColor: COLORS.purplePastel, margin: 16, borderRadius: 14,
    padding: 14, borderLeftWidth: 3, borderLeftColor: COLORS.purple,
  },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  albumRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 16, padding: 12,
    marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  albumRowSelected: {
    borderColor: COLORS.pink,
    backgroundColor: COLORS.pinkPastel,
  },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    backgroundColor: COLORS.inputBg,
  },
  checkCircleSelected: {
    borderColor: COLORS.pink,
    backgroundColor: COLORS.pink,
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  thumb: { width: 64, height: 64, borderRadius: 12, marginRight: 12 },
  thumbPlaceholder: {
    backgroundColor: COLORS.bgPurple, alignItems: 'center', justifyContent: 'center',
  },
  albumInfo: { flex: 1 },
  albumTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  albumMeta: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  albumCount: { fontSize: 12, color: COLORS.purple, fontWeight: '600', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
  footer: {
    padding: 16, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.card, gap: 10,
  },
  footerInfo: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  genBtn: {
    backgroundColor: COLORS.purple, borderRadius: 24,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  genBtnDisabled: { opacity: 0.45 },
  genBtnContent: { flexDirection: 'row', alignItems: 'center' },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
