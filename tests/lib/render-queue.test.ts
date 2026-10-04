/**
 * @jest-environment node
 */
import { createRenderQueue } from "@/lib/media/render-queue";

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const flush = () => new Promise((r) => setImmediate(r));

describe("createRenderQueue", () => {
  it("shares one job between callers asking for the same key", async () => {
    const queue = createRenderQueue(2);
    const gate = deferred();
    const job = jest.fn(async () => {
      await gate.promise;
      return "done";
    });

    const a = queue.run("cover-1", job);
    const b = queue.run("cover-1", job);
    gate.resolve();

    await expect(Promise.all([a, b])).resolves.toEqual(["done", "done"]);
    expect(job).toHaveBeenCalledTimes(1);
  });

  it("runs the key again once the earlier job has finished", async () => {
    const queue = createRenderQueue(2);
    const job = jest.fn(async () => "done");

    await queue.run("cover-1", job);
    await queue.run("cover-1", job);

    expect(job).toHaveBeenCalledTimes(2);
  });

  it("never runs more than the limit at once", async () => {
    const queue = createRenderQueue(2);
    const gates = [deferred(), deferred(), deferred(), deferred()];
    let running = 0;
    let peak = 0;

    const runs = gates.map((gate, i) =>
      queue.run(`cover-${i}`, async () => {
        running++;
        peak = Math.max(peak, running);
        await gate.promise;
        running--;
      }),
    );

    await flush();
    expect(running).toBe(2);

    gates[0].resolve();
    await flush();
    // A job arriving now must not jump the queued ones past the limit.
    const late = queue.run("cover-late", async () => {
      running++;
      peak = Math.max(peak, running);
      running--;
    });
    await flush();
    expect(running).toBe(2);

    gates.slice(1).forEach((g) => g.resolve());
    await Promise.all([...runs, late]);
    expect(peak).toBe(2);
  });

  it("frees the slot when a job fails", async () => {
    const queue = createRenderQueue(1);

    await expect(
      queue.run("bad", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(queue.run("good", async () => "ok")).resolves.toBe("ok");
  });
});
