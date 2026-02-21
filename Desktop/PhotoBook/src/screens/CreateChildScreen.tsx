import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { Child, RootStackParamList } from '../types';
import { loadChildren, upsertChild } from '../store/albumStore';
import { COLORS } from '../constants';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateChild'>;
type Route = RouteProp<RootStackParamList, 'CreateChild'>;

const EMOJIS = ['👶','🧒','👦','👧','🧒‍♂️','🧒‍♀️','🐣','🌟','🦋','🌈','🍀','🎠'];
const PALETTE = ['#F472B6','#C084FC','#60A5FA','#34D399','#FBBF24','#F87171','#FB923C','#A78BFA'];

export default function CreateChildScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.childId;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👶');
  const [color, setColor] = useState(PALETTE[0]);
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (editId) {
      loadChildren().then(list => {
        const c = list.find(x => x.id === editId);
        if (c) { setName(c.name); setEmoji(c.emoji); setColor(c.color); setBirthDate(c.birthDate ?? ''); }
      });
    }
  }, [editId]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('알림', '이름을 입력해주세요.'); return; }
    const child: Child = {
      id: editId ?? (uuid.v4() as string),
      name: name.trim(), emoji, color,
      birthDate: birthDate.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await upsertChild(child);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPink} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editId ? '아이 수정' : '아이 추가'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.save}>저장</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 미리보기 */}
        <View style={[styles.preview, { borderColor: color }]}>
          <View style={[styles.previewEmoji, { backgroundColor: color + '22' }]}>
            <Text style={{ fontSize: 48 }}>{emoji}</Text>
          </View>
          <Text style={styles.previewName}>{name || '이름 입력'}</Text>
        </View>

        {/* 이름 */}
        <Text style={styles.label}>이름</Text>
        <TextInput
          style={styles.input} placeholder="아이 이름을 입력하세요"
          placeholderTextColor={COLORS.textMuted}
          value={name} onChangeText={setName} maxLength={20}
        />

        {/* 생년월일 */}
        <Text style={styles.label}>생년월일 (선택)</Text>
        <TextInput
          style={styles.input} placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={birthDate} onChangeText={setBirthDate}
          keyboardType="numeric" maxLength={10}
        />

        {/* 이모지 */}
        <Text style={styles.label}>대표 이모지</Text>
        <View style={styles.emojiGrid}>
          {EMOJIS.map(e => (
            <TouchableOpacity
              key={e} style={[styles.emojiBtn, emoji === e && { borderColor: color, borderWidth: 2 }]}
              onPress={() => setEmoji(e)}
            >
              <Text style={{ fontSize: 28 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 색상 */}
        <Text style={styles.label}>테마 색상</Text>
        <View style={styles.palette}>
          {PALETTE.map(c => (
            <TouchableOpacity
              key={c} style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>
      </ScrollView>
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
  save: { fontSize: 16, fontWeight: '700', color: COLORS.pink },
  body: { padding: 20, paddingBottom: 48 },
  preview: {
    alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 20, padding: 24, marginBottom: 28,
    borderWidth: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  previewEmoji: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  previewName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: COLORS.text, marginBottom: 20,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  emojiBtn: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  colorBtn: { width: 44, height: 44, borderRadius: 22 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
});
