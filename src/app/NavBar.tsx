"use client";

import { useState } from "react";
import { App, Button, Dropdown, Grid, Modal, Tabs, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useBoolean } from "ahooks";
import { useFormatter, useTranslations } from "next-intl";

import OfflineStorage, { getSettingsPacks, usePackLabel } from "@/components/OfflineStorage";
import ReaderSettingsForm from "@/components/ReaderSettingsForm";
import { getDownloadStatus, isOfflineStorageSupported } from "@/utils/offline";
import { packKey } from "@/utils/packs";

export interface SettingsResources {
  chapters: GetChaptersResponse;
  translations: GetTranslationsResponse;
  languages: GetLanguagesResponse;
  tafsirs: GetTafsirsResponse;
  recitations: GetRecitationsResponse;
  readerSettings: ReaderSettings;
  playerSettings: PlaySettings;
}

interface Props {
  settingsResources: SettingsResources;
}

const NavBar: React.FC<Props> = ({ settingsResources }) => {
  const t = useTranslations("common");
  const responsive = Grid.useBreakpoint();
  const { notification } = App.useApp();
  const [settingsModalOpen, { setTrue: openSettingsModal, setFalse: closeSettingsModal }] = useBoolean(false);
  const [settingsTab, setSettingsTab] = useState("display");
  const format = useFormatter();
  const packLabel = usePackLabel(settingsResources);

  const openSettings = (tab: string) => {
    setSettingsTab(tab);
    openSettingsModal();
  };

  // Readers who keep content offline are told when their new settings show content they haven't downloaded
  const notifyMissingPacks = async (readerSettings: ReaderSettings) => {
    if (!isOfflineStorageSupported()) {
      return;
    }
    const { text } = await getDownloadStatus();
    const total = settingsResources.chapters.chapters.length;
    const missing = getSettingsPacks(readerSettings).filter((p) => (text[packKey(p)] ?? 0) < total);
    if (Object.keys(text).length === 0 || missing.length === 0) {
      return;
    }
    const key = "offline-packs-missing";
    notification.info({
      key,
      title: t("offline-packs-missing"),
      description: t("offline-packs-missing-description", { names: format.list(missing.map(packLabel)) }),
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
  };

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
            { key: "sync", label: t("sync"), children: <span>{t("coming-soon")}</span> },
          ]}
        />
      </Modal>
      <div className="flex justify-between items-center h-full px-4">
        <Link href="/" className="flex items-center h-full">
          <Typography.Title level={3} className="m-0">
            {t("app-name")}
          </Typography.Title>
        </Link>
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
    </>
  );
};

export default NavBar;
