import { fetchData } from "@/utils/fetcher";
import { GET } from "./route";

vi.mock("@/utils/fetcher", () => ({ fetchData: vi.fn() }));

const get = (name: string) => GET(new Request("http://localhost"), { params: Promise.resolve({ name }) });

describe("GET /api/resources/[name]", () => {
  it.each(["chapters", "recitations"])("serves the %s resource", async (name) => {
    vi.mocked(fetchData).mockResolvedValue({ [name]: [] });

    const response = await get(name);

    await expect(response.json()).resolves.toEqual({ [name]: [] });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, s-maxage=31536000");
    expect(fetchData).toHaveBeenCalledWith(`resources/${name}`);
  });

  it("is not found for other resources", async () => {
    await expect(get("translations")).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(fetchData).not.toHaveBeenCalled();
  });
});
