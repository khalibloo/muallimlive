import * as React from "react";
import { Modal, Button, Col, Row, Cascader, Select, Switch } from "antd";

import { connect } from "react-redux";
import { LogoutOutlined } from "@ant-design/icons";

interface Props {
  viewMode: "split" | "single";
  lang: any;
  translations: any;
  reader: any;
  open: boolean;
  openOrClose: (open: boolean) => void;
  onOkClose: Function;
}

const Settings: React.FC<Props> = () => {
  const versesOptions = this.arrangeTranslations();
  const odLoginBtn = (
    <Button
      type="primary"
      onClick={this.props.odOnSignIn}
      loading={this.props.odSigningIn}
    >
      OneDrive
    </Button>
  );

  const odLogoutBtn = (
    <Row>
      <Col span={24}>
        <p>Signed in as: {odName}</p>
      </Col>
      <Col span={24}>
        <i>({odEmail})</i>
      </Col>
      <Col span={24}>
        <Button danger onClick={() => {}}>
          <LogoutOutlined />
          Logout
        </Button>
      </Col>
    </Row>
  );

  return (
    <Modal
      title="Reader Settings"
      visible={this.props.open}
      onOk={this.handleOk}
      onCancel={this.handleCancel}
    >
      <Row>
        <Col sm={12} xs={24}>
          <h4 style={{ marginBottom: "20px" }}>Left side</h4>
          <Switch
            checked={this.state.leftView}
            disabled={!this.state.rightView}
            onChange={(checked) => this.setState({ leftView: checked })}
          />
          <p>Translation:</p>
          <Cascader
            allowClear={true}
            options={versesOptions}
            disabled={!this.state.leftView}
            expandTrigger="hover"
            value={this.getTranslationValue(this.state.translation)}
            onChange={(value) =>
              this.setState({ translation: parseInt(value[value.length - 1]) })
            }
            style={{ marginBottom: "30px" }}
          />
        </Col>
        <Col sm={12} xs={24}>
          <h4 style={{ marginBottom: "20px" }}>Right side</h4>
          <Switch
            checked={this.state.rightView}
            disabled={!this.state.leftView}
            onChange={(checked) => this.setState({ rightView: checked })}
          />
          <p>Arabic:</p>
          <Select
            style={{ width: 120, marginBottom: "30px" }}
            placeholder="Select Arabic Type"
            disabled={!this.state.rightView}
            value={this.state.arabicMode}
            onChange={(value: string) => this.setArabicMode(value)}
          >
            <Select.Option value="simple">Simple</Select.Option>
            <Select.Option value="indopak">Indopak</Select.Option>
            <Select.Option value="madani">Madani</Select.Option>
          </Select>
          <p>Transliteration:</p>
          <Switch
            checked={this.state.transliterationEnabled}
            disabled={!this.state.rightView}
            onChange={(checked) =>
              this.setState({ transliterationEnabled: checked })
            }
          />
        </Col>
      </Row>
      <Row>
        <Col>{odLoginBtn}</Col>
      </Row>
    </Modal>
  );
};

export default Settings;
