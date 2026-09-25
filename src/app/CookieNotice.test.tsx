import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import lf from "localforage";

import TestProviders from "@/components/test/TestProviders";
import CookieNotice, { COOKIE_NOTICE_KEY } from "./CookieNotice";

describe("CookieNotice", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("shows the notice when cookies have not been accepted", async () => {
    render(
      <TestProviders>
        <CookieNotice />
      </TestProviders>,
    );

    const notice = await screen.findByRole("region", { name: "Cookie notice" });
    expect(notice).toHaveTextContent(
      "This website uses cookies. By continuing to use the website, you indicate that you are fine with this.",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  it("hides the notice and remembers acceptance", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CookieNotice />
      </TestProviders>,
    );

    await user.click(await screen.findByRole("button", { name: "Accept Cookies" }));

    await waitFor(() => expect(screen.queryByRole("region", { name: "Cookie notice" })).not.toBeInTheDocument());
    expect(await lf.getItem(COOKIE_NOTICE_KEY)).toBe(true);
  });

  it("stays hidden when cookies were already accepted", async () => {
    await lf.setItem(COOKIE_NOTICE_KEY, true);
    const getItem = vi.spyOn(lf, "getItem");
    render(
      <TestProviders>
        <CookieNotice />
      </TestProviders>,
    );

    await waitFor(() => expect(getItem).toHaveBeenCalledWith(COOKIE_NOTICE_KEY));
    await getItem.mock.results[0].value;
    expect(screen.queryByRole("region", { name: "Cookie notice" })).not.toBeInTheDocument();
    getItem.mockRestore();
  });
});
