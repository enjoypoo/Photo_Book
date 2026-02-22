import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Album, Child } from '../types';
import { STORAGE_KEY, CHILDREN_KEY } from '../constants';

// 이미지 최적화 설정
const MAX_DIMENSION = 1920; // 최대 가로/세로 px (이 이하면 리사이즈 안 함)
const COMPRESS_QUALITY = 0.75; // JPEG 압축 품질 (0~1)

// ─── Children ────────────────────────────────────────────────
export async function loadChildren(): Promise<Child[]> {
  try {
    const d = await AsyncStorage.getItem(CHILDREN_KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

export async function saveChildren(children: Child[]): Promise<void> {
  await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
}

export async function upsertChild(child: Child): Promise<void> {
  const list = await loadChildren();
  const idx = list.findIndex(c => c.id === child.id);
  if (idx >= 0) list[idx] = child; else list.push(child);
  await saveChildren(list);
}

export async function deleteChild(id: string): Promise<void> {
  const list = await loadChildren();
  await saveChildren(list.filter(c => c.id !== id));
  // 해당 아이의 앨범도 삭제
  const albums = await loadAlbums();
  const remaining = albums.filter(a => a.childId !== id);
  await saveAlbums(remaining);
}

// ─── Albums ───────────────────────────────────────────────────
export async function loadAlbums(): Promise<Album[]> {
  try {
    const d = await AsyncStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

export async function saveAlbums(albums: Album[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
}

export async function loadAlbumsByChild(childId: string): Promise<Album[]> {
  const all = await loadAlbums();
  return all.filter(a => a.childId === childId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const all = await loadAlbums();
  return all.find(a => a.id === id) ?? null;
}

export async function upsertAlbum(album: Album): Promise<void> {
  const all = await loadAlbums();
  const idx = all.findIndex(a => a.id === album.id);
  if (idx >= 0) all[idx] = album; else all.unshift(album);
  await saveAlbums(all);
}

export async function deleteAlbum(id: string): Promise<void> {
  const all = await loadAlbums();
  // 앨범 삭제 시 사진 파일도 정리 (용량 최소화)
  const album = all.find(a => a.id === id);
  if (album) {
    for (const photo of album.photos) {
      try {
        const info = await FileSystem.getInfoAsync(photo.uri);
        if (info.exists) await FileSystem.deleteAsync(photo.uri, { idempotent: true });
      } catch {}
    }
  }
  await saveAlbums(all.filter(a => a.id !== id));
}

// ─── 이미지 로컬 저장 (리사이즈 + 압축 최적화) ───────────────
// Option A: 1920px 이하로 리사이즈 + JPEG 0.75 압축
// 원본은 갤러리에 그대로 유지, 앱 내 저장본만 최적화
export async function saveImageLocally(uri: string, albumId: string, photoId: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}photos/${albumId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${photoId}.jpg`;

  // 이미 저장된 파일이면 그대로 반환
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) return dest;

  try {
    // 원본 이미지 크기 확인 후 필요한 경우만 리사이즈
    const actions: ImageManipulator.Action[] = [];

    // 이미지 크기를 가져오기 위해 먼저 manipulate 실행 (no-op)
    const probe = await ImageManipulator.manipulateAsync(uri, [], { base64: false });
    const { width, height } = probe;

    // 가로 또는 세로가 MAX_DIMENSION 초과 시 리사이즈
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width >= height) {
        actions.push({ resize: { width: MAX_DIMENSION } });
      } else {
        actions.push({ resize: { height: MAX_DIMENSION } });
      }
    }

    // 리사이즈 + JPEG 압축 저장
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    });

    // manipulator가 생성한 임시 파일을 최종 경로로 이동
    await FileSystem.moveAsync({ from: result.uri, to: dest });
    return dest;
  } catch {
    // 최적화 실패 시 원본 그대로 복사 (fallback)
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
}
