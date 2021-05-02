import React from "react";
import { Menu, Icon, Button, Dropdown } from "antd";

import { connect } from "react-redux";

interface Props {
  viewMode: "split" | "single";
  dispatch?: any;
}
interface State {}

class ViewMode extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.setViewMode = this.setViewMode.bind(this);
  }
  setViewMode(mode: "split" | "single") {
    this.props.dispatch(readerSetViewMode(mode));
  }
  render() {
    const viewModeMenu = (
      <Menu selectedKeys={[this.props.viewMode]}>
        <Menu.Item key="split">
          <a onClick={() => this.setViewMode("split")}>Split View</a>
        </Menu.Item>
        <Menu.Item key="single">
          <a onClick={() => this.setViewMode("single")}>Single View</a>
        </Menu.Item>
      </Menu>
    );
    return (
      <Dropdown overlay={viewModeMenu} trigger={["click"]}>
        <Button>
          View Mode <Icon type="down" />
        </Button>
      </Dropdown>
    );
  }
}

export default connect()(ViewMode);
