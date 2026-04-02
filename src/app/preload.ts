import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  invoke(channel: string, ...arguments_: unknown[]) {
    return ipcRenderer.invoke(channel, ...arguments_);
  },

  on(channel: string, callback: (...arguments_: unknown[]) => void) {
    const listener = (
      _event: Electron.IpcRendererEvent,
      ...arguments_: unknown[]
    ) => callback(...arguments_);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
});
