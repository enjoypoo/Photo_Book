import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Album } from '../types';
import { formatDateKorean } from './dateUtils';
import { WEATHER_LABEL } from '../constants';

async function imageToBase64(uri: string): Promise<string> {
  try {
    // expo-file-system 최신 버전 방식
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    // 이미지 확장자 판단
    const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpeg';
    return `data:image/${ext};base64,${base64}`;
  } catch (e) {
    console.warn('imageToBase64 error:', e);
    return '';
  }
}

export async function generatePDF(albums: Album[]): Promise<void> {
  const albumSections = await Promise.all(
    albums.map(async (album) => {
      const photoRows = await Promise.all(
        album.photos.map(async (photo) => {
          const b64 = await imageToBase64(photo.uri);
          const imgTag = b64
            ? `<img src="${b64}" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;margin-bottom:8px;" />`
            : `<div style="width:100%;height:160px;background:#f3e8ff;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#a855f7;font-size:32px;">📷</div>`;
          const captionHtml = photo.caption
            ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 12px 0;font-style:italic;padding:8px 12px;background:#fdf2f8;border-radius:8px;border-left:3px solid #f472b6;">${photo.caption}</p>`
            : '';
          return `<div style="margin-bottom:20px;">${imgTag}${captionHtml}</div>`;
        })
      );

      const weatherStr = album.weatherEmoji
        ? `${album.weatherEmoji} ${WEATHER_LABEL[album.weather] ?? album.weather}`
        : '';

      return `
        <div style="page-break-after:always;padding:36px;font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#fff;">
          <div style="border-bottom:3px solid #f472b6;padding-bottom:16px;margin-bottom:24px;">
            <h1 style="color:#1f2937;font-size:26px;margin:0 0 12px 0;font-weight:700;">${album.title || '우리 아이의 하루'}</h1>
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
              <span style="display:inline-flex;align-items:center;gap:4px;background:#fdf2f8;border-radius:20px;padding:6px 12px;font-size:13px;color:#6b7280;">
                📅 ${formatDateKorean(album.date)}
              </span>
              ${album.location ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#faf5ff;border-radius:20px;padding:6px 12px;font-size:13px;color:#6b7280;">📍 ${album.location}</span>` : ''}
              ${weatherStr ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;border-radius:20px;padding:6px 12px;font-size:13px;color:#6b7280;">${weatherStr}</span>` : ''}
            </div>
          </div>
          ${album.story ? `
            <div style="margin-bottom:28px;padding:16px 20px;background:linear-gradient(135deg,#fdf2f8,#faf5ff);border-radius:16px;border-left:4px solid #c084fc;">
              <p style="margin:0;font-size:15px;color:#1f2937;line-height:1.8;">${album.story}</p>
            </div>` : ''}
          <div>${photoRows.join('')}</div>
        </div>`;
    })
  );

  const html = `
    <!DOCTYPE html><html>
    <head><meta charset="utf-8"/><title>아이 포토북</title>
    <style>*{box-sizing:border-box;}body{margin:0;padding:0;background:#fff;}</style>
    </head>
    <body>
      <div style="text-align:center;padding:60px 32px;background:linear-gradient(135deg,#f472b6,#c084fc);color:#fff;">
        <div style="font-size:48px;margin-bottom:16px;">📸</div>
        <h1 style="font-size:36px;margin:0 0 8px 0;font-weight:700;">우리 아이 추억 앨범</h1>
        <p style="font-size:16px;opacity:0.9;margin:0;">소중한 순간을 담은 사진 이야기</p>
      </div>
      ${albumSections.join('')}
    </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
}
