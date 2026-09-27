import { renderHook } from "@testing-library/react";

import TestProviders from "./test/TestProviders";
import useHadithReference from "./useHadithReference";

describe("useHadithReference", () => {
  it("names the volume only when there is one", () => {
    const { result } = renderHook(useHadithReference, { wrapper: TestProviders });
    expect(result.current({ volume: 2, book: 13, id: "1" })).toBe("Volume 2, Book 13, Hadith 1");
    expect(result.current({ book: 4, id: "4.1.1" })).toBe("Book 4, Hadith 4.1.1");
  });
});
