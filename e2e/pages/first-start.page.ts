import { expect, type Locator, type Page } from "@playwright/test"

export class FirstStartPage {
  readonly page: Page
  readonly title: Locator
  readonly aiHeading: Locator
  readonly mapsHeading: Locator
  readonly continueButton: Locator
  readonly finishButton: Locator
  readonly skipButton: Locator
  readonly skipConfirmButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByText("Ersteinrichtung", { exact: true })
    this.aiHeading = page.getByRole("heading", {
      name: "Künstliche Intelligenz",
    })
    this.mapsHeading = page.getByRole("heading", { name: "Karten" })
    this.continueButton = page.getByRole("button", { name: "Weiter" })
    this.finishButton = page.getByRole("button", { name: "Fertigstellen" })
    this.skipButton = page.getByRole("button", { name: "Überspringen" })
    this.skipConfirmButton = page.getByRole("button", {
      name: "Trotzdem überspringen",
    })
  }

  async assertVisible(): Promise<void> {
    await expect(this.title).toBeVisible()
    await expect(this.aiHeading).toBeVisible()
    await expect(this.continueButton).toBeVisible()
  }
}
