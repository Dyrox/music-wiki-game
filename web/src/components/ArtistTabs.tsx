import { useEffect, useState } from 'react';
import { api } from '../api';
import { mmss } from '../format';
import type { Album, ArtistDesc, Mv } from '../types';
import { SafeImg, Spinner } from './ui';

function useResource<T>(load: () => Promise<T>, dep: number) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setData(null);
    setErr(null);
    load()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
  return { data, err };
}

function year(ms: number): string {
  if (!ms) return '';
  const y = new Date(ms).getFullYear();
  return Number.isFinite(y) ? String(y) : '';
}

function State({ err, empty }: { err: string | null; empty?: boolean }) {
  if (err) return <div className="py-16 text-center text-sm text-gray-400">加载失败：{err}</div>;
  if (empty) return <div className="py-16 text-center text-sm text-gray-400">暂无内容</div>;
  return <Spinner />;
}

export function AlbumsPanel({ artistId }: { artistId: number }) {
  const { data, err } = useResource<Album[]>(() => api.albums(artistId), artistId);
  if (!data) return <State err={err} />;
  if (data.length === 0) return <State err={null} empty />;
  return (
    <div className="grid grid-cols-2 gap-5 py-5 sm:grid-cols-3 md:grid-cols-4">
      {data.map((a) => (
        <div key={a.id} className="group">
          <SafeImg
            src={a.picUrl}
            seed={a.name}
            size={300}
            className="aspect-square w-full rounded-lg object-cover shadow-sm"
          />
          <div className="mt-2 truncate text-sm font-medium text-gray-800" title={a.name}>
            {a.name}
          </div>
          <div className="text-xs text-gray-400">
            {year(a.publishTime)}
            {a.size ? ` · ${a.size} 首` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MvsPanel({ artistId }: { artistId: number }) {
  const { data, err } = useResource<Mv[]>(() => api.mvs(artistId), artistId);
  if (!data) return <State err={err} />;
  if (data.length === 0) return <State err={null} empty />;
  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-3">
      {data.map((m) => (
        <div key={m.id} className="group">
          <div className="relative overflow-hidden rounded-lg shadow-sm">
            <SafeImg
              src={m.picUrl}
              seed={m.name}
              className="aspect-video w-full object-cover"
            />
            {m.durationMs > 0 && (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                {mmss(m.durationMs)}
              </span>
            )}
          </div>
          <div className="mt-2 truncate text-sm font-medium text-gray-800" title={m.name}>
            {m.name}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DescPanel({ artistId }: { artistId: number }) {
  const { data, err } = useResource<ArtistDesc>(() => api.desc(artistId), artistId);
  if (!data) return <State err={err} />;
  const hasContent = data.briefDesc || data.sections.length > 0;
  if (!hasContent) return <State err={null} empty />;
  return (
    <div className="max-w-3xl py-6">
      {data.briefDesc && (
        <p className="mb-6 whitespace-pre-line text-[15px] leading-relaxed text-gray-600">
          {data.briefDesc}
        </p>
      )}
      {data.sections.map((s, i) => (
        <section key={i} className="mb-6">
          {s.ti && <h3 className="mb-2 text-base font-bold text-gray-900">{s.ti}</h3>}
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-600">
            {s.txt}
          </p>
        </section>
      ))}
    </div>
  );
}

export function SimiPanel() {
  return (
    <div className="py-20 text-center">
      <div className="text-3xl">🔒</div>
      <div className="mt-3 text-sm text-gray-400">
        相似歌手需要登录网易云账号才能查看
      </div>
    </div>
  );
}
