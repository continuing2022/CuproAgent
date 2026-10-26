import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5182";
const output = ".test-output/model-settings";
await mkdir(output, { recursive: true });
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => localStorage.setItem("locale", "zh"));
    const keys = {};
    let failLoad = false;
    let failSave = false;
    const errors = [];
    await context.route("**/*", async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = value => route.fulfill({ json: value });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
      if (path === "/auth/refresh") return json({ accessToken: "test-token" });
      if (path === "/auth/me") return json({ id: 1, username: "Member", email: "member@example.com", role: "user" });
      if (path === "/conversations") return json({ items: [] });
      if (path === "/model-settings") {
        if (failLoad) return route.fulfill({ status: 503, json: { message: "加载失败，请重试" } });
        return json({ providers: ["dashscope", "deepseek"].map(provider => ({ provider, configured: Boolean(keys[provider]), maskedKey: keys[provider] ? `••••${keys[provider].slice(-4)}` : "" })) });
      }
      if (path.startsWith("/model-settings/")) {
        const provider = path.split("/").at(-1);
        if (request.method() === "PUT") {
          if (failSave) return route.fulfill({ status: 503, json: { message: "保存失败，请重试" } });
          keys[provider] = request.postDataJSON().apiKey;
        }
        if (request.method() === "DELETE") delete keys[provider];
        return json({ message: "ok" });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base);
    await page.locator(".route-loading-overlay").waitFor({ state: "hidden" });
    await page.locator(".key-settings-link").click();
    const dialog = page.getByRole("dialog", { name: "模型服务设置", exact: true });
    await dialog.waitFor();
    const forms = dialog.locator(".provider-form");
    await forms.first().waitFor();
    assert.equal(await forms.count(), 2);
    assert.equal(await forms.getByRole("button", { name: "保存", exact: true }).first().isEnabled(), false);
    for (const [index, provider] of ["dashscope", "deepseek"].entries()) {
      const key = `sk-${provider}-user-${width}-1234`;
      await forms.nth(index).locator("input").fill(key);
      await forms.nth(index).getByRole("button", { name: "保存", exact: true }).click();
      await forms.nth(index).getByText("已配置 ••••1234", { exact: true }).waitFor();
      assert.equal(await forms.nth(index).locator("input").inputValue(), "");
      assert.ok(!(await dialog.innerText()).includes(key));
      assert.equal(keys[provider], key);
    }
    assert.ok(!(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).includes("sk-"));
    await forms.first().locator("input").fill("sk-replacement-5678");
    failSave = true;
    await forms.first().getByRole("button", { name: "保存", exact: true }).click();
    await dialog.getByRole("alert").filter({ hasText: "保存失败" }).waitFor();
    assert.equal(keys.dashscope, `sk-dashscope-user-${width}-1234`);
    failSave = false;
    await forms.first().getByRole("button", { name: "保存", exact: true }).click();
    await forms.first().getByText("已配置 ••••5678", { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/${width}.png`, fullPage: true });
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    await forms.last().getByRole("button", { name: "删除", exact: true }).click();
    await page.getByRole("button", { name: "删除", exact: true }).last().click();
    await forms.last().getByText("未配置", { exact: true }).waitFor();
    await forms.first().locator("input").fill("sk-unsaved-draft");
    await dialog.getByRole("button", { name: "关闭", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    failLoad = true;
    await page.locator(".key-settings-link").click();
    await dialog.getByRole("alert").filter({ hasText: "加载失败" }).waitFor();
    assert.equal(await forms.first().locator("input").inputValue(), "");
    assert.equal(await forms.first().locator("input").isEnabled(), false);
    failLoad = false;
    await dialog.getByRole("button", { name: "重新加载", exact: true }).click();
    await forms.first().locator("input:enabled").waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log("Model settings browser tests passed at 1280px and 390px: save, replace, delete, failure/retry, masking, draft clearing, no browser persistence.");
} finally { await browser.close(); }
