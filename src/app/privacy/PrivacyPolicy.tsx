"use client";

import React from "react";
import { Typography } from "antd";
import { useTranslations } from "next-intl";

const PrivacyPolicy: React.FC = () => {
  const t = useTranslations("common");
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Typography.Title level={1} className="text-center">
        {t("privacy-policy")}
      </Typography.Title>
      <Typography.Paragraph>{t("privacy-policy-analytics")}</Typography.Paragraph>
      <Typography.Paragraph>{t("privacy-policy-sync")}</Typography.Paragraph>
      <Typography.Paragraph>{t("privacy-policy-sharing")}</Typography.Paragraph>
      <Typography.Paragraph>{t("privacy-policy-children")}</Typography.Paragraph>
    </div>
  );
};

export default PrivacyPolicy;
