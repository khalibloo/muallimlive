import React from "react";
import { NextPage } from "next";
import { Col, Row, Typography } from "antd";
import BasicLayout from "@/layouts/BasicLayout";

interface Props {}

const PrivacyPolicyPage: NextPage<Props> = () => {
  return (
    <BasicLayout pageTitle="Privacy Policy">
      <Row justify="center">
        <Col md={16}>
          <Typography.Title level={1} className="text-center">
            Privacy Policy
          </Typography.Title>
          <Typography.Paragraph>
            We do not store any data in our servers about your use of our service, however, we may use services such as
            analytics to analyze traffic to our website. This data is collected to help us improve our service and to
            focus our development efforts.
          </Typography.Paragraph>
          <Typography.Paragraph>
            We may also allow users to sync their personal data on their cloud storage such as OneDrive. This is to
            allow them to use our service seamlessly on multiple devices. This data does not pass through our servers at
            all. It is sent directly to the storage service. Please review their own privacy policy regarding this.
          </Typography.Paragraph>
          <Typography.Paragraph>
            We may also allow users to share our content with social media services. We keep no personally identifiable
            records of such activities.
          </Typography.Paragraph>
          <Typography.Paragraph>
            We strongly recommend that users under the age of 13 (or those considered to be children) be supervised in
            their use of our services by adults such as parents or teachers. This is to help them better understand our
            content and to prevent misinterpretations. This should be used as a supplementary learning resource for them
            rather than a replacement of their education by trained professionals on the subject matter.
          </Typography.Paragraph>
        </Col>
      </Row>
    </BasicLayout>
  );
};

export default PrivacyPolicyPage;
