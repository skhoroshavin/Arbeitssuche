import type { Locator, Page } from "@playwright/test"

export class LayoutPage {
  constructor(page: Page) {
    this.page = page
    this.sidebar = page.locator("aside")
    this.sidebarTitle = this.sidebar
      .locator("div.border-b")
      .first()
      .getByRole("link")
    this.sidebarSettingsLink = this.sidebar.getByRole("link", {
      name: "Einstellungen",
    })
    this.headerTitle = page.locator("header h2")
  }

readonly page: Page

readonly sidebarTitle: Locator

readonly sidebarSettingsLink: Locator

readonly headerTitle: Locator

sidebarNavLink(name: string): Locator {
    return this.sidebar.locator("nav").getByRole("link", { name })
  }

sidebarNavLinks(): Locator {
    return this.sidebar.locator("nav").getByRole("link")
  }
}
