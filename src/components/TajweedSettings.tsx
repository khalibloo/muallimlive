import React, { useId, useState } from "react";
import { Button, Flex, Form, Select, Switch, Typography } from "antd";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import {
  COLOR_CHOICES,
  TAJWEED_GROUPS,
  tajweedStyles,
  toTajweedChoices,
  toTajweedRules,
  type TajweedChoice,
  type TajweedColorChoice,
} from "@/utils/tajweed";
import { TAJWEED_SAMPLES } from "@/utils/tajweedSamples";
import SafeHtml from "./SafeHtml";
import { saveReaderSettings } from "./saveReaderSettings";

interface Props {
  readerSettings: ReaderSettings;
  onSubmit?: (values: ReaderSettings) => void;
  onCancel?: () => void;
}

interface Values {
  tajweedColors: boolean;
  choices: Record<string, TajweedChoice>;
}

const LOOKS = ["normal", "faded", "hidden"] as const;

/** A fieldset and legend that group the fields for assistive tech without drawing anything */
const FIELDSET = "m-0 min-w-0 border-0 p-0";
const LEGEND = "m-0 w-auto border-0 p-0 text-base leading-normal";

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

const TajweedSettings: React.FC<Props> = ({ readerSettings, onSubmit, onCancel }) => {
  const t = useTranslations("common");
  const id = useId();
  const [form] = Form.useForm<Values>();
  const initialValues: Values = {
    tajweedColors: readerSettings.tajweedColors ?? true,
    choices: toTajweedChoices(readerSettings.tajweedRules),
  };
  const choices = Form.useWatch("choices", form) ?? initialValues.choices;
  const tajweedColors = Form.useWatch("tajweedColors", form) ?? initialValues.tajweedColors;
  const [sampleIndex, setSampleIndex] = useState(0);
  const sample = TAJWEED_SAMPLES[sampleIndex];
  const preview = tajweedStyles(choices);

  const colorOptions = COLOR_CHOICES.map((color) => ({ value: color, label: t(`color-${color}`) }));
  const lookOptions = LOOKS.map((look) => ({ value: look, label: t(`tajweed-look-${look}`) }));

  /** Keeps the previewed verse if it shows the rule, or switches to the first one that does */
  const showRule = (ruleId: string) =>
    setSampleIndex((index) =>
      TAJWEED_SAMPLES[index].rules.some((r) => r === ruleId)
        ? index
        : TAJWEED_SAMPLES.findIndex((s) => s.rules.some((r) => r === ruleId)),
    );

  const handleSubmit = async (values: Values) => {
    const saved: ReaderSettings = {
      ...readerSettings,
      tajweedColors: values.tajweedColors,
      tajweedRules: toTajweedRules(values.choices),
    };
    await saveReaderSettings(saved);
    onSubmit?.(saved);
  };

  const handleCancel = () => {
    form.resetFields();
    setSampleIndex(0);
    onCancel?.();
  };

  return (
    <Form
      form={form}
      name="tajweed"
      layout="vertical"
      onFinish={handleSubmit}
      onValuesChange={(changed: Partial<Values>) => {
        const [ruleId] = Object.keys(changed.choices ?? {});
        if (ruleId) showRule(ruleId);
      }}
      initialValues={initialValues}
    >
      <Typography.Paragraph>{t("tajweed-intro")}</Typography.Paragraph>
      <Form.Item
        name="tajweedColors"
        label={t("tajweed-colors")}
        extra={t("tajweed-colors-help")}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Typography.Title level={5} id={`${id}-preview`}>
        {t("tajweed-preview")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" id={`${id}-preview-description`}>
        {t("tajweed-preview-description")}
      </Typography.Paragraph>
      <div
        role="region"
        aria-labelledby={`${id}-preview`}
        aria-describedby={`${id}-preview-description`}
        className="z-10 mb-6 md:sticky md:top-0 rounded-lg border border-line bg-surface-elevated px-4 py-2 shadow-sm"
      >
        <div
          className={clsx("tajweed-preview", preview.classNames, !tajweedColors && "no-tajweed")}
          style={preview.style}
        >
          <SafeHtml lang="ar" dir="rtl" className="text-arabic text-verse-arabic py-2" html={sample.arabic} />
          <SafeHtml className="text-verse-lg py-2" html={sample.transliteration} />
        </div>
        <Typography.Text type="secondary">
          {t("verse-reference", { chapter: sample.chapter, verse: sample.verse })}
        </Typography.Text>
      </div>

      {TAJWEED_GROUPS.map((group) => {
        const single = group.rules.length === 1;
        return (
          <fieldset key={group.id} className={clsx(FIELDSET, "mb-6")}>
            <legend className={LEGEND}>
              <Typography.Title level={5}>{t(`tajweed-group-${group.id}`)}</Typography.Title>
            </legend>
            <Typography.Paragraph type="secondary">{t(`tajweed-group-${group.id}-description`)}</Typography.Paragraph>
            <div className="divide-y divide-line rounded-lg border border-line">
              {group.rules.map((rule) => {
                const fields = (
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <Form.Item className="mb-0" name={["choices", rule.id, "color"]} label={t("tajweed-color")}>
                      <Select
                        className="w-40"
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
                    <Form.Item className="mb-0" name={["choices", rule.id, "look"]} label={t("tajweed-look")}>
                      <Select className="w-40" options={lookOptions} />
                    </Form.Item>
                  </div>
                );
                return (
                  <div key={rule.id} onFocus={() => showRule(rule.id)} className="px-4 py-2">
                    {single ? (
                      fields
                    ) : (
                      <fieldset className={FIELDSET}>
                        <legend className={clsx(LEGEND, "mb-2")}>
                          <Typography.Text strong>{t(`tajweed-rule-${rule.id}`)}</Typography.Text>
                        </legend>
                        {fields}
                      </fieldset>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <Flex justify="space-between" gap="middle" wrap>
        <Button size="large" onClick={() => form.setFieldsValue({ tajweedColors: true, choices: toTajweedChoices() })}>
          {t("reset-to-defaults")}
        </Button>
        <Flex gap="middle" wrap>
          <Button size="large" onClick={handleCancel}>
            {t("cancel")}
          </Button>
          <Button htmlType="submit" type="primary" size="large">
            {t("save-changes")}
          </Button>
        </Flex>
      </Flex>
    </Form>
  );
};

export default TajweedSettings;
