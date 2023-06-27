"use client";

import { ConfigProvider, theme } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/utils/request";

interface Props {
  children: React.ReactNode;
}

const Providers: React.FC<Props> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#43A047",
          fontSize: 16,
          colorBgBase: "#444",
          colorBgElevated: "#333",
          colorLink: "#43A047",
          colorLinkHover: "#43A047",
          borderRadius: 4,
          colorBorder: "#666",
        },
        components: {
          Button: { colorBgContainer: "#111" },
          Input: { colorBgContainer: "#111" },
          Layout: {
            colorBgHeader: "#333",
            colorBgBody: "#444",
            colorBgLayout: "#444",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  </QueryClientProvider>
);

export default Providers;
