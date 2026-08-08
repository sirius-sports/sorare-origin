import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");
const redirectSource = readFileSync(join(root, "legacy-host-redirect.js"), "utf8");

function runRedirect({ hostname, pathname, search = "", hash = "" }) {
  let redirectedTo = null;
  vm.runInNewContext(redirectSource, {
    URL,
    window: {
      location: {
        hostname,
        pathname,
        search,
        hash,
        replace(url) {
          redirectedTo = url;
        },
      },
    },
  });
  return redirectedTo;
}

assert.equal(
  runRedirect({
    hostname: "sirius-sports.github.io",
    pathname: "/sorare-origin/en/",
    search: "?utm_source=google",
    hash: "#guide",
  }),
  "https://sorare.siriusfactor.com/en/?utm_source=google#guide"
);
assert.equal(
  runRedirect({
    hostname: "sirius-sports.github.io",
    pathname: "/sorare-origin/",
  }),
  "https://sorare.siriusfactor.com/"
);
assert.equal(
  runRedirect({
    hostname: "sorare.siriusfactor.com",
    pathname: "/en/",
  }),
  null
);

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".git" && entry.name !== "node_modules") {
      return htmlFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

const pages = htmlFiles(root);
assert.equal(pages.length, 16);
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const scriptPath = relative(dirname(page), join(root, "legacy-host-redirect.js")).replaceAll("\\", "/");
  assert.match(html, new RegExp(`<script src=["']${scriptPath.replace("../", "\\.\\./")}["']></script>`));
  assert.match(html, /<link rel="canonical" href="https:\/\/sorare\.siriusfactor\.com\//);
}

console.log(`Legacy host redirect tests passed (${pages.length} pages).`);
