import {
  RELEASE_CONTRACT_VERSION,
  RELEASE_CRITICAL_RESOURCES,
  cacheBustedUrl,
} from "./release-contract.mjs";

const baseUrl = process.argv[2] || process.env.PAGE_URL || process.env.BROWSER_BASE_URL;
const expectedBuildSha = process.argv[3] || process.env.EXPECTED_BUILD_SHA;

if (!baseUrl) throw new Error("A deployed base URL is required.");
if (!expectedBuildSha) throw new Error("EXPECTED_BUILD_SHA is required.");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "cache-control": "no-cache" },
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(Math.min(3000, attempt * 750));
    }
  }
  throw new Error(`Unable to fetch ${url}: ${lastError?.message || "unknown error"}`);
}

async function waitForPublishedBuild() {
  const indexUrl = cacheBustedUrl(baseUrl, "index.html", expectedBuildSha);
  let lastBuild = "missing";
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const response = await fetchWithRetry(indexUrl, 2);
    const html = await response.text();
    const match = html.match(/data-build-sha="([^"]+)"/);
    lastBuild = match?.[1] || "missing";
    if (lastBuild === expectedBuildSha) return { html, url: response.url };
    if (attempt < 12) await delay(3000);
  }
  throw new Error(`Published build is ${lastBuild}; expected ${expectedBuildSha}`);
}

async function verifyResource(resource) {
  const url = cacheBustedUrl(baseUrl, resource.path, expectedBuildSha);
  const response = await fetchWithRetry(url);
  const contentType = response.headers.get("content-type") || "";
  const acceptedTypes = resource.contentType === "text/javascript"
    ? ["text/javascript", "application/javascript"]
    : [resource.contentType];
  if (!acceptedTypes.some((type) => contentType.toLowerCase().startsWith(type))) {
    throw new Error(`Unexpected content type for ${resource.path}: ${contentType || "missing"}`);
  }
  const bytes = (await response.arrayBuffer()).byteLength;
  if (bytes < resource.minBytes) {
    throw new Error(`Published resource is too small (${bytes} bytes): ${resource.path}`);
  }
  return { path: resource.path, bytes, contentType };
}

const published = await waitForPublishedBuild();
const resources = await Promise.all(
  RELEASE_CRITICAL_RESOURCES
    .filter((resource) => resource.path !== "index.html")
    .map(verifyResource),
);

process.stdout.write(`${JSON.stringify({
  ok: true,
  contractVersion: RELEASE_CONTRACT_VERSION,
  buildSha: expectedBuildSha,
  indexUrl: published.url,
  resources: resources.length,
})}\n`);
