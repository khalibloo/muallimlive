import fsPromises from "fs/promises";
import path from "path";

export const fetchData = async (filepath: string) => {
  const data = "" + (await fsPromises.readFile(path.join(process.cwd(), "src/data", filepath + ".json")));
  return JSON.parse(data);
};
