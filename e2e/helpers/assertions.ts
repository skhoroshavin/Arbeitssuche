import {
  expect,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test"

export async function expectApplicantCardVisible(
  page: Page,
  name: string,
): Promise<void> {
  const card = page.locator(".cursor-pointer", { hasText: name }).first()
  await expect(card).toBeVisible()
}

export async function expectApplicantCardNotVisible(
  page: Page,
  name: string,
): Promise<void> {
  const card = page.locator(".cursor-pointer", { hasText: name })
  await expect(card).toHaveCount(0)
}

export function expectResumeDownloaded(
  download: Download,
  template: string,
): void {
  const filename = download.suggestedFilename()
  expect(filename).toContain(template)
  expect(filename).toMatch(/\.pdf$/)
}

export async function expectVacancyCardsCount(
  page: Page,
  min: number,
  max: number,
): Promise<void> {
  const cards = page.locator("a[href*='/vacancies/']")
  const count = await cards.count()
  expect(count).toBeGreaterThanOrEqual(min)
  expect(count).toBeLessThanOrEqual(max)
}

export async function expectCoverLetterPopulated(page: Page): Promise<void> {
  const textarea = page.getByLabel("Anschreiben")
  await expect(textarea).not.toBeEmpty()
  const value = await textarea.inputValue()
  expect(value.trim().length).toBeGreaterThan(0)
}

export async function expectBadgeWithText(
  locator: Locator,
  text: string,
): Promise<void> {
  await expect(locator).toContainText(text)
}

export async function expectNoActionsAvailable(page: Page): Promise<void> {
  const actionSection = page.locator("text=Aktionen")
  if (await actionSection.isVisible()) {
    const buttons = page
      .locator("text=Aktionen")
      .locator("..")
      .getByRole("button")
    await expect(buttons).toHaveCount(0)
  }
}
