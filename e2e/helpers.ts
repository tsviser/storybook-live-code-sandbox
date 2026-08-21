import { expect, type Page } from "@playwright/test";

const storyPath = "/iframe.html?id=tools-live-sandbox--workspace&viewMode=story";
export const sandboxStorageKey = "basic-storybook-live-sandbox";

export async function failSandboxStorage(page: Page, mode: "blocked" | "quota") {
  await page.addInitScript(({ storageKey, failureMode }) => {
    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key === storageKey && failureMode === "blocked") {
        throw new DOMException("Blocked", "SecurityError");
      }
      return nativeGetItem.call(this, key);
    };
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === storageKey) {
        throw new DOMException(
          failureMode === "quota" ? "Full" : "Blocked",
          failureMode === "quota" ? "QuotaExceededError" : "SecurityError",
        );
      }
      return nativeSetItem.call(this, key, value);
    };
  }, { storageKey: sandboxStorageKey, failureMode: mode });
}

export async function seedSandboxStorage(page: Page, value: unknown) {
  await page.addInitScript(({ storageKey, storedValue }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(storedValue));
  }, { storageKey: sandboxStorageKey, storedValue: value });
}

export async function openSandbox(page: Page) {
  await page.goto(storyPath);
  await expect(page).toHaveTitle("tools-live-sandbox--workspace");
  await expect(page.getByRole("region", { name: "Live code sandbox" })).toBeVisible();
  await expect(page.locator("vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0);
}

export const editor = (page: Page) => page.getByRole("textbox", { name: "Composition code editor" });
export const preview = (page: Page) => page.getByRole("tabpanel", { name: "Composition preview" });
