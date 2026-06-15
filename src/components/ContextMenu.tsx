import { useRef, useEffect } from 'react';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: import('react').ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  items: ContextMenuAction[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-2xl py-1.5 overflow-hidden select-none"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-sans transition-colors ${
            item.danger
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-zinc-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
