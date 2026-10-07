import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReveal } from "./use-reveal";

/** IntersectionObserver stand-in whose callbacks the test fires by hand. */
class FakeObserver {
  static all: FakeObserver[] = [];
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeObserver.all.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

function Probe() {
  const [ref, reveal] = useReveal<HTMLDivElement>();
  return <div ref={ref} data-testid="probe" data-reveal={reveal} />;
}

beforeEach(() => {
  FakeObserver.all = [];
  globalThis.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useReveal", () => {
  it("replays: shows on entry, rewinds once gone, shows again on return", () => {
    const { getByTestId } = render(<Probe />);
    const probe = getByTestId("probe");
    // The first observer watches entry, the second watches leaving.
    const [entering, leaving] = FakeObserver.all;
    expect(probe.dataset.reveal).toBe("pending");

    act(() => entering!.fire(true));
    expect(probe.dataset.reveal).toBe("visible");

    act(() => leaving!.fire(false));
    expect(probe.dataset.reveal).toBe("reset");
    act(() => vi.advanceTimersToNextFrame());
    act(() => vi.advanceTimersToNextFrame());
    expect(probe.dataset.reveal).toBe("pending");

    act(() => entering!.fire(true));
    expect(probe.dataset.reveal).toBe("visible");
  });

  it("does not rewind something that was never shown", () => {
    const { getByTestId } = render(<Probe />);
    const [, leaving] = FakeObserver.all;
    act(() => leaving!.fire(false));
    expect(getByTestId("probe").dataset.reveal).toBe("pending");
  });

  it("ignores whatever sits behind the sticky header", () => {
    render(<Probe />);
    for (const observer of FakeObserver.all) {
      expect(observer.options.rootMargin).toMatch(/^-80px /);
    }
  });
});
