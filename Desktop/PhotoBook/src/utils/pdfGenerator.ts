import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { Album, PhotoEntry } from '../types';
import { formatDateKorean, formatPhotoDateTime } from './dateUtils';
import { WEATHER_LABEL } from '../constants';

/* ── 타입 ────────────────────────────────────────────── */
export type PageSize = 'A4' | 'A5';
export type LayoutType = 'single' | 'two_col' | 'feature' | 'magazine' | 'three_col' | 'diary';
export type PhotoSizeType = 'small' | 'medium' | 'large';

/** 레이아웃 내 사진이 차지하는 비율 */
const PHOTO_SIZE_FACTOR: Record<PhotoSizeType, number> = {
  small:  0.62,  // 62% — 여백 넉넉
  medium: 0.82,  // 82% — 기본 균형
  large:  1.00,  // 100% — 꽉 채움
};

export type PdfThemeKey =
  | 'modern'    // 무료
  | 'retro'     | 'grid'      | 'baby'
  | 'polaroid'  | 'film'      | 'lined'
  | 'nature'    | 'airmail'   | 'midnight'; // PRO

export interface PdfThemeConfig {
  key: PdfThemeKey;
  label: string;
  isPro: boolean;
  /** 페이지 div의 background CSS (color or gradient or pattern) */
  pageBackground: string;
  /** 사진 프레임 추가 CSS */
  frameStyle: string;
  /** 캡션 텍스트 color */
  captionColor: string;
  /** 캡션 폰트 패밀리 */
  captionFont: string;
  /** 헤더 배경 CSS (없으면 #fff) */
  headerBackground?: string;
  /** 헤더 텍스트 컬러 오버라이드 (없으면 기본) */
  headerTextColor?: string;
  /** 페이지 패딩 오버라이드 (없으면 기본) */
  pagePadding?: string;
}

export const PDF_THEMES: PdfThemeConfig[] = [
  /* ── 1. 베이직 갤러리 (무료 기본) ── */
  {
    key: 'modern',
    label: '베이직 갤러리',
    isPro: false,
    pageBackground: '#FAFAFA',
    frameStyle: 'background:#FFFFFF;padding:10px;border:1px solid #EAEAEA;box-shadow:0 4px 12px rgba(0,0,0,0.05);border-radius:8px;',
    captionColor: '#333333',
    captionFont: "'Helvetica Neue', sans-serif",
  },
  /* ── 2. 데일리 다꾸 (PRO) ── */
  {
    key: 'retro',
    label: '데일리 다꾸',
    isPro: true,
    pageBackground: '#2b3a30',
    pagePadding: '50px',
    frameStyle: 'background:#1a241d;padding:2px;border:3px solid #D4AF37;',
    captionColor: '#E8DCC4',
    captionFont: "Georgia, serif",
    headerBackground: '#1a241d',
    headerTextColor: '#D4AF37',
  },
  /* ── 3. 봉주르 트래블 (PRO) ── */
  {
    key: 'grid',
    label: '봉주르 트래블',
    isPro: true,
    pageBackground: `#FFFFFF`,
    frameStyle: 'background:#FFFFFF;padding:10px;padding-bottom:30px;border:1px solid #DDDDDD;transform:rotate(-1deg);box-shadow:2px 2px 5px rgba(0,0,0,0.1);',
    captionColor: '#555555',
    captionFont: "cursive",
  },
  /* ── 4. 마이 리틀 베이비 (PRO) ── */
  {
    key: 'baby',
    label: '마이 리틀 베이비',
    isPro: true,
    pageBackground: 'radial-gradient(circle at center, #FFFDE7 0%, #FFF9C4 100%)',
    frameStyle: 'background:#FFFFFF;padding:10px;border-radius:20px;box-shadow:0 8px 20px rgba(255,204,128,0.3);border:3px solid #FFF59D;',
    captionColor: '#795548',
    captionFont: "sans-serif",
  },
  /* ── 5. 우리의 사계절 (PRO) ── */
  {
    key: 'polaroid',
    label: '우리의 사계절',
    isPro: true,
    pageBackground: '#EFEFEF',
    pagePadding: '50px',
    frameStyle: 'background:#FFFFFF;padding:15px 15px 55px 15px;box-shadow:0 10px 20px rgba(0,0,0,0.15);',
    captionColor: '#222222',
    captionFont: "cursive",
  },
  /* ── 6. 필름 느와르 (PRO) ── */
  {
    key: 'film',
    label: '필름 느와르',
    isPro: true,
    pageBackground: '#111111',
    frameStyle: 'background:#000000;padding:10px 40px;border:2px solid #333;',
    captionColor: '#F3F3F3',
    captionFont: "'Courier New', monospace",
    headerBackground: '#000000',
    headerTextColor: '#CCCCCC',
  },
  /* ── 7. 감성 카페 투어 (PRO) ── */
  {
    key: 'lined',
    label: '감성 카페 투어',
    isPro: true,
    pageBackground: '#FDFBF7',
    frameStyle: 'background:#FFFFFF;padding:10px;border:1px solid #EAEAEA;transform:rotate(1deg);',
    captionColor: '#4A4A4A',
    captionFont: "sans-serif",
  },
  /* ── 8. 보태니컬 피크닉 (PRO) ── */
  {
    key: 'nature',
    label: '보태니컬 피크닉',
    isPro: true,
    pageBackground: 'linear-gradient(135deg, #F1F8E9 0%, #DCEDC8 100%)',
    frameStyle: 'background:#FFFFFF;padding:8px;border-radius:4px;box-shadow:2px 4px 10px rgba(51,105,30,0.1);',
    captionColor: '#33691E',
    captionFont: "sans-serif",
  },
  /* ── 9. 클래식 헤리티지 (PRO) ── */
  {
    key: 'airmail',
    label: '클래식 헤리티지',
    isPro: true,
    pageBackground: '#FAFAFA',
    pagePadding: '30px',
    frameStyle: 'background:#FFFFFF;padding:5px;border:1px solid #CCCCCC;',
    captionColor: '#111111',
    captionFont: "sans-serif",
  },
  /* ── 10. 연말/연초 결산 (PRO) ── */
  {
    key: 'midnight',
    label: '연말/연초 결산',
    isPro: true,
    pageBackground: '#121212',
    frameStyle: 'background:#1E1E1E;padding:10px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.5);',
    captionColor: '#E0E0E0',
    captionFont: "sans-serif",
    headerBackground: '#1E1E1E',
    headerTextColor: '#E0E0E0',
  },
];

/* ── 용지 크기 (pt 단위, 72dpi 기준) ────────────────── */
const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
};

/* ── 알림 권한 요청 ──────────────────────────────────── */
export async function requestNotificationPermission(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

/* ── 완료 알림 전송 ──────────────────────────────────── */
async function sendCompletionNotification(count: number): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PDF 생성 완료!',
        body: count === 1
          ? 'PDF 1개가 생성되었어요. 확인해보세요!'
          : `PDF ${count}개가 모두 생성되었어요! 확인해보세요!`,
        sound: true,
      },
      trigger: null, // 즉시 발송
    });
  } catch (e) {
    console.warn('알림 전송 실패:', e);
  }
}

/* ── Base64 변환 ─────────────────────────────────────── */
async function imageToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpeg';
    return `data:image/${ext};base64,${base64}`;
  } catch (e) {
    console.warn('imageToBase64 error:', e);
    return '';
  }
}

/* ── camera SVG (사진 없을 때 플레이스홀더) - 단순 도형 조합 ── */
const ICON_CAMERA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <!-- 카메라 본체 -->
  <rect x="2" y="11" width="36" height="24" rx="4" ry="4" fill="none" stroke="#a855f7" stroke-width="2.2"/>
  <!-- 뷰파인더 돌출부 -->
  <rect x="13" y="6" width="14" height="7" rx="3" ry="3" fill="none" stroke="#a855f7" stroke-width="2.2"/>
  <!-- 렌즈 외원 -->
  <circle cx="20" cy="23" r="7" fill="none" stroke="#a855f7" stroke-width="2.2"/>
  <!-- 렌즈 내원 -->
  <circle cx="20" cy="23" r="3.5" fill="#a855f7"/>
  <!-- 플래시 점 -->
  <circle cx="33" cy="17" r="1.8" fill="#a855f7"/>
</svg>`;

/* ── 이미지 태그 (플레이스홀더 포함) ─────────────────── */
function imgSrc(b64: string, cls: string = '', extraStyle: string = ''): string {
  if (b64) return `<img src="${b64}" class="${cls}" style="${extraStyle}" />`;
  return `<div class="${cls}" style="background:#f3e8ff;display:flex;align-items:center;justify-content:center;${extraStyle}">${ICON_CAMERA_SVG}</div>`;
}

/* ── 기본 테마색 ─────────────────────────────────────── */
const DEFAULT_THEME = '#a855f7'; // 보라 (테마색 없을 때 폴백)

/* ── 16진수 색상 → RGB 분해 ──────────────────────────── */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(hex.trim());
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s[0]+s[0]+s[1]+s[1]+s[2]+s[2];
  if (s.length !== 6) return null;
  return { r: parseInt(s.slice(0,2),16), g: parseInt(s.slice(2,4),16), b: parseInt(s.slice(4,6),16) };
}

/* ── 테마색 → 연한 배경색 (opacity 12%) ─────────────── */
function lightBg(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#faf5ff';
  return `rgba(${rgb.r},${rgb.g},${rgb.b},0.10)`;
}

/* ── 티켓용 날짜 포맷: yyyy.mm.dd.(요일) ───────────────── */
function formatDateDot(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}.(${days[d.getDay()]})`;
}

/* ── 인라인 SVG 아이콘 - 단순 도형 기반 (expo-print 호환) ── */

// 달력 아이콘: rect 본체 + 날짜 점들
function svgCalendar(size: number, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20"
    style="display:inline-block;vertical-align:middle;margin-right:3px;flex-shrink:0;">
    <rect x="1" y="3" width="18" height="15" rx="2" fill="none" stroke="${color}" stroke-width="1.4"/>
    <line x1="1" y1="7" x2="19" y2="7" stroke="${color}" stroke-width="1.4"/>
    <line x1="6" y1="1" x2="6" y2="5" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="14" y1="1" x2="14" y2="5" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="6" cy="11" r="1" fill="${color}"/>
    <circle cx="10" cy="11" r="1" fill="${color}"/>
    <circle cx="14" cy="11" r="1" fill="${color}"/>
    <circle cx="6" cy="15" r="1" fill="${color}"/>
    <circle cx="10" cy="15" r="1" fill="${color}"/>
  </svg>`;
}

// 위치 아이콘: 물방울 형태 = 원 + 삼각형
function svgLocation(size: number, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20"
    style="display:inline-block;vertical-align:middle;margin-right:3px;flex-shrink:0;">
    <circle cx="10" cy="7.5" r="5.5" fill="none" stroke="${color}" stroke-width="1.4"/>
    <circle cx="10" cy="7.5" r="2" fill="${color}"/>
    <polygon points="10,19 5.5,11 14.5,11" fill="${color}"/>
  </svg>`;
}

// 이미지 아이콘: rect + 원(렌즈)
function svgImages(size: number, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20"
    style="display:inline-block;vertical-align:middle;margin-right:3px;flex-shrink:0;">
    <rect x="1" y="4" width="16" height="13" rx="2" fill="none" stroke="${color}" stroke-width="1.4"/>
    <rect x="4" y="1" width="8" height="5" rx="1.5" fill="none" stroke="${color}" stroke-width="1.2"/>
    <circle cx="9" cy="11" r="3.5" fill="none" stroke="${color}" stroke-width="1.4"/>
    <circle cx="9" cy="11" r="1.5" fill="${color}"/>
  </svg>`;
}

/* ── 페이지 헤더 HTML (매 페이지마다 직접 삽입) ────────
   position:fixed 대신 각 페이지 div 상단에 직접 포함시켜
   모든 페이지에 헤더가 확실히 나오게 함
──────────────────────────────────────────────────── */
function pageHeaderHtml(
  title: string,
  photoCount: number,
  dateStr: string,
  location: string,
  weatherStr: string,
  titleSize: number,
  metaSize: number,
  paddingS: number,
  paddingH: number,
  themeColor: string,
): string {
  const countSize = titleSize + 2;
  const iconSize = metaSize + 2;
  const titleColor = themeColor;
  const metaColor  = themeColor + 'bb';
  return `
    <div style="
      position:relative;z-index:10;
      padding:${paddingH}px ${paddingS}px ${paddingH}px ${paddingS}px;
      border-bottom:3px solid ${themeColor};
      display:flex;align-items:stretch;">
      <!-- 왼쪽: 행1(앨범명) + 행2(날짜·위치·날씨) -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="font-size:${titleSize}px;font-weight:800;color:${titleColor};
          text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">
          ${title}
        </div>
        <div style="font-size:${metaSize}px;color:${metaColor};text-align:left;display:flex;align-items:center;flex-wrap:wrap;gap:6px;">
          <span style="display:inline-flex;align-items:center;">
            ${svgCalendar(iconSize, metaColor)}${dateStr}
          </span>
          ${location ? `<span style="display:inline-flex;align-items:center;">
            ${svgLocation(iconSize, metaColor)}${location}
          </span>` : ''}
          ${weatherStr ? `<span>${weatherStr}</span>` : ''}
        </div>
      </div>
      <!-- 오른쪽: 사진 장수 -->
      <div style="
        margin-left:${paddingH}px;
        display:flex;align-items:center;justify-content:center;
        background:${themeColor}1a;
        border-radius:8px;
        padding:0 10px;
        white-space:nowrap;">
        <span style="display:inline-flex;align-items:center;font-size:${countSize}px;font-weight:900;color:${themeColor};">
          ${svgImages(countSize + 2, themeColor)}${photoCount}장
        </span>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════
   사진 스타일 CSS 생성 (10가지 레이아웃 디자인)
   isA5 / sizeScale(0.62~1.00) 에 따라 크기 조정
══════════════════════════════════════════════════════ */
function buildPhotoStylesCss(isA5: boolean, sizeScale: number, paddingS: number, photoSize: PhotoSizeType = 'medium'): string {
  // photoSize별 이미지 최대/고정 높이
  // medium: 2장이 페이지에 꽉 차도록 역산 (프레임 오버헤드: margin14+pad49 = 63px)
  //   A5 firstH=540: (540-2*33)/2=207px  A4: 296px
  const maxImgH = photoSize === 'large'  ? (isA5 ? 400 : 570)
                : photoSize === 'small'  ? (isA5 ? 100 : 140)
                : /* medium */             (isA5 ? 207 : 296);
  // 폴라로이드 img 절대 max-width (80% of page): 가로 사진 너비 상한
  const maxPolW = Math.round((isA5 ? 420 : 595) * 0.78);
  // hasStory=true 일 때 1페이지 첫 사진 이미지 최대 높이 (story 공간 제외한 여유분)
  const firstPageImgH = isA5 ? 180 : 275;
  // large: 자연비율(height:auto, max-height 캡)  /  medium·small: 고정 높이 + contain (짤림 없음)
  const imgStyle = photoSize === 'large'
    ? `width:100%; height:auto; max-height:${maxImgH}px; display:block;`
    : `width:100%; height:${maxImgH}px; object-fit:contain; display:block;`;
  const avoidBreak = 'page-break-inside:avoid;break-inside:avoid;';
  const archH  = Math.round((isA5 ? 270 : 390) * sizeScale);
  const archW  = Math.round((isA5 ? 195 : 278) * sizeScale);
  const cinH   = Math.round((isA5 ? 195 : 285) * sizeScale);
  const cutH   = Math.round((isA5 ?  88 : 125) * sizeScale);
  const tickH  = Math.round((isA5 ? 145 : 210) * sizeScale);
  const overH  = Math.round((isA5 ? 270 : 390) * sizeScale);
  const overPhH = Math.round(overH * 0.56); // 각 사진 높이: 모서리만 겹치도록 56% (2×56%-100%=12% 겹침)
  const circS  = Math.round((isA5 ? 175 : 250) * sizeScale);
  const fullH  = Math.round((isA5 ? 255 : 370) * sizeScale);
  // sizeScale 비례 적용: large=46px, medium=38px, small=29px → 1장 크게와 비슷한 상하좌우 여백 비율 유지
  const pBot   = photoSize === 'small' ? 14 : Math.round(46 * sizeScale);
  const tapeT  = Math.round(27 * sizeScale);
  const tapeW  = Math.round(88 * sizeScale);
  const tapeHt = Math.round(21 * sizeScale);
  const cuts4W = Math.round(165 * sizeScale);
  const fs = (a: number, b: number) => `${isA5 ? a : b}px`;

  return `
    /* ─ Polaroid ─ */
    /* display:inline-block → 컨테이너가 사진 크기에 맞게 수축 (세로·가로 모두 letterbox 없음) */
    .s-polaroid { display:inline-block; background:#fff; padding:1px; margin:14px auto;
      max-width:80%; vertical-align:top;
      box-shadow:0 8px 20px rgba(0,0,0,0.12);
      border:4px solid transparent; overflow:hidden; ${avoidBreak} }
    /* max-width(px)+max-height(px)+width:auto+height:auto → WebKit constraint-rectangle 알고리즘으로
       두 제약 중 더 타이트한 쪽 기준으로 비율 유지 축소 (세로 사진 비율 보존) */
    .s-polaroid img { max-width:${maxPolW}px; max-height:${maxImgH}px; width:auto; height:auto; display:block; }
    .s-polaroid .s-cap { text-align:center; padding:8px 10px 8px 10px;
      font-size:${fs(12,15)}; font-weight:bold; color:#333; font-family:cursive; }
    /* 이야기 있는 1페이지 첫 사진: 남은 공간에 맞게 높이 축소 */
    .s-pg-first-1 img { max-height:${firstPageImgH}px !important; }

    /* ─ Tape ─ */
    .s-tape { position:relative; width:80%; margin:14px auto; background:#fffaf0;
      padding:${tapeT}px 14px 14px 14px; ${avoidBreak} }
    .s-tape img { ${imgStyle} box-shadow:2px 2px 8px rgba(0,0,0,0.15); transform:rotate(1deg); }
    .s-tape::before { content:''; position:absolute; top:8px; left:50%;
      transform:translateX(-50%) rotate(-3deg); width:${tapeW}px; height:${tapeHt}px;
      background-color:var(--tape-color, rgba(255,218,118,0.82));
      box-shadow:1px 1px 2px rgba(0,0,0,0.1); z-index:10; }
    .s-tape .s-cap { text-align:right; margin-top:9px; font-family:cursive; color:#555; font-size:${fs(11,13)}; }

    /* ─ Arch ─ */
    .s-arch { text-align:center; margin:18px 0; ${avoidBreak} }
    .s-arch img { width:${archW}px; height:${archH}px; object-fit:contain;
      border-radius:${Math.round(archW/2)}px ${Math.round(archW/2)}px 0 0;
      box-shadow:0 15px 30px rgba(0,0,0,0.1); display:inline-block; }
    .s-arch .s-cap { font-size:${fs(13,20)}; font-weight:bold; margin-top:11px; letter-spacing:2px; color:var(--cap-color,#333); }

    /* ─ Cinema ─ (레터박스: 좌우 패딩 상쇄로 페이지 전체 너비 풀블리드) */
    .s-cinema { background-color:#111; color:#fff; padding:${Math.round(26*sizeScale)}px 0;
      text-align:center; margin:10px -${paddingS}px; ${avoidBreak} }
    .s-cinema img { width:100%; height:auto; display:block;
      border-top:2px solid #333; border-bottom:2px solid #333; }
    .s-cinema .s-cap { font-family:serif; font-style:italic; margin-top:11px;
      font-size:${fs(12,18)}; color:#ddd; }

    /* ─ Split ─ */
    .s-split { display:flex; align-items:stretch; background:#f9f9f9;
      border:1px solid #eee; margin:11px 0; }
    .s-split .s-ib { width:50%; }
    .s-split .s-ib img { width:100%; height:100%; object-fit:contain; display:block; }
    .s-split .s-tb { width:50%; padding:${Math.round(15*sizeScale)}px; display:flex; flex-direction:column; justify-content:center; }
    .s-split .s-date { color:#888; font-size:${fs(9,11)}; margin-bottom:6px; }
    .s-split .s-cap { font-size:${fs(12,18)}; line-height:1.6; font-weight:bold; color:#333; }

    /* ─ 4cuts ─ */
    .s-4cuts { width:${cuts4W}px; background:#1a1a1a; padding:9px 9px ${Math.round(34*sizeScale)}px 9px;
      border-radius:5px; box-shadow:5px 5px 14px rgba(0,0,0,0.32);
      transform:var(--cuts-rot, rotate(-2deg)); }
    /* ─ 4cuts 2개 나란히 배치 ─ */
    .s-4cuts-pair { display:flex; justify-content:center; align-items:flex-start;
      gap:${Math.round(12*sizeScale)}px; margin:${Math.round(20*sizeScale)}px 0; }
    .s-4cuts img { width:100%; height:${cutH}px; object-fit:contain;
      margin-bottom:6px; border:2px solid #333; border-radius:2px; display:block; }
    .s-4cuts .s-cap { color:#fff; text-align:center; font-family:monospace;
      font-size:${fs(10,14)}; letter-spacing:3px; }

    /* ─ Ticket ─ */
    .s-ticket { display:flex; width:90%; margin:15px auto; background:#fff;
      border:2px solid #222; border-radius:12px; overflow:hidden;
      box-shadow:0 7px 15px rgba(0,0,0,0.1); ${avoidBreak} }
    .s-ticket .s-ib { width:65%; border-right:3px dashed #222; }
    .s-ticket .s-ib img { width:100%; height:auto; display:block; }
    .s-ticket .s-info { width:35%; padding:13px; background:#fafafa;
      display:flex; flex-direction:column; justify-content:center; }
    .s-ticket .s-lbl { font-size:${fs(8,12)}; color:#d32f2f; font-weight:bold;
      text-transform:uppercase; margin-bottom:3px; }
    .s-ticket .s-dest { font-size:${fs(13,24)}; font-weight:bold; margin-bottom:8px; }
    .s-ticket .s-barcode { display:block; overflow:hidden;
      margin-top:${Math.round(8*sizeScale)}px; }
    /* ─ Ticket (사진 우측 배치 변형) ─ */
    .s-ticket-r { flex-direction:row-reverse; }
    .s-ticket-r .s-ib { border-right:none; border-left:3px dashed #222; }

    /* ─ Overlap ─ (좌상단·우하단 대각 배치, 모서리만 겹침) */
    .s-overlap { position:relative; height:${overH}px; margin:11px 0;
      background:#f0f4f8; border-radius:8px; overflow:hidden; }
    .s-overlap img { position:absolute; border:8px solid #fff;
      box-shadow:0 8px 16px rgba(0,0,0,0.15); object-fit:contain; }
    .s-overlap .s-i1 { width:62%; height:${overPhH}px; top:0; left:0; transform:rotate(-3deg); z-index:1; }
    .s-overlap .s-i2 { width:62%; height:${overPhH}px; bottom:0; right:0; transform:rotate(3deg); z-index:2; }
    .s-overlap .s-cap { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      background:rgba(255,255,255,0.9); padding:5px 12px; font-weight:bold;
      border-radius:14px; z-index:3; font-size:${fs(11,13)}; white-space:nowrap; }

    /* ─ Circle ─ */
    .s-circle { text-align:center; margin:24px 0; ${avoidBreak} }
    .s-circle img { width:${circS}px; height:${circS}px; object-fit:contain;
      border-radius:50%; border:${Math.round(8*sizeScale)}px solid var(--cir-brd, #ffe0e0);
      box-shadow:0 10px 20px rgba(255,224,224,0.85); display:inline-block; }
    .s-circle .s-cap { font-size:${fs(14,22)}; font-weight:bold; color:#d86c6c; margin-top:12px; }

    /* ─ Receipt ─ (하단 지그재그 패턴) */
    .s-receipt { width:${isA5 ? '60' : '55'}%; margin:15px auto; background:#fff;
      padding:15px 15px ${Math.round(40*sizeScale)}px 15px;
      box-shadow:0 4px 10px rgba(0,0,0,0.05);
      background-image:radial-gradient(circle at 10px 0px, transparent 10px, #fff 11px);
      background-size:20px 20px; background-position:bottom; background-repeat:repeat-x; ${avoidBreak} }
    .s-receipt img { ${imgStyle} filter:grayscale(20%); }
    .s-receipt .s-cap { text-align:center; font-family:monospace; font-size:${fs(10,16)};
      margin-top:11px; border-top:1px dashed #ccc; padding-top:10px; color:#333; }

    /* ─ Fullbleed ─ */
    .s-fullbleed { position:relative; height:${fullH}px; margin:11px 0;
      border-radius:8px; overflow:hidden; box-shadow:0 8px 20px rgba(0,0,0,0.22); }
    .s-fullbleed img { width:100%; height:100%; object-fit:contain;
      filter:brightness(0.62); display:block; }
    .s-fullbleed .s-ov { position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%); color:#fff; text-align:center; width:80%; }
    .s-fullbleed .s-ov-t { font-size:${fs(18,30)}; margin:0 0 8px 0;
      border-bottom:2px solid #fff; padding-bottom:8px; display:inline-block; }
    .s-fullbleed .s-ov-d { font-size:${fs(11,16)}; margin-top:6px;
      line-height:1.8; text-shadow:1px 1px 3px rgba(0,0,0,0.8); }

    /* ─ 소형 사이즈 2×2 그리드 ─ */
    .s-pg-small { display:grid; grid-template-columns:1fr 1fr; align-items:start;
      gap:${Math.round(8*sizeScale)}px; }
    /* 시네마 네거티브 마진 상쇄 */
    .s-pg-small .s-cinema { margin-left:0 !important; margin-right:0 !important; }
  `;
}

/* ── 스타일별 렌더 함수 (캡션 없으면 div 자체를 출력 안 함) ────── */
const cap = (text: string, cls = 's-cap', style = '') =>
  text ? `<div class="${cls}"${style ? ` style="${style}"` : ''}>${text}</div>` : '';

const rPolaroid = (img: string, text: string, borderColor = 'transparent', takenAt?: string): string => {
  const sign = Math.random() < 0.5 ? -1 : 1;
  const deg  = (0.5 + Math.random() * 1.0).toFixed(2); // 0.5 ~ 1.5도
  const dateHtml = takenAt
    ? `<div style="text-align:right;padding:3px 8px 0;font-size:8px;color:#999;font-family:monospace;letter-spacing:0.2px;">${formatPhotoDateTime(takenAt)}</div>`
    : '';
  return `<div class="s-polaroid" style="transform:rotate(${sign < 0 ? '-' : ''}${deg}deg);border-color:${borderColor};">${imgSrc(img,'','')}${dateHtml}${cap(text)}</div>`;
};

const rTape = (img: string, text: string, tapeColor = 'rgba(255,218,118,0.82)') =>
  `<div class="s-tape" style="--tape-color:${tapeColor};">${imgSrc(img,'','width:100%;display:block;')}${cap(text)}</div>`;

const rArch = (img: string, text: string) =>
  `<div class="s-arch">${imgSrc(img,'','display:inline-block;')}${cap(text)}</div>`;

const rCinema = (img: string, text: string) =>
  `<div class="s-cinema">${imgSrc(img,'','width:100%;display:block;')}${cap(text)}</div>`;

const rSplit = (img: string, text: string, date: string) =>
  `<div class="s-split"><div class="s-ib">${imgSrc(img,'','width:100%;display:block;')}</div><div class="s-tb"><div class="s-date">${date}</div>${cap(text)}</div></div>`;

/* ── 바코드 HTML (굵기 다른 막대, barcodeH px 높이) ─────── */
function makeBarcodeHtml(barcodeH: number): string {
  // 막대(짝수 인덱스) · 간격(홀수 인덱스) 교대; 값 × 2px = 실제 너비
  const pattern = [2,1,1,1,3,1,2,1,1,2,3,1,1,1,2,1,3,1,1,2,2,1,3,1,1,2,1,1,3,1,2,1,1,1,2,1];
  const spans = pattern.map((w, idx) =>
    `<span style="display:inline-block;width:${w * 2}px;height:${barcodeH}px;` +
    `background:${idx % 2 === 0 ? '#333' : 'transparent'};vertical-align:top;"></span>`
  ).join('');
  return `<div style="display:block;line-height:0;overflow:hidden;">${spans}</div>`;
}

const rTicket = (img: string, dest: string, date: string, isRight = false, barcodeH = 36) =>
  `<div class="${isRight ? 's-ticket s-ticket-r' : 's-ticket'}"><div class="s-ib">${imgSrc(img,'','width:100%;display:block;')}</div><div class="s-info"><div class="s-lbl">Destination</div><div class="s-dest">${dest}</div><div class="s-lbl">Date</div><div style="font-weight:bold;font-size:10px;white-space:nowrap;overflow:hidden;">${date}</div><div class="s-barcode">${makeBarcodeHtml(barcodeH)}</div></div></div>`;

const rCircle = (img: string, text: string, borderColor = '#ffe0e0') =>
  `<div class="s-circle" style="--cir-brd:${borderColor};">${imgSrc(img,'','display:inline-block;')}<div class="s-cap">${text}</div></div>`;

const rReceipt = (img: string, date: string, item: string) =>
  `<div class="s-receipt">${imgSrc(img,'','width:100%;display:block;')}<div class="s-cap">DATE: ${date}<br/>ITEM: ${item}<br/>TOTAL: 100% HAPPY ♡</div></div>`;

const rFullbleed = (img: string, title: string, desc: string) =>
  `<div class="s-fullbleed">${imgSrc(img,'','width:100%;height:100%;display:block;')}<div class="s-ov"><div class="s-ov-t">${title}</div><div class="s-ov-d">${desc}</div></div></div>`;

const rOverlap = (img1: string, img2: string, text: string) =>
  `<div class="s-overlap">${imgSrc(img1,'s-i1','')}${imgSrc(img2,'s-i2','')}<div class="s-cap">${text}</div></div>`;

const r4Cuts = (i1: string, i2: string, i3: string, i4: string, text: string, rot = 'rotate(-2deg)') =>
  `<div class="s-4cuts" style="--cuts-rot:${rot};">${[i1,i2,i3,i4].map(i=>imgSrc(i,'','width:100%;display:block;')).join('')}<div class="s-cap">${text}</div></div>`;

/* ── 색상 팔레트 & 셔플 덱 ─────────────────────────────
   각 스타일마다 11가지 색을 셔플해 1번씩 순서대로 사용,
   모두 사용하면 재셔플 → 동일 색 연속 방지
──────────────────────────────────────────────────── */
const ACCENT_COLORS = [
  '#1a1a1a', '#2563eb', '#dc2626', '#ec4899', '#eab308',
  '#7c3aed', '#92400e', '#7dd3fc', '#c4b5fd', '#9ca3af', '#f97316',
];
const TAPE_COLORS = [
  'rgba(80,80,80,0.70)',    'rgba(37,99,235,0.65)',  'rgba(220,38,38,0.65)',
  'rgba(236,72,153,0.70)',  'rgba(234,179,8,0.80)',  'rgba(124,58,237,0.65)',
  'rgba(120,53,15,0.65)',   'rgba(125,211,252,0.75)','rgba(196,181,253,0.75)',
  'rgba(156,163,175,0.70)', 'rgba(249,115,22,0.70)',
];
function shuffleDeck<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════
   photoSize 기반 사진 그룹화
   large : 1장씩 page-break, 중앙 정렬
   medium: 2장씩 page-break
   small : 4장씩 2×2 그리드 page-break
══════════════════════════════════════════════════════ */
function groupPhotoItems(
  items: string[],
  photoSize: PhotoSizeType,
  isA5: boolean,
  startsOnNewPage: boolean = false,
  hasStory: boolean = false,
): string {
  if (items.length === 0) return '';
  const pb  = 'page-break-before:always;break-before:page;';
  const avd = 'page-break-inside:avoid;break-inside:avoid;';
  const firstH = isA5 ? 540 : 772;  // 1페이지 table 높이 (스토리 없을 때)
  const laterH = isA5 ? 532 : 760;  // 2페이지+ table 높이 (hdr 주입 공간 포함)

  /* ─── hasStory: 1페이지에 사진 1장 고정 + 나머지 정상 그룹화 ─── */
  if (hasStory) {
    const [firstItem, ...rest] = items;
    // 첫 사진: s-pg-first-1 클래스로 감싸 max-height 축소 CSS 적용 (story 공간 확보)
    let html = `<div class="s-pg-first-1" style="${avd}text-align:center;">${firstItem}</div>`;
    const n = photoSize === 'large' ? 1 : photoSize === 'medium' ? 2 : 4;
    if (photoSize === 'small') {
      for (let i = 0; i < rest.length; i += n) {
        html += `<div class="s-pg-small" data-newpage="1" style="${pb}${avd}">${rest.slice(i, i + n).join('')}</div>`;
      }
    } else {
      for (let i = 0; i < rest.length; i += n) {
        const chunk = rest.slice(i, i + n).join('');
        html += `<div data-newpage="1" style="${pb}${avd}">` +
          `<div style="display:table;width:100%;height:${laterH}px;">` +
          `<div style="display:table-cell;vertical-align:top;text-align:center;">${chunk}</div>` +
          `</div></div>`;
      }
    }
    return html;
  }

  /* ─── 스토리 없음: 기존 정상 그룹화 ─── */
  const isFirst = (i: number) => !startsOnNewPage && i === 0;

  if (photoSize === 'large') {
    return items.map((item, i) =>
      `<div${isFirst(i) ? '' : ' data-newpage="1"'} style="${isFirst(i) ? '' : pb}${avd}">` +
      `<div style="display:table;width:100%;height:${isFirst(i) ? firstH : laterH}px;">` +
      `<div style="display:table-cell;vertical-align:top;text-align:center;">${item}</div>` +
      `</div></div>`
    ).join('');
  }

  const n = photoSize === 'medium' ? 2 : 4;
  const chunks: string[] = [];
  for (let i = 0; i < items.length; i += n) {
    chunks.push(items.slice(i, i + n).join(''));
  }

  if (photoSize === 'medium') {
    return chunks.map((chunk, i) =>
      `<div${isFirst(i) ? '' : ' data-newpage="1"'} style="${isFirst(i) ? '' : pb}${avd}">` +
      `<div style="display:table;width:100%;height:${isFirst(i) ? firstH : laterH}px;">` +
      `<div style="display:table-cell;vertical-align:top;text-align:center;">${chunk}</div>` +
      `</div></div>`
    ).join('');
  }

  // small: 2×2 그리드
  return chunks.map((chunk, i) =>
    `<div class="s-pg-small"${isFirst(i) ? '' : ' data-newpage="1"'} style="${isFirst(i) ? '' : pb}${avd}">${chunk}</div>`
  ).join('');
}

/* ══════════════════════════════════════════════════════
   테마별 사진 렌더링 알고리즘
   themeId 1~10 = PDF_THEMES 배열 순서
   각 테마는 1가지 시그니처 스타일만 사용 (혼합 없음)
══════════════════════════════════════════════════════ */
function renderThemePhotos(
  photos: { base64: string; caption: string; takenAt?: string }[],
  themeId: number,
  albumTitle: string,
  dateStr: string,
  ticketDateStr: string,
  isA5: boolean,
  sizeScale: number,
  photoSize: PhotoSizeType,
  startsOnNewPage: boolean = false,
  hasStory: boolean = false,
): string {
  // ── 각 스타일별 셔플 덱 (11색 전부 1번씩 사용 후 재셔플) ──
  let polDeck = shuffleDeck(ACCENT_COLORS), polIdx = 0;
  const nextPolColor = () => {
    if (polIdx >= polDeck.length) { polDeck = shuffleDeck(ACCENT_COLORS); polIdx = 0; }
    return polDeck[polIdx++];
  };
  let tapeDeck = shuffleDeck(TAPE_COLORS), tapeIdx = 0;
  const nextTapeColor = () => {
    if (tapeIdx >= tapeDeck.length) { tapeDeck = shuffleDeck(TAPE_COLORS); tapeIdx = 0; }
    return tapeDeck[tapeIdx++];
  };
  let cirDeck = shuffleDeck(ACCENT_COLORS), cirIdx = 0;
  const nextCirColor = () => {
    if (cirIdx >= cirDeck.length) { cirDeck = shuffleDeck(ACCENT_COLORS); cirIdx = 0; }
    return cirDeck[cirIdx++];
  };
  let ticketRight = false;
  const barcodeH = Math.round((isA5 ? 36 : 52) * sizeScale);

  // ── Theme 10 (4cuts): 기존 특수 렌더링 유지 (photoSize 그룹화 제외) ──
  if (themeId === 10) {
    let html = '';
    const groups: [string, string, string, string][] = [];
    for (let j = 0; j + 4 <= photos.length; j += 4) {
      groups.push([photos[j].base64, photos[j+1].base64, photos[j+2].base64, photos[j+3].base64]);
    }
    for (let g = 0; g < groups.length; g += 2) {
      const c1 = r4Cuts(groups[g][0], groups[g][1], groups[g][2], groups[g][3], 'Season Review', 'rotate(-2deg)');
      if (g + 1 < groups.length) {
        const c2 = r4Cuts(groups[g+1][0], groups[g+1][1], groups[g+1][2], groups[g+1][3], 'Season Review', 'rotate(2deg)');
        html += `<div class="s-4cuts-pair">${c1}${c2}</div>`;
      } else {
        // 홀수 마지막 → 단독 중앙 배치
        html += `<div class="s-4cuts-pair">${c1}</div>`;
      }
    }
    return html;
  }

  // ── 기타 테마: 아이템별 렌더링 → photoSize 기반 그룹화 ──
  const items: string[] = [];

  for (let i = 0; i < photos.length; i++) {
    const { base64: src, caption: capText, takenAt } = photos[i];
    let item = '';

    switch (themeId) {
      /* 1. 베이직 갤러리 → 폴라로이드 (랜덤 테두리색) */
      case 1: item = rPolaroid(src, capText, nextPolColor(), takenAt); break;

      /* 2. 데일리 다꾸 → 마스킹 테이프 (랜덤 테이프색) */
      case 2: item = rTape(src, capText, nextTapeColor()); break;

      /* 3. 봉주르 트래블 → 보딩패스 티켓 (좌우 교대, 점형 날짜) */
      case 3:
        item = rTicket(src, capText || albumTitle, ticketDateStr, ticketRight, barcodeH);
        ticketRight = !ticketRight;
        break;

      /* 4. 마이 리틀 베이비 → 원형 프레임 (랜덤 테두리색) */
      case 4: item = rCircle(src, capText || albumTitle, nextCirColor()); break;

      /* 5. 우리의 사계절 → 아치형 */
      case 5: item = rArch(src, capText); break;

      /* 6. 필름 느와르 → 시네마틱 레터박스 */
      case 6: item = rCinema(src, capText); break;

      /* 7. 감성 카페 투어 → 영수증 */
      case 7: item = rReceipt(src, dateStr, capText || albumTitle); break;

      /* 8. 보태니컬 피크닉 → 폴라로이드 (랜덤 테두리색) */
      case 8: item = rPolaroid(src, capText, nextPolColor(), takenAt); break;

      /* 9. 클래식 헤리티지 → 풀스크린 오버레이 */
      case 9: item = rFullbleed(src, albumTitle, capText); break;

      default: item = rPolaroid(src, capText, nextPolColor(), takenAt);
    }

    items.push(item);
  }

  return groupPhotoItems(items, photoSize, isA5, startsOnNewPage, hasStory);
}


/* ── 파일명 안전하게 변환 ────────────────────────────── */
function safeFileName(title: string, themeLabel: string, now: Date): string {
  const safe  = title.replace(/[\\/:*?"<>|\s]/g, '').trim() || '앨범';
  const theme = themeLabel.replace(/[\\/:*?"<>|\s\/]/g, '').trim();
  const pad   = (n: number) => String(n).padStart(2, '0');
  const ts    = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${safe}_${theme}_${ts}`;
}

/* ══════════════════════════════════════════════════════
   일기형 레이아웃 — 상단 사진(1~6장) + 하단 일기 텍스트
══════════════════════════════════════════════════════ */

/** 사진 개수에 따른 절대 좌표 배치 (position:absolute 기반) */
function diaryPhotoPositions(
  n: number, pw: number, ph: number,
): Array<{ x: number; y: number; w: number; h: number; z: number }> {
  const h1 = Math.floor(pw / 2);
  const v1 = Math.floor(ph / 2);
  const t1 = Math.floor(pw / 3), t2 = t1, t3 = pw - t1 * 2;
  const u1 = Math.floor(ph / 3), u2 = u1, u3 = ph - u1 * 2;
  switch (n) {
    case 1: return [{ x: 0, y: 0, w: pw, h: ph, z: 1 }];
    case 2: return [
      { x: 0,    y: 0, w: h1,      h: ph, z: 1 },
      { x: h1,   y: 0, w: pw - h1, h: ph, z: 1 },
    ];
    case 3: {
      /* 좌측상단 · 중간 · 우측하단 — 대각 계단 (각 60%×60%, 중간이 최상위) */
      const pw6 = Math.floor(pw * 0.6), ph6 = Math.floor(ph * 0.6);
      const xm  = Math.floor((pw - pw6) / 2), ym = Math.floor((ph - ph6) / 2);
      return [
        { x: 0,       y: 0,       w: pw6, h: ph6, z: 1 },
        { x: xm,      y: ym,      w: pw6, h: ph6, z: 3 },
        { x: pw - pw6, y: ph - ph6, w: pw6, h: ph6, z: 1 },
      ];
    }
    case 4: return [
      { x: 0,  y: 0,  w: h1,      h: v1,      z: 1 },
      { x: h1, y: 0,  w: pw - h1, h: v1,      z: 1 },
      { x: 0,  y: v1, w: h1,      h: ph - v1, z: 1 },
      { x: h1, y: v1, w: pw - h1, h: ph - v1, z: 1 },
    ];
    case 5: /* 십자(+) 형 (상·좌·중·우·하) */ return [
      { x: t1,      y: 0,       w: t2, h: u1, z: 1 },
      { x: 0,       y: u1,      w: t1, h: u2, z: 1 },
      { x: t1,      y: u1,      w: t2, h: u2, z: 1 },
      { x: t1 + t2, y: u1,      w: t3, h: u2, z: 1 },
      { x: t1,      y: u1 + u2, w: t2, h: u3, z: 1 },
    ];
    default: /* 6장 이상 → 3×2 */ return [
      { x: 0,        y: 0,  w: t1, h: v1,      z: 1 },
      { x: t1,       y: 0,  w: t2, h: v1,      z: 1 },
      { x: t1 + t2,  y: 0,  w: t3, h: v1,      z: 1 },
      { x: 0,        y: v1, w: t1, h: ph - v1, z: 1 },
      { x: t1,       y: v1, w: t2, h: ph - v1, z: 1 },
      { x: t1 + t2,  y: v1, w: t3, h: ph - v1, z: 1 },
    ];
  }
}

function buildDiaryPageHtml(
  photos: { base64: string; caption: string }[],
  albumTitle: string,
  dateStr: string,
  weatherStr: string,
  location: string,
  story: string,
  themeColor: string,
  isA5: boolean,
  pageIdx: number,
  totalPages: number,
): string {
  const pw      = isA5 ? 420 : 595;
  const ph      = isA5 ? 595 : 842;
  const hdrH    = isA5 ?  50 :  64;
  const divH    = 2;
  const photoH  = isA5 ? Math.floor(ph / 2) : 360; // A5: 절반, A4: 360pt (사진 축소 + 일기 영역 확보)
  const diaryH  = ph - hdrH - divH - photoH; // 나머지 pt 정확히 계산

  const titleSz = isA5 ? 13 : 16;
  const metaSz  = isA5 ?  8 : 10;
  const bodyFsz = isA5 ? 10 : 13;
  const padH    = isA5 ? 10 : 14;
  const padV    = isA5 ? 16 : 22;
  const lineH   = isA5 ? 22 : 26;
  const pb      = pageIdx > 1 ? 'page-break-before:always;break-before:page;' : '';

  /* 사진 배치 */
  const n         = Math.min(photos.length, 6);
  /* A4: 좌우 6pt 패딩 → 사진이 페이지 끝까지 닿지 않아 WKWebView 우측 잘림 방지 */
  const photoPad    = isA5 ? 0 : 6;
  const effectivePw = pw - 2 * photoPad;
  const positions = diaryPhotoPositions(n, effectivePw, photoH);
  const photoCells = photos.slice(0, n).map((p, i) => {
    const pos = positions[i];
    if (!pos) return '';
    const { x, y, w, h, z } = pos;
    // 퍼센트 기반 위치: effectivePw(패딩 제외 내부 너비) 기준
    const lp = (x / effectivePw * 100).toFixed(3), tp = (y / photoH * 100).toFixed(3);
    const wp = (w / effectivePw * 100).toFixed(3), hp = (h / photoH * 100).toFixed(3);
    const imgEl = p.base64
      ? `<img src="${p.base64}" style="width:100%;height:100%;object-fit:contain;display:block;" />`
      : `<div style="width:100%;height:100%;background:#D1D5DB;"></div>`;
    return `<div style="position:absolute;left:${lp}%;top:${tp}%;width:${wp}%;height:${hp}%;overflow:hidden;z-index:${z};border:3px solid #fff;">${imgEl}</div>`;
  }).join('');

  /* 일기 본문 (오늘의 이야기) */
  const diaryBody = story || '오늘의 소중한 순간들을 기록합니다.';

  /* 헤더 */
  const metaParts = [weatherStr, location].filter(Boolean).join(' · ');

  /* 일기 텍스트 영역 (줄 공책 배경) — pt 단위로 정확한 높이 지정 */
  const ruledBg = `repeating-linear-gradient(transparent,transparent ${lineH - 1}pt,#D4C9B8 ${lineH - 1}pt,#D4C9B8 ${lineH}pt)`;
  /* A4: background-position을 padH만큼 내려서 줄이 날짜 헤더(1줄 분량)와 본문 텍스트에 정확히 맞게 정렬 */
  const a4BgPos = isA5 ? '' : `background-position:0 ${padH}pt;`;
  /* A4: 날짜 헤더가 정확히 lineH 높이를 차지하도록 해 그 다음 줄부터 본문이 줄과 일치 */
  const dateDivStyle = isA5
    ? `font-size:${metaSz}pt;font-weight:700;color:${themeColor}AA;margin-bottom:${padH - 4}pt;`
    : `font-size:${metaSz}pt;font-weight:700;color:${themeColor}AA;line-height:${lineH}pt;margin-bottom:0;display:flex;align-items:center;`;
  /* A5: 기존 방식 유지 / A4: flex 레이아웃으로 변경 → position:absolute 푸터가 print 모드에서 다이어리 div를 탈출해 2페이지로 넘어가는 문제 해결 */
  const diaryHtml = isA5
    ? `<div style="width:100%;height:${diaryH}pt;background:#FDFBF7;background-image:${ruledBg};background-size:100% ${lineH}pt;padding:${padH}pt ${padV}pt;overflow:hidden;position:relative;box-sizing:border-box;"><div style="${dateDivStyle}">${dateStr}</div><p style="margin:0;font-size:${bodyFsz}pt;line-height:${lineH}pt;color:#3A3030;font-family:Georgia,serif;word-break:break-all;white-space:pre-wrap;">${diaryBody}</p><div style="position:absolute;bottom:${padH}pt;right:${padV}pt;font-size:${metaSz}pt;color:${themeColor}60;font-style:italic;">✦ ${albumTitle}</div></div>`
    : `<div style="display:flex;flex-direction:column;width:100%;height:${diaryH}pt;background:#FDFBF7;background-image:${ruledBg};background-size:100% ${lineH}pt;${a4BgPos}padding:${padH}pt ${padV}pt;overflow:hidden;box-sizing:border-box;"><div style="${dateDivStyle}">${dateStr}</div><div style="flex:1;overflow:hidden;"><p style="margin:0;font-size:${bodyFsz}pt;line-height:${lineH}pt;color:#3A3030;font-family:Georgia,serif;word-break:break-all;white-space:pre-wrap;">${diaryBody}</p></div><div style="flex-shrink:0;line-height:${lineH}pt;text-align:right;font-size:${metaSz}pt;color:${themeColor}60;font-style:italic;">✦ ${albumTitle}</div></div>`;

  return `<div style="${pb}display:flex;flex-direction:column;width:${pw}pt;height:${ph}pt;overflow:hidden;background:#FDFBF7;"><div style="flex-shrink:0;height:${hdrH}pt;display:flex;align-items:center;justify-content:space-between;padding:0 ${padV}pt;background:#FDFBF7;border-bottom:2.5pt solid ${themeColor};"><div style="flex:1;min-width:0;"><div style="font-size:${titleSz}pt;font-weight:800;color:${themeColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${albumTitle}</div>${metaParts ? `<div style="font-size:${metaSz}pt;color:${themeColor}99;margin-top:2pt;">${metaParts}</div>` : ''}</div>${totalPages > 1 ? `<div style="font-size:${metaSz}pt;color:${themeColor}66;margin-left:8pt;">${pageIdx} / ${totalPages}</div>` : ''}</div><div style="flex-shrink:0;width:100%;height:${photoH}pt;${photoPad > 0 ? `padding:0 ${photoPad}pt;box-sizing:border-box;` : ''}overflow:hidden;"><div style="position:relative;width:100%;height:100%;">${photoCells}</div></div><div style="flex-shrink:0;height:${divH}pt;background:${themeColor};"></div>${diaryHtml}</div>`;
}

/* ══════════════════════════════════════════════════════
   단일 앨범 HTML 생성 (새 per-photo 스타일 시스템)

   구조:
   - 헤더: 앨범 제목/날짜/위치 (각 페이지 고정 반복)
   - 이야기 블록 (있을 때)
   - 사진들: themeId에 따라 다양한 스타일로 흐름 배치
   - expo-print가 자동으로 페이지 분할
══════════════════════════════════════════════════════ */
async function buildAlbumHtml(
  album: Album,
  layout: LayoutType,           // API 호환용 유지 (렌더링은 themeId 기반)
  pageSize: PageSize,
  themeColor: string = DEFAULT_THEME,
  pdfTheme: PdfThemeConfig = PDF_THEMES[0],
  photoSize: PhotoSizeType = 'medium',
): Promise<string> {
  const isA5      = pageSize === 'A5';
  const ph        = isA5 ? 595 : 842;
  const sizeScale = PHOTO_SIZE_FACTOR[photoSize];
  const themeId   = PDF_THEMES.findIndex(t => t.key === pdfTheme.key) + 1; // 1~10

  // 폴라로이드 이미지 JS 비율 보정에 사용할 값 (buildPhotoStylesCss 와 동기화)
  const maxImgH = photoSize === 'large' ? (isA5 ? 400 : 570)
                : photoSize === 'small' ? (isA5 ? 100 : 140)
                : /* medium */           (isA5 ? 207 : 296);
  const maxPolW = Math.round((isA5 ? 420 : 595) * 0.78); // 80% 컨테이너의 실제 내부 px

  // 어두운 배경 테마 → 캡션 흰색, 밝은 배경 테마 → 캡션 검정
  const isDarkTheme = ['retro', 'film', 'midnight'].includes(pdfTheme.key);
  const capColor    = isDarkTheme ? '#ffffff' : '#333333';

  const titleSize = isA5 ? 14 : 18;
  const metaSize  = isA5 ? 9  : 11;
  const storySize = isA5 ? 10 : 12;
  const paddingH  = isA5 ? 8  : 12;
  const paddingS  = isA5 ? 14 : 20;

  const dateStr       = formatDateKorean(album.date);
  const ticketDateStr = formatDateDot(album.date);
  const albumTitle = album.title || '우리 아이의 하루';
  const weatherStr = album.weatherEmoji
    ? `${album.weatherEmoji} ${WEATHER_LABEL[album.weather] ?? album.weather}`
    : '';

  // ── 헤더: position:fixed → 모든 페이지 상단 반복 ──
  const row1H   = isA5 ? 18 : 22;
  const row2H   = isA5 ? 14 : 17;
  const headerH = paddingH * 2 + row1H + 4 + row2H + 3; // body padding-top 계산용

  const headerHtml = pageHeaderHtml(
    albumTitle, album.photos.length, dateStr,
    album.location || '', weatherStr,
    titleSize, metaSize, paddingS, paddingH,
    themeColor,
  );

  // ── 이야기 블록 ──
  // story가 있으면 자연 높이(max-height 제한)로 표시하고, 사진은 이야기 바로 아래 1페이지에 함께 배치
  // storyMaxH: 최소 사진 1장이 1페이지에 들어가도록 이야기 높이 상한
  const hasStory = !!album.story;
  const minPhotoH = isA5 ? 250 : 360; // 1페이지에 사진 최소 1장 확보용 예비 높이
  const storyMaxH = (ph - headerH) - minPhotoH;
  const storyHtml = hasStory
    ? `<div style="max-height:${storyMaxH}px;overflow:hidden;box-sizing:border-box;padding:14px ${paddingS}px 10px ${paddingS}px;">
        <p style="margin:0;font-size:${storySize}px;color:${pdfTheme.headerTextColor ?? '#333'};
          line-height:1.8;background:${lightBg(themeColor)};
          padding:${isA5 ? 10 : 14}px ${isA5 ? 12 : 16}px;
          border-radius:12px;border-left:4px solid ${themeColor};">
          ${album.story}
        </p>
      </div>`
    : '';

  // ── 모든 사진 base64 변환 ──
  const photosData = await Promise.all(
    album.photos.map(async (p) => ({
      base64:   await imageToBase64(p.uri),
      caption:  p.caption ?? '',
      takenAt:  p.takenAt,
    }))
  );

  // ── 일기형 레이아웃 (상단 사진 + 하단 일기 텍스트) ──
  if (layout === 'diary') {
    const chunks: typeof photosData[] = [];
    for (let i = 0; i < photosData.length; i += 6) chunks.push(photosData.slice(i, i + 6));
    if (chunks.length === 0) chunks.push([]);
    const totalDiaryPages = chunks.length;
    const diaryPages = chunks.map((chunk, pi) =>
      buildDiaryPageHtml(chunk, albumTitle, dateStr, weatherStr, album.location || '', album.story || '', themeColor, isA5, pi + 1, totalDiaryPages)
    );
    return `<!DOCTYPE html><html>
    <head>
      <meta charset="utf-8"/>
      <title>${albumTitle}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        html, body { width:100%; margin:0; padding:0; background:#FDFBF7; font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif; print-color-adjust:exact !important; -webkit-print-color-adjust:exact !important; overflow:hidden; }
        img  { display:block; }
        @page { margin:0; size:${isA5 ? '420pt 595pt' : '595pt 842pt'}; background:#FDFBF7; }
      </style>
    </head>
    <body>${diaryPages.join('')}</body>
    </html>`;
  }

  // ── 테마 알고리즘으로 사진 HTML 생성 ──
  // hasStory=true → 첫 사진 그룹은 1페이지 이야기 아래에 배치 (page-break 없음, 테이블 래퍼 없음)
  const photosHtml = photosData.length > 0
    ? renderThemePhotos(photosData, themeId, albumTitle, dateStr, ticketDateStr, isA5, sizeScale, photoSize, false, hasStory)
    : `<p style="text-align:center;color:#9ca3af;padding:40px;font-size:14px;">사진이 없습니다.</p>`;

  const themeCss      = buildThemeCss(pdfTheme, isA5);
  const photoStyleCss = buildPhotoStylesCss(isA5, sizeScale, paddingS, photoSize);

  return `
    <!DOCTYPE html><html>
    <head>
      <meta charset="utf-8"/>
      <title>${albumTitle}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        html, body { width:100%; margin:0; padding:0; background:${pdfTheme.pageBackground}; print-color-adjust:exact !important; -webkit-print-color-adjust:exact !important; }
        body {
          --cap-color: ${capColor};
          font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
        }
        img { display:block; max-width:100%; }
        @page { margin:0; size:${isA5 ? '420pt 595pt' : '595pt 842pt'}; background:${pdfTheme.pageBackground}; }
        /* 콘텐츠 영역 — 여백 없이 페이지 전체를 채움 */
        .page-bg { padding:0; }
        ${themeCss}
        ${photoStyleCss}
      </style>
    </head>
    <body>
      <!-- ① 1페이지 헤더 (정적) -->
      <div id="hdr-tpl">${headerHtml}</div>

      <!-- ② 사진 콘텐츠 -->
      <div id="content-area" class="page-bg">
        ${storyHtml}
        ${photosHtml}
      </div>

      <!-- ③ 2페이지 이후 헤더 자동 삽입 + 폴라로이드 portrait/landscape 비율 보정 -->
      <script>
      (function(){
        /* ── 폴라로이드 portrait/landscape 비율 보정 ──
           CSS max-width+max-height 동시 적용 시 WKWebView 비율 오류 방지:
           portrait → 높이 기준 축소 (컨테이너 너비=이미지 너비로 고정 → 캡션도 같은 너비에서 줄바꿈)
           landscape → 너비 기준 축소 */
        function fixPolaroid(img) {
          var pol = img.parentElement;
          if (!pol || !pol.classList.contains('s-polaroid')) return;
          var nw = img.naturalWidth, nh = img.naturalHeight;
          if (!nw || !nh) return;
          var MAX_W = ${maxPolW}, MAX_H = ${maxImgH};
          /* .s-pg-first-1 안에 있는 경우 첫 페이지 축소 높이 적용 */
          var inFirst1 = pol.closest && pol.closest('.s-pg-first-1');
          if (inFirst1) MAX_H = ${isA5 ? 180 : 275};
          var ar = nw / nh;
          var w, h;
          if (ar < 1) {
            /* 세로 사진: 높이 기준 */
            h = Math.min(nh, MAX_H);
            w = Math.round(h * ar);
            if (w > MAX_W) { w = MAX_W; h = Math.round(w / ar); }
          } else {
            /* 가로 사진: 너비 기준 */
            w = Math.min(nw, MAX_W);
            h = Math.round(w / ar);
            if (h > MAX_H) { h = MAX_H; w = Math.round(h * ar); }
          }
          img.style.width  = w + 'px';
          img.style.height = h + 'px';
          /* 컨테이너 너비를 이미지 너비로 고정 → 캡션이 이미지 너비에서 줄바꿈 */
          pol.style.width = w + 'px';
        }

        window.addEventListener('load', function(){
          /* 폴라로이드 이미지 비율 보정 */
          var polImgs = document.querySelectorAll('.s-polaroid img');
          for (var pi = 0; pi < polImgs.length; pi++) {
            var img = polImgs[pi];
            if (img.complete && img.naturalWidth) { fixPolaroid(img); }
            else { (function(i){ i.addEventListener('load', function(){ fixPolaroid(i); }); })(img); }
          }

          /* 2페이지 이후 헤더 자동 삽입 */
          var tpl     = document.getElementById('hdr-tpl');
          var content = document.getElementById('content-area');
          if (!tpl || !content) return;
          var children = Array.prototype.slice.call(content.children);
          var inserts  = [];
          /* data-newpage 속성으로 감지 → style 속성명 파싱 방식보다 WKWebView에서 확실히 동작 */
          children.forEach(function(child){
            if (child.getAttribute && child.getAttribute('data-newpage') === '1') {
              inserts.push(child);
            }
          });
          /* 역순 삽입 → 뒤에서부터 넣어야 앞 요소의 측정 위치가 불변 */
          inserts.reverse().forEach(function(el){
            /* 헤더를 photo wrapper div 안 첫 번째 자식으로 삽입
               → photo div 가 이미 page-break-before 를 가지고 있으므로
                 별도 div(pb) + photo div(pb) 의 더블 페이지 브레이크를 방지 */
            var clone = tpl.cloneNode(true);
            clone.removeAttribute('id');
            clone.style.marginLeft  = '0px';
            clone.style.marginRight = '0px';
            clone.style.marginBottom = '${paddingH}px';
            el.insertBefore(clone, el.firstChild);
          });
        });
      })();
      </script>
    </body>
    </html>`;
}

/* ── 테마 페이지 배경 CSS ────────────────────────────────
   배경은 항상 흰색 — 디자인 차별화는 사진 프레임/캡션 스타일로 처리
──────────────────────────────────────────────────── */
function buildThemeCss(_theme: PdfThemeConfig, _isA5: boolean): string {
  return `html, body { print-color-adjust:exact !important; -webkit-print-color-adjust:exact !important; }`;
}

/* ══════════════════════════════════════════════════════
   메인 generatePDF
   - 앨범 1개씩 개별 PDF 생성 → 공유
   - 파일명: 앨범명_날짜.pdf (실제 파일명 변경 후 공유)
   - 모든 완료 후 → 팝업 Alert + 푸시 알림
══════════════════════════════════════════════════════ */
/* ── 진행률 콜백 타입 ────────────────────────────────
   percent  : 0~100 (전체 진행 퍼센트)
   albumTitle: 현재 처리 중인 앨범 제목
   step     : 현재 단계 설명 (UI 표시용)
──────────────────────────────────────────────────── */
export type ProgressCallback = (
  percent: number,
  albumTitle: string,
  step: string,
) => void;

export async function generatePDF(
  albums: Album[],
  pageSize: PageSize = 'A5',
  layout: LayoutType = 'feature',
  onProgress?: ProgressCallback,
  onComplete?: (count: number) => void,
  childColorMap?: Record<string, string>,
  pdfTheme: PdfThemeConfig = PDF_THEMES[0],
  photoSize: PhotoSizeType = 'medium',
): Promise<void> {
  const { width, height } = PAGE_DIMENSIONS[pageSize];
  const canShare = await Sharing.isAvailableAsync();
  const tempDir = FileSystem.cacheDirectory + 'pdf_export/';
  await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

  const total = albums.length;
  const now = new Date(); // 파일명 타임스탬프 고정 (전체 배치 동일 시각)

  for (let i = 0; i < total; i++) {
    const album = albums[i];
    const title = album.title || '앨범';

    // 앨범 1개가 차지하는 퍼센트 범위: [albumStart, albumEnd)
    const albumStart = Math.round((i / total) * 100);
    const albumEnd   = Math.round(((i + 1) / total) * 100);
    const albumRange = albumEnd - albumStart; // 앨범 1개 분량

    // 단계별 내부 비율 (0~1) → 실제 percent로 변환하는 헬퍼
    const pct = (ratio: number) =>
      Math.min(albumEnd - 1, albumStart + Math.round(albumRange * ratio));

    // ── 단계 1: 이미지 변환 시작 (0% of album range)
    onProgress?.(pct(0), title, '이미지 준비 중...');

    // ── 단계 2: 이미지 1장씩 변환하면서 5%~75% 채우기
    //    buildAlbumHtml 내부에서 직접 진행을 받을 수 없으므로
    //    사진 장수 기반으로 미리 예상 퍼센트 단계 생성
    const photoCount = Math.max(album.photos.length, 1);
    const imgProgressEnd = 0.75; // 이미지 변환이 차지하는 비율 상한
    for (let p = 0; p < photoCount; p++) {
      const ratio = 0.05 + (imgProgressEnd - 0.05) * ((p + 1) / photoCount);
      onProgress?.(pct(ratio), title, `사진 ${p + 1}/${photoCount} 변환 중...`);
      // 너무 빨리 끝나지 않도록 실제 이미지 변환과 동기화하기 위해
      // buildAlbumHtml 전에 비동기 tick 양보
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    // ── 단계 3: HTML + PDF 변환 (75% → 85% → 95%)
    onProgress?.(pct(0.80), title, '페이지 레이아웃 구성 중...');
    const themeColor = childColorMap?.[album.childId] ?? DEFAULT_THEME;
    const html = await buildAlbumHtml(album, layout, pageSize, themeColor, pdfTheme, photoSize);

    onProgress?.(pct(0.88), title, 'PDF 변환 중...');
    const { uri: rawUri } = await Print.printToFileAsync({
      html, width, height, base64: false,
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
    });

    // ── 단계 4: 파일 저장 (95%)
    onProgress?.(pct(0.95), title, '파일 저장 중...');
    const fileName = safeFileName(title, pdfTheme.label, now) + '.pdf';
    const namedUri = tempDir + fileName;
    const existing = await FileSystem.getInfoAsync(namedUri);
    if (existing.exists) await FileSystem.deleteAsync(namedUri, { idempotent: true });
    await FileSystem.moveAsync({ from: rawUri, to: namedUri });

    // ── 단계 5: 완료 (100% of album range) → shareAsync 전에 업데이트
    onProgress?.(albumEnd, title, '완료!');

    if (canShare) {
      await Sharing.shareAsync(namedUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: fileName,
      });
    }
  }

  // 모든 PDF 생성 완료 → 콜백 + 알림
  onComplete?.(total);
  await sendCompletionNotification(total);
}
