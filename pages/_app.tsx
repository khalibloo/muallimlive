import React from "react";
import { AppProps } from "next/app";

import "antd/dist/antd.less";
import "@/styles/globals.css";

const App: React.FC<AppProps> = ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};

export default App;
