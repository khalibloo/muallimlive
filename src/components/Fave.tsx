import * as React from "react";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";

interface Props {
  faved: boolean;
  onToggleFave: Function;
}
interface State {}
export default class Fave extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.toggle = this.toggle.bind(this);
  }
  toggle() {
    this.props.onToggleFave(!this.props.faved);
  }
  render() {
    return (
      <div onClick={this.toggle} style={{ padding: "6px", cursor: "pointer" }}>
        {this.props.faved ? (
          <HeartFilled style={{ color: "#c22" }} />
        ) : (
          <HeartOutlined />
        )}
      </div>
    );
  }
}
