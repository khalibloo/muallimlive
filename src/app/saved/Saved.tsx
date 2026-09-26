"use client";

import { useEffect, useState } from "react";
import { Empty, Space, Spin, Tabs, Typography } from "antd";
import { useDeepCompareEffect } from "ahooks";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { groupBy, mapValues, pickBy, sortBy, uniq, uniqBy } from "lodash-es";

import Fave from "@/components/Fave";
import Notes from "@/components/Notes";
import SafeHtml from "@/components/SafeHtml";
import { verseTextClassName } from "@/components/Verse";
import lf from "@/utils/localforage";
import { contentUrl, getContentPack, getJson, packKey, type ContentPack } from "@/utils/packs";
import { isUserDataKey, liveFaves, liveNotes, readAll, type Note } from "@/utils/userData";

interface Props {
  chapters: Chapter[];
  readerSettings: ReaderSettings;
}

// a type, not an interface, so it can be passed as translation values
type SavedVerse = { chapter: number; verse: number };

/** Each chapter's texts, one list per pack, indexed by verse; a list is undefined when it couldn't be loaded */
type ChapterTexts = Record<number, (VerseText[] | undefined)[]>;

const toVerse = (key: string): SavedVerse => {
  const [chapter, verse] = key.split(":").map(Number);
  return { chapter, verse };
};

/** The verse texts to show: the display settings' Arabic scripts and translations, without the long tafsirs */
const getTextPacks = (readerSettings: ReaderSettings) =>
  uniqBy(
    [...readerSettings.left, ...readerSettings.right]
      .map(getContentPack)
      .filter((pack): pack is ContentPack => !!pack && pack.type !== "tafsir"),
    packKey,
  );

/** Loads the texts of each chapter once, as it's needed */
const useChapterTexts = (chapterIds: number[], packs: ContentPack[]) => {
  const [texts, setTexts] = useState<ChapterTexts>({});
  useDeepCompareEffect(() => {
    for (const chapter of chapterIds.filter((c) => !(c in texts))) {
      Promise.all(packs.map((pack) => getJson<VerseText[]>(contentUrl(pack, chapter)))).then((lists) =>
        setTexts((current) => ({ ...current, [chapter]: lists })),
      );
    }
  }, [chapterIds, packs]);
  return texts;
};

const VerseTexts: React.FC<{ texts: VerseText[] }> = ({ texts }) => (
  <ul className="list-none m-0 p-0 divide-y divide-line">
    {texts.map((v, i) => (
      // one verse's text from each pack, in the display settings' order
      <li key={i} className={v.isArabic ? "py-3 text-right" : "py-3"}>
        {v.isHTML ? (
          <SafeHtml className={verseTextClassName(v)} html={v.text} />
        ) : (
          <Typography.Text className={verseTextClassName(v)} strong={v.isBold}>
            {v.text}
          </Typography.Text>
        )}
      </li>
    ))}
  </ul>
);

/** The reader's favorite verses and verses with notes, by chapter */
const Saved: React.FC<Props> = ({ chapters, readerSettings }) => {
  const t = useTranslations("common");
  const [faves, setFaves] = useState<string[]>();
  const [notes, setNotes] = useState<Record<string, Note[]>>({});

  useEffect(() => {
    let cancelled = false;
    let subscription: Subscription | undefined;

    const load = () =>
      readAll().then((data) => {
        if (!cancelled) {
          setFaves(liveFaves(data.faves));
          setNotes(pickBy(mapValues(data.notes, liveNotes), (list) => list.length > 0));
        }
      });

    lf.ready().then(() => {
      if (cancelled) {
        return;
      }
      load();

      // notes are stored per verse, so this watches every key
      lf.configObservables({
        crossTabNotification: true,
        crossTabChangeDetection: true,
      });
      subscription = lf.newObservable({ crossTabNotification: true }).subscribe({
        next: (args) => {
          if (isUserDataKey(args.key)) {
            load();
          }
        },
      });
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  // verses of chapters that don't exist are skipped
  const toVerses = (keys: string[]) =>
    sortBy(
      keys.map(toVerse).filter(({ chapter, verse }) => {
        const found = chapters.find((c) => c.id === chapter);
        return found && verse >= 1 && verse <= found.verses_count;
      }),
      ["chapter", "verse"],
    );
  const faveVerses = toVerses(faves ?? []);
  const noteVerses = toVerses(Object.keys(notes));

  const texts = useChapterTexts(
    uniq([...faveVerses, ...noteVerses].map((v) => v.chapter)),
    getTextPacks(readerSettings),
  );

  const renderVerses = (
    verses: SavedVerse[],
    empty: string,
    action: (verse: SavedVerse) => React.ReactNode,
    showNotes?: boolean,
  ) => {
    if (verses.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;
    }
    return Object.entries(groupBy(verses, "chapter")).map(([chapterId, chapterVerses]) => {
      const chapter = chapters.find((c) => `${c.id}` === chapterId)!;
      return (
        <section key={chapterId} className="mb-8">
          <Typography.Title level={2} className="text-xl">
            {t("chapter-name", {
              id: chapter.id,
              name: chapter.name_simple,
              translation: chapter.translated_name.name,
            })}
          </Typography.Title>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {chapterVerses.map((verse) => (
              <li key={verse.verse}>
                <article
                  aria-label={t("verse-reference", verse)}
                  className="rounded-xl border border-line bg-surface px-4 md:px-6 py-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/chapters/${verse.chapter}#v-${verse.verse}`}
                      aria-label={t("go-to-verse", verse)}
                      className="verse-badge"
                    >
                      {verse.verse}
                    </Link>
                    <Space>{action(verse)}</Space>
                  </div>
                  <VerseTexts texts={(texts[verse.chapter] ?? []).flatMap((list) => list?.[verse.verse - 1] ?? [])} />
                  {showNotes && (
                    <ul className="list-none m-0 p-0 divide-y divide-line border-t border-line">
                      {notes[`${verse.chapter}:${verse.verse}`].map((note) => (
                        <li key={note.id} className="py-4">
                          <SafeHtml html={note.html} />
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            ))}
          </ul>
        </section>
      );
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Typography.Title level={1} className="text-center">
        {t("saved")}
      </Typography.Title>
      {faves === undefined ? (
        <Spin className="mt-12 w-full" />
      ) : (
        <Tabs
          items={[
            {
              key: "favorites",
              label: t("favorites"),
              children: renderVerses(faveVerses, t("no-favorites"), (verse) => (
                <Fave faved chapterNumber={verse.chapter} verseNumber={verse.verse} />
              )),
            },
            {
              key: "notes",
              label: t("notes"),
              children: renderVerses(
                noteVerses,
                t("no-saved-notes"),
                (verse) => <Notes chapterNumber={verse.chapter} verseNumber={verse.verse} />,
                true,
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default Saved;
