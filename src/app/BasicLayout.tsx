"use client";

import { Layout } from "antd";

import CookieNotice from "./CookieNotice";
import NavBar, { type SettingsResources } from "./NavBar";
import Footer from "./Footer";

interface Props {
  settingsResources: SettingsResources;
  children: React.ReactNode;
}

const BasicLayout: React.FC<Props> = ({ settingsResources, children }) => (
  <>
    <Layout className="min-h-screen">
      <Layout.Header className="w-full p-0 fixed z-10 shadow-md">
        <NavBar settingsResources={settingsResources} />
      </Layout.Header>
      <Layout.Content className="mt-16 py-12 flex flex-col">{children}</Layout.Content>
      <Layout.Footer className="bg-333">
        <Footer />
      </Layout.Footer>
    </Layout>
    <CookieNotice />
  </>
);

export default BasicLayout;
