import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { Album, PhotoEntry } from '../types';
import { formatDateKorean } from './dateUtils';
import { WEATHER_LABEL } from '../constants';

/* ── 타입 ────────────────────────────────────────────── */
export type PageSize = 'A4' | 'A5';
export type LayoutType = 'single' | 'two_col' | 'feature' | 'magazine' | 'three_col';

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
  /* ── 1. 모던 심플 (무료 기본) ── */
  {
    key: 'modern',
    label: '모던 심플',
    isPro: false,
    pageBackground: '#FAFAFA',
    frameStyle: 'background:#FFFFFF;padding:10px;border:1px solid #EAEAEA;box-shadow:0 4px 12px rgba(0,0,0,0.05);border-radius:8px;',
    captionColor: '#333333',
    captionFont: "'Helvetica Neue', sans-serif",
  },
  /* ── 2. 클래식 레트로 (PRO) ── */
  {
    key: 'retro',
    label: '클래식 레트로',
    isPro: true,
    pageBackground: '#2b3a30',
    pagePadding: '50px',
    frameStyle: 'background:#1a241d;padding:2px;border:3px solid #D4AF37;',
    captionColor: '#E8DCC4',
    captionFont: "Georgia, serif",
    headerBackground: '#1a241d',
    headerTextColor: '#D4AF37',
  },
  /* ── 3. 모눈종이 다이어리 (PRO) ── */
  {
    key: 'grid',
    label: '모눈 다이어리',
    isPro: true,
    pageBackground: `#FFFFFF`,
    frameStyle: 'background:#FFFFFF;padding:10px;padding-bottom:30px;border:1px solid #DDDDDD;transform:rotate(-1deg);box-shadow:2px 2px 5px rgba(0,0,0,0.1);',
    captionColor: '#555555',
    captionFont: "cursive",
  },
  /* ── 4. 파스텔 베이비 (PRO) ── */
  {
    key: 'baby',
    label: '파스텔 베이비',
    isPro: true,
    pageBackground: 'radial-gradient(circle at center, #FFFDE7 0%, #FFF9C4 100%)',
    frameStyle: 'background:#FFFFFF;padding:10px;border-radius:20px;box-shadow:0 8px 20px rgba(255,204,128,0.3);border:3px solid #FFF59D;',
    captionColor: '#795548',
    captionFont: "sans-serif",
  },
  /* ── 5. 폴라로이드 (PRO) ── */
  {
    key: 'polaroid',
    label: '폴라로이드',
    isPro: true,
    pageBackground: '#EFEFEF',
    pagePadding: '50px',
    frameStyle: 'background:#FFFFFF;padding:15px 15px 55px 15px;box-shadow:0 10px 20px rgba(0,0,0,0.15);',
    captionColor: '#222222',
    captionFont: "cursive",
  },
  /* ── 6. 필름 스트립 (PRO) ── */
  {
    key: 'film',
    label: '필름 스트립',
    isPro: true,
    pageBackground: '#111111',
    frameStyle: 'background:#000000;padding:10px 40px;border:2px solid #333;',
    captionColor: '#F3F3F3',
    captionFont: "'Courier New', monospace",
    headerBackground: '#000000',
    headerTextColor: '#CCCCCC',
  },
  /* ── 7. 줄무늬 노트 (PRO) ── */
  {
    key: 'lined',
    label: '줄무늬 노트',
    isPro: true,
    pageBackground: '#FDFBF7',
    frameStyle: 'background:#FFFFFF;padding:10px;border:1px solid #EAEAEA;transform:rotate(1deg);',
    captionColor: '#4A4A4A',
    captionFont: "sans-serif",
  },
  /* ── 8. 보태니컬 그린 (PRO) ── */
  {
    key: 'nature',
    label: '보태니컬 그린',
    isPro: true,
    pageBackground: 'linear-gradient(135deg, #F1F8E9 0%, #DCEDC8 100%)',
    frameStyle: 'background:#FFFFFF;padding:8px;border-radius:4px;box-shadow:2px 4px 10px rgba(51,105,30,0.1);',
    captionColor: '#33691E',
    captionFont: "sans-serif",
  },
  /* ── 9. 에어메일 (PRO) ── */
  {
    key: 'airmail',
    label: '에어메일',
    isPro: true,
    pageBackground: '#FAFAFA',
    pagePadding: '30px',
    frameStyle: 'background:#FFFFFF;padding:5px;border:1px solid #CCCCCC;',
    captionColor: '#111111',
    captionFont: "sans-serif",
  },
  /* ── 10. 미드나잇 다크 (PRO) ── */
  {
    key: 'midnight',
    label: '미드나잇 다크',
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

/* ── 이미지 태그 생성 ────────────────────────────────── */
function imgTag(b64: string, extraStyle: string = '', frameStyle: string = ''): string {
  const hasHeight = extraStyle.includes('height:');
  const base = `display:block;width:100%;${hasHeight ? '' : 'height:auto;'}object-fit:contain;${extraStyle}`;
  const img = b64
    ? `<img src="${b64}" style="${base}" />`
    : `<div style="min-height:80px;background:#f3e8ff;border-radius:8px;
        align-items:center;justify-content:center;
        display:flex;${extraStyle}">${ICON_CAMERA_SVG}</div>`;
  if (!frameStyle) return img;
  return `<div style="${frameStyle}">${img}</div>`;
}

/* ── 캡션 HTML (테마 색상 적용) ────────────────────────── */
function captionHtml(caption: string, color = '#6b7280', font = 'sans-serif'): string {
  if (!caption) return '';
  return `<p style="font-size:10px;color:${color};margin:3px 0 0 0;font-style:italic;
    padding:5px 8px;background:#fdf2f8;border-radius:5px;border-left:3px solid #f472b6;
    line-height:1.4;font-family:${font};">${caption}</p>`;
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
  headerBg: string = '#fff',
): string {
  const countSize = titleSize + 2;
  const iconSize = metaSize + 2;
  const titleColor = headerBg === '#fff' ? '#1f2937' : themeColor;
  const metaColor  = headerBg === '#fff' ? '#6b7280' : themeColor + 'bb';
  return `
    <div style="
      padding:${paddingH}px ${paddingS}px ${paddingH}px ${paddingS}px;
      background:${headerBg};
      border-bottom:3px solid ${themeColor};
      display:flex;align-items:stretch;">
      <!-- 왼쪽: 행1(앨범명) + 행2(날짜·위치·날씨) -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="font-size:${titleSize}px;font-weight:800;color:${titleColor};
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">
          ${title}
        </div>
        <div style="font-size:${metaSize}px;color:${metaColor};display:flex;align-items:center;flex-wrap:wrap;gap:6px;">
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
   레이아웃별 사진을 "페이지 단위 그룹"으로 분할
   각 그룹 = 한 페이지에 들어갈 사진들
══════════════════════════════════════════════════════ */

/* single: 1장씩 1페이지 */
function groupSingle(photos: Album['photos']): Album['photos'][] {
  return photos.map(p => [p]);
}
/* two_col: 4장씩 1페이지 (2행×2열) */
function groupTwoCol(photos: Album['photos']): Album['photos'][] {
  const groups: Album['photos'][] = [];
  for (let i = 0; i < photos.length; i += 4) groups.push(photos.slice(i, i + 4));
  return groups;
}
/* feature: 첫 페이지 1장 크게 + 나머지 4장씩 (2행×2열) */
function groupFeature(photos: Album['photos']): Album['photos'][] {
  if (photos.length === 0) return [];
  const groups: Album['photos'][] = [[photos[0]]];
  for (let i = 1; i < photos.length; i += 4) groups.push(photos.slice(i, i + 4));
  return groups;
}
/* magazine: 1장 와이드 + 2장 세트씩 */
function groupMagazine(photos: Album['photos']): Album['photos'][] {
  const groups: Album['photos'][] = [];
  let i = 0;
  while (i < photos.length) {
    const batch = photos.slice(i, i + 3); // wide + left + right
    groups.push(batch);
    i += batch.length;
  }
  return groups;
}
/* three_col: 6장씩 1페이지 (2행×3열) */
function groupThreeCol(photos: Album['photos']): Album['photos'][] {
  const groups: Album['photos'][] = [];
  for (let i = 0; i < photos.length; i += 6) groups.push(photos.slice(i, i + 6));
  return groups;
}

/* ── 그룹 → 콘텐츠 HTML ─────────────────────────────── */
async function groupToHtml(
  group: Album['photos'],
  layout: LayoutType,
  pageSize: PageSize,
  contentH: number,
  paddingS: number,
  gap: number,
  frameStyle: string = '',
  captionColor: string = '#6b7280',
  captionFont: string = 'sans-serif',
): Promise<string> {
  const captionH = 22;

  // ── single: 1장 크게 ──────────────────────────────
  if (layout === 'single') {
    const p = group[0];
    const b64 = await imageToBase64(p.uri);
    const hasCap = !!p.caption;
    const imgH = contentH - gap * 2 - (hasCap ? captionH : 0);
    return `
      <div style="padding:${gap}px ${paddingS}px;height:${contentH}px;box-sizing:border-box;overflow:hidden;">
        <div style="height:100%;display:flex;flex-direction:column;">
          <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
            ${imgTag(b64, `max-height:${imgH}px;object-fit:contain;width:100%;height:${imgH}px;`, frameStyle)}
          </div>
          ${captionHtml(p.caption, captionColor, captionFont)}
        </div>
      </div>`;
  }

  // ── two_col / feature(복수장): 2열, 최대 2행 (4장/페이지) ───────────
  if (layout === 'two_col' || (layout === 'feature' && group.length !== 1)) {
    const rows: PhotoEntry[][] = [];
    for (let i = 0; i < group.length; i += 2) rows.push(group.slice(i, i + 2));
    const numRows = rows.length;
    const hasCap = group.some(p => !!p.caption);
    const capRowH = hasCap ? captionH : 0;
    const totalVertGap = gap * (numRows + 1);
    const rowH = Math.floor((contentH - totalVertGap) / numRows);
    const imgH = rowH - capRowH;

    const rowHtmlArr = await Promise.all(rows.map(async (row) => {
      const [left, right] = row;
      const b64L = await imageToBase64(left.uri);
      const b64R = right ? await imageToBase64(right.uri) : '';
      return `
        <div style="display:flex;gap:${gap}px;height:${rowH}px;flex-shrink:0;">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
            <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
              ${imgTag(b64L, `max-height:${imgH}px;object-fit:contain;width:100%;height:${imgH}px;`, frameStyle)}
            </div>
            ${captionHtml(left.caption, captionColor, captionFont)}
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
            ${right ? `
            <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
              ${imgTag(b64R, `max-height:${imgH}px;object-fit:contain;width:100%;height:${imgH}px;`, frameStyle)}
            </div>
            ${captionHtml(right.caption, captionColor, captionFont)}` : ''}
          </div>
        </div>`;
    }));

    return `
      <div style="padding:${gap}px ${paddingS}px;height:${contentH}px;box-sizing:border-box;overflow:hidden;">
        <div style="display:flex;flex-direction:column;gap:${gap}px;height:100%;">
          ${rowHtmlArr.join('')}
        </div>
      </div>`;
  }

  // ── feature(1장): 첫 페이지 1장 크게 ────────────
  if (layout === 'feature' && group.length === 1) {
    const p = group[0];
    const b64 = await imageToBase64(p.uri);
    const hasCap = !!p.caption;
    const imgH = contentH - gap * 2 - (hasCap ? captionH : 0);
    return `
      <div style="padding:${gap}px ${paddingS}px;height:${contentH}px;box-sizing:border-box;overflow:hidden;">
        <div style="height:100%;display:flex;flex-direction:column;">
          <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
            ${imgTag(b64, `max-height:${imgH}px;object-fit:contain;width:100%;height:${imgH}px;`, frameStyle)}
          </div>
          ${captionHtml(p.caption, captionColor, captionFont)}
        </div>
      </div>`;
  }

  // ── magazine: 상단 와이드 + 하단 2열 ────────────
  if (layout === 'magazine') {
    const [wide, left, right] = group;
    const b64W = await imageToBase64(wide.uri);
    const b64L = left ? await imageToBase64(left.uri) : '';
    const b64R = right ? await imageToBase64(right.uri) : '';
    const hasSmallRow = !!(left || right);
    // 와이드: 60%, 하단 2열: 40% (각각 gap 제외)
    const totalGaps = gap * 3; // 상단 gap + 중간 gap + 하단 gap
    const innerH = contentH - totalGaps;
    const wideH  = hasSmallRow ? Math.round(innerH * 0.58) : innerH;
    const smallH = hasSmallRow ? innerH - wideH - gap : 0;
    const wideCapH = wide.caption ? captionH : 0;
    const smallCapH = (left?.caption || right?.caption) ? captionH : 0;
    const wideImgH  = wideH - wideCapH;
    const smallImgH = smallH - smallCapH;
    return `
      <div style="padding:${gap}px ${paddingS}px;height:${contentH}px;box-sizing:border-box;overflow:hidden;">
        <!-- 와이드 이미지 -->
        <div style="height:${wideH}px;margin-bottom:${gap}px;display:flex;flex-direction:column;">
          <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
            ${imgTag(b64W, `max-height:${wideImgH}px;object-fit:contain;width:100%;height:${wideImgH}px;`, frameStyle)}
          </div>
          ${captionHtml(wide.caption, captionColor, captionFont)}
        </div>
        <!-- 하단 2열 -->
        ${hasSmallRow ? `
        <div style="display:flex;gap:${gap}px;height:${smallH}px;">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
            <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
              ${imgTag(b64L, `max-height:${smallImgH}px;object-fit:contain;width:100%;height:${smallImgH}px;`, frameStyle)}
            </div>
            ${captionHtml(left?.caption ?? '', captionColor, captionFont)}
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
            ${right ? `
            <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
              ${imgTag(b64R, `max-height:${smallImgH}px;object-fit:contain;width:100%;height:${smallImgH}px;`, frameStyle)}
            </div>
            ${captionHtml(right?.caption ?? '', captionColor, captionFont)}` : ''}
          </div>
        </div>` : ''}
      </div>`;
  }

  // ── three_col: 3열, 최대 2행 (6장/페이지) ────────
  if (layout === 'three_col') {
    // group 최대 6장: row0=[0,1,2], row1=[3,4,5]
    const rows: PhotoEntry[][] = [];
    for (let i = 0; i < group.length; i += 3) rows.push(group.slice(i, i + 3));
    const numRows = rows.length;
    const hasCap = group.some(p => !!p.caption);
    const capRowH = hasCap ? captionH : 0;
    const totalVertGap = gap * (numRows + 1);
    const rowH = Math.floor((contentH - totalVertGap) / numRows);
    const imgH = rowH - capRowH;

    const rowHtmlArr = await Promise.all(rows.map(async (row) => {
      const cells = await Promise.all(row.map(async (p) => {
        const b64 = await imageToBase64(p.uri);
        return `
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
            <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
              ${imgTag(b64, `max-height:${imgH}px;object-fit:contain;width:100%;height:${imgH}px;`, frameStyle)}
            </div>
            ${captionHtml(p.caption, captionColor, captionFont)}
          </div>`;
      }));
      while (cells.length < 3) cells.push(`<div style="flex:1;"></div>`);
      return `
        <div style="display:flex;gap:${gap}px;height:${rowH}px;flex-shrink:0;">
          ${cells.join('')}
        </div>`;
    }));

    return `
      <div style="padding:${gap}px ${paddingS}px;height:${contentH}px;box-sizing:border-box;overflow:hidden;">
        <div style="display:flex;flex-direction:column;gap:${gap}px;height:100%;">
          ${rowHtmlArr.join('')}
        </div>
      </div>`;
  }

  return '';
}

/* ── 레이아웃 디스패처: 그룹 분할 ─────────────────────── */
function groupPhotos(photos: Album['photos'], layout: LayoutType): Album['photos'][] {
  if (photos.length === 0) return [[]];
  switch (layout) {
    case 'single':    return groupSingle(photos);
    case 'two_col':   return groupTwoCol(photos);
    case 'feature':   return groupFeature(photos);
    case 'magazine':  return groupMagazine(photos);
    case 'three_col': return groupThreeCol(photos);
    default:          return groupFeature(photos);
  }
}


/* ── 파일명 안전하게 변환 ────────────────────────────── */
function safeFileName(title: string, date: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '').trim() || '앨범';
  const dateStr = date.replace(/-/g, '').slice(0, 8);
  return `${safe}_${dateStr}`;
}

/* ══════════════════════════════════════════════════════
   단일 앨범 HTML 생성

   구조:
   - Page 1: 표지 (그라데이션, 고정 높이로 흰 여백 제거)
   - Page 2~N: 본문
     · @page CSS로 인쇄 여백 제거
     · 매 페이지 상단에 앨범 헤더(제목/날짜/구분선) 고정 반복
══════════════════════════════════════════════════════ */
async function buildAlbumHtml(
  album: Album,
  layout: LayoutType,
  pageSize: PageSize,
  themeColor: string = DEFAULT_THEME,
  pdfTheme: PdfThemeConfig = PDF_THEMES[0],
): Promise<string> {
  const isA5     = pageSize === 'A5';
  const titleSize = isA5 ? 14 : 18;
  const metaSize  = isA5 ? 9  : 11;
  const storySize = isA5 ? 10 : 12;
  const paddingH  = isA5 ? 8  : 12;
  const paddingS  = isA5 ? 12 : 16;
  const gap       = isA5 ? 6  : 8;

  const pageH = isA5 ? 595 : 842;
  const row1H   = isA5 ? 18 : 22;
  const row2H   = isA5 ? 14 : 17;
  const headerH = paddingH + row1H + 4 + row2H + paddingH + 3;
  const contentH = pageH - headerH - paddingH;

  const weatherStr = album.weatherEmoji
    ? `${album.weatherEmoji} ${WEATHER_LABEL[album.weather] ?? album.weather}`
    : '';
  const dateStr    = formatDateKorean(album.date);
  const albumTitle = album.title || '우리 아이의 하루';

  // ── 테마별 헤더 배경/텍스트 색상 ──
  const headerBg   = pdfTheme.headerBackground ?? '#fff';
  const headerTxt  = pdfTheme.headerTextColor  ?? themeColor;

  const header = pageHeaderHtml(
    albumTitle, album.photos.length, dateStr,
    album.location || '', weatherStr,
    titleSize, metaSize, paddingS, paddingH,
    headerTxt,
    headerBg,
  );

  // ── 이야기 블록 ──
  const storyTextColor = pdfTheme.headerTextColor ?? '#333';
  const storyHtml = album.story
    ? `<div style="margin:${gap}px ${paddingS}px;">
        <p style="margin:0;font-size:${storySize}px;color:${storyTextColor};line-height:1.8;
          background:${lightBg(themeColor)};
          padding:${isA5 ? 10 : 14}px ${isA5 ? 12 : 16}px;
          border-radius:12px;border-left:4px solid ${themeColor};">
          ${album.story}
        </p>
      </div>`
    : '';

  const storyH = album.story
    ? Math.min(
        Math.ceil(album.story.length / 38) * Math.round(storySize * 1.6) + 24,
        Math.round(contentH * 0.3),
      )
    : 0;

  const groups = groupPhotos(album.photos, layout);
  const pages: string[] = [];

  // ── 테마별 페이지 배경 CSS ──
  const pageBgStyle = buildPageBgStyle(pdfTheme);
  const pagePadding = pdfTheme.pagePadding ?? '0px';

  for (let g = 0; g < groups.length; g++) {
    const isFirst    = g === 0;
    const availableH = isFirst ? contentH - storyH - (storyH > 0 ? gap * 2 : 0) : contentH;
    const groupHtml  = await groupToHtml(
      groups[g], layout, pageSize, availableH, paddingS, gap,
      pdfTheme.frameStyle, pdfTheme.captionColor, pdfTheme.captionFont,
    );

    pages.push(`
      <div style="
        page-break-before:${isFirst ? 'auto' : 'always'};
        page-break-after:always;
        page-break-inside:avoid;
        ${pageBgStyle}
        padding:${pagePadding};
        box-sizing:border-box;">
        ${header}
        ${isFirst ? storyHtml : ''}
        ${groupHtml}
      </div>`);
  }

  if (pages.length === 0) {
    pages.push(`
      <div style="${pageBgStyle}">
        ${header}
        <p style="text-align:center;color:#9ca3af;padding:40px;font-size:14px;">사진이 없습니다.</p>
      </div>`);
  }

  // ── 테마별 추가 글로벌 CSS ──
  const themeExtraCss = buildThemeExtraCss(pdfTheme);

  return `
    <!DOCTYPE html><html>
    <head>
      <meta charset="utf-8"/>
      <title>${albumTitle}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif; }
        img { display:block; max-width:100%; height:auto; }
        @page { margin:0; size:${isA5 ? '420pt 595pt' : '595pt 842pt'}; }
        ${themeExtraCss}
      </style>
    </head>
    <body>${pages.join('\n')}</body>
    </html>`;
}

/* ── 테마 페이지 배경 CSS 문자열 생성 ─────────────────── */
function buildPageBgStyle(theme: PdfThemeConfig): string {
  const bg = theme.pageBackground;
  // gradient 또는 패턴이면 background shorthand, 단색이면 background-color
  if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) {
    return `background:${bg};`;
  }
  return `background-color:${bg};`;
}

/* ── 테마별 추가 글로벌 CSS ────────────────────────────── */
function buildThemeExtraCss(theme: PdfThemeConfig): string {
  switch (theme.key) {
    case 'grid':
      return `
        body {
          background-image:
            linear-gradient(#F0F0F0 1px, transparent 1px),
            linear-gradient(90deg, #F0F0F0 1px, transparent 1px);
          background-size: 20px 20px;
        }`;
    case 'lined':
      return `
        body {
          background-image: repeating-linear-gradient(
            transparent, transparent 39px, #E0D4C8 40px
          );
        }`;
    case 'airmail':
      return `
        div[data-page] {
          border: 15px solid transparent;
          border-image: repeating-linear-gradient(
            -45deg,
            #D32F2F, #D32F2F 15px,
            transparent 15px, transparent 30px,
            #1976D2 30px, #1976D2 45px,
            transparent 45px, transparent 60px
          ) 15;
        }`;
    default:
      return '';
  }
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
): Promise<void> {
  const { width, height } = PAGE_DIMENSIONS[pageSize];
  const canShare = await Sharing.isAvailableAsync();
  const tempDir = FileSystem.cacheDirectory + 'pdf_export/';
  await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

  const total = albums.length;

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
    const html = await buildAlbumHtml(album, layout, pageSize, themeColor, pdfTheme);

    onProgress?.(pct(0.88), title, 'PDF 변환 중...');
    const { uri: rawUri } = await Print.printToFileAsync({ html, width, height, base64: false });

    // ── 단계 4: 파일 저장 (95%)
    onProgress?.(pct(0.95), title, '파일 저장 중...');
    const fileName = safeFileName(title, album.date) + '.pdf';
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
