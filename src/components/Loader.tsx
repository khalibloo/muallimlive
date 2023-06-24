import * as React from "react";
import { Row, Col, Spin } from "antd";
import _ from "lodash";
import { SpinProps } from "antd/lib/spin";

interface Props extends SpinProps {
  showRandomMessage?: boolean;
  // DO NOT USE. passed by dynamic import
  // declaring here just so we can remove them
  // and prevent them from being passed to div in DOM
  isLoading?: boolean;
  pastDelay?: any;
  timedOut?: boolean;
  retry?: any;
}
const Loader: React.FC<Props> = ({
  showRandomMessage,
  size,
  // strip dynamic import props
  isLoading,
  pastDelay,
  timedOut,
  retry,
  ...rest
}) => {
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
          tip={showRandomMessage ? messages[_.random(messages.length - 1)] : undefined}
        />
      </Col>
    </Row>
  );
};

export default Loader;
