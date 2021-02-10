import { useQuery } from "react-query";
import axios from "@/utils/request";

interface Post {
  id: string;
  body: string;
  title: string;
}
const getPostById = async (postId) => {
  const { data } = await axios.get(
    `https://jsonplaceholder.typicode.com/posts/${postId}`,
  );
  return data;
};

export default function usePost(postId) {
  return useQuery<Post, Error>(["post", postId], () => getPostById(postId));
}
