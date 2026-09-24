import React from "react";
import { Row, Col, Form, Button, Select, Checkbox, InputNumber } from "antd";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("common");
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
            label={t("audio-reciter")}
            rules={[{ required: true, message: t("reciter-required") }]}
          >
            <Select placeholder={t("please-select")} options={reciterOptions} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="hideTafsirs" valuePropName="checked">
        <Checkbox>{t("hide-tafsirs")}</Checkbox>
      </Form.Item>
      <Row gutter={24}>
        <Col span={12} xs={24} sm={24} md={20} lg={20}>
          <Form.Item label={t("recite")} name="mode" rules={[{ required: true, message: t("mode-required") }]}>
            <Select
              placeholder={t("please-select")}
              options={[
                { value: "surah", label: t("entire-surah") },
                { value: "verse-range", label: t("verse-range") },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
      {mode === "verse-range" && (
        <Row gutter={24}>
          <Col>
            <Form.Item label={t("from-verse")} name="start" rules={[{ required: true, message: t("start-required") }]}>
              <InputNumber min={1} max={end} />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label={t("to-verse")} name="end" rules={[{ required: true, message: t("end-required") }]}>
              <InputNumber min={start} max={verseCount} />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Row justify="end" className="mt-6">
        <Button htmlType="submit" type="primary" size="large">
          {t("play")}
        </Button>
      </Row>
    </Form>
  );
};

export default PlayForm;
