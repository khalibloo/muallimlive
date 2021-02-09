import { createModel } from "@rematch/core";
import { RootModel } from "./index";

type QuestionType = "true-false" | "other-value";
type Question = {
  title: string;
};

interface CountState {
  questions: Array<Question>;
  questionType: QuestionType;
}

export const count = createModel<RootModel>()({
  state: {
    questions: [],
    questionType: "true-false",
  } as CountState, // typed complex state
  reducers: {
    // handle state changes with pure functions
    increment(state, payload: number) {
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
