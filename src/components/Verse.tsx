import React from "react";
import { Row, Col } from "antd";
import Fave from "./Fave";

import { connect } from "react-redux";

interface Props {
  verse: any;
  faved: boolean;
  translation: any;
  transliteration: any;
  lang: any;
  reader: any;
  noBottomBorder?: boolean;
}

const Verse: React.FC<Props> = ({
  verse,
  faved,
  lang,
  translation,
  transliteration,
  noBottomBorder,
  reader,
}) => {
  const border = !noBottomBorder ? "1px solid #999" : "none";

  let translatedVerse;
  let translatedCommentary;
  let leftCol;
  if (reader.leftView) {
    //translated text
    let translatedText;
    if (translation) {
      translatedText = translation.text;
    }
    //translated verse
    translatedVerse =
      lang.direction === "rtl" ? (
        <Row>
          <Col span={23}>
            <h3 style={{ textAlign: "right" }}>{translatedText}</h3>
          </Col>
          <Col span={1}>
            <h3 style={{ textAlign: "right" }}>({verse.verse_number}</h3>
          </Col>
        </Row>
      ) : (
        <h3 style={{ textAlign: "left" }}>
          {verse.verse_number}) {translatedText}
        </h3>
      );
    //translated commentary text
    let translatedCommentaryText;
    if (translation) {
      translatedText = translation.text;
    }
    //translated commentary
    translatedCommentary = (
      <div style={{ textAlign: "left" }}>{translatedCommentaryText}</div>
    );

    //if there's a right view
    if (reader.rightView) {
      leftCol = (
        <Col className="verse left-col-with-right" sm={12} xs={24}>
          {translatedVerse}
          {/* <div style={{textAlign: 'left'}}>{trans.text}</div> */}
        </Col>
      );
    } else {
      //no right view, take whole space
      leftCol = (
        <Col className="verse left-col-no-right" span={24}>
          {translatedVerse}
          {/* {translatedCommentary} */}
        </Col>
      );
    }
  }

  let arabicVerse;
  let transliterationVerse;
  let rightCol;
  if (reader.rightView) {
    //arabic verse
    let arabicVerseText = verse.text_simple; //default is simple
    if (reader.arabicMode === "madani") {
      arabicVerseText = verse.text_madani;
    } else if (reader.arabicMode === "indopak") {
      arabicVerseText = verse.text_indopak;
    }
    arabicVerse = (
      <Row>
        <Col span={23}>
          <h3 style={{ textAlign: "right" }}>{arabicVerseText}</h3>
        </Col>
        <Col span={1}>
          <h3 style={{ textAlign: "right" }}>({verse.verse_number}</h3>
        </Col>
      </Row>
    );
    //transliteration text
    let transliterationText;
    if (transliteration) {
      transliterationText = transliteration.text;
    }
    //transliteration
    if (reader.transliterationEnabled) {
      transliterationVerse = (
        <div style={{ textAlign: "left" }}>{transliterationText}</div>
      );
    }

    //if there's a left view
    if (reader.leftView) {
      rightCol = (
        <Col className="verse right-col-with-left" sm={12} xs={24}>
          {arabicVerse}
          {transliterationVerse}
        </Col>
      );
    } else {
      //no left view, take whole space
      rightCol = (
        <Col className="verse right-col-no-left" span={24}>
          {arabicVerse}
          {transliterationVerse}
        </Col>
      );
    }
  }

  return (
    <Row className="Verse" style={{ borderBottom: border }}>
      {leftCol}
      {rightCol}
      <div style={{ position: "absolute", top: "0px", right: "0px" }}>
        <Fave faved={faved} onToggleFave={() => {}} />
      </div>
    </Row>
  );
};

export default Verse;
