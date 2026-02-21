export interface PhotoEntry {
  id: string;
  uri: string;
  caption: string;
}

export interface Album {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  title: string;
  story: string;
  location: string;
  weather: WeatherType;
  weatherEmoji: string;
  photos: PhotoEntry[];
  createdAt: string;
  updatedAt: string;
}

export type WeatherType =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'windy'
  | 'hot'
  | 'cold';

export interface WeatherOption {
  type: WeatherType;
  emoji: string;
  label: string;
}

export type RootStackParamList = {
  Home: undefined;
  AlbumDetail: { albumId: string };
  CreateAlbum: { albumId?: string };
  PhotoDetail: { albumId: string; photoId: string };
  ExportPDF: { albumIds?: string[] };
};
