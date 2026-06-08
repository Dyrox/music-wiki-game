import { useEffect, useReducer, useRef } from 'react';
import { initialState, reducer, currentArtist, moveCount } from './game';
import { api, leaveBeacon } from './api';
import { getClientId, useUsername } from './player';
import { SetupScreen } from './components/SetupScreen';
import { TopBar } from './components/TopBar';
import { GameHud } from './components/GameHud';
import { ArtistPage } from './components/ArtistPage';
import { RoundLivePanel } from './components/RoundLivePanel';
import { WinModal } from './components/WinModal';
import { LostModal } from './components/LostModal';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const me = useUsername();
  const reported = useRef(false);

  // Tell the server we're gone the moment the tab closes, so other players see
  // us drop off in ~1.5s instead of waiting for the presence timeout.
  useEffect(() => {
    const onLeave = () => leaveBeacon(getClientId());
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, []);

  // While playing a global round, announce presence ("playing") and record the
  // result once on win — so the lobby leaderboard reflects real players.
  useEffect(() => {
    if (state.mode !== 'round' || state.roundId == null) return;
    if (state.phase === 'playing') {
      reported.current = false;
      const beat = () => api.heartbeat(getClientId(), me, state.roundId!, 'playing');
      beat();
      const hb = setInterval(beat, 2500);
      return () => clearInterval(hb);
    }
    if (state.phase === 'won' && !reported.current) {
      reported.current = true;
      api.complete(
        getClientId(),
        me,
        state.roundId,
        moveCount(state),
        (state.endTime ?? Date.now()) - state.startTime,
      );
    }
  }, [state.phase, state.roundId, state.mode, me]);

  useEffect(() => {
    if (state.mode !== 'round' || state.phase !== 'playing' || !state.roundEndsAt) return;
    const msLeft = state.roundEndsAt - Date.now();
    if (msLeft <= 0) {
      dispatch({ type: 'timeout' });
      return;
    }
    const t = setTimeout(() => dispatch({ type: 'timeout' }), msLeft);
    return () => clearTimeout(t);
  }, [state.mode, state.phase, state.roundEndsAt]);

  if (state.phase === 'setup') {
    return (
      <div className="min-h-screen bg-[#f6f6f8]">
        <SetupScreen
          onBegin={(mode, start, target, minMoves, roundId, roundEndsAt) =>
            dispatch({ type: 'begin', mode, start, target, minMoves, roundId, roundEndsAt })
          }
        />
      </div>
    );
  }

  const cur = currentArtist(state);
  const visitedIds = new Set(state.path.map((p) => p.id));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <GameHud state={state} dispatch={dispatch} />
      <TopBar
        targetName={state.target.name}
        canGoBack={state.path.length > 1}
        onBack={() => dispatch({ type: 'jumpTo', index: state.path.length - 2 })}
      />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-6">
        <ArtistPage
          key={cur.id}
          artistId={cur.id}
          targetId={state.target.id}
          visitedIds={visitedIds}
          onTravel={(artist) => dispatch({ type: 'travel', artist })}
        />
      </main>
      {state.mode === 'round' && state.roundId != null && <RoundLivePanel />}
      {state.phase === 'won' && <WinModal state={state} dispatch={dispatch} />}
      {state.phase === 'lost' && <LostModal state={state} dispatch={dispatch} />}
    </div>
  );
}
