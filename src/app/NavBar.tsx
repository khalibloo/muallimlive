"use client";

import { useState } from "react";
import { App, Button, Dropdown, Grid, Modal, Tabs, Typography } from "antd";
import {
  BookOutlined,
  HeartOutlined,
  MoonOutlined,
  ReadOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import lf from "localforage";
import { useBoolean, useEventListener, useMount } from "ahooks";
import { useFormatter, useTranslations } from "next-intl";

import { useSearchModal } from "@/components/ChapterSearchContext";
import OfflineStorage, { getSettingsPacks, usePackLabel } from "@/components/OfflineStorage";
import ReaderSettingsForm from "@/components/ReaderSettingsForm";
import { saveColorScheme } from "@/components/saveColorScheme";
import SearchModal from "@/components/SearchModal";
import SyncSettings from "@/components/SyncSettings";
import { COLOR_SCHEMES } from "@/utils/cookies";
import { getDownloadStatus, isOfflineStorageSupported } from "@/utils/offline";
import { packKey } from "@/utils/packs";
import useColorScheme from "@/utils/useColorScheme";

export interface SettingsResources {
  chapters: GetChaptersResponse;
  translations: GetTranslationsResponse;
  languages: GetLanguagesResponse;
  tafsirs: GetTafsirsResponse;
  recitations: GetRecitationsResponse;
  hadiths: GetHadithResourcesResponse;
  readerSettings: ReaderSettings;
  playerSettings: PlaySettings;
}

interface Props {
  settingsResources: SettingsResources;
  colorScheme: ColorScheme;
}

export const INSTALL_PROMPT_KEY = "offline-install-prompt-shown";

const SCHEME_ICONS = { light: SunOutlined, sepia: ReadOutlined, dark: MoonOutlined };

const SchemeIcon: React.FC<{ scheme: ColorScheme; className?: string }> = ({ scheme, ...props }) => {
  const Icon = SCHEME_ICONS[scheme];
  return <Icon aria-hidden {...props} />;
};

const NavBar: React.FC<Props> = ({ settingsResources, colorScheme: renderedScheme }) => {
  const t = useTranslations("common");
  const colorScheme = useColorScheme(renderedScheme);
  const responsive = Grid.useBreakpoint();
  const { notification } = App.useApp();
  const [settingsModalOpen, { setTrue: openSettingsModal, setFalse: closeSettingsModal }] = useBoolean(false);
  const [settingsTab, setSettingsTab] = useState("display");
  const { searchMode, openSearch, closeSearch } = useSearchModal();
  const format = useFormatter();
  const packLabel = usePackLabel(settingsResources);

  const openSettings = (tab: string) => {
    setSettingsTab(tab);
    openSettingsModal();
  };

  const getMissingPacks = async (readerSettings: ReaderSettings) => {
    const { text } = await getDownloadStatus();
    const total = settingsResources.chapters.chapters.length;
    return { text, missing: getSettingsPacks(readerSettings).filter((p) => (text[packKey(p)] ?? 0) < total) };
  };

  const notifyOpenStorage = (key: string, title: string, description: string) =>
    notification.info({
      key,
      title,
      description,
      actions: (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            notification.destroy(key);
            openSettings("storage");
          }}
        >
          {t("open-offline-storage")}
        </Button>
      ),
    });

  // Readers who keep content offline are told when their new settings show content they haven't downloaded
  const notifyMissingPacks = async (readerSettings: ReaderSettings) => {
    if (!isOfflineStorageSupported()) {
      return;
    }
    const { text, missing } = await getMissingPacks(readerSettings);
    if (Object.keys(text).length === 0 || missing.length === 0) {
      return;
    }
    notifyOpenStorage(
      "offline-packs-missing",
      t("offline-packs-missing"),
      t("offline-packs-missing-description", { names: format.list(missing.map(packLabel)) }),
    );
  };

  // Installing the app is a good moment to offer the offline downloads, once. Chromium fires appinstalled in the
  // tab; other browsers (iOS Safari) don't, so the first launch from the home screen asks instead.
  const promptOfflineDownloads = async () => {
    // offline, the prompt waits for a launch that can download
    if (!isOfflineStorageSupported() || !navigator.onLine || (await lf.getItem(INSTALL_PROMPT_KEY))) {
      return;
    }
    const { missing } = await getMissingPacks(settingsResources.readerSettings);
    if (missing.length === 0) {
      return;
    }
    await lf.setItem(INSTALL_PROMPT_KEY, true);
    notifyOpenStorage("offline-install-prompt", t("offline-install-prompt"), t("offline-install-prompt-description"));
  };

  useEventListener("appinstalled", promptOfflineDownloads);
  useMount(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      promptOfflineDownloads();
    }
  });

  let modalWidth;
  if (responsive.lg) {
    modalWidth = "60%";
  } else if (responsive.md) {
    modalWidth = "90%";
  }

  return (
    <>
      <Modal
        destroyOnHidden
        open={settingsModalOpen}
        footer={null}
        onCancel={closeSettingsModal}
        width={modalWidth}
        title={t("settings")}
      >
        <Tabs
          activeKey={settingsTab}
          onChange={setSettingsTab}
          items={[
            {
              key: "display",
              label: t("display"),
              children: (
                <ReaderSettingsForm
                  {...settingsResources}
                  onSubmit={(readerSettings) => {
                    notification.success({ title: t("changes-saved") });
                    closeSettingsModal();
                    notifyMissingPacks(readerSettings);
                  }}
                />
              ),
            },
            { key: "storage", label: t("storage"), children: <OfflineStorage {...settingsResources} /> },
            { key: "sync", label: t("sync"), children: <SyncSettings /> },
          ]}
        />
      </Modal>
      <SearchModal
        open={!!searchMode}
        mode={searchMode ?? "quran"}
        onClose={closeSearch}
        width={modalWidth}
        chapters={settingsResources.chapters}
        translations={settingsResources.translations}
        tafsirs={settingsResources.tafsirs}
        hadiths={settingsResources.hadiths}
      />
      <div className="flex justify-between items-center h-full px-4">
        <Link href="/" className="flex items-center h-full">
          <Typography.Title level={3} className="m-0">
            {t("app-name")}
          </Typography.Title>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="text"
            size="large"
            aria-label={t("search")}
            icon={<SearchOutlined aria-hidden className="text-2xl" />}
            onClick={() => openSearch(window.location.pathname.startsWith("/hadiths") ? "hadith" : "quran")}
          />
          <Button
            type="text"
            size="large"
            href="/hadiths"
            aria-label={t("hadith")}
            icon={<BookOutlined aria-hidden className="text-2xl" />}
          />
          <Button
            type="text"
            size="large"
            href="/saved"
            aria-label={t("saved")}
            icon={<HeartOutlined aria-hidden className="text-2xl" />}
          />
          <Dropdown
            trigger={["click"]}
            menu={{
              selectable: true,
              selectedKeys: [colorScheme],
              items: COLOR_SCHEMES.map((scheme) => ({
                key: scheme,
                label: t(`theme-${scheme}`),
                icon: <SchemeIcon scheme={scheme} />,
              })),
              onClick: (item) => saveColorScheme(item.key as ColorScheme),
            }}
          >
            <Button
              type="text"
              size="large"
              aria-label={t("theme")}
              icon={<SchemeIcon scheme={colorScheme} className="text-2xl" />}
            />
          </Dropdown>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "display", label: t("display-settings") },
                { key: "storage", label: t("offline-storage") },
                { key: "sync", label: t("sync-settings") },
              ],
              onClick: (item) => openSettings(item.key),
            }}
          >
            <Button
              type="text"
              size="large"
              aria-label={t("settings")}
              icon={<SettingOutlined aria-hidden className="text-2xl" />}
            />
          </Dropdown>
        </div>
      </div>
    </>
  );
};

export default NavBar;
