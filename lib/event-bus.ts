import { EventEmitter } from 'events';

// Create a global event emitter instance.
// In development, to avoid creating multiple instances on hot-reloads, we attach it to the global object.
const globalForEventBus = global as unknown as { eventBus: EventEmitter };

export const eventBus = globalForEventBus.eventBus || new EventEmitter();

// Allow unlimited listeners (useful since every active client connects to this bus)
eventBus.setMaxListeners(0);

if (process.env.NODE_ENV !== 'production') {
  globalForEventBus.eventBus = eventBus;
}
