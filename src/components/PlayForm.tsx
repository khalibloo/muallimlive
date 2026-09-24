import React from "react";
import { Row, Col, Form, Button, Select, Checkbox, InputNumber } from "antd";

import { savePlayerSettings } from "./savePlayerSettings";

export interface PlayConfig extends PlaySettings {
  start: number;
  end: number;
}

interface FormValues {
  reciter: number;
  hideTafsirs: boolean;
  mode: "surah" | "verse-range";
  start: number;
  end: number;
}

interface Props {
  recitations: GetRecitationsResponse;
  verseCount: number;
  playSettings: PlaySettings;
  onSubmit?: (playSettings: PlayConfig) => void;
}

const PlayForm: React.FC<Props> = ({ recitations, verseCount, playSettings, onSubmit }) => {
  const [form] = Form.useForm<FormValues>();
  const mode = Form.useWatch("mode", form);
  const start = Form.useWatch("start", form) ?? 1;
  const end = Form.useWatch("end", form) ?? verseCount;

  const reciterOptions = [...(recitations?.recitations ?? [])]
    .sort((a, b) => (a.translated_name.name > b.translated_name.name ? 1 : -1))
    .map((r) => ({
      value: r.id,
      label: r.style ? `${r.translated_name.name} (${r.style})` : r.translated_name.name,
    }));

  const handleSubmit = async (values: FormValues) => {
    const cleanedValues: PlaySettings = {
      reciter: values.reciter,
      hideTafsirs: values.hideTafsirs,
    };

    await savePlayerSettings(cleanedValues);
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
        mode: "surah",
        start: 1,
        end: verseCount,
      }}
      requiredMark={false}
      layout="vertical"
    >
      <Row>
        <Col xs={24} md={20}>
          <Form.Item
            name="reciter"
            label="Audio Reciter"
            rules={[{ required: true, message: "Please select reciter" }]}
          >
            <Select placeholder="Please select" options={reciterOptions} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="hideTafsirs" valuePropName="checked">
        <Checkbox>Hide Tafsirs</Checkbox>
      </Form.Item>
      <Row gutter={24}>
        <Col span={12} xs={24} sm={24} md={20} lg={20}>
          <Form.Item label="Recite" name="mode" rules={[{ required: true, message: "Please select recitation mode" }]}>
            <Select
              placeholder="Please select"
              options={[
                { value: "surah", label: "Entire Surah" },
                { value: "verse-range", label: "Verse Range" },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
      {mode === "verse-range" && (
        <Row gutter={24}>
          <Col>
            <Form.Item label="From Verse" name="start" rules={[{ required: true, message: "Please select start" }]}>
              <InputNumber min={1} max={end} />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label="To Verse" name="end" rules={[{ required: true, message: "Please select end" }]}>
              <InputNumber min={start} max={verseCount} />
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
