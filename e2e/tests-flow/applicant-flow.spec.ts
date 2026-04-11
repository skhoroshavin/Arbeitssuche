import { test, expect } from "../fixtures.js"

test.describe("Applicant Flow", () => {
  test("can create and view an applicant", async ({
    applicantListPage,
    api,
  }) => {
    await applicantListPage.goto()
    await applicantListPage.createApplicant("E2e Test Applicant")

    await expect(
      applicantListPage.applicantCard("E2e Test Applicant"),
    ).toBeVisible()

    const applicantId =
      await applicantListPage.navigateToApplicant("E2e Test Applicant")
    await expect(
      applicantListPage.page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible()

    if (applicantId) {
      await api.deleteApplicant(applicantId)
    }
  })
})

test.describe("Applicant Tabs & Edit Forms", () => {
  let applicantId: string

  test.beforeEach(async ({ api }) => {
    applicantId = await api.createApplicant(`e2e-tabs-${Date.now()}`)
  })

  test.afterEach(async ({ api }) => {
    await api.deleteApplicant(applicantId)
  })

  test("can navigate to each edit tab", async ({ applicantPage }) => {
    await applicantPage.goto(applicantId)

    await applicantPage.navigateToTab("Persönlich", "Persönlich")
    await applicantPage.navigateToTab("Erfahrung", "Berufserfahrung")
    await applicantPage.navigateToTab("Ausbildung", "Ausbildung")
    await applicantPage.navigateToTab("Zertifikate", "Zertifikate")
    await applicantPage.navigateToTab("Sonstiges", "Sonstiges")
    await applicantPage.navigateToTab("Übersicht", "Lebenslauf")
  })

  test("auto-saves personal data after editing", async ({
    applicantPage,
    api,
  }) => {
    await applicantPage.gotoTab(applicantId, "personal")

    await applicantPage.field("E-Mail").fill("test@example.com")
    await applicantPage.field("Telefon").fill("0123456789")

    await expect(applicantPage.savedStatus).toBeVisible({ timeout: 5000 })

    const saved = (await api.getApplicant(applicantId)) as {
      personal: { email: string; phone: string }
    }
    expect(saved.personal.email).toBe("test@example.com")
    expect(saved.personal.phone).toBe("0123456789")
  })

  test("shows unsaved status while typing", async ({ applicantPage }) => {
    await applicantPage.gotoTab(applicantId, "personal")

    await applicantPage.field("E-Mail").fill("typing@example.com")
    await expect(applicantPage.unsavedStatus).toBeVisible()
  })

  test("clicking a template button generates a resume", async ({
    applicantPage,
    page,
  }) => {
    await applicantPage.goto(applicantId)

    await applicantPage.downloadTemplate("Modern")

    // Template buttons are disabled while generating, wait for re-enable
    await expect(applicantPage.templateButton("Modern")).toBeEnabled({
      timeout: 30000,
    })

    // Verify no error appeared — the page should still show the overview
    await expect(
      page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible()
  })

  test("Beratung button is disabled when no LLM key", async ({
    applicantPage,
    api,
  }) => {
    await api.saveSecrets({})
    await applicantPage.goto(applicantId)

    const beratungButton = applicantPage.page.getByRole("button", {
      name: "Beratung",
    })
    await expect(beratungButton).toBeDisabled()
    await expect(
      applicantPage.page.locator("text=KI-Schlüssel erforderlich"),
    ).toBeVisible()
  })
})
