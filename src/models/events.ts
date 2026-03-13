export interface ProgressEvent {
  message: string;
  phase?: string;
  current?: number;
  total?: number;
  vacanciesUpdated?: boolean;
}
