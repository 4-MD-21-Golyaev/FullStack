export interface UpdateQueueDeps {
  send: (productId: string, qty: number) => Promise<void>;
  onError: (productId: string, confirmedQty: number) => void;
  debounceMs?: number;
}

export interface UpdateQueue {
  schedule: (productId: string, desired: number, currentConfirmed: number) => void;
  cancel: (productId: string) => void;
}

interface Entry {
  desired: number;
  confirmed: number;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
}

const DEFAULT_DEBOUNCE_MS = 300;

export function createUpdateQueue(deps: UpdateQueueDeps): UpdateQueue {
  const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const pending = new Map<string, Entry>();

  const flush = (productId: string): void => {
    const entry = pending.get(productId);
    if (!entry) return;
    entry.timer = null;
    if (entry.inFlight) return;
    if (entry.desired === entry.confirmed) {
      pending.delete(productId);
      return;
    }
    const sending = entry.desired;
    entry.inFlight = true;
    deps.send(productId, sending)
      .then(() => {
        // Bail if cancelled mid-flight (entry replaced/removed).
        if (pending.get(productId) !== entry) return;
        entry.confirmed = sending;
        entry.inFlight = false;
        if (entry.desired !== entry.confirmed) {
          flush(productId);
        } else {
          pending.delete(productId);
        }
      })
      .catch(() => {
        if (pending.get(productId) !== entry) return;
        const confirmed = entry.confirmed;
        entry.inFlight = false;
        pending.delete(productId);
        deps.onError(productId, confirmed);
      });
  };

  return {
    schedule(productId, desired, currentConfirmed) {
      let entry = pending.get(productId);
      if (!entry) {
        entry = { desired, confirmed: currentConfirmed, timer: null, inFlight: false };
        pending.set(productId, entry);
      } else {
        entry.desired = desired;
      }
      if (entry.timer) clearTimeout(entry.timer);
      if (!entry.inFlight) {
        entry.timer = setTimeout(() => flush(productId), debounceMs);
      }
    },
    cancel(productId) {
      const entry = pending.get(productId);
      if (!entry) return;
      if (entry.timer) clearTimeout(entry.timer);
      pending.delete(productId);
    },
  };
}
