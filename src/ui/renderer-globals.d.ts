interface Window {
  electronAPI?: ElectronAPI;
}

declare const electronAPI: ElectronAPI | undefined;

interface ElectronAPI {
  invoke(channel: string, ...arguments_: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...arguments_: unknown[]) => void): () => void;
}
