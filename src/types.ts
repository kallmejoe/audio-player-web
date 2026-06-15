/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url: string; // ObjectURL or audio stream
  fileName: string;
  filePath: string; // original webkitRelativePath
  playlistId: string;
  size?: number; // size in bytes
  fileObject?: File; // For real uploaded files
  isSynthesized?: boolean; // if generated on the fly
  synthesizedTempo?: number;
  synthesizedGenre?: 'ambient' | 'lofi' | 'techno' | 'space';
  coverUrl?: string; // custom image url extracted or uploaded
}

export interface Playlist {
  id: string; // often the relative path of the folder
  name: string; // name of the folder
  folderPath: string; // original folder path relation
  trackIds: string[];
  coverGradient: string; // CSS gradient string
  isCustom?: boolean; // if created through the Virtual Path UI
  coverUrl?: string; // custom cover image url
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrackId: string | null;
  queue: string[]; // List of Track IDs in play order
  history: string[]; // Track IDs played previously
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  volume: number; // 0 to 1
  currentTime: number; // in seconds
  progress: number; // percentage 0 to 100
}
