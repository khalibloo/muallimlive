import React from "react";
import { Row, Col, Typography, List } from "antd";
import VisibilitySensor from "react-visibility-sensor";
import clx from "classnames";
import { useResponsive } from "ahooks";
import lf from "@/utils/localforage";

interface Props {
  verseNumber: number;
  chapterNumber: number;
  totalVerses: number;
  left: VerseText[];
  right: VerseText[];
  noBottomBorder?: boolean;
}

const Verse: React.FC<Props> = ({
  verseNumber,
  chapterNumber,
  totalVerses,
  left,
  right,
}) => {
  const responsive = useResponsive();
  const split = left.length > 0 && right.length > 0;
  const leftColSpan = split && right.length > 0 ? 12 : 24;
  const rightColSpan = split && left.length > 0 ? 12 : 24;

  return (
    <VisibilitySensor
      offset={{ top: 200, bottom: 200 }}
      partialVisibility
      onChange={(isVisible) => {
        const key = `progress-surah-${chapterNumber}`;

        if (window.scrollY < 200 || verseNumber === totalVerses) {
          lf.removeItem(key);
        } else if (isVisible) {
          lf.setItem(key, verseNumber);
        }
      }}
    >
      <Row
        gutter={24}
        id={`v-${verseNumber}`}
        className="mt-6 w-full items-stretch"
      >
        {left.length > 0 && (
          <Col
            span={leftColSpan}
            xs={24}
            md={leftColSpan}
            style={{
              borderRight:
                split && responsive.md ? "1px solid #666" : undefined,
            }}
          >
            <div className="flex gap-2">
              <div>{verseNumber})</div>
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
    </VisibilitySensor>
  );
};

export default Verse;
