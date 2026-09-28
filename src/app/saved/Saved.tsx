"use client";

import { Fragment, useEffect, useState } from "react";
import { Empty, Space, Spin, Tabs, Typography } from "antd";
import { useDeepCompareEffect } from "ahooks";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { groupBy, mapValues, pickBy, sortBy, uniq, uniqBy } from "lodash-es";

import Fave from "@/components/Fave";
import Notes from "@/components/Notes";
import SafeHtml from "@/components/SafeHtml";
import Share from "@/components/Share";
import useHadithReference from "@/components/useHadithReference";
import { verseTextClassName } from "@/components/Verse";
import { chapterPath } from "@/utils/chapters";
import { formatHadithText, hadithPath, type HadithRef } from "@/utils/hadithPack";
import lf from "@/utils/localforage";
import { readHadiths } from "@/utils/hadithCache";
import { getDownloadStatus, isOfflineStorageSupported } from "@/utils/offline";
import { contentUrl, getContentPack, getJson, hadithUrl, packKey, type ContentPack } from "@/utils/packs";
import {
  isHadithKey,
  isUserDataKey,
  liveFaves,
  liveNotes,
  readAll,
  toHadithRef,
  verseKey,
  type Note,
} from "@/utils/userData";

interface Props {
  chapters: Chapter[];
  readerSettings: ReaderSettings;
  hadiths: GetHadithResourcesResponse;
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

const NoteList: React.FC<{ notes: Note[] }> = ({ notes }) => (
  <ul className="list-none m-0 p-0 divide-y divide-line border-t border-line">
    {notes.map((note) => (
      <li key={note.id} className="py-4">
        <SafeHtml html={note.html} />
      </li>
    ))}
  </ul>
);

type SavedHadith = HadithRef & { key: string };
/** A hadith's text, or why it's missing: offline without its pack, or a failed load */
type HadithText = { narrators?: string[]; text: string[] } | "offline" | "failed";

/** Loads each hadith's text once: from a downloaded pack, else from the server */
const useHadithTexts = (refs: SavedHadith[]) => {
  const [texts, setTexts] = useState<Record<string, HadithText>>({});
  useDeepCompareEffect(() => {
    const missing = refs.filter((r) => !(r.key in texts));
    if (missing.length === 0) {
      return;
    }
    (async () => {
      const downloaded = isOfflineStorageSupported() ? (await getDownloadStatus()).hadiths : [];
      const packs = new Map<string, Promise<HadithPack>>();
      const loaded = await Promise.all(
        missing.map(async (ref): Promise<[string, HadithText]> => {
          if (downloaded.includes(ref.collection)) {
            if (!packs.has(ref.collection)) {
              packs.set(ref.collection, readHadiths(ref.collection));
            }
            const pack = await packs.get(ref.collection)!.catch(() => undefined);
            const found = pack?.hadiths.find((h) => h.book === ref.book && h.id === ref.id);
            return [ref.key, found ?? "failed"];
          }
          const hadith = await getJson<Hadith>(hadithUrl(ref));
          return [ref.key, hadith ?? (navigator.onLine ? "failed" : "offline")];
        }),
      );
      setTexts((current) => ({ ...current, ...Object.fromEntries(loaded) }));
    })();
  }, [refs]);
  return texts;
};

/** The reader's favorite verses and verses with notes, by chapter */
const Saved: React.FC<Props> = ({ chapters, readerSettings, hadiths }) => {
  const t = useTranslations("common");
  const reference = useHadithReference();
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

  // hadith keys and verses of chapters that don't exist are skipped
  const toVerses = (keys: string[]) =>
    sortBy(
      keys
        .filter((k) => !isHadithKey(k))
        .map(toVerse)
        .filter(({ chapter, verse }) => {
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

  // hadiths of collections or books that don't exist are skipped; ids like "4.1.10" sort by their numbers
  const collectionIndex = (ref: HadithRef) => hadiths.collections.findIndex((c) => c.id === ref.collection);
  const toHadiths = (keys: string[]): SavedHadith[] =>
    keys
      .filter(isHadithKey)
      .map((key) => ({ ...toHadithRef(key), key }))
      .filter((ref) => hadiths.collections[collectionIndex(ref)]?.books.some((b) => b.id === ref.book))
      .sort(
        (a, b) =>
          collectionIndex(a) - collectionIndex(b) ||
          a.book - b.book ||
          a.id.localeCompare(b.id, undefined, { numeric: true }),
      );
  const faveHadiths = toHadiths(faves ?? []);
  const noteHadiths = toHadiths(Object.keys(notes));
  const hadithTexts = useHadithTexts(uniqBy([...faveHadiths, ...noteHadiths], "key"));

  const hadithActions = (ref: SavedHadith, collection: HadithResourceCollection, refText: string) => (
    <>
      <Fave faved={(faves ?? []).includes(ref.key)} itemKey={ref.key} />
      <Notes itemKey={ref.key} title={t("hadith-notes-title", { collection: collection.name, reference: refText })} />
      <Share
        path={hadithPath(ref)}
        title={t("hadith-label", { collection: collection.name, reference: refText })}
        label={t("share-hadith")}
      />
    </>
  );

  const renderVerses = (
    verses: SavedVerse[],
    empty: string | undefined,
    action: (verse: SavedVerse) => React.ReactNode,
    showNotes?: boolean,
  ) => {
    if (verses.length === 0) {
      return empty && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;
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
                      href={chapterPath(verse.chapter, verse.verse)}
                      aria-label={t("go-to-verse", verse)}
                      className="verse-badge"
                    >
                      {verse.verse}
                    </Link>
                    <Space>{action(verse)}</Space>
                  </div>
                  <VerseTexts texts={(texts[verse.chapter] ?? []).flatMap((list) => list?.[verse.verse - 1] ?? [])} />
                  {showNotes && <NoteList notes={notes[verseKey(verse.chapter, verse.verse)]} />}
                </article>
              </li>
            ))}
          </ul>
        </section>
      );
    });
  };

  const renderHadiths = (refs: SavedHadith[], showNotes?: boolean) =>
    refs.length > 0 && (
      <section aria-labelledby={`hadiths-${showNotes ? "notes" : "faves"}`} className="mb-8">
        <Typography.Title level={2} id={`hadiths-${showNotes ? "notes" : "faves"}`} className="text-xl">
          {t("hadith")}
        </Typography.Title>
        {Object.entries(groupBy(refs, "collection")).map(([collectionId, collectionRefs]) => {
          const collection = hadiths.collections.find((c) => c.id === collectionId)!;
          return (
            <Fragment key={collectionId}>
              <Typography.Title level={3} className="text-lg">
                {collection.name}
              </Typography.Title>
              {Object.entries(groupBy(collectionRefs, "book")).map(([bookId, bookRefs]) => {
                const book = collection.books.find((b) => `${b.id}` === bookId)!;
                return (
                  <Fragment key={bookId}>
                    <Typography.Title level={4} className="text-base">
                      {t("hadith-book-name", { id: book.id, name: book.name })}
                    </Typography.Title>
                    <ul className="m-0 flex list-none flex-col gap-4 p-0">
                      {bookRefs.map((ref) => {
                        const text = hadithTexts[ref.key];
                        const refText = reference({ ...ref, volume: book.volume });
                        const label = t("hadith-label", { collection: collection.name, reference: refText });
                        return (
                          <li key={ref.key}>
                            <article
                              aria-label={label}
                              className="rounded-xl border border-line bg-surface px-4 md:px-6 py-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Link href={hadithPath(ref)} className="font-semibold">
                                  {refText}
                                </Link>
                                <Space>{hadithActions(ref, collection, refText)}</Space>
                              </div>
                              {typeof text === "string" ? (
                                <Typography.Text type="secondary">
                                  {text === "offline" ? t("hadith-text-unavailable") : t("hadith-text-load-failed")}
                                </Typography.Text>
                              ) : (
                                <>
                                  {text?.narrators?.[0] && (
                                    <Typography.Paragraph strong>
                                      {t("narrated-by", { name: text.narrators[0] })}
                                    </Typography.Paragraph>
                                  )}
                                  {text?.text.map((p, i) => (
                                    <p key={i} className="text-verse">
                                      {formatHadithText(p)}
                                    </p>
                                  ))}
                                </>
                              )}
                              {showNotes && <NoteList notes={notes[ref.key]} />}
                            </article>
                          </li>
                        );
                      })}
                    </ul>
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
      </section>
    );

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
              children: (
                <>
                  {renderVerses(faveVerses, faveHadiths.length ? undefined : t("no-favorites"), (verse) => (
                    <Fave faved itemKey={verseKey(verse.chapter, verse.verse)} />
                  ))}
                  {renderHadiths(faveHadiths)}
                </>
              ),
            },
            {
              key: "notes",
              label: t("notes"),
              children: (
                <>
                  {renderVerses(
                    noteVerses,
                    noteHadiths.length ? undefined : t("no-saved-notes"),
                    (verse) => (
                      <Notes itemKey={verseKey(verse.chapter, verse.verse)} title={t("notes-title", verse)} />
                    ),
                    true,
                  )}
                  {renderHadiths(noteHadiths, true)}
                </>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default Saved;
