import React from "react";
import { Row, Col, Typography } from "antd";

interface Props {
  number: number;
  left: VerseText[];
  right: VerseText[];
  faved: boolean;
  noBottomBorder?: boolean;
}

const Verse: React.FC<Props> = ({ number, left, right, faved }) => {
  const split = left.length > 0 && right.length > 0;
  const leftColSpan = split && right.length > 0 ? 12 : 24;
  const rightColSpan = split && left.length > 0 ? 12 : 24;

  return (
    <Row gutter={24} className="mt-6 w-full">
      {left.length > 0 && (
        <Col span={leftColSpan}>
          <div className="flex gap-2">
            <div>{number})</div>
            <div className="flex-grow">
              {left.map((v) => (
                <div key={v.id}>
                  <Typography.Text>{v.text}</Typography.Text>
                </div>
              ))}
            </div>
          </div>
        </Col>
      )}
      {right.length > 0 && (
        <Col span={rightColSpan}>
          {right.map((v) => (
            <div key={v.id}>
              <Typography.Text>{v.text}</Typography.Text>
            </div>
          ))}
        </Col>
      )}
    </Row>
  );
};

export default Verse;
