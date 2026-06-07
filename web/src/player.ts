// A stable random handle per browser (like The Wiki Game's "PlumMeerkat12"),
// stored in localStorage. No accounts — just an identity for the lobby board.
const ADJ = [
  'Plum', 'Wacky', 'Super', 'Lucky', 'Lively', 'Dazzling', 'Unique', 'Quantum',
  'Noble', 'Mellow', 'Brave', 'Cosmic', 'Sunny', 'Witty', 'Zesty', 'Jolly',
];
const NOUN = [
  'Meerkat', 'Tiger', 'Ninja', 'Rogue', 'Rider', 'Builder', 'Guru', 'Comet',
  'Scout', 'Falcon', 'Otter', 'Maple', 'Panda', 'Sparrow', 'Yak', 'Lynx',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let cached: string | null = null;

export function getUsername(): string {
  if (cached) return cached;
  try {
    const saved = localStorage.getItem('mwg_username');
    if (saved) return (cached = saved);
  } catch {
    /* ignore */
  }
  const name = `${pick(ADJ)}${pick(NOUN)}${100 + Math.floor(Math.random() * 900)}`;
  try {
    localStorage.setItem('mwg_username', name);
  } catch {
    /* ignore */
  }
  return (cached = name);
}
