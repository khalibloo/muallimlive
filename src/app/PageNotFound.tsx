"use client";

import { Button, Col, Row, Typography } from "antd";
import { useTranslations } from "next-intl";

const PageNotFound: React.FC = () => {
  const t = useTranslations("common");
  return (
    <Row justify="center">
      <Col md={16}>
        <Typography.Title level={1}>{t("page-not-found-heading")}</Typography.Title>
        <Typography.Paragraph>{t("page-not-found-message")}</Typography.Paragraph>
        <Row justify="space-around" align="middle" className="mt-12">
          <Button type="primary" href="/">
            {t("go-home")}
          </Button>
        </Row>
      </Col>
    </Row>
  );
};

export default PageNotFound;
