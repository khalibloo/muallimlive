import { Typography, Row, Col } from "antd";
import Link from "next/link";

const Footer: React.FC = () => (
  <Row justify="center" className="pt-4">
    <Col>
      <div className="text-center">
        <Typography.Text>
          <Link href="/terms">Terms of Service</Link> | <Link href="/privacy">Privacy Policy</Link>
        </Typography.Text>
      </div>
      <div>
        <Typography.Text className="text-center">
          Khalibloo ©{new Date().getFullYear()} All Rights Reserved
        </Typography.Text>
      </div>
    </Col>
  </Row>
);

export default Footer;
