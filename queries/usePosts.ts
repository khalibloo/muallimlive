import { useQuery } from "react-query";
import axios from "@/utils/request";

interface Post {
  id: string;
  body: string;
  title: string;
}
const getPosts = async () => {
  const { data } = await axios.get(
    "https://jsonplaceholder.typicode.com/posts",
  );
  return data;
};

export default function usePosts() {
  return useQuery<Post[], Error>("posts", getPosts);
}
