export type WeatherType = 'sunny'|'partly_cloudy'|'cloudy'|'rainy'|'snowy'|'windy'|'hot'|'cold';

export interface WeatherOption {
  type: WeatherType;
  emoji: string;
  label: string;
}

export interface PhotoEntry {
  id: string;
  uri: string;        // 로컬 파일 경로
  caption: string;
  width?: number;
  height?: number;
}

export interface Album {
  id: string;
  childId: string;    // 어느 아이의 앨범인지
  title: string;
  date: string;       // YYYY-MM-DD
  location: string;
  weather: WeatherType | '';
  weatherEmoji: string;
  story: string;
  photos: PhotoEntry[];
  coverPhotoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  name: string;
  emoji: string;       // 아이 대표 이모지
  color: string;       // 앨범 색상 테마
  birthDate?: string;
  createdAt: string;
}

export type FilterType = 'all' | 'date' | 'month' | 'year' | 'location';

export interface SearchFilter {
  type: FilterType;
  value: string;
}

export type RootStackParamList = {
  Home: undefined;
  AlbumList: { childId: string };
  AlbumDetail: { albumId: string; childId: string };
  CreateAlbum: { childId: string; albumId?: string };
  CreateChild: { childId?: string };
  ExportPDF: { albumIds: string[] };
};
