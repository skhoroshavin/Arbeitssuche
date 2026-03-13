import type { Locator, Page } from "@playwright/test";

export class LayoutPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly sidebarTitle: Locator;
  readonly sidebarSettingsLink: Locator;
  readonly headerTitle: Locator;
  readonly headerBackLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator("aside");
    this.sidebarTitle = this.sidebar
      .locator("div.border-b")
      .first()
      .getByRole("link");
    this.sidebarSettingsLink = this.sidebar.getByRole("link", {
      name: "Einstellungen",
    });
    this.headerTitle = page.locator("header h2");
    this.headerBackLink = page.locator("header").locator("a, button").first();
  }

  async getSidebarTitleText(): Promise<string> {
    return this.sidebarTitle.innerText();
  }

  sidebarNavLink(name: string): Locator {
    return this.sidebar.locator("nav").getByRole("link", { name });
  }

  sidebarNavLinks(): Locator {
    return this.sidebar.locator("nav").getByRole("link");
  }
}
