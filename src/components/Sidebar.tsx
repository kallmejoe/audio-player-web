import { Search, PanelLeft, Settings } from 'lucide-react';
import { Playlist } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onSelectPlaylist: (id: string | null) => void;
  onImportClick: () => void;
  onCreateFolderClick: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  libraryPath?: string | null;
  onContextMenu: (e: import('react').MouseEvent, playlistId: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  playlists,
  selectedPlaylistId,
  expanded,
  onToggle,
  onSelectPlaylist,
  searchTerm,
  onSearchChange,
  onContextMenu,
  onOpenSettings,
}: SidebarProps) {
  return (
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          id="app-sidebar"
          className="h-full flex flex-col shrink-0 overflow-hidden"
          style={{ backgroundColor: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div style={{ width: 240 }} className="h-full flex flex-col shrink-0">
            {/* Traffic lights row + sidebar toggle icon */}
            <div
              className="shrink-0 flex items-center justify-between px-4"
        style={{ height: 48, WebkitAppRegion: 'drag' } as any}
      >
        {/* macOS native traffic lights live here — just reserve space on left */}
        <div style={{ width: 60 }} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectPlaylist(null)}
            className="text-[12px] font-medium text-zinc-500 mr-1"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            All
          </button>
          <button
            onClick={onOpenSettings}
            className="text-zinc-500"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={onToggle}
            className="text-zinc-500"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            title="Toggle Sidebar"
          >
            <PanelLeft size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search playlists"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md h-[28px] pl-8 pr-3 text-[12px] text-zinc-300 placeholder-zinc-600 focus:outline-none transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          />
        </div>
      </div>

      {/* Playlist list — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2" style={{ scrollbarWidth: 'none' }}>
        {playlists.map((playlist) => {
          const isSelected = selectedPlaylistId === playlist.id;
          return (
            <button
              key={playlist.id}
              onContextMenu={(e) => onContextMenu(e, playlist.id)}
              onClick={() => onSelectPlaylist(playlist.id)}
              className="w-full flex items-center gap-2.5 px-2 py-[5px] rounded-md text-left transition-all select-none"
              style={{
                backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isSelected ? '#fff' : '#a1a1aa',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              {/* Large square cover — like reference */}
              <div
                className="shrink-0 rounded overflow-hidden"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: '#2a2a2c',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {playlist.coverUrl ? (
                  <img src={playlist.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px]">🎵</div>
                )}
              </div>
              <span
                className="truncate"
                style={{ fontSize: 13, lineHeight: '1.3', color: isSelected ? '#ffffff' : '#d4d4d8', fontWeight: isSelected ? 500 : 400 }}
              >
                {playlist.name}
              </span>
            </button>
          );
        })}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
