import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class ApplicantPage {
  readonly page: Page;
  readonly checkboxes: Locator;
  readonly newSearchButton: Locator;
  readonly searchTermInput: Locator;
  readonly createButton: Locator;
  readonly savedStatus: Locator;
  readonly unsavedStatus: Locator;
  readonly jobSearchHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkboxes = page.getByRole("checkbox");
    this.newSearchButton = page.getByRole("button", { name: "Neue Suche" });
    this.searchTermInput = page.getByPlaceholder(
      "Suchbegriff (z.B. React Entwickler)",
    );
    this.createButton = page.getByRole("button", { name: "Erstellen" });
    this.savedStatus = page.getByText("Gespeichert", { exact: true });
    this.unsavedStatus = page.getByText("Ungespeicherte Änderungen");
    this.jobSearchHeading = page.getByRole("heading", { name: "Jobsuchen" });
  }

  tabLink(name: string): Locator {
    return this.page.getByRole("link", { name });
  }

  heading(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  field(label: string): Locator {
    return this.page.getByLabel(label);
  }

  templateButton(name: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(name) });
  }

  async goto(id: string) {
    await this.page.goto(`/applicants/${id}`);
  }

  async gotoTab(id: string, tab: string) {
    await this.page.goto(`/applicants/${id}/${tab}`);
  }

  async expectAllTabsVisible() {
    const tabs = [
      "Übersicht",
      "Persönlich",
      "Erfahrung",
      "Ausbildung",
      "Zertifikate",
      "Sonstiges",
    ];
    for (const tab of tabs) {
      await expect(this.tabLink(tab)).toBeVisible();
    }
  }

  async navigateToTab(name: string, expectedHeading: string) {
    await this.tabLink(name).click();
    await expect(this.heading(expectedHeading)).toBeVisible();
  }

  async createJobSearch(term: string) {
    await this.newSearchButton.click();
    await this.searchTermInput.fill(term);
    await this.createButton.click();
  }

  async createJobSearchViaEnter(term: string) {
    await this.newSearchButton.click();
    await this.searchTermInput.fill(term);
    await this.searchTermInput.press("Enter");
  }

  async openAndDismissSearchForm(term: string) {
    await this.newSearchButton.click();
    await this.searchTermInput.fill(term);
    await this.page.keyboard.press("Escape");
  }

  async downloadTemplate(name: string) {
    await this.templateButton(name).click();
  }
}
