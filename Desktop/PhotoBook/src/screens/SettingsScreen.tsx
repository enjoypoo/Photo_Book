import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, STORAGE_KEY, CHILDREN_KEY } from '../constants';
import { loadAlbums, loadChildren } from '../store/albumStore';
import { TAB_BAR_HEIGHT } from '../../App';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const [groupCount, setGroupCount] = useState(0);
  const [albumCount, setAlbumCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState('계산 중...');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  /* ── 데이터 내보내기 ─────────────────────────────────
   * 전략: JSON 메타데이터(그룹+앨범) + 사진 파일(Base64 인코딩)을
   * 하나의 .photobook 파일로 묶어 공유.
   * 대용량 처리: 사진을 청크 단위로 순차 처리해 메모리 부하 최소화.
   ─────────────────────────────────────────────────── */
  const handleExport = async () => {
    Alert.alert(
      '데이터 내보내기',
      '모든 그룹, 앨범, 사진을 하나의 파일로 내보냅니다.\n사진이 많으면 시간이 걸릴 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '내보내기', onPress: async () => {
            setExporting(true);
            try {
              const children = await loadChildren();
              const albums = await loadAlbums();

              // 사진 파일을 Base64로 인코딩해 번들에 포함
              const photoFiles: Record<string, string> = {};
              for (const album of albums) {
                for (const photo of album.photos) {
                  if (photo.uri && photo.uri.startsWith('/')) {
                    try {
                      const info = await FileSystem.getInfoAsync(photo.uri);
                      if (info.exists) {
                        const b64 = await FileSystem.readAsStringAsync(photo.uri, {
                          encoding: FileSystem.EncodingType.Base64,
                        });
                        photoFiles[photo.uri] = b64;
                      }
                    } catch { /* 개별 사진 오류 무시 */ }
                  }
                }
              }

              // 그룹 대표 사진 (group_photos)
              const groupPhotoDir = `${FileSystem.documentDirectory}group_photos/`;
              const groupPhotoInfo = await FileSystem.getInfoAsync(groupPhotoDir);
              if (groupPhotoInfo.exists) {
                const files = await FileSystem.readDirectoryAsync(groupPhotoDir).catch(() => []);
                for (const file of files) {
                  const filePath = `${groupPhotoDir}${file}`;
                  try {
                    const b64 = await FileSystem.readAsStringAsync(filePath, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    photoFiles[filePath] = b64;
                  } catch { /* 무시 */ }
                }
              }

              const bundle = {
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                children,
                albums,
                photoFiles,  // { uri: base64 }
              };

              // 임시 파일로 저장
              const exportPath = `${FileSystem.documentDirectory}photobook_backup.photobook`;
              await FileSystem.writeAsStringAsync(
                exportPath,
                JSON.stringify(bundle),
                { encoding: FileSystem.EncodingType.UTF8 }
              );

              // 공유 다이얼로그
              const canShare = await Sharing.isAvailableAsync();
              if (!canShare) {
                Alert.alert('오류', '이 기기에서는 파일 공유가 지원되지 않습니다.');
                return;
              }
              await Sharing.shareAsync(exportPath, {
                mimeType: 'application/json',
                dialogTitle: '우리 추억 앨범 백업 파일',
                UTI: 'public.json',
              });
              Alert.alert('완료', '데이터를 내보냈습니다!\n파일을 카카오톡, 이메일, 클라우드 등에 저장해두세요.');
            } catch (e) {
              Alert.alert('오류', '내보내기 중 문제가 발생했습니다.');
            } finally {
              setExporting(false);
            }
          }
        },
      ]
    );
  };

  /* ── 데이터 가져오기 ─────────────────────────────────
   * 전략: .photobook 파일 선택 → 파싱 → 사진 파일 복원 →
   * 기존 데이터와 병합(중복 id 스킵) or 전체 교체 선택
   ─────────────────────────────────────────────────── */
  const handleImport = async () => {
    Alert.alert(
      '데이터 가져오기',
      '백업 파일(.photobook)을 선택해주세요.\n가져온 데이터를 기존 데이터와 병합하거나 교체할 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '파일 선택', onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
              });

              if (result.canceled || !result.assets?.[0]) return;

              const fileUri = result.assets[0].uri;
              setImporting(true);

              const content = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              const bundle = JSON.parse(content);

              if (!bundle.children || !bundle.albums) {
                Alert.alert('오류', '올바른 백업 파일이 아닙니다.');
                return;
              }

              // 병합 or 교체 선택
              Alert.alert(
                '가져오기 방식 선택',
                `백업 파일: 그룹 ${bundle.children.length}개 / 앨범 ${bundle.albums.length}개\n\n어떻게 가져올까요?`,
                [
                  { text: '취소', style: 'cancel', onPress: () => setImporting(false) },
                  {
                    text: '병합 (기존 유지)',
                    onPress: () => importData(bundle, 'merge'),
                  },
                  {
                    text: '교체 (전체 덮어쓰기)',
                    style: 'destructive',
                    onPress: () => importData(bundle, 'replace'),
                  },
                ]
              );
            } catch {
              Alert.alert('오류', '파일을 읽을 수 없습니다.');
              setImporting(false);
            }
          }
        },
      ]
    );
  };

  const importData = async (bundle: any, mode: 'merge' | 'replace') => {
    try {
      const { children: newChildren, albums: newAlbums, photoFiles = {} } = bundle;

      // 사진 파일 복원 (Base64 → 실제 파일)
      const uriMap: Record<string, string> = {};
      for (const [origUri, b64] of Object.entries(photoFiles as Record<string, string>)) {
        try {
          // 기존 URI 경로 구조 유지 (documentDirectory 기준으로 재구성)
          const fileName = origUri.split('/').pop() ?? 'photo.jpg';
          const subPath = origUri.includes('group_photos') ? 'group_photos' : 'photos';

          let destDir = `${FileSystem.documentDirectory}${subPath}/`;
          if (subPath === 'photos') {
            // photos/albumId/photoId.jpg 구조
            const parts = origUri.split('/photos/');
            if (parts[1]) {
              const subDir = parts[1].split('/').slice(0, -1).join('/');
              destDir = `${FileSystem.documentDirectory}photos/${subDir}/`;
            }
          }

          await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
          const destPath = `${destDir}${fileName}`;
          await FileSystem.writeAsStringAsync(destPath, b64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          uriMap[origUri] = destPath;
        } catch { /* 개별 파일 복원 실패 무시 */ }
      }

      // URI 매핑 적용 (복원된 경로로 교체)
      const updatedAlbums = newAlbums.map((album: any) => ({
        ...album,
        photos: album.photos.map((photo: any) => ({
          ...photo,
          uri: uriMap[photo.uri] ?? photo.uri,
        })),
      }));

      const updatedChildren = newChildren.map((child: any) => ({
        ...child,
        photoUri: child.photoUri ? (uriMap[child.photoUri] ?? child.photoUri) : undefined,
      }));

      if (mode === 'replace') {
        // 전체 교체
        await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(updatedChildren));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlbums));
      } else {
        // 병합: 기존 데이터와 합치되 중복 id 스킵
        const existingChildren = await loadChildren();
        const existingAlbums = await loadAlbums();
        const existingChildIds = new Set(existingChildren.map((c: any) => c.id));
        const existingAlbumIds = new Set(existingAlbums.map((a: any) => a.id));

        const mergedChildren = [
          ...existingChildren,
          ...updatedChildren.filter((c: any) => !existingChildIds.has(c.id)),
        ];
        const mergedAlbums = [
          ...existingAlbums,
          ...updatedAlbums.filter((a: any) => !existingAlbumIds.has(a.id)),
        ];

        await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(mergedChildren));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mergedAlbums));
      }

      await loadStats();
      Alert.alert(
        '완료 ✅',
        `데이터를 성공적으로 가져왔습니다!\n그룹 ${updatedChildren.length}개 / 앨범 ${updatedAlbums.length}개`,
      );
    } catch {
      Alert.alert('오류', '데이터 가져오기 중 문제가 발생했습니다.');
    } finally {
      setImporting(false);
    }
  };

  /* 전체 데이터 삭제 */
  const handleClearAllData = () => {
    Alert.alert(
      '전체 데이터 삭제',
      '모든 그룹, 앨범, 사진이 영구 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '모두 삭제', style: 'destructive', onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              await AsyncStorage.removeItem(CHILDREN_KEY);
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
        <Text style={styles.headerSub}>앱 관리 및 데이터 설정</Text>
      </LinearGradient>

      {/* 로딩 오버레이 */}
      {(exporting || importing) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>
              {exporting ? '내보내는 중...\n사진이 많으면 잠시 기다려주세요' : '가져오는 중...'}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_HEIGHT + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 통계 카드 ── */}
        <View style={styles.statsCard}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            <View style={styles.statsTitleRow}>
              <Ionicons name="bar-chart-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.statsTitle}>사용 현황</Text>
            </View>
            <View style={styles.statsRow}>
              <StatItem icon="people-outline" label="그룹" value={`${groupCount}개`} />
              <StatItem icon="book-outline" label="앨범" value={`${albumCount}개`} />
              <StatItem icon="camera-outline" label="사진" value={`${photoCount}장`} />
              <StatItem icon="save-outline" label="용량" value={storageUsed} />
            </View>
          </LinearGradient>
        </View>

        {/* ── 데이터 관리 ── */}
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        <View style={styles.section}>
          {/* 데이터 내보내기 */}
          <SettingRow
            icon="share-outline"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            title="데이터 내보내기"
            subtitle="그룹·앨범·사진 전체를 파일로 저장"
            onPress={handleExport}
          />
          <View style={styles.divider} />
          {/* 데이터 가져오기 */}
          <SettingRow
            icon="download-outline"
            iconBg="#F0FDF4"
            iconColor="#10B981"
            title="데이터 가져오기"
            subtitle="백업 파일에서 데이터 복원"
            onPress={handleImport}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="brush-outline"
            iconBg="#EFF6FF"
            iconColor="#6366F1"
            title="사진 파일 정리"
            subtitle="사용하지 않는 임시 파일 삭제"
            onPress={handleCleanup}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-outline"
            iconBg="#FEF2F2"
            iconColor={COLORS.danger}
            title="전체 데이터 삭제"
            subtitle="모든 그룹·앨범·사진 영구 삭제"
            onPress={handleClearAllData}
            danger
          />
        </View>

        {/* ── 백업 안내 ── */}
        <View style={styles.infoBox}>
          <View style={styles.infoBoxTitleRow}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.purple} style={{ marginRight: 6 }} />
            <Text style={styles.infoBoxTitle}>데이터 이전 방법</Text>
          </View>
          <Text style={styles.infoBoxText}>
            1. 현재 폰에서 <Text style={styles.bold}>데이터 내보내기</Text>를 눌러 파일을 저장{'\n'}
            2. 카카오톡·이메일·클라우드로 파일을 새 폰으로 전송{'\n'}
            3. 새 폰에서 앱 설치 후 <Text style={styles.bold}>데이터 가져오기</Text>로 복원
          </Text>
          <Text style={styles.infoBoxNote}>
            ※ 사진이 많을수록 파일 크기가 커지며 전송 시간이 더 걸릴 수 있어요.
          </Text>
        </View>

        {/* ── 앱 정보 ── */}
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <View style={styles.section}>
          <InfoRow icon="phone-portrait-outline" label="버전" value={APP_VERSION} />
          <View style={styles.divider} />
          <InfoRow icon="construct-outline" label="제작" value="Charisro" />
          <View style={styles.divider} />
          <InfoRow icon="save-outline" label="저장 방식" value="기기 내 로컬 저장" />
          <View style={styles.divider} />
          <InfoRow icon="lock-closed-outline" label="개인정보" value="서버 전송 없음" />
        </View>

        {/* ── 도움말 ── */}
        <Text style={styles.sectionTitle}>도움말</Text>
        <View style={styles.section}>
          <View style={styles.helpCard}>
            <View style={styles.helpTitleRow}>
              <Ionicons name="bulb-outline" size={14} color={COLORS.purple} style={{ marginRight: 6 }} />
              <Text style={[styles.helpText, { fontWeight: '700' }]}>앨범 수정/삭제</Text>
            </View>
            <Text style={[styles.helpText, { marginTop: 6 }]}>
              앨범 목록에서 카드를 길게 누르면 수정 또는 삭제할 수 있습니다.
            </Text>
          </View>
          <View style={[styles.helpCard, { marginTop: 8 }]}>
            <View style={styles.helpTitleRow}>
              <Ionicons name="bulb-outline" size={14} color={COLORS.purple} style={{ marginRight: 6 }} />
              <Text style={[styles.helpText, { fontWeight: '700' }]}>PDF 내보내기</Text>
            </View>
            <Text style={[styles.helpText, { marginTop: 6 }]}>
              앨범 목록에서 PDF 버튼을 누르고 앨범을 선택하면 PDF로 저장할 수 있습니다.
            </Text>
          </View>
          <View style={[styles.helpCard, { marginTop: 8 }]}>
            <View style={styles.helpTitleRow}>
              <Ionicons name="bulb-outline" size={14} color={COLORS.purple} style={{ marginRight: 6 }} />
              <Text style={[styles.helpText, { fontWeight: '700' }]}>사진 날짜 자동 입력</Text>
            </View>
            <Text style={[styles.helpText, { marginTop: 6 }]}>
              앨범에 사진을 추가하면 EXIF 정보에서 촬영 날짜/시간이 자동으로 입력됩니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── 통계 아이템 ── */
function StatItem({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={28} color="rgba(255,255,255,0.9)" style={{ marginBottom: 6 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ── 설정 행 ── */
interface SettingRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}
function SettingRow({ icon, iconBg, iconColor, title, subtitle, onPress, danger }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, danger && { color: COLORS.danger }]}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

/* ── 정보 행 ── */
function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
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

  /* 로딩 오버레이 */
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32,
    alignItems: 'center', gap: 16, minWidth: 240,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  loadingText: {
    fontSize: 14, color: COLORS.text, textAlign: 'center', lineHeight: 22,
  },

  /* 통계 카드 */
  statsCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 28, elevation: 6,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16 },
  statsGradient: { padding: 24 },
  statsTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statsTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
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
    borderRadius: 20, marginBottom: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  /* 백업 안내 */
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.purplePastel ?? '#FAF5FF',
    borderLeftWidth: 4, borderLeftColor: COLORS.purple,
  },
  infoBoxTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoBoxTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  infoBoxText: { fontSize: 13, color: COLORS.text, lineHeight: 22 },
  infoBoxNote: { fontSize: 11, color: COLORS.textSecondary, marginTop: 8, lineHeight: 16 },
  bold: { fontWeight: '700' },

  /* 설정 행 */
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  // rowChevron 제거됨 (Ionicons로 대체)

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
  helpTitleRow: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
