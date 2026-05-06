import { describe, it, expect, vi } from "vitest"
import { CommuteComputer } from "."
import { Vacancy } from "@/models/vacancy/index.js"
import type { CommuteClient } from "@/plugins/commute"
import type { Applicant } from "@/models/applicant"

describe("CommuteComputer", () => {
  it("returns vacancies unchanged when no commute client configured", async () => {
    const computer = new CommuteComputer()
    const vacancies = [makeVacancy("h1")]

    const result = await computer.compute(vacancies, APPLICANT)
    expect(result).toBe(vacancies)
  })

  it("returns vacancies unchanged when applicant has no address", async () => {
    const client: CommuteClient = {
      getCommute: vi.fn(),
    }
    const computer = new CommuteComputer(client)
    const applicantWithoutAddress = {
      ...APPLICANT,
      personal: { ...APPLICANT.personal, address: undefined },
    }
    const vacancies = [makeVacancy("h1")]

    const result = await computer.compute(
      vacancies,
      applicantWithoutAddress,
    )
    expect(result).toBe(vacancies)
    expect(client.getCommute).not.toHaveBeenCalled()
  })

  it("computes commute for vacancies with addresses", async () => {
    const client: CommuteClient = {
      getCommute: vi.fn().mockResolvedValue("15 min"),
    }
    const computer = new CommuteComputer(client)
    const vacancy = makeVacancy("h1", { addresses: ["Berlin"] })
    const vacancies = [vacancy]

    const result = await computer.compute(vacancies, APPLICANT)
    expect(result[0].commute["Berlin"]).toBe("15 min")
    expect(client.getCommute).toHaveBeenCalled()
  })

  it("handles API errors gracefully and continues", async () => {
    const client: CommuteClient = {
      getCommute: vi.fn().mockRejectedValue(new Error("API error")),
    }
    const computer = new CommuteComputer(client)
    const vacancy = makeVacancy("h1", { addresses: ["Berlin"] })
    const vacancies = [vacancy]

    const result = await computer.compute(vacancies, APPLICANT)
    expect(result[0]).toBe(vacancy)
  })

  it("respects abort signal", async () => {
    const client: CommuteClient = {
      getCommute: vi.fn().mockResolvedValue("15 min"),
    }
    const computer = new CommuteComputer(client)
    const controller = new AbortController()
    controller.abort()
    const vacancy = makeVacancy("h1", { addresses: ["Berlin"] })

    const result = await computer.compute(
      [vacancy],
      APPLICANT,
      controller.signal,
    )
    expect(result).toEqual([vacancy])
  })
})

const APPLICANT: Applicant = {
  id: "a1",
  personal: {
    name: "Test User",
    hobbies: [],
    address: { street: "Teststr. 1", zip: "10115", city: "Berlin" },
  },
  disclose: {
    birthdate: false,
    gender: false,
    address: false,
    hobbies: false,
  },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
}

function makeVacancy(
  hash: string,
  overrides: Partial<ConstructorParameters<typeof Vacancy>[0]> = {},
): Vacancy {
  return new Vacancy({
    hash,
    title: "Developer",
    company: "ACME",
    activityHistory: [],
    active: true,
    ...overrides,
  })
}
