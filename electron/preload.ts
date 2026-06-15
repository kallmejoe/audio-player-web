import { contextBridge, ipcRenderer } from 'electron';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  relativePath: string;
}

export interface LibraryFilesResponse {
  audioFiles: FileInfo[];
  imageFiles: FileInfo[];
  libraryPath: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: (): Promise<string | null> => {
    return ipcRenderer.invoke('select-folder');
  },

  getLibraryFiles: (dirPath: string): Promise<LibraryFilesResponse> => {
    return ipcRenderer.invoke('get-library-files', dirPath);
  },

  watchFolder: (dirPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('watch-folder', dirPath);
  },

  stopWatching: (): Promise<boolean> => {
    return ipcRenderer.invoke('stop-watching');
  },

  getLibraryPath: (): Promise<string | null> => {
    return ipcRenderer.invoke('get-library-path');
  },

  onLibraryFilesUpdated: (callback: (data: LibraryFilesResponse) => void) => {
    const handler = (_event: any, data: LibraryFilesResponse) => callback(data);
    ipcRenderer.on('library-files-updated', handler);
    return () => {
      ipcRenderer.removeListener('library-files-updated', handler);
    };
  },

  onMediaKey: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action);
    ipcRenderer.on('media-key', handler);
    return () => {
      ipcRenderer.removeListener('media-key', handler);
    };
  },
});
