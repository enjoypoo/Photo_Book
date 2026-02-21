import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SectionList,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, RootStackParamList } from '../types';
import { loadAlbums, deleteAlbum } from '../store/albumStore';
import AlbumCard from '../components/AlbumCard';
import { COLORS } from '../constants';
import { formatMonthYear } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Section {
  title: string;
  data: Album[];
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadAlbums().then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setAlbums(sorted);
        const grouped: Record<string, Album[]> = {};
        for (const album of sorted) {
          const key = formatMonthYear(album.date);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(album);
        }
        setSections(Object.entries(grouped).map(([title, data]) => ({ title, data })));
      });
      setSelectMode(false);
      setSelected(new Set());
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert('삭제', '이 앨범을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteAlbum(id);
          const updated = albums.filter((a) => a.id !== id);
          setAlbums(updated);
          const grouped: Record<string, Album[]> = {};
          for (const album of updated) {
            const key = formatMonthYear(album.date);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(album);
          }
          setSections(Object.entries(grouped).map(([title, data]) => ({ title, data })));
        },
      },
    ]);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    if (selected.size === 0) {
      Alert.alert('알림', 'PDF로 내보낼 앨범을 선택해주세요.');
      return;
    }
    navigation.navigate('ExportPDF', { albumIds: Array.from(selected) });
    setSelectMode(false);
    setSelected(new Set());
  };

  const EmptyComponent = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📷</Text>
      <Text style={styles.emptyTitle}>첫 번째 추억을 기록해요!</Text>
      <Text style={styles.emptyDesc}>
        아이의 소중한 순간을{'\n'}사진과 이야기로 담아보세요.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => navigation.navigate('CreateAlbum', {})}
      >
        <Text style={styles.emptyBtnText}>+ 새 앨범 만들기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📸 아이 포토북</Text>
          <Text style={styles.headerSubtitle}>
            {albums.length > 0
              ? `소중한 추억 ${albums.length}개`
              : '첫 추억을 기록해보세요'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {albums.length > 0 && (
            <TouchableOpacity
              style={[styles.headerBtn, selectMode && styles.headerBtnActive]}
              onPress={() => {
                setSelectMode(!selectMode);
                setSelected(new Set());
              }}
            >
              <Text style={[styles.headerBtnText, selectMode && styles.headerBtnTextActive]}>
                {selectMode ? '취소' : 'PDF'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateAlbum', {})}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectMode && (
        <View style={styles.selectBar}>
          <Text style={styles.selectInfo}>
            {selected.size}개 선택됨
          </Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.exportBtnText}>📄 PDF 내보내기</Text>
          </TouchableOpacity>
        </View>
      )}

      {albums.length === 0 ? (
        <EmptyComponent />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}개</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <AlbumCard
              album={item}
              selected={selected.has(item.id)}
              onPress={() => {
                if (selectMode) {
                  toggleSelect(item.id);
                } else {
                  navigation.navigate('AlbumDetail', { albumId: item.id });
                }
              }}
              onLongPress={() => {
                if (!selectMode) {
                  Alert.alert('앨범 옵션', item.title || '앨범', [
                    {
                      text: '수정',
                      onPress: () =>
                        navigation.navigate('CreateAlbum', { albumId: item.id }),
                    },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: () => handleDelete(item.id),
                    },
                    { text: '취소', style: 'cancel' },
                  ]);
                }
              }}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  headerBtnActive: {
    backgroundColor: COLORS.primary,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerBtnTextActive: {
    color: '#fff',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 28,
  },
  selectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  selectInfo: {
    fontSize: 14,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  exportBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  list: {
    paddingBottom: 32,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
