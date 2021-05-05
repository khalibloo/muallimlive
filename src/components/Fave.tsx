import React from "react";
import { Button, Tooltip } from "antd";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";

interface Props {
  faved: boolean;
  chapterNumber: number;
  verseNumber: number;
}
const Fave: React.FC<Props> = ({ faved, chapterNumber, verseNumber }) => (
  <Tooltip
    title={faved ? "Remove from favorites" : "Add to favorites - coming soon"}
  >
    <Button type="text" onClick={() => {}}>
      {faved ? <HeartFilled style={{ color: "#c22" }} /> : <HeartOutlined />}
    </Button>
  </Tooltip>
);

export default Fave;
