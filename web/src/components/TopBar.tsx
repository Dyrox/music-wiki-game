import { useState } from 'react';

/**
 * The NetEase-Cloud-Music style top chrome: back arrow (returns to the previous
 * artist), search box, and mic. The search box is intentionally inert during a
 * game (you can't teleport by searching — that's the whole point).
 */
export function TopBar({
  targetName,
  onBack,
  canGoBack,
}: {
  targetName: string;
  onBack: () => void;
  canGoBack: boolean;
}) {
  const [poke, setPoke] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <button
          onClick={() => canGoBack && onBack()}
          disabled={!canGoBack}
          title={canGoBack ? '返回上一位歌手' : '已经在起点了'}
          className={`grid h-8 w-8 place-items-center rounded-full ${
            canGoBack
              ? 'text-gray-500 hover:bg-gray-100'
              : 'cursor-not-allowed text-gray-200'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          className="relative flex h-9 min-w-0 flex-1 items-center rounded-full bg-gray-100 px-4 text-sm text-gray-400 sm:w-[300px] sm:flex-none"
          onClick={() => {
            setPoke(true);
            setTimeout(() => setPoke(false), 1800);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-2 shrink-0">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="truncate">搜索歌曲、歌手、专辑</span>
          {poke && (
            <span className="animate-pop absolute -bottom-9 left-0 whitespace-nowrap rounded-md bg-gray-800 px-3 py-1.5 text-xs text-white shadow-lg">
              游戏中不能直接搜索跳转 — 只能靠合作歌曲走到「{targetName}」
            </span>
          )}
        </div>

        <button className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
