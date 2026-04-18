// @vitest-environment jsdom
import { StrictMode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useSetupState, mutateAsync } = vi.hoisted(() => ({
  useSetupState: vi.fn<
    () => {
      isLoading: boolean
      data?: { state?: { lastPhase?: string; lastStep?: string } }
    }
  >(),
  mutateAsync: vi.fn(),
}))

vi.mock("@/ui/data", async () => {
  const actual = await vi.importActual<typeof import("@/ui/data")>("@/ui/data")
  return {
    ...actual,
    useSetupState,
    useSaveSetupState: () => ({ mutateAsync }),
  }
})

vi.mock("@/ui/pages/settings/views/ai", () => ({
  default: () => <div>AI Step</div>,
}))

vi.mock("@/ui/pages/settings/views/maps", () => ({
  default: () => <div>Maps Step</div>,
}))

import { FirstStartSettingsStep } from "@/ui/pages/settings/views/first-start-step"

describe("FirstStartSettingsStep", () => {
  beforeEach(() => {
    useSetupState.mockReset()
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ completed: false, lastPhase: "settings" })
  })

  it("persists the initial settings step only once in strict mode", async () => {
    useSetupState.mockReturnValue({
      isLoading: false,
      data: { state: undefined },
    })

    renderStep()

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledOnce()
    })

    expect(mutateAsync).toHaveBeenCalledWith({
      completed: false,
      lastPhase: "settings",
      lastStep: "ai",
    })
  })
})

function renderStep() {
  const queryClient = new QueryClient()

  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/first-start/settings"]}>
          <Routes>
            <Route
              path="/first-start/settings"
              element={<FirstStartSettingsStep />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}
