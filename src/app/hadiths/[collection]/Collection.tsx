"use client";

import { Breadcrumb, Typography } from "antd";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { groupBy } from "lodash-es";

import { LINK_CARD } from "@/components/linkCard";

const Collection: React.FC<{ collection: HadithResourceCollection }> = ({ collection }) => {
  const t = useTranslations("common");
  const renderBooks = (books: HadithResourceBook[]) => (
    <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
      {books.map((b) => (
        <li key={b.id}>
          <Link href={`/hadiths/${collection.id}/${b.id}`} className={`${LINK_CARD} flex h-full flex-col gap-1`}>
            <span className="font-semibold">{t("hadith-book-name", { id: b.id, name: b.name })}</span>
            <span className="text-secondary">{t("hadith-count", { count: b.hadithsCount })}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
  const hasVolumes = collection.books.some((b) => b.volume);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Breadcrumb items={[{ title: <Link href="/hadiths">{t("hadiths")}</Link> }, { title: collection.name }]} />
      <Typography.Title level={1}>{collection.name}</Typography.Title>
      {hasVolumes
        ? Object.entries(groupBy(collection.books, "volume")).map(([volume, books]) => (
            <section key={volume} aria-labelledby={`volume-${volume}`} className="mb-8">
              <Typography.Title level={2} id={`volume-${volume}`} className="text-xl">
                {t("hadith-volume", { volume })}
              </Typography.Title>
              {renderBooks(books)}
            </section>
          ))
        : renderBooks(collection.books)}
    </div>
  );
};

export default Collection;
