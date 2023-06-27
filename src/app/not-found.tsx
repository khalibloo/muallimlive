import { Metadata, NextPage } from "next";
import PageNotFound from "./PageNotFound";

export const metadata: Metadata = {
  title: "Page Not Found | Muallimlive",
  description: "Al-Qur'an reading app",
};

const NotFoundPage: NextPage = () => <PageNotFound />;

export default NotFoundPage;
