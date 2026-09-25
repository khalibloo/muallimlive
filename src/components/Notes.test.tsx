import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import { liveNotes } from "@/utils/userData";
import Notes from "./Notes";

// A textarea standing in for Quill, exposing it as the editor root like the real instance
vi.mock("react-quill-new", async () => {
  const { useImperativeHandle, useRef } = await import("react");
  return {
    default: function MockQuill({
      value,
      onChange,
      ref,
    }: {
      value: string;
      onChange: (value: string) => void;
      ref?: React.Ref<unknown>;
    }) {
      const rootRef = useRef<HTMLTextAreaElement>(null);
      useImperativeHandle(ref, () => ({ getEditor: () => ({ root: rootRef.current }) }));
      return <textarea ref={rootRef} value={value} onChange={(e) => onChange(e.target.value)} />;
    },
  };
});

const KEY = "notes-quran-1-2";

const storedNotes = async () => liveNotes(await lf.getItem(KEY)).map((n) => n.html);

const renderNotes = async () => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <Notes chapterNumber={1} verseNumber={2} />
    </TestProviders>,
  );
  await user.click(screen.getByRole("button", { name: "Notes" }));
  const drawer = await screen.findByRole("dialog", { name: "Notes Q1:2" });
  return { user, drawer };
};

describe("Notes", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("opens a drawer showing the empty state", async () => {
    const { drawer } = await renderNotes();

    expect(within(drawer).getByText("You have not added any notes for this verse")).toBeInTheDocument();
  });

  it("lists the stored notes", async () => {
    await lf.setItem(KEY, ["<p>First note</p>", "<p>Second note</p>"]);
    const { drawer } = await renderNotes();

    expect(await within(drawer).findByText("First note")).toBeInTheDocument();
    expect(within(drawer).getByText("Second note")).toBeInTheDocument();
  });

  it("adds a new note and persists it", async () => {
    const { user, drawer } = await renderNotes();
    const save = within(drawer).getByRole("button", { name: "Save New Note" });
    expect(save).toBeDisabled();

    const editor = await within(drawer).findByRole("textbox", { name: "New note" });
    await user.type(editor, "<p> </p>");
    expect(save).toBeDisabled();

    await user.clear(editor);
    await user.type(editor, "<p>Remember this</p>");
    expect(save).toBeEnabled();
    await user.click(save);

    expect(await within(drawer).findByText("Remember this")).toBeInTheDocument();
    expect(editor).toHaveValue("");
    await waitFor(async () => expect(await storedNotes()).toEqual(["<p>Remember this</p>"]));
  });

  it("discards the draft on cancel", async () => {
    const { user, drawer } = await renderNotes();

    await user.type(await within(drawer).findByRole("textbox", { name: "New note" }), "draft");
    await user.click(within(drawer).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(await within(drawer).findByRole("textbox", { name: "New note" })).toHaveValue("");
    expect(await lf.getItem(KEY)).toBeNull();
  });

  it("edits a note and saves the changes", async () => {
    await lf.setItem(KEY, ["<p>Old text</p>", "<p>Other</p>"]);
    const { user, drawer } = await renderNotes();
    await within(drawer).findByText("Old text");

    await user.click(within(drawer).getAllByRole("button", { name: "Edit note" })[0]);
    const item = within(drawer).getAllByRole("listitem")[0];
    const editor = await within(item).findByRole("textbox", { name: "Edit note" });
    expect(editor).toHaveValue("<p>Old text</p>");

    await user.clear(editor);
    await user.type(editor, "<p>New text</p>");
    await user.click(within(item).getByRole("button", { name: "Save Changes" }));

    expect(await within(drawer).findByText("New text")).toBeInTheDocument();
    await waitFor(async () => expect(await storedNotes()).toEqual(["<p>New text</p>", "<p>Other</p>"]));
  });

  it("cancels editing without saving", async () => {
    await lf.setItem(KEY, ["<p>Keep me</p>"]);
    const { user, drawer } = await renderNotes();
    await within(drawer).findByText("Keep me");

    await user.click(within(drawer).getByRole("button", { name: "Edit note" }));
    const item = within(drawer).getByRole("listitem");
    const editor = await within(item).findByRole("textbox", { name: "Edit note" });
    await user.clear(editor);
    await user.type(editor, "changed");
    await user.click(within(item).getByRole("button", { name: "Cancel" }));

    expect(within(drawer).getByText("Keep me")).toBeInTheDocument();
    expect(await storedNotes()).toEqual(["<p>Keep me</p>"]);
  });

  it("disables saving an edit that empties the note", async () => {
    await lf.setItem(KEY, ["<p>Some text</p>"]);
    const { user, drawer } = await renderNotes();
    await within(drawer).findByText("Some text");

    await user.click(within(drawer).getByRole("button", { name: "Edit note" }));
    const item = within(drawer).getByRole("listitem");
    await user.clear(await within(item).findByRole("textbox", { name: "Edit note" }));

    expect(within(item).getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("deletes a note after confirmation", async () => {
    await lf.setItem(KEY, ["<p>Delete me</p>", "<p>Stay</p>"]);
    const { user, drawer } = await renderNotes();
    await within(drawer).findByText("Delete me");

    await user.click(within(drawer).getAllByRole("button", { name: "Delete note" })[0]);
    expect(await screen.findByText("Delete note forever?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(within(drawer).queryByText("Delete me")).not.toBeInTheDocument());
    expect(within(drawer).getByText("Stay")).toBeInTheDocument();
    await waitFor(async () => expect(await storedNotes()).toEqual(["<p>Stay</p>"]));
  });

  it("keeps a deleted note as a deletion marker", async () => {
    await lf.setItem(KEY, ["<p>First note</p>"]);
    const { user, drawer } = await renderNotes();

    await user.click(await within(drawer).findByRole("button", { name: "Delete note" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(async () =>
      expect(await lf.getItem(KEY)).toEqual([expect.objectContaining({ html: "", deleted: true })]),
    );
    expect(within(drawer).getByText("You have not added any notes for this verse")).toBeInTheDocument();
  });
});
