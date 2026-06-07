import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { ArtistData, ArtistRef } from '../types';
import { SafeImg, Spinner } from './ui';
import { SongRow } from './SongRow';

const TABS = ['歌曲', '专辑', 'MV', '歌手详情', '相似歌手'] as const;

export function ArtistPage({
  artistId,
  targetId,
  visitedIds,
  onTravel,
}: {
  artistId: number;
  targetId: number;
  visitedIds: Set<number>;
  onTravel: (a: ArtistRef) => void;
}) {
  const [data, setData] = useState<ArtistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collabOnly, setCollabOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setCollabOnly(false);
    api
      .artist(artistId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [artistId]);

  const edgeCount = useMemo(
    () =>
      data
        ? data.songs.filter((s) => s.artists.some((a) => a.id !== artistId)).length
        : 0,
    [data, artistId],
  );

  const shownSongs = useMemo(() => {
    if (!data) return [];
    return collabOnly
      ? data.songs.filter((s) => s.artists.some((a) => a.id !== artistId))
      : data.songs;
  }, [data, collabOnly, artistId]);

  if (error)
    return (
      <div className="py-20 text-center text-gray-400">
        加载歌手失败：{error}
      </div>
    );
  if (!data) return <Spinner label="加载歌手主页…" />;

  const subtitle = [data.trans, ...data.alias].filter(Boolean).join(' / ');

  return (
    <div className="animate-pop pb-24">
      {/* ---- header ---- */}
      <div className="flex items-center gap-8 pt-8">
        <SafeImg
          src={data.picUrl}
          seed={data.name}
          size={400}
          className="h-40 w-40 shrink-0 rounded-full object-cover shadow-sm"
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900">{data.name || `#${data.id}`}</h1>
          {subtitle && <div className="mt-2 text-sm text-gray-400">{subtitle}</div>}
          <div className="mt-5 flex items-center gap-3">
            <button className="flex items-center gap-1.5 rounded-full bg-nred px-5 py-2 text-sm font-medium text-white hover:bg-nredDark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              播放全部
            </button>
            <button className="rounded-full border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50">
              + 关注
            </button>
          </div>
        </div>
      </div>

      {/* ---- tabs ---- */}
      <div className="mt-8 flex items-center gap-7 border-b border-gray-100 text-[15px]">
        {TABS.map((t, i) => {
          const count = t === '专辑' ? data.albumSize : t === 'MV' ? data.mvSize : 0;
          const active = i === 0;
          return (
            <div
              key={t}
              className={`-mb-px cursor-default border-b-2 pb-3 ${
                active
                  ? 'border-nred font-semibold text-gray-900'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t}
              {count > 0 && <sup className="ml-0.5 text-[11px] text-gray-400">{count}</sup>}
            </div>
          );
        })}
      </div>

      {/* ---- hot songs ---- */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          热门歌曲 <span className="text-gray-300">›</span>
        </h2>
        <button
          onClick={() => setCollabOnly((v) => !v)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            collabOnly
              ? 'border-nred bg-nred text-white'
              : 'border-gray-200 text-gray-500 hover:border-nred hover:text-nred'
          }`}
        >
          {collabOnly ? '✓ ' : '🔗 '}只看可通行的合作曲（{edgeCount}）
        </button>
      </div>

      {/* table header */}
      <div className="mt-3 grid grid-cols-[40px_1fr_minmax(110px,210px)_52px_64px] border-b border-gray-100 px-2 pb-2 text-xs text-gray-400">
        <div className="text-center">#</div>
        <div>标题</div>
        <div>专辑</div>
        <div className="text-center">喜欢</div>
        <div className="text-right">时长</div>
      </div>

      <div className="mt-1">
        {shownSongs.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            {collabOnly ? '这位歌手没有可作为通道的合作曲 😢 换条路走吧' : '暂无歌曲'}
          </div>
        )}
        {shownSongs.map((song, i) => (
          <SongRow
            key={song.id}
            song={song}
            index={i}
            artistId={artistId}
            targetId={targetId}
            visitedIds={visitedIds}
            onTravel={onTravel}
          />
        ))}
      </div>
    </div>
  );
}
