import type { Song } from './types';

export function mmss(ms: number): string {
  if (!ms || ms < 0) return '00:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function elapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** NetEase-style quality / type tags derived from the song fee + mv flag. */
export function songTags(song: Song): string[] {
  const tags: string[] = ['超清母带'];
  // fee: 0 free, 1 vip, 4 digital-album, 8 free-ish/paid-preview
  if (song.fee === 1) tags.push('VIP');
  else if (song.fee === 4) tags.push('数字专辑');
  if (song.hasMv) tags.push('MV');
  return tags;
}

/** Avatar/cover fallback when NetEase has no image. */
export function imgFallback(seed: string): string {
  // deterministic pastel block via a data URI
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='hsl(${hue},45%,82%)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
