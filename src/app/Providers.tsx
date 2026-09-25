"use client";

import { useEffect } from "react";
import { App, ConfigProvider } from "antd";

import SyncProvider from "@/components/SyncProvider";
import getTheme from "@/theme";

interface Props {
  colorScheme: ColorScheme;
  children: React.ReactNode;
}

const Providers: React.FC<Props> = ({ colorScheme, children }) => {
  // Signal to E2E tests that the client has hydrated and interactive controls are wired up
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  return (
    <ConfigProvider theme={getTheme(colorScheme)}>
      <App>
        <SyncProvider>{children}</SyncProvider>
      </App>
    </ConfigProvider>
  );
};

export default Providers;
