import React from "react";
import { NextPage } from "next";
import { Button, Col, Drawer, Menu, Row, Tooltip, Typography } from "antd";
import { useRouter } from "next/router";

import usePosts from "@/queries/usePosts";
import BasicLayout from "@/layouts/BasicLayout";
import Loader from "@/components/Loader";

import chaptersData from "@/data/chapters.json";
import Link from "next/link";
import { useBoolean } from "ahooks";
import { MenuOutlined } from "@ant-design/icons";

interface Props {}

const ChapterPage: NextPage<Props> = ({}) => {
  const router = useRouter();
  const q = router.query;
  const id = q.id as string;
  const chapterNumber = parseInt(id, 10);
  const [
    chaptersDrawerOpen,
    { setTrue: openChaptersDrawer, setFalse: closeChaptersDrawer },
  ] = useBoolean(false);

  const { data, isLoading } = usePosts();
  if (isLoading) {
    return (
      <BasicLayout pageTitle="Privacy Policy">
        <Loader showRandomMessage />
      </BasicLayout>
    );
  }
  const currentChapter = chaptersData.chapters.find(
    (c) => c.id === chapterNumber,
  );
  return (
    <BasicLayout noPadding>
      <Drawer
        placement="left"
        closable={false}
        bodyStyle={{ padding: 0 }}
        onClose={closeChaptersDrawer}
        visible={chaptersDrawerOpen}
      >
        <Menu theme="dark" selectedKeys={[id]} mode="inline">
          {chaptersData.chapters.map((chapter) => (
            <Menu.Item key={chapter.id} style={{ textAlign: "left" }}>
              <Link href={`/chapters/${chapter.id}`}>
                <Tooltip
                  overlayClassName="capitalize"
                  title={chapter.translated_name.name}
                  placement="right"
                >
                  <Typography.Text className="capitalize">
                    <span className="mr-3">{chapter.id}</span>
                    {chapter.name_simple}
                  </Typography.Text>
                </Tooltip>
              </Link>
            </Menu.Item>
          ))}
        </Menu>
      </Drawer>
      <div className="fixed shadow-md bg-444 w-full z-10">
        <div className="relative h-full py-4">
          <Button
            className="absolute left-0 top-0 h-full border-none rounded-none"
            onClick={openChaptersDrawer}
            icon={<MenuOutlined className="text-xl" />}
          >
            Chapters
          </Button>
          <Typography.Title level={2} className="capitalize text-center m-0">
            {currentChapter?.name_simple} -{" "}
            {currentChapter?.translated_name.name}
          </Typography.Title>
        </div>
      </div>
      <Row className="mt-20 py-9" justify="center">
        <Col span={22}>
          <div className="h-screen">Content</div>
        </Col>
      </Row>
    </BasicLayout>
  );
};

export default ChapterPage;
