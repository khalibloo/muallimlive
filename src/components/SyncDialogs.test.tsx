import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";

import TestProviders from "@/components/test/TestProviders";
import SyncDialogs from "./SyncDialogs";

vi.mock("next/navigation", () => ({ usePathname: () => "/quran/2" }));

const props = { onChoose: vi.fn(), onStop: vi.fn(), onClearAndStop: vi.fn() };
const renderDialogs = (extra: Partial<React.ComponentProps<typeof SyncDialogs>>) => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      {/* jsdom never fires transition events, so modals only finish opening with motion disabled */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <SyncDialogs {...props} {...extra} />
      </ConfigProvider>
    </TestProviders>,
  );
  return user;
};

describe("SyncDialogs", () => {
  it("asks whether to merge with or use a new account's Drive", async () => {
    const user = renderDialogs({
      pending: { accountId: "u", email: "reader@example.com", reason: "unknown-account" },
    });

    const dialog = await screen.findByRole("dialog", { name: "Combine your data?" });
    expect(within(dialog).getByText(/reader@example.com's Google Drive both have/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Use Drive only" }));
    expect(props.onChoose).toHaveBeenCalledWith("replace");
    await user.click(within(dialog).getByRole("button", { name: "Merge" }));
    expect(props.onChoose).toHaveBeenCalledWith("merge");
  });

  it("offers to discard another account's data", async () => {
    renderDialogs({ pending: { accountId: "u", email: "reader@example.com", reason: "other-account" } });

    expect(await screen.findByRole("button", { name: "Discard this device's data" })).toBeInTheDocument();
  });

  it("can't be dismissed", async () => {
    const user = renderDialogs({ reauthEmail: "reader@example.com" });
    const dialog = await screen.findByRole("dialog", { name: "Sign in to Google again" });

    await user.keyboard("{Escape}");

    await waitFor(() => expect(dialog).toBeVisible());
    expect(within(dialog).queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("signs in again, back to this page", async () => {
    renderDialogs({ reauthEmail: "reader@example.com" });

    expect(await screen.findByRole("link", { name: "Sign in again" })).toHaveAttribute(
      "href",
      "/api/sync/login?returnTo=%2Fquran%2F2",
    );
    expect(screen.getByText("Sign in to Google again to keep syncing reader@example.com.")).toBeInTheDocument();
  });

  it("stops syncing, or clears the data after confirming", async () => {
    const user = renderDialogs({ reauthEmail: "reader@example.com" });

    await user.click(await screen.findByRole("button", { name: "Stop syncing" }));
    expect(props.onStop).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Clear data and stop syncing" }));
    expect(
      await screen.findByText("Delete the favorites and notes on this device? The copy in Google Drive is kept."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(props.onClearAndStop).toHaveBeenCalled();
  });

  it("can't sign in again offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderDialogs({ reauthEmail: "reader@example.com" });

    expect(
      await screen.findByText("You're offline. Connect to the internet to sign in to Google."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeDisabled();
    vi.restoreAllMocks();
  });
});
