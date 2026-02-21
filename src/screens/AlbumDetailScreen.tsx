import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, RootStackParamList } from '../types';
import { getAlbumById, deleteAlbum } from '../store/albumStore';
import { COLORS } from '../constants';
import { formatDateKorean } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumDetail'>;
type Route = RouteProp<RootStackParamList, 'AlbumDetail'>;

const { width } = Dimensions.get('window');

export default function AlbumDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { albumId } = route.params;
  const [album, setAlbum] = useState<Album | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAlbumById(albumId).then(setAlbum);
    }, [albumId])
  );

  const handleDelete = () => {
    Alert.alert('삭제', '이 앨범을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteAlbum(albumId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!album) {
    return (
      <View style={styles.loading}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {album.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('CreateAlbum', { albumId })}
          >
            <Text style={styles.headerIconText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleDelete}>
            <Text style={styles.headerIconText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 메타 정보 */}
        <View style={styles.metaCard}>
          <Text style={styles.albumTitle}>{album.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaEmoji}>📅</Text>
              <Text style={styles.metaText}>{formatDateKorean(album.date)}</Text>
            </View>
          </View>
          {album.location ? (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaEmoji}>📍</Text>
                <Text style={styles.metaText}>{album.location}</Text>
              </View>
            </View>
          ) : null}
          {album.weatherEmoji ? (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaEmoji}>{album.weatherEmoji}</Text>
                <Text style={styles.metaText}>
                  {['sunny','partly_cloudy','cloudy','rainy','snowy','windy','hot','cold'].includes(album.weather)
                    ? { sunny: '맑음', partly_cloudy: '구름 조금', cloudy: '흐림', rainy: '비', snowy: '눈', windy: '바람', hot: '더움', cold: '추움' }[album.weather as string]
                    : album.weather}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* 이야기 */}
        {album.story ? (
          <View style={styles.storyCard}>
            <Text style={styles.storyLabel}>💬 오늘의 이야기</Text>
            <Text style={styles.storyText}>{album.story}</Text>
          </View>
        ) : null}

        {/* 사진 목록 */}
        {album.photos.length > 0 ? (
          <View style={styles.photosSection}>
            <Text style={styles.photosLabel}>🖼️ 사진 {album.photos.length}장</Text>
            {album.photos.map((photo, idx) => (
              <View key={photo.id} style={styles.photoCard}>
                <TouchableOpacity onPress={() => setFullscreenPhoto(photo.uri)}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <View style={styles.photoNum}>
                    <Text style={styles.photoNumText}>{idx + 1}</Text>
                  </View>
                </TouchableOpacity>
                {photo.caption ? (
                  <View style={styles.captionBox}>
                    <Text style={styles.captionText}>{photo.caption}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noPhotos}>
            <Text style={styles.noPhotosText}>📷 등록된 사진이 없습니다.</Text>
          </View>
        )}

        {/* PDF 내보내기 버튼 */}
        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={() => navigation.navigate('ExportPDF', { albumIds: [albumId] })}
        >
          <Text style={styles.pdfBtnText}>📄 이 앨범 PDF로 내보내기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 풀스크린 사진 */}
      <Modal
        visible={!!fullscreenPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenPhoto(null)}
      >
        <TouchableOpacity
          style={styles.fullscreenOverlay}
          activeOpacity={1}
          onPress={() => setFullscreenPhoto(null)}
        >
          {fullscreenPhoto && (
            <Image
              source={{ uri: fullscreenPhoto }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.fullscreenClose}>✕ 닫기</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  backBtn: {
    padding: 4,
    minWidth: 36,
  },
  backBtnText: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerIconBtn: {
    padding: 6,
  },
  headerIconText: {
    fontSize: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  metaCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  albumTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  metaRow: {
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaEmoji: {
    fontSize: 16,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  storyCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  storyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  storyText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  photosSection: {
    paddingHorizontal: 16,
  },
  photosLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  photoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photoImage: {
    width: '100%',
    height: width - 32,
    resizeMode: 'cover',
  },
  photoNum: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoNumText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  captionBox: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  captionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  noPhotos: {
    alignItems: 'center',
    padding: 32,
  },
  noPhotosText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  pdfBtn: {
    marginHorizontal: 16,
    marginTop: 8,
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
  pdfBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: width,
    height: '80%',
  },
  fullscreenClose: {
    color: '#fff',
    fontSize: 16,
    marginTop: 24,
    opacity: 0.8,
  },
});
