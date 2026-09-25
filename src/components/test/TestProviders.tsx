import { App, ConfigProvider } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { NextIntlClientProvider } from "next-intl";

import getTheme from "@/theme";
import messages from "@/locales/en/common.json";

interface Props {
  translations?: any;
  children: React.ReactNode;
}

/** Defaults to the real English catalogue so tests assert the exact user-facing strings */
const TestProviders: React.FC<Props> = ({ children, translations = messages }) => (
  <NextIntlClientProvider locale="en" messages={translations} timeZone="UTC">
    <ConfigProvider theme={getTheme("dark")}>
      <StyleProvider>
        <App>{children}</App>
      </StyleProvider>
    </ConfigProvider>
  </NextIntlClientProvider>
);

export default TestProviders;
