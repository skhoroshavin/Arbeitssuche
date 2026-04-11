// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import {
  createDefaultApplicantDraftSnapshot,
  isMeaningfulApplicantDraftSnapshot,
} from "@/models/applicant"
import {
  canFinalizeApplicantWizard,
  createFreshApplicantWizardSnapshot,
} from "./wizard-modal"

describe("Applicant wizard state", () => {
  it("starts from a blank non-meaningful draft", () => {
    const snapshot = createFreshApplicantWizardSnapshot()

    expect(snapshot).toEqual(createDefaultApplicantDraftSnapshot())
    expect(isMeaningfulApplicantDraftSnapshot(snapshot)).toBe(false)
    expect(canFinalizeApplicantWizard(snapshot)).toBe(false)
  })

  it("treats typed name as meaningful and finalizable", () => {
    const snapshot = createFreshApplicantWizardSnapshot()
    snapshot.personal.name = "Ada Lovelace"

    expect(isMeaningfulApplicantDraftSnapshot(snapshot)).toBe(true)
    expect(canFinalizeApplicantWizard(snapshot)).toBe(true)
  })

  it("treats non-default nested data as meaningful", () => {
    const snapshot = createFreshApplicantWizardSnapshot()
    snapshot.education.push({ institution: "TU Berlin", course: "Informatik" })

    expect(isMeaningfulApplicantDraftSnapshot(snapshot)).toBe(true)
    expect(canFinalizeApplicantWizard(snapshot)).toBe(false)
  })
})
