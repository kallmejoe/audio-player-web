import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
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
  onSeek,
  onVolumeChange,
}: MusicPlayerControlsProps) {
  const { isPlaying, isShuffle, repeatMode, currentTime } = playbackState;

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
  };

  return (
    <div
      className="flex items-center gap-5 px-4 py-2 rounded-full shadow-2xl pointer-events-auto border border-white/[0.08]"
      style={{
        backgroundColor: 'rgba(28,28,30,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      id="music-bar-controls"
    >
      {/* Cover + track info */}
      <div className="flex items-center gap-3 w-[170px] shrink-0">
        <div
          className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
        >
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-zinc-800" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-medium text-white truncate leading-tight">
            {currentTrack.title}
          </span>
          <span className="text-[11px] text-zinc-400 truncate leading-tight">
            {currentTrack.artist}
          </span>
        </div>
      </div>

      {/* Progress / Seek */}
      <div className="flex items-center gap-2 w-[220px] px-2 shrink-0">
        <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{formatTime(currentTime)}</span>
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={currentTrack.duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full absolute z-10 opacity-0 cursor-pointer h-4"
          />
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full pointer-events-none" 
              style={{ width: `${playbackState.progress}%` }} 
            />
          </div>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono w-8 text-left">{formatTime(currentTrack.duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Shuffle */}
        <button
          onClick={onToggleShuffle}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer ${
            isShuffle ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-white hover:bg-white/[0.07]'
          }`}
        >
          <Shuffle size={14} />
        </button>

        {/* Previous */}
        <button
          onClick={onPrevious}
          className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
        >
          <SkipBack size={18} fill="currentColor" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer"
        >
          {isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>

        {/* Repeat */}
        <div className="relative">
          <button
            onClick={onToggleRepeat}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              repeatMode !== 'off' ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-white hover:bg-white/[0.07]'
            }`}
          >
            <Repeat size={14} />
          </button>
          {repeatMode === 'one' && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full text-[8px] flex items-center justify-center font-bold leading-none text-white">
              1
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
