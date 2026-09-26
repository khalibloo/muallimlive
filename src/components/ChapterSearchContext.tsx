"use client";

import { createContext, useContext, useState } from "react";

import type { ContentPack } from "@/utils/packs";

// The chapter page registers the texts it holds, so the search modal in the nav bar can search them without
// downloads, and scroll to a verse instead of navigating.

export interface CurrentChapter {
  chapter: Chapter;
  /** The chapter's texts, one per pack of the display settings */
  texts: { pack: ContentPack; verses: VerseText[] }[];
  goToVerse: (verse: number) => void;
}

const CurrentChapterContext = createContext<CurrentChapter | undefined>(undefined);
// separate from the value, so the chapter page registering doesn't re-render itself
const SetCurrentChapterContext = createContext<(current?: CurrentChapter) => void>(() => {});

export const ChapterSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<CurrentChapter>();
  return (
    <SetCurrentChapterContext value={setCurrent}>
      <CurrentChapterContext value={current}>{children}</CurrentChapterContext>
    </SetCurrentChapterContext>
  );
};

export const useCurrentChapter = () => useContext(CurrentChapterContext);

export const useSetCurrentChapter = () => useContext(SetCurrentChapterContext);
