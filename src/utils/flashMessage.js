let pendingFlashMessage = null;

function setPendingFlashMessage(message) {
  pendingFlashMessage = message || null;
}

function consumePendingFlashMessage() {
  const message = pendingFlashMessage;
  pendingFlashMessage = null;
  return message;
}

export { consumePendingFlashMessage, setPendingFlashMessage };
