/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChangeEvent } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Shuffle,
  Volume2,
  VolumeX,
  Maximize2,
  ListMusic,
  Tv,
} from 'lucide-react';
import { Track, PlaybackState } from '../types';
import { motion } from 'motion/react';

interface MusicPlayerControlsProps {
  currentTrack: Track | null;
  playbackState: PlaybackState;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onVolumeChange: (vol: number) => void;
  onSeek: (seconds: number) => void;
  playlistGradient?: string;
}

export default function MusicPlayerControls({
  currentTrack,
  playbackState,
  onPlayPause,
  onNext,
  onPrevious,
  onToggleShuffle,
  onToggleRepeat,
  onVolumeChange,
  onSeek,
  playlistGradient = 'from-zinc-800 to-zinc-950',
}: MusicPlayerControlsProps) {
  const { isPlaying, volume, currentTime, repeatMode, isShuffle } = playbackState;

  // Sound duration helper
  const duration = currentTrack ? currentTrack.duration : 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e: ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    const targetSeconds = (pct / 100) * duration;
    onSeek(targetSeconds);
  };

  const handleVolumeToggle = () => {
    onVolumeChange(volume > 0 ? 0 : 0.85);
  };

  return (
    <div
      className="w-full h-[72px] bg-[#1a1a1c]/60 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6 z-50 shrink-0"
      id="music-bar-controls"
    >
      {/* Left Block: Current Track Info vertically centered */}
      <div className="flex items-center gap-3 w-1/4 mt-[-4px]">
        {currentTrack ? (
          <>
            <div className={`w-[46px] h-[46px] rounded bg-[#2c2c2e] flex items-center justify-center shrink-0 overflow-hidden`}>
              {currentTrack.coverUrl ? (
                <img 
                  src={currentTrack.coverUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ListMusic size={20} className="text-zinc-500" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="font-sans font-medium text-sm text-white truncate leading-tight">
                {currentTrack.title}
              </span>
              <span className="font-sans text-[12px] text-zinc-400 truncate mt-0.5">
                {currentTrack.artist}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-[46px] h-[46px] rounded bg-[#2c2c2e] flex items-center justify-center shrink-0">
              <ListMusic size={20} className="text-zinc-600" />
            </div>
          </div>
        )}
      </div>

      {/* Center Block: Playback controls stack */}
      <div className="flex flex-col items-center flex-1 max-w-xl">
        <div className="flex items-center gap-6 mt-1">
          <button
            onClick={onToggleShuffle}
            className={`cursor-pointer transition-colors ${
              isShuffle ? 'text-[#fa243c]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Shuffle size={14} />
          </button>

          <button
            onClick={onPrevious}
            disabled={!currentTrack}
            className="text-white hover:text-zinc-300 disabled:text-zinc-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={onPlayPause}
            disabled={!currentTrack}
            className="w-8 h-8 rounded-full bg-transparent text-white flex items-center justify-center transition-all cursor-pointer disabled:text-zinc-700 hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-[3px]" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!currentTrack}
            className="text-white hover:text-zinc-300 disabled:text-zinc-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`cursor-pointer transition-colors relative ${
              repeatMode !== 'off' ? 'text-[#fa243c]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <RotateCcw size={14} />
            {repeatMode === 'one' && (
              <span className="absolute -top-1.5 -right-2 text-[8px] font-bold text-[#fa243c]">
                1
              </span>
            )}
          </button>
        </div>

        {/* Timeline Slider bar with red accent */}
        <div className="w-full flex items-center gap-3 mt-2">
          <span className="text-[10px] text-zinc-500 min-w-[32px] text-right">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 group h-3 flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeekChange}
              disabled={!currentTrack}
              className="absolute inset-x-0 w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none"
              style={{
                background: `linear-gradient(to right, #fa243c 0%, #fa243c ${progress}%, rgba(255,255,255,0.15) ${progress}%, rgba(255,255,255,0.15) 100%)`,
              }}
            />
          </div>

          <span className="text-[10px] text-zinc-500 min-w-[32px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right Block: Volume */}
      <div className="flex items-center gap-3 w-1/4 justify-end">
        <div className="flex items-center gap-2 w-28 shrink-0">
          <button
            onClick={handleVolumeToggle}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none"
            style={{
              background: `linear-gradient(to right, white 0%, white ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%, rgba(255,255,255,0.15) 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
