"use client";

import React from "react";
import { Button, Col, Row, Typography } from "antd";
import Link from "next/link";

const PageNotFound: React.FC = () => (
  <Row justify="center">
    <Col md={16}>
      <Typography.Title level={1}>Uh-oh, Page not found!</Typography.Title>
      <Typography.Paragraph>
        Sorry, we could not find the page you're looking for. It may have been moved or you visited an invalid link.
      </Typography.Paragraph>
      <Row justify="space-around" align="middle" className="mt-12">
        <Link href="/">
          <Button type="primary">Go Back To Home</Button>
        </Link>
      </Row>
    </Col>
  </Row>
);

export default PageNotFound;
