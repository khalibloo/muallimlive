import React from "react";
import { Button, Tooltip } from "antd";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { setFave } from "@/utils/userData";

interface Props {
  faved: boolean;
  itemKey: string;
}

const Fave: React.FC<Props> = ({ faved, itemKey }) => {
  const t = useTranslations("common");
  const label = faved ? t("remove-from-favorites") : t("add-to-favorites");
  return (
    <Tooltip title={label}>
      <Button type="text" aria-label={label} aria-pressed={faved} onClick={() => setFave(itemKey, !faved)}>
        {faved ? <HeartFilled aria-hidden style={{ color: "#c22" }} /> : <HeartOutlined aria-hidden />}
      </Button>
    </Tooltip>
  );
};

export default Fave;
