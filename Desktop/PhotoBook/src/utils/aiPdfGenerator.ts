import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Album } from '../types';

export type PageSize = 'A4' | 'A5';
export type ProgressCallback = (percent: number, albumTitle: string, step: string) => void;

/* ── Anthropic API Key ──────────────────────────────────────
   프로젝트 루트 .env 파일에 다음을 추가하세요:
   EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   없으면 AI 캡션 없이 레이아웃만 자동 생성됩니다.
────────────────────────────────────────────────────────────── */
const ANTHROPIC_API_KEY: string =
  (typeof process !== 'undefined' ? (process.env as Record<string,string>).EXPO_PUBLIC_ANTHROPIC_API_KEY : undefined) ?? '';

/* ── 페이지 그리드 수치 ─────────────────────────────────────
   페이지를 꽉 채우는 edge-to-edge 레이아웃
   A5: 4장/페이지 (2열 × 2행) — 헤더 26px, 셀 간격 2px
   A4: 6장/페이지 (2열 × 3행) — 헤더 28px, 셀 간격 2px
   캡션은 사진 아래 별도 22px 공간 (오버레이 아님)
────────────────────────────────────────────────────────────── */
interface GridSpec {
  pw: number; ph: number;
  gap: number; headerH: number;
  cols: number; rows: number;
  cellW: number; cellH: number;
  titleSz: number; metaSz: number;
}

const GRID: Record<'A5' | 'A4', GridSpec> = {
  A5: {
    pw: 420, ph: 595,
    gap: 2, headerH: 26,
    cols: 2, rows: 2,
    cellW: 209,   // (420 - 2) / 2
    cellH: 283,   // (595 - 26 - 2) / 2   [gap 2px between rows]
    titleSz: 11, metaSz: 9,
  },
  A4: {
    pw: 595, ph: 842,
    gap: 2, headerH: 28,
    cols: 2, rows: 3,
    cellW: 296,   // (595 - 2) / 2  (소수점 내림)
    cellH: 270,   // (842 - 28 - 4) / 3   [gap 2px × 2]
    titleSz: 13, metaSz: 10,
  },
};

/* ── 색상 테마 ──────────────────────────────────────────────
   Claude가 사진 무드에 따라 자동 선택합니다.
────────────────────────────────────────────────────────────── */
const THEME = {
  warm:    { primary: '#B45309', text: '#7C2D12', border: '#FDE68A', pageBg: '#FFFBF5', headerBg: '#FFF7ED' },
  cool:    { primary: '#1D4ED8', text: '#1E3A8A', border: '#BFDBFE', pageBg: '#F0F9FF', headerBg: '#EFF6FF' },
  neutral: { primary: '#4B5563', text: '#111827', border: '#E5E7EB', pageBg: '#FAFAFA', headerBg: '#F9FAFB' },
  vibrant: { primary: '#BE185D', text: '#831843', border: '#FBCFE8', pageBg: '#FFF0F8', headerBg: '#FDF2F8' },
} as const;
type ColorTheme = keyof typeof THEME;

/* ── AI 분석 결과 타입 ──────────────────────────────────────*/
interface AlbumAI {
  coverCaption: string;
  colorTheme: ColorTheme;
  photoCaptions: string[];
}

/* ── Base64 변환 ─────────────────────────────────────────── */
async function imageToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpeg';
    return `data:image/${ext};base64,${base64}`;
  } catch {
    return '';
  }
}

/* ── Claude API 호출: 사진 분석 + 감성 캡션 생성 ─────────── */
const AI_BATCH = 5; // 한 번에 분석할 사진 수

async function analyzeWithClaude(
  photosData: { base64: string; caption: string }[],
  albumTitle: string,
  dateStr: string,
  onStep: (msg: string) => void,
): Promise<AlbumAI> {
  // API key 없을 때: 앨범명 문자 합산으로 테마 결정 → 앨범마다 일관된 다양한 테마
  const THEMES_ORDER: ColorTheme[] = ['warm', 'vibrant', 'cool', 'neutral'];
  const titleHash = albumTitle.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const monthTheme = THEMES_ORDER[titleHash % 4];

  const fallback: AlbumAI = {
    coverCaption: `${albumTitle}의 소중한 순간들`,
    colorTheme: monthTheme,
    photoCaptions: photosData.map((p) => p.caption || ''),
  };

  if (!ANTHROPIC_API_KEY) return fallback;

  const allCaptions: string[] = [];
  let coverCaption = '';
  let colorTheme: ColorTheme = 'warm';

  for (let i = 0; i < photosData.length; i += AI_BATCH) {
    const batch = photosData.slice(i, i + AI_BATCH);
    onStep(`AI 분석 중... (${i + 1}–${Math.min(i + AI_BATCH, photosData.length)}/${photosData.length}장)`);

    const imageBlocks = batch.map((p) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: (p.base64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg') as 'image/jpeg' | 'image/png',
        data: p.base64.replace(/^data:[^;]+;base64,/, ''),
      },
    }));

    const isFirst = i === 0;
    const prompt = isFirst
      ? `앨범명: "${albumTitle}", 날짜: ${dateStr}. 이 사진 ${batch.length}장을 보고 JSON만 출력하세요 (설명 없이):\n{"coverCaption":"앨범 전체 분위기 한줄(20자이내)","colorTheme":"warm|cool|neutral|vibrant","captions":["각 사진 감성 캡션(12자이내)"]}`
      : `이 사진 ${batch.length}장의 감성 캡션을 JSON만 출력하세요:\n{"captions":["각 사진 캡션(12자이내)"]}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: prompt }],
          }],
        }),
      });

      const data = await res.json();
      const rawText: string = data?.content?.[0]?.text ?? '';
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (isFirst) {
          coverCaption = String(parsed.coverCaption ?? '');
          const ct = parsed.colorTheme;
          if (ct && ct in THEME) colorTheme = ct as ColorTheme;
        }
        const caps: string[] = Array.isArray(parsed.captions) ? parsed.captions : [];
        for (let j = 0; j < batch.length; j++) {
          allCaptions.push(String(caps[j] ?? batch[j].caption ?? ''));
        }
      } else {
        batch.forEach((p) => allCaptions.push(p.caption || ''));
      }
    } catch {
      batch.forEach((p) => allCaptions.push(p.caption || ''));
    }
  }

  return {
    coverCaption: coverCaption || fallback.coverCaption,
    colorTheme,
    photoCaptions: allCaptions,
  };
}

/* ── 표지 페이지 HTML ───────────────────────────────────────
   - 첫 번째 사진을 전면 배경으로 사용
   - 어두운 오버레이 위에 앨범 정보 표시
   - CSS table로 세로 중앙 정렬 (WKWebView 안정적)
────────────────────────────────────────────────────────────── */
function buildCoverHtml(
  album: Album,
  ai: AlbumAI,
  coverBase64: string,
  isA5: boolean,
  dateStr: string,
  weatherStr: string,
): string {
  const g = GRID[isA5 ? 'A5' : 'A4'];
  const albumTitle = album.title || '우리 아이의 하루';
  const titleSz = isA5 ? 26 : 36;
  const captionSz = isA5 ? 12 : 15;
  const metaSz = isA5 ? 11 : 13;
  const padTop = isA5 ? 28 : 40;
  const padBottom = isA5 ? 24 : 32;

  const bgImg = coverBase64
    ? `<img src="${coverBase64}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:${THEME[ai.colorTheme].primary};"></div>`;

  const metaLine = [
    weatherStr,
    album.location ? `&#128205; ${album.location}` : '',
  ].filter(Boolean).join('&nbsp;&nbsp;');

  return `
  <div style="position:relative;width:100%;height:${g.ph}px;overflow:hidden;page-break-after:always;">
    ${bgImg}
    <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.54);"></div>
    <!-- 상단 날짜 배지 -->
    <div style="position:absolute;top:${padTop}px;left:0;right:0;text-align:center;">
      <span style="display:inline-block;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.36);border-radius:30px;padding:5px 18px;color:rgba(255,255,255,0.92);font-size:${metaSz}px;font-weight:600;letter-spacing:0.5px;">${dateStr}</span>
    </div>
    <!-- 중앙 타이틀 (CSS table 세로 중앙 정렬) -->
    <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:table;">
      <div style="display:table-cell;vertical-align:middle;text-align:center;padding:${isA5?60:80}px ${isA5?30:44}px;">
        <div style="color:#fff;font-size:${titleSz}px;font-weight:900;line-height:1.2;text-shadow:0 2px 14px rgba(0,0,0,0.45);margin-bottom:${isA5?12:16}px;">${albumTitle}</div>
        <div style="width:32px;height:3px;background:rgba(255,255,255,0.65);border-radius:2px;margin:0 auto ${isA5?14:18}px;"></div>
        <div style="color:rgba(255,255,255,0.88);font-size:${captionSz}px;line-height:1.7;">${ai.coverCaption}</div>
      </div>
    </div>
    <!-- 하단 메타 -->
    <div style="position:absolute;bottom:${padBottom}px;left:0;right:0;text-align:center;">
      ${metaLine ? `<div style="color:rgba(255,255,255,0.78);font-size:${metaSz}px;margin-bottom:6px;">${metaLine}</div>` : ''}
      <div style="color:rgba(255,255,255,0.55);font-size:${metaSz - 1}px;">&#128247; ${album.photos.length}장의 사진</div>
    </div>
  </div>`;
}

/* ── 사진 페이지 HTML (1페이지 분량) ──────────────────────
   캡션: 사진 아래 별도 22px 공간 (오버레이 아님)
   레이아웃: 페이지마다 다른 패턴 순환
     A5(4장): L0=표준 2×2 / L1=큰사진(왼)+3장(오른쪽) / L2=±3°기울기 / L3=3장(왼쪽)+큰사진(오른)
     A4(6장): L0=표준 2×3 / L1=3열×2행 / L2=±2°기울기
────────────────────────────────────────────────────────────── */
function buildPhotoPageHtml(
  chunk: { base64: string; aiCaption: string }[],
  isA5: boolean,
  albumTitle: string,
  themeKey: ColorTheme,
  pageNum: number,
  totalPages: number,
): string {
  const g = GRID[isA5 ? 'A5' : 'A4'];
  const c = THEME[themeKey];
  const CAP_H = 22;
  const contentH = g.ph - g.headerH;

  /* 사진 셀: flex 기반, object-fit:contain으로 사진 잘림 없이 전체 표시 */
  const cell = (
    photo: { base64: string; aiCaption: string } | null,
    h: number,
    imgRotate = 0,
    flexVal = '1',
  ) => {
    const ih = h - CAP_H;
    const rotStyle = imgRotate
      ? `transform:rotate(${imgRotate}deg);transform-origin:center center;`
      : '';
    const imgEl = photo?.base64
      ? `<img src="${photo.base64}" style="width:100%;height:${ih}px;object-fit:contain;display:block;background:${c.pageBg};${rotStyle}" />`
      : `<div style="width:100%;height:${ih}px;background:#E5E7EB;"></div>`;
    const capEl = `<div style="height:${CAP_H}px;line-height:${CAP_H}px;background:${c.headerBg};color:${c.text};font-size:${isA5 ? 8 : 9}px;font-weight:500;text-align:center;padding:0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${photo?.aiCaption || '\u00A0'}</div>`;
    return `<div style="flex:${flexVal};height:${h}px;overflow:hidden;">${imgEl}${capEl}</div>`;
  };

  /* 헬퍼: flexbox 기반 행/열 */
  const hgap = `<div style="flex:0 0 ${g.gap}px;background:${c.pageBg};"></div>`;
  const vgap = `<div style="height:${g.gap}px;background:${c.pageBg};"></div>`;
  const row = (h: number, ...cols: string[]) =>
    `<div style="height:${h}px;display:flex;align-items:stretch;">${cols.join('')}</div>`;
  const ph = (i: number) => chunk[i] ?? null;

  let gridHtml = '';

  if (isA5) {
    // A5: 4장/페이지 — 4가지 레이아웃 순환
    const li = (pageNum - 1) % 4;
    const ch = g.cellH; // 283
    const ch2 = contentH - ch - g.gap; // 마지막 행 높이 (1px 오차 보정)

    if (li === 0) {
      // ── L0: 표준 2×2
      gridHtml = [
        row(ch, cell(ph(0), ch), hgap, cell(ph(1), ch)),
        vgap,
        row(ch2, cell(ph(2), ch2), hgap, cell(ph(3), ch2)),
      ].join('');

    } else if (li === 1) {
      // ── L1: 큰 사진(왼쪽 60%) + 3장 세로(오른쪽)
      const smH = Math.floor((contentH - g.gap * 2) / 3);
      const lastH = contentH - smH * 2 - g.gap * 2;
      gridHtml = row(contentH,
        cell(ph(0), contentH, 0, '0 0 60%'),
        hgap,
        `<div style="flex:1;display:flex;flex-direction:column;height:${contentH}px;">` +
          row(smH, cell(ph(1), smH)) + vgap +
          row(smH, cell(ph(2), smH)) + vgap +
          row(lastH, cell(ph(3), lastH)) +
        `</div>`,
      );

    } else if (li === 2) {
      // ── L2: 2×2, 교차 기울기 ±3°
      gridHtml = [
        row(ch, cell(ph(0), ch, 3), hgap, cell(ph(1), ch, -3)),
        vgap,
        row(ch2, cell(ph(2), ch2, -3), hgap, cell(ph(3), ch2, 3)),
      ].join('');

    } else {
      // ── L3: 3장 세로(왼쪽) + 큰 사진(오른쪽 60%) — L1 미러
      const smH = Math.floor((contentH - g.gap * 2) / 3);
      const lastH = contentH - smH * 2 - g.gap * 2;
      gridHtml = row(contentH,
        `<div style="flex:1;display:flex;flex-direction:column;height:${contentH}px;">` +
          row(smH, cell(ph(0), smH)) + vgap +
          row(smH, cell(ph(1), smH)) + vgap +
          row(lastH, cell(ph(2), lastH)) +
        `</div>`,
        hgap,
        cell(ph(3), contentH, 0, '0 0 60%'),
      );
    }

  } else {
    // A4: 6장/페이지 — 3가지 레이아웃 순환
    const li = (pageNum - 1) % 3;
    const ch = g.cellH; // 270
    const ch2 = contentH - ch * 2 - g.gap * 2; // 마지막 행 (A4는 814=270*3+4 ✓)

    if (li === 0) {
      // ── L0: 표준 2×3
      gridHtml = [
        row(ch, cell(ph(0), ch), hgap, cell(ph(1), ch)),
        vgap,
        row(ch, cell(ph(2), ch), hgap, cell(ph(3), ch)),
        vgap,
        row(ch2, cell(ph(4), ch2), hgap, cell(ph(5), ch2)),
      ].join('');

    } else if (li === 1) {
      // ── L1: 3열 × 2행
      const rh1 = Math.floor((contentH - g.gap) / 2);
      const rh2 = contentH - rh1 - g.gap;
      gridHtml = [
        row(rh1, cell(ph(0), rh1), hgap, cell(ph(1), rh1), hgap, cell(ph(2), rh1)),
        vgap,
        row(rh2, cell(ph(3), rh2), hgap, cell(ph(4), rh2), hgap, cell(ph(5), rh2)),
      ].join('');

    } else {
      // ── L2: 2×3, 교차 기울기 ±2°
      const rots = [2, -2, -2, 2, 2, -2];
      gridHtml = [
        row(ch, cell(ph(0), ch, rots[0]), hgap, cell(ph(1), ch, rots[1])),
        vgap,
        row(ch, cell(ph(2), ch, rots[2]), hgap, cell(ph(3), ch, rots[3])),
        vgap,
        row(ch2, cell(ph(4), ch2, rots[4]), hgap, cell(ph(5), ch2, rots[5])),
      ].join('');
    }
  }

  return `<div style="page-break-before:always;page-break-inside:avoid;width:100%;height:${g.ph}px;overflow:hidden;background:${c.pageBg};"><div style="height:${g.headerH}px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:${c.headerBg};border-bottom:2px solid ${c.primary};"><span style="font-size:${g.titleSz}px;font-weight:700;color:${c.primary};">${albumTitle}</span><span style="font-size:${g.metaSz}px;color:${c.text};opacity:0.5;">${pageNum} / ${totalPages}</span></div><div style="width:100%;height:${contentH}px;overflow:hidden;">${gridHtml}</div></div>`;
}

/* ── 파일명 정제 ─────────────────────────────────────────── */
function safeFileName(title: string): string {
  const now = new Date();
  const tag = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const safe = title.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 28);
  return `${safe}_AI_${tag}`;
}

/* ══════════════════════════════════════════════════════════
   메인: AI 자동 레이아웃 PDF 생성
   1. 사진 → base64 변환
   2. Claude API로 사진 분석 (캡션, 테마색)
   3. 표지 + 사진 페이지 HTML 생성
   4. expo-print로 PDF 렌더링
   5. 저장 + 공유
══════════════════════════════════════════════════════════ */
export async function generateAIPDF(
  albums: Album[],
  pageSize: PageSize,
  onProgress: ProgressCallback,
  onComplete: (count: number) => void,
): Promise<void> {
  const isA5 = pageSize === 'A5';
  const g = GRID[isA5 ? 'A5' : 'A4'];
  const perPage = g.cols * g.rows; // A5=4, A4=6
  const total = albums.length;
  const canShare = await Sharing.isAvailableAsync();
  const tempDir = (FileSystem.cacheDirectory ?? '') + 'pdf_ai/';
  await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

  for (let albumIdx = 0; albumIdx < total; albumIdx++) {
    const album = albums[albumIdx];
    const albumTitle = album.title || '우리 아이의 하루';
    const albumStart = Math.round((albumIdx / total) * 100);
    const albumEnd   = Math.round(((albumIdx + 1) / total) * 100);
    const pct = (r: number) => Math.min(albumEnd - 1, albumStart + Math.round((albumEnd - albumStart) * r));

    /* 1. base64 변환 */
    onProgress(pct(0), albumTitle, '이미지 준비 중...');
    const photosData = await Promise.all(
      album.photos.map(async (p, idx) => {
        onProgress(
          pct(0.05 + 0.35 * ((idx + 1) / Math.max(album.photos.length, 1))),
          albumTitle,
          `이미지 변환 중... (${idx + 1}/${album.photos.length})`,
        );
        return { base64: await imageToBase64(p.uri), caption: p.caption ?? '' };
      }),
    );

    /* 날짜 · 날씨 문자열 */
    const d = new Date(album.date);
    const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    const weatherStr = album.weatherEmoji
      ? `${album.weatherEmoji} ${(album as any).weather ?? ''}`.trim()
      : '';

    /* 2. Claude AI 분석 */
    onProgress(pct(0.42), albumTitle, 'AI 분석 준비 중...');
    const ai = await analyzeWithClaude(
      photosData, albumTitle, dateStr,
      (msg) => onProgress(pct(0.42), albumTitle, msg),
    );

    /* 3. HTML 구성 */
    onProgress(pct(0.82), albumTitle, '페이지 구성 중...');
    const coverHtml = buildCoverHtml(album, ai, photosData[0]?.base64 ?? '', isA5, dateStr, weatherStr);

    const totalPhotoPages = Math.ceil(photosData.length / perPage);
    const photoPages = Array.from({ length: totalPhotoPages }, (_, pi) => {
      const chunk = photosData.slice(pi * perPage, (pi + 1) * perPage).map((p, j) => ({
        base64: p.base64,
        aiCaption: ai.photoCaptions[pi * perPage + j] ?? p.caption ?? '',
      }));
      return buildPhotoPageHtml(chunk, isA5, albumTitle, ai.colorTheme, pi + 1, totalPhotoPages);
    });

    const pageBg = THEME[ai.colorTheme].pageBg;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    html, body { width:100%; margin:0; padding:0; background:${pageBg}; font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif; print-color-adjust:exact !important; -webkit-print-color-adjust:exact !important; }
    img  { display:block; }
    @page { margin:0; size:${isA5 ? '420pt 595pt' : '595pt 842pt'}; background:${pageBg}; }
  </style>
</head>
<body>${coverHtml}${photoPages.join('')}</body>
</html>`;

    /* 4. PDF 생성 */
    onProgress(pct(0.89), albumTitle, 'PDF 변환 중...');
    const { uri: rawUri } = await Print.printToFileAsync({ html, width: g.pw, height: g.ph, base64: false });

    /* 5. 파일 저장 + 공유 */
    onProgress(pct(0.96), albumTitle, '파일 저장 중...');
    const fileName = `${safeFileName(albumTitle)}.pdf`;
    const destUri = tempDir + fileName;
    const existing = await FileSystem.getInfoAsync(destUri);
    if (existing.exists) await FileSystem.deleteAsync(destUri, { idempotent: true });
    await FileSystem.moveAsync({ from: rawUri, to: destUri });

    onProgress(albumEnd, albumTitle, '완료!');
    if (canShare) {
      await Sharing.shareAsync(destUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: fileName,
      });
    }
  }

  onComplete(total);
}
