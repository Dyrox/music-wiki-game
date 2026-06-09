import { useState } from 'react';
import type { SearchArtist } from '../types';
import type { GameMode } from '../game';
import { api } from '../api';
import { SearchPicker } from './SearchPicker';
import { RoundCard } from './RoundCard';
import { LeaderboardPanel } from './LeaderboardPanel';
import { HandleEditor } from './HandleEditor';
import { SafeImg } from './ui';

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
  const [rolling, setRolling] = useState<'start' | 'target' | null>(null);

  async function roll(which: 'start' | 'target') {
    setRolling(which);
    try {
      const a = await api.randomArtist();
      (which === 'start' ? setStart : setTarget)(a);
    } catch {
      /* ignore */
    } finally {
      setRolling(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6 sm:py-10">
      {/* hero */}
      <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
        {/* left: brand + headline + tagline + handle */}
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-nred text-xl shadow-sm">
              🎵
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold text-gray-900">六度音乐人</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Six Degrees of Musicians
              </div>
            </div>
          </div>

          <h1 className="mt-7 text-4xl font-bold leading-[1.12] tracking-tight text-gray-900 sm:text-[2.85rem]">
            从一位歌手，
            <br />
            走到<span className="text-nred">另一位歌手</span>
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-500">
            每一步都要通过一首<b className="font-semibold text-nred">合作歌曲</b>跳转 —— 在歌手主页里找到
            TA 和别人合作的曲子，点开合作者，就走到了下一位歌手。用最少的步数抵达终点。
          </p>

          <div className="mt-6">
            <HandleEditor />
          </div>
        </div>

        {/* right: a concrete example of how a path connects */}
        <div className="hidden md:block">
          <ExamplePath />
        </div>
      </div>

      {/* lobby: round on the left, leaderboard on the right */}
      <div className="mt-7 grid gap-4 sm:gap-5 md:mt-9 md:grid-cols-[1.05fr_0.95fr]">
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
              onRoll={() => roll('start')}
              rolling={rolling === 'start'}
            />
            <SearchPicker
              label="终点歌手"
              selected={target}
              onPick={setTarget}
              placeholder="例如：Alan Walker"
              onRoll={() => roll('target')}
              rolling={rolling === 'target'}
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

      {/* footer / credits */}
      <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-gray-100 pt-6 text-xs text-gray-400">
        <span>
          made by{' '}
          <a
            href="https://dyrox.cat"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gray-500 transition hover:text-nred"
          >
            Dyrox
          </a>
        </span>
        <span className="text-gray-300">·</span>
        <a
          href="https://github.com/Dyrox/music-wiki-game"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-gray-500 transition hover:text-nred"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
      </footer>
    </div>
  );
}

// A concrete mini-walkthrough of a real path, in the game's own avatar idiom —
// so the landing page shows what the game *is* instead of just describing it.
const EXAMPLE = [
  { name: 'Katy Perry', pic: 'https://p3.music.126.net/A1SLzv04GMv_X8JYT5TW1Q==/109951169774663460.jpg' },
  { name: 'Zedd', pic: 'https://p3.music.126.net/kwdvsXHaoOp_ml6sIxH8YQ==/109951165543501110.jpg' },
  { name: 'Selena Gomez', pic: 'https://p3.music.126.net/mamkdYon8KMoFOM8dgMzxw==/109951169421836418.jpg' },
];

function ExamplePath() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">示例 · 怎么连起来</span>
        <span className="rounded-full bg-nred/10 px-2 py-0.5 text-[11px] font-semibold text-nred">
          2 步
        </span>
      </div>
      {EXAMPLE.map((s, i) => {
        const last = i === EXAMPLE.length - 1;
        return (
          <div key={s.name}>
            <div className="flex items-center gap-3">
              <SafeImg
                src={s.pic}
                seed={s.name}
                size={120}
                className={`h-11 w-11 shrink-0 rounded-full object-cover ${
                  last ? 'ring-2 ring-amber-300' : 'ring-1 ring-gray-100'
                }`}
              />
              <span className="flex-1 text-sm font-semibold text-gray-800">{s.name}</span>
              {i === 0 && <span className="text-[11px] text-gray-400">起点</span>}
              {last && <span className="text-sm">🎯</span>}
            </div>
            {!last && (
              <div className="ml-[21px] flex items-center gap-2 py-1.5">
                <span className="h-5 w-px bg-gray-200" />
                <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-400">
                  ♪ 一首合作曲
                </span>
              </div>
            )}
          </div>
        );
      })}
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
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
