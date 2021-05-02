import React from "react";
import { NextPage } from "next";
import { Card, Col, Input, Row, Typography } from "antd";
import { connect } from "react-redux";
import { RootState } from "@/utils/store";

import usePosts from "@/queries/usePosts";
import BasicLayout from "@/layouts/BasicLayout";
import Loader from "@/components/Loader";
import Link from "next/link";

interface Props {
  authenticated: RootState["auth"]["authenticated"];
}
const mapState = (state: RootState) => ({
  authenticated: state.auth.authenticated,
});

// const mapDispatch = (dispatch: Dispatch) => ({
//     increment: () => dispatch.auth.increment(1),
//     incrementAsync: () => dispatch.auth.incrementAsync(1),
// })
const Home: NextPage<Props> = ({ authenticated }) => {
  const { data, isError, isLoading } = usePosts();

  if (isLoading) {
    return (
      <BasicLayout pageTitle="Privacy Policy">
        <Loader showRandomMessage />
      </BasicLayout>
    );
  }

  return (
    <BasicLayout pageTitle="Home">
      {/* <Row justify="center" className="mb-9">
        <Col span={16}>
          <Input.Search className="w-full" size="large" />
        </Col>
      </Row> */}
      <Row justify="center" className="mt-16">
        <Col span={16}>
          <Row justify="space-between">
            <Col span={8}>
              <Link href="/chapters/1">
                <Card hoverable>
                  <div className="h-20 text-center">
                    <Typography.Title level={2}>Al-Qur'an</Typography.Title>
                  </div>
                </Card>
              </Link>
            </Col>
            <Col span={8}>
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
    </BasicLayout>
  );
};

export default connect(mapState)(Home);
