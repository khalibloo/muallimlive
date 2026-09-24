"use client";

import { Row, Col, Card, Typography } from "antd";
import Link from "next/link";
import { useTranslations } from "next-intl";

const HomePage: React.FC = () => {
  const t = useTranslations("common");
  return (
    <Row justify="center" className="mt-16">
      <Col span={16} xs={22} sm={22} md={20} lg={16}>
        <Row justify="space-between" gutter={[24, 24]}>
          <Col span={8} xs={24} sm={24} md={12} lg={8}>
            <Link href="/chapters/1" className="block">
              <Card hoverable>
                <div className="h-20 text-center">
                  <Typography.Title level={2}>{t("al-quran")}</Typography.Title>
                </div>
              </Card>
            </Link>
          </Col>
          <Col span={8} xs={24} sm={24} md={12} lg={8}>
            <Card>
              <div className="h-20 text-center">
                <Typography.Title level={2}>{t("hadith")}</Typography.Title>
                <Typography.Text>{t("coming-soon")}</Typography.Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

export default HomePage;
