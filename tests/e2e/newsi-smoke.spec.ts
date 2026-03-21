import { expect, test } from "@playwright/test";

test.describe("preview flow", () => {
  test.use({ timezoneId: "Asia/Shanghai" });

  test("a preview user can save topics and see scheduled digest states", async ({
    page,
  }) => {
    await page.goto("/today");
    await expect(
      page.getByRole("heading", { name: "What are you exploring?" }),
    ).toBeVisible();

    await page.goto("/topics");
    await page
      .getByRole("textbox", { name: /describe your interests/i })
      .fill("AI agents, design tools, and indie builders");
    await page.getByRole("button", { name: "Save interests" }).click();

    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByText("Your first digest is scheduled for")).toBeVisible();

    await page.goto("/archive");
    await expect(
      page.getByRole("link", { name: /Digest scheduled/ }),
    ).toBeVisible();
  });
});
