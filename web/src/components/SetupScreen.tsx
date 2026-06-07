import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Challenge, SearchArtist } from '../types';
import type { GameMode } from '../game';
import { SearchPicker } from './SearchPicker';

export function SetupScreen({
  onBegin,
}: {
  onBegin: (
    mode: GameMode,
    start: { id: number; name: string },
    target: { id: number; name: string },
    minMoves: number | null,
    date?: string,
  ) => void;
}) {
  const [daily, setDaily] = useState<Challenge | null>(null);
  const [dailyErr, setDailyErr] = useState<string | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [start, setStart] = useState<SearchArtist | null>(null);
  const [target, setTarget] = useState<SearchArtist | null>(null);

  useEffect(() => {
    api
      .daily()
      .then(setDaily)
      .catch((e) => setDailyErr((e as Error).message));
  }, []);

  async function startRandom() {
    setLoadingRandom(true);
    try {
      const c = await api.random();
      onBegin('random', c.start, c.target, c.minMoves);
    } catch (e) {
      alert('生成随机挑战失败：' + (e as Error).message);
    } finally {
      setLoadingRandom(false);
    }
  }

  return (
    <div className="mx-auto max-w-[920px] px-6 py-12">
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
        <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 text-xs text-gray-400">
          <span className="rounded bg-gray-100 px-2 py-1">Dyrox</span>
          <span>—《frozen heart.》→</span>
          <span className="rounded bg-gray-100 px-2 py-1">8bite</span>
        </div>
      </div>

      {/* mode cards */}
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {/* daily */}
        <Card title="每日挑战" badge="每天同一题">
          {dailyErr ? (
            <div className="text-sm text-gray-400">加载失败：{dailyErr}</div>
          ) : !daily ? (
            <div className="text-sm text-gray-400">加载今日题目…</div>
          ) : (
            <>
              <Pairing start={daily.start.name} target={daily.target.name} />
              <div className="mt-1 text-xs text-gray-400">
                {daily.date} · 最少 {daily.minMoves} 步
              </div>
              <button
                onClick={() =>
                  onBegin('daily', daily.start, daily.target, daily.minMoves, daily.date)
                }
                className="mt-4 w-full rounded-full bg-nred py-2.5 text-sm font-medium text-white hover:bg-nredDark"
              >
                开始今日挑战
              </button>
            </>
          )}
        </Card>

        {/* random */}
        <Card title="随机挑战" badge="保证有解">
          <p className="text-sm text-gray-500">
            随机抽一对相连的歌手，难度 2–5 步。每局都不一样。
          </p>
          <button
            onClick={startRandom}
            disabled={loadingRandom}
            className="mt-4 w-full rounded-full bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {loadingRandom ? '生成中…' : '随机来一局'}
          </button>
        </Card>
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
              placeholder="例如：8bite"
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

function Pairing({ start, target }: { start: string; target: string }) {
  return (
    <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
      <span className="rounded-md bg-gray-100 px-2 py-1">{start}</span>
      <span className="text-gray-300">——→</span>
      <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">🎯 {target}</span>
    </div>
  );
}
