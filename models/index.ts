import { Models } from "@rematch/core";
import { count } from "./auth";

export interface RootModel extends Models<RootModel> {
  count: typeof count;
}

export const models: RootModel = { count };
