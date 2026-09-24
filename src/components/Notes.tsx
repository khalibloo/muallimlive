import React, { useState } from "react";
import { Button, Drawer, Empty, Grid, Popconfirm, Row, Space, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, FormOutlined } from "@ant-design/icons";
import { useBoolean } from "ahooks";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import lf from "@/utils/localforage";
import SafeHtml from "./SafeHtml";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
});

interface Props {
  chapterNumber: number;
  verseNumber: number;
}

const isEmptyQuill = (text: string) => text.replace(/<(.|\n)*?>/g, "").trim().length === 0;

const Notes: React.FC<Props> = ({ chapterNumber, verseNumber }) => {
  const t = useTranslations("common");
  const responsive = Grid.useBreakpoint();
  const [notesOpened, { setTrue: openNotes, setFalse: closeNotes }] = useBoolean();
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState<string>("");
  // index of note being edited
  const [editNoteIndex, setEditNoteIndex] = useState<number>(-1);
  // text of note being edited
  const [editNote, setEditNote] = useState<string>("");

  const key = `notes-quran-${chapterNumber}-${verseNumber}`;

  React.useEffect(() => {
    let cancelled = false;
    let subscription: Subscription | undefined;

    lf.ready().then(() => {
      if (cancelled) {
        return;
      }
      lf.getItem<string[]>(key).then((notesData) => {
        if (!cancelled && Array.isArray(notesData)) {
          setNotes(notesData);
        }
      });

      // sync localforage across tabs
      lf.configObservables({
        crossTabNotification: true,
        crossTabChangeDetection: true,
      });
      subscription = lf
        .newObservable({
          key,
          crossTabNotification: true,
        })
        .subscribe({
          next: (args) => {
            setNotes(Array.isArray(args.newValue) ? args.newValue : []);
          },
        });
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [key]);

  const saveNotes = (updater: (notesList: string[]) => string[]) =>
    lf.getItem<string[]>(key).then((notesData) => {
      const newNotes = updater(Array.isArray(notesData) ? notesData : []);
      setNotes(newNotes);
      return lf.setItem(key, newNotes);
    });

  const addNote = () => {
    if (!isEmptyQuill(newNote)) {
      saveNotes((notesList) => [...notesList, newNote]);
      setNewNote("");
    }
  };

  const deleteNote = (index: number) => {
    saveNotes((notesList) => notesList.filter((_, i) => i !== index));
  };

  const updateNote = (index: number) => {
    if (isEmptyQuill(editNote)) {
      deleteNote(index);
    } else {
      saveNotes((notesList) => notesList.map((note, i) => (i === index ? editNote : note)));
    }
    setEditNote("");
    setEditNoteIndex(-1);
  };

  let drawerWidth;
  if (responsive.lg) {
    drawerWidth = "40%";
  } else if (responsive.md) {
    drawerWidth = "50%";
  } else if (responsive.sm) {
    drawerWidth = "80%";
  } else {
    drawerWidth = "90%";
  }

  return (
    <>
      <Drawer
        placement="right"
        title={t("notes-title", { chapter: chapterNumber, verse: verseNumber })}
        onClose={closeNotes}
        open={notesOpened}
        footer={
          <Space orientation="vertical" className="w-full">
            <ReactQuill theme="snow" onChange={setNewNote} value={newNote} />
            <Row>
              <Space>
                <Button
                  onClick={() => {
                    setNewNote("");
                    closeNotes();
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button disabled={isEmptyQuill(newNote)} type="primary" onClick={addNote}>
                  {t("save-new-note")}
                </Button>
              </Space>
            </Row>
          </Space>
        }
        size={drawerWidth}
        className="content-overflow"
      >
        {notes.length === 0 ? (
          <Empty description={t("no-notes")} />
        ) : (
          <ul className="list-none m-0 p-0 divide-y divide-white/10">
            {notes.map((note, i) => (
              <li key={i} className="py-3">
                {editNoteIndex === i ? (
                  <Space orientation="vertical" className="w-full">
                    <ReactQuill theme="snow" onChange={setEditNote} value={editNote} />
                    <Row>
                      <Space>
                        <Button
                          onClick={() => {
                            setEditNote("");
                            setEditNoteIndex(-1);
                          }}
                        >
                          {t("cancel")}
                        </Button>
                        <Button disabled={isEmptyQuill(editNote)} type="primary" onClick={() => updateNote(i)}>
                          {t("save-changes")}
                        </Button>
                      </Space>
                    </Row>
                  </Space>
                ) : (
                  <>
                    <SafeHtml html={note} />
                    <Space className="mt-3">
                      <Tooltip title={t("edit-note")}>
                        <Button
                          aria-label={t("edit-note")}
                          onClick={() => {
                            setEditNoteIndex(i);
                            setEditNote(note);
                          }}
                          size="small"
                        >
                          <EditOutlined />
                        </Button>
                      </Tooltip>
                      <Popconfirm
                        title={t("delete-note-confirm")}
                        okType="danger"
                        okText={t("delete")}
                        onConfirm={() => deleteNote(i)}
                      >
                        <Tooltip title={t("delete-note")}>
                          <Button danger size="small" aria-label={t("delete-note")}>
                            <DeleteOutlined />
                          </Button>
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      <Tooltip title={t("notes")}>
        <Button type="text" aria-label={t("notes")} onClick={openNotes}>
          <FormOutlined />
        </Button>
      </Tooltip>
    </>
  );
};

export default Notes;
