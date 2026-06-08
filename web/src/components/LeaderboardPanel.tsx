import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { getClientId, useUsername } from '../player';
import { elapsed } from '../format';
import type { RoundState } from '../types';

export function LeaderboardPanel() {
  const [state, setState] = useState<RoundState | null>(null);
  const [tab, setTab] = useState<'results' | 'online'>('results');
  const me = useUsername();
  const meRef = useRef(me);
  meRef.current = me; // always heartbeat with the latest (possibly renamed) handle

  // Poll lobby state AND heartbeat on every tick, so a new player is registered
  // on their very first fetch and everyone refreshes quickly.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.roundState();
        if (!alive) return;
        setState(s);
        api.heartbeat(
          getClientId(),
          meRef.current,
          s.round.start.id,
          s.round.target.id,
          'browsing',
        );
      } catch {
        /* ignore */
      }
    };
    tick();
    const poll = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, []);

  const online = state?.online ?? [];
  const results = state?.results ?? [];

  // disqualified entries (used a hint) still show, but don't take a place
  let place = 0;
  const ranked = results.map((r) => {
    if (!r.dq) place++;
    return { ...r, place: r.dq ? null : place };
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          🏆 排行榜
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {state ? `${state.onlineCount} 人在线` : '…'}
        </span>
      </div>

      {/* tabs */}
      <div className="flex border-b border-gray-100 text-sm">
        <TabBtn active={tab === 'results'} onClick={() => setTab('results')}>
          本轮成绩 {results.length > 0 && `(${results.length})`}
        </TabBtn>
        <TabBtn active={tab === 'online'} onClick={() => setTab('online')}>
          在线玩家 {online.length > 0 && `(${online.length})`}
        </TabBtn>
      </div>

      <div className="no-scrollbar max-h-[420px] overflow-y-auto">
        {tab === 'results' ? (
          results.length === 0 ? (
            <Empty text="还没有人通关本轮，快去抢第一！" />
          ) : (
            ranked.map((r, i) => (
              <Row key={`${r.name}-${i}`} highlight={r.name === me}>
                <span className="w-7 shrink-0 text-center text-sm tabular-nums text-gray-400">
                  {r.place == null ? (
                    <span title="使用了提示，不计排名">🚫</span>
                  ) : (
                    `#${r.place}`
                  )}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-gray-800">
                  {r.name}
                  {r.name === me && <Me />}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {r.dq ? (
                    '已用提示'
                  ) : (
                    <>
                      <b className="text-gray-700">{r.moves}</b> 步 · {elapsed(r.timeMs)}
                    </>
                  )}
                </span>
              </Row>
            ))
          )
        ) : online.length === 0 ? (
          <Empty text="暂时没人在玩，你就是唯一的玩家 😎" />
        ) : (
          online.map((p) => (
            <Row key={p.name} highlight={p.name === me}>
              <span className="flex-1 truncate text-sm font-medium text-gray-800">
                {p.name}
                {p.name === me && <Me />}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                  p.status === 'playing'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {p.status === 'playing' ? '🎮 在玩' : '👀 浏览中'}
              </span>
            </Row>
          ))
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 border-b-2 px-3 py-2.5 font-medium transition ${
        active
          ? 'border-nred text-gray-900'
          : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function Row({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-2.5 ${
        highlight ? 'bg-nred/5' : 'odd:bg-gray-50/60'
      }`}
    >
      {children}
    </div>
  );
}

function Me() {
  return (
    <span className="ml-1.5 rounded bg-nred px-1.5 py-0.5 text-[10px] font-bold text-white">
      你
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-sm text-gray-400">{text}</div>;
}
