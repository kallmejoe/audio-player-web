/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Shuffle, Folder, FolderTree, Clock, ChevronRight, Music, AudioLines } from 'lucide-react';
import { Playlist, Track } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import AudioVisualizer from './AudioVisualizer';

interface PlaylistViewProps {
  playlist: Playlist | null; // null means "All Files"
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onTrackSelect: (trackId: string) => void;
  onPlayPlaylist: (playlistId: string | null, shuffle: boolean) => void;
}

export default function PlaylistView({
  playlist,
  tracks,
  currentTrackId,
  isPlaying,
  onTrackSelect,
  onPlayPlaylist,
}: PlaylistViewProps) {
  const isAllTracks = playlist === null;
  
  // Header title & folder structure
  const title = isAllTracks ? 'Library Vault' : playlist.name;
  const breadcrumbs = isAllTracks ? ['All Audio Files'] : playlist.folderPath.split('/');

  // Calculate stats
  const totalDuration = tracks.reduce((acc, t) => acc + t.duration, 0);
  const totalDurationStr = `${Math.floor(totalDuration / 60)} min`;
  const trackCountStr = `${tracks.length} ${tracks.length === 1 ? 'file' : 'files'}`;

  // Cover design: select gradient
  const coverGradient = isAllTracks
    ? 'from-[#c084fc] via-[#6366f1] to-[#38bdf8]'
    : playlist.coverGradient;

  // Fallback cover image lookup (from folder structure or first track carrying a cover)
  const coverUrl = isAllTracks
    ? undefined
    : (playlist.coverUrl || (tracks.length > 0 ? tracks.find(t => t.coverUrl)?.coverUrl : undefined));

  const formatTrackDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col relative bg-transparent" id="playlist-view">

      {/* Compact Header for Playlist (Sticky) */}
      <div className="flex flex-row items-end gap-5 select-none shrink-0 border-b border-white/5 pb-5 px-8 pt-10 sticky top-0 z-10 bg-black/20 backdrop-blur-3xl">
        <div className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-lg flex items-center justify-center">
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={title}
              className="w-full h-full object-cover relative z-10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${coverGradient} opacity-20`} />
              <Folder size={32} className="text-white backdrop-blur-md relative z-10 drop-shadow-md" />
            </>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase mb-1">
            {isAllTracks ? 'Library' : 'Playlist'}
          </span>
          <h1 className="font-sans font-bold text-2xl md:text-3xl text-white truncate leading-tight tracking-tight mb-2">
            {title}
          </h1>
          <div className="flex items-center gap-2 text-[12px] text-zinc-400 font-sans mb-3">
            <span className="font-medium">{trackCountStr}</span>
            <span>•</span>
            <span>{totalDurationStr}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onPlayPlaylist(isAllTracks ? null : playlist.id, false)}
              disabled={tracks.length === 0}
              className="px-6 py-2 bg-[#fa243c] text-white hover:bg-[#e02035] disabled:bg-zinc-800 disabled:text-zinc-500 font-sans font-semibold text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              <span>Play</span>
            </button>
            <button
              onClick={() => onPlayPlaylist(isAllTracks ? null : playlist.id, true)}
              disabled={tracks.length === 0}
              className="px-6 py-2 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white disabled:bg-zinc-800 disabled:text-zinc-500 font-sans font-semibold text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Shuffle size={13} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Track List Section */}
      <div className="flex-1 flex flex-col min-h-0 px-8 pb-[140px] pt-4">
        {/* Table Header */}
        <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2 px-2 select-none mb-2 shrink-0">
          <div className="flex items-center gap-4 text-[12px] font-medium text-zinc-500 w-full">
            <span className="w-8 text-center text-xs">#</span>
            <span className="flex-1">Title</span>
            <span className="w-16 text-right">Time</span>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex flex-col pb-6">
          {tracks.length === 0 ? (
            <div className="w-full h-32 flex items-center justify-center text-zinc-500 text-sm">
              This folder is empty.
            </div>
          ) : (
            <div className="flex flex-col">
              {tracks.map((track, idx) => {
                const isActive = currentTrackId === track.id;
                return (
                  <div
                    key={track.id}
                    className={`group w-full flex items-center justify-between px-2 py-2 rounded-md text-left cursor-pointer transition-colors ${
                      isActive ? 'bg-[#fa243c]/10' : 'hover:bg-white/5'
                    }`}
                    onClick={() => onTrackSelect(track.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-8 flex justify-center items-center shrink-0">
                        {isActive && isPlaying ? (
                          <AudioLines size={14} className="text-[#fa243c]" />
                        ) : (
                          <span className={`text-xs ${isActive ? 'text-[#fa243c]' : 'text-zinc-500'} group-hover:hidden`}>
                            {idx + 1}
                          </span>
                        )}
                        <span className={`hidden group-hover:block transition-all ${isActive ? 'text-[#fa243c]' : 'text-white'}`}>
                          <Play size={10} fill="currentColor" />
                        </span>
                      </div>

                      {/* Title & Artist */}
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[14px] truncate ${isActive ? 'text-[#fa243c]' : 'text-zinc-200'}`}>
                          {track.title}
                        </span>
                        <span className="text-[12px] text-zinc-500 truncate group-hover:text-zinc-400">
                          {track.artist}
                        </span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-4 shrink-0 text-[12px] text-zinc-500 w-16 justify-end">
                      {formatTrackDuration(track.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
