import React from "react";
import { Menu, Button, Modal } from "antd";
import Scrollbar from "./Scrollbar";

import { connect } from "react-redux";

interface Props {
  lang: any;
  translations: any;
  open: boolean;
  openOrClose: (open: boolean) => void;
  dispatch?: any;
}
interface State {
  selectedLanguage: string;
}

class LanguageMenu extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { selectedLanguage: this.props.lang.selectedLanguage };
  }
  handleOk = () => {
    const langChanged =
      this.state.selectedLanguage !== this.props.lang.selectedLanguage;
    this.props
      .dispatch(langSetLanguage(this.state.selectedLanguage))
      .then(() => {
        if (langChanged) {
          this.props.dispatch(fetchChapters(this.props.lang.selectedLanguage));
          //TODO: fetch verses too
        }
      });
    this.props.openOrClose(false);
  };
  handleCancel = () => {
    this.setState({ selectedLanguage: this.props.lang.selectedLanguage });
    this.props.openOrClose(false);
  };
  arrangeLanguages = () => {
    const langs: any[] = [];
    this.props.lang.languages.forEach((language, index) => {
      //if it has an entry in translations
      if (
        this.props.translations.languages.filter(
          (trans) => trans.name === language.name,
        ).length > 0
      ) {
        langs.push(
          <Menu.Item key={language.iso_code}>
            <a
              onClick={() =>
                this.setState({ selectedLanguage: language.iso_code })
              }
            >
              {language.native_name.length > 0
                ? language.native_name
                : language.name}
            </a>
          </Menu.Item>,
        );
      }
    });
    return langs;
  };
  // setLanguage(isoCode: any){
  //   this.props.dispatch(setLanguage(isoCode));
  // }
  render() {
    const langs = this.arrangeLanguages();
    const langMenu = (
      <Menu selectedKeys={[this.state.selectedLanguage]}>{langs}</Menu>
    );
    return (
      <Modal
        title="Language Menu"
        visible={this.props.open}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
        footer={[
          <Button key="back" size="large" onClick={this.handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            onClick={this.handleOk}
          >
            OK
          </Button>,
        ]}
        style={{ top: "20px" }}
      >
        <Scrollbar
          style={{
            width: "100%",
            height: "calc(100vh - 48px - 32px - 53px - 50px)",
          }}
          viewStyle={{ overflowX: "hidden", paddingRight: "10px" }}
        >
          {langMenu}
        </Scrollbar>
      </Modal>
    );
  }
}

export default connect()(LanguageMenu);
