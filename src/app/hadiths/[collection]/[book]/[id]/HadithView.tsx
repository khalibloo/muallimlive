"use client";

import { useEffect, useState } from "react";
import { Breadcrumb, Button, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

import Fave from "@/components/Fave";
import Notes from "@/components/Notes";
import Share from "@/components/Share";
import useHadithReference from "@/components/useHadithReference";
import { formatHadithText, hadithPath, type HadithPosition } from "@/utils/hadithPack";
import lf from "@/utils/localforage";
import { HADITH_FAVES_KEY, hadithKey, liveFaves, readFaves } from "@/utils/userData";

interface Props {
  hadith: Hadith;
  previous?: HadithPosition;
  next?: HadithPosition;
}

const HadithView: React.FC<Props> = ({ hadith, previous, next }) => {
  const t = useTranslations("common");
  const reference = useHadithReference()(hadith);
  const itemKey = hadithKey(hadith);
  const [faved, setFaved] = useState(false);
  const label = t("hadith-label", { collection: hadith.collectionName, reference });

  useEffect(() => {
    let subscription: Subscription | undefined;
    let cancelled = false;
    lf.ready().then(() => {
      if (cancelled) {
        return;
      }
      readFaves().then((faves) => {
        if (!cancelled) {
          setFaved(faves.includes(itemKey));
        }
      });

      // sync localforage across tabs
      lf.configObservables({
        crossTabNotification: true,
        crossTabChangeDetection: true,
      });
      subscription = lf
        .newObservable({
          key: HADITH_FAVES_KEY,
          crossTabNotification: true,
        })
        .subscribe({
          next: (args) => setFaved(liveFaves(args.newValue).includes(itemKey)),
        });
    });
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [itemKey]);

  const bookName = t("hadith-book-name", { id: hadith.book, name: hadith.bookName });
  const narrators = hadith.narrators ?? [];
  const link = (position: HadithPosition) => hadithPath({ collection: hadith.collection, ...position });

  return (
    <article aria-label={label} className="mx-auto w-full max-w-4xl px-4 py-8">
      <Breadcrumb
        items={[
          { title: <Link href="/hadiths">{t("hadiths")}</Link> },
          { title: <Link href={`/hadiths/${hadith.collection}`}>{hadith.collectionName}</Link> },
          { title: <Link href={`/hadiths/${hadith.collection}/${hadith.book}`}>{bookName}</Link> },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography.Title level={1} className="text-2xl">
          {label}
        </Typography.Title>
        <Space>
          <Fave faved={faved} itemKey={itemKey} />
          <Notes itemKey={itemKey} title={t("hadith-notes-title", { collection: hadith.collectionName, reference })} />
          <Share path={link(hadith)} title={label} label={t("share-hadith")} />
        </Space>
      </div>
      {narrators.length === 1 && (
        <Typography.Paragraph strong>{t("narrated-by", { name: narrators[0] })}</Typography.Paragraph>
      )}
      {narrators.length > 1 && (
        <Typography.Paragraph strong aria-label={t("narrator-chain")}>
          {narrators.join(" ← ")}
        </Typography.Paragraph>
      )}
      {hadith.text.map((paragraph, i) => (
        <p key={i} className="text-verse">
          {formatHadithText(paragraph)}
        </p>
      ))}
      <nav className="mt-8 flex justify-between gap-4">
        {previous ? (
          <Button href={link(previous)} icon={<LeftOutlined aria-hidden />}>
            {t("previous-hadith")}
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button href={link(next)} icon={<RightOutlined aria-hidden />} iconPosition="end">
            {t("next-hadith")}
          </Button>
        )}
      </nav>
    </article>
  );
};

export default HadithView;
