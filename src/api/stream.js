import api, { syncSessionAfterRefresh } from "./http";
import { getAccessToken } from "@/utils/authStorage";

function dispatchSseEvent(event, handlers = {}) {
  const { onStarted, onRetrieved, onChunk, onDone, onError } = handlers;
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
      onError?.(event.error || event);
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
    await syncSessionAfterRefresh();
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
  { onStarted, onRetrieved, onChunk, onDone, onError, onAbort } = {},
) {
  const controller = new AbortController();
  const handlers = { onStarted, onRetrieved, onChunk, onDone, onError };

  (async () => {
    try {
      const res = await openStreamResponse(payload, controller);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), {
          stream: !done,
        });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || "";
        parts.forEach((part) => processSsePart(part, handlers));

        if (done) break;
      }

      if (buffer.trim()) {
        processSsePart(buffer, handlers);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        onAbort?.();
        return;
      }
      onError?.(error);
    }
  })();

  return {
    abort: () => controller.abort(),
  };
}
