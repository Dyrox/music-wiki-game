import type { Action, GameState } from '../game';
import { moveCount } from '../game';
import { elapsed } from '../format';

export function LostModal({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  const moves = moveCount(state);
  const time = elapsed((state.endTime ?? Date.now()) - state.startTime);
  const pathStr = state.path.map((a) => a.name).join(' › ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="text-5xl">⌛</div>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">本轮结束</h2>
        <p className="mt-1 text-sm text-gray-500">
          {state.start.name} → {state.target.name}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="步数" value={String(moves)} />
          <Stat label="用时" value={time} />
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-left">
          <div className="mb-1 text-xs font-medium text-gray-400">你的路线</div>
          <div className="text-sm leading-relaxed text-gray-700">{pathStr}</div>
        </div>

        <button
          onClick={() => dispatch({ type: 'exit' })}
          className="mt-6 w-full rounded-full bg-nred py-2.5 text-sm font-medium text-white hover:bg-nredDark"
        >
          回到大厅
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
