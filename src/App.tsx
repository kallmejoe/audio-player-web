import { useState, useEffect, useMemo, useCallback } from 'react';
import { Track, Playlist, PlaybackState } from './types';
import Sidebar from './components/Sidebar';
import PlaylistView from './components/PlaylistView';
import MusicPlayerControls from './components/MusicPlayerControls';
import DirectoryImporter from './components/DirectoryImporter';
import ContextMenu from './components/ContextMenu';
import type { ContextMenuAction } from './components/ContextMenu';
import { INITIAL_SYNTHESIZED_TRACKS, buildPlaylistsFromTracks } from './utils/sampleLibrary';
import { audioEngine } from './utils/audioEngine';
import { X, Play, Shuffle, Trash2, FolderInput } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem('molly-tracks-v2');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        // Migrate old URLs from cache
        parsed = parsed.map((track: any) => {
          if (track.url && track.url.startsWith('local-file:///') && !track.url.includes('?path=')) {
            let rawPath = track.url.replace('local-file://', '');
            // Some old URLs might have been encoded with encodeURI
            if (rawPath.includes('%20')) rawPath = decodeURI(rawPath);
            track.url = `local-file://get?path=${encodeURIComponent(rawPath)}`;
          }
          if (track.coverUrl && track.coverUrl.startsWith('id3-cover:///') && !track.coverUrl.includes('?path=')) {
            let rawPath = track.coverUrl.replace('id3-cover://', '');
            if (rawPath.includes('%20')) rawPath = decodeURI(rawPath);
            track.coverUrl = `id3-cover://get?path=${encodeURIComponent(rawPath)}`;
          }
          if (track.coverUrl && track.coverUrl.startsWith('local-file:///') && !track.coverUrl.includes('?path=')) {
            let rawPath = track.coverUrl.replace('local-file://', '');
            if (rawPath.includes('%20')) rawPath = decodeURI(rawPath);
            track.coverUrl = `local-file://get?path=${encodeURIComponent(rawPath)}`;
          }
          return track;
        });
        return parsed;
      } catch (e) {
        console.error('Failed to load cached tracks:', e);
      }
    }
    return [];
  });

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistSearchTerm, setPlaylistSearchTerm] = useState<string>('');
  const [songSearchTerm, setSongSearchTerm] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('molly-sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    playlistId: string;
  } | null>(null);

  const { playlists, processedPool } = useMemo(() => {
    const res = buildPlaylistsFromTracks(tracks);
    return {
      playlists: res.playlists,
      processedPool: res.updatedTracks,
    };
  }, [tracks]);

  useEffect(() => {
    localStorage.setItem('molly-tracks-v2', JSON.stringify(tracks));
  }, [tracks]);

  useEffect(() => {
    localStorage.setItem('molly-sidebar-expanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTrackId: null,
    queue: [],
    history: [],
    repeatMode: 'all',
    isShuffle: false,
    volume: 0.8,
    currentTime: 0,
    progress: 0,
  });

  const activeTrack = useMemo(() => {
    if (!currentTrackId) return null;
    return processedPool.find((t) => t.id === currentTrackId) || null;
  }, [currentTrackId, processedPool]);

  const currentPlaylistGradient = useMemo(() => {
    if (!activeTrack) return undefined;
    const play = playlists.find((p) => p.id === activeTrack.playlistId);
    return play ? play.coverGradient : undefined;
  }, [activeTrack, playlists]);

  const visibleTracks = useMemo(() => {
    let list = processedPool;
    if (selectedPlaylistId !== null) {
      list = list.filter((t) => t.playlistId === selectedPlaylistId);
    }
    if (songSearchTerm.trim() !== '') {
      const query = songSearchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          (t.filePath && t.filePath.toLowerCase().includes(query))
      );
    }
    return list;
  }, [processedPool, selectedPlaylistId, songSearchTerm]);

  const visiblePlaylists = useMemo(() => {
    let list = playlists;
    if (playlistSearchTerm.trim() !== '') {
      const query = playlistSearchTerm.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(query));
    }
    return list;
  }, [playlists, playlistSearchTerm]);

  const activeBrowsingPlaylist = useMemo(() => {
    if (selectedPlaylistId === null) return null;
    return playlists.find((p) => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId]);

  useEffect(() => {
    audioEngine.setCallbacks(
      (time, duration) => {
        setPlaybackState((prev) => ({
          ...prev,
          currentTime: time,
          progress: duration > 0 ? (time / duration) * 100 : 0,
        }));
      },
      () => {
        handleNext();
      }
    );
  }, [playbackState.queue, playbackState.repeatMode, currentTrackId]);

  useEffect(() => {
    audioEngine.setVolume(playbackState.volume);
  }, [playbackState.volume]);

  const handlePlayPause = () => {
    if (!currentTrackId && visibleTracks.length > 0) {
      handleSelectTrack(visibleTracks[0].id);
      return;
    }

    if (playbackState.isPlaying) {
      audioEngine.pause();
      setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audioEngine.resume();
      setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const handleSelectTrack = (trackId: string, customQueue?: string[]) => {
    const track = processedPool.find((t) => t.id === trackId);
    if (!track) return;

    const activeQueue = customQueue || visibleTracks.map((t) => t.id);

    setCurrentTrackId(trackId);
    setPlaybackState((prev) => ({
      ...prev,
      isPlaying: true,
      currentTrackId: trackId,
      queue: activeQueue,
      currentTime: 0,
      progress: 0,
    }));

    audioEngine.play(track);
  };

  const handleNext = useCallback(() => {
    const { queue, repeatMode, isShuffle } = playbackState;
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentTrackId) {
      const track = processedPool.find((t) => t.id === currentTrackId);
      if (track) {
        audioEngine.play(track);
        return;
      }
    }

    let nextIndex = 0;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (currentTrackId) {
      const currentIndex = queue.indexOf(currentTrackId);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        audioEngine.pause();
        setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentTime: 0, progress: 0 }));
        return;
      }
    }

    const nextTrackId = queue[nextIndex];
    handleSelectTrack(nextTrackId, queue);
  }, [playbackState, currentTrackId, processedPool]);

  const handlePrevious = () => {
    const { queue, isShuffle } = playbackState;
    if (queue.length === 0 || !currentTrackId) return;

    let prevIndex = 0;

    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      const currentIndex = queue.indexOf(currentTrackId);
      if (currentIndex > 0) {
        prevIndex = currentIndex - 1;
      } else {
        prevIndex = queue.length - 1;
      }
    }

    const prevTrackId = queue[prevIndex];
    handleSelectTrack(prevTrackId, queue);
  };

  const handlePlayPlaylist = (playlistId: string | null, shuffle: boolean) => {
    let playTracks = processedPool;
    if (playlistId !== null) {
      playTracks = processedPool.filter((t) => t.playlistId === playlistId);
    }

    if (playTracks.length === 0) return;

    let trackIds = playTracks.map((t) => t.id);
    let startTrackId = trackIds[0];

    if (shuffle) {
      const shuffled = [...trackIds].sort(() => Math.random() - 0.5);
      trackIds = shuffled;
      startTrackId = shuffled[0];
    }

    setPlaybackState((prev) => ({
      ...prev,
      isShuffle: shuffle,
    }));

    handleSelectTrack(startTrackId, trackIds);
  };

  const handleVolume = (vol: number) => {
    setPlaybackState((prev) => ({ ...prev, volume: vol }));
  };

  const handleToggleShuffle = () => {
    setPlaybackState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  };

  const handleToggleRepeat = () => {
    setPlaybackState(prev => {
      let nextMode: 'off' | 'all' | 'one' = 'off';
      if (prev.repeatMode === 'off') nextMode = 'all';
      else if (prev.repeatMode === 'all') nextMode = 'one';
      return { ...prev, repeatMode: nextMode };
    });
  };

  const handleSeek = (seconds: number) => {
    audioEngine.seek(seconds);
  };

  const handleImportedTracks = (newTracks: Track[]) => {
    setTracks((prev) => {
      const existingUrls = new Set(prev.map((t) => t.id));
      const filteredNew = newTracks.filter((t) => !existingUrls.has(t.id));
      return [...prev, ...filteredNew];
    });
  };

  const handleClearLibrary = () => {
    setTracks([]);
    setCurrentTrackId(null);
    audioEngine.pause();
    setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
  };

  const handleSelectFolder = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const path = await window.electronAPI.selectFolder();
      if (path) {
        setLibraryPath(path);
        await window.electronAPI.watchFolder(path);
      }
    }
  };

  const handleCreateVirtualFolder = () => {
    if (!newFolderName.trim()) return;

    const dummySongName = 'First Synthesized Loop';
    const folderSlug = newFolderName.trim();
    const folderPlaylistId = folderSlug.toLowerCase();

    const firstTrack: Track = {
      id: `custom-synth-${Date.now()}`,
      title: dummySongName,
      artist: 'Digital Ambient',
      album: 'Virtual Synth',
      duration: 180,
      url: '',
      fileName: 'ambient_loop.mp3',
      filePath: `${folderSlug}/${dummySongName}.mp3`,
      playlistId: folderPlaylistId,
      isSynthesized: true,
      synthesizedGenre: 'space',
      synthesizedTempo: 50,
    };

    setTracks((prev) => [...prev, firstTrack]);
    setIsCreateFolderOpen(false);
    setNewFolderName('');
    setSelectedPlaylistId(folderPlaylistId);
  };

  const handleRemovePlaylist = (playlistId: string) => {
    const idsToRemove = processedPool.filter((t) => t.playlistId === playlistId).map((t) => t.id);
    setTracks((prev) => prev.filter((t) => !idsToRemove.includes(t.id)));
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
  };

  const handleSidebarContextMenu = (e: import('react').MouseEvent, playlistId: string) => {
    e.preventDefault();
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      playlistId,
    });
  };

  const getContextMenuItems = (): ContextMenuAction[] => {
    if (!contextMenu) return [];
    const pid = contextMenu.playlistId;
    return [
      {
        id: 'play',
        label: 'Play',
        icon: <Play size={14} />,
        onClick: () => handlePlayPlaylist(pid, false),
      },
      {
        id: 'shuffle',
        label: 'Shuffle',
        icon: <Shuffle size={14} />,
        onClick: () => handlePlayPlaylist(pid, true),
      },
      {
        id: 'select',
        label: 'Open',
        icon: <FolderInput size={14} />,
        onClick: () => {
          setSelectedPlaylistId(pid);
          setPlaylistSearchTerm('');
        },
      },
      {
        id: 'delete',
        label: 'Delete Playlist',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => handleRemovePlaylist(pid),
      },
    ];
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === ' ' && !isInput) {
        e.preventDefault();
        handlePlayPause();
      }

      if (e.key === 'ArrowRight' && !isInput) {
        e.preventDefault();
        if (activeTrack) handleSeek(Math.min(playbackState.currentTime + 5, activeTrack.duration));
      }

      if (e.key === 'ArrowLeft' && !isInput) {
        e.preventDefault();
        handleSeek(Math.max(playbackState.currentTime - 5, 0));
      }

      if (e.key === 'ArrowUp' && !isInput) {
        e.preventDefault();
        handleVolume(Math.min(playbackState.volume + 0.05, 1));
      }

      if (e.key === 'ArrowDown' && !isInput) {
        e.preventDefault();
        handleVolume(Math.max(playbackState.volume - 0.05, 0));
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search"]');
        searchInput?.focus();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setIsImportOpen(true);
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setSidebarExpanded((prev) => !prev);
      }

      if (e.key === 'Escape') {
        setIsImportOpen(false);
        setIsCreateFolderOpen(false);
        setContextMenu(null);
      }

      if (e.key === 'n' && !isInput) handleNext();
      if (e.key === 'p' && !isInput) handlePrevious();

      if (e.key === 's' && !isInput) {
        setPlaybackState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }));
      }

      if (e.key === 'r' && !isInput) {
        setPlaybackState((prev) => {
          let nextMode: 'off' | 'all' | 'one' = 'off';
          if (prev.repeatMode === 'off') nextMode = 'all';
          else if (prev.repeatMode === 'all') nextMode = 'one';
          return { ...prev, repeatMode: nextMode };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleNext, handlePrevious, handleSeek, handleVolume, playbackState, activeTrack]);

  // --- Electron Media Keys ---
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const cleanup = window.electronAPI.onMediaKey((action) => {
        switch (action) {
          case 'play-pause': handlePlayPause(); break;
          case 'next': handleNext(); break;
          case 'previous': handlePrevious(); break;
        }
      });
      return cleanup;
    }
  }, [handlePlayPause, handleNext, handlePrevious]);

  // --- Electron library folder watching ---
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.getLibraryPath().then((storedPath) => {
        if (storedPath) setLibraryPath(storedPath);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const cleanup = window.electronAPI.onLibraryFilesUpdated(({ audioFiles, imageFiles, libraryPath: libPath }) => {
        setLibraryPath(libPath);

        const folderImagesMap: Record<string, { coverUrl?: string; firstImage?: string }> = {};

        for (const img of imageFiles) {
          const parts = img.relativePath.split('/');
          let folderPath = 'root';
          let folderName = '';
          if (parts.length > 1) {
            folderPath = parts.slice(0, parts.length - 1).join('/').toLowerCase();
            folderName = parts[parts.length - 2].toLowerCase();
          }

          const fileName = img.name.toLowerCase();
          const localUrl = `local-file://get?path=${encodeURIComponent(img.path)}`;

          if (!folderImagesMap[folderPath]) folderImagesMap[folderPath] = {};
          const currentDict = folderImagesMap[folderPath];
          if (!currentDict.firstImage) currentDict.firstImage = localUrl;

          const isCoverMatch =
            fileName === `${folderName}.png` || fileName === `${folderName}.jpg` ||
            fileName === `${folderName}.jpeg` || fileName === 'cover.jpg' ||
            fileName === 'cover.png' || fileName === 'folder.jpg' || fileName === 'folder.png';

          if (isCoverMatch) currentDict.coverUrl = localUrl;
        }

        const newTracks: Track[] = audioFiles.map((file) => {
          const parts = file.relativePath.split('/');
          let trackFolderPath = 'root';
          if (parts.length > 1) trackFolderPath = parts.slice(0, parts.length - 1).join('/').toLowerCase();
          const matchedCovers = folderImagesMap[trackFolderPath];
          
          // Encode the path to handle spaces/special chars — encodeURI preserves slashes
          let coverUrl = file.metadata?.hasCover
            ? `id3-cover://get?path=${encodeURIComponent(file.path)}`
            : (matchedCovers?.coverUrl || matchedCovers?.firstImage);

          return {
            id: `local-${file.path}`,
            title: file.metadata?.title || file.name.replace(/\.[^/.]+$/, ''),
            artist: file.metadata?.artist || 'Unknown Artist',
            album: file.metadata?.album || 'Unknown Album',
            duration: file.metadata?.duration || 180,
            url: `local-file://get?path=${encodeURIComponent(file.path)}`,
            fileName: file.name,
            filePath: file.relativePath,
            playlistId: '',
            size: file.size,
            coverUrl,
          };
        });

        setTracks((prev) => {
          const existingPaths = new Set(prev.filter((t) => t.url.startsWith('local-file://')).map((t) => t.url));
          const existingNonLocal = prev.filter((t) => !t.url.startsWith('local-file://'));
          const freshLocal = newTracks.filter((t) => !existingPaths.has(t.url));
          return [...existingNonLocal, ...freshLocal];
        });
      });

      return cleanup;
    }
  }, []);

  return (
    <div
      className="w-full h-screen text-white flex overflow-hidden relative antialiased"
      style={{ backgroundColor: '#0a0a0a' }}
      id="molly-layout-system"
    >
      <div className="flex-1 flex min-h-0">
        <Sidebar
          playlists={visiblePlaylists}
          selectedPlaylistId={selectedPlaylistId}
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          onSelectPlaylist={(id) => {
            setSelectedPlaylistId(id);
          }}
          onImportClick={() => setIsImportOpen(true)}
          onCreateFolderClick={() => setIsCreateFolderOpen(true)}
          searchTerm={playlistSearchTerm}
          onSearchChange={setPlaylistSearchTerm}
          libraryPath={libraryPath}
          onContextMenu={handleSidebarContextMenu}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <div className="flex-1 relative flex flex-col min-w-0 bg-transparent">
          <PlaylistView
            playlist={activeBrowsingPlaylist}
            tracks={visibleTracks}
            currentTrackId={currentTrackId}
            isPlaying={playbackState.isPlaying}
            onTrackSelect={(id) => handleSelectTrack(id)}
            onPlayPlaylist={handlePlayPlaylist}
            songSearchTerm={songSearchTerm}
            onSongSearchChange={setSongSearchTerm}
            sidebarExpanded={sidebarExpanded}
            onToggleSidebar={() => setSidebarExpanded(!sidebarExpanded)}
          />

          <div className="pointer-events-none absolute bottom-8 inset-x-0 flex justify-center z-50">
            <div className="pointer-events-auto w-full px-8 flex justify-center">
              <MusicPlayerControls
                currentTrack={activeTrack}
                playbackState={playbackState}
                onPlayPause={handlePlayPause}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onToggleShuffle={handleToggleShuffle}
                onToggleRepeat={handleToggleRepeat}
                onVolumeChange={handleVolume}
                onSeek={handleSeek}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-[#1c1c1e] border border-white/10 p-6 rounded-xl w-[400px] shadow-2xl">
              <h2 className="text-lg font-medium mb-4">Settings</h2>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-zinc-400">Library Path</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={libraryPath || 'Not set'} className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white" />
                  <button onClick={handleSelectFolder} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-[13px] transition-colors">Change</button>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <label className="text-[13px] text-zinc-400">Data Management</label>
                <div>
                  <button onClick={() => { handleClearLibrary(); setIsSettingsOpen(false); }} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded text-[13px] transition-colors">
                    Clear Library Cache
                  </button>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setIsSettingsOpen(false)} className="bg-white text-black px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-zinc-200 transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}

        {isImportOpen && (
          <DirectoryImporter
            onClose={() => setIsImportOpen(false)}
            onImportTracks={handleImportedTracks}
            onClearLibrary={handleClearLibrary}
          />
        )}

        {contextMenu && (
          <ContextMenu
            items={getContextMenuItems()}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
          />
        )}

        {isCreateFolderOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onContextMenu={(e) => e.preventDefault()}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden p-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4 select-none">
                <span className="font-sans font-bold text-sm text-white">Create Virtual Playlist Folder</span>
                <button
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-3 font-sans">
                <p className="text-[11.5px] text-zinc-400">
                  Enter a custom folder category. Molly flattens subdirectories to build separated discrete playlists.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-wider">Directory Path Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Beats/Chillhop"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setIsCreateFolderOpen(false)}
                    className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateVirtualFolder}
                    disabled={!newFolderName.trim()}
                    className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-900 disabled:text-zinc-600 font-sans font-semibold text-xs text-white rounded-lg transition-colors"
                  >
                    Mount Folder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
