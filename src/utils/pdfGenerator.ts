import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Album } from '../types';
import { formatDateKorean } from './dateUtils';

async function imageToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch {
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
            ? `<img src="${b64}" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:8px;" />`
            : '<div style="width:100%;height:160px;background:#f0e0e6;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#bbb;">사진 없음</div>';
          const captionHtml = photo.caption
            ? `<p style="font-size:13px;color:#555;margin:4px 0 0 0;font-style:italic;">${photo.caption}</p>`
            : '';
          return `
            <div style="margin-bottom:20px;">
              ${imgTag}
              ${captionHtml}
            </div>`;
        })
      );

      return `
        <div style="page-break-after:always;padding:32px;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
          <div style="border-bottom:3px solid #FF6B9D;padding-bottom:16px;margin-bottom:24px;">
            <h1 style="color:#FF6B9D;font-size:24px;margin:0 0 8px 0;">${album.title || '우리 아이의 하루'}</h1>
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
              <span style="color:#888;font-size:14px;">📅 ${formatDateKorean(album.date)}</span>
              ${album.location ? `<span style="color:#888;font-size:14px;">📍 ${album.location}</span>` : ''}
              ${album.weatherEmoji ? `<span style="color:#888;font-size:14px;">${album.weatherEmoji} ${album.weather}</span>` : ''}
            </div>
          </div>
          ${album.story ? `<p style="font-size:15px;color:#333;line-height:1.8;margin-bottom:24px;background:#FFF5F7;padding:16px;border-radius:12px;border-left:4px solid #FF6B9D;">${album.story}</p>` : ''}
          <div style="columns:2;column-gap:16px;">
            ${photoRows.join('')}
          </div>
        </div>`;
    })
  );

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>아이 포토북</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: white; }
      </style>
    </head>
    <body>
      <div style="text-align:center;padding:48px 32px;background:linear-gradient(135deg,#FF6B9D,#FFB3CC);color:white;">
        <h1 style="font-size:36px;margin:0 0 8px 0;">📸 아이 포토북</h1>
        <p style="font-size:16px;opacity:0.9;margin:0;">소중한 추억을 담은 사진 이야기</p>
      </div>
      ${albumSections.join('')}
    </body>
    </html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
}
