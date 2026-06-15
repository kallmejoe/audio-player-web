import { useState } from 'react';
import { Play, Pause, Search, Clock, PanelLeft } from 'lucide-react';
import { Playlist, Track } from '../types';

interface PlaylistViewProps {
  playlist: Playlist | null;
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onTrackSelect: (trackId: string) => void;
  onPlayPlaylist: (playlistId: string | null, shuffle: boolean) => void;
  songSearchTerm: string;
  onSongSearchChange: (val: string) => void;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
}

export default function PlaylistView({
  playlist,
  tracks,
  currentTrackId,
  isPlaying,
  onTrackSelect,
  songSearchTerm,
  onSongSearchChange,
  sidebarExpanded,
  onToggleSidebar,
}: PlaylistViewProps) {
  const isAllTracks = playlist === null;
  const title = isAllTracks ? 'All Songs' : playlist.name;
  const subtitle = isAllTracks ? '' : (playlist.folderPath !== playlist.name ? playlist.folderPath : '');

  return (
    <div
      id="playlist-view"
      className="flex-1 min-w-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* ── Header row ─────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-6"
        style={{
          paddingTop: 14,
          paddingBottom: 10,
          height: 56,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Left: sidebar toggle (when hidden) + title block */}
        <div className="flex items-center gap-3 min-w-0">
          {!sidebarExpanded && (
            <button
              onClick={onToggleSidebar}
              className="shrink-0 text-zinc-500 hover:text-white transition-colors"
              style={{ marginTop: 2 }}
            >
              <PanelLeft size={16} />
            </button>
          )}
          <div className="min-w-0">
            <h1
              className="text-white font-semibold truncate leading-tight"
              style={{ fontSize: 18, letterSpacing: '-0.3px' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="truncate mt-0.5" style={{ fontSize: 13, color: '#71717a' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: search bar (always visible, like reference) */}
        <div className="shrink-0 flex items-center gap-3">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={songSearchTerm}
              onChange={(e) => onSongSearchChange(e.target.value)}
              className="rounded-lg h-[32px] pl-9 pr-4 text-[13px] text-zinc-300 placeholder-zinc-600 focus:outline-none border transition-all"
              style={{
                width: 'clamp(140px, 20vw, 220px)',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Column headers ──────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center px-6 py-1.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="w-8 mr-3 flex justify-center">
          <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: '#52525b' }} />
        </div>
        <div className="flex-[2] min-w-0 text-[11px] font-medium tracking-wide" style={{ color: '#71717a' }}>Title</div>
        <div className="flex-[1.2] min-w-0 text-[11px] font-medium tracking-wide hidden sm:block" style={{ color: '#71717a' }}>Artist</div>
        <div className="flex-[1.2] min-w-0 text-[11px] font-medium tracking-wide hidden lg:block" style={{ color: '#71717a' }}>Album</div>
        <div className="w-12 shrink-0 flex justify-end">
          <Clock size={13} style={{ color: '#52525b' }} />
        </div>
      </div>

      {/* ── Track list — scrollable ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-28" style={{ scrollbarWidth: 'none' }}>
        {tracks.length === 0 ? (
          <div className="flex items-center justify-center h-40" style={{ color: '#52525b', fontSize: 13 }}>
            No songs found
          </div>
        ) : (
          tracks.map((track, index) => {
            const isActive = currentTrackId === track.id;
            const isEven = index % 2 === 0;
            const baseBg = isEven ? 'transparent' : 'rgba(255,255,255,0.015)';
            return (
              <div
                key={track.id}
                className="group flex items-center px-6 py-[5px] cursor-pointer transition-colors select-none"
                style={{ backgroundColor: baseBg }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = baseBg;
                }}
                onClick={() => onTrackSelect(track.id)}
              >
                {/* Cover thumbnail with play/pause overlay */}
                <div className="w-8 h-8 shrink-0 mr-3 relative rounded overflow-hidden" style={{ backgroundColor: '#2a2a2c' }}>
                  {isActive ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      {isPlaying
                        ? <Pause size={11} fill="white" className="text-white" />
                        : <Play size={11} fill="white" className="text-white ml-px" />
                      }
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                      <Play size={11} fill="white" className="text-white ml-px" />
                    </div>
                  )}
                  {track.coverUrl && (
                    <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                  )}
                </div>

                {/* Title */}
                <div className="flex-[2] min-w-0 pr-4">
                  <span
                    className="truncate block leading-tight"
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#ffffff' : '#e4e4e7',
                    }}
                  >
                    {track.title}
                  </span>
                </div>

                {/* Artist */}
                <div className="flex-[1.2] min-w-0 pr-4 truncate hidden sm:block" style={{ fontSize: 13, color: '#a1a1aa' }}>
                  {track.artist}
                </div>

                {/* Album */}
                <div className="flex-[1.2] min-w-0 pr-4 truncate hidden lg:block" style={{ fontSize: 13, color: '#71717a' }}>
                  {track.album}
                </div>

                {/* Duration */}
                <div className="w-12 shrink-0 text-right" style={{ fontSize: 13, color: '#71717a' }}>
                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
