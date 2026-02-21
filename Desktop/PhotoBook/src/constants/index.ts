import { WeatherOption } from '../types';

export const COLORS = {
  gradientStart: '#F472B6',
  gradientEnd: '#C084FC',
  gradientMid: '#A855F7',
  bgPink: '#FDF2F8',
  bgPurple: '#FAF5FF',
  bgBlue: '#EFF6FF',
  card: '#FFFFFF',
  cardTransparent: 'rgba(255,255,255,0.85)',
  inputBg: '#F9FAFB',
  pink: '#EC4899',
  purple: '#A855F7',
  blue: '#3B82F6',
  pinkLight: '#F9A8D4',
  purpleLight: '#D8B4FE',
  pinkPastel: '#FDF2F8',
  purplePastel: '#FAF5FF',
  bluePastel: '#EFF6FF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',
  calendarIcon: '#EC4899',
  locationIcon: '#A855F7',
  weatherIcon: '#60A5FA',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: 'rgba(0,0,0,0.08)',
  borderLight: '#F3F4F6',
};

export const WEATHER_OPTIONS: WeatherOption[] = [
  { type: 'sunny', emoji: '☀️', label: '맑음' },
  { type: 'partly_cloudy', emoji: '⛅', label: '구름 조금' },
  { type: 'cloudy', emoji: '☁️', label: '흐림' },
  { type: 'rainy', emoji: '🌧️', label: '비' },
  { type: 'snowy', emoji: '❄️', label: '눈' },
  { type: 'windy', emoji: '🌬️', label: '바람' },
  { type: 'hot', emoji: '🥵', label: '더움' },
  { type: 'cold', emoji: '🥶', label: '추움' },
  { type: 'other', emoji: '🌡️', label: '기타' },
];

export const STORAGE_KEY = '@photobook_v2_albums';
export const CHILDREN_KEY = '@photobook_v2_children';

export const WEATHER_LABEL: Record<string, string> = {
  sunny: '맑음', partly_cloudy: '구름 조금', cloudy: '흐림',
  rainy: '비', snowy: '눈', windy: '바람', hot: '더움', cold: '추움', other: '기타',
};
