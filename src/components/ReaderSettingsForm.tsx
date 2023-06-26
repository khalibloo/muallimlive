import React, { useState } from "react";
import { Row, Col, Form, Switch, Typography, Cascader, Button, Alert } from "antd";
import { useForm } from "antd/lib/form/Form";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useResponsive } from "ahooks";
import { sortBy } from "lodash";
import { DefaultOptionType } from "antd/es/cascader";
import { FormListProps } from "antd/es/form";

import { saveReaderSettings } from "./saveReaderSettings";

interface Props {
  readerSettings: ReaderSettings;
  translations: GetTranslationsResponse;
  languages: GetLanguagesResponse;
  tafsirs: GetTafsirsResponse;
  onSubmit?: () => void;
}
const ReaderSettingsForm: React.FC<Props> = ({ readerSettings, languages, tafsirs, translations, onSubmit }) => {
  const responsive = useResponsive();
  const [form] = useForm<ReaderSettings>();
  const [useSplitView, setUseSplitView] = useState(readerSettings.splitView);

  const translationTypes = sortBy(
    [
      {
        label: "Arabic",
        value: "ar",
        children: [
          {
            label: "Indopak Script",
            value: "indopak",
          },
          {
            label: "Imlaei Script",
            value: "imlaei",
          },
          {
            label: "Imlaei Simple Script",
            value: "imlaei_simple",
          },
          {
            label: "Uthmani Script",
            value: "uthmani",
          },
          {
            label: "Uthmani Simple Script",
            value: "uthmani_simple",
          },
          {
            label: "Uthmani Tajweed Script",
            value: "uthmani_tajweed",
          },
        ],
      },
      ...languages.languages.map((l) => ({
        label: l.translated_name.name,
        value: l.iso_code,
        children: sortBy(
          translations.translations
            .filter((t) => t.language_name.toLowerCase() === l.name.toLowerCase())
            .map((t) => ({ label: t.translated_name.name, value: t.id })),
          "label"
        ),
      })),
    ],
    "label"
  );

  const tafsirTypes = sortBy(
    [
      ...languages.languages,
      {
        id: 0,
        name: "Arabic",
        iso_code: "ar",
        native_name: "Arabic",
        direction: "rtl",
        translations_count: 0,
        translated_name: {
          name: "Arabic",
          language_name: "english",
        },
      },
    ]
      .map((l) => ({
        label: l.translated_name.name,
        value: l.iso_code,
        children: sortBy(
          tafsirs.tafsirs
            .filter((t) => t.language_name.toLowerCase() === l.name.toLowerCase())
            .map((t) => ({ label: t.translated_name.name, value: t.id })),
          "label"
        ),
      }))
      .filter((l) => l.children && l.children.length > 0),
    "label"
  );

  const combinedTypes = [
    {
      label: "Translations",
      value: "translation",
      children: translationTypes,
    },
    {
      label: "Tafsirs",
      value: "tafsir",
      children: tafsirTypes,
    },
  ];

  const handleSubmit = async (values: ReaderSettings) => {
    const cleanedValues = {
      ...values,
      left: values.left.filter((item) => item.content && item.content.length > 0),
      right: values.right.filter((item) => item.content && item.content.length > 0),
    };
    await saveReaderSettings(cleanedValues);

    form.resetFields();
    onSubmit?.();
  };

  const handleCascaderSearch = (inputValue: string, path: DefaultOptionType[]) =>
    path.some((option) => (option.label as string).toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

  const paneFields: FormListProps["children"] = (fields, { add, remove }) => (
    <>
      {fields.map(({ key, name, ...restField }) => (
        <Row key={key} className="mb-2 flex-nowrap" gutter={16}>
          <Col className="flex-grow">
            <Form.Item
              {...restField}
              name={[name, "content"]}
              rules={[{ required: true, message: "Please select content" }]}
            >
              <Cascader allowClear={false} options={combinedTypes} showSearch={{ filter: handleCascaderSearch }} />
            </Form.Item>
          </Col>
          {fields.length > 1 && (
            <Col>
              <Button danger type="link" onClick={() => remove(name)}>
                <MinusCircleOutlined />
              </Button>
            </Col>
          )}
        </Row>
      ))}
      <Form.Item>
        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
          Add
        </Button>
      </Form.Item>
    </>
  );

  return (
    <Form form={form} onFinish={handleSubmit} initialValues={readerSettings} requiredMark={false}>
      <Alert
        type="info"
        message="Split view allows you to have content on right and left sides of your screen"
        showIcon
      />
      {useSplitView && !responsive.md && (
        <Alert
          className="mt-2"
          type="warning"
          message="Right and left panes are merged if on a mobile screen"
          showIcon
        />
      )}
      <Form.Item name="splitView" label="Use Split View" valuePropName="checked">
        <Switch checked={useSplitView} onChange={(checked) => setUseSplitView(checked)} />
      </Form.Item>
      <Row gutter={24}>
        <Col span={useSplitView && responsive.md ? 12 : 24}>
          {useSplitView && <Typography.Text strong>Left Pane</Typography.Text>}
          <Form.List name="left">{paneFields}</Form.List>
        </Col>
        <Col span={useSplitView ? (responsive.md ? 12 : 24) : 0}>
          <Typography.Text strong>Right Pane</Typography.Text>
          <Form.List name="right">{paneFields}</Form.List>
        </Col>
      </Row>
      <Row justify="end" className="mt-6">
        <Button htmlType="submit" type="primary" size="large">
          Save Changes
        </Button>
      </Row>
    </Form>
  );
};

export default ReaderSettingsForm;
