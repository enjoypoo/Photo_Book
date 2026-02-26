import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, Alert, Image,
  Animated, Keyboard, Modal, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const EMOJIS = [
  '👨‍👩‍👧','👫','👦','👧','💼','🎉','🌟','🦋','🌈','🍀',
  '🎠','🐣','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
  '🌸','🌺','🌻','🌷','🎂','🎁','🎈','🎀','💎','🏆',
  '⭐','🌙','☀️','🌈','❤️','💕','💖','🎵','📚','🎮',
];
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

  // Modal 상태
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);  // ← 이모지 전용 Modal

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const groupAnim = useRef(new Animated.Value(0)).current;
  const emojiAnim = useRef(new Animated.Value(0)).current;

  /* ── 바텀시트 애니메이션 유틸 ── */
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

  /* ── 대표 이미지: 카메라/갤러리 ── */
  const pickPhoto = (camera: boolean) => {
    // Modal 닫기 애니메이션(200ms) 완료 후 ImagePicker 실행
    // (Modal이 완전히 닫히기 전에 다른 네이티브 뷰를 열면 iOS에서 차단됨)
    closeSheet(setShowAvatarSheet, sheetAnim, () => {
      setTimeout(async () => {
        if (camera) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.'); return; }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('권한 필요', '사진 앨범 접근 권한이 필요합니다.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        }
      }, 300); // Modal 완전히 닫힌 후 실행
    });
  };

  /* ── 이모지 선택 팝업 열기 ── */
  const openEmojiModal = () => {
    // 아바타 시트 닫고 → 이모지 모달 열기
    closeSheet(setShowAvatarSheet, sheetAnim, () => {
      setPhotoUri(undefined);
      openSheet(setShowEmojiModal, emojiAnim);
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
  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });
  const groupTranslateY = groupAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });
  const emojiTranslateY = emojiAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });

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
        {/* 미리보기 */}
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
              <Ionicons name="camera-outline" size={14} color={COLORS.text} />
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

        {/* 구분 */}
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

        {/* 생성일 */}
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

      {/* ══════════════════════════════════════
          Modal 1: 대표 이미지 선택
      ══════════════════════════════════════ */}
      <Modal
        visible={showAvatarSheet}
        transparent
        animationType="none"
        onRequestClose={() => closeSheet(setShowAvatarSheet, sheetAnim)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => closeSheet(setShowAvatarSheet, sheetAnim)}
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>대표 이미지 선택</Text>

              <TouchableOpacity style={styles.sheetRow} onPress={() => pickPhoto(true)}>
                <View style={[styles.sheetIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="camera-outline" size={26} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>카메라로 촬영</Text>
                  <Text style={styles.sheetRowSub}>지금 바로 사진 찍기</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetRow} onPress={() => pickPhoto(false)}>
                <View style={[styles.sheetIconBox, { backgroundColor: COLORS.purplePastel }]}>
                  <Ionicons name="images-outline" size={26} color={COLORS.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>갤러리에서 선택</Text>
                  <Text style={styles.sheetRowSub}>앨범에서 사진 선택</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetRow} onPress={openEmojiModal}>
                <View style={[styles.sheetIconBox, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="happy-outline" size={26} color="#F97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>이모지 선택</Text>
                  <Text style={styles.sheetRowSub}>이모지로 대표 이미지 설정</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>

              {photoUri && (
                <TouchableOpacity
                  style={[styles.sheetRow, { backgroundColor: '#FEF2F2' }]}
                  onPress={() => { setPhotoUri(undefined); closeSheet(setShowAvatarSheet, sheetAnim); }}
                >
                  <View style={[styles.sheetIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash-outline" size={26} color={COLORS.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetRowTitle, { color: COLORS.danger }]}>이미지 제거</Text>
                    <Text style={styles.sheetRowSub}>이모지로 대체됩니다</Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════
          Modal 2: 이모지 선택 팝업
      ══════════════════════════════════════ */}
      <Modal
        visible={showEmojiModal}
        transparent
        animationType="none"
        onRequestClose={() => closeSheet(setShowEmojiModal, emojiAnim)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => closeSheet(setShowEmojiModal, emojiAnim)}
        >
          <Animated.View style={[styles.emojiSheet, { transform: [{ translateY: emojiTranslateY }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sheetHandle} />

              {/* 이모지 시트 헤더 */}
              <View style={styles.emojiSheetHeader}>
                <Text style={styles.sheetTitle}>이모지 선택</Text>
                <TouchableOpacity
                  style={[styles.emojiDoneBtn, { backgroundColor: color }]}
                  onPress={() => closeSheet(setShowEmojiModal, emojiAnim)}
                >
                  <Text style={styles.emojiDoneBtnText}>완료</Text>
                </TouchableOpacity>
              </View>

              {/* 현재 선택된 이모지 미리보기 */}
              <View style={[styles.emojiCurrentWrap, { backgroundColor: color + '18' }]}>
                <View style={[styles.emojiCurrentBox, { backgroundColor: color + '30' }]}>
                  <Text style={styles.emojiCurrentIcon}>{emoji}</Text>
                </View>
                <Text style={[styles.emojiCurrentLabel, { color }]}>선택된 이모지</Text>
              </View>

              {/* 이모지 그리드 */}
              <FlatList
                data={EMOJIS}
                keyExtractor={e => e}
                numColumns={7}
                scrollEnabled
                style={styles.emojiList}
                contentContainerStyle={styles.emojiListContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.emojiGridBtn,
                      item === emoji && { backgroundColor: color + '25', borderColor: color, borderWidth: 2 },
                    ]}
                    onPress={() => setEmoji(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiGridIcon}>{item}</Text>
                  </TouchableOpacity>
                )}
              />

              <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════
          Modal 3: 구분 선택
      ══════════════════════════════════════ */}
      <Modal
        visible={showGroupPicker}
        transparent
        animationType="none"
        onRequestClose={() => closeSheet(setShowGroupPicker, groupAnim)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => closeSheet(setShowGroupPicker, groupAnim)}
        >
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
                  {groupType === g.type && <Ionicons name="checkmark" size={18} color={COLORS.purple} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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

  /* ScrollView 컨텐츠 - 저장 버튼이 잘리지 않도록 충분한 paddingBottom */
  body: { padding: 20, paddingBottom: 80 },

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

  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  colorBtn: { width: 44, height: 44, borderRadius: 22 },
  colorBtnSelected: {
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },

  saveBtnWrap: { borderRadius: 24, overflow: 'hidden' },
  saveGradient: { borderRadius: 24 },
  saveBtnInner: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* ── 공통 Modal 오버레이 ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  /* ── 일반 바텀시트 ── */
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 24,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F9FAFB', borderRadius: 20, padding: 16, marginBottom: 12,
  },
  sheetIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetRowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sheetRowSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  /* ── 이모지 선택 시트 (더 큰 시트) ── */
  emojiSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 16, paddingBottom: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 24,
    maxHeight: '75%',
  },
  emojiSheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  emojiDoneBtn: {
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
  },
  emojiDoneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* 현재 선택 이모지 */
  emojiCurrentWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 12, marginBottom: 16,
  },
  emojiCurrentBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiCurrentIcon: { fontSize: 30 },
  emojiCurrentLabel: { fontSize: 13, fontWeight: '600' },

  /* 이모지 그리드 */
  emojiList: { flexGrow: 0 },
  emojiListContent: { paddingBottom: 8 },
  emojiGridBtn: {
    flex: 1, aspectRatio: 1,
    margin: 4, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: 'transparent',
  },
  emojiGridIcon: { fontSize: 28 },

  /* ── 구분 선택 행 ── */
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 6,
    backgroundColor: '#F9FAFB',
  },
  groupRowActive: { backgroundColor: COLORS.purplePastel },
  groupRowEmoji: { fontSize: 22 },
  groupRowLabel: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '500' },
});
