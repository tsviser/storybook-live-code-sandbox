import { expect, test } from "@playwright/test";
import { editor, openSandbox, preview } from "./helpers";

test("keeps drafts explicit and restores the last good preview after an error", async ({ page }) => {
  await openSandbox(page);

  await editor(page).fill('<Button label="Draft only" variant="primary" />');
  await expect(preview(page).getByRole("button", { name: "Draft only" })).toHaveCount(0);

  await page.getByRole("button", { name: "Run code" }).click();
  await expect(preview(page).getByRole("button", { name: "Draft only" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Preview updated.");

  await editor(page).fill("<MissingComponent />");
  await page.getByRole("button", { name: "Run code" }).click();

  await expect(page.locator('.sb-live-code-sandbox__toast[role="alert"]')).toContainText(
    /Preview was not updated: ReferenceError:.*MissingComponent/,
  );
  await expect(preview(page).getByRole("button", { name: "Draft only" })).toBeVisible();
});

test("supports fallback search, tabs, and modal keyboard behavior", async ({ page }) => {
  await openSandbox(page);

  const search = page.getByRole("combobox", { name: "Search components" });
  const listId = await search.getAttribute("list");
  expect(listId).toBeTruthy();
  await expect(page.locator(`[id="${listId}"] option`)).toHaveCount(4);
  await search.fill("Button");

  const sidebarTabs = page.getByRole("tablist", { name: "Sandbox sidebar views" });
  const propsTab = sidebarTabs.getByRole("tab", { name: "Props" });
  const componentsTab = sidebarTabs.getByRole("tab", { name: "Components" });
  await expect(propsTab).toHaveAttribute("aria-selected", "true");
  const propsPanelId = await propsTab.getAttribute("aria-controls");
  expect(propsPanelId).toBeTruthy();
  await expect(page.locator(`[id="${propsPanelId}"]`)).toHaveAttribute("role", "tabpanel");

  await propsTab.press("ArrowLeft");
  await expect(componentsTab).toBeFocused();
  await expect(componentsTab).toHaveAttribute("aria-selected", "true");

  const settingsTrigger = page.getByRole("button", { name: "History settings" });
  await settingsTrigger.click();
  const dialog = page.getByRole("dialog", { name: "History settings" });
  const interval = dialog.getByRole("spinbutton", { name: "Checkpoint interval" });
  await expect(interval).toBeFocused();
  await interval.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Save" })).toBeFocused();
  await dialog.getByRole("button", { name: "Save" }).press("Tab");
  await expect(interval).toBeFocused();
  await interval.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(settingsTrigger).toBeFocused();
});

test("persists successful code across reloads", async ({ page }) => {
  await openSandbox(page);
  const code = '<Button label="Persisted preview" variant="secondary" />';

  await editor(page).fill(code);
  await page.getByRole("button", { name: "Run code" }).click();
  await expect(preview(page).getByRole("button", { name: "Persisted preview" })).toBeVisible();
  await page.reload();

  await expect(editor(page)).toContainText(code);
  await expect(preview(page).getByRole("button", { name: "Persisted preview" })).toBeVisible();
});

test("synchronizes drafts and successful previews between pages", async ({ context, page }) => {
  await openSandbox(page);
  const secondPage = await context.newPage();
  await openSandbox(secondPage);
  const code = '<Button label="Synchronized preview" variant="quiet" />';

  await editor(page).fill(code);
  await expect(editor(secondPage)).toContainText(code);
  await expect(preview(secondPage).getByRole("button", { name: "Synchronized preview" })).toHaveCount(0);

  await page.getByRole("button", { name: "Run code" }).click();
  await expect(preview(page).getByRole("button", { name: "Synchronized preview" })).toBeVisible();
  await expect(preview(secondPage).getByRole("button", { name: "Synchronized preview" })).toBeVisible();
});
