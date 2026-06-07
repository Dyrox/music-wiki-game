import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Round, RoundTile } from '../types';
import { SafeImg } from './ui';

function fmt(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RoundCard({
  onBegin,
}: {
  onBegin: (
    start: { id: number; name: string },
    target: { id: number; name: string },
    minMoves: number,
    roundId: number,
  ) => void;
}) {
  const [round, setRound] = useState<Round | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const offset = useRef(0); // serverClock - clientClock
  const rolled = useRef(false);

  async function load() {
    try {
      const r = await api.round();
      offset.current = r.serverNow - Date.now();
      rolled.current = false;
      setErr(null);
      setRound(r);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!round) return;
    const tick = () => {
      const now = Date.now() + offset.current;
      const left = Math.max(0, Math.round((round.endsAt - now) / 1000));
      setSecs(left);
      if (left <= 0 && !rolled.current) {
        rolled.current = true;
        // wait a beat for the server to roll over, then fetch the next round
        setTimeout(() => void load(), 1200);
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [round]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* header strip with live countdown */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#2b2b3a] to-[#3a2b3a] px-6 py-3 text-white">
        <span className="flex items-center gap-2 font-semibold">
          🎮 本轮挑战
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
            每 3 分钟换一题 · 全员同题
          </span>
        </span>
        <span className="text-sm text-white/80">
          {secs <= 0 ? '换题中…' : <>下一轮 <span className="font-bold tabular-nums text-amber-300">{fmt(secs)}</span></>}
        </span>
      </div>

      <div className="px-6 py-8">
        {err ? (
          <div className="py-8 text-center text-sm text-gray-400">加载失败：{err}</div>
        ) : !round ? (
          <div className="py-8 text-center text-sm text-gray-400">加载本轮题目…</div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-8 sm:gap-14">
              <Tile tile={round.start} label="起点" />
              <div className="flex flex-col items-center gap-1 text-gray-300">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <Tile tile={round.target} label="终点" target />
            </div>

            <div className="mt-7 flex flex-col items-center gap-3">
              <button
                onClick={() =>
                  onBegin(
                    { id: round.start.id, name: round.start.name },
                    { id: round.target.id, name: round.target.name },
                    round.minMoves,
                    round.roundId,
                  )
                }
                className="w-full max-w-xs rounded-full bg-nred py-3 text-[15px] font-medium text-white hover:bg-nredDark"
              >
                开始本轮 · 最少 {round.minMoves} 步
              </button>
              <span className="text-xs text-gray-400">
                第 #{round.roundId} 轮 · 用合作歌曲从「{round.start.name}」走到「{round.target.name}」
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ tile, label, target }: { tile: RoundTile; label: string; target?: boolean }) {
  return (
    <div className="flex w-32 flex-col items-center gap-3 text-center">
      <div className="relative">
        <SafeImg
          src={tile.picUrl}
          seed={tile.name}
          size={300}
          className={`h-28 w-28 rounded-full object-cover shadow ${
            target ? 'ring-4 ring-amber-300' : 'ring-2 ring-gray-100'
          }`}
        />
        <span
          className={`absolute -top-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            target ? 'bg-amber-400 text-black' : 'bg-gray-800 text-white'
          }`}
        >
          {target ? '🎯 终点' : '起点'}
        </span>
      </div>
      <div className="text-base font-bold leading-tight text-gray-900">{tile.name}</div>
    </div>
  );
}
