import { Metadata, NextPage } from "next";
import PrivacyPolicy from "./PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy | Muallimlive",
  description: "Muallimlive privacy policy document.",
};

const PrivacyPolicyPage: NextPage = () => <PrivacyPolicy />;

export default PrivacyPolicyPage;
