import React from "react";
import DOMPurify from "isomorphic-dompurify";

interface Props extends Omit<React.ComponentProps<"span">, "children" | "dangerouslySetInnerHTML"> {
  html: string;
  /** Renders a span instead of a div */
  inline?: boolean;
}

// tajweed markup uses a custom <tajweed class="..."> element
const SANITIZE_CONFIG = { ADD_TAGS: ["tajweed"] };

const SafeHtml: React.FC<Props> = ({ html, inline, ...props }) => {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      {...(props as React.ComponentProps<"div">)}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, SANITIZE_CONFIG) }}
    />
  );
};

export default SafeHtml;
