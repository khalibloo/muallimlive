import { getChapters } from "@/utils/content";
import Home from "./Home";

const HomePage = async () => {
  const { chapters } = await getChapters();
  return <Home chapters={chapters} />;
};

export default HomePage;
