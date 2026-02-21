export type WeatherType = 'sunny'|'partly_cloudy'|'cloudy'|'rainy'|'snowy'|'windy'|'hot'|'cold'|'other';

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
  takenAt?: string;   // EXIF에서 읽은 촬영 일시 (ISO 8601)
}

export interface Album {
  id: string;
  childId: string;    // 어느 아이의 앨범인지
  title: string;
  date: string;       // YYYY-MM-DD (또는 YYYY-MM-DDTHH:mm:ss 1장일 때)
  dateEnd?: string;   // 여러 장이고 날짜가 다를 때 끝 날짜 YYYY-MM-DD
  location: string;
  weather: WeatherType | '';
  weatherEmoji: string;
  weatherCustom?: string; // '기타' 선택 시 직접 입력한 날씨
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
