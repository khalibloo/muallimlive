"use client";

import { Typography } from "antd";
import { HeartOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

import ContinueReading from "@/components/ContinueReading";
import { LINK_CARD } from "@/components/linkCard";

interface Props {
  chapters: Chapter[];
  collections: HadithResourceCollection[];
}

/** The home page: a card per module, the chapter the reader left off at, and their favorites and notes */
const Dashboard: React.FC<Props> = ({ chapters, collections }) => {
  const t = useTranslations("common");
  const hadiths = collections.reduce((sum, c) => sum + c.hadithsCount, 0);
  const modules = [
    {
      href: "/quran",
      name: t("quran"),
      description: t("dashboard-quran-description"),
      summary: t("chapter-count", { count: chapters.length }),
    },
    {
      href: "/hadiths",
      name: t("hadith"),
      description: t("dashboard-hadith-description"),
      summary: t("collection-counts", { collections: collections.length, hadiths }),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Typography.Title level={1} className="text-center">
        {t("app-name")}
      </Typography.Title>
      <nav aria-label={t("modules")} className="mb-6">
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {modules.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className={`${LINK_CARD} flex h-full flex-col gap-1`}>
                <span className="text-xl font-semibold text-primary">{m.name}</span>
                <span>{m.description}</span>
                <span className="text-secondary">{m.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ContinueReading chapters={chapters} />
      <Link href="/saved" className={`${LINK_CARD} flex items-center gap-2`}>
        <HeartOutlined aria-hidden className="text-primary" />
        {t("saved")}
      </Link>
    </div>
  );
};

export default Dashboard;
