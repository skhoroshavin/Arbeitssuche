import type { AppConfig } from "@/models/config"

export interface ConfigRepository {
  load(): AppConfig
  save(data: AppConfig): Promise<void>
}
