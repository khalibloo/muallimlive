import React, { useEffect, useRef } from "react";
import ReactQuill from "react-quill-new";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const NoteEditor: React.FC<Props> = ({ label, value, onChange }) => {
  const quillRef = useRef<ReactQuill>(null);

  // Quill's editable area is a bare contenteditable div, and react-quill has no aria props
  useEffect(() => {
    const root = quillRef.current?.getEditor().root;
    root?.setAttribute("role", "textbox");
    root?.setAttribute("aria-multiline", "true");
    root?.setAttribute("aria-label", label);
  }, [label]);

  return <ReactQuill ref={quillRef} theme="snow" onChange={onChange} value={value} />;
};

export default NoteEditor;
