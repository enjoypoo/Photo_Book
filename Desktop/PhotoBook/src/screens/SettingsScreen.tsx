import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ScrollView, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, STORAGE_KEY, CHILDREN_KEY } from '../constants';
import { loadAlbums, loadChildren } from '../store/albumStore';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const [groupCount, setGroupCount] = useState(0);
  const [albumCount, setAlbumCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState('계산 중...');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const children = await loadChildren();
    const albums = await loadAlbums();
    const photos = albums.reduce((sum, a) => sum + a.photos.length, 0);
    setGroupCount(children.length);
    setAlbumCount(albums.length);
    setPhotoCount(photos);
    calcStorageUsed();
  };

  const calcStorageUsed = async () => {
    try {
      if (!FileSystem.documentDirectory) { setStorageUsed('알 수 없음'); return; }
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      const groupDir = `${FileSystem.documentDirectory}group_photos/`;
      let totalBytes = 0;

      const addDirSize = async (dir: string) => {
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) return;
        const items = await FileSystem.readDirectoryAsync(dir).catch(() => []);
        for (const item of items) {
          const itemPath = `${dir}${item}`;
          const itemInfo = await FileSystem.getInfoAsync(itemPath);
          if (itemInfo.exists) {
            if (itemInfo.isDirectory) {
              await addDirSize(itemPath + '/');
            } else {
              totalBytes += (itemInfo as any).size ?? 0;
            }
          }
        }
      };

      await addDirSize(photosDir);
      await addDirSize(groupDir);

      if (totalBytes < 1024) setStorageUsed(`${totalBytes} B`);
      else if (totalBytes < 1024 * 1024) setStorageUsed(`${(totalBytes / 1024).toFixed(1)} KB`);
      else setStorageUsed(`${(totalBytes / (1024 * 1024)).toFixed(1)} MB`);
    } catch {
      setStorageUsed('알 수 없음');
    }
  };

  /* 전체 데이터 삭제 */
  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ 전체 데이터 삭제',
      '모든 그룹, 앨범, 사진이 영구 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '모두 삭제', style: 'destructive', onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              await AsyncStorage.removeItem(CHILDREN_KEY);
              // 이미지 파일 삭제
              if (FileSystem.documentDirectory) {
                const photosDir = `${FileSystem.documentDirectory}photos/`;
                const groupDir = `${FileSystem.documentDirectory}group_photos/`;
                const pi = await FileSystem.getInfoAsync(photosDir);
                if (pi.exists) await FileSystem.deleteAsync(photosDir, { idempotent: true });
                const gi = await FileSystem.getInfoAsync(groupDir);
                if (gi.exists) await FileSystem.deleteAsync(groupDir, { idempotent: true });
              }
              await loadStats();
              Alert.alert('완료', '모든 데이터가 삭제되었습니다.');
            } catch {
              Alert.alert('오류', '데이터 삭제 중 오류가 발생했습니다.');
            }
          }
        },
      ]
    );
  };

  /* 사진 파일 정리 (고아 파일 삭제) */
  const handleCleanup = async () => {
    Alert.alert('사진 파일 정리', '앨범에 없는 사진 파일을 정리할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '정리', onPress: async () => {
          try {
            const albums = await loadAlbums();
            const usedUris = new Set(albums.flatMap(a => a.photos.map(p => p.uri)));
            if (!FileSystem.documentDirectory) return;
            const photosDir = `${FileSystem.documentDirectory}photos/`;
            const pInfo = await FileSystem.getInfoAsync(photosDir);
            if (!pInfo.exists) { Alert.alert('완료', '정리할 파일이 없습니다.'); return; }

            const albumFolders = await FileSystem.readDirectoryAsync(photosDir).catch(() => []);
            let removed = 0;
            for (const folder of albumFolders) {
              const folderPath = `${photosDir}${folder}/`;
              const files = await FileSystem.readDirectoryAsync(folderPath).catch(() => []);
              for (const file of files) {
                const filePath = `${folderPath}${file}`;
                if (!usedUris.has(filePath)) {
                  await FileSystem.deleteAsync(filePath, { idempotent: true });
                  removed++;
                }
              }
            }
            await calcStorageUsed();
            Alert.alert('완료', `${removed}개의 파일을 정리했습니다.`);
          } catch {
            Alert.alert('오류', '파일 정리 중 오류가 발생했습니다.');
          }
        }
      },
    ]);
  };

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
        <Text style={styles.headerTitle}>설정</Text>
        <Text style={styles.headerSub}>앱 관리 및 데이터 설정 ⚙️</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 통계 카드 ── */}
        <View style={styles.statsCard}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            <Text style={styles.statsTitle}>📊 사용 현황</Text>
            <View style={styles.statsRow}>
              <StatItem icon="👥" label="그룹" value={`${groupCount}개`} />
              <StatItem icon="📚" label="앨범" value={`${albumCount}개`} />
              <StatItem icon="📷" label="사진" value={`${photoCount}장`} />
              <StatItem icon="💾" label="용량" value={storageUsed} />
            </View>
          </LinearGradient>
        </View>

        {/* ── 데이터 관리 ── */}
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        <View style={styles.section}>
          <SettingRow
            icon="🧹"
            iconBg="#EFF6FF"
            title="사진 파일 정리"
            subtitle="사용하지 않는 임시 파일 삭제"
            onPress={handleCleanup}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🗑️"
            iconBg="#FEF2F2"
            title="전체 데이터 삭제"
            subtitle="모든 그룹·앨범·사진 영구 삭제"
            onPress={handleClearAllData}
            danger
          />
        </View>

        {/* ── 앱 정보 ── */}
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <View style={styles.section}>
          <InfoRow icon="📱" label="버전" value={APP_VERSION} />
          <View style={styles.divider} />
          <InfoRow icon="🛠️" label="제작" value="PhotoBook App" />
          <View style={styles.divider} />
          <InfoRow icon="💾" label="저장 방식" value="기기 내 로컬 저장" />
          <View style={styles.divider} />
          <InfoRow icon="🔒" label="개인정보" value="서버 전송 없음" />
        </View>

        {/* ── 도움말 ── */}
        <Text style={styles.sectionTitle}>도움말</Text>
        <View style={styles.section}>
          <View style={styles.helpCard}>
            <Text style={styles.helpText}>
              💡 <Text style={{ fontWeight: '700' }}>앨범 수정/삭제</Text>{'\n'}
              앨범 목록에서 카드를 길게 누르면 수정 또는 삭제할 수 있습니다.
            </Text>
          </View>
          <View style={[styles.helpCard, { marginTop: 8 }]}>
            <Text style={styles.helpText}>
              💡 <Text style={{ fontWeight: '700' }}>PDF 내보내기</Text>{'\n'}
              앨범 목록에서 PDF 버튼을 누르고 앨범을 선택하면 PDF로 저장할 수 있습니다.
            </Text>
          </View>
          <View style={[styles.helpCard, { marginTop: 8 }]}>
            <Text style={styles.helpText}>
              💡 <Text style={{ fontWeight: '700' }}>사진 날짜 자동 입력</Text>{'\n'}
              앨범에 사진을 추가하면 EXIF 정보에서 촬영 날짜/시간이 자동으로 입력됩니다.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── 통계 아이템 ── */
function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ── 설정 행 ── */
interface SettingRowProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}
function SettingRow({ icon, iconBg, title, subtitle, onPress, danger }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        <Text style={styles.rowIcon}>{icon}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, danger && { color: COLORS.danger }]}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

/* ── 정보 행 ── */
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },

  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3E8FF', zIndex: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  body: { padding: 20 },

  /* 통계 카드 */
  statsCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 28, elevation: 6,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16 },
  statsGradient: { padding: 24 },
  statsTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  /* 섹션 */
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, paddingLeft: 4,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20, marginBottom: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  /* 설정 행 */
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { fontSize: 22 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rowChevron: { fontSize: 20, color: COLORS.textMuted },

  /* 정보 행 */
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  infoValue: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  /* 도움말 */
  helpCard: {
    margin: 12,
    backgroundColor: '#F9F5FF', borderRadius: 14, padding: 14,
  },
  helpText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
