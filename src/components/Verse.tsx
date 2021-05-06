import React from "react";
import { Row, Col, Typography, List } from "antd";
import clx from "classnames";
import { useResponsive } from "ahooks";

interface Props {
  number: number;
  left: VerseText[];
  right: VerseText[];
  noBottomBorder?: boolean;
}

const Verse: React.FC<Props> = ({ number, left, right }) => {
  const responsive = useResponsive();
  const split = left.length > 0 && right.length > 0;
  const leftColSpan = split && right.length > 0 ? 12 : 24;
  const rightColSpan = split && left.length > 0 ? 12 : 24;

  return (
    <Row gutter={24} className="mt-6 w-full items-stretch">
      {left.length > 0 && (
        <Col
          span={leftColSpan}
          xs={24}
          md={leftColSpan}
          style={{
            borderRight: split && responsive.md ? "1px solid #666" : undefined,
          }}
        >
          <div className="flex gap-2">
            <div>{number})</div>
            <div className="flex-grow">
              <List
                dataSource={left}
                renderItem={(v) => (
                  <List.Item key={v.id}>
                    <div>
                      {v.isHTML ? (
                        <div
                          className="font-light"
                          dangerouslySetInnerHTML={{ __html: v.text }}
                        />
                      ) : (
                        <Typography.Text
                          className={clx({ "text-lg": v.isBold })}
                          strong={v.isBold}
                        >
                          {v.text}
                        </Typography.Text>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </div>
        </Col>
      )}
      {right.length > 0 && (
        <Col span={rightColSpan} xs={24} md={rightColSpan}>
          <List
            dataSource={right}
            renderItem={(v) => (
              <List.Item key={v.id}>
                <div>
                  {v.isHTML ? (
                    <div
                      className="font-light"
                      dangerouslySetInnerHTML={{ __html: v.text }}
                    />
                  ) : (
                    <Typography.Text
                      className={clx({ "text-lg": v.isBold })}
                      strong={v.isBold}
                    >
                      {v.text}
                    </Typography.Text>
                  )}
                </div>
              </List.Item>
            )}
          />
        </Col>
      )}
    </Row>
  );
};

export default Verse;
