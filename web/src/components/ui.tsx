import { useState } from 'react';
import { imgFallback } from '../format';

export function SafeImg({
  src,
  seed,
  size,
  className,
}: {
  src?: string;
  seed: string;
  size?: number;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  let real = src;
  if (real && size && !real.includes('?')) real = `${real}?param=${size}y${size}`;
  const finalSrc = !err && real ? real : imgFallback(seed);
  return (
    <img
      src={finalSrc}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setErr(true)}
    />
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-nred" />
      {label && <div className="text-sm">{label}</div>}
    </div>
  );
}
