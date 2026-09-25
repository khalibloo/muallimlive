import { render, screen } from "@testing-library/react";

import TestProviders from "@/components/test/TestProviders";
import messages from "@/locales/en/common.json";
import PrivacyPolicy from "./PrivacyPolicy";

describe("PrivacyPolicy", () => {
  it("renders the heading and every policy paragraph", () => {
    render(
      <TestProviders>
        <PrivacyPolicy />
      </TestProviders>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    const { common } = messages;
    for (const text of [
      common["privacy-policy-analytics"],
      common["privacy-policy-sync"],
      common["privacy-policy-sharing"],
      common["privacy-policy-children"],
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
