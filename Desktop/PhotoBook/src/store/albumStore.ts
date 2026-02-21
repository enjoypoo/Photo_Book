import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Album, Child } from '../types';
import { STORAGE_KEY, CHILDREN_KEY } from '../constants';

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

// ─── 이미지 로컬 저장 (용량 최적화) ──────────────────────────
export async function saveImageLocally(uri: string, albumId: string, photoId: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}photos/${albumId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${photoId}.jpg`;
  // 이미 저장된 파일이면 그대로 반환
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) return dest;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
