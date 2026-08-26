const failures = new Map<string, { count: number; lastFailure: number }>();
const THRESHOLD = 5; // Open circuit after 5 failures
const RESET_TIME = 60000; // Reset after 60 seconds

export function checkCircuit(service: string) {
  const state = failures.get(service);
  if (state && state.count >= THRESHOLD) {
    if (Date.now() - state.lastFailure < RESET_TIME) {
      throw new Error(`${service} is temporarily unavailable (Circuit Open)`);
    }
    // Reset if time has passed
    failures.delete(service);
  }
}

export function recordFailure(service: string) {
  const state = failures.get(service) || { count: 0, lastFailure: 0 };
  state.count += 1;
  state.lastFailure = Date.now();
  failures.set(service, state);
}

export function recordSuccess(service: string) {
  failures.delete(service);
}
