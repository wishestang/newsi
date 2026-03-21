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
    const scheduledText = page.getByText("Your first digest is scheduled for");
    const digestHeading = page.getByRole("heading", { name: "Today's Synthesis" });

    if (await scheduledText.count()) {
      await expect(scheduledText).toBeVisible();
    } else {
      await expect(digestHeading).toBeVisible();
    }

    await page.goto("/archive");
    const archiveLink = page.getByRole("link", {
      name: /Digest scheduled|Today's Synthesis/,
    });
    await expect(archiveLink).toBeVisible();
    await archiveLink.click();

    await expect(page).toHaveURL(/\/archive\/\d{4}-\d{2}-\d{2}$/);
    const scheduledDetail = page.getByText(
      "Newsi saved this brief and scheduled the first digest for",
    );

    if (await scheduledDetail.count()) {
      await expect(scheduledDetail).toBeVisible();
      await expect(
        page.getByText("AI agents, design tools, and indie builders"),
      ).toBeVisible();
    } else {
      await expect(digestHeading).toBeVisible();
    }

    await page.goto("/topics");
    await expect(
      page.getByRole("textbox", { name: /describe your interests/i }),
    ).toHaveValue("AI agents, design tools, and indie builders");

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
