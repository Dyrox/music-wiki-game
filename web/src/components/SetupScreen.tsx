import { useState } from 'react';
import type { SearchArtist } from '../types';
import type { GameMode } from '../game';
import { SearchPicker } from './SearchPicker';
import { RoundCard } from './RoundCard';
import { LeaderboardPanel } from './LeaderboardPanel';
import { HandleEditor } from './HandleEditor';

export function SetupScreen({
  onBegin,
}: {
  onBegin: (
    mode: GameMode,
    start: { id: number; name: string },
    target: { id: number; name: string },
    minMoves: number | null,
    roundId?: number,
    roundEndsAt?: number,
  ) => void;
}) {
  const [start, setStart] = useState<SearchArtist | null>(null);
  const [target, setTarget] = useState<SearchArtist | null>(null);

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-10">
      {/* hero */}
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-nred/10 px-3 py-1 text-xs font-medium text-nred">
          🎵 网易云 · 音乐人 WikiGame
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          从一位歌手，走到另一位歌手
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-gray-500">
          每一步都要通过一首<b className="text-nred">合作歌曲</b>跳转 —— 在歌手主页里找到 TA
          和别人合作的曲子，点开合作者，就走到了下一位歌手。用最少的步数抵达终点。
        </p>
        <div className="mt-3">
          <HandleEditor />
        </div>
      </div>

      {/* lobby: round on the left, leaderboard on the right */}
      <div className="mt-9 grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
        <RoundCard
          onBegin={(s, t, minMoves, roundId, roundEndsAt) =>
            onBegin('round', s, t, minMoves, roundId, roundEndsAt)
          }
        />
        <LeaderboardPanel />
      </div>

      {/* free mode */}
      <div className="mt-5">
        <Card title="自由模式" badge="自己出题">
          <p className="mb-4 text-sm text-gray-500">
            任选起点和终点歌手，挑战自己能不能连起来（不保证一定有路）。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchPicker
              label="起点歌手"
              selected={start}
              onPick={setStart}
              placeholder="例如：Dyrox"
            />
            <SearchPicker
              label="终点歌手"
              selected={target}
              onPick={setTarget}
              placeholder="例如：Alan Walker"
            />
          </div>
          <button
            disabled={!start || !target || start.id === target.id}
            onClick={() =>
              start &&
              target &&
              onBegin(
                'free',
                { id: start.id, name: start.name },
                { id: target.id, name: target.name },
                null,
              )
            }
            className="mt-5 w-full rounded-full bg-nred py-2.5 text-sm font-medium text-white hover:bg-nredDark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {start && target && start.id === target.id
              ? '起点和终点不能相同'
              : '开始自由挑战'}
          </button>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {badge && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
