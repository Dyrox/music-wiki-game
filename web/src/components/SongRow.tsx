import type { ArtistRef, Song } from '../types';
import { mmss, songTags } from '../format';
import { prefetchArtist } from '../api';
import { SafeImg } from './ui';

const tagStyle: Record<string, string> = {
  超清母带: 'text-amber-500 border-amber-300',
  VIP: 'text-nred border-red-300',
  数字专辑: 'text-nred border-red-300',
  MV: 'text-nred border-red-300',
};

function Heart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-300">
      <path
        d="M12 20s-7-4.35-7-9.5A3.5 3.5 0 0112 7a3.5 3.5 0 017 3.5C19 15.65 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SongRow({
  song,
  index,
  artistId,
  targetId,
  visitedIds,
  onTravel,
}: {
  song: Song;
  index: number;
  artistId: number;
  targetId: number;
  visitedIds: Set<number>;
  onTravel: (a: ArtistRef) => void;
}) {
  const coArtists = song.artists.filter((a) => a.id !== artistId);
  const isEdge = coArtists.length > 0;
  const hasTarget = coArtists.some((a) => a.id === targetId);

  return (
    <div
      className={`group grid grid-cols-[30px_1fr_56px] items-center rounded-md px-2 py-2 text-sm transition sm:grid-cols-[40px_1fr_minmax(110px,210px)_52px_64px] ${
        hasTarget
          ? 'bg-amber-50 ring-1 ring-amber-200'
          : isEdge
            ? 'bg-rose-50/60 hover:bg-rose-50'
            : 'hover:bg-gray-50'
      }`}
    >
      {/* index */}
      <div className="text-center text-xs tabular-nums text-gray-300">
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* title cell */}
      <div className="flex min-w-0 items-center gap-3 pr-3">
        <SafeImg
          src={song.album.picUrl}
          seed={song.album.name || song.name}
          size={80}
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-gray-800">{song.name}</span>
            {song.alia[0] && (
              <span className="truncate text-gray-400">（{song.alia[0]}）</span>
            )}
            {isEdge && (
              <span
                className={`ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  hasTarget ? 'bg-amber-400 text-black' : 'bg-nred text-white'
                }`}
              >
                {hasTarget ? '🎯 终点在这' : '🔗 可通行'}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {songTags(song).map((t) => (
              <span
                key={t}
                className={`rounded border px-1 text-[10px] leading-4 ${
                  tagStyle[t] ?? 'text-gray-400 border-gray-300'
                }`}
              >
                {t}
              </span>
            ))}
            {/* artist chips — co-artists are the traversable edges */}
            <span className="flex flex-wrap items-center gap-1 text-xs">
              {song.artists.map((a, i) => {
                const isSelf = a.id === artistId;
                const isTarget = a.id === targetId;
                if (isSelf) {
                  return (
                    <span key={`${a.id}-${i}`} className="text-gray-400">
                      {i > 0 && <span className="text-gray-300"> / </span>}
                      {a.name}
                    </span>
                  );
                }
                return (
                  <span key={`${a.id}-${i}`} className="flex items-center">
                    {i > 0 && <span className="text-gray-300"> / </span>}
                    <button
                      onClick={() => onTravel({ id: a.id, name: a.name })}
                      onMouseEnter={() => prefetchArtist(a.id)}
                      className={`group/chip inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium transition ${
                        isTarget
                          ? 'bg-amber-400 text-black hover:bg-amber-300'
                          : 'text-nred hover:bg-nred hover:text-white'
                      } ${visitedIds.has(a.id) && !isTarget ? 'opacity-60' : ''}`}
                      title={`经《${song.name}》前往 ${a.name}`}
                    >
                      {isTarget && '🎯'}
                      {a.name}
                      <span className="opacity-60 group-hover/chip:translate-x-0.5 transition">
                        ›
                      </span>
                    </button>
                  </span>
                );
              })}
            </span>
          </div>
        </div>
      </div>

      {/* album */}
      <div className="hidden truncate pr-2 text-xs text-gray-400 sm:block">
        {song.album.name}
      </div>

      {/* like */}
      <div className="hidden justify-center sm:flex">
        <Heart />
      </div>

      {/* duration */}
      <div className="text-right text-xs tabular-nums text-gray-400">
        {mmss(song.durationMs)}
      </div>
    </div>
  );
}
