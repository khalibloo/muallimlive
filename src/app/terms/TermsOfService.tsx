"use client";

import React from "react";
import { Col, Row, Typography } from "antd";
import { useTranslations } from "next-intl";

const TermsOfService: React.FC = () => {
  const t = useTranslations("common");
  return (
    <Row justify="center">
      <Col md={16}>
        <Typography.Title level={1} className="text-center">
          {t("terms-of-service")}
        </Typography.Title>
        <Typography.Paragraph>{t("terms-intro")}</Typography.Paragraph>
        <Row>
          <Col span={22} offset={1}>
            <ul className="list-disc">
              <li>{t("terms-reasonable")}</li>
              <li>
                {t.rich("terms-inaccuracies", {
                  link: (chunks) => (
                    <a target="_blank" rel="noopener noreferrer" href="https://www.quran.com">
                      {chunks}
                    </a>
                  ),
                })}
              </li>
              <li>{t("terms-accuracy")}</li>
            </ul>
          </Col>
        </Row>
        <Typography.Paragraph>{t("terms-agreement")}</Typography.Paragraph>
        <Row>
          <Col span={22} offset={1}>
            <ul className="list-disc">
              <li>{t("terms-liability")}</li>
              <li>{t("terms-no-lawsuits")}</li>
              <li>{t("terms-honest-use")}</li>
              <li>{t("terms-no-hatred")}</li>
              <li>{t("terms-no-out-of-context")}</li>
              <li>{t("terms-under-13")}</li>
              <li>{t("terms-supplement")}</li>
              <li>{t("terms-updates")}</li>
            </ul>
          </Col>
        </Row>
        <Typography.Paragraph>{t("terms-have-fun")}</Typography.Paragraph>
      </Col>
    </Row>
  );
};

export default TermsOfService;
