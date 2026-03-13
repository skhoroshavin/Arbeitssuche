import { test, expect } from "../fixtures.js";

test.describe("Applicant Flow", () => {
  test("homepage shows applicant list heading", async ({
    applicantListPage,
  }) => {
    await applicantListPage.goto();
    await expect(applicantListPage.heading).toBeVisible();
  });

  test("can create and view an applicant", async ({
    applicantListPage,
    api,
  }) => {
    await applicantListPage.goto();
    await applicantListPage.createApplicant("E2e Test Applicant");

    await expect(
      applicantListPage.applicantCard("E2e Test Applicant"),
    ).toBeVisible();

    const applicantId =
      await applicantListPage.navigateToApplicant("E2e Test Applicant");
    await expect(
      applicantListPage.page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible();

    if (applicantId) {
      await api.deleteApplicant(applicantId);
    }
  });

  test("input is focused when create form opens", async ({
    applicantListPage,
  }) => {
    await applicantListPage.goto();
    await applicantListPage.openCreateForm();
    await expect(applicantListPage.nameInput).toBeFocused();
  });

  test("pressing Escape closes create form without creating an applicant", async ({
    applicantListPage,
  }) => {
    await applicantListPage.goto();
    await applicantListPage.openAndDismissForm("E2e Escape Applicant");

    await expect(applicantListPage.createButton).not.toBeVisible();
    await expect(
      applicantListPage.applicantCard("E2e Escape Applicant"),
    ).not.toBeVisible();
  });

  test("can create an applicant by pressing Enter", async ({
    applicantListPage,
    api,
  }) => {
    await applicantListPage.goto();
    await applicantListPage.createApplicantViaEnter("E2e Enter Applicant");

    await expect(
      applicantListPage.applicantCard("E2e Enter Applicant"),
    ).toBeVisible();

    const applicantId = await applicantListPage.navigateToApplicant(
      "E2e Enter Applicant",
    );
    if (applicantId) {
      await api.deleteApplicant(applicantId);
    }
  });
});

test.describe("Applicant Tabs & Edit Forms", () => {
  let applicantId: string;

  test.beforeEach(async ({ api }) => {
    applicantId = await api.createApplicant(`e2e-tabs-${Date.now()}`);
  });

  test.afterEach(async ({ api }) => {
    await api.deleteApplicant(applicantId);
  });

  test("shows all six navigation tabs", async ({ applicantPage }) => {
    await applicantPage.goto(applicantId);
    await applicantPage.expectAllTabsVisible();
  });

  test("can navigate to each edit tab", async ({ applicantPage }) => {
    await applicantPage.goto(applicantId);

    await applicantPage.navigateToTab("Persönlich", "Persönlich");
    await applicantPage.navigateToTab("Erfahrung", "Berufserfahrung");
    await applicantPage.navigateToTab("Ausbildung", "Ausbildung");
    await applicantPage.navigateToTab("Zertifikate", "Zertifikate");
    await applicantPage.navigateToTab("Sonstiges", "Sonstiges");
    await applicantPage.navigateToTab("Übersicht", "Lebenslauf");
  });

  test("personal form has disclose checkboxes", async ({ applicantPage }) => {
    await applicantPage.gotoTab(applicantId, "personal");
    await expect(applicantPage.checkboxes).toHaveCount(3);
  });

  const discloseCases = [
    {
      name: "experience",
      path: "experience",
      heading: "Berufserfahrung",
      data: {
        experience: [
          {
            role: "Dev",
            company: "ACME",
            startDate: "2020",
            endDate: "2023",
            location: "Berlin",
          },
        ],
      },
    },
    {
      name: "education",
      path: "education",
      heading: "Ausbildung",
      data: {
        education: [
          {
            institution: "TU Berlin",
            course: "Informatik",
            start_date: "2015",
            end_date: "2020",
            location: "Berlin",
          },
        ],
      },
    },
    {
      name: "certifications",
      path: "certifications",
      heading: "Zertifikate",
      data: {
        certifications: [{ name: "AWS", issuer: "Amazon", date: "2023" }],
      },
    },
  ];

  for (const { name, path, heading, data } of discloseCases) {
    test(`${name} form shows disclose checkbox for dates`, async ({
      applicantPage,
      api,
    }) => {
      const applicant = await api.getApplicant(applicantId);
      await api.updateApplicant(applicantId, { ...applicant, ...data });

      await applicantPage.gotoTab(applicantId, path);
      await expect(applicantPage.heading(heading)).toBeVisible();
      await expect(applicantPage.checkboxes).toHaveCount(1);
    });
  }

  test("auto-saves personal data after editing", async ({
    applicantPage,
    api,
  }) => {
    await applicantPage.gotoTab(applicantId, "personal");

    await applicantPage.field("E-Mail").fill("test@example.com");
    await applicantPage.field("Telefon").fill("0123456789");

    await expect(applicantPage.savedStatus).toBeVisible({ timeout: 5000 });

    const saved = (await api.getApplicant(applicantId)) as {
      personal: { email: string; phone: string };
    };
    expect(saved.personal.email).toBe("test@example.com");
    expect(saved.personal.phone).toBe("0123456789");
  });

  test("shows unsaved status while typing", async ({ applicantPage }) => {
    await applicantPage.gotoTab(applicantId, "personal");

    await applicantPage.field("E-Mail").fill("typing@example.com");
    await expect(applicantPage.unsavedStatus).toBeVisible();
  });

  test("overview has enabled template download buttons for all templates", async ({
    applicantPage,
  }) => {
    await applicantPage.goto(applicantId);

    await expect(applicantPage.templateButton("Klassisch")).toBeEnabled();
    await expect(applicantPage.templateButton("Elegant")).toBeEnabled();
    await expect(applicantPage.templateButton("Modern")).toBeEnabled();
    await expect(applicantPage.templateButton("Minimal")).toBeEnabled();
  });

  test("overview shows job search list with create button", async ({
    applicantPage,
  }) => {
    await applicantPage.goto(applicantId);

    await expect(applicantPage.jobSearchHeading).toBeVisible();
    await expect(applicantPage.newSearchButton).toBeVisible();
  });

  test("clicking a template button generates a resume", async ({
    applicantPage,
    page,
  }) => {
    await applicantPage.goto(applicantId);

    await applicantPage.downloadTemplate("Modern");

    // Template buttons are disabled while generating, wait for re-enable
    await expect(applicantPage.templateButton("Modern")).toBeEnabled({
      timeout: 30000,
    });

    // Verify no error appeared — the page should still show the overview
    await expect(
      page.getByRole("heading", { name: "Lebenslauf" }),
    ).toBeVisible();
  });
});
