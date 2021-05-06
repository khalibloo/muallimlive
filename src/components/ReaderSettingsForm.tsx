import React, { useState } from "react";
import {
  Row,
  Col,
  Form,
  Switch,
  Typography,
  Cascader,
  Button,
  Alert,
} from "antd";
import { useForm } from "antd/lib/form/Form";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import _ from "lodash";
import lf from "localforage";

import useTranslations from "@/queries/useTranslations";
import useLanguages from "@/queries/useLanguages";
import useTafsirs from "@/queries/useTafsirs";
import Loader from "./Loader";
import config from "@/utils/config";
import { useResponsive } from "ahooks";

interface Props {
  onSubmit?: () => void;
}
const ReaderSettingsForm: React.FC<Props> = ({ onSubmit }) => {
  const responsive = useResponsive();
  const [form] = useForm();
  const [useSplitView, setUseSplitView] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>();
  const {
    data: translationsData,
    isLoading: translationsLoading,
  } = useTranslations();
  const { data: tafsirsData, isLoading: tafsirsLoading } = useTafsirs();
  const { data: languagesData, isLoading: languagesLoading } = useLanguages();

  React.useEffect(() => {
    lf.getItem("reader-settings").then((settings) => {
      // TODO: validate object somehow
      const defaultSettings = config.defaultReaderSettings;
      if (settings) {
        setSettings(settings as ReaderSettings);
        setUseSplitView((settings as ReaderSettings).splitView);
      } else {
        setSettings(defaultSettings);
        lf.setItem("reader-settings", defaultSettings);
        setUseSplitView(defaultSettings.splitView);
      }
    });
  }, []);

  const optionsSortFn = (a, b) => (a.label > b.label ? 1 : -1);
  const translationTypes = languagesData
    ? [
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
        ...languagesData.languages.map((l) => ({
          label: l.translated_name.name,
          value: l.iso_code,
          children: translationsData?.translations
            .filter(
              (t) => t.language_name.toLowerCase() === l.name.toLowerCase(),
            )
            .map((t) => ({ label: t.translated_name.name, value: t.id }))
            .sort(optionsSortFn),
        })),
      ].sort(optionsSortFn)
    : [];

  const tafsirTypes = languagesData
    ? [
        ...languagesData.languages,
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
          children: tafsirsData?.tafsirs
            .filter(
              (t) => t.language_name.toLowerCase() === l.name.toLowerCase(),
            )
            .map((t) => ({ label: t.translated_name.name, value: t.id }))
            .sort(optionsSortFn),
        }))
        .filter((l) => l.children && l.children.length > 0)
        .sort(optionsSortFn)
    : [];

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

  const handleSubmit = (values) => {
    const cleanedValues = {
      ...values,
      left: values.left.filter(
        (item) => item.content && item.content.length > 0,
      ),
      right: values.right.filter(
        (item) => item.content && item.content.length > 0,
      ),
    };
    setSettings(cleanedValues);
    lf.setItem("reader-settings", cleanedValues);
    form.resetFields();
    onSubmit?.();
  };

  const handleCascaderSearch = (inputValue, path) =>
    path.some(
      (option) =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1,
    );

  const paneFields = (fields, { add, remove }) => (
    <>
      {fields.map(({ key, name, fieldKey, ...restField }) => (
        <Row key={key} className="mb-2 flex-nowrap" gutter={16}>
          <Col className="flex-grow">
            <Form.Item
              {...restField}
              name={[name, "content"]}
              fieldKey={[fieldKey, "content"]}
            >
              <Cascader
                options={combinedTypes}
                showSearch={{ filter: handleCascaderSearch }}
              />
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
        <Button
          type="dashed"
          onClick={() => add()}
          block
          icon={<PlusOutlined />}
        >
          Add
        </Button>
      </Form.Item>
    </>
  );

  if (!settings) {
    // settings will be fed to form as initial values
    // so we must wait for localforage to load settings
    return <Loader />;
  }

  return (
    <Form form={form} onFinish={handleSubmit} initialValues={settings}>
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
      <Form.Item name="splitView" label="Use Spit View" valuePropName="checked">
        <Switch
          checked={useSplitView}
          onChange={(checked) => setUseSplitView(checked)}
        />
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
        <Form.Item>
          <Button htmlType="submit" type="primary" size="large">
            Save Changes
          </Button>
        </Form.Item>
      </Row>
    </Form>
  );
};

export default ReaderSettingsForm;
