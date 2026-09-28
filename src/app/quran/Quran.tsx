"use client";

import { useState } from "react";
import { Button, Empty, Input, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useSearchModal } from "@/components/ChapterSearchContext";
import ContinueReading from "@/components/ContinueReading";
import { LINK_CARD } from "@/components/linkCard";
import { chapterPath, searchChapters } from "@/utils/chapters";

interface Props {
  chapters: Chapter[];
}

/** The Qur'an page: the verse search, the chapter the reader left off at, and a filterable grid of every chapter */
const Quran: React.FC<Props> = ({ chapters }) => {
  const t = useTranslations("common");
  const { openSearch } = useSearchModal();
  const [query, setQuery] = useState("");

  const filteredChapters = searchChapters(chapters, query);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Typography.Title level={1} className="text-center">
        {t("al-quran")}
      </Typography.Title>
      <Button
        block
        size="large"
        icon={<SearchOutlined aria-hidden />}
        className="mb-6"
        onClick={() => openSearch("quran")}
      >
        {t("search-quran")}
      </Button>
      <ContinueReading chapters={chapters} />
      <label htmlFor="find-chapter" className="mb-2 block">
        <Typography.Text strong>{t("find-chapter")}</Typography.Text>
      </label>
      <Input
        id="find-chapter"
        allowClear
        size="large"
        className="mb-6"
        placeholder={t("find-chapter-placeholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filteredChapters.length > 0 ? (
        <nav aria-label={t("chapters")}>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {filteredChapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  href={chapterPath(chapter.id)}
                  aria-label={t("chapter-name", {
                    id: chapter.id,
                    name: chapter.name_simple,
                    translation: chapter.translated_name.name,
                  })}
                  className={`${LINK_CARD} flex h-full items-center gap-4`}
                >
                  <span className="verse-badge shrink-0">{chapter.id}</span>
                  <span className="min-w-0 grow">
                    <Typography.Text strong className="block capitalize">
                      {chapter.name_simple}
                    </Typography.Text>
                    <Typography.Text type="secondary" className="block truncate capitalize">
                      {chapter.translated_name.name}
                    </Typography.Text>
                  </span>
                  <span lang="ar" dir="rtl" className="text-arabic text-primary shrink-0 text-2xl">
                    {chapter.name_arabic}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("no-chapters-found")} />
      )}
    </div>
  );
};

export default Quran;
