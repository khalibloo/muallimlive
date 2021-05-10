import React, { createRef, useState } from "react";
import { Row, Col, Button, Popover, Slider, Space } from "antd";
import { BsVolumeMute, BsVolumeUp } from "react-icons/bs";
import ReactPlayer from "react-player";
import _ from "lodash";
import {
  ColumnHeightOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useBoolean } from "ahooks";

interface Props {
  audioUrls: string[];
  onOpenSettings: () => void;
}
const AudioBar: React.FC<Props> = ({ audioUrls, onOpenSettings }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioRefs = audioUrls.map(() => createRef<ReactPlayer>());

  const prev = () => {
    setIsPlaying(true);
    audioRefs[currentIndex].current?.seekTo(0);
    if (currentIndex > 0) {
      setCurrentIndex((val) => val - 1);
    }
  };
  const next = () => {
    audioRefs[currentIndex].current?.seekTo(0);
    if (currentIndex === audioUrls.length - 1) {
      if (!loop) {
        setIsPlaying(false);
      }
      setCurrentIndex(0);
    } else {
      setIsPlaying(true);
      if (autoScroll) {
        const verseEl = document.getElementById(`v-${currentIndex + 2}`);
        if (verseEl) {
          window.scrollTo({ top: verseEl.offsetTop - 100, behavior: "smooth" });
        }
      }
      setCurrentIndex((val) => val + 1);
    }
  };
  const iconSize = "1.5rem";
  return (
    <>
      {audioUrls.map((url, i) => (
        <ReactPlayer
          key={url}
          controls={false}
          url={url}
          playing={isPlaying && currentIndex === i}
          onEnded={next}
          style={{ display: "none" }}
          stopOnUnmount
          volume={muted ? 0 : volume}
          ref={audioRefs[i]}
        />
      ))}
      <Row justify="center" className="h-full">
        <Col className="h-full w-full max-w-md">
          <Row justify="space-between" align="middle" className="h-full">
            <Col>
              <Button
                className="px-2"
                type={autoScroll ? "primary" : "link"}
                size="large"
                onClick={() => setAutoScroll((val) => !val)}
              >
                <ColumnHeightOutlined style={{ fontSize: iconSize }} />
              </Button>
            </Col>
            <Col>
              <Button
                className="px-2"
                type={loop ? "primary" : "link"}
                size="large"
                onClick={() => setLoop((val) => !val)}
              >
                <SyncOutlined style={{ fontSize: iconSize }} />
              </Button>
            </Col>
            <Col>
              <Button className="px-2" type="link" size="large" onClick={prev}>
                <StepBackwardOutlined style={{ fontSize: iconSize }} />
              </Button>
            </Col>
            <Col>
              <Button
                className="px-2"
                type="link"
                onClick={() => setIsPlaying((val) => !val)}
                size="large"
              >
                {isPlaying ? (
                  <PauseCircleOutlined style={{ fontSize: iconSize }} />
                ) : (
                  <PlayCircleOutlined style={{ fontSize: iconSize }} />
                )}
              </Button>
            </Col>
            <Col>
              <Button
                className="px-2"
                disabled={currentIndex === audioUrls.length - 1 && !loop}
                type="link"
                size="large"
                onClick={next}
              >
                <StepForwardOutlined style={{ fontSize: iconSize }} />
              </Button>
            </Col>
            <Col>
              <Popover
                content={
                  <Space direction="vertical">
                    <div className="h-52 grid place-items-center">
                      <Slider
                        vertical
                        value={volume}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(val) => {
                          setVolume(val);
                          setMuted(false);
                        }}
                        tipFormatter={(val) => ((val || 0) * 100).toFixed(0)}
                      />
                    </div>
                    <Button type="link" onClick={() => setMuted((val) => !val)}>
                      {muted ? (
                        <BsVolumeMute fontSize="2rem" />
                      ) : (
                        <BsVolumeUp fontSize="2rem" />
                      )}
                    </Button>
                  </Space>
                }
                placement="top"
                trigger="click"
              >
                <Button className="px-2" type="link" size="large">
                  <SoundOutlined style={{ fontSize: iconSize }} />
                </Button>
              </Popover>
            </Col>
            <Col>
              <Button
                className="px-2"
                type="link"
                size="large"
                onClick={onOpenSettings}
              >
                <SettingOutlined style={{ fontSize: iconSize }} />
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
};

export default AudioBar;
