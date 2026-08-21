import { expect, type Page } from "@playwright/test";

const storyPath = "/iframe.html?id=tools-live-sandbox--workspace&viewMode=story";

export async function openSandbox(page: Page) {
  await page.goto(storyPath);
  await expect(page).toHaveTitle("tools-live-sandbox--workspace");
  await expect(page.getByRole("region", { name: "Live code sandbox" })).toBeVisible();
  await expect(page.locator("vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0);
}

export const editor = (page: Page) => page.getByRole("textbox", { name: "Composition code editor" });
export const preview = (page: Page) => page.getByRole("tabpanel", { name: "Composition preview" });
