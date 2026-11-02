import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const server = await createServer({ server: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" });
  const context = await browser.newContext();
  let history = false;
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.port !== "3000") return route.continue();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (url.pathname === "/auth/refresh") return route.fulfill({ json: { accessToken: "test-access" } });
    if (url.pathname === "/auth/me") return route.fulfill({ json: { id: 1, username: "Test", role: "user" } });
    if (url.pathname === "/conversations") return route.fulfill({ json: { items: history ? [{ conversation_id: "test", title: "SSE test" }] : [] } });
    if (url.pathname.endsWith("/messages")) return route.fulfill({ json: { messages: [{ message_id: 9, role: "assistant", content: "saved partial", status: "aborted" }], hasMore: false } });
    return route.fulfill({ json: {} });
  });
  await context.addInitScript(() => {
    if (location.protocol !== "http:") return;
    localStorage.setItem("locale", "zh");
    window.testStreamMode = "interrupted";
    window.testAborts = 0;
    const original = window.fetch.bind(window);
    window.fetch = async (url, options) => {
      if (!String(url).endsWith("/conversations") || options?.method !== "POST") return original(url, options);
      const mode = window.testStreamMode;
      let onAbort;
      return new Response(new ReadableStream({
        start(controller) {
          const event = value => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`));
          event({ type: "started", conversation_id: "test", user_message_id: 8, assistant_message_id: 9 });
          event({ type: "chunk", chunk: `partial-${mode}` });
          if (mode === "stopped") {
            onAbort = () => { window.testAborts++; controller.error(options.signal.reason); };
            options.signal.addEventListener("abort", onAbort, { once: true });
            return;
          }
          if (mode === "done") event({ type: "done", message_id: 9 });
          if (mode === "timeout") event({ type: "error", status: "timeout", error: "timeout" });
          controller.close();
        },
        cancel() { if (onAbort) options.signal.removeEventListener("abort", onAbort); },
      }), { headers: { "Content-Type": "text/event-stream" } });
    };
  });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base);
  await page.locator("textarea").waitFor();
  for (const mode of ["interrupted", "stopped", "timeout", "done"]) {
    await page.evaluate(mode => { window.testStreamMode = mode; }, mode);
    await page.locator("textarea").fill(`question-${mode}`);
    await page.locator(".send-btn").click();
    if (mode === "stopped") {
      await page.getByText("partial-stopped", { exact: true }).waitFor();
      await page.locator(".stop-btn").click();
      await page.waitForFunction(() => window.testAborts === 1);
    }
    await page.locator(".send-btn").waitFor();
    assert.equal(await page.locator("textarea").isDisabled(), false);
    if (mode === "interrupted") await page.getByRole("alert").filter({ hasText: "回答连接已中断" }).waitFor();
    if (mode === "timeout") await page.getByRole("alert").filter({ hasText: "回答超时" }).waitFor();
    assert.equal(await page.locator(".thinking-bubble").count(), 0);
  }
  history = true;
  await page.reload();
  await page.getByText("saved partial", { exact: true }).waitFor();
  await page.getByRole("status").filter({ hasText: "此回答未完成" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("SSE browser checks passed: interrupted EOF, stop, timeout, success, unlocked composer and persisted incomplete response.");
} finally {
  await browser?.close();
  await server.close();
}
