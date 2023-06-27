"use client";

import React, { useEffect } from "react";
import { Affix, Button, Col, Row, Space, Typography } from "antd";
import lf from "localforage";
import { useBoolean } from "ahooks";
import Link from "next/link";

const CookieNotice: React.FC = () => {
  const [cookieDrawerOpen, { setTrue: openCookieDrawer, setFalse: closeCookieDrawer }] = useBoolean(false);
  useEffect(() => {
    lf.getItem("accepted_cookie_notice").then((accepted) => {
      if (!accepted) {
        openCookieDrawer();
      }
    });
  }, []);

  if (!cookieDrawerOpen) {
    return null;
  }

  return (
    <Affix offsetBottom={0} target={() => window}>
      <Row justify="space-around" align="middle" className="h-full bg-default p-6 shadow-md">
        <Col span={16} xs={22} sm={22} md={20} lg={16}>
          <Typography.Paragraph className="text-center text-lg">
            This website uses cookies. By continuing to use the website, you indicate that you are fine with this.
          </Typography.Paragraph>
          <Row justify="center">
            <Col>
              <Space>
                <Link href="/privacy">
                  <Button size="large">Privacy Policy</Button>
                </Link>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    lf.setItem("accepted_cookie_notice", true).then((value) => {
                      if (value) {
                        closeCookieDrawer();
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
