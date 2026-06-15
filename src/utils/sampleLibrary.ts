/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track, Playlist } from '../types';

// Color gradients inspired by Apple Music and Linear sleek dark accents
const PALETTE_GRADIENTS = [
  'from-[#ff1b6b] to-[#45caff]', // Apple hot pink/blue
  'from-[#7928ca] to-[#ff0080]', // Vercel gradient
  'from-[#3730a3] to-[#a21caf]', // Indigos/purples
  'from-[#0f172a] to-[#38bdf8]', // Cyan dark
  'from-[#059669] to-[#34d399]', // Linear green
  'from-[#ea580c] to-[#f43f5e]', // Sunset orange-rose
  'from-[#111827] to-[#111827]', // Pure Slate dark
  'from-[#a855f7] to-[#22d3ee]', // Neon purple-teal
];

export function getRandomGradient(index: number): string {
  return PALETTE_GRADIENTS[index % PALETTE_GRADIENTS.length];
}

export const INITIAL_SYNTHESIZED_TRACKS: Track[] = [
  // Ambient subfolder 1: Ambient/Basics (Flattened as its own playlist)
  {
    id: 'ambient-1',
    title: 'Digital Solitude',
    artist: 'Antigravity Synth',
    album: 'Procedural Waves',
    duration: 180,
    url: '',
    fileName: 'Digital Solitude.mp3',
    filePath: 'Ambient/Basics/Digital Solitude.mp3',
    playlistId: '', // To be filled by parser
    isSynthesized: true,
    synthesizedGenre: 'ambient',
    synthesizedTempo: 65,
  },
  {
    id: 'ambient-2',
    title: 'Soft Canopy',
    artist: 'Antigravity Synth',
    album: 'Procedural Waves',
    duration: 180,
    url: '',
    fileName: 'Soft Canopy.mp3',
    filePath: 'Ambient/Basics/Soft Canopy.mp3',
    playlistId: '',
    isSynthesized: true,
    synthesizedGenre: 'ambient',
    synthesizedTempo: 70,
  },
  // Ambient subfolder 2: Ambient/Deep Space (Flattened as its own playlist)
  {
    id: 'space-1',
    title: 'Starfield Symmetries',
    artist: 'Stellar Voyager',
    album: 'Cosmic Drift',
    duration: 180,
    url: '',
    fileName: 'Starfield Symmetries.mp3',
    filePath: 'Ambient/Deep Space/Starfield Symmetries.mp3',
    playlistId: '',
    isSynthesized: true,
    synthesizedGenre: 'space',
    synthesizedTempo: 45,
  },
  {
    id: 'space-2',
    title: 'Event Horizon',
    artist: 'Stellar Voyager',
    album: 'Cosmic Drift',
    duration: 180,
    url: '',
    fileName: 'Event Horizon.mp3',
    filePath: 'Ambient/Deep Space/Event Horizon.mp3',
    playlistId: '',
    isSynthesized: true,
    synthesizedGenre: 'space',
    synthesizedTempo: 40,
  },
  // Electronic subfolder 1: Electronic/Lofi (Flattened)
  {
    id: 'lofi-1',
    title: 'Build Session Cozy',
    artist: 'Vercel Chill',
    album: 'Linear Backlog Beats',
    duration: 180,
    url: '',
    fileName: 'Build Session Cozy.mp3',
    filePath: 'Electronic/Lofi/Build Session Cozy.mp3',
    playlistId: '',
    isSynthesized: true,
    synthesizedGenre: 'lofi',
    synthesizedTempo: 85,
  },
  {
    id: 'lofi-2',
    title: 'Sunset Pull Request',
    artist: 'Vercel Chill',
    album: 'Linear Backlog Beats',
    duration: 180,
    url: '',
    fileName: 'Sunset Pull Request.mp3',
    filePath: 'Electronic/Lofi/Sunset Pull Request.mp3',
    playlistId: '',
    isSynthesized: true,
    synthesizedGenre: 'lofi',
    synthesizedTempo: 82,
  },
  // Electronic subfolder 2: Electronic/Techno (Flattened)
  {
    id: 'techno-1',
    title: 'Dev Server Ingress',
    artist: 'Linear Driver',
    album: 'Port 3000 Acid',
    duration: 180,
    url: '',
    fileName: 'Dev Server Ingress.mp3',
    filePath: 'Electronic/Techno/Dev Server Ingress.mp3',
    playlistId: '',
    isSynthesized: true,
    synthesizedGenre: 'techno',
    synthesizedTempo: 125,
  },
  {
    id: 'techno-2',
    title: 'HMR Hype Beats',
    artist: 'Linear Driver',
    album: 'Port 3000 Acid',
    duration: 180,
    url: '',
    fileName: 'HMR Hype Beats.mp3',
    filePath: 'Electronic/Techno/HMR Hype Beats.mp3',
    playlistId: '',
    isSynthesized: true,
    synthesizedGenre: 'techno',
    synthesizedTempo: 120,
  },
];

/**
 * Parses file paths or track structures and flattens them into discrete playlists.
 * A folder is represented by the direct parent name of the file's relative filepath.
 * e.g., "Ambient/Basics/Digital Solitude.mp3" will belong to playlist "Basics" (id: "Ambient/Basics")
 */
export function buildPlaylistsFromTracks(tracks: Track[]): { playlists: Playlist[]; updatedTracks: Track[] } {
  const playlistMap: Map<string, Playlist> = new Map();
  const updatedTracks = tracks.map((track) => {
    // Determine the playlist name and folderPath from the filePath
    // e.g. "Ambient/Deep Space/Event Horizon.mp3" -> parts: ["Ambient", "Deep Space", "Event Horizon.mp3"]
    const parts = track.filePath.split('/');
    
    // Default values if file is in root
    let folderPath = 'Root';
    let playlistName = 'Local Library';
    
    if (parts.length > 1) {
      // It sits inside a folder!
      // The parent folder is everything except the actual file name
      folderPath = parts.slice(0, parts.length - 1).join('/');
      // The immediate folder name is the last element of the parent folders
      playlistName = parts[parts.length - 2];
    }

    const playlistId = folderPath.toLowerCase();

    // Create playlist if it doesn't exist
    if (!playlistMap.has(playlistId)) {
      playlistMap.set(playlistId, {
        id: playlistId,
        name: playlistName,
        folderPath: folderPath,
        trackIds: [],
        coverGradient: getRandomGradient(playlistMap.size),
        coverUrl: track.coverUrl,
      });
    } else {
      const playlist = playlistMap.get(playlistId)!;
      if (!playlist.coverUrl && track.coverUrl) {
        playlist.coverUrl = track.coverUrl;
      }
    }

    const playlist = playlistMap.get(playlistId)!;
    playlist.trackIds.push(track.id);

    return {
      ...track,
      playlistId: playlistId,
    };
  });

  return {
    playlists: Array.from(playlistMap.values()),
    updatedTracks,
  };
}
