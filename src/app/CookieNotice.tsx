"use client";

import { useEffect } from "react";
import { Affix, Button, Col, Row, Space, Typography } from "antd";
import lf from "localforage";
import { useBoolean } from "ahooks";
import { useTranslations } from "next-intl";

export const COOKIE_NOTICE_KEY = "accepted_cookie_notice";

const CookieNotice: React.FC = () => {
  const t = useTranslations("common");
  const [cookieNoticeOpen, { setTrue: openCookieNotice, setFalse: closeCookieNotice }] = useBoolean(false);
  useEffect(() => {
    lf.getItem(COOKIE_NOTICE_KEY).then((accepted) => {
      if (!accepted) {
        openCookieNotice();
      }
    });
  }, []);

  if (!cookieNoticeOpen) {
    return null;
  }

  return (
    <Affix offsetBottom={0} target={() => window}>
      <Row
        justify="space-around"
        align="middle"
        className="h-full bg-surface-elevated border-t border-line p-6 shadow-md"
        role="region"
        aria-label={t("cookie-notice")}
      >
        <Col span={16} xs={22} sm={22} md={20} lg={16}>
          <Typography.Paragraph className="text-center text-lg">{t("cookie-notice-message")}</Typography.Paragraph>
          <Row justify="center">
            <Col>
              <Space>
                <Button href="/privacy" size="large">
                  {t("privacy-policy")}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    lf.setItem(COOKIE_NOTICE_KEY, true).then((value) => {
                      if (value) {
                        closeCookieNotice();
                      }
                    });
                  }}
                >
                  {t("accept-cookies")}
                </Button>
              </Space>
            </Col>
          </Row>
        </Col>
      </Row>
    </Affix>
  );
};

export default CookieNotice;
