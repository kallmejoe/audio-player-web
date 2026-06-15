/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Track, Playlist, PlaybackState } from './types';
import Sidebar from './components/Sidebar';
import PlaylistView from './components/PlaylistView';
import MusicPlayerControls from './components/MusicPlayerControls';
import DirectoryImporter from './components/DirectoryImporter';
import { INITIAL_SYNTHESIZED_TRACKS, buildPlaylistsFromTracks } from './utils/sampleLibrary';
import { audioEngine } from './utils/audioEngine';
import { Plus, X, FolderMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- Persistent Storage State initialization ---
  const [tracks, setTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem('soundflow-tracks-v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load cached tracks:', e);
      }
    }
    return INITIAL_SYNTHESIZED_TRACKS;
  });

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  // --- Dynamic calculations from tracks system ---
  // Re-build playlists folder separation whenever tracks list changes
  const { playlists, processedPool } = useMemo(() => {
    const res = buildPlaylistsFromTracks(tracks);
    return {
      playlists: res.playlists,
      // map tracks properly maintaining their parsed playlist relations
      processedPool: res.updatedTracks,
    };
  }, [tracks]);

  // Save to locale storage whenever directories update
  useEffect(() => {
    localStorage.setItem('soundflow-tracks-v2', JSON.stringify(tracks));
  }, [tracks]);

  // Active playing states
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

  // Find playlist gradient for current track background Art glow
  const currentPlaylistGradient = useMemo(() => {
    if (!activeTrack) return undefined;
    const play = playlists.find((p) => p.id === activeTrack.playlistId);
    return play ? play.coverGradient : undefined;
  }, [activeTrack, playlists]);

  // Filtered tracks list in active playlist matching Search filters
  const visibleTracks = useMemo(() => {
    let list = processedPool;
    if (selectedPlaylistId !== null) {
      list = list.filter((t) => t.playlistId === selectedPlaylistId);
    }
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.filePath.toLowerCase().includes(query)
      );
    }
    return list;
  }, [processedPool, selectedPlaylistId, searchTerm]);

  // Playlist we are currently browsing details of
  const activeBrowsingPlaylist = useMemo(() => {
    if (selectedPlaylistId === null) return null;
    return playlists.find((p) => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId]);

  // --- Track Ended / Time Seek bindings ---
  useEffect(() => {
    // Bind callbacks to audio player engine
    audioEngine.setCallbacks(
      (time, duration) => {
        setPlaybackState((prev) => ({
          ...prev,
          currentTime: time,
          progress: duration > 0 ? (time / duration) * 100 : 0,
        }));
      },
      () => {
        // Track ended -> play next song automatically
        handleNext();
      }
    );
  }, [playbackState.queue, playbackState.repeatMode, currentTrackId]);

  // Volume synchronization
  useEffect(() => {
    audioEngine.setVolume(playbackState.volume);
  }, [playbackState.volume]);

  // --- Media System Actions ---
  const handlePlayPause = () => {
    if (!currentTrackId && visibleTracks.length > 0) {
      // Pick first track
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

    // Define current list of playing queue (by active browsing context)
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

    // Trigger playing inside player engine
    audioEngine.play(track);
  };

  const handleNext = () => {
    const { queue, repeatMode, isShuffle } = playbackState;
    if (queue.length === 0) return;

    // Repeat one track override
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
        nextIndex = 0; // Wrap around to the start
      } else {
        // Stop playing
        audioEngine.pause();
        setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentTime: 0, progress: 0 }));
        return;
      }
    }

    const nextTrackId = queue[nextIndex];
    handleSelectTrack(nextTrackId, queue);
  };

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
        prevIndex = queue.length - 1; // Wrap around to end
      }
    }

    const prevTrackId = queue[prevIndex];
    handleSelectTrack(prevTrackId, queue);
  };

  // Trigger playing playlist directly (Header Banner Play actions)
  const handlePlayPlaylist = (playlistId: string | null, shuffle: boolean) => {
    let playTracks = processedPool;
    if (playlistId !== null) {
      playTracks = processedPool.filter((t) => t.playlistId === playlistId);
    }

    if (playTracks.length === 0) return;

    let trackIds = playTracks.map((t) => t.id);
    let startTrackId = trackIds[0];

    if (shuffle) {
      // Shuffling track list
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

  const handleSeek = (seconds: number) => {
    audioEngine.seek(seconds);
  };

  // --- Dynamic Database Modifications ---
  const handleImportedTracks = (newTracks: Track[]) => {
    // Add newly processed tracks recursively
    setTracks((prev) => {
      // Evict duplicates if they exist
      const existingUrls = new Set(prev.map((t) => t.id));
      const filteredNew = newTracks.filter((t) => !existingUrls.has(t.id));
      return [...prev, ...filteredNew];
    });
  };

  // Creates an empty virtual directory with no files so users can add tracks or simulate playlists
  const handleCreateVirtualFolder = () => {
    if (!newFolderName.trim()) return;

    const dummySongName = 'First Synthesized Loop';
    const folderSlug = newFolderName.trim();
    const folderPlaylistId = folderSlug.toLowerCase();

    // Create a default initial synthesizer track to represent the playlist directory immediately
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
    
    // Jump to browsing the newly created folder right away
    setSelectedPlaylistId(folderPlaylistId);
  };

  // Clear a playlist's tracks completely and remove it
  const handleRemovePlaylist = (playlistId: string) => {
    setTracks((prev) => prev.filter((t) => t.playlistId !== playlistId));
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
  };

  return (
    <div
      className="w-full h-screen bg-[#060608] text-white flex flex-col justify-between overflow-hidden relative selection:bg-red-500/30 antialiased"
      id="soundflow-layout-system"
    >
      {/* Ambient background glows for glassmorphism */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[140px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Main Container Area */}
      <div className="flex-1 flex min-h-0 relative z-10">
        <Sidebar
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          onSelectPlaylist={(id) => {
            setSelectedPlaylistId(id);
            setSearchTerm(''); // clear local query
          }}
          onImportClick={() => setIsImportOpen(true)}
          onCreateFolderClick={() => setIsCreateFolderOpen(true)}
          onRemovePlaylist={handleRemovePlaylist}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Browser Area Container with relative positioning for floating controls */}
        <div className="flex-1 relative flex flex-col min-w-0 bg-transparent">
          <PlaylistView
            playlist={activeBrowsingPlaylist}
            tracks={visibleTracks}
            currentTrackId={currentTrackId}
            isPlaying={playbackState.isPlaying}
            onTrackSelect={(id) => handleSelectTrack(id)}
            onPlayPlaylist={handlePlayPlaylist}
          />

          {/* Music Bottom Controls player footer floating over PlaylistView strictly */}
          <div className="pointer-events-none absolute bottom-8 inset-x-0 flex justify-center z-50">
            <div className="pointer-events-auto w-full px-8 flex justify-center">
              <MusicPlayerControls
                currentTrack={activeTrack}
                playbackState={playbackState}
                onPlayPause={handlePlayPause}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onToggleShuffle={() => setPlaybackState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))}
                onToggleRepeat={() => {
                  setPlaybackState((prev) => {
                    let nextMode: 'off' | 'all' | 'one' = 'off';
                    if (prev.repeatMode === 'off') nextMode = 'all';
                    else if (prev.repeatMode === 'all') nextMode = 'one';
                    return { ...prev, repeatMode: nextMode };
                  });
                }}
                onVolumeChange={handleVolume}
                onSeek={handleSeek}
                playlistGradient={currentPlaylistGradient}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- Overlay & Modals Section with Micro-animations --- */}
      <AnimatePresence>
        {/* Onboarding Directory Importer drawer */}
        {isImportOpen && (
          <DirectoryImporter
            onClose={() => setIsImportOpen(false)}
            onImportTracks={handleImportedTracks}
          />
        )}

        {/* Minimalist modern Folder Creator Dialog */}
        {isCreateFolderOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
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
                  className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-3 font-sans">
                <p className="text-[11.5px] text-zinc-400">
                  Enter a custom folder category. SoundFlow flattens subdirectories to build separated discrete playlists.
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
                    className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateVirtualFolder}
                    disabled={!newFolderName.trim()}
                    className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-900 disabled:text-zinc-600 font-sans font-semibold text-xs text-white rounded-lg transition-colors cursor-pointer"
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
