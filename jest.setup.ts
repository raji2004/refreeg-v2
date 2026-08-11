import "@testing-library/jest-dom";

if (typeof HTMLFormElement !== "undefined" && !HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function requestSubmit() {
    this.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  };
}

const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    if (
      message.includes("Warning: ReactDOM.render") ||
      message.includes("Not implemented: HTMLFormElement.prototype.requestSubmit") ||
      message.includes("Not implemented: navigation")
    ) {
      return;
    }
    originalError(...args);
  };

  console.log = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    if (message.includes("[health]")) {
      return;
    }
    originalLog(...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});
