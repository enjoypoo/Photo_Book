import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_ID } from '../utils/admob';

interface Props {
  style?: object;
}

export default function BannerAdItem({ style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={BANNER_AD_ID}
        size={BannerAdSize.ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 12,
  },
});
