import { expect, test } from "@playwright/test";
import { GAS, execUrl } from "./apps.js";

test.skip(!process.env.BLOG_LOCAL_STAGING, "requires the locally served staging bundle");
test.use({
  baseURL: "http://127.0.0.1:4173",
  launchOptions: process.env.BLOG_CHROMIUM_PATH
    ? { executablePath: process.env.BLOG_CHROMIUM_PATH }
    : {},
});

test("the branch preview keeps the sign-in gate and never reads production", async ({ page }) => {
  const requests = [];
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  await page.route("https://script.google.com/**", async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ json: { error: "unauthorized" } });
  });
  const response = await page.goto("/blog/staging/");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("STAGING｜", { exact: true })).toBeVisible();
  await expect(page.locator(".login-gate")).toBeVisible();
  await expect(page.locator(".layout")).toHaveCount(0);
  expect(requests.every((url) => url.startsWith(execUrl(GAS.blog.staging)))).toBe(true);
});
