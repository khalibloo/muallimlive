"use client";

import { useDeferredValue, useState } from "react";
import { Alert, App, Button, Checkbox, Empty, Input, Modal, Progress, Segmented, Spin, Typography } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useCookieState, useRequest } from "ahooks";
import clsx from "clsx";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Virtuoso } from "react-virtuoso";

import { chapterPath } from "@/utils/chapters";
import { parseReaderSettings, READER_SETTINGS_KEY } from "@/utils/cookies";
import { downloadText, getDownloadStatus, isOfflineStorageSupported, useDownloads } from "@/utils/offline";
import { packKey, type ContentPack } from "@/utils/packs";
import { getChapterIndex, highlight, loadPackIndex, searchIndexes, type SearchHit } from "@/utils/search";
import { useCurrentChapter, type SearchMode } from "./ChapterSearchContext";
import HadithSearch from "./HadithSearch";
import Highlighted from "./Highlighted";
import { getSettingsPacks, usePackLabel } from "./OfflineStorage";

interface Props {
  open: boolean;
  mode: SearchMode;
  onClose: () => void;
  width?: string;
  chapters: GetChaptersResponse;
  translations: GetTranslationsResponse;
  tafsirs: GetTafsirsResponse;
  hadiths: GetHadithResourcesResponse;
}

// Searches the display settings' texts: the current chapter's from the page, or the whole Qur'an's from the
// downloaded offline packs. Tafsirs are only searched in a chapter, as their packs are too large to index.
const VerseSearch: React.FC<Omit<Props, "open" | "width" | "mode" | "hadiths">> = ({
  onClose,
  chapters,
  translations,
  tafsirs,
}) => {
  const t = useTranslations("common");
  const { notification } = App.useApp();
  const current = useCurrentChapter();
  const [readerSettingsCookie] = useCookieState(READER_SETTINGS_KEY);
  const packLabel = usePackLabel({ translations, tafsirs });
  const downloads = useDownloads();
  const supported = isOfflineStorageSupported();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  // on by default, also for a chapter that registers while the modal is open
  const [thisChapter = true, setThisChapter] = useState<boolean>();
  const [excluded, setExcluded] = useState<string[]>([]);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);

  const inChapter = thisChapter && !!current;
  const chapterIds = chapters.chapters.map((c) => c.id);
  const settingsPacks = getSettingsPacks(parseReaderSettings(readerSettingsCookie));

  const { data: status, refresh } = useRequest(getDownloadStatus, {
    ready: supported && !inChapter,
    // a download finishing changes the download keys, which reloads the status
    refreshDeps: [Object.keys(downloads).join()],
  });

  const texts: { pack: ContentPack; available: boolean }[] = inChapter
    ? current.texts.map(({ pack }) => ({ pack, available: true }))
    : settingsPacks
        .filter((p) => p.type !== "tafsir")
        .map((pack) => ({
          pack,
          available: chapterIds.length > 0 && status?.text[packKey(pack)] === chapterIds.length,
        }));
  const selectedKeys = texts
    .filter((p) => p.available && !excluded.includes(packKey(p.pack)))
    .map((p) => packKey(p.pack));

  const { data: packIndexes, loading: indexing } = useRequest(
    () =>
      Promise.all(
        texts
          .filter((p) => selectedKeys.includes(packKey(p.pack)))
          .map(async ({ pack }) => ({ key: packKey(pack), index: await loadPackIndex(pack, chapterIds) })),
      ),
    { ready: !inChapter && !!status, refreshDeps: [selectedKeys.join()] },
  );

  const indexes = inChapter
    ? current.texts
        .filter(({ pack }) => selectedKeys.includes(packKey(pack)))
        .map(({ pack, verses }) => ({ key: packKey(pack), index: getChapterIndex(verses) }))
    : (packIndexes ?? []).filter((i) => selectedKeys.includes(i.key));
  const hits = searchIndexes(indexes, deferredQuery);

  const toggleText = (key: string, checked: boolean) => {
    setExcluded(checked ? excluded.filter((k) => k !== key) : [...excluded, key]);
  };

  const download = async (pack: ContentPack) => {
    try {
      await downloadText(pack, chapterIds);
    } catch {
      notification.error({ title: t("download-failed") });
    }
    refresh();
  };

  const renderResults = () => {
    if (selectedKeys.length === 0) {
      return <Typography.Text type="secondary">{t("search-no-texts")}</Typography.Text>;
    }
    if (!inChapter && indexing) {
      return <Spin description={t("search-preparing")} />;
    }
    if (!deferredQuery.trim()) {
      return null;
    }
    if (hits.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("no-verses-found")} />;
    }
    return (
      <div ref={setScroller} className="max-h-[60vh] overflow-y-auto">
        {scroller && (
          <Virtuoso
            customScrollParent={scroller}
            data={hits}
            computeItemKey={(_, hit) => hit.verseKey}
            itemContent={(_, hit) => renderHit(hit)}
          />
        )}
      </div>
    );
  };

  const renderHit = (hit: SearchHit) => {
    const reference = { chapter: hit.chapter, verse: hit.verse };
    const chapter = chapters.chapters.find((c) => c.id === hit.chapter);
    return (
      <article aria-label={t("verse-reference", reference)} className="border-b border-line py-4 pr-2">
        <Link
          href={chapterPath(hit.chapter, hit.verse)}
          className="font-semibold"
          onClick={(e) => {
            // the current chapter is already on the page, so its list scrolls there
            if (current?.chapter.id === hit.chapter) {
              e.preventDefault();
              current.goToVerse(hit.verse);
            }
            onClose();
          }}
        >
          {chapter ? t("chapter-verse", { name: chapter.name_simple, ...reference }) : t("verse-reference", reference)}
        </Link>
        {hit.texts.map(({ key, text, terms }) => {
          const pack = texts.find((p) => packKey(p.pack) === key)!.pack;
          const arabic = pack.type === "arabic";
          return (
            <div key={key} className="mt-2">
              <Typography.Text type="secondary">{packLabel(pack)}</Typography.Text>
              <p
                dir={arabic ? "rtl" : undefined}
                lang={arabic ? "ar" : undefined}
                className={clsx("m-0", { "text-arabic text-verse-arabic": arabic })}
              >
                <Highlighted {...highlight(text, terms)} />
              </p>
            </div>
          );
        })}
      </article>
    );
  };

  const renderTexts = () => {
    if (!inChapter && !status) {
      return <Spin />;
    }
    return (
      <>
        <ul className="list-none m-0 p-0">
          {texts.map(({ pack, available }) => {
            const key = packKey(pack);
            const label = packLabel(pack);
            const progress = downloads[key];
            return (
              <li key={key} className="flex items-center gap-4 py-1">
                <Checkbox
                  checked={selectedKeys.includes(key)}
                  disabled={!available}
                  onChange={(e) => toggleText(key, e.target.checked)}
                >
                  {label}
                </Checkbox>
                {progress !== undefined && (
                  <Progress
                    className="grow m-0"
                    percent={Math.floor(progress * 100)}
                    size="small"
                    aria-label={t("download-progress")}
                  />
                )}
                {!available && (
                  <Button
                    size="small"
                    icon={<DownloadOutlined aria-hidden />}
                    loading={progress !== undefined}
                    aria-label={t("download-pack", { name: label })}
                    onClick={() => download(pack)}
                  >
                    {t("download")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {!inChapter && settingsPacks.some((p) => p.type === "tafsir") && (
          <Typography.Paragraph type="secondary" className="mt-2 mb-0">
            {t("search-tafsirs-chapter-only")}
          </Typography.Paragraph>
        )}
        {texts.some((p) => !p.available) && (
          <Alert className="mt-2" type="info" showIcon title={t("search-download-needed")} />
        )}
      </>
    );
  };

  return (
    <>
      {current && (
        <Checkbox className="mb-4" checked={thisChapter} onChange={(e) => setThisChapter(e.target.checked)}>
          {t("search-this-chapter", { name: current.chapter.name_simple })}
        </Checkbox>
      )}
      {!inChapter && !supported ? (
        <Alert type="warning" showIcon title={t("search-unsupported")} />
      ) : (
        <>
          <Input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            allowClear
            type="search"
            size="large"
            aria-label={t("search-query")}
            placeholder={t("search-query")}
            prefix={<SearchOutlined aria-hidden />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Typography.Title level={5} className="mt-4">
            {t("search-texts")}
          </Typography.Title>
          {renderTexts()}
          <Typography.Text type="secondary" role="status" className="mt-4 block">
            {selectedKeys.length > 0 &&
              !(!inChapter && indexing) &&
              hits.length > 0 &&
              t("search-results", { count: hits.length })}
          </Typography.Text>
          <div className="mt-2">{renderResults()}</div>
        </>
      )}
    </>
  );
};

const Search: React.FC<Omit<Props, "open" | "width">> = ({ mode: initialMode, hadiths, ...props }) => {
  const t = useTranslations("common");
  const [mode, setMode] = useState(initialMode);
  return (
    <>
      <Segmented
        block
        className="mb-4"
        aria-label={t("search-in")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "quran", label: t("quran") },
          { value: "hadith", label: t("hadith") },
        ]}
      />
      {mode === "quran" ? <VerseSearch {...props} /> : <HadithSearch hadiths={hadiths} onClose={props.onClose} />}
    </>
  );
};

const SearchModal: React.FC<Props> = ({ open, width, ...props }) => {
  const t = useTranslations("common");
  return (
    <Modal destroyOnHidden open={open} footer={null} onCancel={props.onClose} width={width} title={t("search")}>
      <Search {...props} />
    </Modal>
  );
};

export default SearchModal;
