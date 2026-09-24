import React from "react";
import { Row, Col, Form, Switch, Typography, Cascader, Button, Alert, Grid } from "antd";
import type { CascaderProps, GetProp } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { sortBy } from "lodash-es";
import { useTranslations } from "next-intl";

import { saveReaderSettings } from "./saveReaderSettings";

interface Props {
  readerSettings: ReaderSettings;
  translations: GetTranslationsResponse;
  languages: GetLanguagesResponse;
  tafsirs: GetTafsirsResponse;
  onSubmit?: () => void;
}

type ShowSearchFilter = Exclude<Exclude<CascaderProps["showSearch"], boolean | undefined>["filter"], undefined>;

const handleCascaderSearch: ShowSearchFilter = (inputValue, path) =>
  path.some((option) => `${option.label}`.toLowerCase().includes(inputValue.toLowerCase()));

const ReaderSettingsForm: React.FC<Props> = ({ readerSettings, languages, tafsirs, translations, onSubmit }) => {
  const t = useTranslations("common");
  const responsive = Grid.useBreakpoint();
  const [form] = Form.useForm<ReaderSettings>();
  const useSplitView = Form.useWatch("splitView", form) ?? readerSettings.splitView;

  const translationTypes = sortBy(
    [
      {
        label: t("arabic"),
        value: "ar",
        children: [
          {
            label: t("indopak-script"),
            value: "indopak",
          },
          {
            label: t("imlaei-script"),
            value: "imlaei",
          },
          {
            label: t("imlaei-simple-script"),
            value: "imlaei_simple",
          },
          {
            label: t("uthmani-script"),
            value: "uthmani",
          },
          {
            label: t("uthmani-simple-script"),
            value: "uthmani_simple",
          },
          {
            label: t("uthmani-tajweed-script"),
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
          "label",
        ),
      })),
    ],
    "label",
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
          name: t("arabic"),
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
          "label",
        ),
      }))
      .filter((l) => l.children && l.children.length > 0),
    "label",
  );

  const combinedTypes = [
    {
      label: t("translations"),
      value: "translation",
      children: translationTypes,
    },
    {
      label: t("tafsirs"),
      value: "tafsir",
      children: tafsirTypes,
    },
  ];

  const handleSubmit = async (values: ReaderSettings) => {
    const hasContent = (item: VerseLayoutItem) => item.content && item.content.length > 0;
    const left = (values.left ?? []).filter(hasContent);
    const right = (values.right ?? []).filter(hasContent);
    // the right pane is hidden when split view is off, so merge its content into the left pane
    const cleanedValues: ReaderSettings = values.splitView
      ? { splitView: true, left, right }
      : { splitView: false, left: [...left, ...right], right: [] };
    await saveReaderSettings(cleanedValues);

    onSubmit?.();
  };

  const paneFields = (pane: "left" | "right"): GetProp<typeof Form.List, "children"> =>
    function PaneFields(fields, { add, remove }) {
      return (
        <>
          {fields.map(({ key, name, ...restField }, i) => (
            <Row key={key} className="mb-2 flex-nowrap" gutter={16}>
              <Col className="grow">
                <Form.Item
                  {...restField}
                  name={[name, "content"]}
                  rules={[{ required: true, message: t("content-required") }]}
                >
                  <Cascader
                    allowClear={false}
                    options={combinedTypes}
                    showSearch={{ filter: handleCascaderSearch }}
                    aria-label={t(`${pane}-pane-content`, { index: i + 1 })}
                  />
                </Form.Item>
              </Col>
              {fields.length > 1 && (
                <Col>
                  <Button
                    danger
                    type="link"
                    aria-label={t(`remove-${pane}-pane-content`, { index: i + 1 })}
                    onClick={() => remove(name)}
                  >
                    <MinusCircleOutlined />
                  </Button>
                </Col>
              )}
            </Row>
          ))}
          <Form.Item>
            <Button
              type="dashed"
              onClick={() => add()}
              block
              icon={<PlusOutlined />}
              aria-label={t(`add-${pane}-pane-content`)}
            >
              {t("add")}
            </Button>
          </Form.Item>
        </>
      );
    };

  let rightPaneSpan = 0;
  if (useSplitView) {
    rightPaneSpan = responsive.md ? 12 : 24;
  }

  return (
    <Form form={form} onFinish={handleSubmit} initialValues={readerSettings} requiredMark={false}>
      <Alert type="info" title={t("split-view-info")} showIcon />
      {useSplitView && !responsive.md && (
        <Alert className="mt-2" type="warning" title={t("mobile-panes-merged")} showIcon />
      )}
      <Form.Item name="splitView" label={t("use-split-view")} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Row gutter={24}>
        <Col span={useSplitView && responsive.md ? 12 : 24}>
          {useSplitView && <Typography.Text strong>{t("left-pane")}</Typography.Text>}
          <Form.List name="left">{paneFields("left")}</Form.List>
        </Col>
        <Col span={rightPaneSpan}>
          <Typography.Text strong>{t("right-pane")}</Typography.Text>
          <Form.List name="right">{paneFields("right")}</Form.List>
        </Col>
      </Row>
      <Row justify="end" className="mt-6">
        <Button htmlType="submit" type="primary" size="large">
          {t("save-changes")}
        </Button>
      </Row>
    </Form>
  );
};

export default ReaderSettingsForm;
