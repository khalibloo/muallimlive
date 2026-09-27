import { Fragment } from "react";
import { useTranslations } from "next-intl";

import type { Highlighted as HighlightedText } from "@/utils/search";

/** A search result's text from highlight(): its matched words marked, and an ellipsis where it was shortened */
const Highlighted: React.FC<HighlightedText> = ({ parts, before, after }) => {
  const t = useTranslations("common");
  return (
    <>
      {before && t("ellipsis")}
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="bg-primary/25 text-inherit rounded-sm">
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
      {after && t("ellipsis")}
    </>
  );
};

export default Highlighted;
