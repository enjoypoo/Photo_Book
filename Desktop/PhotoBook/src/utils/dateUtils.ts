export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}

/** 촬영 시간 포함 포맷 (1장일 때) */
export function formatDateTimeKorean(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours < 12 ? '오전' : '오후';
  const h12 = hours % 12 || 12;
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek}) ${ampm} ${h12}:${minutes}`;
}

/** 날짜 기간 포맷 (여러 장이고 날짜가 다를 때) */
export function formatDateRange(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const sy = start.getFullYear(), sm = start.getMonth() + 1, sd = start.getDate();
  const ey = end.getFullYear(), em = end.getMonth() + 1, ed = end.getDate();
  if (sy === ey) {
    if (sm === em) return `${sy}년 ${sm}월 ${sd}일 ~ ${ed}일`;
    return `${sy}년 ${sm}월 ${sd}일 ~ ${em}월 ${ed}일`;
  }
  return `${sy}년 ${sm}월 ${sd}일 ~ ${ey}년 ${em}월 ${ed}일`;
}

/** 앨범 날짜 표시: dateEnd 있으면 기간, 시간 포함(T)이면 시간 포함, 아니면 날짜만 */
export function formatAlbumDate(date: string, dateEnd?: string): string {
  if (dateEnd && dateEnd !== date) {
    return formatDateRange(date, dateEnd);
  }
  // 시간 포함 여부 확인 (ISO 형식 'T' 포함)
  if (date.includes('T')) {
    return formatDateTimeKorean(date);
  }
  return formatDateKorean(date);
}

export function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function groupAlbumsByMonth(albums: { date: string }[]): Record<string, typeof albums> {
  const grouped: Record<string, typeof albums> = {};
  for (const album of albums) {
    const key = formatMonthYear(album.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(album);
  }
  return grouped;
}

/** EXIF 날짜 문자열 "YYYY:MM:DD HH:MM:SS" → ISO Date */
export function parseExifDate(exifStr: string): Date | null {
  try {
    // 형식: "2024:03:15 14:30:00"
    const clean = exifStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** 날짜 문자열에서 YYYY-MM-DD 부분만 추출 */
export function toDateOnly(dateStr: string): string {
  return dateStr.split('T')[0];
}
