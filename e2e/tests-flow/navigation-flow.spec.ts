import { test, expect } from "../fixtures.js";

test.describe("Sidebar Layout", () => {
  test("home page shows sidebar with title and settings link, no nav tabs", async ({
    applicantListPage,
    layoutPage,
  }) => {
    await applicantListPage.goto();
    await expect(layoutPage.sidebarTitle).toBeVisible();
    await expect(layoutPage.sidebarTitle).toHaveText("Startseite");
    await expect(layoutPage.sidebarSettingsLink).toBeVisible();
    await expect(layoutPage.sidebarNavLinks()).toHaveCount(0);
    await expect(layoutPage.headerTitle).toHaveText("Bewerber");
  });

  test("applicant view shows sidebar tabs and header with back link", async ({
    applicantListPage,
    layoutPage,
    api,
  }) => {
    const applicantId = await api.createApplicant(`e2e-nav-${Date.now()}`);
    try {
      await applicantListPage.goto();
      await applicantListPage.navigateToApplicant(`e2e-nav-`);

      await expect(layoutPage.sidebarNavLinks()).toHaveCount(6);
      await expect(layoutPage.sidebarNavLink("Übersicht")).toBeVisible();
      await expect(layoutPage.sidebarNavLink("Persönlich")).toBeVisible();
      await expect(layoutPage.sidebarNavLink("Erfahrung")).toBeVisible();
      await expect(layoutPage.sidebarNavLink("Ausbildung")).toBeVisible();
      await expect(layoutPage.sidebarNavLink("Zertifikate")).toBeVisible();
      await expect(layoutPage.sidebarNavLink("Sonstiges")).toBeVisible();

      await expect(layoutPage.headerTitle).toContainText("e2e-nav-");
      await expect(layoutPage.sidebarTitle).toHaveText("Bewerber");
    } finally {
      await api.deleteApplicant(applicantId);
    }
  });

  test("applicant back link is icon-only and returns to home", async ({
    applicantListPage,
    layoutPage,
    page,
    api,
  }) => {
    const applicantId = await api.createApplicant(`e2e-back-${Date.now()}`);
    try {
      await applicantListPage.goto();
      await applicantListPage.navigateToApplicant("e2e-back-");

      const backLink = page.getByRole("link", { name: "Startseite" });
      await expect(backLink).toBeVisible();
      await expect(backLink.locator("svg")).toBeVisible();

      await backLink.click();
      await expect(layoutPage.headerTitle).toHaveText("Bewerber");
      await expect(layoutPage.sidebarNavLinks()).toHaveCount(0);
      await expect(layoutPage.sidebarTitle).toHaveText("Startseite");
    } finally {
      await api.deleteApplicant(applicantId);
    }
  });

  test("sidebar tab navigation works for applicant", async ({
    applicantPage,
    layoutPage,
    api,
  }) => {
    const applicantId = await api.createApplicant(`e2e-tabs-${Date.now()}`);
    try {
      await applicantPage.goto(applicantId);

      await layoutPage.sidebarNavLink("Persönlich").click();
      await expect(applicantPage.heading("Persönlich")).toBeVisible();

      await layoutPage.sidebarNavLink("Erfahrung").click();
      await expect(applicantPage.heading("Berufserfahrung")).toBeVisible();

      await layoutPage.sidebarNavLink("Übersicht").click();
      await expect(applicantPage.heading("Lebenslauf")).toBeVisible();
    } finally {
      await api.deleteApplicant(applicantId);
    }
  });

  test("settings page shows header, cog icon, and arrow back button", async ({
    layoutPage,
    page,
  }) => {
    await page.goto("/");
    await layoutPage.sidebarSettingsLink.click();

    await expect(layoutPage.headerTitle).toHaveText("Einstellungen");
    await expect(layoutPage.sidebarNavLinks()).toHaveCount(2);
    await expect(layoutPage.sidebarTitle).toHaveText("Einstellungen");

    // Settings link has cog icon (SVG)
    await expect(layoutPage.sidebarSettingsLink.locator("svg")).toBeVisible();

    // Back link is icon-only with aria-label
    const backLink = page
      .locator("header")
      .getByRole("link", { name: "Zurück" });
    await expect(backLink).toBeVisible();
    await expect(backLink.locator("svg")).toBeVisible();
  });

  test("settings back button returns to origin page, not home", async ({
    applicantListPage,
    layoutPage,
    page,
    api,
  }) => {
    const applicantId = await api.createApplicant(
      `e2e-settings-back-${Date.now()}`,
    );
    try {
      await applicantListPage.goto();
      await applicantListPage.navigateToApplicant("e2e-settings-back-");

      await layoutPage.sidebarSettingsLink.click();
      await expect(layoutPage.headerTitle).toHaveText("Einstellungen");

      const backLink = page
        .locator("header")
        .getByRole("link", { name: "Zurück" });
      await backLink.click();

      await expect(layoutPage.headerTitle).toContainText("e2e-settings-back-");
    } finally {
      await api.deleteApplicant(applicantId);
    }
  });

  test("settings back button preserves returnTo across sub-navigation", async ({
    applicantListPage,
    layoutPage,
    page,
    api,
  }) => {
    const applicantId = await api.createApplicant(
      `e2e-settings-sub-${Date.now()}`,
    );
    try {
      await applicantListPage.goto();
      await applicantListPage.navigateToApplicant("e2e-settings-sub-");

      await layoutPage.sidebarSettingsLink.click();
      await expect(layoutPage.headerTitle).toHaveText("Einstellungen");

      // Navigate to Maps tab within settings
      await layoutPage.sidebarNavLink("Karten").click();
      await expect(page).toHaveURL(/\/settings\/maps/);

      // Back button should still return to applicant page
      const backLink = page
        .locator("header")
        .getByRole("link", { name: "Zurück" });
      await backLink.click();

      await expect(layoutPage.headerTitle).toContainText("e2e-settings-sub-");
    } finally {
      await api.deleteApplicant(applicantId);
    }
  });
});
