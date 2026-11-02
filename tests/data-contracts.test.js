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
const { default: api, syncSessionAfterRefresh, restoreSession } = await server.ssrLoadModule("/src/api/http.js");
const { getAccessToken, setAuthSession, clearAuthSession } = await server.ssrLoadModule("/src/utils/authStorage.js");
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
  clearAuthSession();
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

function httpFailure(config, status, data = {}) {
  return Object.assign(new Error(data.message || "failed"), { config, response: { status, data } });
}

test("Axios, SSE and session recovery join the same refresh promise", async () => {
  setAuthSession({ accessToken: "expired-token" });
  let releaseRefresh, signalRefresh, signalStream;
  const refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
  const refreshStarted = new Promise(resolve => { signalRefresh = resolve; });
  const streamStarted = new Promise(resolve => { signalStream = resolve; });
  let refreshes = 0, fetches = 0;
  api.defaults.adapter = async config => {
    if (config.url === "/auth/refresh") {
      refreshes++;
      signalRefresh();
      await refreshGate;
      return response(config, { accessToken: "shared-token" });
    }
    if (config.headers.Authorization !== "Bearer shared-token") throw httpFailure(config, 401);
    return response(config, { ok: true });
  };
  globalThis.fetch = async (_, { headers }) => {
    fetches++;
    if (headers.Authorization === "Bearer expired-token") {
      signalStream();
      return new Response("unauthorized", { status: 401 });
    }
    assert.equal(headers.Authorization, "Bearer shared-token");
    return new Response('data: {"type":"done","message_id":1}\n\n');
  };
  const ordinary = api.get("/shared");
  await refreshStarted;
  const recovery = restoreSession();
  const stream = new Promise((resolve, reject) => sendMessageStream({}, { onDone: resolve, onError: reject }));
  await streamStarted;
  releaseRefresh();
  const [result, restored] = await Promise.all([ordinary, recovery, stream]);
  assert.ok(result.data.ok && restored);
  assert.equal(refreshes, 1);
  assert.equal(fetches, 2);
});

test("a late 401 reuses the already renewed token instead of rotating again", async () => {
  setAuthSession({ accessToken: "old" });
  let releaseLate, seenLate;
  const lateGate = new Promise(resolve => { releaseLate = resolve; });
  const lateStarted = new Promise(resolve => { seenLate = resolve; });
  let refreshes = 0;
  api.defaults.adapter = async config => {
    if (config.url === "/auth/refresh") {
      refreshes++;
      return response(config, { accessToken: "new" });
    }
    if (!config._retry) {
      if (config.url === "/late") { seenLate(); await lateGate; }
      throw httpFailure(config, 401);
    }
    assert.equal(config.headers.Authorization, "Bearer new");
    return response(config, {});
  };
  const late = api.get("/late");
  await lateStarted;
  await api.get("/early");
  releaseLate();
  await late;
  assert.equal(refreshes, 1);
});

test("refresh retries explicit conflicts, preserves sessions on 503 and clears on 401", async () => {
  setAuthSession({ accessToken: "old" });
  let calls = 0;
  api.defaults.adapter = async config => {
    calls++;
    if (calls === 1) throw httpFailure(config, 409, { code: "refresh_conflict" });
    return response(config, { accessToken: "new" });
  };
  await syncSessionAfterRefresh();
  assert.equal(calls, 2);
  assert.equal(getAccessToken(), "new");
  api.defaults.adapter = async config => { throw httpFailure(config, 503); };
  await assert.rejects(syncSessionAfterRefresh());
  assert.equal(getAccessToken(), "new");
  api.defaults.adapter = async config => { throw httpFailure(config, 401); };
  await assert.rejects(syncSessionAfterRefresh());
  assert.equal(getAccessToken(), "");
});

test("a refresh completing after logout or a new login cannot resurrect or replace that session", async () => {
  for (const nextSession of ["", "different-account"]) {
    setAuthSession({ accessToken: "old" });
    let release, started;
    const gate = new Promise(resolve => { release = resolve; });
    const waiting = new Promise(resolve => { started = resolve; });
    api.defaults.adapter = async config => { started(); await gate; return response(config, { accessToken: "stale" }); };
    const pending = syncSessionAfterRefresh();
    await waiting;
    if (nextSession) setAuthSession({ accessToken: nextSession });
    else clearAuthSession();
    release();
    await assert.rejects(pending, error => error.code === "session_changed");
    assert.equal(getAccessToken(), nextSession);
  }
});

test("invalid login credentials do not trigger session refresh", async () => {
  let calls = 0;
  api.defaults.adapter = async config => { calls++; throw httpFailure(config, 401); };
  await assert.rejects(api.post("/auth/login", {}));
  assert.equal(calls, 1);
});

test("a stream stopped during shared refresh does not reopen after renewal", async () => {
  setAuthSession({ accessToken: "expired" });
  let release, started;
  const gate = new Promise(resolve => { release = resolve; });
  const waiting = new Promise(resolve => { started = resolve; });
  api.defaults.adapter = async config => { started(); await gate; return response(config, { accessToken: "new" }); };
  let fetches = 0;
  globalThis.fetch = async () => { fetches++; return new Response("unauthorized", { status: 401 }); };
  let stream;
  const stopped = new Promise((resolve, reject) => { stream = sendMessageStream({}, { onAbort: resolve, onError: reject }); });
  await waiting;
  stream.abort();
  release();
  await stopped;
  assert.equal(fetches, 1);
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

test("EOF without a terminal event reports interruption exactly once", async () => {
  globalThis.fetch = async () => new Response('data: {"type":"chunk","chunk":"partial"}\n\n');
  let chunks = "", done = 0, failures = 0;
  await new Promise(resolve => sendMessageStream({}, {
    onChunk: event => { chunks += event.chunk; }, onDone: () => done++,
    onError: error => { failures++; assert.equal(error.code, "stream_interrupted"); resolve(); },
  }));
  assert.equal(chunks, "partial");
  assert.equal(done, 0);
  assert.equal(failures, 1);
});

test("done/error are terminal even when the connection stays open or later sends more frames", async () => {
  for (const terminal of ['{"type":"done"}', '{"type":"error","error":"failed"}']) {
    let cancelled = false, done = 0, failures = 0, chunks = 0;
    globalThis.fetch = async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode(`data: ${terminal}\n\ndata: {"chunk":"late"}\n\ndata: {"type":"done"}\n\n`)); },
      cancel() { cancelled = true; },
    }));
    await new Promise(resolve => sendMessageStream({}, {
      onChunk: () => chunks++, onDone: () => { done++; resolve(); }, onError: () => { failures++; resolve(); },
    }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(done + failures, 1);
    assert.equal(chunks, 0);
    assert.ok(cancelled);
  }
});

test("idle stream timeout releases the client; cancellation is immediate and terminal", async () => {
  globalThis.fetch = async () => new Response(new ReadableStream({ start() {} }));
  await new Promise(resolve => sendMessageStream({}, {
    timeoutMs: 20,
    onError: error => { assert.equal(error.code, "chat_timeout"); resolve(); },
  }));
  let aborted = 0, failed = 0;
  const stream = sendMessageStream({}, { onAbort: () => aborted++, onError: () => failed++ });
  stream.abort();
  stream.abort();
  assert.equal(aborted, 1);
  assert.equal(failed, 0);
});
