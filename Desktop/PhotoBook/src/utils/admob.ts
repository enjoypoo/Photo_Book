import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

/* ── 광고 단위 ID ──────────────────────────────────────── */
const IS_TEST = __DEV__;

export const BANNER_AD_ID = IS_TEST
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: 'ca-app-pub-7158930697867463/5918271856',
      android: 'ca-app-pub-7158930697867463/3143605130',
    })!;

const REWARDED_AD_ID = IS_TEST
  ? TestIds.REWARDED
  : Platform.select({
      ios: 'ca-app-pub-7158930697867463/9857516860',
      android: 'ca-app-pub-7158930697867463/5865825605',
    })!;

/* ── 보상형 광고 로드 & 표시 ──────────────────────────────
   onComplete: 광고 완료(보상) 또는 광고 닫힘(페이지 이동) 시 호출
   onError   : 광고 로드 실패 시 호출 (광고 없이 바로 진행하도록)
─────────────────────────────────────────────────────── */
export function showRewardedAd(
  onComplete: () => void,
  onError?: () => void,
): void {
  const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  let adClosed = false;

  const unsubscribeLoaded = rewarded.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => {
      rewarded.show();
    },
  );

  const unsubscribeEarned = rewarded.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    () => {
      // 보상 완료 → 광고 닫힐 때 onComplete 호출
      adClosed = true;
    },
  );

  const unsubscribeClosed = rewarded.addAdEventListener(
    AdEventType.CLOSED,
    () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      // 보상 받았거나, 광고 보다가 다른 페이지로 이동 후 돌아온 경우 모두 완료 처리
      onComplete();
    },
  );

  rewarded.addAdEventListener(AdEventType.ERROR, () => {
    unsubscribeLoaded();
    unsubscribeEarned();
    unsubscribeClosed();
    // 광고 로드 실패 → 광고 없이 바로 PDF 생성 진행
    if (onError) onError();
    else onComplete();
  });

  rewarded.load();
}
