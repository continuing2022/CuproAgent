import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const server = await createServer({ server: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" });
  const page = await browser.newPage();
  const requests = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    if (location.protocol === "http:" || location.protocol === "https:") localStorage.setItem("locale", "zh");
  });
  await page.route("**/auth/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/auth/refresh") return route.fulfill({ status: 401, json: { message: "unauthorized" } });
    requests.push({ path, payload: request.postDataJSON() });
    if (path === "/auth/reset-password" && request.postDataJSON().token === "invalid") {
      return route.fulfill({ status: 400, json: { message: "invalid or expired reset token" } });
    }
    return route.fulfill({ status: path === "/auth/forgot-password" ? 202 : 200, json: { message: "ok" } });
  });
  await page.goto(base + "/login");
  await page.getByRole("button", { name: "忘记密码" }).click();
  assert.equal(await page.locator('input[type="password"]').count(), 0);
  await page.locator('input[type="email"]').fill("user@example.com");
  await page.getByRole("button", { name: "发送重置邮件" }).click();
  await page.getByText("如果该邮箱已注册，将收到密码重置邮件，请检查收件箱。").waitFor();
  assert.deepEqual(requests.at(-1), { path: "/auth/forgot-password", payload: { email: "user@example.com" } });

  const token = "a".repeat(64);
  await page.goto(base + "/login#reset-token=" + token);
  await page.locator('input[type="password"]').first().waitFor({ timeout: 10000 }).catch(async error => {
    console.error({ url: page.url(), text: await page.locator("body").innerText(), errors });
    throw error;
  });
  assert.equal(await page.locator('input[type="email"]').count(), 0);
  assert.ok(!page.url().includes(token), "token must be removed from the URL");
  await page.locator('input[type="password"]').nth(0).fill("new-password");
  await page.locator('input[type="password"]').nth(1).fill("different-password");
  await page.getByRole("button", { name: "重置密码", exact: true }).click();
  await page.locator(".el-form-item__error").waitFor();
  assert.equal(requests.filter(request => request.path === "/auth/reset-password").length, 0);
  await page.locator('input[type="password"]').nth(1).fill("new-password");
  await page.getByRole("button", { name: "重置密码", exact: true }).click();
  await page.getByText("密码重置成功，请登录", { exact: true }).waitFor();
  assert.deepEqual(requests.at(-1), { path: "/auth/reset-password", payload: { token, password: "new-password" } });
  await page.locator('input[type="email"]').waitFor();

  await page.goto(base + "/login#reset-token=invalid");
  await page.locator('input[type="password"]').nth(0).fill("new-password");
  await page.locator('input[type="password"]').nth(1).fill("new-password");
  await page.getByRole("button", { name: "重置密码", exact: true }).click();
  await page.getByText("重置链接无效或已过期，请重新申请", { exact: true }).waitFor();
  await page.goto("about:blank");
  await page.goto(base + "/login#reset-token=" + token);
  await page.locator('input[type="password"]').nth(1).waitFor();
  await page.waitForURL(base + "/login");
  assert.equal(await page.locator('input[type="email"]').count(), 0);
  assert.deepEqual(errors, []);
  console.log("Password reset browser checks passed: email request, token landing, confirmation, success and invalid link.");
} finally {
  await browser?.close();
  await server.close();
}
