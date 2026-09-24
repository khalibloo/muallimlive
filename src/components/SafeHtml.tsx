import React from "react";
import DOMPurify from "isomorphic-dompurify";

interface Props {
  html: string;
  className?: string;
}

// tajweed markup uses a custom <tajweed class="..."> element
const SANITIZE_CONFIG = { ADD_TAGS: ["tajweed"] };

const SafeHtml: React.FC<Props> = ({ html, className }) => (
  // eslint-disable-next-line react/no-danger
  <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, SANITIZE_CONFIG) }} />
);

export default SafeHtml;
