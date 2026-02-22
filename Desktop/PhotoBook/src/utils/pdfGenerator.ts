import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Album } from '../types';
import { formatDateKorean } from './dateUtils';
import { WEATHER_LABEL } from '../constants';

/* ── 타입 ────────────────────────────────────────────── */
export type PageSize = 'A4' | 'A5';
export type LayoutType = 'single' | 'two_col' | 'feature' | 'magazine' | 'three_col';

/* ── 용지 크기 (pt 단위, 72dpi 기준) ────────────────── */
const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
};

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

/* ── 이미지 태그 생성
   - 고정 height 제거 → 원본 비율 그대로 표시 (잘림 없음)
   - object-fit:contain 대신 width:100% / height:auto 로 자연스럽게
   - 다열 레이아웃에서는 maxHeight로 너무 길어지는 것만 방지
────────────────────────────────────────────────────── */
function imgTag(b64: string, extraStyle: string = ''): string {
  const base = `display:block;width:100%;height:auto;border-radius:8px;${extraStyle}`;
  return b64
    ? `<img src="${b64}" style="${base}" />`
    : `<div style="${base};min-height:80px;background:#f3e8ff;display:flex;
        align-items:center;justify-content:center;color:#a855f7;font-size:24px;">📷</div>`;
}

/* ── 캡션 HTML ───────────────────────────────────────── */
function captionHtml(caption: string): string {
  if (!caption) return '';
  return `<p style="font-size:10px;color:#6b7280;margin:3px 0 0 0;font-style:italic;
    padding:5px 8px;background:#fdf2f8;border-radius:5px;border-left:3px solid #f472b6;
    line-height:1.4;">${caption}</p>`;
}

/* ══════════════════════════════════════════════════════
   레이아웃 1: 1열 세로 (single)
   사진 1장씩 풀 너비 / 원본 비율 그대로
══════════════════════════════════════════════════════ */
async function buildLayoutSingle(
  photos: Album['photos'],
): Promise<string> {
  const items = await Promise.all(
    photos.map(async (p) => {
      const b64 = await imageToBase64(p.uri);
      return `
        <div style="margin-bottom:12px;">
          ${imgTag(b64)}
          ${captionHtml(p.caption)}
        </div>`;
    })
  );
  return items.join('');
}

/* ══════════════════════════════════════════════════════
   레이아웃 2: 2열 격자 (two_col)
   2장씩 나란히 / 각 사진 원본 비율 유지
   maxHeight로 극단적으로 긴 세로사진만 제한
══════════════════════════════════════════════════════ */
async function buildLayoutTwoCol(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const maxH = pageSize === 'A5' ? '200px' : '280px';

  const rows: string[] = [];
  for (let i = 0; i < photos.length; i += 2) {
    const left = photos[i];
    const right = photos[i + 1];
    const b64L = await imageToBase64(left.uri);
    const b64R = right ? await imageToBase64(right.uri) : '';

    rows.push(`
      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          ${imgTag(b64L, `max-height:${maxH};object-fit:contain;`)}
          ${captionHtml(left.caption)}
        </div>
        <div style="flex:1;min-width:0;">
          ${right
            ? imgTag(b64R, `max-height:${maxH};object-fit:contain;`)
            : `<div style="height:60px;"></div>`}
          ${right ? captionHtml(right.caption) : ''}
        </div>
      </div>`);
  }
  return rows.join('');
}

/* ══════════════════════════════════════════════════════
   레이아웃 3: 피처 + 2열 (feature)
   첫 사진 크게(풀 너비, 원본 비율) → 나머지 2열
══════════════════════════════════════════════════════ */
async function buildLayoutFeature(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const maxH = pageSize === 'A5' ? '200px' : '280px';

  if (photos.length === 0) return '';

  const [first, ...rest] = photos;
  const b64First = await imageToBase64(first.uri);

  // 첫 사진: 피처 (풀 너비, 원본 비율)
  let html = `
    <div style="margin-bottom:10px;">
      ${imgTag(b64First)}
      ${captionHtml(first.caption)}
    </div>`;

  // 나머지: 2열
  for (let i = 0; i < rest.length; i += 2) {
    const left = rest[i];
    const right = rest[i + 1];
    const b64L = await imageToBase64(left.uri);
    const b64R = right ? await imageToBase64(right.uri) : '';

    html += `
      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          ${imgTag(b64L, `max-height:${maxH};object-fit:contain;`)}
          ${captionHtml(left.caption)}
        </div>
        <div style="flex:1;min-width:0;">
          ${right
            ? imgTag(b64R, `max-height:${maxH};object-fit:contain;`)
            : `<div style="height:60px;"></div>`}
          ${right ? captionHtml(right.caption) : ''}
        </div>
      </div>`;
  }
  return html;
}

/* ══════════════════════════════════════════════════════
   레이아웃 4: 잡지형 (magazine)
   와이드(풀 너비) → 하단 2장 패턴 반복
══════════════════════════════════════════════════════ */
async function buildLayoutMagazine(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const maxSmallH = pageSize === 'A5' ? '160px' : '220px';

  let html = '';
  let i = 0;
  while (i < photos.length) {
    // 와이드 1장 (풀 너비, 원본 비율)
    const wide = photos[i];
    const b64W = await imageToBase64(wide.uri);
    html += `
      <div style="margin-bottom:8px;">
        ${imgTag(b64W)}
        ${captionHtml(wide.caption)}
      </div>`;
    i++;

    // 하단 2장
    if (i < photos.length) {
      const left = photos[i];
      const right = photos[i + 1];
      const b64L = await imageToBase64(left.uri);
      const b64R = right ? await imageToBase64(right.uri) : '';

      html += `
        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:flex-start;">
          <div style="flex:1;min-width:0;">
            ${imgTag(b64L, `max-height:${maxSmallH};object-fit:contain;`)}
            ${captionHtml(left.caption)}
          </div>
          <div style="flex:1;min-width:0;">
            ${right
              ? imgTag(b64R, `max-height:${maxSmallH};object-fit:contain;`)
              : `<div style="height:60px;"></div>`}
            ${right ? captionHtml(right.caption) : ''}
          </div>
        </div>`;
      i += right ? 2 : 1;
    }
  }
  return html;
}

/* ══════════════════════════════════════════════════════
   레이아웃 5: 3열 격자 (three_col)
   3장씩 균등 / 원본 비율 유지
══════════════════════════════════════════════════════ */
async function buildLayoutThreeCol(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const maxH = pageSize === 'A5' ? '150px' : '200px';

  const rows: string[] = [];
  for (let i = 0; i < photos.length; i += 3) {
    const group = photos.slice(i, i + 3);
    const cells = await Promise.all(
      group.map(async (p) => {
        const b64 = await imageToBase64(p.uri);
        return `
          <div style="flex:1;min-width:0;">
            ${imgTag(b64, `max-height:${maxH};object-fit:contain;`)}
            ${captionHtml(p.caption)}
          </div>`;
      })
    );
    // 빈 셀 채우기
    while (cells.length < 3) {
      cells.push(`<div style="flex:1;"></div>`);
    }
    rows.push(`
      <div style="display:flex;gap:6px;margin-bottom:8px;align-items:flex-start;">
        ${cells.join('')}
      </div>`);
  }
  return rows.join('');
}

/* ── 레이아웃 디스패처 ───────────────────────────────── */
async function buildPhotoLayout(
  photos: Album['photos'],
  layout: LayoutType,
  pageSize: PageSize
): Promise<string> {
  if (photos.length === 0) return '<p style="color:#9CA3AF;text-align:center;padding:20px;">사진 없음</p>';
  switch (layout) {
    case 'single':     return buildLayoutSingle(photos);
    case 'two_col':    return buildLayoutTwoCol(photos, pageSize);
    case 'feature':    return buildLayoutFeature(photos, pageSize);
    case 'magazine':   return buildLayoutMagazine(photos, pageSize);
    case 'three_col':  return buildLayoutThreeCol(photos, pageSize);
    default:           return buildLayoutFeature(photos, pageSize);
  }
}

/* ── 레이아웃별 기본 설명 ────────────────────────────── */
const LAYOUT_LABELS: Record<LayoutType, string> = {
  single:    '1열 세로 배치',
  two_col:   '2열 격자 배치',
  feature:   '피처 + 2열 배치',
  magazine:  '잡지형 배치',
  three_col: '3열 격자 배치',
};

/* ── 파일명 안전하게 변환 (특수문자 제거) ─────────────── */
function safeFileName(title: string, date: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '').trim() || '앨범';
  const dateStr = date.replace(/-/g, '').slice(0, 8); // YYYYMMDD
  return `${safe}_${dateStr}`;
}

/* ── 단일 앨범 HTML 생성 ─────────────────────────────── */
async function buildAlbumHtml(
  album: Album,
  layout: LayoutType,
  pageSize: PageSize
): Promise<string> {
  const isA5 = pageSize === 'A5';
  const padding = isA5 ? 18 : 24;
  const titleSize = isA5 ? 16 : 20;
  const metaSize = isA5 ? 10 : 11;
  const storySize = isA5 ? 11 : 13;
  const coverTitleSize = isA5 ? 24 : 30;
  const coverSubSize = isA5 ? 12 : 14;

  const photoHtml = await buildPhotoLayout(album.photos, layout, pageSize);
  const weatherStr = album.weatherEmoji
    ? `${album.weatherEmoji} ${WEATHER_LABEL[album.weather] ?? album.weather}`
    : '';

  /* 표지 */
  const coverPage = `
    <div style="page-break-after:always;
      min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      background:linear-gradient(160deg,#f472b6 0%,#c084fc 60%,#818cf8 100%);
      padding:${padding}px;text-align:center;position:relative;">

      <div style="font-size:${isA5 ? 48 : 60}px;margin-bottom:16px;">📸</div>

      <h1 style="color:#fff;font-size:${coverTitleSize}px;font-weight:800;
        margin:0 0 8px 0;line-height:1.2;
        text-shadow:0 2px 8px rgba(0,0,0,0.15);">
        ${album.title || '우리 아이의 하루'}
      </h1>
      <p style="color:rgba(255,255,255,0.9);font-size:${coverSubSize}px;
        margin:0 0 20px 0;line-height:1.5;">
        소중한 순간을 담은 사진 이야기
      </p>

      <div style="width:40px;height:2px;background:rgba(255,255,255,0.6);
        border-radius:2px;margin-bottom:20px;"></div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <span style="background:rgba(255,255,255,0.25);
          border-radius:20px;padding:6px 12px;color:#fff;
          font-size:${isA5 ? 10 : 12}px;font-weight:600;">
          📅 ${formatDateKorean(album.date)}
        </span>
        <span style="background:rgba(255,255,255,0.25);
          border-radius:20px;padding:6px 12px;color:#fff;
          font-size:${isA5 ? 10 : 12}px;font-weight:600;">
          🖼️ ${album.photos.length}장의 사진
        </span>
        ${album.location ? `
        <span style="background:rgba(255,255,255,0.25);
          border-radius:20px;padding:6px 12px;color:#fff;
          font-size:${isA5 ? 10 : 12}px;font-weight:600;">
          📍 ${album.location}
        </span>` : ''}
      </div>

      <p style="position:absolute;bottom:${padding}px;
        color:rgba(255,255,255,0.45);font-size:9px;margin:0;">
        ${pageSize} · ${LAYOUT_LABELS[layout]}
      </p>
    </div>`;

  /* 본문 */
  const contentPage = `
    <div style="padding:${padding}px;
      font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
      background:#fff;">

      <!-- 앨범 헤더 -->
      <div style="border-bottom:2px solid #f472b6;padding-bottom:8px;margin-bottom:10px;">
        <h1 style="color:#1f2937;font-size:${titleSize}px;margin:0 0 6px 0;
          font-weight:700;line-height:1.2;">
          ${album.title || '우리 아이의 하루'}
        </h1>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span style="display:inline-flex;align-items:center;gap:3px;
            background:#fdf2f8;border-radius:20px;padding:3px 8px;
            font-size:${metaSize}px;color:#6b7280;">
            📅 ${formatDateKorean(album.date)}
          </span>
          ${album.location
            ? `<span style="display:inline-flex;align-items:center;gap:3px;
                background:#faf5ff;border-radius:20px;padding:3px 8px;
                font-size:${metaSize}px;color:#6b7280;">📍 ${album.location}</span>`
            : ''}
          ${weatherStr
            ? `<span style="display:inline-flex;align-items:center;gap:3px;
                background:#eff6ff;border-radius:20px;padding:3px 8px;
                font-size:${metaSize}px;color:#6b7280;">${weatherStr}</span>`
            : ''}
        </div>
      </div>

      <!-- 이야기 -->
      ${album.story
        ? `<div style="margin-bottom:10px;padding:8px 12px;
            background:linear-gradient(135deg,#fdf2f8,#faf5ff);
            border-radius:8px;border-left:3px solid #c084fc;">
            <p style="margin:0;font-size:${storySize}px;color:#1f2937;line-height:1.6;">
              ${album.story}
            </p>
          </div>`
        : ''}

      <!-- 사진 레이아웃 -->
      <div>${photoHtml}</div>
    </div>`;

  return `
    <!DOCTYPE html><html>
    <head>
      <meta charset="utf-8"/>
      <title>${album.title || '앨범'}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; }
        img { display: block; max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      ${coverPage}
      ${contentPage}
    </body>
    </html>`;
}

/* ══════════════════════════════════════════════════════
   메인 generatePDF
   앨범 1개씩 개별 PDF 생성 → 순서대로 공유
══════════════════════════════════════════════════════ */
export async function generatePDF(
  albums: Album[],
  pageSize: PageSize = 'A5',
  layout: LayoutType = 'feature',
  onProgress?: (current: number, total: number, albumTitle: string) => void
): Promise<void> {
  const { width, height } = PAGE_DIMENSIONS[pageSize];
  const canShare = await Sharing.isAvailableAsync();

  for (let i = 0; i < albums.length; i++) {
    const album = albums[i];
    onProgress?.(i + 1, albums.length, album.title || '앨범');

    const html = await buildAlbumHtml(album, layout, pageSize);
    const { uri } = await Print.printToFileAsync({ html, width, height, base64: false });

    // 파일명: 앨범명_날짜.pdf
    const fileName = safeFileName(album.title, album.date) + '.pdf';

    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: '.pdf',
        dialogTitle: fileName,
      });
    }
  }
}
