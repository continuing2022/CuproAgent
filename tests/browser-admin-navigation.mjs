import assert from "node:assert/strict";
import { createServer } from "vite";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const server = await createServer({
  cacheDir: ".test-output/vite-admin-cache",
  optimizeDeps: { force: true },
  server: { host: "127.0.0.1", port: 0, open: false },
});
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" });
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("locale", "zh"));
  await context.route("**/*", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/auth/refresh") return route.fulfill({ json: { accessToken: "test-token" } });
    if (path === "/auth/me") return route.fulfill({ json: { id: 1, username: "Admin", email: "admin@example.com", role: "admin" } });
    if (path === "/conversations") return route.fulfill({ json: { items: [] } });
    if (path === "/auth/users") return route.fulfill({ json: { users: [], total: 0 } });
    if (path === "/auth/users/stats") return route.fulfill({ json: { total: 0, admins: 0, users: 0 } });
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  const staleDependencies = [];
  page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
  page.on("console", message => { if (message.type() === "error") console.error(message.text()); });
  page.on("response", response => { if (response.status() === 504) staleDependencies.push(response.url()); });
  await page.goto(base);
  await page.locator(".profile-trigger-btn").click();
  await page.getByRole("button", { name: "后台管理" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(await page.locator(".el-message--error").count(), 0);
  await page.getByRole("button", { name: "后台管理" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确定", exact: true }).click();
  await page.waitForURL("**/usermanagement", { timeout: 10000 });
  await page.locator(".user-management-container").waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(staleDependencies, []);
  console.log("Admin navigation passed with cold dependencies: cancellation stays home; confirmation updates URL and renders user management without 504s.");
} finally {
  await browser?.close();
  await server.close();
}
