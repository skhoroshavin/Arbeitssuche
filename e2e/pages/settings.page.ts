import type { Locator, Page } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Einstellungen" });
  }

  async goto() {
    await this.page.goto("/settings");
  }

  navLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  maskedText(label: string): Locator {
    return this.page
      .locator("div")
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .getByRole("generic")
      .filter({ hasText: /••••••••|Nicht gesetzt/ });
  }

  replaceButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} ersetzen` });
  }

  clearButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} löschen` });
  }

  addButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} hinzufügen` });
  }

  tokenInput(label: string): Locator {
    return this.page.getByRole("textbox", { name: label });
  }

  saveFieldButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} speichern` });
  }

  cancelButton(label: string): Locator {
    return this.page.getByRole("button", { name: `${label} abbrechen` });
  }

  modelSelect(label: string): Locator {
    return this.page.getByRole("combobox").filter({
      has: this.page.locator("..").filter({
        has: this.page.getByText(label, { exact: true }),
      }),
    });
  }

  async replaceAndSave(label: string, value: string) {
    await this.replaceButton(label).click();
    await this.tokenInput(label).fill(value);
    await this.saveFieldButton(label).click();
  }
}
