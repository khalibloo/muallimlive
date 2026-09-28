import React from "react";
import { Button, Flex, Form, Row, Segmented, Select, Switch, Typography } from "antd";
import { useTranslations } from "next-intl";

import {
  COLOR_CHOICES,
  TAJWEED_GROUPS,
  toTajweedChoices,
  toTajweedRules,
  type TajweedChoice,
  type TajweedColorChoice,
} from "@/utils/tajweed";
import { saveReaderSettings } from "./saveReaderSettings";

interface Props {
  readerSettings: ReaderSettings;
  onSubmit?: (values: ReaderSettings) => void;
}

interface Values {
  tajweedColors: boolean;
  choices: Record<string, TajweedChoice>;
}

const LOOKS = ["normal", "faded", "hidden"] as const;

const ColorLabel: React.FC<{ color: TajweedColorChoice; label: React.ReactNode }> = ({ color, label }) => (
  <span className="flex items-center gap-2">
    {color !== "none" && (
      <span
        aria-hidden
        className="inline-block size-4 shrink-0 rounded-full"
        style={{ backgroundColor: `var(--palette-${color})` }}
      />
    )}
    {label}
  </span>
);

const TajweedSettings: React.FC<Props> = ({ readerSettings, onSubmit }) => {
  const t = useTranslations("common");
  const [form] = Form.useForm<Values>();

  const colorOptions = COLOR_CHOICES.map((color) => ({ value: color, label: t(`color-${color}`) }));
  const lookOptions = LOOKS.map((look) => ({ value: look, label: t(`tajweed-look-${look}`) }));

  const handleSubmit = async ({ tajweedColors, choices }: Values) => {
    const saved: ReaderSettings = { ...readerSettings, tajweedColors, tajweedRules: toTajweedRules(choices) };
    await saveReaderSettings(saved);
    onSubmit?.(saved);
  };

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      initialValues={{
        tajweedColors: readerSettings.tajweedColors ?? true,
        choices: toTajweedChoices(readerSettings.tajweedRules),
      }}
    >
      <Form.Item name="tajweedColors" label={t("tajweed-colors")} colon={false} valuePropName="checked">
        <Switch />
      </Form.Item>
      {TAJWEED_GROUPS.map((group) => (
        <section key={group.id}>
          <Typography.Title level={5}>{t(`tajweed-group-${group.id}`)}</Typography.Title>
          {group.rules.map((rule) => {
            const name = t(`tajweed-rule-${rule.id}`);
            return (
              <Form.Item key={rule.id} label={name} colon={false}>
                <Flex gap="middle" wrap>
                  <Form.Item noStyle name={["choices", rule.id, "color"]}>
                    <Select
                      className="min-w-40"
                      aria-label={t("tajweed-color-for", { rule: name })}
                      showSearch={{ optionFilterProp: "label" }}
                      options={colorOptions}
                      optionRender={(option) => (
                        <ColorLabel color={option.value as TajweedColorChoice} label={option.label} />
                      )}
                      labelRender={({ value, label }) => (
                        <ColorLabel color={value as TajweedColorChoice} label={label} />
                      )}
                    />
                  </Form.Item>
                  <Form.Item noStyle name={["choices", rule.id, "look"]}>
                    <Segmented
                      name={`tajweed-look-${rule.id}`}
                      aria-label={t("tajweed-look-for", { rule: name })}
                      options={lookOptions}
                    />
                  </Form.Item>
                </Flex>
              </Form.Item>
            );
          })}
        </section>
      ))}
      <Row justify="end" className="mt-6 gap-4">
        <Button size="large" onClick={() => form.setFieldsValue({ tajweedColors: true, choices: toTajweedChoices() })}>
          {t("reset-to-defaults")}
        </Button>
        <Button htmlType="submit" type="primary" size="large">
          {t("save-changes")}
        </Button>
      </Row>
    </Form>
  );
};

export default TajweedSettings;
