import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, RootStackParamList } from '../types';
import { loadAlbums } from '../store/albumStore';
import { generatePDF } from '../utils/pdfGenerator';
import { COLORS } from '../constants';
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

  const selectAll = () => {
    setSelected(new Set(albums.map((a) => a.id)));
  };

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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📄 PDF 내보내기</Text>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.selectAllText}>전체 선택</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📖 선택한 앨범들이 날짜순으로 정렬되어 소책자 형태의 PDF로 생성됩니다.
        </Text>
      </View>

      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const cover = item.photos[0];
          return (
            <TouchableOpacity
              style={[styles.albumRow, isSelected && styles.albumRowSelected]}
              onPress={() => toggleSelect(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.checkCircle}>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </View>
              {cover ? (
                <Image source={{ uri: cover.uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text>📷</Text>
                </View>
              )}
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.albumDate}>{formatDateKorean(item.date)}</Text>
                <Text style={styles.albumCount}>{item.photos.length}장의 사진</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>앨범이 없습니다.</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.footerInfo}>{selected.size}개 앨범 선택됨</Text>
        <TouchableOpacity
          style={[styles.genBtn, (generating || selected.size === 0) && styles.genBtnDisabled]}
          onPress={handleGenerate}
          disabled={generating || selected.size === 0}
        >
          {generating ? (
            <View style={styles.genBtnContent}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.genBtnText}>생성 중...</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backBtn: { padding: 4 },
  backBtnText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    margin: 16,
    borderRadius: 14,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  albumRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0F6',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: COLORS.card,
  },
  checkMark: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  thumbPlaceholder: {
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  albumDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  albumCount: {
    fontSize: 12,
    color: COLORS.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 10,
  },
  footerInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  genBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  genBtnDisabled: {
    opacity: 0.5,
  },
  genBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
