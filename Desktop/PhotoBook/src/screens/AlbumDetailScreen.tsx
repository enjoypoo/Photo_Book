import React, { useCallback, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Dimensions, Modal, SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, Child, RootStackParamList } from '../types';
import { getAlbumById, deleteAlbum, loadChildren } from '../store/albumStore';
import { COLORS, WEATHER_LABEL } from '../constants';
import { formatAlbumDate } from '../utils/dateUtils';
import { TAB_BAR_HEIGHT } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumDetail'>;
type Route = RouteProp<RootStackParamList, 'AlbumDetail'>;
const { width } = Dimensions.get('window');

export default function AlbumDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { albumId, childId } = route.params;
  const [album, setAlbum] = useState<Album | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [fullscreen, setFullscreen] = useState<{ uri: string; caption: string } | null>(null);

  useFocusEffect(useCallback(() => {
    getAlbumById(albumId).then(setAlbum);
    // 그룹 테마 색상 로드
    loadChildren().then(list => {
      const found = list.find(c => c.id === childId);
      if (found) setChild(found);
    });
  }, [albumId, childId]));

  // 테마 배경색: 그룹 색상 12% 투명도, 없으면 기본 bgPink
  const themeBg = child?.color ? child.color + '1F' : COLORS.bgPink;

  if (!album) return <View style={styles.loading}><Text>불러오는 중...</Text></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={themeBg} />
      <View style={[styles.header, { backgroundColor: themeBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{album.title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateAlbum', { childId, albumId })} style={styles.headerIconBtn}>
            <Ionicons name="pencil-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => Alert.alert('삭제', '이 앨범을 삭제할까요?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: async () => { await deleteAlbum(albumId); navigation.goBack(); } },
          ])}>
            <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_HEIGHT + 24 }]}
      >
        {/* 메타 카드 */}
        <View style={styles.metaCard}>
          <Text style={styles.albumTitle}>{album.title}</Text>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.calendarIcon} style={styles.tagIconI} />
              <Text style={styles.tagText}>{formatAlbumDate(album.date, album.dateEnd)}</Text>
            </View>
            {album.location ? (
              <View style={styles.tag}>
                <Ionicons name="location-outline" size={14} color={COLORS.locationIcon} style={styles.tagIconI} />
                <Text style={styles.tagText}>{album.location}</Text>
              </View>
            ) : null}
            {album.weatherEmoji ? (
              <View style={styles.tag}>
                <Text style={styles.tagIconI}>{album.weatherEmoji}</Text>
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
            <View style={styles.storyLabelRow}>
              <Ionicons name="chatbubble-outline" size={14} color={COLORS.text} style={{ marginRight: 6 }} />
              <Text style={styles.storyLabel}>오늘의 이야기</Text>
            </View>
            <Text style={styles.storyText}>{album.story}</Text>
          </View>
        ) : null}

        {/* 사진 */}
        {album.photos.length > 0 ? (
          <View style={styles.photosSection}>
            <View style={styles.photosLabelRow}>
            <Ionicons name="images-outline" size={15} color={COLORS.text} style={{ marginRight: 6 }} />
            <Text style={styles.photosLabel}>사진 {album.photos.length}장</Text>
          </View>
            {album.photos.map((photo, idx) => (
              <View key={photo.id} style={styles.photoCard}>
                <TouchableOpacity onPress={() => setFullscreen({ uri: photo.uri, caption: photo.caption })}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                  <View style={styles.photoIdx}><Text style={styles.photoIdxText}>{idx + 1}</Text></View>
                </TouchableOpacity>
                {photo.caption ? (
                  <View style={[styles.captionBox, { backgroundColor: themeBg }]}>
                    <Text style={styles.captionText}>{photo.caption}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noPhotos}>
            <Ionicons name="camera-outline" size={32} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
            <Text style={{ color: COLORS.textMuted }}>등록된 사진이 없습니다.</Text>
          </View>
        )}

        {/* PDF 버튼 */}
        <TouchableOpacity style={styles.pdfBtn}
          onPress={() => navigation.navigate('ExportPDF', { albumIds: [albumId] })}>
          <Ionicons name="document-text-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.pdfBtnText}>PDF로 내보내기</Text>
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
              <View style={styles.fullscreenCloseRow}>
                <Ionicons name="close-circle-outline" size={20} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
                <Text style={styles.fullscreenClose}>닫기</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerIconBtn: { padding: 6 },
  body: { paddingTop: 0 },
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
  tagIconI: { marginRight: 2, fontSize: 14 },
  tagText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  storyCard: {
    backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, padding: 20, borderLeftWidth: 4, borderLeftColor: COLORS.pink,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  storyLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  storyLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  storyText: { fontSize: 15, color: COLORS.text, lineHeight: 24 },
  photosSection: { paddingHorizontal: 16 },
  photosLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  photosLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
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
  captionBox: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  captionText: { fontSize: 14, color: COLORS.text, lineHeight: 20, fontStyle: 'italic' },
  noPhotos: { alignItems: 'center', padding: 32 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 8, backgroundColor: COLORS.purple,
    borderRadius: 24, paddingVertical: 16,
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fullscreenBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  fullscreenImg: { width, height: '70%' },
  fullscreenCaption: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 16, marginHorizontal: 24 },
  fullscreenCaptionText: { color: '#fff', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fullscreenCloseRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  fullscreenClose: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
});
