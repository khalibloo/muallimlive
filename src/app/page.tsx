"use client";

import { Row, Col, Card, Typography } from "antd";
import { NextPage } from "next";
import Link from "next/link";

const HomePage: NextPage = () => (
  <>
    {/* <Row justify="center" className="mb-9">
        <Col span={16}>
          <Input.Search className="w-full" size="large" />
        </Col>
      </Row> */}
    <Row justify="center" className="mt-16">
      <Col span={16} xs={22} sm={22} md={20} lg={16}>
        <Row justify="space-between" gutter={[24, 24]}>
          <Col span={8} xs={24} sm={24} md={12} lg={8}>
            <Link href="/chapters/1">
              <Card hoverable>
                <div className="h-20 text-center">
                  <Typography.Title level={2}>Al-Qur'an</Typography.Title>
                </div>
              </Card>
            </Link>
          </Col>
          <Col span={8} xs={24} sm={24} md={12} lg={8}>
            <Card hoverable>
              <div className="h-20 text-center">
                <Typography.Title level={2}>Hadith</Typography.Title>
                <Typography.Text>Coming Soon</Typography.Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  </>
);

export default HomePage;
