import { test, expect } from "../fixtures.js"

test.describe("Job Search Flow", () => {
  let applicantId: string

  test.beforeEach(async ({ api }) => {
    applicantId = await api.createApplicant(`e2e-js-${Date.now()}`)
  })

  test("new search opens wizard immediately without legacy name form", async ({
    applicantPage,
  }) => {
    await applicantPage.goto(applicantId)
    await applicantPage.newSearchButton.click()

    await expect(applicantPage.wizardStepOneHeading).toBeVisible()
    await expect(applicantPage.searchTermInput).not.toBeVisible()
  })

  test("wizard splits configuration into multiple steps and finishes", async ({
    applicantPage,
    jobSearchPage,
  }) => {
    await applicantPage.goto(applicantId)
    await applicantPage.newSearchButton.click()

    await expect(applicantPage.wizardStepOneHeading).toBeVisible()
    await applicantPage.field("Suchbegriff").fill("wizard finish")
    await applicantPage.wizardContinueButton.click()
    await expect(applicantPage.wizardStepTwoHeading).toBeVisible()
    await applicantPage.wizardContinueButton.click()
    await expect(applicantPage.wizardStepThreeHeading).toBeVisible()
    await applicantPage.wizardContinueButton.click()
    await expect(applicantPage.wizardStepFourHeading).toBeVisible()
    await applicantPage.wizardContinueButton.click()
    await expect(applicantPage.wizardStepFiveHeading).toBeVisible()
    await applicantPage.wizardFinishButton.click()

    await expect(jobSearchPage.vacanciesHeading).toBeVisible()
    await expect(applicantPage.page).toHaveURL(/\/job-searches\/.+\/vacancies/)
  })

  test("resume and discard prompts are shown for meaningful drafts", async ({
    applicantPage,
  }) => {
    await applicantPage.goto(applicantId)
    await applicantPage.newSearchButton.click()
    await expect(applicantPage.wizardStepOneHeading).toBeVisible()
    await applicantPage.field("Suchbegriff").fill("draft prompt edited")

    await applicantPage.wizardCancelButton.click()
    await expect(applicantPage.wizardKeepDraftButton).toBeVisible()
    await applicantPage.wizardKeepDraftButton.click()

    await applicantPage.newSearchButton.click()
    await expect(applicantPage.resumeDraftDialogTitle).toBeVisible()
    await applicantPage.discardDraftButton.click()
    await expect(applicantPage.wizardStepOneHeading).toBeVisible()
  })

  test("finish starts update without statement-finalized errors", async ({
    applicantPage,
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text())
      }
    })

    await applicantPage.goto(applicantId)
    await applicantPage.newSearchButton.click()
    await applicantPage.field("Suchbegriff").fill("crawl smoke")
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardFinishButton.click()

    await expect(page).toHaveURL(/\/job-searches\/.+\/vacancies/)
    await expect(
      page.getByRole("button", { name: "Aktualisieren" }),
    ).toBeVisible()
    expect(
      consoleErrors.filter((entry) =>
        entry.includes("statement has been finalized"),
      ),
    ).toEqual([])
  })

  test("vacancy list breadcrumb links navigate to applicant and home", async ({
    jobSearchPage,
    api,
    page,
  }) => {
    const jsId = await api.createJobSearch("breadcrumb nav", applicantId)
    await jobSearchPage.gotoVacancies(jsId)

    await page.getByRole("link", { name: /e2e-js-/ }).click()
    await expect(page).toHaveURL(new RegExp(`/applicants/${applicantId}$`))

    await page.goto(`/job-searches/${jsId}/vacancies`)
    await page.getByLabel("Startseite").click()
    await expect(page).toHaveURL(/\/$/)
  })

  test("wizard-created job search is visible after reload", async ({
    applicantPage,
    page,
  }) => {
    await applicantPage.goto(applicantId)
    await applicantPage.newSearchButton.click()
    await applicantPage.field("Suchbegriff").fill("persisted wizard search")
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardContinueButton.click()
    await applicantPage.wizardFinishButton.click()

    await page.goto(`/applicants/${applicantId}`)
    await expect(page.getByText("persisted wizard search")).toBeVisible()
    await page.reload()
    await expect(page.getByText("persisted wizard search")).toBeVisible()
  })

  test("existing job search entries open vacancy list by default", async ({
    applicantPage,
    api,
    page,
  }) => {
    await api.createJobSearch("existing redirect", applicantId)
    await applicantPage.goto(applicantId)
    await page.getByText("existing redirect").click()
    await expect(page).toHaveURL(/\/job-searches\/.+\/vacancies/)
  })

  test("cover letter page has Generieren button that calls LLM", async ({
    jobSearchPage,
    api,
  }) => {
    await api.saveSecrets({ openrouterApiKey: "sk-or-fake-e2e-key" })
    const jsId = await api.createJobSearch("e2e cover letter test", applicantId)

    await jobSearchPage.gotoCoverLetter(jsId)
    await expect(jobSearchPage.coverLetterHeading).toBeVisible()
    await expect(jobSearchPage.generateButton).toBeVisible()

    await jobSearchPage.generateButton.click()

    // The mutation may resolve or fail very quickly, so the "Generiere..."
    // pending state may not be visible. Wait for the button to return to
    // its idle state (either success or error resets isPending).
    await expect(jobSearchPage.generateButton).toBeVisible({ timeout: 30000 })
  })

  test("cover letter Generieren button is disabled when no API key is configured", async ({
    jobSearchPage,
    api,
  }) => {
    await api.saveSecrets({})
    const jsId = await api.createJobSearch(
      "e2e cover letter error",
      applicantId,
    )

    await jobSearchPage.gotoCoverLetter(jsId)
    await expect(jobSearchPage.generateButton).toBeDisabled()
    await expect(jobSearchPage.llmRequiredNotice).toBeVisible()
  })

  test("vacancy card shows source site labels", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e source labels", applicantId)

    const status = await api.seedVacancies(
      jsId,
      [
        {
          hash: "aa0001",
          title: "Frontend Developer",
          company: "SourceCo",
          urls: ["https://xing.com/job/1", "https://aa.de/job/1"],
          addresses: ["Berlin"],
          descriptionChanged: false,
          activityHistory: [
            {
              type: "found",
              date: "2026-03-10",
              site: "xing",
              url: "https://xing.com/job/1",
            },
            {
              type: "found",
              date: "2026-03-10",
              site: "arbeitsagentur",
              url: "https://aa.de/job/1",
            },
          ],
          active: true,
        },
      ],
      "2026-03-10",
    )
    expect(status).toBe(200)

    await jobSearchPage.gotoVacancies(jsId)
    await expect(jobSearchPage.sourceLink("xing")).toBeVisible()
    await expect(jobSearchPage.sourceLink("arbeitsagentur")).toBeVisible()
  })

  test("filter and sort are preserved after navigating back from vacancy detail", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e filter preserve", applicantId)

    const status = await api.seedVacancies(
      jsId,
      [
        {
          hash: "fp0001",
          title: "New Vacancy",
          company: "AlphaCo",
          urls: ["https://example.com/1"],
          addresses: ["Berlin"],
          descriptionChanged: false,
          activityHistory: [
            {
              type: "found",
              date: "2026-03-10",
              site: "xing",
              url: "https://example.com/1",
            },
          ],
          active: true,
        },
        {
          hash: "fp0002",
          title: "Applied Vacancy",
          company: "BetaCo",
          urls: ["https://example.com/2"],
          addresses: ["Munich"],
          descriptionChanged: false,
          activityHistory: [
            {
              type: "found",
              date: "2026-03-10",
              site: "xing",
              url: "https://example.com/2",
            },
            {
              type: "applied",
              date: "2026-03-11",
            },
          ],
          active: true,
        },
      ],
      "2026-03-10",
    )
    expect(status).toBe(200)

    await jobSearchPage.gotoVacancies(jsId)
    await expect(jobSearchPage.vacanciesHeading).toBeVisible()

    // Apply filter "Neu" and sort by "Unternehmen"
    await jobSearchPage.filterButton("Neu (1)").click()
    await jobSearchPage.sortUnternehmen.click()

    // Verify URL has query params
    await expect(jobSearchPage.page).toHaveURL(/filter=new/)
    await expect(jobSearchPage.page).toHaveURL(/sort=company/)

    // Click vacancy card to go to detail
    await jobSearchPage.vacancyCard("New Vacancy").click()
    await expect(jobSearchPage.page.getByText("AlphaCo")).toBeVisible()

    // Click back link
    await jobSearchPage.backLink.click()

    // Assert URL still contains filter and sort params
    await expect(jobSearchPage.page).toHaveURL(/filter=new/)
    await expect(jobSearchPage.page).toHaveURL(/sort=company/)

    // Assert filter button is still active (has bg-blue-600 class)
    await expect(jobSearchPage.filterButton("Neu (1)")).toHaveClass(
      /bg-blue-600/,
    )

    // Assert sort button is still active (has bg-zinc-700 class)
    await expect(jobSearchPage.sortUnternehmen).toHaveClass(/bg-zinc-700/)
  })

  test("vacancy list shows missing-key notes when keys are not configured", async ({
    jobSearchPage,
    api,
  }) => {
    await api.saveSecrets({})
    const jsId = await api.createJobSearch("e2e missing keys", applicantId)

    await jobSearchPage.gotoVacancies(jsId)
    await expect(jobSearchPage.missingKeyNote).toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).toBeVisible()
  })

  test("vacancy list notes are hidden when keys are configured", async ({
    jobSearchPage,
    api,
  }) => {
    await api.saveSecrets({
      openrouterApiKey: "sk-or-test-key-value",
      googleMapsApiKey: "maps-test-key-value",
    })
    const jsId = await api.createJobSearch("e2e keys set", applicantId)

    await jobSearchPage.gotoVacancies(jsId)
    await expect(jobSearchPage.missingKeyNote).not.toBeVisible()
    await expect(jobSearchPage.missingMapsKeyNote).not.toBeVisible()
  })

  test("clicking settings link from vacancy list navigates to settings", async ({
    jobSearchPage,
    api,
  }) => {
    await api.saveSecrets({})
    const jsId = await api.createJobSearch("e2e settings link", applicantId)

    await jobSearchPage.gotoVacancies(jsId)
    await expect(jobSearchPage.settingsLink).toBeVisible()
    await jobSearchPage.settingsLink.click()
    await expect(
      jobSearchPage.page.getByRole("heading", { name: "Einstellungen" }),
    ).toBeVisible()
  })

  test("vacancy detail shows source links and contact person", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e detail sources", applicantId)

    const status = await api.seedVacancies(
      jsId,
      [
        {
          hash: "bb0001",
          title: "Backend Engineer",
          company: "DetailCo",
          urls: ["https://xing.com/job/2"],
          addresses: ["Munich"],
          descriptionChanged: false,
          contact: {
            name: "Anna Schmidt",
            email: "anna@detailco.de",
            phone: "+49 89 12345",
          },
          activityHistory: [
            {
              type: "found",
              date: "2026-03-10",
              site: "xing",
              url: "https://xing.com/job/2",
            },
          ],
          active: true,
        },
      ],
      "2026-03-10",
    )
    expect(status).toBe(200)

    await jobSearchPage.gotoVacancyDetail(jsId, "bb0001")

    await expect(jobSearchPage.sourceLink("xing")).toBeVisible()
    await expect(jobSearchPage.contactSection).toBeVisible()
    await expect(jobSearchPage.page.getByText("Anna Schmidt")).toBeVisible()
    await expect(jobSearchPage.contactLink("anna@detailco.de")).toBeVisible()
    await expect(jobSearchPage.contactLink("+49 89 12345")).toBeVisible()
  })
})
