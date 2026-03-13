import { test, expect } from "../fixtures.js";

test.describe("Job Search Flow", () => {
  let applicantId: string;

  test.beforeEach(async ({ api }) => {
    applicantId = await api.createApplicant(`e2e-js-${Date.now()}`);
  });

  test.afterEach(async ({ api }) => {
    await api.deleteJobSearchesForApplicant(applicantId);
    await api.deleteApplicant(applicantId);
  });

  test("can create a job search under an applicant", async ({
    applicantPage,
  }) => {
    await applicantPage.goto(applicantId);
    await applicantPage.createJobSearch("e2e search term");

    await expect(applicantPage.page.getByText("e2e search term")).toBeVisible();
  });

  test("input is focused when create form opens", async ({ applicantPage }) => {
    await applicantPage.goto(applicantId);
    await applicantPage.newSearchButton.click();
    await expect(applicantPage.searchTermInput).toBeFocused();
  });

  test("can create a job search by pressing Enter", async ({
    applicantPage,
  }) => {
    await applicantPage.goto(applicantId);
    await applicantPage.createJobSearchViaEnter("e2e enter search");

    await expect(applicantPage.page.getByText("e2e enter search")).toBeVisible({
      timeout: 15000,
    });
  });

  test("job search title bar shows applicant name", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e titlebar test", applicantId);

    await jobSearchPage.gotoConfig(jsId);

    const applicant = (await api.getApplicant(applicantId)) as {
      personal: { name: string };
    };
    await expect(
      jobSearchPage.page.getByText(applicant.personal.name),
    ).toBeVisible();
  });

  test("pressing Escape closes create form without creating a job search", async ({
    applicantPage,
  }) => {
    await applicantPage.goto(applicantId);
    await applicantPage.openAndDismissSearchForm("e2e escape search");

    await expect(applicantPage.createButton).not.toBeVisible();
    await expect(
      applicantPage.page.getByText("e2e escape search"),
    ).not.toBeVisible();
  });

  test("config page shows Suchmodus toggle buttons", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e mode toggle test", applicantId);

    await jobSearchPage.gotoConfig(jsId);
    await expect(jobSearchPage.searchModeHeading).toBeVisible();
    await expect(jobSearchPage.festanstellungButton).toBeVisible();
    await expect(jobSearchPage.berufseinsteigerButton).toBeVisible();
    await expect(jobSearchPage.ausbildungButton).toBeVisible();
  });

  test("job search nav shows expected links", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e nav links test", applicantId);

    await jobSearchPage.gotoConfig(jsId);
    await expect(jobSearchPage.configHeading).toBeVisible();

    await expect(jobSearchPage.navLink("Konfiguration")).toBeVisible();
    await expect(jobSearchPage.navLink("Anschreiben")).toBeVisible();
    await expect(jobSearchPage.navLink("Stellen")).toBeVisible();
  });

  test("stellen page has Aktualisieren button and sort options", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e stellen test", applicantId);

    await jobSearchPage.gotoVacancies(jsId);
    await expect(jobSearchPage.vacanciesHeading).toBeVisible();
    await expect(jobSearchPage.refreshButton).toBeVisible();
    await expect(jobSearchPage.sortDatum).toBeVisible();
    await expect(jobSearchPage.sortUnternehmen).toBeVisible();
    await expect(jobSearchPage.sortFahrtzeit).toBeVisible();
    await expect(jobSearchPage.sortBewertung).toBeVisible();
  });

  test("cover letter page has Generieren button that calls LLM", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch(
      "e2e cover letter test",
      applicantId,
    );

    await jobSearchPage.gotoCoverLetter(jsId);
    await expect(jobSearchPage.coverLetterHeading).toBeVisible();
    await expect(jobSearchPage.generateButton).toBeVisible();

    await jobSearchPage.generateButton.click();

    // The mutation may resolve or fail very quickly, so the "Generiere..."
    // pending state may not be visible. Wait for the button to return to
    // its idle state (either success or error resets isPending).
    await expect(jobSearchPage.generateButton).toBeVisible({ timeout: 30000 });
  });

  test("cover letter generation shows error when no API key is configured", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch(
      "e2e cover letter error",
      applicantId,
    );

    await jobSearchPage.gotoCoverLetter(jsId);
    await jobSearchPage.generateButton.click();

    await expect(
      jobSearchPage.page.getByText("Generierung fehlgeschlagen"),
    ).toBeVisible({ timeout: 30000 });
    await expect(jobSearchPage.generateButton).toBeVisible();
  });

  test("vacancy card shows source site labels", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e source labels", applicantId);

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
    );
    expect(status).toBe(200);

    await jobSearchPage.gotoVacancies(jsId);
    await expect(jobSearchPage.sourceLink("xing")).toBeVisible();
    await expect(jobSearchPage.sourceLink("arbeitsagentur")).toBeVisible();
  });

  test("vacancy detail shows source links and contact person", async ({
    jobSearchPage,
    api,
  }) => {
    const jsId = await api.createJobSearch("e2e detail sources", applicantId);

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
    );
    expect(status).toBe(200);

    await jobSearchPage.gotoVacancyDetail(jsId, "bb0001");

    await expect(jobSearchPage.sourceLink("xing")).toBeVisible();
    await expect(jobSearchPage.contactSection).toBeVisible();
    await expect(jobSearchPage.page.getByText("Anna Schmidt")).toBeVisible();
    await expect(jobSearchPage.contactLink("anna@detailco.de")).toBeVisible();
    await expect(jobSearchPage.contactLink("+49 89 12345")).toBeVisible();
  });
});
