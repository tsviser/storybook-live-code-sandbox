import { expect, test } from "@playwright/test";
import { editor, openSandbox, preview } from "./helpers";

test("keeps the mobile workspace operable at 390 pixels", async ({ page }) => {
  await openSandbox(page);

  const workspaceTabs = page.getByRole("tablist", { name: "Mobile sandbox views" });
  await expect(workspaceTabs).toBeVisible();
  await workspaceTabs.getByRole("tab", { name: "Code" }).click();
  await expect(editor(page)).toBeVisible();
  await editor(page).fill('<Button label="Mobile draft" />');

  await workspaceTabs.getByRole("tab", { name: "Preview" }).click();
  await expect(preview(page)).toBeVisible();
  await expect(preview(page).getByRole("button", { name: "Mobile draft" })).toHaveCount(0);
  await page.getByRole("button", { name: "Run code" }).click();
  await expect(preview(page).getByRole("button", { name: "Mobile draft" })).toBeVisible();

  await workspaceTabs.getByRole("tab", { name: "Code" }).click();
  await expect(editor(page)).toContainText('<Button label="Mobile draft" />');
});
