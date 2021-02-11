import { createModel } from "@rematch/core";
import { RootModel } from "./index";

type QuestionType = "true-false" | "other-value";
type Question = {
  title: string;
};

interface AuthState {
  authenticated: boolean;
  role: "guest" | "user" | "tutor" | "admin" | "superadmin";
  questions: Array<Question>;
  questionType: QuestionType;
}

export const auth = createModel<RootModel>()({
  state: {
    authenticated: false,
    role: "guest",
    questions: [],
    questionType: "true-false",
  } as AuthState,
  selectors: (slice, createSelector, hasProps) => ({}),
  reducers: {
    setAuthenticated(state, { role }) {
      state.role = role;
      state.authenticated = role !== "guest";
      return state;
    },
  },
  effects: (dispatch) => ({
    // handle state changes with impure functions.
    // use async/await for async actions
    async incrementAsync(payload: number, state) {
      console.log("This is current root state", state);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      dispatch.count.increment(payload);
    },
  }),
});
