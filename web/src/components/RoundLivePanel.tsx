import { useEffect, useState } from 'react';
import { api } from '../api';
import { useUsername } from '../player';
import { elapsed } from '../format';
import type { RoomState } from '../types';

const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * In-game live standings, The-Wiki-Game style: a floating, collapsible card on
 * the play page that shows how many people are on this start→target pair right
 * now and who has already reached the target (ranked 1st/2nd/3rd… by moves,
 * then time). Keyed by the pair, so round and custom mode share a board.
 *
 * Read-only — it never heartbeats. App.tsx already announces our "playing"
 * presence, so here we only poll the shared room state.
 */
export function RoundLivePanel({
  startId,
  targetId,
}: {
  startId: number;
  targetId: number;
}) {
  const [state, setState] = useState<RoomState | null>(null);
  const [open, setOpen] = useState(true);
  const me = useUsername();

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.roomState(startId, targetId);
        if (alive) setState(s);
      } catch {
        /* ignore transient errors */
      }
    };
    tick();
    const poll = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [startId, targetId]);

  const online = state?.online ?? [];
  const results = state?.results ?? [];
  const onlineCount = state?.onlineCount ?? 0;
  const playing = online.filter((p) => p.status === 'playing').length;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[262px] max-w-[calc(100vw-2rem)]">
      {open ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#2b2b3a] to-[#3a2b3a] px-4 py-2.5 text-white">
            <span className="text-sm font-semibold">🏁 实时战况</span>
            <button
              onClick={() => setOpen(false)}
              title="收起"
              className="rounded-full px-2 py-0.5 text-xs text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              收起 ▾
            </button>
          </div>

          {/* live counts */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {onlineCount} 在线
            </span>
            <span className="flex items-center gap-1">🎮 {playing} 在玩</span>
            {results.length > 0 && (
              <span className="ml-auto">🏁 {results.length} 已抵达</span>
            )}
          </div>

          {/* finishers, ranked */}
          <div className="no-scrollbar max-h-[260px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-7 text-center text-xs leading-relaxed text-gray-400">
                还没有人抵达终点
                <br />
                抢下第一个 🚩
              </div>
            ) : (
              results.map((r, i) => {
                const mine = r.name === me;
                return (
                  <div
                    key={`${r.name}-${i}`}
                    className={`flex items-center gap-2.5 px-4 py-2 ${
                      mine ? 'bg-nred/5' : 'odd:bg-gray-50/60'
                    }`}
                  >
                    <span className="w-6 shrink-0 text-center text-sm">
                      {i < 3 ? (
                        MEDAL[i]
                      ) : (
                        <span className="text-xs tabular-nums text-gray-400">#{i + 1}</span>
                      )}
                    </span>
                    <span className="flex-1 truncate text-[13px] font-medium text-gray-800">
                      {r.name}
                      {mine && (
                        <span className="ml-1.5 rounded bg-nred px-1.5 py-0.5 text-[10px] font-bold text-white">
                          你
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-gray-400">
                      <b className="text-gray-700">{r.moves}</b> 步 · {elapsed(r.timeMs)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#2b2b3a] px-4 py-2 text-sm font-medium text-white shadow-xl transition hover:bg-[#3a2b3a]"
        >
          🏁 实时战况
          <span className="flex items-center gap-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {onlineCount}
          </span>
        </button>
      )}
    </div>
  );
}
