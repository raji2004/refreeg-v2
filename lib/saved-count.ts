"use client";

type Listener = (count: number | null) => void;

type SavedCountStore = {
  count: number | null;
  listeners: Set<Listener>;
};

const globalForSavedCount = globalThis as unknown as {
  __refreegSavedCountStore?: SavedCountStore;
};

function getStore(): SavedCountStore {
  if (!globalForSavedCount.__refreegSavedCountStore) {
    globalForSavedCount.__refreegSavedCountStore = {
      count: null,
      listeners: new Set(),
    };
  }
  return globalForSavedCount.__refreegSavedCountStore;
}

export function subscribeSavedCount(listener: Listener): () => void {
  const store = getStore();
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function getSavedCount(): number | null {
  return getStore().count;
}

export function setSavedCount(count: number | null) {
  const store = getStore();
  store.count = count;
  store.listeners.forEach((listener) => listener(count));
}

export function bumpSavedCount(delta: number) {
  const store = getStore();
  if (store.count === null) return;
  setSavedCount(Math.max(0, store.count + delta));
}
