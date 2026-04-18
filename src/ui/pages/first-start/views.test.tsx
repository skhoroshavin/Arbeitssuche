// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataClearedPage, FirstStartWizard } from "@/ui/pages/first-start"

const { useSetupState, mutateComplete, mutateSave, closeApp } = vi.hoisted(
  () => ({
    useSetupState: vi.fn<
      () => {
        isLoading: boolean
        data?: {
          state?: {
            completed: boolean
            lastPhase?: string
            applicantId?: string
          }
        }
      }
    >(),
    mutateComplete: vi.fn(),
    mutateSave: vi.fn(),
    closeApp: vi.fn<() => Promise<{ ok: true }>>(),
  }),
)

vi.mock("@/ui/data", async () => {
  const actual = await vi.importActual<typeof import("@/ui/data")>("@/ui/data")
  return {
    ...actual,
    useSetupState,
    useSaveSetupState: () => ({ mutateAsync: mutateSave }),
    useCompleteSetupState: () => ({ mutateAsync: mutateComplete }),
    closeApp,
  }
})

describe("FirstStartWizard resume flow", () => {
  beforeEach(() => {
    useSetupState.mockReset()
    mutateComplete.mockReset()
    mutateSave.mockReset()
    closeApp.mockReset()
    closeApp.mockResolvedValue({ ok: true })
    mutateComplete.mockResolvedValue({ completed: true })
    mutateSave.mockResolvedValue({ completed: false })
  })

  it("resumes into the saved phase when the user chooses resume", async () => {
    const user = userEvent.setup()
    useSetupState.mockReturnValue({
      isLoading: false,
      data: { state: { completed: false, lastPhase: "applicant" } },
    })

    renderFirstStart(["/first-start"])

    await user.click(
      screen.getByRole("button", { name: "Einrichtung fortsetzen" }),
    )

    await waitFor(() => {
      expect(screen.getByText("Applicant Phase")).toBeInTheDocument()
    })
  })

  it("marks setup complete when the user chooses skip", async () => {
    const user = userEvent.setup()
    useSetupState.mockReturnValue({
      isLoading: false,
      data: {
        state: {
          completed: false,
          lastPhase: "job-search",
          applicantId: "ada",
        },
      },
    })

    renderFirstStart(["/first-start"])

    await user.click(
      screen.getByRole("button", { name: "Einrichtung überspringen" }),
    )

    await waitFor(() => {
      expect(mutateComplete).toHaveBeenCalledOnce()
      expect(screen.getByText("Home")).toBeInTheDocument()
    })
  })
})

describe("DataClearedPage", () => {
  it("starts configuration from the post-deletion screen", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/data-cleared"]}>
        <Routes>
          <Route path="/data-cleared" element={<DataClearedPage />} />
          <Route
            path="/first-start/settings"
            element={<div>Setup Settings</div>}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole("button", { name: "Konfiguration starten" }),
    )

    expect(screen.getByText("Setup Settings")).toBeInTheDocument()
  })

  it("closes the app from the post-deletion screen", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/data-cleared"]}>
        <Routes>
          <Route path="/data-cleared" element={<DataClearedPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "App schließen" }))

    expect(closeApp).toHaveBeenCalledOnce()
  })
})

function renderFirstStart(initialEntries: string[]) {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/first-start" element={<FirstStartWizard />}>
            <Route path="applicant" element={<div>Applicant Phase</div>} />
            <Route path="settings" element={<div>Settings Phase</div>} />
            <Route
              path="job-search/:applicantId"
              element={<div>Job Search Phase</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
