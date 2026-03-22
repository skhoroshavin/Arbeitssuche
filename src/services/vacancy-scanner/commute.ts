import type { CommuteClient } from "@/plugins/commute/types.js";
import type { Vacancy } from "@/models/vacancy/vacancy.js";
import { formatError } from "./format-error.js";

export interface ComputeCommutesInput {
  vacancies: Vacancy[];
  origin: string;
  commuteClient: CommuteClient;
  signal?: AbortSignal;
  onProgress?: (message: string, current: number, total: number) => void;
}

export interface ComputeCommutesOutput {
  vacancies: Vacancy[];
  computedCount: number;
  skippedCount: number;
  errorCount: number;
}

export async function computeCommutes(
  input: ComputeCommutesInput,
): Promise<ComputeCommutesOutput> {
  const { vacancies, origin, commuteClient, signal, onProgress } = input;

  const needsCommute = vacancies.filter(
    (v) =>
      v.active &&
      v.addresses.length > 0 &&
      v.addresses.some((addr) => !v.commute?.[addr]),
  );

  let computedCount = 0;
  let errorCount = 0;
  const total = needsCommute.length;

  const updatedMap = new Map<string, Vacancy>();

  for (let i = 0; i < needsCommute.length; i++) {
    if (signal?.aborted) break;

    const vacancy = needsCommute[i];
    onProgress?.(
      `Computing commute for "${vacancy.title}" (${i + 1}/${total})`,
      i + 1,
      total,
    );

    const commute = { ...vacancy.commute };
    let computed = false;

    for (const address of vacancy.addresses) {
      if (commute[address]) continue;

      try {
        commute[address] = await commuteClient.getCommute(origin, address);
        computed = true;
      } catch (err) {
        console.error(
          `Commute error for "${vacancy.title}" → "${address}":`,
          formatError(err),
        );
        errorCount++;
      }
    }

    if (computed) {
      updatedMap.set(vacancy.hash, vacancy.with({ commute }));
      computedCount++;
    }
  }

  const result = vacancies.map((v) => updatedMap.get(v.hash) ?? v);
  const skippedCount = vacancies.length - needsCommute.length;

  return { vacancies: result, computedCount, skippedCount, errorCount };
}
