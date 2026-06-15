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
  ListMusic,
} from 'lucide-react';
import { Track, PlaybackState } from '../types';

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
      className="w-full max-w-2xl h-[64px] bg-white/[0.04] backdrop-blur-[64px] border border-white/10 rounded-full flex items-center justify-between px-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)] select-none mx-auto"
      style={{
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
      id="music-bar-controls"
    >
      {/* Left Block: Transport Controls */}
      <div className="flex items-center gap-4 shrink-0 w-1/4">
        <button
          onClick={onToggleShuffle}
          className={`cursor-pointer transition-colors ${
            isShuffle ? 'text-[#fa243c]' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Shuffle size={13} />
        </button>

        <button
          onClick={onPrevious}
          disabled={!currentTrack}
          className="text-zinc-200 hover:text-white disabled:text-zinc-600 transition-colors cursor-pointer"
        >
          <SkipBack size={16} fill="currentColor" />
        </button>

        <button
          onClick={onPlayPause}
          disabled={!currentTrack}
          className="text-white hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:text-zinc-600 disabled:scale-100 flex items-center justify-center w-8 h-8"
        >
          {isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-[2px]" />
          )}
        </button>

        <button
          onClick={onNext}
          disabled={!currentTrack}
          className="text-zinc-200 hover:text-white disabled:text-zinc-600 transition-colors cursor-pointer"
        >
          <SkipForward size={16} fill="currentColor" />
        </button>

        <button
          onClick={onToggleRepeat}
          className={`cursor-pointer transition-colors relative ${
            repeatMode !== 'off' ? 'text-[#fa243c]' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <RotateCcw size={13} />
          {repeatMode === 'one' && (
            <span className="absolute -top-1.5 -right-2 text-[8px] font-bold text-[#fa243c]">
              1
            </span>
          )}
        </button>
      </div>

      {/* Center Block: Track Info / Logo & Scrubber overlay */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm h-full relative group mx-auto">
        {currentTrack ? (
          <>
            <div className="flex items-center gap-2 mt-0.5 group-hover:-translate-y-1 transition-transform duration-300">
              {currentTrack.coverUrl && (
                <img src={currentTrack.coverUrl} className="w-5 h-5 rounded-[4px] object-cover shadow-sm" alt="" referrerPolicy="no-referrer" />
              )}
              <div className="flex items-center gap-1.5 text-[12px] truncate">
                <span className="font-semibold text-white truncate max-w-[120px]">{currentTrack.title}</span>
                <span className="text-zinc-500">—</span>
                <span className="text-zinc-400 truncate max-w-[120px]">{currentTrack.artist}</span>
              </div>
            </div>

            {/* Invisible expanded hit area for scrubber */}
            <div className="absolute inset-x-0 bottom-2 top-8 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 flex items-center justify-center transition-all duration-300 gap-2 px-2">
              <span className="text-[9px] text-zinc-500 min-w-[24px] text-right font-medium">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 h-3 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={handleSeekChange}
                  disabled={!currentTrack}
                  className="absolute inset-x-0 w-full h-[3px] bg-white/10 rounded-full appearance-none cursor-pointer outline-none"
                  style={{
                    background: `linear-gradient(to right, #fa243c 0%, #fa243c ${progress}%, rgba(255,255,255,0.15) ${progress}%, rgba(255,255,255,0.15) 100%)`,
                  }}
                />
              </div>

              <span className="text-[9px] text-zinc-500 min-w-[24px] font-medium">
                -{formatTime(duration - currentTime)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-zinc-600 flex flex-col items-center">
            <span className="font-semibold text-[13px] tracking-wide mt-[2px] text-zinc-500">SoundFlow</span>
          </div>
        )}
      </div>

      {/* Right Block: Volume & Extras */}
      <div className="flex items-center gap-4 shrink-0 justify-end w-1/4">
        <button className="text-zinc-400 hover:text-white transition-colors">
          <ListMusic size={15} />
        </button>
        <div className="flex items-center gap-2 w-24 shrink-0">
          <button
            onClick={handleVolumeToggle}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
            className="w-full h-[3px] bg-white/10 rounded-full appearance-none cursor-pointer outline-none"
            style={{
              height: '3px',
              background: `linear-gradient(to right, white 0%, white ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%, rgba(255,255,255,0.15) 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
