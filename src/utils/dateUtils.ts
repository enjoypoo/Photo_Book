export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
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
