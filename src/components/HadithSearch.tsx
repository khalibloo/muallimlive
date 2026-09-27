"use client";

import { Fragment, useDeferredValue, useState } from "react";
import { Alert, App, Button, Empty, Form, Input, Progress, Select, Spin, Typography } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useDeepCompareEffect, useRequest } from "ahooks";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { hadithPath, type HadithRef } from "@/utils/hadithPack";
import { processHadithTerm, type HadithHit } from "@/utils/hadithSearch";
import { HadithSearchStopped, listNarrators, searchHadiths } from "@/utils/hadithSearchClient";
import { downloadHadiths, getDownloadStatus, isOfflineStorageSupported, useDownloads } from "@/utils/offline";
import { highlight } from "@/utils/search";
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

// Searches the downloaded collections in a worker, downloading the selected ones that are missing first
const HadithSearch: React.FC<Props> = ({ hadiths, onClose }) => {
  const t = useTranslations("common");
  const { notification } = App.useApp();
  const reference = useHadithReference();
  const downloads = useDownloads();
  const supported = isOfflineStorageSupported();
  const [filters, setFilters] = useState(() => getPageFilters(hadiths));
  const [narrator, setNarrator] = useState<string>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [limit, setLimit] = useState(PAGE_SIZE);

  const selected = filters.collection ? [filters.collection] : hadiths.collections.map((c) => c.id);
  const { data: status } = useRequest(getDownloadStatus, {
    ready: supported,
    refreshDeps: [Object.keys(downloads).join()],
  });
  const downloaded = selected.filter((c) => status?.hadiths.includes(c));
  const missing = status ? selected.filter((c) => !status.hadiths.includes(c)) : [];
  const download = (collection: string) =>
    downloadHadiths(collection).catch(() => notification.error({ title: t("download-failed") }));

  useDeepCompareEffect(() => {
    if (navigator.onLine) {
      missing.filter((c) => !(`hadiths/${c}` in downloads)).forEach(download);
    }
  }, [missing]);

  const { data: narrators } = useRequest(() => listNarrators(downloaded), {
    ready: downloaded.length > 0,
    refreshDeps: [downloaded.join()],
  });
  const {
    data: result,
    loading,
    error,
  } = useRequest(
    () => searchHadiths({ collections: downloaded, query: deferredQuery, book: filters.book, narrator, limit }),
    {
      ready: downloaded.length > 0 && !!deferredQuery,
      refreshDeps: [downloaded.join(), deferredQuery, filters.book, narrator, limit],
    },
  );

  const collectionOf = (hit: HadithRef) => hadiths.collections.find((c) => c.id === hit.collection);
  const label = (hit: HadithHit) =>
    t("hadith-label", { collection: collectionOf(hit)?.name ?? hit.collection, reference: reference(hit) });

  const renderHit = (hit: HadithHit) => {
    const { parts, before, after } = highlight(hit.text, hit.terms, processHadithTerm);
    const book = collectionOf(hit)?.books.find((b) => b.id === hit.book);
    return (
      <article key={`${hit.collection}/${hit.book}/${hit.id}`} aria-label={label(hit)} className="py-4 pr-2">
        <Link href={hadithPath(hit)} className="font-semibold" onClick={onClose}>
          {label(hit)}
        </Link>
        <div className="flex flex-wrap gap-x-4 text-xs">
          {book && (
            <Typography.Text type="secondary">
              {t("hadith-book-name", { id: book.id, name: book.name })}
            </Typography.Text>
          )}
          {hit.narrators?.[0] && (
            <Typography.Text type="secondary">{t("narrated-by", { name: hit.narrators[0] })}</Typography.Text>
          )}
        </div>
        <p className="m-0 mt-2">
          {before && t("ellipsis")}
          {parts.map((part, i) =>
            part.match ? (
              <mark key={i} className="bg-primary/25 text-inherit rounded-sm">
                {part.text}
              </mark>
            ) : (
              <Fragment key={i}>{part.text}</Fragment>
            ),
          )}
          {after && t("ellipsis")}
        </p>
      </article>
    );
  };

  const renderResults = () => {
    if (error) {
      return (
        <Alert
          type="error"
          showIcon
          title={error instanceof HadithSearchStopped ? t("hadith-search-stopped") : t("download-failed")}
        />
      );
    }
    if (!deferredQuery || downloaded.length === 0) {
      return null;
    }
    if (!result || loading) {
      return <Spin className="w-full" />;
    }
    if (result.matchCount + result.partialCount === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("no-hadiths-found")} />;
    }
    return (
      <div className="max-h-[60vh] overflow-y-auto divide-y divide-line">
        {result.matchCount > 0 && (
          <Typography.Text type="secondary">{t("hadith-matches", { count: result.matchCount })}</Typography.Text>
        )}
        {result.matches.map(renderHit)}
        {result.partial.length > 0 && (
          <Typography.Title level={5} className="pt-4">
            {t("partial-matches", { count: result.partialCount })}
          </Typography.Title>
        )}
        {result.partial.map(renderHit)}
        {result.matches.length + result.partial.length < result.matchCount + result.partialCount && (
          <Button type="link" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            {t("show-more")}
          </Button>
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
        <ul className="m-0 mb-4 list-none p-0">
          {missing.map((id) => {
            const name = hadiths.collections.find((c) => c.id === id)?.name ?? id;
            const progress = downloads[`hadiths/${id}`];
            return (
              <li key={id} className="flex items-center gap-4 py-1">
                <span className="flex-1">{name}</span>
                {progress !== undefined ? (
                  <Progress className="w-32" percent={Math.round(progress * 100)} aria-label={t("download-progress")} />
                ) : (
                  <>
                    {!navigator.onLine && (
                      <Typography.Text type="secondary">{t("hadith-not-downloaded-offline")}</Typography.Text>
                    )}
                    <Button
                      icon={<DownloadOutlined aria-hidden />}
                      disabled={!navigator.onLine}
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
      <div className="mt-4">{renderResults()}</div>
    </>
  );
};

export default HadithSearch;
