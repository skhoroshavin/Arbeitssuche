import { test, expect } from "../fixtures.js"

test.describe("Sidebar Layout", () => {
  test("applicant back link is icon-only and returns to home", async ({
    applicantListPage,
    layoutPage,
    page,
    api,
  }) => {
    const applicantId = await api.createApplicant(`e2e-back-${Date.now()}`)
    try {
      await applicantListPage.goto()
      await applicantListPage.navigateToApplicant("e2e-back-")

      const backLink = page.getByRole("link", { name: "Startseite" })
      await expect(backLink).toBeVisible()
      await expect(backLink.locator("svg")).toBeVisible()

      await backLink.click()
      await expect(layoutPage.headerTitle).toHaveText("Bewerber")
      await expect(layoutPage.sidebarNavLinks()).toHaveCount(0)
      await expect(layoutPage.sidebarTitle).toHaveText("Startseite")
    } finally {
      await api.deleteApplicant(applicantId)
    }
  })

  test("settings page shows header, cog icon, and arrow back button", async ({
    layoutPage,
    page,
  }) => {
    await page.goto("/")
    await layoutPage.sidebarSettingsLink.click()

    await expect(layoutPage.headerTitle).toHaveText("Einstellungen")
    await expect(layoutPage.sidebarNavLinks()).toHaveCount(2)
    await expect(layoutPage.sidebarTitle).toHaveText("Einstellungen")

    // Settings link has cog icon (SVG)
    await expect(layoutPage.sidebarSettingsLink.locator("svg")).toBeVisible()

    // Back link is icon-only with aria-label
    const backLink = page
      .locator("header")
      .getByRole("link", { name: "Zurück" })
    await expect(backLink).toBeVisible()
    await expect(backLink.locator("svg")).toBeVisible()
  })

  test("settings back button returns to origin page, not home", async ({
    applicantListPage,
    layoutPage,
    page,
    api,
  }) => {
    const applicantId = await api.createApplicant(
      `e2e-settings-back-${Date.now()}`,
    )
    try {
      await applicantListPage.goto()
      await applicantListPage.navigateToApplicant("e2e-settings-back-")

      await layoutPage.sidebarSettingsLink.click()
      await expect(layoutPage.headerTitle).toHaveText("Einstellungen")

      const backLink = page
        .locator("header")
        .getByRole("link", { name: "Zurück" })
      await backLink.click()

      await expect(layoutPage.headerTitle).toContainText("e2e-settings-back-")
    } finally {
      await api.deleteApplicant(applicantId)
    }
  })

  test("settings back button preserves returnTo across sub-navigation", async ({
    applicantListPage,
    layoutPage,
    page,
    api,
  }) => {
    const applicantId = await api.createApplicant(
      `e2e-settings-sub-${Date.now()}`,
    )
    try {
      await applicantListPage.goto()
      await applicantListPage.navigateToApplicant("e2e-settings-sub-")

      await layoutPage.sidebarSettingsLink.click()
      await expect(layoutPage.headerTitle).toHaveText("Einstellungen")

      // Navigate to Maps tab within settings
      await layoutPage.sidebarNavLink("Karten").click()
      await expect(page).toHaveURL(/\/settings\/maps/)

      // Back button should still return to applicant page
      const backLink = page
        .locator("header")
        .getByRole("link", { name: "Zurück" })
      await backLink.click()

      await expect(layoutPage.headerTitle).toContainText("e2e-settings-sub-")
    } finally {
      await api.deleteApplicant(applicantId)
    }
  })
})
