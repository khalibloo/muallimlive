import { render, waitFor } from "@testing-library/react";

import TestProviders from "@/components/test/TestProviders";
import ServiceWorkerEvents from "./ServiceWorkerEvents";

const unregister = vi.fn();
const serviceWorker = {
  register: vi.fn(),
  getRegistrations: vi.fn(),
};

describe("ServiceWorkerEvents", () => {
  beforeEach(() => {
    serviceWorker.getRegistrations.mockResolvedValue([{ unregister }, { unregister }]);
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("registers the service worker in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(
      <TestProviders>
        <ServiceWorkerEvents />
      </TestProviders>,
    );

    expect(serviceWorker.register).toHaveBeenCalledWith("/serwist/sw.js", { scope: "/", updateViaCache: "none" });
    expect(serviceWorker.getRegistrations).not.toHaveBeenCalled();
  });

  it("unregisters leftover service workers outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    render(
      <TestProviders>
        <ServiceWorkerEvents />
      </TestProviders>,
    );

    await waitFor(() => expect(unregister).toHaveBeenCalledTimes(2));
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it("does nothing when service workers are unsupported", () => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.stubEnv("NODE_ENV", "production");

    expect(() =>
      render(
        <TestProviders>
          <ServiceWorkerEvents />
        </TestProviders>,
      ),
    ).not.toThrow();
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });
});
