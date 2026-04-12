// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  createDefaultApplicantDraftSnapshot,
  isMeaningfulApplicantDraftSnapshot,
} from "@/models/applicant"
import { ApplicantWizardPage } from "@/ui/pages/applicant"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()
const refetchDraft = vi.fn<() => Promise<{ data?: { draft?: unknown } }>>()
const deleteDraft = vi.fn<() => Promise<void>>()
const saveDraft = vi.fn<() => Promise<void>>()
const finalizeDraft = vi.fn<() => Promise<{ id: string }>>()

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("@/ui/data", async () => {
  const actual = await vi.importActual<typeof import("@/ui/data")>("@/ui/data")
  return {
    ...actual,
    useApplicantDraft: () => ({ refetch: refetchDraft }),
    useDeleteApplicantDraft: () => ({ mutateAsync: deleteDraft }),
    useSaveApplicantDraft: () => ({ mutateAsync: saveDraft }),
    useFinalizeApplicantDraft: () => ({ mutateAsync: finalizeDraft }),
  }
})

describe("Applicant wizard state", () => {
  beforeEach(() => {
    navigate.mockReset()
    refetchDraft.mockReset()
    deleteDraft.mockReset()
    saveDraft.mockReset()
    finalizeDraft.mockReset()

    refetchDraft.mockResolvedValue({ data: { draft: undefined } })
    deleteDraft.mockResolvedValue()
    saveDraft.mockResolvedValue()
    finalizeDraft.mockResolvedValue({ id: "ada-lovelace" })
  })

  it("starts from a blank non-meaningful draft", async () => {
    const user = userEvent.setup()
    const snapshot = createDefaultApplicantDraftSnapshot()

    expect(isMeaningfulApplicantDraftSnapshot(snapshot)).toBe(false)

    render(<ApplicantWizardPage />)

    await screen.findByLabelText("Name")
    await goToLastStep(user)

    expect(screen.getByRole("button", { name: "Fertigstellen" })).toBeDisabled()
  })

  it("treats typed name as meaningful and finalizable", async () => {
    const user = userEvent.setup()
    const snapshot = createDefaultApplicantDraftSnapshot()
    snapshot.personal.name = "Ada Lovelace"

    expect(isMeaningfulApplicantDraftSnapshot(snapshot)).toBe(true)

    render(<ApplicantWizardPage />)

    await user.type(await screen.findByLabelText("Name"), "Ada Lovelace")
    await goToLastStep(user)

    expect(screen.getByRole("button", { name: "Fertigstellen" })).toBeEnabled()
  })

  it("treats non-default nested data as meaningful without enabling finish", async () => {
    const user = userEvent.setup()
    const snapshot = createDefaultApplicantDraftSnapshot()
    snapshot.education.push({ institution: "TU Berlin", course: "Informatik" })

    expect(isMeaningfulApplicantDraftSnapshot(snapshot)).toBe(true)

    render(<ApplicantWizardPage />)

    await screen.findByLabelText("Name")
    await goToEducationStep(user)
    await user.type(screen.getByLabelText("Institution"), "TU Berlin")
    await user.type(screen.getByLabelText("Studiengang"), "Informatik")
    await user.click(screen.getByRole("button", { name: "Weiter" }))
    await user.click(screen.getByRole("button", { name: "Weiter" }))

    expect(screen.getByRole("button", { name: "Fertigstellen" })).toBeDisabled()
  })
})

async function goToEducationStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
}

async function goToLastStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
}
