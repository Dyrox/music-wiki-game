import { useState } from 'react';
import type { Action, GameState } from '../game';
import { moveCount } from '../game';
import { elapsed } from '../format';

const modeName: Record<string, string> = {
  free: '自由模式',
  daily: '每日挑战',
  random: '随机挑战',
  round: '本轮挑战',
};

export function WinModal({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  const [copied, setCopied] = useState(false);
  const moves = moveCount(state);
  const time = elapsed((state.endTime ?? Date.now()) - state.startTime);
  const optimal = state.minMoves != null && moves <= state.minMoves;
  const pathStr = state.path.map((a) => a.name).join(' › ');

  function share() {
    const lines = [
      `🎵 音乐人WikiGame · ${modeName[state.mode]}${state.date ? ' ' + state.date : ''}`,
      `${state.start.name} → 🎯 ${state.target.name}`,
      `${optimal ? '🏆' : '✅'} ${moves} 步${
        state.minMoves != null ? ` / 最少 ${state.minMoves} 步` : ''
      } · ⏱ ${time}`,
      pathStr,
    ];
    navigator.clipboard?.writeText(lines.join('\n')).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="animate-pop w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="text-5xl">{optimal ? '🏆' : '🎉'}</div>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">
          {optimal ? '完美通关！' : '通关！'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {state.start.name} → {state.target.name}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat
            big
            label="步数"
            value={
              state.minMoves != null ? `${moves} / ${state.minMoves}` : String(moves)
            }
          />
          <Stat big label="用时" value={time} />
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-left">
          <div className="mb-1 text-xs font-medium text-gray-400">你的路线</div>
          <div className="text-sm leading-relaxed text-gray-700">{pathStr}</div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={share}
            className="flex-1 rounded-full bg-nred py-2.5 text-sm font-medium text-white hover:bg-nredDark"
          >
            {copied ? '✓ 已复制' : '分享成绩'}
          </button>
          <button
            onClick={() => dispatch({ type: 'restart' })}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            重玩
          </button>
          <button
            onClick={() => dispatch({ type: 'exit' })}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            换一局
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-bold text-gray-900 ${big ? 'text-2xl' : 'text-lg'}`}>{value}</div>
    </div>
  );
}
