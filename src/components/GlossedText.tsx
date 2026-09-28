import React from "react";
import { Tooltip } from "antd";

import { glossGroups } from "@/utils/glosses";
import SafeHtml from "./SafeHtml";

interface Props {
  html: string;
  words: VerseWord[];
  className?: string;
}

/** A transliteration whose word groups show their glosses on hover, or on focus when tapped */
const GlossedText: React.FC<Props> = ({ html, words, className }) => {
  const groups = glossGroups(html, words);
  if (!groups) {
    return <SafeHtml className={className} html={html} />;
  }

  return (
    <div className={className}>
      {groups.map((group, i) => (
        // groups are one verse's words in order, so their order is stable
        <React.Fragment key={i}>
          {i > 0 && " "}
          {group.gloss ? (
            <Tooltip title={group.gloss} trigger={["hover", "focus"]}>
              <SafeHtml
                inline
                tabIndex={0}
                className="cursor-help rounded-sm border-b border-dotted border-current hover:bg-surface-elevated"
                html={group.html}
              />
            </Tooltip>
          ) : (
            <SafeHtml inline html={group.html} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default GlossedText;
