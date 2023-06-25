import { Metadata, NextPage } from "next";
import TermsOfService from "./TermsOfService";

export const metadata: Metadata = {
  title: "Terms of Service | Muallimlive",
  description: "Muallimlive terms of service document.",
};

const TermsPage: NextPage = () => <TermsOfService />;

export default TermsPage;
