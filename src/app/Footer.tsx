import { Typography, Row, Col } from "antd";
import Link from "next/link";
import { useTranslations } from "next-intl";

const Footer: React.FC = () => {
  const t = useTranslations("common");
  return (
    <Row justify="center" className="pt-4">
      <Col>
        <div className="text-center">
          <Typography.Text>
            <Link href="/terms">{t("terms-of-service")}</Link> | <Link href="/privacy">{t("privacy-policy")}</Link>
          </Typography.Text>
        </div>
        <div>
          <Typography.Text className="text-center">
            {t("copyright-notice", { year: new Date().getFullYear() })}
          </Typography.Text>
        </div>
      </Col>
    </Row>
  );
};

export default Footer;
