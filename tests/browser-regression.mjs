import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// Use an installed Playwright, or point PLAYWRIGHT_MODULE at an existing runtime.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:5175";
const output = process.env.TEST_OUTPUT_DIR || ".test-output";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: process.env.TEST_BROWSER_CHANNEL,
});
const errors = [];
const requests = [];
const user = {
  id: 1,
  username: "Admin",
  email: "admin@example.com",
  role: "admin",
  createdAt: "2026-10-01T00:00:00Z",
  lastLogin: "2026-10-24T00:00:00Z",
  loginCount: 4,
};
const member = {
  ...user,
  id: 2,
  username: "Member",
  email: "member@example.com",
  role: "user",
};
const metrics = {};

async function openPage(path, { authenticated = true, width = 1280 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    timezoneId: "Asia/Shanghai",
    locale: "zh-CN",
  });
  await context.addInitScript(() => {
    localStorage.setItem("locale", "zh");
    Math.random = () => 0.25;
    const epoch = new Date("2026-10-25T00:00:00Z").getTime();
    let tick = 0;
    Date.now = () => epoch + tick++;
  });
  let conversations = [
    {
      conversation_id: 1,
      title: "Existing chat",
      updated_at: "2026-10-24T00:00:00Z",
    },
  ];
  let nextMessageId = 100;
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (!path.startsWith("/auth/") && !path.startsWith("/conversations"))
      return route.continue();
    const method = request.method();
    const payload = request.postDataJSON();
    requests.push({ path, query: url.search, method, payload });
    const json = (data) => route.fulfill({ json: data });
    if (method === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/auth/refresh")
      return authenticated
        ? json({ accessToken: "test-token" })
        : route.fulfill({ status: 401, json: { message: "unauthorized" } });
    if (path === "/auth/me") return json(user);
    if (path === "/auth/login")
      return json({ token: { accessToken: "test-token" } });
    if (path === "/auth/register" || path === "/auth/forgot-password")
      return json({ message: "ok" });
    if (path === "/auth/users/stats")
      return json({ total: 2, admins: 1, users: 1 });
    if (path === "/auth/users" && method === "GET")
      return json({
        users: [user, member],
        total: 2,
        page: Number(url.searchParams.get("page") || 1),
        pageSize: Number(url.searchParams.get("pageSize") || 10),
      });
    if (/^\/auth\/users\/\d+$/.test(path))
      return json(path.endsWith("/1") ? user : member);
    if (path.startsWith("/auth/users")) return json({ ...member, ...payload });
    if (/^\/conversations\/\d+\/messages$/.test(path)) {
      const history = url.searchParams.has("beforeMessageId");
      return json({
        messages: history
          ? [{ message_id: 10, role: "user", content: "Older question" }]
          : Array.from({ length: 10 }, (_, index) => ({
              message_id: 11 + index,
              role: index % 2 ? "assistant" : "user",
              content: index % 2 ? "**Answer**" : "Question",
            })),
        hasMore: !history,
        oldestLoadedMessageId: history ? 10 : 11,
      });
    }
    if (path === "/conversations" && method === "GET")
      return json({ items: conversations });
    if (path === "/conversations" && method === "POST") {
      const conversationId = payload.conversation_id || 2;
      if (!payload.conversation_id)
        conversations.unshift({ conversation_id: 2, title: payload.title });
      const events = [
        { type: "started", conversation_id: conversationId },
        { type: "chunk", chunk: "Stream " },
        { chunk: "reply" }, // Existing legacy event format remains supported.
        {
          type: "done",
          conversation_id: conversationId,
          message_id: nextMessageId++,
        },
      ];
      return route.fulfill({
        contentType: "text/event-stream",
        body: events
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
      });
    }
    return json({});
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "warning" && message.text().includes("Vue warn"))
      errors.push(message.text());
  });
  await page.goto(baseUrl + path);
  await page.locator(".route-loading-overlay").waitFor({ state: "hidden" });
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
  });
  return { page, context };
}

async function capture(page, name, selectors) {
  await page.locator(".route-loading-overlay").waitFor({ state: "hidden" });
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  metrics[name] = await page.evaluate(
    (selectors) =>
      Object.fromEntries(
        selectors.map((selector) => {
          const node = document.querySelector(selector);
          if (!node) return [selector, null];
          const rect = node.getBoundingClientRect();
          const css = getComputedStyle(node);
          return [
            selector,
            {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              background: css.background,
              color: css.color,
              border: css.border,
              borderRadius: css.borderRadius,
              fontSize: css.fontSize,
              padding: css.padding,
              margin: css.margin,
              boxShadow: css.boxShadow,
            },
          ];
        }),
      ),
    selectors,
  );
}

try {
  {
    const { page, context } = await openPage("/login", {
      authenticated: false,
    });
    await page.locator(".auth-input input").first().waitFor();
    await capture(page, "login", [
      ".form-card",
      ".auth-input .el-input__wrapper",
      ".submit-btn",
    ]);
    await page.locator(".switch-btn").click();
    assert.equal(await page.locator(".auth-input").count(), 4);
    await page.locator(".submit-btn").click();
    await page.locator(".el-form-item__error").first().waitFor();
    assert.equal(await page.locator(".el-form-item__error").count(), 4);
    await page.locator(".switch-btn").click();
    await page.locator(".auth-input input").first().fill("admin@example.com");
    await page.locator(".forgot-link").click();
    assert.equal(
      await page.locator(".auth-input input").first().inputValue(),
      "admin@example.com",
    );
    assert.equal(await page.locator(".auth-input").count(), 3);
    await page.locator(".auth-input input").nth(1).fill("secret123");
    await page.locator(".auth-input input").nth(2).fill("secret123");
    await page.locator(".submit-btn").click();
    await page.locator(".forgot-link").waitFor();
    assert.equal(
      await page.locator(".auth-input input").first().inputValue(),
      "admin@example.com",
    );
    await context.close();
  }
  {
    const { page, context } = await openPage("/");
    await page.locator(".message.assistant strong").first().waitFor();
    await capture(page, "chat", [
      ".chat-header",
      ".messages-container",
      ".message-content",
      ".input-container",
      ".model-select .el-select__wrapper",
      ".network-switch-control .el-switch__core",
    ]);
    await page.locator(".messages-container").evaluate((node) => {
      node.scrollTop = 0;
    });
    await page
      .locator(".message.user", { hasText: "Older question" })
      .waitFor();
    await page.locator(".new-chat-btn").click();
    await page.locator(".welcome-screen").waitFor();
    await capture(page, "welcome", [
      ".welcome-screen",
      ".welcome-logo",
      ".suggestion-cards",
      ".suggestion-card",
    ]);
    await page.locator(".suggestion-card").first().click();
    assert.ok((await page.locator("textarea").inputValue()).length > 0);
    await page.locator(".network-switch-control").click();
    await page.locator(".send-btn").click();
    await page
      .locator(".message.assistant", { hasText: "Stream reply" })
      .waitFor();
    await page.locator(".send-btn").waitFor();
    assert.equal(await page.locator("textarea").inputValue(), "");
    assert.equal(await page.locator(".conversation-item.active").count(), 1);
    // Enter sends, Shift+Enter remains multiline.
    await page.locator("textarea").fill("Follow-up");
    await page.locator("textarea").press("Shift+Enter");
    assert.ok((await page.locator("textarea").inputValue()).includes("\n"));
    await page.locator("textarea").press("Enter");
    await page.locator(".send-btn").waitFor();
    const chineseSubtitle = await page.locator(".subtitle").textContent();
    await page.locator(".profile-trigger-btn").click();
    await page.locator(".language-switch").click();
    await page.locator(".dropdown-wrapper").waitFor({ state: "hidden" });
    assert.notEqual(
      await page.locator(".subtitle").textContent(),
      chineseSubtitle,
    );
    await context.close();
  }
  for (const width of [1280, 390]) {
    const { page, context } = await openPage("/usermanagement", { width });
    await page.locator(".user-name", { hasText: "Member" }).waitFor();
    assert.equal(
      await page
        .locator(".el-table__row")
        .first()
        .locator(".el-button--danger")
        .isDisabled(),
      true,
    );
    await capture(page, `users-${width}`, [
      ".search-card",
      ".stats-cards",
      ".stat-card",
      ".table-card",
      ".table-footer",
      ".user-name",
      ".action-buttons",
      ".el-table th",
    ]);
    await page.locator(".btn-add").click();
    const dialog = page.locator(".user-form-dialog");
    await dialog.waitFor();
    await capture(page, `form-${width}`, [
      ".user-form-dialog",
      ".user-form-dialog .el-dialog__header",
      ".user-form-dialog .el-input__wrapper",
      ".user-form-dialog .dialog-footer",
    ]);
    await dialog.locator(".el-input input").nth(0).fill("New User");
    await dialog.locator(".el-input input").nth(1).fill("new@example.com");
    await dialog.locator(".el-input input").nth(2).fill("secret123");
    await dialog.locator(".dialog-footer .el-button--primary").click();
    await dialog.waitFor({ state: "hidden" });
    await page
      .locator(".el-table__row")
      .nth(1)
      .locator(".el-button--warning")
      .click();
    await dialog.waitFor();
    assert.equal(await dialog.locator(".el-input input").count(), 2);
    await dialog.locator(".dialog-footer .el-button--primary").click();
    await dialog.waitFor({ state: "hidden" });
    await page
      .locator(".el-table__row")
      .nth(1)
      .locator(".el-button--primary")
      .click();
    await page.locator(".detail-username").waitFor();
    await capture(page, `detail-${width}`, [
      ".el-dialog:has(.detail-content)",
      ".detail-username",
      ".detail-info-section .el-descriptions",
      ".close-btn",
    ]);
    await context.close();
  }
  assert.ok(
    requests.some(
      (request) =>
        request.path.includes("/messages") &&
        request.query.includes("beforeMessageId"),
    ),
  );
  assert.ok(
    requests.some(
      (request) =>
        request.path === "/conversations" &&
        request.payload?.networkConfig?.search,
    ),
  );
  assert.ok(
    requests.some(
      (request) =>
        request.path === "/conversations" &&
        request.payload?.conversation_id === 2,
    ),
  );
  assert.ok(
    requests.some(
      (request) => request.path === "/auth/users" && request.method === "POST",
    ),
  );
  assert.ok(
    requests.some(
      (request) => request.path === "/auth/users/2" && request.method === "PUT",
    ),
  );
  assert.deepEqual(errors, []);
  await writeFile(`${output}/metrics.json`, JSON.stringify(metrics, null, 2));
  console.log(
    `Browser regression passed: auth modes/validation/reset, chat rendering/history/streaming, user create/edit/detail, desktop/mobile. ${requests.length} mocked requests.`,
  );
} catch (error) {
  if (errors.length) console.error("Page errors:", errors);
  throw error;
} finally {
  await browser.close();
}
