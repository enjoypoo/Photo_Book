import AsyncStorage from '@react-native-async-storage/async-storage';
import { Album } from '../types';
import { STORAGE_KEY } from '../constants';

export async function loadAlbums(): Promise<Album[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Album[];
  } catch {
    return [];
  }
}

export async function saveAlbums(albums: Album[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const albums = await loadAlbums();
  return albums.find((a) => a.id === id) ?? null;
}

export async function upsertAlbum(album: Album): Promise<void> {
  const albums = await loadAlbums();
  const idx = albums.findIndex((a) => a.id === album.id);
  if (idx >= 0) {
    albums[idx] = album;
  } else {
    albums.unshift(album);
  }
  await saveAlbums(albums);
}

export async function deleteAlbum(id: string): Promise<void> {
  const albums = await loadAlbums();
  await saveAlbums(albums.filter((a) => a.id !== id));
}
