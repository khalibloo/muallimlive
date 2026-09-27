"use client";

import { useState } from "react";
import { Breadcrumb, Button, Empty, Input, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useSearchModal } from "@/components/ChapterSearchContext";
import { filterHadiths, hadithPath } from "@/utils/hadithPack";

interface Props {
  collection: HadithResourceCollection;
  book: HadithResourceBook;
  hadiths: HadithIndexEntry[];
}

const Book: React.FC<Props> = ({ collection, book, hadiths }) => {
  const t = useTranslations("common");
  const { openSearch } = useSearchModal();
  const [query, setQuery] = useState("");
  const shown = filterHadiths(hadiths, query);
  const title = t("hadith-book-name", { id: book.id, name: book.name });
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Breadcrumb
        items={[
          { title: <Link href="/hadiths">{t("hadiths")}</Link> },
          { title: <Link href={`/hadiths/${collection.id}`}>{collection.name}</Link> },
          { title },
        ]}
      />
      <Typography.Title level={1}>{title}</Typography.Title>
      <div className="mb-6 flex flex-wrap gap-4">
        <Input
          allowClear
          type="search"
          className="flex-1"
          aria-label={t("filter-hadiths")}
          placeholder={t("filter-hadiths")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button icon={<SearchOutlined aria-hidden />} onClick={() => openSearch("hadith")}>
          {t("search-this-book")}
        </Button>
      </div>
      {shown.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("no-hadiths-found")} />
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {shown.map((h) => (
            <li key={h.id}>
              <Link
                href={hadithPath({ collection: collection.id, book: book.id, id: h.id })}
                className="flex gap-4 py-4"
              >
                <span className="verse-badge shrink-0">{h.id}</span>{" "}
                <span className="flex flex-col gap-1">
                  {h.narrator && <span className="font-semibold">{h.narrator}</span>}
                  <span className="text-primary">
                    {h.excerpt}
                    {h.truncated && t("ellipsis")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Book;
