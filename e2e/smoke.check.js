import { test, expect } from "@playwright/test";
import { SITE, GAS, APPS, execUrl } from "./apps.js";

// Full smoke suite over production AND staging, run on a schedule and on
// demand from this repository. The per-app staging gate lives in
// staging.spec.js; this file is the whole-site health check.
for (const app of APPS) {
  for (const env of ["prod", "staging"]) {
    test(`${app.name} (${env}) loads and uses the ${env} backend`, async ({
      page,
    }) => {
      const path = env === "staging" ? `${app.path}staging/` : app.path;
      const calledIds = [];
      page.on("request", (req) => {
        const m = req
          .url()
          .match(/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)/);
        if (m) calledIds.push(m[1]);
      });
      const resp = await page.goto(path);
      expect(resp.status()).toBe(200);
      if (env === "staging") {
        await expect(page.getByText("ステージング環境です")).toBeVisible();
      } else {
        await expect(page.getByText("ステージング環境です")).toHaveCount(0);
      }
      if (app.gas) {
        const ids = GAS[app.gas];
        const other = env === "staging" ? ids.prod : ids.staging;
        if (app.dataOnLoad) {
          await page
            .waitForRequest(
              (r) => r.url().includes("script.google.com/macros"),
              { timeout: 30 * 1000 },
            )
            .catch(() => null);
          expect(calledIds).toContain(ids[env]);
        } else {
          await page.waitForTimeout(5000);
        }
        expect(calledIds).not.toContain(other);
      }
    });
  }
}

for (const app of ["tweet", "alarm", "health", "asset"]) {
  test(`${app} ogp image exists`, async ({ request }) => {
    const r = await request.get(`${SITE}/${app}/ogp.png`);
    expect(r.status()).toBe(200);
    const body = await r.body();
    expect(body.length).toBeGreaterThan(1000);
  });
}

test.describe("GAS endpoints", () => {
  test("list production returns the full item list", async ({ request }) => {
    const r = await request.get(execUrl(GAS.list.prod));
    const items = await r.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(100);
  });

  test("blog production returns article ids", async ({ request }) => {
    const r = await request.get(execUrl(GAS.blog.prod));
    const data = await r.json();
    expect(data.ids.length).toBeGreaterThan(10);
  });

  test("tweet production is alive", async ({ request }) => {
    const r = await request.get(execUrl(GAS.tweet.prod));
    const data = await r.json();
    expect(data.ok).toBe(true);
  });

  test("health production is auth-gated", async ({ request }) => {
    const r = await request.get(execUrl(GAS.health.prod));
    const data = await r.json();
    expect(data.status).toBe(401);
  });

  test("asset production is auth-gated", async ({ request }) => {
    const r = await request.get(execUrl(GAS.asset.prod));
    const data = await r.json();
    expect(data.status).toBe(401);
  });

  test("list staging returns only dummy items", async ({ request }) => {
    const r = await request.get(execUrl(GAS.list.staging));
    const items = await r.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  test("blog staging returns the dummy article list", async ({ request }) => {
    const r = await request.get(execUrl(GAS.blog.staging));
    const data = await r.json();
    expect(data.ids.length).toBeGreaterThanOrEqual(1);
  });

  test("health staging is auth-gated", async ({ request }) => {
    const r = await request.get(execUrl(GAS.health.staging));
    const data = await r.json();
    expect(data.status).toBe(401);
  });

  test("asset staging is auth-gated", async ({ request }) => {
    const r = await request.get(execUrl(GAS.asset.staging));
    const data = await r.json();
    expect(data.status).toBe(401);
  });
});
