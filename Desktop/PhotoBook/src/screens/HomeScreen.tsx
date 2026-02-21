import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, StatusBar, Dimensions, Image,
  Animated,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Child, RootStackParamList } from '../types';
import { loadChildren, deleteChild, loadAlbumsByChild } from '../store/albumStore';
import { COLORS } from '../constants';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [children, setChildren] = useState<Child[]>([]);
  const [albumCounts, setAlbumCounts] = useState<Record<string, number>>({});

  // 카드 진입 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0); slideAnim.setValue(20);
    loadChildren().then(async (list) => {
      setChildren(list);
      const counts: Record<string, number> = {};
      for (const c of list) {
        const albums = await loadAlbumsByChild(c.id);
        counts[c.id] = albums.length;
      }
      setAlbumCounts(counts);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }, []));

  const handleDeleteChild = (child: Child) => {
    Alert.alert('삭제', `"${child.name}" 앨범을 삭제할까요?\n모든 사진과 앨범이 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await deleteChild(child.id);
          setChildren(prev => prev.filter(c => c.id !== child.id));
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── 헤더 (피그마: white/95 backdrop, 56px) ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>우리 아이 추억 앨범</Text>
          <Text style={styles.headerSub}>소중한 순간을 기록해요 💕</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateChild', {})}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ── 배경: from-pink-50 via-purple-50 to-blue-50 ── */}
      <View style={styles.bgGradient} />

      {children.length === 0 ? (
        /* ── 빈 상태 (피그마 empty state) ── */
        <Animated.View style={[styles.empty, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyTitle}>첫 앨범을 만들어보세요</Text>
          <Text style={styles.emptyDesc}>
            아이의 이름을 등록하고{'\n'}소중한 순간을 기록하세요
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('CreateChild', {})}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>+ 아이 추가하기</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <ChildCard
              item={item}
              albumCount={albumCounts[item.id] ?? 0}
              index={index}
              onPress={() => navigation.navigate('AlbumList', { childId: item.id })}
              onLongPress={() => Alert.alert(item.name, '무엇을 할까요?', [
                { text: '수정', onPress: () => navigation.navigate('CreateChild', { childId: item.id }) },
                { text: '삭제', style: 'destructive', onPress: () => handleDeleteChild(item) },
                { text: '취소', style: 'cancel' },
              ])}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

/* ── 아이 카드 컴포넌트 ── */
interface CardProps {
  item: Child;
  albumCount: number;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}
function ChildCard({ item, albumCount, index, onPress, onLongPress }: CardProps) {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true,
    }).start();
  }, []);
  const slideY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slideY }] }}>
      {/* 피그마 MobileHome SwipeableCard: 흰 배경, 24px radius, 섀도우 */}
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.82}
      >
        <View style={styles.cardLeft}>
          {/* 썸네일 (피그마: 80x80 rounded-xl, gradient bg) */}
          <View style={[styles.emojiBox, { backgroundColor: item.color + '25' }]}>
            <Text style={styles.emojiText}>{item.emoji}</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.childSub}>
            {item.birthDate ? `🎂 ${item.birthDate}  ` : ''}
            <Text style={styles.albumCount}>📷 {albumCount}개의 앨범</Text>
          </Text>
        </View>
        {/* 색상 점 (우측 표시) */}
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF2F8' },

  /* 배경색 레이어 (from-pink-50 via-purple-50 to-blue-50) */
  bgGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FDF2F8', // pink-50 base
    zIndex: -1,
  },

  /* 헤더 (피그마: white/95, blur, sticky, 56px) */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 64, paddingHorizontal: 20, paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    // 피그마: from-pink-400 to-purple-400 gradient (근사값 단일 색)
    backgroundColor: COLORS.pink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },

  /* 리스트 */
  list: { padding: 16, paddingBottom: 40 },

  /* 카드 (피그마: white, rounded-2xl, 그림자) */
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardLeft: { marginRight: 16 },
  emojiBox: {
    width: 72, height: 72, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiText: { fontSize: 36 },
  cardInfo: { flex: 1 },
  childName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  childSub: { fontSize: 13, color: COLORS.textSecondary },
  albumCount: { fontSize: 13, color: COLORS.purple, fontWeight: '600' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },

  /* 빈 상태 */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  emptyDesc: {
    fontSize: 15, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 24, marginBottom: 32,
  },
  emptyBtn: {
    backgroundColor: COLORS.pink, borderRadius: 28,
    paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
