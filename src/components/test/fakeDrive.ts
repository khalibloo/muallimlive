import { toUserDataFile, type UserData } from "@/utils/userData";

const FILE_ID = "file-1";

/** Stubs `fetch` with the sync token route and an in-memory Drive app folder */
export const stubDrive = (initial?: UserData) => {
  const drive: {
    file?: { id: string; version: number; content: string };
    tokenStatus: number;
    account: { accountId: string; email: string };
  } = {
    file: initial && { id: FILE_ID, version: 1, content: JSON.stringify(toUserDataFile(initial)) },
    tokenStatus: 200,
    account: { accountId: "user-1", email: "reader@example.com" },
  };
  const meta = () => Response.json({ id: drive.file!.id, version: `${drive.file!.version}` });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(`${input}`, window.location.origin);
    const method = init.method ?? "GET";
    switch (true) {
      case url.pathname === "/api/sync/token":
        return drive.tokenStatus === 200
          ? Response.json({ accessToken: "token", expiresAt: Date.now() + 3_600_000, ...drive.account })
          : new Response(null, { status: drive.tokenStatus });
      case url.pathname === "/api/sync/disconnect":
        return new Response(null, { status: 204 });
      case url.pathname === "/drive/v3/files":
        return Response.json({ files: drive.file ? [{ id: drive.file.id, version: `${drive.file.version}` }] : [] });
      case !!drive.file && url.pathname === `/drive/v3/files/${drive.file.id}`:
        return url.searchParams.get("alt") === "media" ? new Response(drive.file!.content) : meta();
      case url.pathname === "/upload/drive/v3/files" && method === "POST": {
        const file = (init.body as FormData).get("file") as Blob;
        drive.file = { id: FILE_ID, version: 1, content: await file.text() };
        return meta();
      }
      case !!drive.file && url.pathname === `/upload/drive/v3/files/${drive.file.id}` && method === "PATCH":
        drive.file!.content = await (init.body as Blob).text();
        drive.file!.version += 1;
        return meta();
      default:
        return new Response(null, { status: 404 });
    }
  });
  vi.stubGlobal("fetch", fetchMock);
  return { drive, fetchMock, stored: () => drive.file && JSON.parse(drive.file.content) };
};
