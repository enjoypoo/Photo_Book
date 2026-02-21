import React, { useCallback, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Dimensions, Modal, SafeAreaView, StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, RootStackParamList } from '../types';
import { getAlbumById, deleteAlbum } from '../store/albumStore';
import { COLORS, WEATHER_LABEL } from '../constants';
import { formatAlbumDate } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumDetail'>;
type Route = RouteProp<RootStackParamList, 'AlbumDetail'>;
const { width } = Dimensions.get('window');

export default function AlbumDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { albumId, childId } = route.params;
  const [album, setAlbum] = useState<Album | null>(null);
  const [fullscreen, setFullscreen] = useState<{ uri: string; caption: string } | null>(null);

  useFocusEffect(useCallback(() => {
    getAlbumById(albumId).then(setAlbum);
  }, [albumId]));

  if (!album) return <View style={styles.loading}><Text>불러오는 중...</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPink} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{album.title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateAlbum', { childId, albumId })}>
            <Text style={styles.headerIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('삭제', '이 앨범을 삭제할까요?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: async () => { await deleteAlbum(albumId); navigation.goBack(); } },
          ])}>
            <Text style={styles.headerIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* 메타 카드 */}
        <View style={styles.metaCard}>
          <Text style={styles.albumTitle}>{album.title}</Text>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={[styles.tagIcon, { color: COLORS.calendarIcon }]}>📅</Text>
              <Text style={styles.tagText}>{formatAlbumDate(album.date, album.dateEnd)}</Text>
            </View>
            {album.location ? (
              <View style={styles.tag}>
                <Text style={[styles.tagIcon, { color: COLORS.locationIcon }]}>📍</Text>
                <Text style={styles.tagText}>{album.location}</Text>
              </View>
            ) : null}
            {album.weatherEmoji ? (
              <View style={styles.tag}>
                <Text style={styles.tagIcon}>{album.weatherEmoji}</Text>
                <Text style={styles.tagText}>
                  {album.weather === 'other' && album.weatherCustom
                    ? album.weatherCustom
                    : (WEATHER_LABEL[album.weather] ?? album.weather)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 이야기 */}
        {album.story ? (
          <View style={styles.storyCard}>
            <Text style={styles.storyLabel}>💬 오늘의 이야기</Text>
            <Text style={styles.storyText}>{album.story}</Text>
          </View>
        ) : null}

        {/* 사진 */}
        {album.photos.length > 0 ? (
          <View style={styles.photosSection}>
            <Text style={styles.photosLabel}>🖼️ 사진 {album.photos.length}장</Text>
            {album.photos.map((photo, idx) => (
              <View key={photo.id} style={styles.photoCard}>
                <TouchableOpacity onPress={() => setFullscreen({ uri: photo.uri, caption: photo.caption })}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                  <View style={styles.photoIdx}><Text style={styles.photoIdxText}>{idx + 1}</Text></View>
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
          <View style={styles.noPhotos}><Text style={{ color: COLORS.textMuted }}>📷 등록된 사진이 없습니다.</Text></View>
        )}

        {/* PDF 버튼 */}
        <TouchableOpacity style={styles.pdfBtn}
          onPress={() => navigation.navigate('ExportPDF', { albumIds: [albumId] })}>
          <Text style={styles.pdfBtnText}>📄 PDF로 내보내기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 풀스크린 */}
      <Modal visible={!!fullscreen} transparent animationType="fade"
        onRequestClose={() => setFullscreen(null)}>
        <TouchableOpacity style={styles.fullscreenBg} activeOpacity={1} onPress={() => setFullscreen(null)}>
          {fullscreen && (
            <>
              <Image source={{ uri: fullscreen.uri }} style={styles.fullscreenImg} resizeMode="contain" />
              {fullscreen.caption ? (
                <View style={styles.fullscreenCaption}>
                  <Text style={styles.fullscreenCaptionText}>{fullscreen.caption}</Text>
                </View>
              ) : null}
              <Text style={styles.fullscreenClose}>✕ 닫기</Text>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backText: { fontSize: 24, color: COLORS.text },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIcon: { fontSize: 20, padding: 4 },
  body: { paddingBottom: 48 },
  metaCard: {
    backgroundColor: COLORS.card, margin: 16, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  albumTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.bgPurple, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  tagIcon: { fontSize: 14 },
  tagText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  storyCard: {
    backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, padding: 20, borderLeftWidth: 4, borderLeftColor: COLORS.pink,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  storyLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  storyText: { fontSize: 15, color: COLORS.text, lineHeight: 24 },
  photosSection: { paddingHorizontal: 16 },
  photosLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  photoCard: {
    backgroundColor: COLORS.card, borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  photoImg: { width: '100%', height: width - 32, resizeMode: 'cover' },
  photoIdx: {
    position: 'absolute', top: 12, left: 12, width: 30, height: 30,
    borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  photoIdxText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  captionBox: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight, backgroundColor: COLORS.bgPink },
  captionText: { fontSize: 14, color: COLORS.text, lineHeight: 20, fontStyle: 'italic' },
  noPhotos: { alignItems: 'center', padding: 32 },
  pdfBtn: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: COLORS.purple,
    borderRadius: 24, paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fullscreenBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  fullscreenImg: { width, height: '70%' },
  fullscreenCaption: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 16, marginHorizontal: 24 },
  fullscreenCaptionText: { color: '#fff', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fullscreenClose: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 20 },
});
