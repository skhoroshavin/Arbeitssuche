import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class ApplicantListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newApplicantButton: Locator;
  readonly nameInput: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Bewerber" });
    this.newApplicantButton = page.getByRole("button", {
      name: "Neuer Bewerber",
    });
    this.nameInput = page.getByPlaceholder("Name (z.B. Max Mustermann)");
    this.createButton = page.getByRole("button", { name: "Erstellen" });
  }

  applicantCard(name: string): Locator {
    return this.page.locator(".cursor-pointer", { hasText: name }).first();
  }

  async goto() {
    await this.page.goto("/");
  }

  async openCreateForm() {
    await this.newApplicantButton.click();
  }

  async createApplicant(name: string) {
    await this.openCreateForm();
    await this.nameInput.fill(name);
    await this.createButton.click();
    await expect(this.createButton).not.toBeVisible({ timeout: 15000 });
  }

  async createApplicantViaEnter(name: string) {
    await this.openCreateForm();
    await this.nameInput.fill(name);
    await this.nameInput.press("Enter");
    await expect(this.createButton).not.toBeVisible({ timeout: 15000 });
  }

  async openAndDismissForm(name: string) {
    await this.openCreateForm();
    await this.nameInput.fill(name);
    await this.page.keyboard.press("Escape");
  }

  async navigateToApplicant(name: string): Promise<string> {
    await this.applicantCard(name).click();
    const url = this.page.url();
    return url.split("/applicants/")[1]?.split("/")[0] ?? "";
  }
}
