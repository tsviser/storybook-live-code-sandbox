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
