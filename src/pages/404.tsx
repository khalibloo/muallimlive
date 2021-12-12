import React from "react";
import { NextPage } from "next";
import { Button, Col, Row, Typography } from "antd";
import BasicLayout from "@/layouts/BasicLayout";
import Link from "next/link";

interface Props {}

const PageNotFound: NextPage<Props> = () => {
  return (
    <BasicLayout pageTitle="Terms Of Service">
      <Row justify="center">
        <Col md={16}>
          <Typography.Title level={1}>Uh-oh, Page not found!</Typography.Title>
          <Typography.Paragraph>
            Sorry, we could not find the page you're looking for. It may have
            been moved or you visited an invalid link.
          </Typography.Paragraph>
          <Row
            justify="space-around"
            align="middle"
            style={{ marginTop: "50px" }}
          >
            <Link href="/">
              <Button type="primary">Go Back To Home</Button>
            </Link>
          </Row>
        </Col>
      </Row>
    </BasicLayout>
  );
};

export default PageNotFound;
