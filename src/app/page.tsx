import { NextPage } from "next";

import { getChapters } from "@/utils/content";
import { getHadithResources } from "@/utils/hadiths";
import Dashboard from "./Dashboard";

const DashboardPage: NextPage = async () => {
  const [{ chapters }, { collections }] = await Promise.all([getChapters(), getHadithResources()]);
  return <Dashboard chapters={chapters} collections={collections} />;
};

export default DashboardPage;
