import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  isStagingBuild,
  productionUrl,
  showStagingBanner,
} from "../src/staging-banner.js";

describe("isStagingBuild", () => {
  it("is true only when VITE_STAGING is exactly '1'", () => {
    expect(isStagingBuild({ VITE_STAGING: "1" })).toBe(true);
    expect(isStagingBuild({ VITE_STAGING: "true" })).toBe(false);
    expect(isStagingBuild({})).toBe(false);
    expect(isStagingBuild(undefined)).toBe(false);
  });
});

describe("showStagingBanner", () => {
  it("prepends a banner naming the staging environment", () => {
    document.body.innerHTML = "<main id=\"app\"></main>";
    const el = showStagingBanner();
    expect(document.body.firstChild).toBe(el);
    expect(el.textContent).toContain("STAGING");
    expect(el.textContent).toContain("STAGING｜");
  });

  it("links to every staging environment", () => {
    document.body.innerHTML = "<main id=\"app\"></main>";
    const el = showStagingBanner();
    const hrefs = [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs.slice(0, 8)).toEqual([
      "/staging/",
      "/blog/staging/",
      "/list-of-stuff-admin/staging/",
      "/tweet/staging/",
      "/alarm/staging/",
      "/health/staging/",
      "/asset/staging/",
      "/social/staging/",
    ]);
  });

  it("ends with a red, bold link to this app's production top", () => {
    document.body.innerHTML = "<main id=\"app\"></main>";
    const el = showStagingBanner();
    const links = [...el.querySelectorAll("a")];
    const prod = links[links.length - 1];
    expect(prod.textContent).toBe("本番");
    expect(prod.getAttribute("href")).toBe(productionUrl());
    expect(prod.getAttribute("style")).toContain("color:#c62828");
    expect(prod.getAttribute("style")).toContain("font-weight:700");
    expect(prod.style.fontWeight).toBe("700");
    expect(el.textContent).toContain("｜ 本番");
  });
});

describe("fixed nav accommodation (main.js wiring)", () => {
  // The banner itself comes from the shared module above, but the
  // fixed nav would cover it; the offset lives in this app's own
  // main.js + style.css. These assertions pin the contract between
  // them: the class names and the custom property must match on
  // both sides or the banner is hidden again.
  const mainJs = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../src/main.js"),
    "utf8"
  );

  it("tags the banner and <html> and publishes the banner height", () => {
    expect(mainJs).toContain("classList.add('staging-banner')");
    expect(mainJs).toContain("classList.add('has-staging-banner')");
    expect(mainJs).toContain("setProperty('--staging-banner-height'");
    expect(mainJs).toContain("banner.offsetHeight");
  });
});

describe("productionUrl", () => {
  it("drops the trailing staging segment from the base", () => {
    expect(productionUrl({ BASE_URL: "/blog/staging/" })).toBe("/blog/");
    expect(productionUrl({ BASE_URL: "/blog/" })).toBe("/blog/");
    expect(productionUrl({})).toBe("/");
  });
});
