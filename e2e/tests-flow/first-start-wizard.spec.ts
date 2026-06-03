import { test } from "../fixtures.js"

test.describe("First-start wizard", () => {
  test("starts on the first-start wizard from an empty test profile", async ({
    firstStartPage,
  }) => {
    await firstStartPage.assertVisible()
  })
})
