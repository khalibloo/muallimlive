"use client";

import React from "react";
import { Col, Row, Typography } from "antd";
import { useTranslations } from "next-intl";

const PrivacyPolicy: React.FC = () => {
  const t = useTranslations("common");
  return (
    <Row justify="center">
      <Col md={16}>
        <Typography.Title level={1} className="text-center">
          {t("privacy-policy")}
        </Typography.Title>
        <Typography.Paragraph>{t("privacy-policy-analytics")}</Typography.Paragraph>
        <Typography.Paragraph>{t("privacy-policy-sync")}</Typography.Paragraph>
        <Typography.Paragraph>{t("privacy-policy-sharing")}</Typography.Paragraph>
        <Typography.Paragraph>{t("privacy-policy-children")}</Typography.Paragraph>
      </Col>
    </Row>
  );
};

export default PrivacyPolicy;
