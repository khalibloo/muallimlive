import React, { useState } from "react";
import {
  Typography,
  Row,
  Col,
  Menu,
  Dropdown,
  Modal,
  Tabs,
  notification,
} from "antd";
import { GlobalOutlined, SettingOutlined } from "@ant-design/icons";

import Link from "next/link";
import { useBoolean, useResponsive } from "ahooks";
import ReaderSettingsForm from "@/components/ReaderSettingsForm";

interface Props {}
const NavBar: React.FC<Props> = () => {
  const responsive = useResponsive();
  const [
    settingsModalOpen,
    { setTrue: openSettingsModal, setFalse: closeSettingsModal },
  ] = useBoolean(false);
  const [settingsTab, setSettingsTab] = useState("display");

  const langMenu = (
    <Menu onClick={(item) => {}}>
      <Menu.Item key="en-US">English</Menu.Item>
      <Menu.Item key="fr-FR">Français</Menu.Item>
    </Menu>
  );

  const settingsMenu = (
    <Menu
      onClick={(item) => {
        openSettingsModal();
        setSettingsTab(item.key);
      }}
    >
      <Menu.Item key="display">Display Settings</Menu.Item>
      <Menu.Item key="storage">Offline Storage</Menu.Item>
      <Menu.Item key="sync">Sync Settings</Menu.Item>
    </Menu>
  );

  let modalWidth;
  if (responsive?.lg) {
    modalWidth = "60%";
  } else if (responsive?.md) {
    modalWidth = "90%";
  }

  return (
    <>
      <Modal
        open={settingsModalOpen}
        maskClosable={false}
        footer={null}
        onCancel={closeSettingsModal}
        width={modalWidth}
      >
        <Tabs activeKey={settingsTab} onChange={setSettingsTab}>
          <Tabs.TabPane key="display" tab="Display">
            <ReaderSettingsForm
              onSubmit={() => {
                notification.success({ message: "Changes Saved Successfully" });
              }}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="storage" tab="Storage">
            <span>Coming soon</span>
          </Tabs.TabPane>
          <Tabs.TabPane key="sync" tab="Sync">
            <span>Coming soon</span>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
      <Row justify="space-between" align="middle" className="h-full">
        <Col className="h-full">
          <Menu
            mode="horizontal"
            className="bg-transparent border-none h-full"
            selectedKeys={[]}
          >
            <Menu.Item key="1" className="h-full block">
              <Link href="/">
                <a className="h-full">
                  <Row align="middle" className="h-full">
                    <Col>
                      <Typography.Title level={3} className="m-0">
                        MuallimLive
                      </Typography.Title>
                    </Col>
                  </Row>
                </a>
              </Link>
            </Menu.Item>
          </Menu>
        </Col>
        <Col className="h-full">
          <Menu
            mode="horizontal"
            className="bg-transparent border-none h-full"
            selectable={false}
          >
            <Menu.Item key="lang" className="m-0 h-full">
              <Dropdown overlay={langMenu} trigger={["click"]}>
                <div className="px-2">
                  <GlobalOutlined className="text-2xl" />
                </div>
              </Dropdown>
            </Menu.Item>
            <Menu.Item key="settings" className="m-0 h-full">
              <Dropdown overlay={settingsMenu} trigger={["click"]}>
                <div className="px-2">
                  <SettingOutlined className="text-2xl" />
                </div>
              </Dropdown>
            </Menu.Item>
          </Menu>
        </Col>
      </Row>
    </>
  );
};

export default NavBar;
