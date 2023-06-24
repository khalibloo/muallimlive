import React from "react";
import { NextPage } from "next";
import { Col, Row, Typography } from "antd";
import BasicLayout from "@/app/BasicLayout";

interface Props {}

const TermsOfServicePage: NextPage<Props> = () => {
  return (
    <BasicLayout pageTitle="Terms Of Service">
      <Row justify="center">
        <Col md={16}>
          <Typography.Title level={1} className="text-center">
            Terms Of Service
          </Typography.Title>
          <Typography.Paragraph>
            Our terms are pretty straight forward. But before we dig in, there are some points we should make clear.
          </Typography.Paragraph>
          <Row>
            <Col span={22} offset={1}>
              <ul className="list-disc">
                <li>We assume all parties to this agreement are reasonable and understanding.</li>
                <li>
                  We've worked hard on this for the sole interest of making knowledge comfortably accessible all. So
                  please if you find any inaccuracies or grievances in our work, be reasonable about it and notify us.
                  Our data is graciously provided by{" "}
                  <a target="_blank" rel="noopener noreferrer" href="https://www.quran.com">
                    https://www.quran.com
                  </a>{" "}
                  so you can opt to notify them instead.
                </li>
                <li>
                  We try our best to ensure the accuracy of our content, but we make no claims or guarantees. We're not
                  perfect and neither is our work.
                </li>
              </ul>
            </Col>
          </Row>
          <Typography.Paragraph>By using our services, you agree to the following terms.</Typography.Paragraph>
          <Row>
            <Col span={22} offset={1}>
              <ul className="list-disc">
                <li>
                  We are not liable to any damage or harm that may come to you, anyone or your device as a result of
                  using our service.
                </li>
                <li>
                  We made this service in the spirit of openness, freedom and enlightenment. You cannot sue us over this
                  service or related products.
                </li>
                <li>
                  You'll use our service solely to learn, study or teach without any distortions or other agendas. You
                  will use it in honesty and truth.
                </li>
                <li>
                  You will not use our service to incite hatred or violence toward any human, alien, animal or other
                  creature.
                </li>
                <li>You will also not quote any content out of context.</li>
                <li>
                  If you're under the age of 13, we strongly recommend seeking adult supervision and knowledge where
                  possible. While our content is open to all, we understand that cultural differences also play a role
                  in its interpretation.
                </li>
                <li>
                  This should not substitute an actual education by professionals on the subject matter, but should
                  supplement it instead.
                </li>
                <li>
                  We may update our terms of service and/or privacy policy without your prior notice or consent, so you
                  will check these regularly. If at any point you disagree with any of the terms, you will immediately
                  stop using our service.
                </li>
              </ul>
            </Col>
          </Row>
          <Typography.Paragraph>Have fun!</Typography.Paragraph>
        </Col>
      </Row>
    </BasicLayout>
  );
};

export default TermsOfServicePage;
