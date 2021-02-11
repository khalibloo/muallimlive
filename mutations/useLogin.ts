import { useMutation } from "react-query";
import _ from "lodash";
import axios from "@/utils/request";
import { store } from "@/utils/store";

interface LoginParams {
  username: string;
  password: string;
}
interface LoginInput extends LoginParams {
  remember: boolean;
}
interface LoginResponse {
  key: string;
}
const login = async (input: LoginParams) => {
  const { data } = await axios.post("/rest-auth/login/", input);
  return data;
};

export default function useLogin() {
  return useMutation<LoginResponse, Error, LoginInput>(
    (input) => login(_.pick(input, ["username", "password"])),
    {
      onSuccess: (data, input) => {
        const storage = input.remember ? localStorage : sessionStorage;
        storage.setItem("jwt", data.key);
        axios.defaults.headers["Authorization"] = `Token ${data.key}`;
        store.dispatch({
          type: "auth/setAuthenticated",
          payload: { role: "user" },
        });
      },
    },
  );
}
