// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SettingsAI } from "@/ui/pages/settings"

const clearAllData = vi.fn()

vi.mock("@/ui/data", async () => {
  const actual = await vi.importActual<typeof import("@/ui/data")>("@/ui/data")
  return {
    ...actual,
    useAISettingsView: () => ({
      isLoading: false,
      providers: [
        { id: "openrouter", name: "OpenRouter", description: "desc" },
      ],
      provider: "openrouter",
      secrets: {},
      models: [],
      modelsLoading: false,
      config: {
        assessmentModel: "a",
        coverLetterModel: "b",
        consultationModel: "c",
      },
      saveConfig: { mutate: vi.fn() },
    }),
    useLlmProviders: () => ({
      data: [
        {
          id: "openrouter",
          name: "OpenRouter",
          description: "desc",
          instructions: "help",
        },
      ],
    }),
    useProviderSecretActions: () => ({
      onSave: vi.fn(),
      onClear: vi.fn(),
      onTest: vi.fn(),
    }),
    useClearAllData: () => ({
      mutateAsync: clearAllData,
      isPending: false,
    }),
    resolveSecret: () => ({ masked: "", isSet: false }),
  }
})

describe("SettingsAI clear-all-data flow", () => {
  beforeEach(() => {
    clearAllData.mockReset()
    clearAllData.mockResolvedValue({ ok: true })
  })

  it("opens and cancels the confirmation dialog", async () => {
    const user = userEvent.setup()
    renderSettingsAI()

    await user.click(screen.getByRole("button", { name: "Alle Daten löschen" }))

    expect(screen.getByText(/dauerhaft gelöscht/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Abbrechen" }))

    expect(screen.queryByText(/dauerhaft gelöscht/i)).not.toBeInTheDocument()
    expect(clearAllData).not.toHaveBeenCalled()
  })

  it("confirms deletion and navigates to the post-delete screen", async () => {
    const user = userEvent.setup()
    renderSettingsAI()

    await user.click(screen.getByRole("button", { name: "Alle Daten löschen" }))
    await user.click(screen.getByRole("button", { name: "Alles löschen" }))

    expect(clearAllData).toHaveBeenCalledOnce()
    expect(await screen.findByText("Deleted Screen")).toBeInTheDocument()
  })
})

function renderSettingsAI() {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsAI />} />
          <Route path="/data-cleared" element={<div>Deleted Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
