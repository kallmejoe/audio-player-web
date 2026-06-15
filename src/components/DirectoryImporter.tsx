/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { Track } from '../types';

interface DirectoryImporterProps {
  onClose: () => void;
  onImportTracks: (tracks: Track[]) => void;
}

export default function DirectoryImporter({ onClose, onImportTracks }: DirectoryImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedLocalFilesCount, setSelectedLocalFilesCount] = useState<number>(0);

  // Triggering the webkitdirectory selector safely
  const triggerFolderSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFolderChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setSelectedLocalFilesCount(files.length);

    const tracksFound: Track[] = [];
    const folderImagesMap: { [folderPath: string]: { coverUrl?: string; firstImage?: string } } = {};

    // First pass: scan for images to set up cover URL directory index
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/') || 
                      file.name.endsWith('.png') || 
                      file.name.endsWith('.jpg') || 
                      file.name.endsWith('.jpeg') || 
                      file.name.endsWith('.webp');

      if (isImage) {
        const parts = file.webkitRelativePath.split('/');
        let folderPath = 'root';
        let folderName = '';
        if (parts.length > 1) {
          folderPath = parts.slice(0, parts.length - 1).join('/').toLowerCase();
          folderName = parts[parts.length - 2].toLowerCase();
        }

        const fileName = file.name.toLowerCase();
        const imgUrl = URL.createObjectURL(file);

        if (!folderImagesMap[folderPath]) {
          folderImagesMap[folderPath] = {};
        }

        const currentDict = folderImagesMap[folderPath];
        if (!currentDict.firstImage) {
          currentDict.firstImage = imgUrl;
        }

        // Exact matches like foldername.jpg or foldername.png or cover/folder images
        if (
          fileName === `${folderName}.png` ||
          fileName === `${folderName}.jpg` ||
          fileName === `${folderName}.jpeg` ||
          fileName === 'cover.jpg' ||
          fileName === 'cover.png' ||
          fileName === 'folder.jpg' ||
          fileName === 'folder.png'
        ) {
          currentDict.coverUrl = imgUrl;
        }
      }
    }

    // Second pass: Parse audio files recursively
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Filter out non-audio files
      if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.m4a') && !file.name.endsWith('.ogg')) {
        continue;
      }

      // Read audio duration if possible, default to 180 (3 mins) for safety
      const duration = 180;
      const guid = `local-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;

      // Generate local Object URL for playing
      const audioUrl = URL.createObjectURL(file);

      // filePath will be e.g. "MyPlaylist/subfolder/song.mp3"
      const filePath = file.webkitRelativePath || file.name;

      const trackParts = filePath.split('/');
      let trackFolderPath = 'root';
      if (trackParts.length > 1) {
        trackFolderPath = trackParts.slice(0, trackParts.length - 1).join('/').toLowerCase();
      }

      // Assign the visual assets scanned from first pass
      const matchedCovers = folderImagesMap[trackFolderPath];
      const coverUrl = matchedCovers?.coverUrl || matchedCovers?.firstImage || undefined;

      tracksFound.push({
        id: guid,
        title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration,
        url: audioUrl,
        fileName: file.name,
        filePath,
        playlistId: '', // Filled by the global parser
        size: file.size,
        fileObject: file,
        coverUrl, // custom cover image
      });
    }

    if (tracksFound.length > 0) {
      setTimeout(() => {
        onImportTracks(tracksFound);
        setIsProcessing(false);
        onClose();
      }, 500);
    } else {
      alert('No valid audio files (MP3, WAV, etc.) found in the selected folder.');
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      id="directory-importer-modal"
    >
      <div className="w-full max-w-sm bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[#2d2d2d] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-sans font-semibold text-[13px] text-white">Add to Library</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Dynamic content rendering */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-zinc-300">
            Select a folder on your computer to import its audio files and subfolders into your SoundFlow library.
          </p>

          <div className="flex flex-col items-center gap-3 mt-2">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-5 h-5 border-2 border-[#fa243c] border-t-transparent rounded-full animate-spin" />
                <span className="text-[12px] text-zinc-400">Processing {selectedLocalFilesCount} files...</span>
              </div>
            ) : (
              <button
                onClick={triggerFolderSelect}
                className="w-full py-2 bg-[#fa243c] hover:bg-[#e02035] text-white font-medium text-[13px] rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FolderPlus size={16} />
                <span>Choose Folder...</span>
              </button>
            )}
          </div>
          
          {/* Hidden webkit folder directory input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            webkitdirectory=""
            directory=""
            onChange={handleFolderChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
