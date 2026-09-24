"use client";

import { useEffect } from "react";
import { Affix, Button, Col, Row, Space, Typography } from "antd";
import lf from "localforage";
import { useBoolean } from "ahooks";

export const COOKIE_NOTICE_KEY = "accepted_cookie_notice";

const CookieNotice: React.FC = () => {
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
        className="h-full bg-default p-6 shadow-md"
        role="region"
        aria-label="Cookie notice"
      >
        <Col span={16} xs={22} sm={22} md={20} lg={16}>
          <Typography.Paragraph className="text-center text-lg">
            This website uses cookies. By continuing to use the website, you indicate that you are fine with this.
          </Typography.Paragraph>
          <Row justify="center">
            <Col>
              <Space>
                <Button href="/privacy" size="large">
                  Privacy Policy
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
                  Accept Cookies
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
