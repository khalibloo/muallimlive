"use client";

import { useState } from "react";
import { App, Button, Dropdown, Grid, Modal, Tabs, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useBoolean } from "ahooks";
import { useTranslations } from "next-intl";

import ReaderSettingsForm from "@/components/ReaderSettingsForm";

export interface SettingsResources {
  translations: GetTranslationsResponse;
  languages: GetLanguagesResponse;
  tafsirs: GetTafsirsResponse;
  recitations: GetRecitationsResponse;
  readerSettings: ReaderSettings;
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
                  onSubmit={() => {
                    notification.success({ title: t("changes-saved") });
                    closeSettingsModal();
                  }}
                />
              ),
            },
            { key: "storage", label: t("storage"), children: <span>{t("coming-soon")}</span> },
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
            onClick: (item) => {
              setSettingsTab(item.key);
              openSettingsModal();
            },
          }}
        >
          <Button type="text" size="large" aria-label={t("settings")} icon={<SettingOutlined className="text-2xl" />} />
        </Dropdown>
      </div>
    </>
  );
};

export default NavBar;
