import React from "react";
import { Alert, App, Button, Col, Form, Progress, Row, Select, Typography } from "antd";
import { DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { uniqBy } from "lodash-es";
import { useFormatter, useTranslations } from "next-intl";

import {
  downloadAudio,
  downloadText,
  getDownloadStatus,
  isOfflineStorageSupported,
  removeAudio,
  removeText,
  useDownloads,
} from "@/utils/offline";
import { ARABIC_SCRIPTS, getContentPack, packKey, type ContentPack } from "@/utils/packs";

interface Props {
  chapters: GetChaptersResponse;
  translations: GetTranslationsResponse;
  tafsirs: GetTafsirsResponse;
  recitations: GetRecitationsResponse;
  readerSettings: ReaderSettings;
  playerSettings: PlaySettings;
}

const ALL_CHAPTERS = 0;

export const usePackLabel = ({ translations, tafsirs }: Pick<Props, "translations" | "tafsirs">) => {
  const t = useTranslations("common");
  return ({ type, id }: ContentPack) => {
    if (type === "arabic") {
      return id in ARABIC_SCRIPTS ? t(ARABIC_SCRIPTS[id as ArabicScript]) : id;
    }
    const resources: TranslatedEntity[] = type === "translation" ? translations.translations : tafsirs.tafsirs;
    return resources.find((r) => `${r.id}` === id)?.translated_name.name ?? id;
  };
};

/** The content packs the reader settings show */
export const getSettingsPacks = (readerSettings: ReaderSettings) =>
  uniqBy(
    [...readerSettings.left, ...readerSettings.right].map(getContentPack).filter((p): p is ContentPack => !!p),
    packKey,
  );

const OfflineStorage: React.FC<Props> = ({
  chapters,
  translations,
  tafsirs,
  recitations,
  readerSettings,
  playerSettings,
}) => {
  const t = useTranslations("common");
  const format = useFormatter();
  const { notification } = App.useApp();
  const packLabel = usePackLabel({ translations, tafsirs });
  const downloads = useDownloads();
  const supported = isOfflineStorageSupported();
  const [form] = Form.useForm<{ reciter: number; chapter: number }>();
  const reciter = Form.useWatch("reciter", form) ?? playerSettings.reciter;
  const audioChapter = Form.useWatch("chapter", form) ?? ALL_CHAPTERS;

  const { data, refresh } = useRequest(
    async () => ({ status: await getDownloadStatus(), usage: (await navigator.storage?.estimate?.())?.usage }),
    // a download finishing changes the download keys, which reloads the status
    { ready: supported, refreshDeps: [Object.keys(downloads).join()] },
  );

  if (!supported) {
    return <Alert type="warning" showIcon title={t("offline-storage-unsupported")} />;
  }

  const chapterIds = chapters.chapters.map((c) => c.id);
  const total = chapterIds.length;
  const status = data?.status ?? { text: {}, audio: {} };

  const settingsPacks = getSettingsPacks(readerSettings);
  // packs downloaded for earlier settings are listed too, so they can be removed
  const downloadedPacks = Object.keys(status.text).map((key) => {
    const [type, id] = key.split("/");
    return { type, id } as ContentPack;
  });
  const packs = uniqBy([...settingsPacks, ...downloadedPacks], packKey);
  const missingPacks = settingsPacks.filter((p) => (status.text[packKey(p)] ?? 0) < total);

  const run = async (task: Promise<unknown>) => {
    try {
      await task;
    } catch {
      notification.error({ title: t("download-failed") });
    }
    refresh();
  };

  const typeLabels = { arabic: t("arabic"), translation: t("translation"), tafsir: t("tafsir") };
  const packStatus = (count: number) => {
    if (count === total) {
      return t("downloaded");
    }
    return count > 0 ? t("partly-downloaded", { count, total }) : t("not-downloaded");
  };

  const audioDownloaded = status.audio[reciter] ?? [];
  const selectedAudioChapters = audioChapter === ALL_CHAPTERS ? chapterIds : [audioChapter];
  const selectedAudioDownloaded = selectedAudioChapters.filter((id) => audioDownloaded.includes(id));
  const audioProgress = downloads[`audio/${reciter}`];

  return (
    <>
      <Alert type="info" showIcon title={t("offline-storage-info")} />
      <div className="flex items-center justify-between gap-4 mt-6">
        <Typography.Title level={4} className="m-0">
          {t("offline-text")}
        </Typography.Title>
        {missingPacks.length > 0 && (
          <Button
            type="primary"
            icon={<DownloadOutlined aria-hidden />}
            onClick={() => run(Promise.all(missingPacks.map((p) => downloadText(p, chapterIds))))}
          >
            {t("download-all")}
          </Button>
        )}
      </div>
      <ul className="list-none m-0 p-0 divide-y divide-line">
        {packs.map((pack) => {
          const key = packKey(pack);
          const label = packLabel(pack);
          const count = status.text[key] ?? 0;
          const progress = downloads[key];
          return (
            <li key={key} className="flex items-center gap-4 py-2">
              <div className="grow min-w-0">
                <Typography.Text strong>{label}</Typography.Text>
                <div>
                  <Typography.Text type="secondary">
                    {typeLabels[pack.type]} · {packStatus(count)}
                  </Typography.Text>
                </div>
                {progress !== undefined && (
                  <Progress percent={Math.floor(progress * 100)} size="small" aria-label={t("download-progress")} />
                )}
              </div>
              {count < total && (
                <Button
                  icon={<DownloadOutlined aria-hidden />}
                  loading={progress !== undefined}
                  aria-label={t("download-pack", { name: label })}
                  onClick={() => run(downloadText(pack, chapterIds))}
                >
                  {t("download")}
                </Button>
              )}
              {count > 0 && progress === undefined && (
                <Button
                  danger
                  icon={<DeleteOutlined aria-hidden />}
                  aria-label={t("remove-pack", { name: label })}
                  onClick={() => run(removeText(pack))}
                >
                  {t("remove")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Typography.Title level={4} className="mt-6">
        {t("offline-audio")}
      </Typography.Title>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ reciter: playerSettings.reciter, chapter: ALL_CHAPTERS }}
        requiredMark={false}
      >
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item name="reciter" label={t("audio-reciter")}>
              <Select
                options={recitations.recitations.map((r) => ({
                  value: r.id,
                  label: r.style ? `${r.translated_name.name} (${r.style})` : r.translated_name.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="chapter" label={t("chapter")}>
              <Select
                showSearch={{ optionFilterProp: "label" }}
                options={[
                  { value: ALL_CHAPTERS, label: t("all-chapters") },
                  ...chapters.chapters.map((c) => ({ value: c.id, label: `${c.id}. ${c.name_simple}` })),
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <div className="flex items-center gap-4">
        <div className="grow min-w-0">
          <Typography.Text type="secondary">
            {t("audio-downloaded", { count: audioDownloaded.length, total })}
          </Typography.Text>
          {audioProgress !== undefined && (
            <Progress percent={Math.floor(audioProgress * 100)} size="small" aria-label={t("download-progress")} />
          )}
        </div>
        {selectedAudioDownloaded.length < selectedAudioChapters.length && (
          <Button
            icon={<DownloadOutlined aria-hidden />}
            loading={audioProgress !== undefined}
            aria-label={t("download-audio")}
            onClick={() => run(downloadAudio(reciter, selectedAudioChapters))}
          >
            {t("download")}
          </Button>
        )}
        {selectedAudioDownloaded.length > 0 && audioProgress === undefined && (
          <Button
            danger
            icon={<DeleteOutlined aria-hidden />}
            aria-label={t("remove-audio")}
            onClick={() => run(removeAudio(reciter, selectedAudioDownloaded))}
          >
            {t("remove")}
          </Button>
        )}
      </div>

      {data?.usage !== undefined && (
        <Typography.Paragraph type="secondary" className="mt-6 mb-0">
          {t("storage-used", {
            size: format.number(data.usage / 1e6, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }),
          })}
        </Typography.Paragraph>
      )}
    </>
  );
};

export default OfflineStorage;
