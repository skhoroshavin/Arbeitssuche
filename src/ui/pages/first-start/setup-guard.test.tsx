// @vitest-environment jsdom
import { StrictMode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SetupGuard } from "@/ui/pages/first-start"

const { useSetupState, useApplicantListView, mutateAsync } = vi.hoisted(() => ({
  useSetupState: vi.fn<
    () => {
      isLoading: boolean
      data?: { state?: { completed: boolean; lastPhase?: string } }
    }
  >(),
  useApplicantListView:
    vi.fn<
      () => { isLoading: boolean; data: Array<{ id: string; name: string }> }
    >(),
  mutateAsync: vi.fn(),
}))

vi.mock("@/ui/data", async () => {
  const actual = await vi.importActual<typeof import("@/ui/data")>("@/ui/data")
  return {
    ...actual,
    useSetupState,
    useApplicantListView,
    useCompleteSetupState: () => ({ mutateAsync }),
  }
})

describe("SetupGuard", () => {
  beforeEach(() => {
    useSetupState.mockReset()
    useApplicantListView.mockReset()
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ completed: true })
  })

  it("renders normal app content when setup is complete", () => {
    mockState({ completed: true })

    renderGuard(["/"])

    expect(screen.getByText("App Ready")).toBeInTheDocument()
  })

  it("redirects incomplete setup to the first-start entry route", async () => {
    mockState({ completed: false, lastPhase: "applicant" })

    renderGuard(["/"])

    await waitFor(() => {
      expect(screen.getByText("First Start")).toBeInTheDocument()
    })
  })

  it("marks legacy users complete when applicants already exist", async () => {
    useSetupState.mockReturnValue({
      isLoading: false,
      data: { state: undefined },
    })
    useApplicantListView.mockReturnValue({
      isLoading: false,
      data: [{ id: "ada", name: "Ada" }],
    })

    renderGuard(["/"])

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledOnce()
    })
  })

  it("treats missing state with no applicants as a fresh user", async () => {
    useSetupState.mockReturnValue({
      isLoading: false,
      data: { state: undefined },
    })
    useApplicantListView.mockReturnValue({ isLoading: false, data: [] })

    renderGuard(["/"])

    await waitFor(() => {
      expect(screen.getByText("First Start")).toBeInTheDocument()
    })
  })
})

function mockState(data: unknown) {
  useSetupState.mockReturnValue({ isLoading: false, data: { state: data } })
  useApplicantListView.mockReturnValue({ isLoading: false, data: [] })
}

function renderGuard(initialEntries: string[]) {
  const queryClient = new QueryClient()

  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<SetupGuard />}>
              <Route path="/" element={<div>App Ready</div>} />
            </Route>
            <Route path="/first-start" element={<div>First Start</div>} />
            <Route
              path="/first-start/settings"
              element={<div>First Start</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}
