/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Folder, Disc, Plus, Layers, Laptop, Music, Volume2, Search, Trash2 } from 'lucide-react';
import { Playlist } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (id: string | null) => void;
  onImportClick: () => void;
  onCreateFolderClick: () => void;
  onRemovePlaylist: (id: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export default function Sidebar({
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onImportClick,
  onCreateFolderClick,
  onRemovePlaylist,
  searchTerm,
  onSearchChange,
}: SidebarProps) {
  return (
    <aside
      className="w-[220px] h-full bg-white/[0.02] backdrop-blur-3xl border-r border-white/5 flex flex-col justify-between shrink-0"
      id="app-sidebar"
    >
      {/* Brand & Filter Section */}
      <div className="flex flex-col p-3 pt-5 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2.5 mb-1">
          <Music size={18} className="text-[#fa243c]" />
          <span className="font-sans font-semibold tracking-tight text-white text-[15px]">SoundFlow</span>
        </div>

        {/* Global Search Bar */}
        <div className="relative px-2">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-md py-1 pl-8 pr-3 text-[13px] text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-sans placeholder:font-medium"
          />
        </div>

        {/* Quick Lists */}
        <div className="flex flex-col gap-0.5 px-2">
          <span className="text-[11px] font-semibold text-zinc-400 px-2 mb-1">Library</span>
          
          <button
            onClick={() => onSelectPlaylist(null)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-sans transition-all w-full text-left ${
              selectedPlaylistId === null
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-300 hover:bg-white/5'
            }`}
          >
            <Disc size={15} className="text-[#fa243c]" />
            <span>All Songs</span>
          </button>
        </div>

        {/* Folder Playlists Tree */}
        <div className="flex flex-col gap-0.5 mt-4 px-2">
          <div className="flex justify-between items-center px-2 mb-1">
            <span className="text-[11px] font-semibold text-zinc-400">Playlists</span>
            <button
              onClick={onCreateFolderClick}
              title="Create Folder Playlist"
              className="p-1 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-0.5 max-h-[400px] overflow-y-auto no-scrollbar">
            {playlists.length === 0 ? (
              <div className="text-[12px] text-zinc-500 px-3 py-4 text-center">
                No folders found.
              </div>
            ) : (
              playlists.map((playlist) => {
                const isSelected = selectedPlaylistId === playlist.id;
                return (
                  <div
                    key={playlist.id}
                    className="group flex items-center justify-between rounded-md transition-all"
                  >
                    <button
                      onClick={() => onSelectPlaylist(playlist.id)}
                      className={`flex-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-sans text-left overflow-hidden transition-all ${
                        isSelected ? 'bg-white/10 text-white font-medium' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      {playlist.coverUrl ? (
                          <div className={`relative shrink-0 w-5 h-5 rounded overflow-hidden bg-white/10 shadow-sm border border-white/5`}>
                            <img 
                              src={playlist.coverUrl} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <Folder size={15} className="text-[#fa243c]" />
                        )}

                      <div className="truncate flex-1 pt-[1px]">
                        {playlist.name}
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePlaylist(playlist.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-950/40 rounded text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                      title="Remove Playlist"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer / System Control */}
      <div className="p-4">
        <button
          onClick={onImportClick}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-[13px] font-medium text-white rounded-md py-1.5 select-none transition-all cursor-pointer"
        >
          <Layers size={14} className="text-zinc-400" />
          <span>Import Folders</span>
        </button>
      </div>
    </aside>
  );
}
