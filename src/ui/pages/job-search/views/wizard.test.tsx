// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { JobSearch } from "@/models/job-search"
import { FirstStartWizardContext } from "@/ui/layout"
import { JobSearchWizardPage } from "@/ui/pages/job-search"
import { MemoryRouter } from "react-router"

const navigate = vi.fn()
const refetchDraft = vi.fn<() => Promise<{ data?: { draft?: unknown } }>>()
const deleteDraft = vi.fn<() => Promise<void>>()
const saveDraft = vi.fn<() => Promise<void>>()
const finalizeDraft =
  vi.fn<() => Promise<{ id: string; applicantId: string }>>()

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ applicantId: "ada" }),
  }
})

vi.mock("@/ui/data", async () => {
  const actual = await vi.importActual<typeof import("@/ui/data")>("@/ui/data")
  return {
    ...actual,
    useApiKeyStatus: () => ({
      hasLlmKey: true,
      hasMapsKey: true,
      isLoading: false,
    }),
    useJobSearchDraft: () => ({ refetch: refetchDraft }),
    useDeleteJobSearchDraft: () => ({ mutateAsync: deleteDraft }),
    useSaveJobSearchDraft: () => ({ mutateAsync: saveDraft }),
    useFinalizeJobSearchDraft: () => ({ mutateAsync: finalizeDraft }),
    useGenerateDraftCoverLetter: () => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    }),
    useSiteListView: () => ({
      data: { sites: [{ name: "Demo", supportedModes: ["employment"] }] },
    }),
  }
})

describe("JobSearchWizardPage in first-start flow", () => {
  beforeEach(() => {
    navigate.mockReset()
    refetchDraft.mockReset()
    deleteDraft.mockReset()
    saveDraft.mockReset()
    finalizeDraft.mockReset()

    refetchDraft.mockResolvedValue({ data: { draft: undefined } })
    deleteDraft.mockResolvedValue()
    saveDraft.mockResolvedValue()
    finalizeDraft.mockResolvedValue({ id: "search-1", applicantId: "ada" })
  })

  it("calls first-start completion instead of navigating after finish", async () => {
    const user = userEvent.setup()
    const onPhaseComplete = vi.fn()

    render(
      <MemoryRouter>
        <FirstStartWizardContext.Provider
          value={{
            isInFirstStart: true,
            onPhaseComplete,
            skipDraftResume: false,
          }}
        >
          <JobSearchWizardPage />
        </FirstStartWizardContext.Provider>
      </MemoryRouter>,
    )

    await screen.findByLabelText("Suchbegriff")
    await goToLastStep(user)
    await user.click(screen.getByRole("button", { name: "Fertigstellen" }))

    expect(onPhaseComplete).toHaveBeenCalledWith({ jobSearchId: "search-1" })
    expect(navigate).not.toHaveBeenCalledWith(
      "/job-searches/search-1/vacancies",
    )
  })

  it("skips the draft resume prompt when first-start already resumed", async () => {
    const snapshot = new JobSearch()
    snapshot.searchTerm = "Engineer"
    refetchDraft.mockResolvedValue({
      data: { draft: snapshot },
    })

    render(
      <MemoryRouter>
        <FirstStartWizardContext.Provider
          value={{
            isInFirstStart: true,
            onPhaseComplete: vi.fn(),
            skipDraftResume: true,
          }}
        >
          <JobSearchWizardPage />
        </FirstStartWizardContext.Provider>
      </MemoryRouter>,
    )

    expect(
      screen.queryByText(/Es gibt eine fortsetzbare Jobsuche im Entwurf/i),
    ).not.toBeInTheDocument()

    await waitFor(async () => {
      expect(await screen.findByLabelText("Suchbegriff")).toHaveValue(
        "Engineer",
      )
    })
  })
})

async function goToLastStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
  await user.click(screen.getByRole("button", { name: "Weiter" }))
}
