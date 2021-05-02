import React, { useEffect } from "react";
import {
  Typography,
  Row,
  Col,
  Menu,
  Dropdown,
  Drawer,
  Modal,
  Button,
} from "antd";
import {
  GlobalOutlined,
  MenuOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import { useResponsive } from "ahooks";
import Link from "next/link";

interface Props {}
const NavBar: React.FC<Props> = () => {
  const langMenu = (
    <Menu onClick={(item) => {}}>
      <Menu.Item key="en-US">English</Menu.Item>
      <Menu.Item key="fr-FR">Français</Menu.Item>
    </Menu>
  );

  return (
    <>
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
              <Dropdown overlay={langMenu} trigger={["click"]}>
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
