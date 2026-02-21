import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { Album, PhotoEntry, RootStackParamList, WeatherOption } from '../types';
import { upsertAlbum, getAlbumById } from '../store/albumStore';
import { COLORS, WEATHER_OPTIONS } from '../constants';
import { getTodayISO } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateAlbum'>;
type Route = RouteProp<RootStackParamList, 'CreateAlbum'>;

export default function CreateAlbumScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const albumId = route.params?.albumId;
  const isEdit = !!albumId;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState<WeatherOption>(WEATHER_OPTIONS[0]);
  const [story, setStory] = useState('');
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [captionModal, setCaptionModal] = useState<{ visible: boolean; photoId: string; text: string }>({
    visible: false,
    photoId: '',
    text: '',
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (isEdit && albumId) {
      getAlbumById(albumId).then((album) => {
        if (!album) return;
        setTitle(album.title);
        setDate(album.date);
        setLocation(album.location);
        const w = WEATHER_OPTIONS.find((o) => o.type === album.weather) ?? WEATHER_OPTIONS[0];
        setWeather(w);
        setStory(album.story);
        setPhotos(album.photos);
      });
    }
  }, [albumId, isEdit]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 앨범 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 20,
    });
    if (!result.canceled) {
      const newPhotos: PhotoEntry[] = result.assets.map((a) => ({
        id: uuid.v4() as string,
        uri: a.uri,
        caption: '',
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    });
    if (!result.canceled) {
      const newPhoto: PhotoEntry = {
        id: uuid.v4() as string,
        uri: result.assets[0].uri,
        caption: '',
      };
      setPhotos((prev) => [...prev, newPhoto]);
    }
  };

  const removePhoto = (id: string) => {
    Alert.alert('사진 삭제', '이 사진을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => setPhotos((prev) => prev.filter((p) => p.id !== id)),
      },
    ]);
  };

  const openCaptionModal = (photo: PhotoEntry) => {
    setCaptionModal({ visible: true, photoId: photo.id, text: photo.caption });
  };

  const saveCaptionModal = () => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === captionModal.photoId ? { ...p, caption: captionModal.text } : p
      )
    );
    setCaptionModal({ visible: false, photoId: '', text: '' });
  };

  const detectLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '위치 접근 권한이 필요합니다.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address) {
        const parts = [address.district, address.city, address.region].filter(Boolean);
        setLocation(parts.join(' '));
      }
    } catch {
      Alert.alert('오류', '위치를 가져올 수 없습니다.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const validateDate = (val: string) => {
    setDate(val);
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(val)) {
      setDateError('YYYY-MM-DD 형식으로 입력해주세요');
    } else {
      setDateError('');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (dateError) {
      Alert.alert('알림', '날짜 형식을 확인해주세요.');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const album: Album = {
        id: albumId ?? (uuid.v4() as string),
        title: title.trim(),
        date,
        location: location.trim(),
        weather: weather.type,
        weatherEmoji: weather.emoji,
        story: story.trim(),
        photos,
        createdAt: now,
        updatedAt: now,
      };
      await upsertAlbum(album);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '앨범 수정' : '새 앨범'}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 제목 */}
          <View style={styles.section}>
            <Text style={styles.label}>📝 제목</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 공원에서의 즐거운 하루"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>

          {/* 날짜 */}
          <View style={styles.section}>
            <Text style={styles.label}>📅 날짜</Text>
            <TextInput
              style={[styles.input, dateError ? styles.inputError : null]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textLight}
              value={date}
              onChangeText={validateDate}
              keyboardType="numeric"
              maxLength={10}
            />
            {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
          </View>

          {/* 위치 */}
          <View style={styles.section}>
            <Text style={styles.label}>📍 위치</Text>
            <View style={styles.rowInput}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="예: 서울 한강공원"
                placeholderTextColor={COLORS.textLight}
                value={location}
                onChangeText={setLocation}
              />
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={detectLocation}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.locationBtnText}>📡</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 날씨 */}
          <View style={styles.section}>
            <Text style={styles.label}>🌤️ 날씨</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weatherRow}>
              {WEATHER_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w.type}
                  style={[
                    styles.weatherChip,
                    weather.type === w.type && styles.weatherChipActive,
                  ]}
                  onPress={() => setWeather(w)}
                >
                  <Text style={styles.weatherEmoji}>{w.emoji}</Text>
                  <Text
                    style={[
                      styles.weatherLabel,
                      weather.type === w.type && styles.weatherLabelActive,
                    ]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 이야기 */}
          <View style={styles.section}>
            <Text style={styles.label}>💬 오늘의 이야기</Text>
            <TextInput
              style={[styles.input, styles.storyInput]}
              placeholder="오늘 있었던 일, 아이의 표정, 특별한 순간을 기록해보세요..."
              placeholderTextColor={COLORS.textLight}
              value={story}
              onChangeText={setStory}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{story.length}/1000</Text>
          </View>

          {/* 사진 */}
          <View style={styles.section}>
            <Text style={styles.label}>🖼️ 사진 ({photos.length}장)</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={takePhoto}>
                <Text style={styles.photoActionIcon}>📷</Text>
                <Text style={styles.photoActionText}>촬영</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={pickImages}>
                <Text style={styles.photoActionIcon}>🖼️</Text>
                <Text style={styles.photoActionText}>앨범에서 선택</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.photoGrid}>
              {photos.map((photo, idx) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoIndex}>{idx + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.photoDeleteBtn}
                    onPress={() => removePhoto(photo.id)}
                  >
                    <Text style={styles.photoDeleteText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.captionBtn}
                    onPress={() => openCaptionModal(photo)}
                  >
                    <Text style={styles.captionBtnText}>
                      {photo.caption ? '✏️ 수정' : '+ 캡션'}
                    </Text>
                  </TouchableOpacity>
                  {photo.caption ? (
                    <View style={styles.captionPreview}>
                      <Text style={styles.captionPreviewText} numberOfLines={2}>
                        {photo.caption}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 캡션 모달 */}
      <Modal
        visible={captionModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setCaptionModal({ ...captionModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBox}
          >
            <Text style={styles.modalTitle}>📝 사진 캡션</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="이 사진에 대한 이야기를 써주세요..."
              placeholderTextColor={COLORS.textLight}
              value={captionModal.text}
              onChangeText={(t) => setCaptionModal({ ...captionModal, text: t })}
              multiline
              autoFocus
              maxLength={200}
            />
            <Text style={styles.charCount}>{captionModal.text.length}/200</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCaptionModal({ ...captionModal, visible: false })}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveCaptionModal}>
                <Text style={styles.modalSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  backBtn: {
    padding: 4,
  },
  backBtnText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 0,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  rowInput: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  locationBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBtnText: {
    fontSize: 22,
  },
  weatherRow: {
    flexDirection: 'row',
  },
  weatherChip: {
    alignItems: 'center',
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minWidth: 64,
  },
  weatherChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  weatherEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  weatherLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  weatherLabelActive: {
    color: COLORS.primaryDark,
  },
  storyInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 14,
  },
  photoActionIcon: {
    fontSize: 20,
  },
  photoActionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  photoGrid: {
    gap: 16,
  },
  photoItem: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoThumb: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndex: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  captionBtn: {
    margin: 10,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  captionBtnText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  captionPreview: {
    marginHorizontal: 10,
    marginBottom: 10,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  captionPreviewText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
});
