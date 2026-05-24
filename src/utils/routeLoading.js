import { ref } from "vue";

const isRouteLoading = ref(false);

const SHOW_DELAY_MS = 90;
const MIN_VISIBLE_MS = 220;

let activeRequestId = 0;
let visibleSince = 0;
let showTimer = null;
let hideTimer = null;

function clearTimers() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function stopRouteLoading() {
  clearTimers();

  if (!isRouteLoading.value) {
    return;
  }

  const elapsed = Date.now() - visibleSince;
  const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

  hideTimer = window.setTimeout(() => {
    isRouteLoading.value = false;
    visibleSince = 0;
    hideTimer = null;
  }, remaining);
}

function startRouteLoading() {
  activeRequestId += 1;
  const requestId = activeRequestId;

  clearTimers();
  showTimer = window.setTimeout(() => {
    if (requestId !== activeRequestId) return;
    isRouteLoading.value = true;
    visibleSince = Date.now();
    showTimer = null;
  }, SHOW_DELAY_MS);

  return requestId;
}

function finishRouteLoading(requestId) {
  if (!requestId || requestId !== activeRequestId) {
    return;
  }

  stopRouteLoading();
}

export { finishRouteLoading, isRouteLoading, startRouteLoading };
