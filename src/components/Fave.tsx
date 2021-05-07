import React from "react";
import { Button, Tooltip } from "antd";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";
import lf from "@/utils/localforage";

interface Props {
  faved: boolean;
  chapterNumber: number;
  verseNumber: number;
}
const Fave: React.FC<Props> = ({ faved, chapterNumber, verseNumber }) => (
  <Tooltip title={faved ? "Remove from favorites" : "Add to favorites"}>
    <Button
      type="text"
      onClick={() => {
        const key = "faves-quran";
        lf.ready().then(() => {
          lf.getItem(key).then((faves) => {
            // if verse currently faved, we should unfave
            const verseKey = `${chapterNumber}:${verseNumber}`;
            const favesIsValid = typeof faves?.length === "number";
            let newFaves: string[] = [];
            if (faved) {
              if (favesIsValid) {
                newFaves = faves.filter((v) => v !== verseKey);
              }
            } else {
              if (favesIsValid) {
                newFaves = [...faves, verseKey];
              } else {
                newFaves = [verseKey];
              }
            }
            lf.setItem(key, newFaves);
          });
        });
      }}
    >
      {faved ? <HeartFilled style={{ color: "#c22" }} /> : <HeartOutlined />}
    </Button>
  </Tooltip>
);

export default Fave;
