export function api(): ElectronAPI {
  if (!electronAPI) throw new Error("electronAPI not available")
  return electronAPI
}
