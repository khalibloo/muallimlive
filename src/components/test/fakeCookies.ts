import { cookies } from "next/headers";

/** Makes the mocked `cookies()` a working in-memory store and returns its cookies by name */
export const stubCookies = () => {
  const jar = new Map<string, { value: string; options?: Record<string, unknown> }>();
  const store = {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      // iron-session's destroy() writes an empty, expired cookie
      if (value === "" || options?.maxAge === 0) {
        jar.delete(name);
      } else {
        jar.set(name, { value, options });
      }
    },
    delete: (name: string) => jar.delete(name),
  };
  vi.mocked(cookies).mockResolvedValue(store as never);
  return jar;
};
