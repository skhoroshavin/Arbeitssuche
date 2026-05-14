import { expect, type Locator, type Page } from "@playwright/test"

export class FirstStartPage {
  readonly page: Page
  readonly heading: Locator
  readonly settingsHeading: Locator
  readonly skipButton: Locator
  readonly confirmSkipButton: Locator
  readonly finishButton: Locator
  readonly resumePromptHeading: Locator
  readonly resumeButton: Locator
  readonly skipSetupButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole("heading", { name: "Ersteinrichtung" })
    this.settingsHeading = page.getByRole("heading", {
      name: "Künstliche Intelligenz",
    })
    this.skipButton = page.getByRole("button", { name: "Überspringen" })
    this.confirmSkipButton = page.getByRole("button", {
      name: "Trotzdem überspringen",
    })
    this.finishButton = page.getByRole("button", { name: "Fertigstellen" })
    this.resumePromptHeading = page.getByText("Einrichtung fortsetzen?")
    this.resumeButton = page.getByRole("button", {
      name: "Einrichtung fortsetzen",
    })
    this.skipSetupButton = page.getByRole("button", {
      name: "Einrichtung überspringen",
    })
  }

  async waitForWizard(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: 30_000 })
  }

  async handleResumePromptIfPresent(): Promise<void> {
    if (
      await this.resumePromptHeading
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await this.skipSetupButton.click()
      await expect(this.skipSetupButton).not.toBeVisible()
    }
  }

  async skipToApplicantCreation(): Promise<void> {
    await this.waitForWizard()
    await this.handleResumePromptIfPresent()

    await expect(this.settingsHeading).toBeVisible({ timeout: 15_000 })
    await this.skipButton.click()
    await this.confirmSkipButton.click()

    await expect(
      this.page.getByRole("heading", { name: "Neuen Bewerber erstellen" }),
    ).toBeVisible({ timeout: 15_000 })
  }

  async configureKeysAndFinish(): Promise<void> {
    await this.waitForWizard()
    await this.handleResumePromptIfPresent()

    await expect(this.settingsHeading).toBeVisible({ timeout: 15_000 })
  }

  async clickKartenStep(): Promise<void> {
    await this.page.getByRole("link", { name: "Karten" }).click()
  }
}
