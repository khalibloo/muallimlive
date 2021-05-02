import * as React from 'react';
import { Modal, Button, Col, Row, Cascader, Select, Switch, Icon } from 'antd';

import { connect } from 'react-redux';
import {
  readerOpenOrCloseSettings,
  readerSetArabicMode,
  readerSetEnableLeftView,
  readerSetEnableRightView,
  readerSetEnableTransliteration,
  translationsSetSelected,
} from '../../actions';
import ls from 'local-storage';

// Client ID and API key from the Developer Console
// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_ID = "498256263602-07kgtvb2dirlplfnd1og5cioeic2tb48.apps.googleusercontent.com";
const API_KEY = "b0NW0nn8_RMVOwbOT2qrpQAi";

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = `https://www.googleapis.com/auth/drive.appdata`;
// const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

interface Props {
  viewMode: "split" | "single";
  lang: any;
  translations: any;
  reader: any;
  open: boolean;
  openOrClose: (open: boolean) => void;
  onOkClose: Function;
  odOnSignIn: (e)=>void;
  odOnSignOut: (e)=>void;
  odName: string;
  odEmail: string;
  odSignedIn: boolean;
  odSigningIn: boolean;
  gdOnSignIn: (e)=>void;
  gdOnSignOut: (e)=>void;
  gdName: string;
  gdEmail: string;
  gdSignedIn: boolean;
  gdSigningIn: boolean;
  dispatch?: any;
}
interface State{
  viewMode: "split" | "single";
  leftView: boolean;
  rightView: boolean;
  arabicMode: "simple" | "madani" | "indopak";
  transliterationEnabled: boolean;
  translation: number;
}
class Settings extends React.Component<Props, State>{
  constructor(props: Props){
    super(props);
    this.handleOk = this.handleOk.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.arrangeTranslations = this.arrangeTranslations.bind(this);
    this.getTranslationValue = this.getTranslationValue.bind(this);
    
    this.state = {
      viewMode: this.props.reader.viewMode,
      leftView: this.props.reader.leftView,
      rightView: this.props.reader.rightView,
      arabicMode: this.props.reader.arabicMode,
      transliterationEnabled: this.props.reader.transliterationEnabled,
      translation: this.props.translations.selectedTranslation,
    };
  }

  arrangeTranslations(){
    let translations: any[] = [];
    this.props.translations.languages.forEach(lang => {
      //format the object
      translations.push({
        value: lang.name.toLowerCase(),
        label: lang.name,
        children: lang.translations.map(trans => (
          {
            value: trans.id,
            label: trans.name,
          }
        )),
      });
    });
    return translations;
  }
  getTranslationValue(id: number){
    let result;
    const translations = this.arrangeTranslations();
    translations.forEach(lang => {
      lang.children.forEach(trans => {
        if(trans.value === id){
          result = [lang.value, trans.value];
        }
      });
    });
    return result;
  }
  handleOk(){
    this.props.dispatch(readerSetArabicMode(this.state.arabicMode))
      .then(()=>{
        this.props.dispatch(readerSetEnableLeftView(this.state.leftView))
          .then(()=>{
            this.props.dispatch(readerSetEnableRightView(this.state.rightView))
              .then(()=>{
                this.props.dispatch(readerSetEnableTransliteration(this.state.transliterationEnabled))
                  .then(()=>{
                    this.props.dispatch(translationsSetSelected(this.state.translation))
                      .then(()=>{
                            this.props.openOrClose(false);
                            this.props.onOkClose();
                      });
                  });
              });
          });
      });
  }
  handleCancel(){
    this.setState({viewMode: this.props.viewMode});
    // this.props.dispatch(readerOpenOrCloseSettings(false));
    this.props.openOrClose(false);
  }
  setViewMode(mode: "split" | "single"){
    this.setState({viewMode: mode});
  }
  setArabicMode(mode: string){
    this.setState({arabicMode: mode as "simple" | "madani" | "indopak"});
  }
  componentWillReceiveProps(nextProps){
    if(this.props != nextProps){
      this.setState({
        viewMode: nextProps.viewMode
      });
    }
  }
  
  
  
  render(){
    const versesOptions = this.arrangeTranslations();
    let odLoginBtn;
    if(!this.props.odSignedIn){
      odLoginBtn = (
        <Button type="primary" onClick={this.props.odOnSignIn} loading={this.props.odSigningIn}>OneDrive</Button>
      );
    }
    else{
      odLoginBtn = (
        <Row>
          <Col span={24}>
            <p>Signed in as: {this.props.odName}</p>
          </Col>
          <Col span={24}>
            <i>({this.props.odEmail})</i>
          </Col>
          <Col span={24}>
            <Button type="danger" onClick={this.props.odOnSignOut}><Icon type="logout" />Logout</Button>
          </Col>
        </Row>
      );
    }
    let gdLoginBtn;
    if(!this.props.gdSignedIn){
      gdLoginBtn = (
        <Button type="primary" onClick={this.props.gdOnSignIn} loading={this.props.gdSigningIn}>Google Drive</Button>
      );
    }
    else{
      gdLoginBtn = (
        <Row>
          <Col span={24}>
            <p>Signed in as: {this.props.gdName}</p>
          </Col>
          <Col span={24}>
            <i>({this.props.gdEmail})</i>
          </Col>
          <Col span={24}>
            <Button type="danger" onClick={this.props.gdOnSignOut}><Icon type="logout" />Logout</Button>
          </Col>
        </Row>
      );
    }
    return(
      <Modal
        title="Reader Settings"
        visible={this.props.open}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
        footer={[
          <Button key="back" size="large" onClick={this.handleCancel}>Cancel</Button>,
          <Button key="submit" type="primary" size="large" onClick={this.handleOk}>
            OK
          </Button>,
        ]}
      >
        <Row>
          <Col sm={12} xs={24}>
            <h4 style={{marginBottom: '20px'}}>Left side</h4>
            <Switch
              checked={this.state.leftView}
              disabled={!this.state.rightView}
              onChange={(checked)=>(this.setState({leftView: checked}))} />
            <p>Translation:</p>
            <Cascader
              allowClear={true}
              options={versesOptions}
              disabled={!this.state.leftView}
              expandTrigger="hover"
              value={this.getTranslationValue(this.state.translation)}
              onChange={(value)=>(this.setState({translation: parseInt(value[value.length - 1])}))}
              style={{marginBottom: '30px'}} />
            {/* <p>Tafsir:</p>
            <Cascader
              allowClear={true}
              options={tafsirOptions}
              disabled={!this.state.leftView}
              expandTrigger="hover"
              onChange={()=>(console.log("Cascader changed!"))} /> */}
          </Col>
          <Col sm={12} xs={24}>
            <h4 style={{marginBottom: '20px'}}>Right side</h4>
            <Switch
              checked={this.state.rightView}
              disabled={!this.state.leftView}
              onChange={(checked)=>(this.setState({rightView: checked}))} />
            <p>Arabic:</p>
            <Select
              style={{ width: 120, marginBottom: '30px' }}
              placeholder="Select Arabic Type"
              disabled={!this.state.rightView}
              value={this.state.arabicMode}
              onChange={(value: string)=>(this.setArabicMode(value))} >
              <Select.Option value="simple">Simple</Select.Option>
              <Select.Option value="indopak">Indopak</Select.Option>
              <Select.Option value="madani">Madani</Select.Option>
            </Select>
            <p>Transliteration:</p>
            <Switch
              checked={this.state.transliterationEnabled}
              disabled={!this.state.rightView}
              onChange={(checked)=>(this.setState({transliterationEnabled: checked}))} />
          </Col>
        </Row>
        <Row>
          <Col>
            {odLoginBtn}
            {/* {gdLoginBtn} */}
          </Col>
        </Row>
      </Modal>
    );
  }
}

export default connect()(Settings)
