import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUpdateQueue } from '../cartUpdateQueue';

describe('createUpdateQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid schedules into one send with the final desired value', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 2, 1);
    q.schedule('p1', 3, 1);
    q.schedule('p1', 4, 1);

    expect(send).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('p1', 4);
    expect(onError).not.toHaveBeenCalled();
  });

  it('separate debounce windows produce separate sends', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 2, 1);
    await vi.advanceTimersByTimeAsync(100);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith('p1', 2);

    q.schedule('p1', 5, 2);
    await vi.advanceTimersByTimeAsync(100);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('p1', 5);
  });

  it('schedules another send when desired diverges during in-flight send', async () => {
    let resolveFirst: () => void = () => {};
    const send = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>(r => { resolveFirst = r; }))
      .mockResolvedValueOnce(undefined);
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 2, 1);
    await vi.advanceTimersByTimeAsync(100);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith('p1', 2);

    q.schedule('p1', 5, 1);

    resolveFirst();
    await Promise.resolve();
    await Promise.resolve();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('p1', 5);
  });

  it('calls onError with last confirmed when send rejects', async () => {
    const send = vi.fn().mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 5, 2);
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('p1', 2);
  });

  it('after onError, next schedule starts fresh from the new currentConfirmed', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 5, 2);
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith('p1', 2);

    q.schedule('p1', 3, 2);
    await vi.advanceTimersByTimeAsync(100);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('p1', 3);
  });

  it('cancel before debounce fires prevents send', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 5, 2);
    q.cancel('p1');
    await vi.advanceTimersByTimeAsync(100);

    expect(send).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('cancel during in-flight suppresses success and error effects', async () => {
    let rejectFirst: (e: Error) => void = () => {};
    const send = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectFirst = reject; }));
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 5, 2);
    await vi.advanceTimersByTimeAsync(100);
    expect(send).toHaveBeenCalledTimes(1);

    q.cancel('p1');
    rejectFirst(new Error('boom'));
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).not.toHaveBeenCalled();
  });

  it('different productIds do not interfere', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 2, 1);
    q.schedule('p2', 5, 4);
    await vi.advanceTimersByTimeAsync(100);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith('p1', 2);
    expect(send).toHaveBeenCalledWith('p2', 5);
  });

  it('drops the entry when desired returns to confirmed before flush', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const q = createUpdateQueue({ send, onError, debounceMs: 100 });

    q.schedule('p1', 2, 1);
    q.schedule('p1', 1, 1);
    await vi.advanceTimersByTimeAsync(100);

    expect(send).not.toHaveBeenCalled();
  });
});
