import React, { useState } from "react";
import { Row, Col, Form, Button, Select, Checkbox, InputNumber } from "antd";
import { useForm } from "antd/lib/form/Form";
import _ from "lodash";

import lf from "@/utils/localforage";
import useRecitations from "@/queries/useRecitations";

export interface PlayConfig extends PlaySettings {
  start: number;
  end: number;
}
interface Props {
  verseCount: number;
  playSettings: PlaySettings;
  onSubmit?: (playSettings: PlayConfig) => void;
}
const PlayForm: React.FC<Props> = ({ verseCount, playSettings, onSubmit }) => {
  const [form] = useForm();
  const [recitationMode, setRecitationMode] = useState<"surah" | "verse-range">("surah");
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(verseCount);
  const { data: recitations, isLoading: recitationsLoading } = useRecitations();

  const recitersSortFn = (a, b) => (a.translated_name.name > b.translated_name.name ? 1 : -1);

  const handleSubmit = (values) => {
    const cleanedValues: PlaySettings = {
      reciter: values.reciter,
      hideTafsirs: values.hideTafsirs,
    };

    lf.setItem("play-settings", cleanedValues);
    form.resetFields();
    onSubmit?.({
      ...cleanedValues,
      start: values.mode === "surah" ? 1 : values.start,
      end: values.mode === "surah" ? verseCount : values.end,
    });
  };

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      initialValues={{
        reciter: playSettings.reciter,
        hideTafsirs: playSettings.hideTafsirs,
        mode: recitationMode,
        start,
        end,
      }}
      requiredMark={false}
      layout="vertical"
    >
      <Row>
        <Col span={12} xs={24} sm={24} md={20} lg={20}>
          <Form.Item
            name="reciter"
            label="Audio Reciter"
            rules={[{ required: true, message: "Please select reciter" }]}
          >
            <Select loading={recitationsLoading} placeholder="Please select">
              {recitations?.recitations.sort(recitersSortFn).map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.translated_name.name} {r.style && <>({r.style})</>}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="hideTafsirs" valuePropName="checked">
        <Checkbox>Hide Tafsirs</Checkbox>
      </Form.Item>
      <Row gutter={24}>
        <Col span={12} xs={24} sm={24} md={20} lg={20}>
          <Form.Item label="Recite" name="mode" rules={[{ required: true, message: "Please select recitation mode" }]}>
            <Select placeholder="Please select" value={recitationMode} onChange={(m) => setRecitationMode(m)}>
              <Select.Option value="surah">Entire Surah</Select.Option>
              <Select.Option value="verse-range">Verse Range</Select.Option>
            </Select>
            {/* <Radio.Group
          buttonStyle="solid"
          value={recitationMode}
          onChange={(e) => setRecitationMode(e.target.value)}
        >
          <Radio.Button value="surah">Entire Surah</Radio.Button>
          <Radio.Button value="verse-range">Verse Range</Radio.Button>
        </Radio.Group> */}
          </Form.Item>
        </Col>
      </Row>
      {recitationMode === "verse-range" && (
        <Row gutter={24}>
          <Col>
            <Form.Item label="From Verse" name="start" rules={[{ required: true, message: "Please select start" }]}>
              <InputNumber min={1} max={end} onChange={setStart} value={start} />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label="To Verse" name="end" rules={[{ required: true, message: "Please select end" }]}>
              <InputNumber min={start} max={verseCount} onChange={setEnd} value={end} />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Row justify="end" className="mt-6">
        <Button htmlType="submit" type="primary" size="large">
          Play
        </Button>
      </Row>
    </Form>
  );
};

export default PlayForm;
