import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { Album, PhotoEntry, RootStackParamList, WeatherOption } from '../types';
import { upsertAlbum, getAlbumById, saveImageLocally } from '../store/albumStore';
import { COLORS, WEATHER_OPTIONS } from '../constants';
import { getTodayISO } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateAlbum'>;
type Route = RouteProp<RootStackParamList, 'CreateAlbum'>;

export default function CreateAlbumScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { childId, albumId } = route.params;
  const isEdit = !!albumId;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState<WeatherOption>(WEATHER_OPTIONS[0]);
  const [story, setStory] = useState('');
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [captionModal, setCaptionModal] = useState({ visible: false, photoId: '', text: '' });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && albumId) {
      getAlbumById(albumId).then(album => {
        if (!album) return;
        setTitle(album.title); setDate(album.date); setLocation(album.location);
        setStory(album.story); setPhotos(album.photos);
        const w = WEATHER_OPTIONS.find(o => o.type === album.weather) ?? WEATHER_OPTIONS[0];
        setWeather(w);
      });
    }
  }, [albumId]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '사진 앨범 접근 권한이 필요합니다.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true,
      quality: 0.75, selectionLimit: 20,
    });
    if (!result.canceled) {
      const newPhotos: PhotoEntry[] = result.assets.map(a => ({
        id: uuid.v4() as string, uri: a.uri, caption: '',
        width: a.width, height: a.height,
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!result.canceled) {
      setPhotos(prev => [...prev, { id: uuid.v4() as string, uri: result.assets[0].uri, caption: '' }]);
    }
  };

  const detectLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('권한 필요', '위치 접근 권한이 필요합니다.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (addr) setLocation([addr.district, addr.city, addr.region].filter(Boolean).join(' '));
    } catch { Alert.alert('오류', '위치를 가져올 수 없습니다.'); }
    finally { setLoadingLocation(false); }
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const albumIdFinal = albumId ?? (uuid.v4() as string);
      // 사진을 앱 내부 저장소로 복사 (용량 최소화)
      const savedPhotos: PhotoEntry[] = await Promise.all(
        photos.map(async p => {
          try {
            const localUri = await saveImageLocally(p.uri, albumIdFinal, p.id);
            return { ...p, uri: localUri };
          } catch { return p; }
        })
      );
      const album: Album = {
        id: albumIdFinal, childId, title: title.trim(), date,
        location: location.trim(), weather: weather.type, weatherEmoji: weather.emoji,
        story: story.trim(), photos: savedPhotos,
        createdAt: now, updatedAt: now,
      };
      await upsertAlbum(album);
      navigation.goBack();
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPink} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? '앨범 수정' : '새 앨범'}</Text>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>저장</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 제목 */}
          <Text style={styles.label}>📝 제목</Text>
          <TextInput style={styles.input} placeholder="예: 공원에서 즐거운 하루"
            placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} maxLength={50} />

          {/* 날짜 */}
          <Text style={styles.label}>📅 날짜</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted} value={date} onChangeText={setDate}
            keyboardType="numeric" maxLength={10} />

          {/* 위치 */}
          <Text style={styles.label}>📍 위치</Text>
          <View style={styles.rowInput}>
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="예: 서울 한강공원"
              placeholderTextColor={COLORS.textMuted} value={location} onChangeText={setLocation} />
            <TouchableOpacity style={styles.gpsBtn} onPress={detectLocation} disabled={loadingLocation}>
              {loadingLocation ? <ActivityIndicator size="small" color={COLORS.pink} /> : <Text style={{ fontSize: 20 }}>📡</Text>}
            </TouchableOpacity>
          </View>

          {/* 날씨 */}
          <Text style={styles.label}>🌤️ 날씨</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 4 }}>
              {WEATHER_OPTIONS.map(w => (
                <TouchableOpacity key={w.type}
                  style={[styles.weatherChip, weather.type === w.type && styles.weatherChipActive]}
                  onPress={() => setWeather(w)}>
                  <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
                  <Text style={[styles.weatherLabel, weather.type === w.type && { color: COLORS.pink }]}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* 이야기 */}
          <Text style={styles.label}>💬 오늘의 이야기</Text>
          <TextInput style={[styles.input, styles.storyInput]}
            placeholder="오늘 있었던 특별한 순간을 기록해보세요..."
            placeholderTextColor={COLORS.textMuted} value={story} onChangeText={setStory}
            multiline textAlignVertical="top" maxLength={1000} />
          <Text style={styles.charCount}>{story.length}/1000</Text>

          {/* 사진 */}
          <Text style={styles.label}>🖼️ 사진 ({photos.length}장)</Text>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>앨범 선택</Text>
            </TouchableOpacity>
          </View>

          {photos.map((photo, idx) => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.uri }} style={styles.photoImg} />
              <View style={styles.photoNum}><Text style={styles.photoNumText}>{idx + 1}</Text></View>
              <TouchableOpacity style={styles.photoDelete}
                onPress={() => Alert.alert('삭제', '이 사진을 삭제할까요?', [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => setPhotos(prev => prev.filter(p => p.id !== photo.id)) },
                ])}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captionBtn}
                onPress={() => setCaptionModal({ visible: true, photoId: photo.id, text: photo.caption })}>
                <Text style={styles.captionBtnText}>{photo.caption ? '✏️ 캡션 수정' : '+ 캡션 추가'}</Text>
              </TouchableOpacity>
              {photo.caption ? (
                <View style={styles.captionPreview}>
                  <Text style={styles.captionPreviewText} numberOfLines={2}>{photo.caption}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 캡션 모달 */}
      <Modal visible={captionModal.visible} transparent animationType="slide"
        onRequestClose={() => setCaptionModal({ ...captionModal, visible: false })}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBox}>
            <Text style={styles.modalTitle}>📝 사진 캡션</Text>
            <TextInput style={styles.modalInput}
              placeholder="이 사진에 대한 이야기를 써주세요..."
              placeholderTextColor={COLORS.textMuted}
              value={captionModal.text}
              onChangeText={t => setCaptionModal({ ...captionModal, text: t })}
              multiline autoFocus maxLength={200} />
            <Text style={styles.charCount}>{captionModal.text.length}/200</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel}
                onPress={() => setCaptionModal({ ...captionModal, visible: false })}>
                <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={() => {
                setPhotos(prev => prev.map(p => p.id === captionModal.photoId ? { ...p, caption: captionModal.text } : p));
                setCaptionModal({ visible: false, photoId: '', text: '' });
              }}>
                <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>저장</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cancel: { fontSize: 16, color: COLORS.textSecondary },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.pink, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: COLORS.text, marginBottom: 20,
  },
  rowInput: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  gpsBtn: {
    width: 50, height: 50, borderRadius: 14, backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  weatherChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, minWidth: 68,
  },
  weatherChipActive: { borderColor: COLORS.pink, backgroundColor: '#FDF2F8' },
  weatherLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginTop: 3 },
  storyInput: { minHeight: 120, paddingTop: 12 },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: -16, marginBottom: 20 },
  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 14,
  },
  photoBtnIcon: { fontSize: 20 },
  photoBtnText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  photoCard: { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  photoImg: { width: '100%', height: 200, resizeMode: 'cover' },
  photoNum: {
    position: 'absolute', top: 10, left: 10, width: 28, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  photoNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  photoDelete: {
    position: 'absolute', top: 10, right: 10, width: 28, height: 28,
    borderRadius: 14, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
  },
  captionBtn: {
    margin: 10, alignSelf: 'flex-start', backgroundColor: '#FDF2F8',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
  },
  captionBtnText: { fontSize: 13, color: COLORS.pink, fontWeight: '600' },
  captionPreview: { marginHorizontal: 10, marginBottom: 10, backgroundColor: COLORS.bgPink, borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: COLORS.pink },
  captionPreviewText: { fontSize: 13, color: COLORS.text, lineHeight: 18, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: COLORS.bgPink, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.text, minHeight: 100, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  modalSave: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.pink, alignItems: 'center' },
});
