import { useEffect, useState } from 'react';
import type { Action, GameState } from '../game';
import { currentArtist, moveCount } from '../game';
import { elapsed } from '../format';
import { api } from '../api';
import type { ArtistRef } from '../types';

const modeLabel: Record<string, string> = {
  free: '自由模式',
  daily: '每日挑战',
  random: '随机挑战',
};

export function GameHud({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  const [now, setNow] = useState(Date.now());
  const [hint, setHint] = useState<{
    loading: boolean;
    next?: ArtistRef;
    full?: ArtistRef[];
    error?: string;
    reveal?: boolean;
  } | null>(null);

  useEffect(() => {
    if (state.phase !== 'playing') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state.phase]);

  // clear any hint after each move
  useEffect(() => setHint(null), [state.path.length]);

  const cur = currentArtist(state);
  const moves = moveCount(state);
  const time = elapsed((state.endTime ?? now) - state.startTime);

  async function loadHint(reveal: boolean) {
    setHint({ loading: true, reveal });
    try {
      const res = await api.path(cur.id, state.target.id);
      if (!res.path || res.path.length < 2) {
        setHint({ loading: false, error: '这一步附近找不到通往终点的合作路径 🤔' });
        return;
      }
      setHint({
        loading: false,
        reveal,
        next: res.path[1],
        full: res.path,
      });
    } catch (e) {
      setHint({ loading: false, error: (e as Error).message });
    }
  }

  return (
    <div className="z-30 bg-gradient-to-r from-[#2b2b3a] to-[#3a2b3a] text-white shadow-md">
      <div className="mx-auto max-w-[1100px] px-6 py-2.5">
        {/* row 1: endpoints + stats + controls */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
            {modeLabel[state.mode]}
          </span>

          <div className="flex items-center gap-2 text-sm">
            <Endpoint label="起点" name={state.start.name} tone="start" />
            <Arrow />
            <Endpoint label="终点" name={state.target.name} tone="target" />
          </div>

          <div className="ml-auto flex items-center gap-4 text-sm">
            <Stat
              label="步数"
              value={
                state.minMoves != null ? `${moves} / 最少 ${state.minMoves}` : String(moves)
              }
            />
            <Stat label="用时" value={time} mono />
            <div className="flex items-center gap-2">
              <Btn onClick={() => loadHint(false)}>提示</Btn>
              <Btn onClick={() => loadHint(true)}>看路线</Btn>
              <Btn onClick={() => dispatch({ type: 'restart' })}>重开</Btn>
              <Btn onClick={() => dispatch({ type: 'exit' })} ghost>
                退出
              </Btn>
            </div>
          </div>
        </div>

        {/* row 2: breadcrumb path */}
        <div className="no-scrollbar mt-2 flex items-center gap-1 overflow-x-auto pb-0.5 text-sm">
          {state.path.map((a, i) => (
            <span key={`${a.id}-${i}`} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className="text-white/30">›</span>}
              <button
                onClick={() => dispatch({ type: 'jumpTo', index: i })}
                className={`rounded px-2 py-0.5 transition ${
                  i === state.path.length - 1
                    ? 'bg-nred font-medium text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                title={i < state.path.length - 1 ? '点击回退到这里' : undefined}
              >
                {a.name || `#${a.id}`}
              </button>
            </span>
          ))}
        </div>

        {/* hint output */}
        {hint && (
          <div className="mt-2 rounded-md bg-black/25 px-3 py-2 text-xs">
            {hint.loading && <span className="text-white/70">正在搜索合作路径…</span>}
            {hint.error && <span className="text-amber-300">{hint.error}</span>}
            {!hint.loading && !hint.error && hint.reveal && hint.full && (
              <span>
                <span className="text-white/60">最短已知路线：</span>
                {hint.full.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && <span className="text-white/30"> › </span>}
                    <span className={i === 0 ? 'text-white/50' : 'text-emerald-300'}>
                      {a.name}
                    </span>
                  </span>
                ))}
              </span>
            )}
            {!hint.loading && !hint.error && !hint.reveal && hint.next && (
              <span>
                <span className="text-white/60">下一步可以走到 </span>
                <span className="font-medium text-emerald-300">{hint.next.name}</span>
                <span className="text-white/60">（在 TA 的合作曲里找）</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Endpoint({
  label,
  name,
  tone,
}: {
  label: string;
  name: string;
  tone: 'start' | 'target';
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-white/45 text-xs">{label}</span>
      <span
        className={`rounded-md px-2 py-0.5 font-medium ${
          tone === 'target' ? 'bg-amber-400/90 text-black' : 'bg-white/15 text-white'
        }`}
      >
        {tone === 'target' ? '🎯 ' : ''}
        {name}
      </span>
    </span>
  );
}

function Arrow() {
  return <span className="text-white/40">——→</span>;
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-white/45 text-xs">{label}</span>
      <span className={`font-semibold ${mono ? 'tabular-nums' : ''}`}>{value}</span>
    </span>
  );
}

function Btn({
  children,
  onClick,
  ghost,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ghost?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        ghost
          ? 'text-white/60 hover:bg-white/10 hover:text-white'
          : 'bg-white/15 hover:bg-white/25'
      }`}
    >
      {children}
    </button>
  );
}
