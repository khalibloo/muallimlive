"use client";

import { useEffect } from "react";
import { App, ConfigProvider } from "antd";

import theme from "@/theme";

interface Props {
  children: React.ReactNode;
}

const Providers: React.FC<Props> = ({ children }) => {
  // Signal to E2E tests that the client has hydrated and interactive controls are wired up
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  return (
    <ConfigProvider theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
};

export default Providers;
