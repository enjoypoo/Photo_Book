import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, SafeAreaView, StatusBar, Animated,
  Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { Album, PhotoEntry, RootStackParamList, WeatherOption } from '../types';
import { upsertAlbum, getAlbumById, saveImageLocally, isAlbumTitleDuplicate } from '../store/albumStore';

const MAX_PHOTOS = 30; // 앨범당 최대 사진 수
import { COLORS, WEATHER_OPTIONS } from '../constants';
import { getTodayISO, parseExifDate, toDateOnly, formatDateKorean, formatDateTimeKorean } from '../utils/dateUtils';
import { TAB_BAR_HEIGHT } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateAlbum'>;
type Route = RouteProp<RootStackParamList, 'CreateAlbum'>;

/* ── EXIF 날짜 추출 ─────────────────────────────────── */
function getExifDate(asset: ImagePicker.ImagePickerAsset): string | null {
  try {
    const exif = (asset as any).exif;
    if (!exif) return null;
    const raw: string | undefined =
      exif['DateTimeOriginal'] ?? exif['DateTime'] ?? exif['DateTimeDigitized'];
    if (!raw) return null;
    const d = parseExifDate(raw);
    return d ? d.toISOString() : null;
  } catch { return null; }
}

/* ── 날짜 범위 계산 ─────────────────────────────────── */
function calcDateRange(photos: PhotoEntry[]): { date: string; dateEnd?: string } {
  const dates = photos.map(p => p.takenAt).filter(Boolean)
    .map(s => new Date(s!).getTime()).filter(n => !isNaN(n));
  if (dates.length === 0) return { date: getTodayISO() };
  const minStr = new Date(Math.min(...dates)).toISOString();
  const maxStr = new Date(Math.max(...dates)).toISOString();
  const sameDay = toDateOnly(minStr) === toDateOnly(maxStr);
  if (photos.length === 1) return { date: toDateOnly(minStr) };  // 1장: 날짜만
  if (sameDay)              return { date: toDateOnly(minStr) }; // 같은 날
  return { date: toDateOnly(minStr), dateEnd: toDateOnly(maxStr) }; // 기간
}

export default function CreateAlbumScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { childId, albumId } = route.params;
  const isEdit = !!albumId;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayISO());          // YYYY-MM-DD
  const [dateEnd, setDateEnd] = useState<string | undefined>();
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState<WeatherOption>(WEATHER_OPTIONS[0]);
  const [weatherCustom, setWeatherCustom] = useState('');
  const [story, setStory] = useState('');
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [captionModal, setCaptionModal] = useState({ visible: false, photoId: '', text: '' });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exifApplied, setExifApplied] = useState(false);

  // 사진 BottomSheet 애니메이션
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const showPhotoSheet = () => {
    Keyboard.dismiss();
    setPhotoSheetVisible(true);
    Animated.spring(sheetAnim, { toValue: 1, damping: 20, useNativeDriver: true }).start();
  };
  const hidePhotoSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setPhotoSheetVisible(false)
    );
  };

  useEffect(() => {
    if (isEdit && albumId) {
      getAlbumById(albumId).then(album => {
        if (!album) return;
        setTitle(album.title);
        // ISO 날짜를 YYYY-MM-DD로 변환
        setDate(album.date.includes('T') ? album.date.split('T')[0] : album.date);
        setDateEnd(album.dateEnd ? (album.dateEnd.includes('T') ? album.dateEnd.split('T')[0] : album.dateEnd) : undefined);
        setLocation(album.location); setStory(album.story); setPhotos(album.photos);
        const w = WEATHER_OPTIONS.find(o => o.type === album.weather) ?? WEATHER_OPTIONS[0];
        setWeather(w);
        if (album.weatherCustom) setWeatherCustom(album.weatherCustom);
      });
    }
  }, [albumId]);

  /* ── 사진 추가 (EXIF 날짜 자동 적용) ─────────────── */
  const applyPhotosWithExif = (newPhotos: PhotoEntry[], allPhotos: PhotoEntry[]) => {
    // 30장 초과 시 잘라내기
    const remaining = MAX_PHOTOS - allPhotos.length;
    const toAdd = newPhotos.slice(0, remaining);
    const merged = [...allPhotos, ...toAdd];
    setPhotos(merged);
    if (toAdd.length < newPhotos.length) {
      Alert.alert(
        '사진 수 제한',
        `앨범당 최대 ${MAX_PHOTOS}장까지 저장할 수 있어요.\n${newPhotos.length - toAdd.length}장이 제외되었습니다.`
      );
    }
    const hasExif = merged.some(p => p.takenAt);
    if (hasExif) {
      const { date: d, dateEnd: de } = calcDateRange(merged);
      setDate(d); setDateEnd(de); setExifApplied(true);
    }
  };

  const pickImages = () => {
    // 이미 30장이면 차단
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('사진 수 제한', `앨범당 최대 ${MAX_PHOTOS}장까지 저장할 수 있어요.`);
      return;
    }
    // Modal 닫기 애니메이션(200ms) 완료 후 ImagePicker 실행
    // (Modal이 완전히 닫히기 전에 다른 네이티브 뷰를 열면 iOS에서 크래시 발생)
    hidePhotoSheet();
    setTimeout(async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('권한 필요', '사진 앨범 접근 권한이 필요합니다.'); return; }
      const canAdd = MAX_PHOTOS - photos.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true,
        quality: 0.75, selectionLimit: canAdd, exif: true,
      });
      if (!result.canceled) {
        const newPhotos: PhotoEntry[] = result.assets.map(a => ({
          id: uuid.v4() as string, uri: a.uri, caption: '',
          width: a.width, height: a.height,
          takenAt: getExifDate(a) ?? undefined,
        }));
        applyPhotosWithExif(newPhotos, photos);
      }
    }, 300); // Modal 완전히 닫힌 후 실행
  };

  const takePhoto = () => {
    // 이미 30장이면 차단
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('사진 수 제한', `앨범당 최대 ${MAX_PHOTOS}장까지 저장할 수 있어요.`);
      return;
    }
    // Modal 닫기 애니메이션(200ms) 완료 후 ImagePicker 실행
    hidePhotoSheet();
    setTimeout(async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75, exif: true });
      if (!result.canceled) {
        const a = result.assets[0];
        const newPhotos: PhotoEntry[] = [{
          id: uuid.v4() as string, uri: a.uri, caption: '',
          takenAt: getExifDate(a) ?? new Date().toISOString(),
        }];
        applyPhotosWithExif(newPhotos, photos);
      }
    }, 300); // Modal 완전히 닫힌 후 실행
  };

  /* ── 위치 자동 감지 (도>시>동 순서) ──────────────── */
  const detectLocation = async () => {
    Keyboard.dismiss();
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('권한 필요', '위치 접근 권한이 필요합니다.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
      });
      if (addr) {
        const parts = [addr.region, addr.city, addr.district].filter(Boolean);
        setLocation(parts.join(' '));
      }
    } catch { Alert.alert('오류', '위치를 가져올 수 없습니다.'); }
    finally { setLoadingLocation(false); }
  };

  /* ── YYYY-MM-DD 형식 검증 및 자동 포맷팅 ────────── */
  const handleDateChange = (text: string, setter: (v: string) => void) => {
    // 숫자만 추출
    const nums = text.replace(/[^0-9]/g, '');
    let formatted = nums;
    if (nums.length >= 5) {
      formatted = nums.slice(0, 4) + '-' + nums.slice(4);
    }
    if (nums.length >= 7) {
      formatted = nums.slice(0, 4) + '-' + nums.slice(4, 6) + '-' + nums.slice(6, 8);
    }
    setter(formatted.slice(0, 10));
  };

  /* ── 저장 ─────────────────────────────────────── */
  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('알림', '날짜를 YYYY-MM-DD 형식으로 입력해주세요.\n예: 2024-03-15');
      return;
    }
    if (dateEnd && !dateRegex.test(dateEnd)) {
      Alert.alert('알림', '종료 날짜를 YYYY-MM-DD 형식으로 입력해주세요.\n예: 2024-03-20');
      return;
    }
    // 중복 앨범명 검사 (같은 아이 내에서)
    const isDuplicate = await isAlbumTitleDuplicate(title.trim(), childId, albumId);
    if (isDuplicate) {
      Alert.alert('앨범 이름 중복', `"${title.trim()}" 앨범이 이미 있어요.\n다른 이름을 사용해주세요.`);
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const albumIdFinal = albumId ?? (uuid.v4() as string);
      const savedPhotos = await Promise.all(
        photos.map(async p => {
          try { return { ...p, uri: await saveImageLocally(p.uri, albumIdFinal, p.id) }; }
          catch { return p; }
        })
      );
      const album: Album = {
        id: albumIdFinal, childId, title: title.trim(), date, dateEnd,
        location: location.trim(),
        weather: weather.type, weatherEmoji: weather.emoji,
        weatherCustom: weather.type === 'other' ? weatherCustom.trim() : undefined,
        story: story.trim(), photos: savedPhotos,
        createdAt: now, updatedAt: now,
      };
      await upsertAlbum(album);
      navigation.goBack();
    } finally { setSaving(false); }
  };

  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '앨범 수정' : '새 앨범 만들기'}</Text>
        <TouchableOpacity
          style={[styles.headerDoneBtn, (!title.trim() || saving) && styles.headerDoneBtnDisabled]}
          onPress={handleSave} disabled={!title.trim() || saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.headerDoneText}>완료</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── 제목 ── */}
          <Text style={styles.label}>앨범 제목 *</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 첫 돌잔치, 가족 여행"
            placeholderTextColor={COLORS.textMuted}
            value={title} onChangeText={setTitle} maxLength={50}
            returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
          />

          {/* ── 날짜 (TextInput YYYY-MM-DD) ── */}
          <Text style={styles.label}>날짜 *</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={date}
              onChangeText={text => handleDateChange(text, setDate)}
              keyboardType="numeric"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            {dateEnd !== undefined && (
              <>
                <Text style={styles.dateSeparator}>~</Text>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                  value={dateEnd}
                  onChangeText={text => handleDateChange(text, setDateEnd)}
                  keyboardType="numeric"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </>
            )}
          </View>
          {exifApplied && (
            <Text style={styles.exifNote}>📷 사진 촬영 날짜가 자동으로 적용되었습니다</Text>
          )}

          {/* ── 위치 ── */}
          <Text style={styles.label}>장소</Text>
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="예: 서울 한강공원"
              placeholderTextColor={COLORS.textMuted}
              value={location} onChangeText={setLocation}
              returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
            />
            <TouchableOpacity style={styles.gpsBtn} onPress={detectLocation} disabled={loadingLocation}>
              {loadingLocation ? <ActivityIndicator size="small" color={COLORS.pink} />
                : <Text style={styles.gpsBtnText}>📍</Text>}
            </TouchableOpacity>
          </View>

          {/* ── 날씨 ── */}
          <Text style={[styles.label, { marginTop: 20 }]}>날씨</Text>
          <View style={styles.weatherGrid}>
            {WEATHER_OPTIONS.map(w => (
              <TouchableOpacity
                key={w.type}
                style={[styles.weatherChip, weather.type === w.type && styles.weatherChipActive]}
                onPress={() => { Keyboard.dismiss(); setWeather(w); }}
              >
                <Text style={styles.weatherEmoji}>{w.emoji}</Text>
                <Text style={[styles.weatherLabel, weather.type === w.type && styles.weatherLabelActive]}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {weather.type === 'other' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="날씨를 직접 입력하세요 (예: 따뜻한 봄날)"
              placeholderTextColor={COLORS.textMuted}
              value={weatherCustom} onChangeText={setWeatherCustom} maxLength={30}
              returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
            />
          )}

          {/* ── 이야기 ── */}
          <Text style={[styles.label, { marginTop: 20 }]}>앨범 이야기</Text>
          <TextInput
            style={[styles.input, styles.storyInput]}
            placeholder="이 날의 추억을 적어보세요..."
            placeholderTextColor={COLORS.textMuted}
            value={story} onChangeText={setStory}
            multiline textAlignVertical="top" maxLength={1000}
          />
          <Text style={styles.charCount}>{story.length}/1000</Text>

          {/* ── 사진 추가 (피그마 PhotoUploader 스타일) ── */}
          <Text style={[styles.label, { marginTop: 20 }]}>사진</Text>
          <TouchableOpacity
            style={[styles.photoUploaderBox, photos.length >= MAX_PHOTOS && styles.photoUploaderBoxFull]}
            onPress={showPhotoSheet}
          >
            <Text style={styles.photoUploaderIcon}>{photos.length >= MAX_PHOTOS ? '🚫' : '🖼️'}</Text>
            <Text style={styles.photoUploaderTitle}>
              {photos.length >= MAX_PHOTOS ? '사진이 가득 찼어요' : '사진 추가하기'}
            </Text>
            <Text style={styles.photoUploaderSub}>
              {photos.length >= MAX_PHOTOS
                ? `최대 ${MAX_PHOTOS}장 저장 완료`
                : `${photos.length}/${MAX_PHOTOS}장 · 여러 장 선택 가능`}
            </Text>
          </TouchableOpacity>

          {/* ── 등록된 사진 목록 ── */}
          {photos.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.photoListTitle}>등록된 사진 ({photos.length}장)</Text>
              {photos.map((photo, idx) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                  <View style={styles.photoNum}><Text style={styles.photoNumText}>{idx + 1}</Text></View>
                  <TouchableOpacity style={styles.photoDelete}
                    onPress={() => Alert.alert('삭제', '이 사진을 삭제할까요?', [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => {
                        const updated = photos.filter(p => p.id !== photo.id);
                        setPhotos(updated);
                        if (updated.some(p => p.takenAt)) {
                          const { date: d, dateEnd: de } = calcDateRange(updated);
                          setDate(d); setDateEnd(de);
                        } else if (updated.length === 0) {
                          setDate(getTodayISO()); setDateEnd(undefined); setExifApplied(false);
                        }
                      }},
                    ])}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                  {photo.takenAt && (
                    <View style={styles.photoExifBadge}>
                      <Text style={styles.photoExifText}>
                        📅 {new Date(photo.takenAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}
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
            </View>
          )}

          {/* ── 저장 버튼 ── */}
          <View style={styles.saveSection}>
            <TouchableOpacity
              style={[styles.saveBigBtn, (!title.trim() || saving) && styles.saveBigBtnDisabled]}
              onPress={handleSave} disabled={!title.trim() || saving} activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBigBtnText}>앨범 저장하기</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── 사진 추가 Modal BottomSheet ── */}
      <Modal
        visible={photoSheetVisible}
        transparent
        animationType="none"
        onRequestClose={hidePhotoSheet}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={hidePhotoSheet}
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <TouchableWithoutFeedback>
              <View>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>사진 추가</Text>
                <TouchableOpacity style={styles.sheetRow} onPress={takePhoto}>
                  <View style={[styles.sheetIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={styles.sheetIconText}>📷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetRowTitle}>카메라로 촬영</Text>
                    <Text style={styles.sheetRowSub}>새로운 사진 찍기</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetRow} onPress={pickImages}>
                  <View style={[styles.sheetIconBox, { backgroundColor: COLORS.purplePastel }]}>
                    <Text style={styles.sheetIconText}>🖼️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetRowTitle}>갤러리에서 선택</Text>
                    <Text style={styles.sheetRowSub}>여러 장 선택 가능</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ height: TAB_BAR_HEIGHT }} />
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── 캡션 모달 ── */}
      <Modal visible={captionModal.visible} transparent animationType="slide"
        onRequestClose={() => setCaptionModal({ ...captionModal, visible: false })}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBox}>
            <Text style={styles.modalTitle}>📝 사진 캡션</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="이 사진에 대한 이야기를 써주세요..."
              placeholderTextColor={COLORS.textMuted}
              value={captionModal.text}
              onChangeText={t => setCaptionModal({ ...captionModal, text: t })}
              multiline autoFocus maxLength={200}
            />
            <Text style={styles.charCount}>{captionModal.text.length}/200</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel}
                onPress={() => setCaptionModal({ ...captionModal, visible: false })}>
                <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={() => {
                setPhotos(prev => prev.map(p =>
                  p.id === captionModal.photoId ? { ...p, caption: captionModal.text } : p
                ));
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBackText: { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  headerDoneBtn: { backgroundColor: COLORS.purple, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  headerDoneBtnDisabled: { opacity: 0.4 },
  headerDoneText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  body: { padding: 20, paddingBottom: 60, backgroundColor: '#fff' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: COLORS.text,
    marginBottom: 16,
  },
  /* 날짜 */
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  dateInput: { flex: 1, marginBottom: 16 },
  dateSeparator: { fontSize: 16, color: COLORS.textMuted, fontWeight: '500', marginBottom: 16 },
  exifNote: { fontSize: 12, color: COLORS.purple, marginBottom: 8, fontWeight: '500' },
  /* 위치 */
  rowInput: { flexDirection: 'row', gap: 8, marginBottom: 0 },
  gpsBtn: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  gpsBtnText: { fontSize: 22 },
  /* 날씨 */
  weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weatherChip: {
    width: '30%', alignItems: 'center', paddingVertical: 12, borderRadius: 16,
    backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB',
  },
  weatherChipActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purplePastel },
  weatherEmoji: { fontSize: 24, marginBottom: 4 },
  weatherLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  weatherLabelActive: { color: COLORS.purple },
  /* 이야기 */
  storyInput: { minHeight: 120, paddingTop: 13, marginBottom: 0 },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 0 },
  /* 사진 업로더 */
  photoUploaderBox: {
    width: '100%', height: 160,
    borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.purple,
    borderRadius: 20, backgroundColor: COLORS.purplePastel + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  photoUploaderBoxFull: {
    borderColor: COLORS.textMuted,
    backgroundColor: '#F9FAFB',
  },
  photoUploaderIcon: { fontSize: 44, marginBottom: 8 },
  photoUploaderTitle: { fontSize: 16, color: COLORS.purple, fontWeight: '600' },
  photoUploaderSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  photoListTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  photoCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  photoImg: { width: '100%', height: 224, resizeMode: 'cover' },
  photoNum: {
    position: 'absolute', top: 10, left: 10, width: 28, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  photoNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  photoDelete: {
    position: 'absolute', top: 10, right: 10, width: 32, height: 32,
    borderRadius: 16, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
  },
  photoExifBadge: {
    position: 'absolute', bottom: 64, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  photoExifText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  captionBtn: {
    margin: 12, alignSelf: 'flex-start',
    backgroundColor: COLORS.pinkPastel, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  captionBtnText: { fontSize: 13, color: COLORS.pink, fontWeight: '600' },
  captionPreview: {
    marginHorizontal: 12, marginBottom: 12,
    backgroundColor: COLORS.bgPink, borderRadius: 10,
    padding: 10, borderLeftWidth: 3, borderLeftColor: COLORS.pink,
  },
  captionPreviewText: { fontSize: 13, color: COLORS.text, lineHeight: 18, fontStyle: 'italic' },
  /* 저장 */
  saveSection: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  saveBigBtn: {
    backgroundColor: COLORS.purple, borderRadius: 24,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBigBtnDisabled: { opacity: 0.45 },
  saveBigBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  /* Modal BottomSheet */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 24,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F9FAFB', borderRadius: 20, padding: 16, marginBottom: 12,
  },
  sheetIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetIconText: { fontSize: 26 },
  sheetRowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sheetRowSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  /* 모달 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: COLORS.bgPink, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.text,
    minHeight: 100, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center' },
  modalSave: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.purple, alignItems: 'center' },
});
