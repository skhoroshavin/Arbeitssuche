import {
  DEFAULT_APPLICANT,
  type Applicant,
  type ApplicantInfo,
} from "@/models/applicant/types.js";
import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import { deriveId } from "@/utils/derive-id.js";
import { createWithUniqueId } from "@/utils/create-with-unique-id.js";

class StubApplicantRepository implements ApplicantRepository {
  private readonly store: Map<string, Applicant>;

  constructor(initial?: Record<string, Applicant>) {
    this.store = new Map(initial ? Object.entries(initial) : []);
  }

  private getOrThrow(id: string): Applicant {
    const data = this.store.get(id);
    if (!data) throw new Error(`Applicant "${id}" not found`);
    return data;
  }

  list(): ApplicantInfo[] {
    return [...this.store.entries()].map(([id, data]) => ({
      id,
      name: data.personal.name || undefined,
    }));
  }

  exists(id: string): boolean {
    return this.store.has(id);
  }

  load(id: string): Applicant {
    return structuredClone(this.getOrThrow(id));
  }

  async save(id: string, data: Applicant) {
    this.getOrThrow(id); // ensure exists
    this.store.set(id, structuredClone(data));
  }

  create(name: string): string {
    const id = createWithUniqueId(
      () => deriveId(name),
      (id) => this.store.has(id),
    );
    this.store.set(id, {
      ...DEFAULT_APPLICANT,
      id,
      personal: { name },
    });
    return id;
  }

  delete(id: string): void {
    this.store.delete(id);
  }
}

export function createStubApplicantRepository(
  initial?: Record<string, Applicant>,
): ApplicantRepository {
  return new StubApplicantRepository(initial);
}
