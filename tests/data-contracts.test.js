import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import {
  normalizeConversationsResponse,
  normalizeMessagesResponse,
} from "../src/utils/chat.js";

// Exercise the public API through Vite so aliases and import.meta.env match the app.
const server = await createServer({
  configFile: false,
  cacheDir: ".test-output/vite-cache",
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  },
});
const { default: api } = await server.ssrLoadModule("/src/api/http.js");
const { getMessages } = await server.ssrLoadModule("/src/api/conversations.js");
const { sendMessageStream } = await server.ssrLoadModule("/src/api/stream.js");
const { useConversationMessages } = await server.ssrLoadModule(
  "/src/composables/useConversationMessages.js",
);
const originalFetch = globalThis.fetch;
const originalAdapter = api.defaults.adapter;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;
globalThis.localStorage = {
  getItem() {
    return "zh";
  },
  setItem() {},
  removeItem() {},
};
globalThis.sessionStorage = { removeItem() {} };
afterEach(() => {
  globalThis.fetch = originalFetch;
  api.defaults.adapter = originalAdapter;
});
after(async () => {
  globalThis.localStorage = originalLocalStorage;
  globalThis.sessionStorage = originalSessionStorage;
  await server.close();
});

const response = (config, data) => ({
  status: 200,
  statusText: "OK",
  headers: {},
  config,
  data,
});

test("external message formats produce one internal message shape", () => {
  const legacy = [
    { message_id: 7, content: null },
    { id: 8, role: "user", content: "hello" },
  ];
  assert.deepEqual(
    normalizeMessagesResponse(legacy),
    normalizeMessagesResponse({ messages: legacy }),
  );
  assert.equal(normalizeMessagesResponse(legacy)[0].content, "");
  assert.equal(normalizeMessagesResponse(legacy)[0].role, "assistant");
  assert.equal(normalizeMessagesResponse(legacy)[1].message_id, 8);
  assert.equal(
    normalizeConversationsResponse(
      { items: [{ conversation_id: 1 }] },
      "New chat",
    )[0].title,
    "New chat",
  );
});

test("message API normalizes both pagination objects and legacy arrays", async () => {
  api.defaults.adapter = async (config) =>
    response(config, {
      messages: [{ message_id: 12, content: null }],
      hasMore: true,
    });
  const page = await getMessages(1, { limit: 10 });
  assert.equal(page.hasMore, true);
  assert.equal(page.oldestLoadedMessageId, 12);
  assert.equal(page.messages[0].content, "");
  api.defaults.adapter = async (config) =>
    response(config, [{ id: 4, content: "old response" }]);
  assert.equal((await getMessages(1)).messages[0].message_id, 4);
  assert.equal((await getMessages(1)).hasMore, false);
});

test("a new conversation has readable state before its first request completes", async () => {
  const messages = useConversationMessages();
  const initial = messages.getConversationMessageState(1);
  assert.deepEqual(initial.items, []);
  assert.equal(initial.isLoaded, false);
  messages.setConversationMessageState(1, { scrollTop: 17 });
  api.defaults.adapter = async (config) =>
    response(config, {
      messages: [],
      hasMore: true,
      oldestLoadedMessageId: 9,
    });
  await messages.loadConversationMessages(1);
  assert.equal(messages.getConversationMessageState(1).isLoaded, true);
  api.defaults.adapter = async (config) =>
    response(config, { messages: [], hasMore: false });
  await messages.loadConversationMessages(1, { beforeMessageId: 9 });
  const loaded = messages.getConversationMessageState(1);
  assert.equal(loaded.scrollTop, 17);
  assert.equal(loaded.oldestLoadedMessageId, 9);
  assert.equal(loaded.isLoadingHistory, false);
  assert.equal(loaded.hasMore, false);
});

test("concurrent unauthorized requests share one refresh and retry once", async () => {
  let refreshes = 0;
  const retried = [];
  api.defaults.adapter = async (config) => {
    if (config.url === "/auth/refresh") {
      refreshes += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response(config, { accessToken: "renewed-token" });
    }
    if (!config._retry) {
      const error = new Error("expired");
      error.config = config;
      error.response = { status: 401, data: { message: "expired" } };
      throw error;
    }
    retried.push(config.headers.Authorization);
    return response(config, { ok: true });
  };
  const results = await Promise.all([api.get("/first"), api.get("/second")]);
  assert.equal(refreshes, 1);
  assert.deepEqual(retried, ["Bearer renewed-token", "Bearer renewed-token"]);
  assert.ok(results.every((result) => result.data.ok));
});

test("both server validation formats expose canonical field errors", async () => {
  for (const key of ["errors", "fieldErrors"]) {
    api.defaults.adapter = async (config) => {
      const error = new Error("bad request");
      error.config = config;
      error.response = {
        status: 400,
        data: { [key]: { email: "invalid email format" } },
      };
      throw error;
    };
    await assert.rejects(api.get("/invalid-form"), (error) => {
      assert.equal(error.fieldErrors.email, "invalid email format");
      return true;
    });
  }
});

test("locale switching and missing-key fallbacks work without plugin injection", async () => {
  const { t, setLocale } = await server.ssrLoadModule("/src/i18n/index.js");
  const chinese = t("login");
  setLocale("en");
  assert.notEqual(t("login"), chinese);
  assert.equal(t("missing-key", "Fallback"), "Fallback");
  assert.equal(t("missing-key"), "missing-key");
  setLocale("zh");
  assert.equal(t("login"), chinese);
});

test("SSE handles split UTF-8, malformed frames, and both event formats", async () => {
  const bytes = new TextEncoder().encode(
    [
      ": heartbeat\n\n",
      "data: invalid-json\n\n",
      'data: {"type":"started","conversation_id":2}\r\n\r\n',
      'data: {"type":"chunk","chunk":"你好"}\n\n',
      'data: {"chunk":" world"}\n\n',
      'data: {"type":"chunk","chunk":null}\n\n',
      'data: {"type":"done","message_id":10}',
    ].join(""),
  );
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          for (let offset = 0; offset < bytes.length; offset += 3)
            controller.enqueue(bytes.slice(offset, offset + 3));
          controller.close();
        },
      }),
    );
  let text = "";
  let started;
  const done = await new Promise((resolve, reject) =>
    sendMessageStream(
      { content: "test" },
      {
        onStarted: (event) => {
          started = event.conversation_id;
        },
        onChunk: (event) => {
          text += event.chunk;
        },
        onDone: resolve,
        onError: reject,
      },
    ),
  );
  assert.equal(started, 2);
  assert.equal(text, "你好 world");
  assert.equal(done.message_id, 10);
});

test("stopping a stream calls onAbort without an error", async () => {
  globalThis.fetch = async (_, { signal }) =>
    new Promise((_, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("stopped", "AbortError")),
        { once: true },
      );
    });
  await new Promise((resolve, reject) => {
    const stream = sendMessageStream(
      { content: "test" },
      { onAbort: resolve, onError: reject },
    );
    stream.abort();
  });
});
