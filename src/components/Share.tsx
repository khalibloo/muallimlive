import React from "react";
import { App, Button, Tooltip } from "antd";
import { ShareAltOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

interface Props {
  /** The page's path, with a verse's hash */
  path: string;
  title: string;
  /** The button's label, e.g. "Share verse" */
  label: string;
}

const Share: React.FC<Props> = ({ path, title, label }) => {
  const t = useTranslations("common");
  const { message } = App.useApp();

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        // the reader closed the share sheet
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          message.error(t("share-failed"));
        }
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      message.success(t("link-copied"));
    } catch {
      message.error(t("share-failed"));
    }
  };

  return (
    <Tooltip title={label}>
      <Button type="text" aria-label={label} onClick={share}>
        <ShareAltOutlined aria-hidden />
      </Button>
    </Tooltip>
  );
};

export default Share;
