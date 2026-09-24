import React from "react";
import { Button, Tooltip } from "antd";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import lf from "@/utils/localforage";

interface Props {
  faved: boolean;
  chapterNumber: number;
  verseNumber: number;
}

const Fave: React.FC<Props> = ({ faved, chapterNumber, verseNumber }) => {
  const t = useTranslations("common");
  const label = faved ? t("remove-from-favorites") : t("add-to-favorites");
  return (
    <Tooltip title={label}>
      <Button
        type="text"
        aria-label={label}
        aria-pressed={faved}
        onClick={() => {
          const key = "faves-quran";
          lf.ready().then(() => {
            lf.getItem<string[]>(key).then((faves) => {
              const verseKey = `${chapterNumber}:${verseNumber}`;
              const favesIsValid = typeof faves?.length === "number";
              let newFaves: string[] = [];
              if (faved) {
                if (favesIsValid) {
                  newFaves = faves.filter((v) => v !== verseKey);
                }
              } else if (favesIsValid) {
                newFaves = [...faves, verseKey];
              } else {
                newFaves = [verseKey];
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
};

export default Fave;
