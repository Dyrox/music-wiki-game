import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { SearchArtist } from '../types';
import { SafeImg } from './ui';

export function SearchPicker({
  label,
  selected,
  onPick,
  placeholder,
}: {
  label: string;
  selected: SearchArtist | null;
  onPick: (a: SearchArtist | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchArtist[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .search(q)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>

      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <SafeImg
            src={selected.picUrl}
            seed={selected.name}
            size={60}
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="flex-1 truncate text-sm font-medium text-gray-800">
            {selected.name}
          </span>
          <button
            onClick={() => {
              onPick(null);
              setQ('');
            }}
            className="text-gray-400 hover:text-nred"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder ?? '搜索歌手…'}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-nred"
        />
      )}

      {open && !selected && (
        <div className="no-scrollbar absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-100 bg-white py-1 shadow-xl">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">搜索中…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">没有结果</div>
          )}
          {results.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onPick(a);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <SafeImg
                src={a.picUrl}
                seed={a.name}
                size={60}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="flex-1 truncate text-sm text-gray-800">{a.name}</span>
              <span className="text-xs text-gray-400">{a.musicSize} 首</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
