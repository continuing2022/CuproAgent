import api, { syncSessionAfterRefresh } from "./http";
import { getAccessToken } from "@/utils/authStorage";

function dispatchSseEvent(event, handlers = {}) {
  const { onStarted, onRetrieved, onChunk, onDone, onError, onAbort } = handlers;
  if (!event || typeof event !== "object") return;

  if (
    event.type === "chunk" ||
    Object.prototype.hasOwnProperty.call(event, "chunk")
  ) {
    event = {
      ...event,
      chunk: typeof event.chunk === "string" ? event.chunk : "",
    };
  }

  switch (event.type) {
    case "started":
      onStarted?.(event);
      break;
    case "retrieved":
      onRetrieved?.(event);
      break;
    case "chunk":
      onChunk?.(event);
      break;
    case "done":
      onDone?.(event);
      break;
    case "error":
      onError?.(Object.assign(new Error(typeof event.error === "string" ? event.error : event.error?.message || "Stream failed"), { code: event.status === "timeout" ? "chat_timeout" : "stream_error" }));
      break;
    case "cancelled":
      onAbort?.();
      break;
    default:
      if (event.started) onStarted?.(event);
      if (event.retrieved) onRetrieved?.(event);
      if (Object.prototype.hasOwnProperty.call(event, "chunk"))
        onChunk?.(event);
      if (
        event.done ||
        Object.prototype.hasOwnProperty.call(event, "message_id")
      ) {
        onDone?.(event);
      }
      if (event.error) onError?.(event.error);
      break;
  }
}

function abortable(promise, signal) {
  if (signal.aborted) { Promise.resolve(promise).catch(() => {}); return Promise.reject(signal.reason); }
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => { cleanup(); reject(signal.reason); };
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(promise).then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}

function processSsePart(part, handlers) {
  const normalizedPart = String(part || "");
  if (!normalizedPart.trim() || normalizedPart.trimStart().startsWith(":"))
    return;

  const dataLines = normalizedPart
    .split(/\r?\n/)
    .map((line) => line.trimStart())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  if (!dataLines.length) return;

  const payloadText = dataLines.join("\n");
  let event = null;
  try {
    event = JSON.parse(payloadText);
  } catch {
    // Ignore a malformed SSE frame instead of aborting the full stream.
    return;
  }

  dispatchSseEvent(event, handlers);
}

async function parseFailedStreamResponse(response) {
  const responseText = await response.text();
  try {
    const payload = JSON.parse(responseText);
    return (
      payload?.message ||
      payload?.error ||
      responseText ||
      `HTTP ${response.status}`
    );
  } catch {
    return responseText || `HTTP ${response.status}`;
  }
}

async function openStreamResponse(
  payload,
  controller,
  allowRefreshRetry = true,
) {
  controller.signal.throwIfAborted();
  const headers = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${api.defaults.baseURL}/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    credentials: "include",
    signal: controller.signal,
  });

  if (res.status === 401 && allowRefreshRetry) {
    await res.body?.cancel();
    await abortable(syncSessionAfterRefresh({ failedAccessToken: token || "" }), controller.signal);
    controller.signal.throwIfAborted();
    return openStreamResponse(payload, controller, false);
  }

  if (!res.ok) {
    throw new Error(await parseFailedStreamResponse(res));
  }

  if (!res.body) {
    throw new Error("Response body is empty");
  }

  return res;
}

export function sendMessageStream(
  payload,
  { onStarted, onRetrieved, onChunk, onDone, onError, onAbort, timeoutMs = 180000 } = {},
) {
  const controller = new AbortController();
  let terminal = false;
  const finish = (status, value) => {
    if (terminal) return;
    terminal = true;
    clearTimeout(deadline);
    if (status === "done") onDone?.(value);
    else if (status === "aborted") onAbort?.();
    else onError?.(value);
  };
  const deadline = setTimeout(() => {
    const error = Object.assign(new Error("Response timed out; please retry"), { code: "chat_timeout" });
    controller.abort(error);
  }, timeoutMs);
  const onSignalAbort = () => finish(controller.signal.reason?.code === "chat_timeout" ? "error" : "aborted", controller.signal.reason);
  controller.signal.addEventListener("abort", onSignalAbort, { once: true });
  const guard = callback => event => { if (!terminal) callback?.(event); };
  const handlers = {
    onStarted: guard(onStarted), onRetrieved: guard(onRetrieved), onChunk: guard(onChunk),
    onDone: event => finish("done", event),
    onError: error => finish("error", error), onAbort: () => finish("aborted"),
  };

  (async () => {
    let reader;
    try {
      const res = await abortable(openStreamResponse(payload, controller), controller.signal);

      reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await abortable(reader.read(), controller.signal);
        buffer += decoder.decode(value || new Uint8Array(), {
          stream: !done,
        });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || "";
        parts.forEach((part) => processSsePart(part, handlers));

        if (done || terminal) break;
      }

      if (buffer.trim()) {
        processSsePart(buffer, handlers);
      }
      if (!terminal) finish("error", Object.assign(new Error("Response connection interrupted; please retry"), { code: "stream_interrupted" }));
    } catch (error) {
      if (controller.signal.aborted) onSignalAbort();
      else finish("error", error);
    } finally {
      clearTimeout(deadline);
      controller.signal.removeEventListener("abort", onSignalAbort);
      if (reader) {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }
  })();

  return {
    abort: () => controller.abort(),
  };
}
