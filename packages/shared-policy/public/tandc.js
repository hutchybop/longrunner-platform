function setSubmitButtonEnabled(enabled) {
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.disabled = !enabled;
  }
}

// eslint-disable-next-line no-unused-vars
function onTurnstileSuccess() {
  setSubmitButtonEnabled(true);
}

// eslint-disable-next-line no-unused-vars
function onTurnstileExpired() {
  setSubmitButtonEnabled(false);
}

// eslint-disable-next-line no-unused-vars
function onTurnstileError() {
  setSubmitButtonEnabled(false);
}

document.addEventListener("DOMContentLoaded", function () {
  setSubmitButtonEnabled(false);
});
