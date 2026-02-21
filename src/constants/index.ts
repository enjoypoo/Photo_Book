import { WeatherOption } from '../types';

export const COLORS = {
  primary: '#FF6B9D',
  primaryLight: '#FFB3CC',
  primaryDark: '#E05588',
  secondary: '#FFD93D',
  accent: '#6BCB77',
  background: '#FFF5F7',
  card: '#FFFFFF',
  text: '#2D2D2D',
  textSecondary: '#8A8A8A',
  textLight: '#BDBDBD',
  border: '#F0E0E6',
  danger: '#FF4757',
  white: '#FFFFFF',
  shadow: 'rgba(255, 107, 157, 0.15)',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
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
];

export const STORAGE_KEY = '@photobook_albums';
