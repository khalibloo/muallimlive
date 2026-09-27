"use client";

import { createContext, useContext, useState } from "react";

import type { ContentPack } from "@/utils/packs";

// The chapter page registers the texts it holds, so the search modal in the nav bar can search them without
// downloads, and scroll to a verse instead of navigating. The provider also holds the search modal's open state,
// so pages can open it.

export interface CurrentChapter {
  chapter: Chapter;
  /** The chapter's texts, one per pack of the display settings */
  texts: { pack: ContentPack; verses: VerseText[] }[];
  goToVerse: (verse: number) => void;
}

export type SearchMode = "quran" | "hadith";

interface SearchModal {
  /** The open modal's first mode; undefined while closed */
  searchMode?: SearchMode;
  openSearch: (mode: SearchMode) => void;
  closeSearch: () => void;
}

const CurrentChapterContext = createContext<CurrentChapter | undefined>(undefined);
// separate from the value, so the chapter page registering doesn't re-render itself
const SetCurrentChapterContext = createContext<(current?: CurrentChapter) => void>(() => {});
const SearchModalContext = createContext<SearchModal>({ openSearch: () => {}, closeSearch: () => {} });

export const ChapterSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<CurrentChapter>();
  const [searchMode, setSearchMode] = useState<SearchMode>();
  return (
    <SearchModalContext value={{ searchMode, openSearch: setSearchMode, closeSearch: () => setSearchMode(undefined) }}>
      <SetCurrentChapterContext value={setCurrent}>
        <CurrentChapterContext value={current}>{children}</CurrentChapterContext>
      </SetCurrentChapterContext>
    </SearchModalContext>
  );
};

export const useCurrentChapter = () => useContext(CurrentChapterContext);

export const useSetCurrentChapter = () => useContext(SetCurrentChapterContext);

export const useSearchModal = () => useContext(SearchModalContext);
