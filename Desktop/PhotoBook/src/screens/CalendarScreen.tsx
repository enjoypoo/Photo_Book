import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Album, RootStackParamList } from '../types';
import { loadAlbums } from '../store/albumStore';
import { COLORS } from '../constants';
import { TAB_BAR_HEIGHT } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* 특정 달의 앨범 날짜 목록 반환 (date, dateEnd 범위 포함) */
function getAlbumDatesInMonth(albums: Album[], year: number, month: number): Set<string> {
  const dates = new Set<string>();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthStr = `${year}-${pad(month + 1)}`;

  for (const album of albums) {
    // date ~ dateEnd 범위 내 날짜 추가
    const start = new Date(album.date.slice(0, 10));
    const end = album.dateEnd ? new Date(album.dateEnd.slice(0, 10)) : start;
    const cur = new Date(start);
    while (cur <= end) {
      const str = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      if (str.startsWith(monthStr)) dates.add(str);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return dates;
}

/* 선택 날짜에 해당하는 앨범 필터 (date ~ dateEnd 범위) */
function getAlbumsForDate(albums: Album[], dateStr: string): Album[] {
  const target = new Date(dateStr);
  return albums.filter(album => {
    const start = new Date(album.date.slice(0, 10));
    const end = album.dateEnd ? new Date(album.dateEnd.slice(0, 10)) : start;
    return target >= start && target <= end;
  });
}

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const today = new Date();

  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  });
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);

  useFocusEffect(useCallback(() => {
    loadAlbums().then(setAllAlbums);
  }, []));

  /* 달 이동 */
  const prevMonth = () => {
    if (curMonth === 0) { setCurYear(y => y - 1); setCurMonth(11); }
    else setCurMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (curMonth === 11) { setCurYear(y => y + 1); setCurMonth(0); }
    else setCurMonth(m => m + 1);
  };

  /* 달력 날짜 배열 계산 */
  const calDays = (): (number | null)[] => {
    const firstDay = new Date(curYear, curMonth, 1).getDay(); // 0=일
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // 6줄 맞추기
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const albumDates = getAlbumDatesInMonth(allAlbums, curYear, curMonth);
  const selectedAlbums = getAlbumsForDate(allAlbums, selectedDate);

  /* 선택 날짜 표시 (월, 일) */
  const selectedDateLabel = (() => {
    const d = new Date(selectedDate);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  })();

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 배경 그라디언트 */}
      <LinearGradient
        colors={[COLORS.bgPink, COLORS.bgPurple, COLORS.bgBlue]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 헤더 */}
      <LinearGradient
        colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>달력 보기</Text>
      </LinearGradient>

      <FlatList
        data={[1]} // 단일 아이템 (스크롤 가능한 컨테이너)
        keyExtractor={() => 'cal'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 20 }}
        renderItem={() => (
          <View style={styles.body}>
            {/* 달력 카드 */}
            <View style={styles.calCard}>
              {/* 달 이동 헤더 */}
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
                  <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{curYear}년 {String(curMonth + 1).padStart(2, '0')}월</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* 요일 헤더 */}
              <View style={styles.weekRow}>
                {WEEK_DAYS.map((d, i) => (
                  <Text key={d} style={[styles.weekDay, i === 0 && styles.sunday, i === 6 && styles.saturday]}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* 날짜 그리드 */}
              <View style={styles.daysGrid}>
                {calDays().map((day, idx) => {
                  if (!day) return <View key={`empty-${idx}`} style={styles.dayCell} />;
                  const dateStr = `${curYear}-${pad(curMonth + 1)}-${pad(day)}`;
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === todayStr;
                  const hasAlbum = albumDates.has(dateStr);
                  const isSunday = idx % 7 === 0;
                  const isSaturday = idx % 7 === 6;

                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={styles.dayCell}
                      onPress={() => setSelectedDate(dateStr)}
                      activeOpacity={0.7}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={styles.dayCircleActive}
                        >
                          <Text style={styles.dayNumActive}>{day}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.dayCircle, isToday && styles.dayCircleToday]}>
                          <Text style={[
                            styles.dayNum,
                            isSunday && styles.sundayNum,
                            isSaturday && styles.saturdayNum,
                            isToday && styles.todayNum,
                          ]}>
                            {day}
                          </Text>
                        </View>
                      )}
                      {/* 앨범 있는 날 점 표시 */}
                      {hasAlbum && !isSelected && (
                        <View style={styles.albumDot} />
                      )}
                      {hasAlbum && isSelected && (
                        <View style={styles.albumDotActive} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 선택된 날짜 앨범 목록 */}
            <View style={styles.albumSection}>
              <Text style={styles.albumSectionTitle}>
                {selectedDateLabel}의 앨범{' '}
                <Text style={styles.albumSectionCount}>({selectedAlbums.length}개)</Text>
              </Text>

              {selectedAlbums.length === 0 ? (
                <View style={styles.emptyAlbum}>
                  <Ionicons name="camera-outline" size={40} color={COLORS.textSecondary} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyAlbumText}>이 날의 앨범이 없어요</Text>
                </View>
              ) : (
                selectedAlbums.map(album => (
                  <AlbumRow
                    key={album.id}
                    album={album}
                    onPress={() => navigation.navigate('AlbumDetail', { albumId: album.id, childId: album.childId })}
                  />
                ))
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

/* ── 앨범 행 카드 ── */
function AlbumRow({ album, onPress }: { album: Album; onPress: () => void }) {
  const cover = album.coverPhotoId
    ? album.photos.find(p => p.id === album.coverPhotoId) ?? album.photos[0]
    : album.photos[0];

  return (
    <TouchableOpacity style={styles.albumRow} onPress={onPress} activeOpacity={0.82}>
      {/* 썸네일 */}
      {cover ? (
        <Image source={{ uri: cover.uri }} style={styles.albumThumb} />
      ) : (
        <View style={[styles.albumThumb, styles.albumThumbEmpty]}>
          <Ionicons name="camera-outline" size={24} color={COLORS.textMuted} />
        </View>
      )}
      {/* 정보 */}
      <View style={styles.albumRowInfo}>
        <Text style={styles.albumRowTitle} numberOfLines={1}>{album.title}</Text>
        <View style={styles.albumRowMetaRow}>
          <Ionicons name="camera-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
          <Text style={styles.albumRowMeta}>{album.photos.length}장</Text>
          {album.location ? (
            <>
              <Text style={styles.albumRowMetaSep}>  </Text>
              <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.albumRowMeta}>{album.location}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={{ paddingRight: 12 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },

  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3E8FF', zIndex: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  body: { padding: 16 },

  /* 달력 카드 */
  calCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: {
    flex: 1, textAlign: 'center', fontSize: 13,
    fontWeight: '600', color: COLORS.textSecondary, paddingBottom: 8,
  },
  sunday: { color: '#EF4444' },
  saturday: { color: '#3B82F6' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4,
    position: 'relative',
  },
  dayCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleActive: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1.5, borderColor: COLORS.purple,
  },
  dayNum: { fontSize: 15, color: COLORS.text, fontWeight: '400' },
  dayNumActive: { fontSize: 15, color: '#fff', fontWeight: '700' },
  sundayNum: { color: '#EF4444' },
  saturdayNum: { color: '#3B82F6' },
  todayNum: { color: COLORS.purple, fontWeight: '700' },

  /* 앨범 있는 날 점 */
  albumDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: COLORS.pink, marginTop: 2,
  },
  albumDotActive: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#fff', marginTop: 2,
  },

  /* 앨범 섹션 */
  albumSection: { marginBottom: 8 },
  albumSectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12,
  },
  albumSectionCount: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  emptyAlbum: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16, padding: 32,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  emptyAlbumText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  /* 앨범 행 카드 */
  albumRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 18, marginBottom: 10, overflow: 'hidden',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  albumThumb: { width: 72, height: 72, resizeMode: 'cover' },
  albumThumbEmpty: {
    backgroundColor: COLORS.bgPurple,
    alignItems: 'center', justifyContent: 'center',
  },
  albumRowInfo: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  albumRowTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  albumRowMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  albumRowMeta: { fontSize: 12, color: COLORS.textSecondary },
  albumRowMetaSep: { fontSize: 12, color: COLORS.textSecondary },
});
