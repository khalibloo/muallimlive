import React, { createRef, useState } from "react";
import { Row, Col, Button, Popover, Slider, Space } from "antd";
import { BsVolumeMute, BsVolumeUp } from "react-icons/bs";
import ReactPlayer from "react-player";
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
import { VirtuosoHandle } from "react-virtuoso";

interface Props {
  audioUrls: string[];
  start: number;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  muted: boolean;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenSettings: () => void;
  virtualListRef: React.RefObject<VirtuosoHandle>;
}

const AudioBar: React.FC<Props> = ({
  audioUrls,
  start,
  isPlaying,
  setIsPlaying,
  muted,
  setMuted,
  volume,
  setVolume,
  onOpenSettings,
  virtualListRef,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loop, setLoop] = useState(false);

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
        virtualListRef.current?.scrollToIndex({
          index: currentIndex + start - 1,
          align: "start",
          behavior: "smooth",
        });
      }
      setCurrentIndex((val) => val + 1);
    }
  };
  const iconStyle = { fontSize: "1.5rem" };
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
                <ColumnHeightOutlined style={iconStyle} />
              </Button>
            </Col>
            <Col>
              <Button
                className="px-2"
                type={loop ? "primary" : "link"}
                size="large"
                onClick={() => setLoop((val) => !val)}
              >
                <SyncOutlined style={iconStyle} />
              </Button>
            </Col>
            <Col>
              <Button className="px-2" type="link" size="large" onClick={prev}>
                <StepBackwardOutlined style={iconStyle} />
              </Button>
            </Col>
            <Col>
              <Button className="px-2" type="link" onClick={() => setIsPlaying((val) => !val)} size="large">
                {isPlaying ? <PauseCircleOutlined style={iconStyle} /> : <PlayCircleOutlined style={iconStyle} />}
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
                <StepForwardOutlined style={iconStyle} />
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
                        tooltip={{
                          formatter: (val) => ((val || 0) * 100).toFixed(0),
                        }}
                      />
                    </div>
                    <Button type="link" onClick={() => setMuted((val) => !val)}>
                      {muted ? <BsVolumeMute fontSize="2rem" /> : <BsVolumeUp fontSize="2rem" />}
                    </Button>
                  </Space>
                }
                placement="top"
                trigger="click"
              >
                <Button className="px-2" type="link" size="large">
                  <SoundOutlined style={iconStyle} />
                </Button>
              </Popover>
            </Col>
            <Col>
              <Button className="px-2" type="link" size="large" onClick={onOpenSettings}>
                <SettingOutlined style={iconStyle} />
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
};

export default AudioBar;
