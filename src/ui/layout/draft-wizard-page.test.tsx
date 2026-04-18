// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DraftWizardPage } from "@/ui/layout"

describe("DraftWizardPage", () => {
  it("shows skip button when onSkip is provided", () => {
    renderPage({ onSkip: vi.fn() })

    expect(
      screen.getByRole("button", { name: "Überspringen" }),
    ).toBeInTheDocument()
  })

  it("does not show skip button when onSkip is absent", () => {
    renderPage()

    expect(
      screen.queryByRole("button", { name: "Überspringen" }),
    ).not.toBeInTheDocument()
  })
})

function renderPage(properties: { onSkip?: () => void } = {}) {
  render(
    <DraftWizardPage
      phase="editing"
      title="Test Wizard"
      steps={["first", "second"]}
      currentStep="first"
      stepLabels={{ first: "Erster", second: "Zweiter" }}
      setStep={vi.fn()}
      onCancel={vi.fn()}
      onFinish={async () => {}}
      resumePrompt={{
        description: "",
        discardLabel: "",
        onResume: vi.fn(),
        onDiscardAndStartFresh: async () => {},
      }}
      {...properties}
    >
      <div>Body</div>
    </DraftWizardPage>,
  )
}
