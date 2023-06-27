import React from "react";
import { Row, Col, Spin, SpinProps } from "antd";
import { random } from "lodash";

interface Props extends SpinProps {
  showRandomMessage?: boolean;
}

const Loader: React.FC<Props> = ({ showRandomMessage, size, ...rest }) => {
  const messages = [
    "Looking in your bookshelf...",
    "Sending the bookworms packing...",
    "Dusting your reading table...",
    "Fetching your reading glasses...",
    "Lifting heavy books...",
    "Unfolding ancient scrolls...",
    "Blowing on your tea...",
    "Turning on your reading lamp...",
    "Cracking knuckles...",
    "Rubbing hands together...",
    "Clearing throat...",
  ];
  return (
    <Row justify="center" align="middle" className="h-full flex-grow">
      <Col>
        <Spin
          {...rest}
          size={size || "large"}
          tip={showRandomMessage ? messages[random(messages.length - 1)] : undefined}
        />
      </Col>
    </Row>
  );
};

export default Loader;
