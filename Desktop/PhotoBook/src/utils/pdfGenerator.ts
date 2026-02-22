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

/* ── 이미지 태그 생성 ────────────────────────────────── */
function imgTag(b64: string, style: string): string {
  return b64
    ? `<img src="${b64}" style="${style}" />`
    : `<div style="${style};background:#f3e8ff;display:flex;align-items:center;justify-content:center;color:#a855f7;font-size:28px;">📷</div>`;
}

/* ── 캡션 HTML ───────────────────────────────────────── */
function captionHtml(caption: string): string {
  if (!caption) return '';
  return `<p style="font-size:11px;color:#6b7280;margin:4px 0 0 0;font-style:italic;
    padding:6px 10px;background:#fdf2f8;border-radius:6px;border-left:3px solid #f472b6;
    line-height:1.5;">${caption}</p>`;
}

/* ══════════════════════════════════════════════════════
   레이아웃 1: 1열 세로 (single)
   사진 1장씩 풀 너비로 순서대로 배치
══════════════════════════════════════════════════════ */
async function buildLayoutSingle(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const isA5 = pageSize === 'A5';
  const imgH = isA5 ? '200px' : '280px';

  const items = await Promise.all(
    photos.map(async (p) => {
      const b64 = await imageToBase64(p.uri);
      return `
        <div style="margin-bottom:16px;">
          ${imgTag(b64, `width:100%;height:${imgH};object-fit:cover;border-radius:10px;display:block;`)}
          ${captionHtml(p.caption)}
        </div>`;
    })
  );
  return items.join('');
}

/* ══════════════════════════════════════════════════════
   레이아웃 2: 2열 격자 (two_col)
   2장씩 나란히 균등 격자
══════════════════════════════════════════════════════ */
async function buildLayoutTwoCol(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const isA5 = pageSize === 'A5';
  const imgH = isA5 ? '130px' : '180px';

  const rows: string[] = [];
  for (let i = 0; i < photos.length; i += 2) {
    const left = photos[i];
    const right = photos[i + 1];
    const b64L = await imageToBase64(left.uri);
    const b64R = right ? await imageToBase64(right.uri) : '';

    rows.push(`
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="flex:1;">
          ${imgTag(b64L, `width:100%;height:${imgH};object-fit:cover;border-radius:10px;display:block;`)}
          ${captionHtml(left.caption)}
        </div>
        <div style="flex:1;">
          ${right
            ? imgTag(b64R, `width:100%;height:${imgH};object-fit:cover;border-radius:10px;display:block;`)
            : `<div style="flex:1;height:${imgH};border-radius:10px;background:#F9FAFB;"></div>`}
          ${right ? captionHtml(right.caption) : ''}
        </div>
      </div>`);
  }
  return rows.join('');
}

/* ══════════════════════════════════════════════════════
   레이아웃 3: 피처 + 2열 (feature)
   첫 사진 크게(풀 너비) → 나머지 2열
══════════════════════════════════════════════════════ */
async function buildLayoutFeature(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const isA5 = pageSize === 'A5';
  const featureH = isA5 ? '190px' : '260px';
  const gridH = isA5 ? '120px' : '165px';

  if (photos.length === 0) return '';

  const [first, ...rest] = photos;
  const b64First = await imageToBase64(first.uri);

  // 첫 사진: 피처 (풀 너비)
  let html = `
    <div style="margin-bottom:10px;">
      ${imgTag(b64First, `width:100%;height:${featureH};object-fit:cover;border-radius:10px;display:block;`)}
      ${captionHtml(first.caption)}
    </div>`;

  // 나머지: 2열
  for (let i = 0; i < rest.length; i += 2) {
    const left = rest[i];
    const right = rest[i + 1];
    const b64L = await imageToBase64(left.uri);
    const b64R = right ? await imageToBase64(right.uri) : '';

    html += `
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="flex:1;">
          ${imgTag(b64L, `width:100%;height:${gridH};object-fit:cover;border-radius:10px;display:block;`)}
          ${captionHtml(left.caption)}
        </div>
        <div style="flex:1;">
          ${right
            ? imgTag(b64R, `width:100%;height:${gridH};object-fit:cover;border-radius:10px;display:block;`)
            : `<div style="height:${gridH};border-radius:10px;background:#F9FAFB;"></div>`}
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
  const isA5 = pageSize === 'A5';
  const wideH = isA5 ? '160px' : '220px';
  const smallH = isA5 ? '100px' : '135px';

  let html = '';
  let i = 0;
  while (i < photos.length) {
    // 와이드 1장
    const wide = photos[i];
    const b64W = await imageToBase64(wide.uri);
    html += `
      <div style="margin-bottom:8px;">
        ${imgTag(b64W, `width:100%;height:${wideH};object-fit:cover;border-radius:10px;display:block;`)}
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
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <div style="flex:1;">
            ${imgTag(b64L, `width:100%;height:${smallH};object-fit:cover;border-radius:10px;display:block;`)}
            ${captionHtml(left.caption)}
          </div>
          <div style="flex:1;">
            ${right
              ? imgTag(b64R, `width:100%;height:${smallH};object-fit:cover;border-radius:10px;display:block;`)
              : `<div style="height:${smallH};border-radius:10px;background:#F9FAFB;"></div>`}
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
   3장씩 균등 격자
══════════════════════════════════════════════════════ */
async function buildLayoutThreeCol(
  photos: Album['photos'],
  pageSize: PageSize
): Promise<string> {
  const isA5 = pageSize === 'A5';
  const imgH = isA5 ? '90px' : '120px';

  const rows: string[] = [];
  for (let i = 0; i < photos.length; i += 3) {
    const group = photos.slice(i, i + 3);
    const cells = await Promise.all(
      group.map(async (p) => {
        const b64 = await imageToBase64(p.uri);
        return `
          <div style="flex:1;">
            ${imgTag(b64, `width:100%;height:${imgH};object-fit:cover;border-radius:8px;display:block;`)}
            ${captionHtml(p.caption)}
          </div>`;
      })
    );
    // 빈 셀 채우기
    while (cells.length < 3) {
      cells.push(`<div style="flex:1;height:${imgH};border-radius:8px;background:#F9FAFB;"></div>`);
    }
    rows.push(`<div style="display:flex;gap:8px;margin-bottom:8px;">${cells.join('')}</div>`);
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
    case 'single':     return buildLayoutSingle(photos, pageSize);
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

/* ══════════════════════════════════════════════════════
   메인 generatePDF
══════════════════════════════════════════════════════ */
export async function generatePDF(
  albums: Album[],
  pageSize: PageSize = 'A5',
  layout: LayoutType = 'feature'
): Promise<void> {
  const { width, height } = PAGE_DIMENSIONS[pageSize];
  const isA5 = pageSize === 'A5';

  // 용지 크기에 맞는 폰트/패딩 조정
  const padding = isA5 ? 28 : 36;
  const titleSize = isA5 ? 20 : 26;
  const metaSize = isA5 ? 11 : 13;
  const storySize = isA5 ? 13 : 15;

  const albumSections = await Promise.all(
    albums.map(async (album) => {
      const photoHtml = await buildPhotoLayout(album.photos, layout, pageSize);

      const weatherStr = album.weatherEmoji
        ? `${album.weatherEmoji} ${WEATHER_LABEL[album.weather] ?? album.weather}`
        : '';

      return `
        <div style="page-break-after:always;padding:${padding}px;
          font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
          background:#fff;min-height:100%;">

          <!-- 앨범 헤더 -->
          <div style="border-bottom:3px solid #f472b6;padding-bottom:14px;margin-bottom:20px;">
            <h1 style="color:#1f2937;font-size:${titleSize}px;margin:0 0 10px 0;font-weight:700;line-height:1.3;">
              ${album.title || '우리 아이의 하루'}
            </h1>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <span style="display:inline-flex;align-items:center;gap:4px;
                background:#fdf2f8;border-radius:20px;padding:4px 10px;
                font-size:${metaSize}px;color:#6b7280;">
                📅 ${formatDateKorean(album.date)}
              </span>
              ${album.location
                ? `<span style="display:inline-flex;align-items:center;gap:4px;
                    background:#faf5ff;border-radius:20px;padding:4px 10px;
                    font-size:${metaSize}px;color:#6b7280;">📍 ${album.location}</span>`
                : ''}
              ${weatherStr
                ? `<span style="display:inline-flex;align-items:center;gap:4px;
                    background:#eff6ff;border-radius:20px;padding:4px 10px;
                    font-size:${metaSize}px;color:#6b7280;">${weatherStr}</span>`
                : ''}
            </div>
          </div>

          <!-- 이야기 -->
          ${album.story
            ? `<div style="margin-bottom:20px;padding:14px 16px;
                background:linear-gradient(135deg,#fdf2f8,#faf5ff);
                border-radius:12px;border-left:4px solid #c084fc;">
                <p style="margin:0;font-size:${storySize}px;color:#1f2937;line-height:1.8;">
                  ${album.story}
                </p>
              </div>`
            : ''}

          <!-- 사진 레이아웃 -->
          <div>${photoHtml}</div>
        </div>`;
    })
  );

  /* ── 표지 페이지 ── */
  const coverTitleSize = isA5 ? 28 : 36;
  const coverSubSize = isA5 ? 14 : 16;
  const totalPhotos = albums.reduce((sum, a) => sum + a.photos.length, 0);
  const dateRange = albums.length > 0
    ? `${formatDateKorean(albums[0].date)} ~ ${formatDateKorean(albums[albums.length - 1].date)}`
    : '';

  const coverPage = `
    <div style="page-break-after:always;
      min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      background:linear-gradient(160deg,#f472b6 0%,#c084fc 60%,#818cf8 100%);
      padding:${padding}px;text-align:center;">

      <!-- 이모지 아이콘 -->
      <div style="font-size:${isA5 ? 56 : 72}px;margin-bottom:24px;
        filter:drop-shadow(0 4px 12px rgba(0,0,0,0.15));">📸</div>

      <!-- 타이틀 -->
      <h1 style="color:#fff;font-size:${coverTitleSize}px;font-weight:800;
        margin:0 0 12px 0;line-height:1.2;
        text-shadow:0 2px 8px rgba(0,0,0,0.15);">
        우리 아이 추억 앨범
      </h1>
      <p style="color:rgba(255,255,255,0.9);font-size:${coverSubSize}px;
        margin:0 0 32px 0;line-height:1.6;">
        소중한 순간을 담은 사진 이야기
      </p>

      <!-- 구분선 -->
      <div style="width:60px;height:3px;background:rgba(255,255,255,0.6);
        border-radius:2px;margin-bottom:32px;"></div>

      <!-- 통계 뱃지 -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
        <span style="background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);
          border-radius:20px;padding:8px 16px;color:#fff;font-size:${isA5 ? 12 : 14}px;font-weight:600;">
          📚 ${albums.length}개 앨범
        </span>
        <span style="background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);
          border-radius:20px;padding:8px 16px;color:#fff;font-size:${isA5 ? 12 : 14}px;font-weight:600;">
          🖼️ ${totalPhotos}장의 사진
        </span>
      </div>

      ${dateRange
        ? `<p style="color:rgba(255,255,255,0.75);font-size:${isA5 ? 11 : 13}px;
            margin:20px 0 0 0;">📅 ${dateRange}</p>`
        : ''}

      <!-- 용지/레이아웃 표시 -->
      <p style="position:absolute;bottom:${padding}px;
        color:rgba(255,255,255,0.5);font-size:10px;margin:0;">
        ${pageSize} · ${LAYOUT_LABELS[layout]}
      </p>
    </div>`;

  const html = `
    <!DOCTYPE html><html>
    <head>
      <meta charset="utf-8"/>
      <title>아이 포토북</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; }
        img { display: block; }
      </style>
    </head>
    <body>
      ${coverPage}
      ${albumSections.join('')}
    </body>
    </html>`;

  const { uri } = await Print.printToFileAsync({ html, width, height, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
}
