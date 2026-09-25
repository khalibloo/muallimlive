"use client";

import React from "react";
import { App, Button, Flex, Popconfirm, Typography, Upload } from "antd";
import { CloudSyncOutlined, DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useNetwork } from "ahooks";
import { usePathname } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import { loginUrl } from "@/utils/sync";
import { downloadBackup, importData, parseUserDataFile, type UserData } from "@/utils/userData";
import { useSync } from "./SyncProvider";

const DRIVE_APP_SETTINGS = "https://drive.google.com/drive/settings";

const SyncSettings: React.FC = () => {
  const t = useTranslations("common");
  const format = useFormatter();
  const { message, modal } = App.useApp();
  const { online } = useNetwork();
  const pathname = usePathname();
  const { state, syncing, lastError, syncNow, stop, clearDevice, deleteEverywhere } = useSync();

  const importFile = async (file: File) => {
    let data: UserData | undefined;
    try {
      data = parseUserDataFile(JSON.parse(await file.text()));
    } catch {
      data = undefined;
    }
    if (data) {
      message.success(t("import-success", await importData(data)));
    } else {
      message.error(t("import-invalid"));
    }
  };

  const confirmDeleteEverywhere = () =>
    modal.confirm({
      title: t("delete-everywhere-confirm-title"),
      content: t("delete-everywhere-confirm"),
      okText: t("delete-everywhere"),
      okType: "danger",
      cancelText: t("cancel"),
      footer: (_, { OkBtn, CancelBtn }) => (
        <>
          <Button onClick={() => downloadBackup()}>{t("export-first")}</Button>
          <CancelBtn />
          <OkBtn />
        </>
      ),
      onOk: deleteEverywhere,
    });

  return (
    <Flex vertical gap="large">
      <section>
        <Typography.Title level={4}>{t("sync-drive")}</Typography.Title>
        {state ? (
          <Flex vertical gap="small">
            <Typography.Text>{t("sync-syncing-as", { email: state.email })}</Typography.Text>
            <Typography.Text type="secondary">
              {state.lastSyncedAt
                ? t("sync-last-synced", { time: format.relativeTime(state.lastSyncedAt) })
                : t("sync-not-synced-yet")}
            </Typography.Text>
            {lastError && <Typography.Text type="warning">{t("sync-last-failed")}</Typography.Text>}
            <Flex gap="small" wrap>
              <Button icon={<CloudSyncOutlined aria-hidden />} loading={syncing} onClick={syncNow}>
                {t("sync-now")}
              </Button>
              <Popconfirm title={t("sync-stop-confirm")} okText={t("yes")} cancelText={t("no")} onConfirm={stop}>
                <Button>{t("sync-stop")}</Button>
              </Popconfirm>
            </Flex>
          </Flex>
        ) : (
          <Flex vertical gap="small" align="start">
            <Typography.Paragraph>{t("sync-drive-description")}</Typography.Paragraph>
            {/* a disabled link button is an <a> without a role, so offline it's a plain button */}
            <Button type="primary" href={online ? loginUrl(pathname) : undefined} disabled={!online}>
              {t("sync-connect")}
            </Button>
            {!online && <Typography.Text type="secondary">{t("sync-offline")}</Typography.Text>}
          </Flex>
        )}
      </section>
      <section>
        <Typography.Title level={4}>{t("backup")}</Typography.Title>
        <Typography.Paragraph>{t("backup-description")}</Typography.Paragraph>
        <Flex gap="small" wrap>
          <Button icon={<DownloadOutlined aria-hidden />} onClick={() => downloadBackup()}>
            {t("export")}
          </Button>
          <Upload
            accept="application/json,.json"
            showUploadList={false}
            aria-label={t("import")}
            beforeUpload={(file) => {
              importFile(file);
              return false;
            }}
          >
            <Button icon={<UploadOutlined aria-hidden />}>{t("import")}</Button>
          </Upload>
        </Flex>
      </section>
      <section>
        <Typography.Title level={4}>{t("clear-data")}</Typography.Title>
        <Flex gap="small" wrap>
          <Popconfirm
            title={state ? t("clear-device-syncing-confirm") : t("clear-device-confirm")}
            okType="danger"
            okText={t("yes")}
            cancelText={t("no")}
            onConfirm={clearDevice}
          >
            <Button danger>{t("clear-device")}</Button>
          </Popconfirm>
          {state && (
            <Button danger onClick={confirmDeleteEverywhere}>
              {t("delete-everywhere")}
            </Button>
          )}
        </Flex>
        {state && (
          <Typography.Paragraph type="secondary" className="mt-2">
            {t.rich("delete-everywhere-drive-note", {
              link: (chunks) => (
                <a href={DRIVE_APP_SETTINGS} target="_blank" rel="noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </Typography.Paragraph>
        )}
      </section>
    </Flex>
  );
};

export default SyncSettings;
