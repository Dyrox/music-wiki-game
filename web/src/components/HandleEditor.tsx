import { useEffect, useRef, useState } from 'react';
import { MAX_NAME_LEN, setUsername, useUsername } from '../player';

export function HandleEditor() {
  const name = useUsername();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setVal(name);
      // focus after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, name]);

  function save() {
    setUsername(val);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        你的代号
        <input
          ref={inputRef}
          value={val}
          maxLength={MAX_NAME_LEN}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-44 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 outline-none focus:border-nred"
        />
        <button onClick={save} className="font-medium text-nred hover:underline">
          保存
        </button>
        <button onClick={() => setEditing(false)} className="hover:text-gray-600">
          取消
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      你的代号
      <span className="font-semibold text-gray-600">{name}</span>
      <button
        onClick={() => setEditing(true)}
        title="改名"
        className="rounded px-1 text-gray-400 hover:bg-gray-100 hover:text-nred"
      >
        ✏️ 改名
      </button>
    </span>
  );
}
