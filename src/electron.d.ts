interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  getLibraryFiles: (dirPath: string) => Promise<{
    audioFiles: { name: string; path: string; size: number; relativePath: string; metadata?: any }[];
    imageFiles: { name: string; path: string; size: number; relativePath: string }[];
    libraryPath: string;
  }>;
  watchFolder: (dirPath: string) => Promise<boolean>;
  stopWatching: () => Promise<boolean>;
  getLibraryPath: () => Promise<string | null>;
  onLibraryFilesUpdated: (callback: (data: {
    audioFiles: { name: string; path: string; size: number; relativePath: string; metadata?: any }[];
    imageFiles: { name: string; path: string; size: number; relativePath: string }[];
    libraryPath: string;
  }) => void) => () => void;
  onMediaKey: (callback: (action: string) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
