import React from "react";
import { Typography } from "antd";
import { useTranslations } from "next-intl";

interface Props {
  chapter: Chapter;
}

/** The banner above a chapter's verses: its Arabic name, names, revelation place and verse count */
const ChapterHeader: React.FC<Props> = ({ chapter }) => {
  const t = useTranslations("common");

  return (
    <header className="mb-4 rounded-xl border border-line border-t-4 border-t-primary bg-surface px-6 py-8 text-center">
      <p lang="ar" dir="rtl" className="text-arabic text-primary text-5xl leading-relaxed m-0">
        {chapter.name_arabic}
      </p>
      <Typography.Title level={2} className="capitalize mt-2 mb-0">
        {chapter.name_simple}
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="capitalize m-0">
        {chapter.translated_name.name}
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" className="mt-2 mb-0">
        {t("chapter-details", { place: chapter.revelation_place, count: chapter.verses_count })}
      </Typography.Paragraph>
      {chapter.bismillah_pre && (
        <p lang="ar" dir="rtl" className="text-arabic text-verse-arabic-lg mt-6 mb-0">
          {t("bismillah")}
        </p>
      )}
    </header>
  );
};

export default ChapterHeader;
