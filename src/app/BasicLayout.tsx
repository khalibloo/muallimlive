"use client";
import { Layout } from "antd";
import clsx from "clsx";

import CookieNotice from "@/app/CookieNotice";
import NavBar from "./NavBar";
import Footer from "./Footer";

interface Props {
  noPadding?: boolean;
  children: React.ReactNode;
}

const BasicLayout: React.FC<Props> = ({ children, noPadding }) => {
  return (
    <>
      <Layout className="min-h-screen">
        <Layout.Header className={clsx("w-full p-0 fixed z-10 shadow-md")}>
          <NavBar />
        </Layout.Header>
        <Layout.Content className={clsx("mt-16 flex flex-col", { "py-12": !noPadding })}>{children}</Layout.Content>
        <Layout.Footer className="bg-333">
          <Footer />
        </Layout.Footer>
      </Layout>
      <CookieNotice />
    </>
  );
};

export default BasicLayout;
