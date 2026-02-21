import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Album } from '../types';
import { COLORS } from '../constants';
import { formatDateKorean } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

interface Props {
  album: Album;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
}

export default function AlbumCard({ album, onPress, onLongPress, selected }: Props) {
  const coverPhoto = album.photos[0];
  const photoCount = album.photos.length;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
      <View style={styles.imageContainer}>
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto.uri }} style={styles.coverImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderIcon}>📷</Text>
          </View>
        )}
        {photoCount > 1 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>+{photoCount - 1}</Text>
          </View>
        )}
        <View style={styles.weatherBadge}>
          <Text style={styles.weatherEmoji}>{album.weatherEmoji || '☀️'}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {album.title || '제목 없음'}
        </Text>
        <Text style={styles.date}>{formatDateKorean(album.date)}</Text>
        {album.location ? (
          <Text style={styles.location} numberOfLines={1}>
            📍 {album.location}
          </Text>
        ) : null}
        {album.story ? (
          <Text style={styles.story} numberOfLines={2}>
            {album.story}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: COLORS.pink,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  countBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  weatherBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weatherEmoji: {
    fontSize: 18,
  },
  info: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: COLORS.purple,
    marginBottom: 4,
  },
  story: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
});
