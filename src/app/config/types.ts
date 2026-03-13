import type { AppConfig } from "@/models/config/types.js";

export interface ConfigRepository {
  load(): AppConfig;
  save(data: AppConfig): Promise<void>;
}
