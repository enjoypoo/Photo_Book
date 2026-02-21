import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, StatusBar, Dimensions, Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Child, RootStackParamList } from '../types';
import { loadChildren, deleteChild, loadAlbumsByChild } from '../store/albumStore';
import { COLORS } from '../constants';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const CHILD_COLORS = ['#F472B6','#C084FC','#60A5FA','#34D399','#FBBF24','#F87171'];
const CHILD_EMOJIS = ['👶','🧒','👦','👧','🧒‍♂️','🧒‍♀️'];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [children, setChildren] = useState<Child[]>([]);
  const [albumCounts, setAlbumCounts] = useState<Record<string, number>>({});

  useFocusEffect(useCallback(() => {
    loadChildren().then(async (list) => {
      setChildren(list);
      const counts: Record<string, number> = {};
      for (const c of list) {
        const albums = await loadAlbumsByChild(c.id);
        counts[c.id] = albums.length;
      }
      setAlbumCounts(counts);
    });
  }, []));

  const handleDeleteChild = (child: Child) => {
    Alert.alert('삭제', `"${child.name}" 앨범을 삭제할까요?\n모든 사진과 앨범이 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteChild(child.id);
        setChildren(prev => prev.filter(c => c.id !== child.id));
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPink} />
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>우리 아이 추억 앨범</Text>
          <Text style={styles.headerSub}>소중한 순간을 기록해요 💕</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateChild', {})}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {children.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyTitle}>첫 앨범을 만들어보세요</Text>
          <Text style={styles.emptyDesc}>아이의 이름을 등록하고{'\n'}소중한 순간을 기록하세요</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateChild', {})}>
            <Text style={styles.emptyBtnText}>+ 아이 추가하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { borderTopColor: item.color }]}
              onPress={() => navigation.navigate('AlbumList', { childId: item.id })}
              onLongPress={() => Alert.alert(item.name, '무엇을 할까요?', [
                { text: '수정', onPress: () => navigation.navigate('CreateChild', { childId: item.id }) },
                { text: '삭제', style: 'destructive', onPress: () => handleDeleteChild(item) },
                { text: '취소', style: 'cancel' },
              ])}
              activeOpacity={0.85}
            >
              <View style={[styles.childEmoji, { backgroundColor: item.color + '22' }]}>
                <Text style={styles.emojiText}>{item.emoji}</Text>
              </View>
              <Text style={styles.childName}>{item.name}</Text>
              <Text style={styles.albumCount}>{albumCounts[item.id] ?? 0}개의 앨범</Text>
              <View style={[styles.colorBar, { backgroundColor: item.color }]} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.pink, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  list: { padding: 16, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
  card: {
    width: CARD_W, backgroundColor: COLORS.card,
    borderRadius: 20, padding: 16, alignItems: 'center',
    borderTopWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    overflow: 'hidden',
  },
  childEmoji: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emojiText: { fontSize: 36 },
  childName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  albumCount: { fontSize: 12, color: COLORS.textSecondary },
  colorBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyBtn: {
    backgroundColor: COLORS.pink, borderRadius: 28,
    paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
