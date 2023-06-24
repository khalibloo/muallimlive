import React, { useState } from "react";
import {
  Button,
  Drawer,
  Empty,
  List,
  Popconfirm,
  Row,
  Space,
  Tooltip,
} from "antd";
import { DeleteOutlined, EditOutlined, FormOutlined } from "@ant-design/icons";
import { useBoolean, useResponsive } from "ahooks";
import dynamic from "next/dynamic";

import lf from "@/utils/localforage";

import "react-quill/dist/quill.snow.css";
import "@/styles/quill.less";

const ReactQuill = dynamic(() => import("react-quill"), {
  ssr: false,
});

interface Props {
  chapterNumber: number;
  verseNumber: number;
}
const Notes: React.FC<Props> = ({ chapterNumber, verseNumber }) => {
  const responsive = useResponsive();
  const [
    notesOpened,
    { setTrue: openNotes, setFalse: closeNotes },
  ] = useBoolean();
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState<string>("");
  // index of note being edited
  const [editNoteIndex, setEditNoteIndex] = useState<number>(-1);
  // text of note being edited
  const [editNote, setEditNote] = useState<string>("");

  const key = `notes-quran-${chapterNumber}-${verseNumber}`;

  const isEmptyQuill = (text: string) =>
    text.replace(/<(.|\n)*?>/g, "").trim().length === 0;

  React.useEffect(() => {
    lf.ready().then(() => {
      lf.getItem(key).then((notesData) => {
        if (typeof (notesData as string[])?.length === "number") {
          setNotes(notesData as string[]);
        }
      });

      // sync localforage across tabs
      lf.configObservables({
        crossTabNotification: true,
        crossTabChangeDetection: true,
      });
      const ob = lf.newObservable({
        key,
        crossTabNotification: true,
      });

      ob.subscribe({
        next: (args) => {
          setNotes(args.newValue);
        },
      });
    });
  }, [chapterNumber, verseNumber]);

  const addNote = () => {
    if (!isEmptyQuill(newNote)) {
      lf.getItem(key).then((notesData) => {
        const newNotes = (notesData as string[]) || [];
        newNotes.push(newNote);

        lf.setItem(key, newNotes);
        setNotes(newNotes);
        setNewNote("");
      });
    }
  };

  const updateNote = (index: number) => {
    if (isEmptyQuill(editNote)) {
      return deleteNote(index);
    }
    lf.getItem(key).then((notesData) => {
      if (typeof (notesData as string[])?.length === "number") {
        const notesList = notesData as string[];
        notesList[index] = editNote;

        lf.setItem(key, notesList);
        setNotes(notesList);
        setEditNote("");
        setEditNoteIndex(-1);
      }
    });
  };

  const deleteNote = (index: number) => {
    lf.getItem(key).then((notesData) => {
      if (typeof (notesData as string[])?.length === "number") {
        const notesList = notesData as string[];
        notesList.splice(index, 1);

        lf.setItem(key, notesList);
        setNotes(notesList);
      }
    });
  };

  let drawerWidth;
  if (responsive?.lg) {
    drawerWidth = "40%";
  } else if (responsive?.md) {
    drawerWidth = "50%";
  } else if (responsive?.sm) {
    drawerWidth = "80%";
  } else {
    drawerWidth = "90%";
  }

  return (
    <>
      <Drawer
        placement="right"
        title={`Notes Q${chapterNumber}:${verseNumber}`}
        onClose={closeNotes}
        open={notesOpened}
        footer={
          <Space direction="vertical" className="w-full">
            <ReactQuill theme="snow" onChange={setNewNote} value={newNote} />
            <Row>
              <Space>
                <Button
                  onClick={() => {
                    setNewNote("");
                    closeNotes();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={isEmptyQuill(newNote)}
                  type="primary"
                  onClick={addNote}
                >
                  Save New Note
                </Button>
              </Space>
            </Row>
          </Space>
        }
        width={drawerWidth}
        className="content-overflow"
      >
        {notes.length === 0 ? (
          <Empty description="You have not added any notes for this verse" />
        ) : (
          <List
            dataSource={notes}
            itemLayout="vertical"
            renderItem={(note, i) => (
              <List.Item
                key={i}
                actions={
                  editNoteIndex !== i
                    ? [
                        <Tooltip title="Edit Note">
                          <Button
                            onClick={() => {
                              setEditNoteIndex(i);
                              setEditNote(note);
                            }}
                            size="small"
                          >
                            <EditOutlined />
                          </Button>
                        </Tooltip>,
                        <Tooltip title="Delete Note">
                          <Popconfirm
                            title="Delete note forever?"
                            okType="danger"
                            okText="Delete"
                            onConfirm={() => deleteNote(i)}
                          >
                            <Button danger size="small">
                              <DeleteOutlined />
                            </Button>
                          </Popconfirm>
                        </Tooltip>,
                      ]
                    : []
                }
              >
                {editNoteIndex === i ? (
                  <Space direction="vertical" className="w-full">
                    <ReactQuill
                      theme="snow"
                      onChange={setEditNote}
                      value={editNote}
                    />
                    <Row>
                      <Space>
                        <Button
                          onClick={() => {
                            setEditNote("");
                            setEditNoteIndex(-1);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={isEmptyQuill(editNote)}
                          type="primary"
                          onClick={() => updateNote(i)}
                        >
                          Save Changes
                        </Button>
                      </Space>
                    </Row>
                  </Space>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: note }} />
                )}
              </List.Item>
            )}
          />
        )}
      </Drawer>
      <Tooltip title="Notes">
        <Button type="text" onClick={openNotes}>
          <FormOutlined />
        </Button>
      </Tooltip>
    </>
  );
};

export default Notes;
