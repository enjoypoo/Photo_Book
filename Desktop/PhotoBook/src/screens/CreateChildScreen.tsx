import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, Alert, Image,
  Animated, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { Child, GroupType, RootStackParamList } from '../types';
import { loadChildren, upsertChild } from '../store/albumStore';
import { COLORS } from '../constants';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateChild'>;
type Route = RouteProp<RootStackParamList, 'CreateChild'>;

const EMOJIS = ['👨‍👩‍👧','👫','👦','👧','💼','🎉','🌟','🦋','🌈','🍀','🎠','🐣'];
const PALETTE = ['#F472B6','#C084FC','#60A5FA','#34D399','#FBBF24','#F87171','#FB923C','#A78BFA'];

const GROUP_TYPES: { type: GroupType; label: string; emoji: string }[] = [
  { type: 'parent', label: '부모',  emoji: '👨‍👩‍👧' },
  { type: 'friend', label: '친구',  emoji: '👫' },
  { type: 'child',  label: '자녀',  emoji: '👦' },
  { type: 'work',   label: '직장',  emoji: '💼' },
  { type: 'club',   label: '모임',  emoji: '🎉' },
  { type: 'other',  label: '기타',  emoji: '🌟' },
];

export default function CreateChildScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.childId;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [color, setColor] = useState(PALETTE[0]);
  const [groupType, setGroupType] = useState<GroupType>('child');
  const [groupTypeCustom, setGroupTypeCustom] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const groupAnim = useRef(new Animated.Value(0)).current;

  const openSheet = (setter: (v: boolean) => void, anim: Animated.Value) => {
    Keyboard.dismiss();
    setter(true);
    Animated.spring(anim, { toValue: 1, damping: 20, useNativeDriver: true }).start();
  };
  const closeSheet = (setter: (v: boolean) => void, anim: Animated.Value, cb?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setter(false);
      cb?.();
    });
  };

  useEffect(() => {
    if (editId) {
      loadChildren().then(list => {
        const c = list.find(x => x.id === editId);
        if (c) {
          setName(c.name); setEmoji(c.emoji); setColor(c.color);
          setPhotoUri(c.photoUri);
          setGroupType(c.groupType ?? 'child');
          setGroupTypeCustom(c.groupTypeCustom ?? '');
          setBirthDate(c.birthDate ?? '');
        }
      });
    }
  }, [editId]);

  /* ── 대표 이미지 선택 ── */
  const pickPhoto = async (camera: boolean) => {
    closeSheet(setShowAvatarSheet, sheetAnim, async () => {
      if (camera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.'); return; }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: true, aspect: [1, 1] });
        if (!result.canceled) { setPhotoUri(result.assets[0].uri); setShowEmojiGrid(false); }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('권한 필요', '사진 앨범 접근 권한이 필요합니다.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: true, aspect: [1, 1] });
        if (!result.canceled) { setPhotoUri(result.assets[0].uri); setShowEmojiGrid(false); }
      }
    });
  };

  const openEmojiSelect = () => {
    closeSheet(setShowAvatarSheet, sheetAnim, () => {
      setPhotoUri(undefined);
      setShowEmojiGrid(true);
    });
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('알림', '그룹명을 입력해주세요.'); return; }
    if (groupType === 'other' && !groupTypeCustom.trim()) {
      Alert.alert('알림', '기타 구분을 입력해주세요.'); return;
    }
    const id = editId ?? (uuid.v4() as string);

    let savedPhotoUri = photoUri;
    if (photoUri && FileSystem.documentDirectory && !photoUri.startsWith(FileSystem.documentDirectory)) {
      try {
        const dir = `${FileSystem.documentDirectory}group_photos/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const dest = `${dir}${id}.jpg`;
        await FileSystem.copyAsync({ from: photoUri, to: dest });
        savedPhotoUri = dest;
      } catch {}
    }

    const child: Child = {
      id, name: name.trim(), emoji, photoUri: savedPhotoUri,
      color, groupType,
      groupTypeCustom: groupType === 'other' ? groupTypeCustom.trim() : undefined,
      birthDate: birthDate.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await upsertChild(child);
    navigation.goBack();
  };

  const selectedGroup = GROUP_TYPES.find(g => g.type === groupType)!;
  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] });
  const groupTranslateY = groupAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerCancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editId ? '그룹 수정' : '그룹 추가'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
          <Text style={styles.headerSave}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* 미리보기 (그라디언트) */}
        <LinearGradient
          colors={[color + 'DD', color + '88'] as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.preview}
        >
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => openSheet(setShowAvatarSheet, sheetAnim)}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarEmpty, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.avatarEmoji}>{emoji}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={{ fontSize: 13 }}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.previewName}>{name || '그룹명 입력'}</Text>
          <View style={styles.previewGroupBadge}>
            <Text style={styles.previewGroupText}>
              {selectedGroup.emoji} {groupType === 'other' && groupTypeCustom ? groupTypeCustom : selectedGroup.label}
            </Text>
          </View>
        </LinearGradient>

        {/* 그룹명 */}
        <Text style={styles.label}>그룹명 *</Text>
        <TextInput
          style={styles.input} placeholder="그룹명을 입력하세요"
          placeholderTextColor={COLORS.textMuted}
          value={name} onChangeText={setName} maxLength={30}
          returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
        />

        {/* 구분 풀다운 */}
        <Text style={[styles.label, { marginTop: 20 }]}>구분</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => openSheet(setShowGroupPicker, groupAnim)}
        >
          <Text style={styles.dropdownBtnText}>
            {selectedGroup.emoji}  {groupType === 'other' && groupTypeCustom ? groupTypeCustom : selectedGroup.label}
          </Text>
          <Text style={styles.dropdownChevron}>▾</Text>
        </TouchableOpacity>
        {groupType === 'other' && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="구분을 직접 입력하세요"
            placeholderTextColor={COLORS.textMuted}
            value={groupTypeCustom} onChangeText={setGroupTypeCustom} maxLength={20}
            returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
          />
        )}

        {/* 생성일 (선택) */}
        <Text style={[styles.label, { marginTop: 20 }]}>생성일 (선택)</Text>
        <TextInput
          style={styles.input} placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={birthDate} onChangeText={setBirthDate}
          keyboardType="numeric" maxLength={10}
          returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
        />

        {/* 테마 색상 */}
        <Text style={[styles.label, { marginTop: 20 }]}>테마 색상</Text>
        <View style={styles.palette}>
          {PALETTE.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {/* 이모지 선택 (사진 없을 때 or 이모지 선택 시) */}
        {showEmojiGrid && (
          <>
            <Text style={[styles.label, { marginTop: 4 }]}>이모지 선택</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && { borderColor: color, backgroundColor: color + '18' }]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* 저장 버튼 */}
        <View style={styles.saveBtnWrap}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd] as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <TouchableOpacity style={styles.saveBtnInner} onPress={handleSave}>
              <Text style={styles.saveBtnText}>저장하기</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* 구분 선택 BottomSheet */}
      {showGroupPicker && (
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1}
          onPress={() => closeSheet(setShowGroupPicker, groupAnim)}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: groupTranslateY }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>구분 선택</Text>
              {GROUP_TYPES.map(g => (
                <TouchableOpacity
                  key={g.type}
                  style={[styles.groupRow, groupType === g.type && styles.groupRowActive]}
                  onPress={() => { setGroupType(g.type); closeSheet(setShowGroupPicker, groupAnim); }}
                >
                  <Text style={styles.groupRowEmoji}>{g.emoji}</Text>
                  <Text style={[styles.groupRowLabel, groupType === g.type && { color: COLORS.purple, fontWeight: '700' }]}>
                    {g.label}
                  </Text>
                  {groupType === g.type && <Text style={{ color: COLORS.purple, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* 아바타 선택 BottomSheet (카메라 / 갤러리 / 이모지) */}
      {showAvatarSheet && (
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1}
          onPress={() => closeSheet(setShowAvatarSheet, sheetAnim)}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>대표 이미지 선택</Text>

              <TouchableOpacity style={styles.sheetRow} onPress={() => pickPhoto(true)}>
                <View style={[styles.sheetIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={styles.sheetIconText}>📷</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>카메라로 촬영</Text>
                  <Text style={styles.sheetRowSub}>지금 바로 사진 찍기</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetRow} onPress={() => pickPhoto(false)}>
                <View style={[styles.sheetIconBox, { backgroundColor: COLORS.purplePastel }]}>
                  <Text style={styles.sheetIconText}>🖼️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>갤러리에서 선택</Text>
                  <Text style={styles.sheetRowSub}>앨범에서 사진 선택</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetRow} onPress={openEmojiSelect}>
                <View style={[styles.sheetIconBox, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={styles.sheetIconText}>😊</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>이모지 선택</Text>
                  <Text style={styles.sheetRowSub}>이모지로 대표 이미지 설정</Text>
                </View>
              </TouchableOpacity>

              {photoUri && (
                <TouchableOpacity
                  style={[styles.sheetRow, { backgroundColor: '#FEF2F2' }]}
                  onPress={() => { setPhotoUri(undefined); closeSheet(setShowAvatarSheet, sheetAnim); }}
                >
                  <View style={[styles.sheetIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={styles.sheetIconText}>🗑️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetRowTitle, { color: COLORS.danger }]}>이미지 제거</Text>
                    <Text style={styles.sheetRowSub}>이모지로 대체됩니다</Text>
                  </View>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerBtn: { minWidth: 56, paddingVertical: 8 },
  headerCancel: { fontSize: 16, color: COLORS.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSave: { fontSize: 16, fontWeight: '700', color: COLORS.pink, textAlign: 'right' },

  body: { padding: 20, paddingBottom: 48 },

  preview: {
    alignItems: 'center', borderRadius: 24, padding: 28, marginBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 4,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' },
  avatarEmpty: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarEmoji: { fontSize: 48 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  previewName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  previewGroupBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  previewGroupText: { fontSize: 14, color: '#fff', fontWeight: '600' },

  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: COLORS.text,
  },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdownBtnText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  dropdownChevron: { fontSize: 18, color: COLORS.textMuted },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  emojiBtn: {
    width: 54, height: 54, borderRadius: 16, backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E7EB',
  },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  colorBtn: { width: 44, height: 44, borderRadius: 22 },
  colorBtnSelected: {
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },

  saveBtnWrap: { borderRadius: 24, overflow: 'hidden' },
  saveGradient: { borderRadius: 24 },
  saveBtnInner: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  sheetOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 40,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 16 },

  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 6, backgroundColor: '#F9FAFB',
  },
  groupRowActive: { backgroundColor: COLORS.purplePastel },
  groupRowEmoji: { fontSize: 22 },
  groupRowLabel: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '500' },

  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F9FAFB', borderRadius: 20, padding: 16, marginBottom: 12,
  },
  sheetIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetIconText: { fontSize: 26 },
  sheetRowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sheetRowSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
