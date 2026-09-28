"use client";

import { useDeferredValue, useState } from "react";
import { Alert, App, Button, Empty, Form, Input, Progress, Select, Spin, Typography } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useNetwork, useRequest } from "ahooks";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Virtuoso } from "react-virtuoso";

import { hadithPath, type HadithRef } from "@/utils/hadithPack";
import { HADITH_WORD_SEPARATORS, processHadithHighlightTerm, type HadithHit } from "@/utils/hadithSearch";
import { HadithSearchStopped, listNarrators, searchHadiths } from "@/utils/hadithSearchClient";
import { downloadHadiths, getDownloadStatus, isOfflineStorageSupported, useDownloads } from "@/utils/offline";
import { highlight } from "@/utils/search";
import Highlighted from "./Highlighted";
import useHadithReference from "./useHadithReference";

interface Props {
  hadiths: GetHadithResourcesResponse;
  onClose: () => void;
}

const PAGE_SIZE = 50;
const PAGE_FILTERS = /^\/hadiths\/([a-z-]+)(?:\/(\d+))?/;

/** The collection and book of the hadith page the search is opened on */
const getPageFilters = ({ collections }: GetHadithResourcesResponse) => {
  const [, collectionId, bookId] = window.location.pathname.match(PAGE_FILTERS) ?? [];
  const collection = collections.find((c) => c.id === collectionId);
  const book = collection?.books.find((b) => `${b.id}` === bookId);
  return { collection: collection?.id ?? "", book: book?.id };
};

const highlightHadith = (text: string, terms: string[]) =>
  highlight(text, terms, processHadithHighlightTerm, HADITH_WORD_SEPARATORS);

type ResultItem = { hit: HadithHit } | { partialHeading: number };

// Searches the downloaded collections in a worker. The selected collections that are missing can be downloaded here.
const HadithSearch: React.FC<Props> = ({ hadiths, onClose }) => {
  const t = useTranslations("common");
  const { notification } = App.useApp();
  const reference = useHadithReference();
  const downloads = useDownloads();
  const { online } = useNetwork();
  const supported = isOfflineStorageSupported();
  const [filters, setFilters] = useState(() => getPageFilters(hadiths));
  const [narrator, setNarrator] = useState<string>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);

  const selected = hadiths.collections.filter((c) => !filters.collection || c.id === filters.collection);
  const { data: status } = useRequest(getDownloadStatus, {
    ready: supported,
    refreshDeps: [Object.keys(downloads).join()],
  });
  const downloaded = selected.filter((c) => status?.hadiths.includes(c.id));
  const missing = status ? selected.filter((c) => !status.hadiths.includes(c.id)) : [];
  const downloadedIds = downloaded.map((c) => c.id).join();

  const { data: narrators } = useRequest(() => listNarrators(downloaded), {
    ready: downloaded.length > 0,
    refreshDeps: [downloadedIds],
  });
  const {
    data: result,
    loading,
    error,
  } = useRequest(
    () => searchHadiths({ collections: downloaded, query: deferredQuery, book: filters.book, narrator, limit }),
    {
      ready: downloaded.length > 0 && !!deferredQuery,
      refreshDeps: [downloadedIds, deferredQuery, filters.book, narrator, limit],
    },
  );

  const download = (collection: string) =>
    downloadHadiths(collection).catch(() => notification.error({ title: t("download-failed") }));

  const collectionOf = (hit: HadithRef) => hadiths.collections.find((c) => c.id === hit.collection);
  const label = (hit: HadithHit) =>
    t("hadith-label", { collection: collectionOf(hit)?.name ?? hit.collection, reference: reference(hit) });

  const renderHit = (hit: HadithHit) => {
    const book = collectionOf(hit)?.books.find((b) => b.id === hit.book);
    return (
      <article aria-label={label(hit)} className="border-b border-line py-4 pr-2">
        <Link href={hadithPath(hit)} className="font-semibold" onClick={onClose}>
          {label(hit)}
        </Link>
        <div className="flex flex-wrap gap-x-4">
          {book && (
            <Typography.Text type="secondary">
              <Highlighted {...highlightHadith(t("hadith-book-name", { id: book.id, name: book.name }), hit.terms)} />
            </Typography.Text>
          )}
          {hit.narrators?.[0] && (
            <Typography.Text type="secondary">{t("narrated-by", { name: hit.narrators[0] })}</Typography.Text>
          )}
        </div>
        <p className="m-0 mt-2">
          <Highlighted {...highlightHadith(hit.text, hit.terms)} />
        </p>
      </article>
    );
  };

  const renderResults = () => {
    // ahooks keeps the previous error until the next request settles, so a stale "search stopped" error must
    // not outlive a filter change that leaves nothing to search, or outlast the loading state of a new search
    if (!deferredQuery || downloaded.length === 0) {
      return null;
    }
    // the previous result stays on screen while the next page loads, instead of unmounting the results list
    if (loading && !result) {
      return <Spin className="w-full" />;
    }
    if (error && !loading) {
      return (
        <Alert
          type="error"
          showIcon
          title={error instanceof HadithSearchStopped ? t("hadith-search-stopped") : t("download-failed")}
        />
      );
    }
    if (!result) {
      return <Spin className="w-full" />;
    }
    if (result.matchCount + result.partialCount === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("no-hadiths-found")} />;
    }
    const items: ResultItem[] = [
      ...result.matches.map((hit) => ({ hit })),
      ...(result.partial.length > 0 ? [{ partialHeading: result.partialCount }] : []),
      ...result.partial.map((hit) => ({ hit })),
    ];
    const hasMore = result.matches.length + result.partial.length < result.matchCount + result.partialCount;
    return (
      <div ref={setScroller} className="max-h-[60vh] overflow-y-auto">
        {scroller && (
          <Virtuoso
            customScrollParent={scroller}
            data={items}
            computeItemKey={(_, item) =>
              "hit" in item ? `${item.hit.collection}/${item.hit.book}/${item.hit.id}` : "partial"
            }
            itemContent={(_, item) =>
              "hit" in item ? (
                renderHit(item.hit)
              ) : (
                <Typography.Title level={5} className="pt-4">
                  {t("partial-matches", { count: item.partialHeading })}
                </Typography.Title>
              )
            }
            endReached={() => hasMore && !loading && setLimit((l) => l + PAGE_SIZE)}
            components={{ Footer: () => (hasMore ? <Spin className="w-full py-4" /> : null) }}
          />
        )}
      </div>
    );
  };

  if (!supported) {
    return <Alert type="warning" showIcon title={t("hadith-search-unsupported")} />;
  }

  const collection = hadiths.collections.find((c) => c.id === filters.collection);
  return (
    <>
      <Form layout="vertical" component="div" className="grid gap-x-4 md:grid-cols-3">
        <Form.Item label={t("hadith-collection")} htmlFor="hadith-collection">
          <Select
            id="hadith-collection"
            value={filters.collection}
            onChange={(value) => {
              setFilters({ collection: value, book: undefined });
              // another collection has other narrators
              setNarrator(undefined);
              setLimit(PAGE_SIZE);
            }}
            options={[
              { value: "", label: t("all-collections") },
              ...hadiths.collections.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </Form.Item>
        <Form.Item label={t("hadith-book")} htmlFor="hadith-book">
          <Select<number | "">
            id="hadith-book"
            disabled={!collection}
            value={filters.book ?? ""}
            onChange={(value) => {
              setFilters({ ...filters, book: value || undefined });
              setLimit(PAGE_SIZE);
            }}
            options={[
              { value: "", label: t("all-books") },
              ...(collection?.books ?? []).map((b) => ({
                value: b.id,
                label: t("hadith-book-name", { id: b.id, name: b.name }),
              })),
            ]}
          />
        </Form.Item>
        <Form.Item label={t("narrator")} htmlFor="hadith-narrator">
          <Select
            id="hadith-narrator"
            showSearch
            allowClear
            placeholder={t("any-narrator")}
            value={narrator}
            onChange={(value) => {
              setNarrator(value);
              setLimit(PAGE_SIZE);
            }}
            options={(narrators ?? []).map((n) => ({ value: n, label: n }))}
          />
        </Form.Item>
      </Form>
      {missing.length > 0 && (
        <>
          <ul className="m-0 list-none p-0">
            {missing.map(({ id, name }) => {
              const progress = downloads[`hadiths/${id}`];
              return (
                <li key={id} className="flex items-center gap-4 py-1">
                  <span className="flex-1">{name}</span>
                  {progress !== undefined ? (
                    <Progress
                      className="w-32"
                      percent={Math.round(progress * 100)}
                      aria-label={t("download-progress")}
                    />
                  ) : (
                    <>
                      {!online && (
                        <Typography.Text type="secondary">{t("hadith-not-downloaded-offline")}</Typography.Text>
                      )}
                      <Button
                        size="small"
                        icon={<DownloadOutlined aria-hidden />}
                        disabled={!online}
                        aria-label={t("download-pack", { name })}
                        onClick={() => download(id)}
                      >
                        {t("download")}
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <Alert className="my-4" type="info" showIcon title={t("hadith-download-needed")} />
        </>
      )}
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
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(PAGE_SIZE);
        }}
      />
      <Typography.Text type="secondary" role="status" className="mt-4 block">
        {deferredQuery &&
          downloaded.length > 0 &&
          result &&
          !(error && !loading) &&
          t("hadith-matches", { count: result.matchCount })}
      </Typography.Text>
      <div className="mt-2">{renderResults()}</div>
    </>
  );
};

export default HadithSearch;
