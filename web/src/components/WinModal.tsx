import { useEffect, useRef, useState } from 'react';
import type { Action, GameState } from '../game';
import { moveCount } from '../game';
import { elapsed } from '../format';
import type { CompleteResult } from '../types';

const modeName: Record<string, string> = {
  free: '自由模式',
  daily: '每日挑战',
  random: '随机挑战',
  round: '本轮挑战',
};

export function WinModal({
  state,
  dispatch,
  result,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  result: CompleteResult | null;
}) {
  const [copied, setCopied] = useState(false);
  const moves = moveCount(state);
  const time = elapsed((state.endTime ?? Date.now()) - state.startTime);
  const optimal = state.minMoves != null && moves <= state.minMoves;
  const pathStr = state.path.map((a) => a.name).join(' › ');

  function share() {
    const lines = [
      `🎵 六度音乐人 · ${modeName[state.mode]}${state.date ? ' ' + state.date : ''}`,
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
      <Confetti />
      <div className="animate-pop relative z-10 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-8">
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

        {state.usedHelp ? (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            🚫 本局使用了提示 / 看了路线 · 不计入排名
          </div>
        ) : result && result.rank ? (
          <div className="mt-4 rounded-xl bg-nred/5 px-4 py-2.5 text-sm text-gray-700">
            🏅 本房间第 <b className="text-nred">{result.rank}</b> 名
            {result.total > 1 && (
              <span className="text-gray-400"> · 共 {result.total} 人通关</span>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex gap-2 sm:gap-3">
          <button
            onClick={share}
            className="flex-1 rounded-full bg-nred py-2.5 text-sm font-medium text-white hover:bg-nredDark"
          >
            {copied ? '✓ 已复制' : '分享成绩'}
          </button>
          <button
            onClick={() => dispatch({ type: 'restart' })}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 sm:px-5"
          >
            重玩
          </button>
          <button
            onClick={() => dispatch({ type: 'exit' })}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 sm:px-5"
          >
            换一局
          </button>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
    const duration = 2800;
    const gravity = 0.18;
    let width = 0;
    let height = 0;
    let raf = 0;
    let start = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const pieces = Array.from({ length: 120 }, () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      return {
        x: width / 2 + side * (40 + Math.random() * 120),
        y: height * 0.36 + Math.random() * 40,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        vx: side * (2.5 + Math.random() * 5),
        vy: -(5 + Math.random() * 7),
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    const draw = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);

      pieces.forEach((piece) => {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += gravity;
        piece.rotation += piece.spin;

        const fade = Math.max(0, 1 - elapsed / duration);
        ctx.save();
        ctx.globalAlpha = Math.min(1, fade * 1.4);
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        ctx.restore();
      });

      if (elapsed < duration) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
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
