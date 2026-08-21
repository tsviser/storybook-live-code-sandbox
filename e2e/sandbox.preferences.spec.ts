import { expect, test } from "@playwright/test";
import { openSandbox } from "./helpers";

test("respects dark, reduced-motion, forced-color, and RTL preferences", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", forcedColors: "active", reducedMotion: "reduce" });
  await openSandbox(page);

  await expect.poll(() => page.evaluate(() => ({
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
    forced: matchMedia("(forced-colors: active)").matches,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }))).toEqual({ dark: true, forced: true, reduced: true });

  await page.locator("html").evaluate((element) => { element.dir = "rtl"; });
  const search = page.getByRole("combobox", { name: "Search components" });
  await search.fill("Button");
  const sidebarTabs = page.getByRole("tablist", { name: "Sandbox sidebar views" });
  await sidebarTabs.getByRole("tab", { name: "Props" }).press("ArrowRight");
  await expect(sidebarTabs.getByRole("tab", { name: "Components" })).toBeFocused();
  await expect(page.getByRole("region", { name: "Live code sandbox" })).toBeVisible();
});

test("hides invalid registry entries and reports the configuration failure", async ({ page }) => {
  await openSandbox(page, "/iframe.html?id=tools-live-sandbox--invalid-registry&viewMode=story");

  await expect(page.getByRole("alert")).toContainText(
    "Sandbox registry hid 2 invalid component entries.",
  );
  await expect(page.getByRole("button", { name: "Button" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Missing" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Unsafe" })).toHaveCount(0);
  await expect(page.locator("vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0);
});
