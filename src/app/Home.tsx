"use client";

import { useEffect, useState } from "react";
import { Card, Empty, Input, Typography } from "antd";
import { ArrowRightOutlined, HeartOutlined, SearchOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { searchChapters } from "@/utils/chapters";
import lf from "@/utils/localforage";

interface Props {
  chapters: Chapter[];
}

/** The home page: the chapter the reader left off at, and a searchable grid of every chapter */
const Home: React.FC<Props> = ({ chapters }) => {
  const t = useTranslations("common");
  const [query, setQuery] = useState("");
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  useEffect(() => {
    lf.getItem<LastRead>("last-read").then(setLastRead);
  }, []);

  const lastReadChapter = lastRead && chapters.find((c) => c.id === lastRead.chapter);
  const filteredChapters = searchChapters(chapters, query);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Typography.Title level={1} className="text-center">
        {t("al-quran")}
      </Typography.Title>
      {lastRead && lastReadChapter && (
        <Link href={`/chapters/${lastReadChapter.id}`} className="mb-6 block">
          <Card hoverable className="border-primary">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Typography.Text type="secondary" className="text-sm">
                  {t("continue-reading")}
                </Typography.Text>
                <Typography.Title level={2} className="text-xl m-0">
                  {t("continue-reading-verse", { name: lastReadChapter.name_simple, verse: lastRead.verse })}
                </Typography.Title>
              </div>
              <ArrowRightOutlined aria-hidden className="text-primary text-xl" />
            </div>
          </Card>
        </Link>
      )}
      <Link href="/saved" className="mb-6 inline-flex items-center gap-2">
        <HeartOutlined aria-hidden />
        {t("saved")}
      </Link>
      <Input
        allowClear
        size="large"
        className="mb-6"
        aria-label={t("search-chapters")}
        placeholder={t("search-chapters")}
        prefix={<SearchOutlined aria-hidden />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filteredChapters.length > 0 ? (
        <nav aria-label={t("chapters")}>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {filteredChapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  href={`/chapters/${chapter.id}`}
                  aria-label={t("chapter-name", {
                    id: chapter.id,
                    name: chapter.name_simple,
                    translation: chapter.translated_name.name,
                  })}
                  className="flex h-full items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-primary"
                >
                  <span className="verse-badge shrink-0">{chapter.id}</span>
                  <span className="min-w-0 grow">
                    <Typography.Text strong className="block capitalize">
                      {chapter.name_simple}
                    </Typography.Text>
                    <Typography.Text type="secondary" className="block truncate text-sm capitalize">
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

export default Home;
