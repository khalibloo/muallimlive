"use client";

import React from "react";
import { Button, Modal, Popconfirm, Typography } from "antd";
import { useNetwork } from "ahooks";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { loginUrl, type ConnectChoice, type PendingConnect } from "@/utils/sync";

interface Props {
  pending?: PendingConnect;
  onChoose: (choice: ConnectChoice) => void;
  /** Set when Google needs a new sign-in */
  reauthEmail?: string;
  onStop: () => void;
  onClearAndStop: () => void;
}

// A choice is required: no close button, and neither Escape nor the mask dismisses them
const REQUIRED = { closable: false, mask: { closable: false }, keyboard: false } as const;

const SyncDialogs: React.FC<Props> = ({ pending, onChoose, reauthEmail, onStop, onClearAndStop }) => {
  const t = useTranslations("common");
  const { online } = useNetwork();
  const pathname = usePathname();
  const otherAccount = pending?.reason === "other-account";

  return (
    <>
      <Modal
        {...REQUIRED}
        open={!!pending}
        title={t("sync-choice-title")}
        footer={[
          <Button key="replace" danger onClick={() => onChoose("replace")}>
            {otherAccount ? t("sync-discard-device-data") : t("sync-use-drive-only")}
          </Button>,
          <Button key="merge" type="primary" onClick={() => onChoose("merge")}>
            {t("sync-merge")}
          </Button>,
        ]}
      >
        {pending && (
          <Typography.Paragraph>
            {otherAccount
              ? t("sync-choice-other-account", { email: pending.email })
              : t("sync-choice-unknown-account", { email: pending.email })}
          </Typography.Paragraph>
        )}
      </Modal>
      <Modal
        {...REQUIRED}
        open={!pending && !!reauthEmail}
        title={t("sync-reauth-title")}
        footer={[
          <Popconfirm
            key="clear"
            title={t("sync-clear-and-stop-confirm")}
            okType="danger"
            okText={t("yes")}
            cancelText={t("no")}
            onConfirm={onClearAndStop}
          >
            <Button danger>{t("sync-clear-and-stop")}</Button>
          </Popconfirm>,
          <Button key="stop" onClick={onStop}>
            {t("sync-stop")}
          </Button>,
          // a disabled link button is an <a> without a role, so offline it's a plain button
          <Button key="sign-in" type="primary" href={online ? loginUrl(pathname) : undefined} disabled={!online}>
            {t("sync-sign-in-again")}
          </Button>,
        ]}
      >
        <Typography.Paragraph>{t("sync-reauth", { email: reauthEmail ?? "" })}</Typography.Paragraph>
        {!online && <Typography.Paragraph type="secondary">{t("sync-offline")}</Typography.Paragraph>}
      </Modal>
    </>
  );
};

export default SyncDialogs;
