export type WeatherType = 'sunny'|'partly_cloudy'|'cloudy'|'rainy'|'snowy'|'windy'|'hot'|'cold'|'other';

export type GroupType = 'parent'|'friend'|'child'|'work'|'club'|'other';

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
  childId: string;    // 어느 그룹의 앨범인지
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
  name: string;           // 그룹명
  emoji: string;          // 대표 이모지 (photoUri 없을 때 표시)
  photoUri?: string;      // 대표 이미지 URI
  color: string;          // 테마 색상
  groupType: GroupType;   // 그룹 구분
  groupTypeCustom?: string; // 기타 구분 직접 입력
  birthDate?: string;     // 생성일(선택)
  createdAt: string;
}

export type FilterType = 'all' | 'date' | 'month' | 'year' | 'location';

export interface SearchFilter {
  type: FilterType;
  value: string;
}

/** 홈 탭 내부 스택 (화면 컴포넌트에서 사용) */
export type RootStackParamList = {
  Home: undefined;
  AlbumList: { childId: string };
  AlbumDetail: { albumId: string; childId: string };
  CreateAlbum: { childId: string; albumId?: string };
  CreateChild: { childId?: string };
  ExportPDF: { albumIds: string[] };
  Settings: undefined;
};
