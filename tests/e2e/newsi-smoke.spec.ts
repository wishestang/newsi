import { expect, test } from "@playwright/test";

test("signin page shows the Newsi brand", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: "Newsi" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});
