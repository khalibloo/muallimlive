"use client";

import { useEffect, useState } from "react";
import { Card, Typography } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { chapterPath } from "@/utils/chapters";
import lf from "@/utils/localforage";

interface Props {
  chapters: Chapter[];
}

/** Links to the chapter the reader left off at, once they've read one */
const ContinueReading: React.FC<Props> = ({ chapters }) => {
  const t = useTranslations("common");
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  useEffect(() => {
    lf.getItem<LastRead>("last-read").then(setLastRead);
  }, []);

  const chapter = lastRead && chapters.find((c) => c.id === lastRead.chapter);
  if (!lastRead || !chapter) {
    return null;
  }

  return (
    <Link href={chapterPath(chapter.id)} className="mb-6 block">
      <Card hoverable className="border-primary">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Typography.Text type="secondary">{t("continue-reading")}</Typography.Text>
            <Typography.Title level={2} className="text-xl m-0">
              {t("continue-reading-verse", { name: chapter.name_simple, verse: lastRead.verse })}
            </Typography.Title>
          </div>
          <ArrowRightOutlined aria-hidden className="text-primary text-xl" />
        </div>
      </Card>
    </Link>
  );
};

export default ContinueReading;
