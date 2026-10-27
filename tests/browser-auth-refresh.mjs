import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const server = await createServer({
  server: { host: "127.0.0.1", port: 0, open: false },
  plugins: [{
    name: "auth-test-page",
    configureServer(vite) {
      vite.middlewares.use("/__auth_test", (_, res) => {
        res.setHeader("Content-Type", "text/html");
        res.end("<!doctype html><title>Auth refresh test</title>");
      });
    },
  }],
});
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" });
  const context = await browser.newContext();
  const errors = [];
  let currentCookie = "r0", rotations = 0, active = 0, maxActive = 0, conflicts = 0;
  const seenCookies = [];
  await context.route("**/*", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!["/auth/refresh", "/protected", "/conversations"].includes(path)) return route.continue();
    const headers = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Allow-Methods": "POST,GET,OPTIONS" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/auth/refresh") {
      const cookie = request.headers().cookie?.match(/cupro_refresh_token=([^;]+)/)?.[1];
      seenCookies.push(cookie);
      active++;
      maxActive = Math.max(maxActive, active);
      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        if (cookie !== currentCookie) {
          conflicts++;
          return await route.fulfill({ status: 409, headers, json: { code: "refresh_conflict" } });
        }
        rotations++;
        currentCookie = `r${rotations}`;
        return await route.fulfill({ headers: { ...headers, "Set-Cookie": `cupro_refresh_token=${currentCookie}; Path=/auth; HttpOnly; SameSite=Lax` }, json: { accessToken: `access-${rotations}` } });
      } finally { active--; }
    }
    if (!request.headers().authorization?.startsWith("Bearer access-")) {
      return route.fulfill({ status: 401, headers, json: { message: "expired" } });
    }
    if (path === "/conversations") return route.fulfill({ headers: { ...headers, "Content-Type": "text/event-stream" }, body: 'data: {"type":"done","message_id":1}\n\n' });
    return route.fulfill({ headers, json: { ok: true } });
  });
  const pages = await Promise.all([context.newPage(), context.newPage()]);
  for (const page of pages) {
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/__auth_test");
    await page.evaluate(async () => {
      window.http = await import("/src/api/http.js");
      window.storage = await import("/src/utils/authStorage.js");
      window.stream = await import("/src/api/stream.js");
    });
  }
  assert.ok(await pages[0].evaluate(() => Boolean(navigator.locks)), "this check requires real browser Web Locks");
  await context.addCookies([{ name: "cupro_refresh_token", value: currentCookie, domain: "127.0.0.1", path: "/auth", httpOnly: true, sameSite: "Lax" }]);
  const recovered = await Promise.all(pages.map(page => page.evaluate(() => http.restoreSession())));
  assert.deepEqual(recovered, [true, true]);
  assert.equal(rotations, 2);
  assert.equal(maxActive, 1, "refreshes from two tabs must be serialized");
  assert.deepEqual(seenCookies, ["r0", "r1"]);
  assert.equal(conflicts, 0);
  assert.ok((await context.cookies()).find(cookie => cookie.name === "cupro_refresh_token").httpOnly);

  const beforeMixed = rotations;
  await pages[0].evaluate(async () => {
    storage.setAuthSession({ accessToken: "expired" });
    const ordinary = http.default.get("/protected");
    const streamDone = new Promise((resolve, reject) => stream.sendMessageStream({}, { onDone: resolve, onError: reject }));
    const restored = http.restoreSession();
    await Promise.all([ordinary, streamDone, restored]);
  });
  assert.equal(rotations, beforeMixed + 1, "Axios, SSE and restore must join one renewal");
  for (const page of pages) {
    const saved = await page.evaluate(() => ({ ...localStorage, ...sessionStorage }));
    assert.ok(!JSON.stringify(saved).includes("access-"), "access tokens must remain in memory");
  }
  assert.deepEqual(errors, []);
  console.log("Browser auth checks passed: two-tab Web Locks, latest HttpOnly cookie, shared Axios/SSE/restore renewal and memory-only access tokens.");
} finally {
  await browser?.close();
  await server.close();
}
