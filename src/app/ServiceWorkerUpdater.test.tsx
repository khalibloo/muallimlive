import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import ServiceWorkerUpdater from "./ServiceWorkerUpdater";

const mockServiceWorker = (controller: object | null) => {
  const serviceWorker = Object.assign(new EventTarget(), { controller });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
  return serviceWorker;
};

const renderUpdater = () =>
  render(
    <TestProviders>
      <ServiceWorkerUpdater />
    </TestProviders>,
  );

describe("ServiceWorkerUpdater", () => {
  afterEach(() => {
    // unmount before removing the mock so the effect cleanup can still reach it
    cleanup();
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.unstubAllGlobals();
  });

  it("prompts to reload when a new service worker takes over", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    const serviceWorker = mockServiceWorker({});
    renderUpdater();

    act(() => {
      serviceWorker.dispatchEvent(new Event("controllerchange"));
    });

    expect(await screen.findByText("A new version is available")).toBeInTheDocument();
    expect(screen.getByText("Reload to get the latest version of MuallimLive.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalled();
  });

  it("ignores the first controller acquisition", async () => {
    const serviceWorker = mockServiceWorker(null);
    renderUpdater();

    act(() => {
      serviceWorker.dispatchEvent(new Event("controllerchange"));
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("A new version is available")).not.toBeInTheDocument();
  });

  it("stops listening once unmounted", async () => {
    const serviceWorker = mockServiceWorker({});
    const removeEventListener = vi.spyOn(serviceWorker, "removeEventListener");
    const { unmount } = renderUpdater();

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
  });

  it("does nothing when service workers are unsupported", () => {
    expect(() => renderUpdater()).not.toThrow();
  });
});
