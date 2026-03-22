import { expect, test } from "@playwright/test";

test.describe("preview flow", () => {
  test.use({ timezoneId: "Asia/Shanghai" });

  test("a preview user must confirm a generated preview before daily digests start", async ({
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

    await expect(page).toHaveURL(/\/preview$/);
    await expect(page.getByText("Generating")).toBeVisible();
    await expect(
      page.getByText(/Newsi is preparing a real preview digest/i),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Today's Synthesis" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Confirm and start daily digests" })
      .click();

    await expect(page).toHaveURL(/\/today$/);
    await expect(
      page.getByText("Your first digest is scheduled for"),
    ).toBeVisible();

    await page.goto("/archive");
    await expect(
      page.getByRole("heading", { name: "No archived digests yet" }),
    ).toBeVisible();

    await page.goto("/topics");
    await expect(
      page.getByRole("textbox", { name: /describe your interests/i }),
    ).toHaveValue("AI agents, design tools, and indie builders");

    await page
      .getByRole("textbox", { name: /describe your interests/i })
      .fill("AI policy, semiconductor supply chains, and robotics");
    await page.getByRole("button", { name: "Save interests" }).click();

    await expect(page).toHaveURL(/\/preview$/);
    await page
      .getByRole("button", { name: "Confirm and start daily digests" })
      .click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(
      page.getByText("Your first digest is scheduled for"),
    ).toBeVisible();

    await page.goto("/topics");
    await page.getByRole("button", { name: "Clear interests" }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(
      page.getByRole("heading", { name: "What are you exploring?" }),
    ).toBeVisible();

    await page.goto("/archive");
    await expect(
      page.getByRole("heading", { name: "No archived digests yet" }),
    ).toBeVisible();
  });
});
