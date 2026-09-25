import React, { useState } from "react";
import { Button, Drawer, Empty, Grid, Popconfirm, Row, Space, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, FormOutlined } from "@ant-design/icons";
import { useBoolean } from "ahooks";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import lf from "@/utils/localforage";
import { addNote, deleteNote, liveNotes, noteKey, readNotes, updateNote, type Note } from "@/utils/userData";
import SafeHtml from "./SafeHtml";

const NoteEditor = dynamic(() => import("./NoteEditor"), {
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState<string>("");
  // id of note being edited
  const [editNoteId, setEditNoteId] = useState<string>();
  // text of note being edited
  const [editNote, setEditNote] = useState<string>("");

  const key = noteKey(chapterNumber, verseNumber);

  React.useEffect(() => {
    let cancelled = false;
    let subscription: Subscription | undefined;

    lf.ready().then(() => {
      if (cancelled) {
        return;
      }
      readNotes(chapterNumber, verseNumber).then((notesData) => {
        if (!cancelled) {
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
            setNotes(liveNotes(args.newValue));
          },
        });
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [key, chapterNumber, verseNumber]);

  const refresh = () => readNotes(chapterNumber, verseNumber).then(setNotes);

  const saveNewNote = async () => {
    if (!isEmptyQuill(newNote)) {
      setNewNote("");
      await addNote(chapterNumber, verseNumber, newNote);
      await refresh();
    }
  };

  const removeNote = async (id: string) => {
    await deleteNote(chapterNumber, verseNumber, id);
    await refresh();
  };

  const saveEdit = async (id: string) => {
    setEditNote("");
    setEditNoteId(undefined);
    if (isEmptyQuill(editNote)) {
      await removeNote(id);
    } else {
      await updateNote(chapterNumber, verseNumber, id, editNote);
      await refresh();
    }
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
            <NoteEditor label={t("new-note")} onChange={setNewNote} value={newNote} />
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
                <Button disabled={isEmptyQuill(newNote)} type="primary" onClick={saveNewNote}>
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
          <ul className="list-none m-0 p-0 divide-y divide-line">
            {notes.map((note) => (
              <li key={note.id} className="py-3">
                {editNoteId === note.id ? (
                  <Space orientation="vertical" className="w-full">
                    <NoteEditor label={t("edit-note")} onChange={setEditNote} value={editNote} />
                    <Row>
                      <Space>
                        <Button
                          onClick={() => {
                            setEditNote("");
                            setEditNoteId(undefined);
                          }}
                        >
                          {t("cancel")}
                        </Button>
                        <Button disabled={isEmptyQuill(editNote)} type="primary" onClick={() => saveEdit(note.id)}>
                          {t("save-changes")}
                        </Button>
                      </Space>
                    </Row>
                  </Space>
                ) : (
                  <>
                    <SafeHtml html={note.html} />
                    <Space className="mt-3">
                      <Tooltip title={t("edit-note")}>
                        <Button
                          aria-label={t("edit-note")}
                          onClick={() => {
                            setEditNoteId(note.id);
                            setEditNote(note.html);
                          }}
                          size="small"
                        >
                          <EditOutlined aria-hidden />
                        </Button>
                      </Tooltip>
                      <Popconfirm
                        title={t("delete-note-confirm")}
                        okType="danger"
                        okText={t("delete")}
                        onConfirm={() => removeNote(note.id)}
                      >
                        <Tooltip title={t("delete-note")}>
                          <Button danger size="small" aria-label={t("delete-note")}>
                            <DeleteOutlined aria-hidden />
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
          <FormOutlined aria-hidden />
        </Button>
      </Tooltip>
    </>
  );
};

export default Notes;
