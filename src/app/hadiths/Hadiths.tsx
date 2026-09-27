"use client";

import { Button, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LINK_CARD } from "@/app/Home";
import { useSearchModal } from "@/components/ChapterSearchContext";

const Hadiths: React.FC<{ collections: HadithResourceCollection[] }> = ({ collections }) => {
  const t = useTranslations("common");
  const { openSearch } = useSearchModal();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Typography.Title level={1} className="text-center">
        {t("hadiths")}
      </Typography.Title>
      <Button
        block
        size="large"
        icon={<SearchOutlined aria-hidden />}
        onClick={() => openSearch("hadith")}
        className="mb-8"
      >
        {t("search-hadiths")}
      </Button>
      <nav aria-label={t("hadith-collections")}>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {collections.map((c) => (
            <li key={c.id}>
              <Link href={`/hadiths/${c.id}`} className={`${LINK_CARD} flex h-full flex-col gap-1`}>
                <span className="font-semibold text-primary">{c.name}</span>
                <span className="text-secondary">
                  {t("hadith-counts", { books: c.booksCount, hadiths: c.hadithsCount })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Hadiths;
