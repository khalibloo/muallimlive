import React from "react";
import { App, Button, Tooltip } from "antd";
import { ShareAltOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

interface Props {
  chapterNumber: number;
  chapterName: string;
  verseNumber: number;
}

const Share: React.FC<Props> = ({ chapterNumber, chapterName, verseNumber }) => {
  const t = useTranslations("common");
  const { message } = App.useApp();

  const share = async () => {
    const url = `${window.location.origin}/chapters/${chapterNumber}#v-${verseNumber}`;
    const title = t("share-verse-title", { name: chapterName, verse: verseNumber });
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
    <Tooltip title={t("share-verse")}>
      <Button type="text" aria-label={t("share-verse")} onClick={share}>
        <ShareAltOutlined aria-hidden />
      </Button>
    </Tooltip>
  );
};

export default Share;
