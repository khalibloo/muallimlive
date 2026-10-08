import type { TajweedRuleId } from "./tajweed";

export interface TajweedSample {
  chapter: number;
  verse: number;
  /** The rules the verse's Uthmani tajweed text or transliteration marks */
  rules: readonly TajweedRuleId[];
  arabic: string;
  transliteration: string;
}

/** Short verses that between them show every tajweed rule, for the tajweed settings' preview. From the CDN's
 * `uthmani_tajweed` script and transliteration (translation 0) */
export const TAJWEED_SAMPLES: readonly TajweedSample[] = [
  {
    chapter: 30,
    verse: 23,
    rules: [
      "hamzat-wasl",
      "madd-2",
      "madd-arid",
      "madd-badal",
      "madd-wajib",
      "madd-jaiz",
      "qalqalah",
      "ghunnah",
      "idgham-ghunnah",
      "idgham-no-ghunnah",
      "idgham-shafawi",
      "ikhfa",
      "ikhfa-shafawi",
      "light-ra-reading-on",
      "dropped-ending",
      "silent-letter",
    ],
    arabic:
      "وَمِنْ ءَايَ<tajweed class=madda_normal>ـٰ</tajweed>تِه<tajweed class=madda_normal>ِۦ</tajweed> مَنَامُك<tajweed class=ikhafa_shafawi>ُم ب</tajweed>ِ<tajweed class=ham_wasl>ٱ</tajweed>لَّيْلِ وَ<tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed><tajweed class=ghunnah>نّ</tajweed>َهَارِ وَ<tajweed class=ham_wasl>ٱ</tajweed><tajweed class=qalaqah>بْ</tajweed>تِغ<tajweed class=madda_obligatory>َا</tajweed>ٓؤُك<tajweed class=idgham_shafawi>ُم م</tajweed>ِّ<tajweed class=ikhafa>ن ف</tajweed>َضْلِه<tajweed class=madda_obligatory>ِۦٓ‌ۚ</tajweed> إِ<tajweed class=ghunnah>نّ</tajweed>َ فِى ذ<tajweed class=madda_normal>َٲ</tajweed>لِكَ لَأَيَ<tajweed class=madda_normal>ـٰ</tajweed><tajweed class=idgham_wo_ghunnah>تٍ ل</tajweed>ِّقَوْ<tajweed class=idgham_ghunnah>مٍ ي</tajweed>َسْمَع<tajweed class=madda_permissible>ُو</tajweed>نَ <span class=end>٢٣</span>",
    transliteration:
      "Wa Min 'Āyātihi Manāmuku<tajweed class=KhW>m</tajweed> Bil-La<tajweed class=MS2>y</tajweed>li Wa <tajweed class=HmA>A</tajweed><tajweed class=GhSh>n</tajweed>-Nah<tajweed class=MS2>ā</tajweed><tajweed class=RqW>r</tajweed>i Wa <tajweed class=HmI><u>A</u></tajweed><tajweed class=Q>b</tajweed>ti<tajweed class=R><u>gh</u></tajweed><tajweed class=MWT>ā</tajweed>'uuku<tajweed class=DW>m</tajweed> Mi<tajweed class=KhQ>n</tajweed> Fađlihi ۚ 'I<tajweed class=GhSh>nn</tajweed>a Fī <u>Dh</u>ālika La'<tajweed class=MB>ā</tajweed>y<tajweed class=MS2>ā</tajweed>ti<tajweed class=Kh>n</tajweed> Li<tajweed class=R>q</tajweed>a<tajweed class=MS2>w</tajweed>mi<tajweed class=Gh>n</tajweed> Yasma`<tajweed class=MS>ū</tajweed>n<tajweed class=EdAyh>a</tajweed>",
  },
  {
    chapter: 24,
    verse: 53,
    rules: [
      "hamzat-wasl",
      "madd-2",
      "madd-arid",
      "madd-jaiz",
      "qalqalah",
      "ghunnah",
      "idgham-ghunnah",
      "idgham-mithlayn",
      "iqlab",
      "light-ra",
      "light-lam",
      "heavy-lam",
      "dropped-ending",
      "silent-letter",
    ],
    arabic:
      "۞ وَأَ<tajweed class=qalaqah>قْ</tajweed>سَمُو<tajweed class=slnt>اْ</tajweed> بِ<tajweed class=ham_wasl>ٱ</tajweed>للَّهِ جَهْدَ أَيْمَ<tajweed class=madda_normal>ـٰ</tajweed>نِهِمْ لَئِنْ أَمَرْتَهُمْ لَيَخْرُجُ<tajweed class=ghunnah>نّ</tajweed>َ‌ۖ قُل لَّا تُ<tajweed class=qalaqah>قْ</tajweed>سِمُو<tajweed class=slnt>اْ‌ۖ</tajweed> طَاعَ<tajweed class=idgham_ghunnah>ةٌ م</tajweed>َّعْرُوفَةٌ‌ۚ إِ<tajweed class=ghunnah>نّ</tajweed>َ <tajweed class=ham_wasl>ٱ</tajweed>للَّهَ خَبِي<tajweed class=iqlab>رُۢ ب</tajweed>ِمَا تَعْمَل<tajweed class=madda_permissible>ُو</tajweed>نَ <span class=end>٥٣</span>",
    transliteration:
      "Wa 'A<tajweed class=\"Q R\">q</tajweed>samū Bi<tajweed class=TqL>ll</tajweed>āhi Jahda 'Aymānihim La'in 'Amartahum Laya<tajweed class=R><u>kh</u></tajweed><tajweed class=R>ru</tajweed>ju<tajweed class=GhSh>nn</tajweed>a ۖ <tajweed class=R>Q</tajweed>u<tajweed class=DY>l</tajweed> Lā Tu<tajweed class=\"Q R\">q</tajweed>simū ۖ <tajweed class=R>Ţ</tajweed>ā`atu<tajweed class=Gh>n</tajweed> Ma`rūfatun ۚ 'I<tajweed class=GhSh>nn</tajweed>a <tajweed class=HmA>A</tajweed><tajweed class=TfL>ll</tajweed>āha <tajweed class=R><u>Kh</u></tajweed>ab<tajweed class=MS2>ī</tajweed><tajweed class=RqQ>r</tajweed>u<tajweed class=IM>n</tajweed> Bimā Ta`mal<tajweed class=MS>ū</tajweed>n<tajweed class=EdAyh>a</tajweed>",
  },
  {
    chapter: 28,
    verse: 85,
    rules: [
      "hamzat-wasl",
      "madd-2",
      "madd-arid",
      "madd-badal",
      "madd-lazim",
      "madd-wajib",
      "madd-jaiz",
      "ghunnah",
      "idgham-ghunnah",
      "idgham-mutajanisayn",
      "idgham-mutaqaribayn",
      "ikhfa",
      "dropped-ending",
    ],
    arabic:
      "إِ<tajweed class=ghunnah>نّ</tajweed>َ <tajweed class=ham_wasl>ٱ</tajweed>لَّذِى فَرَضَ عَلَيْكَ <tajweed class=ham_wasl>ٱ</tajweed>لْقُرْءَانَ لَر<tajweed class=madda_necessary>َا</tajweed>ٓدُّكَ إِلَىٰ مَعَا<tajweed class=ikhafa>دٍ‌ۚ ق</tajweed>ُ<tajweed class=idgham_mutaqaribayn>ل</tajweed> رَّبّ<tajweed class=madda_obligatory>ِىٓ</tajweed> أَعْلَمُ مَ<tajweed class=ikhafa>ن ج</tajweed><tajweed class=madda_obligatory>َا</tajweed>ٓءَ بِ<tajweed class=ham_wasl>ٱ</tajweed>لْهُدَىٰ وَمَنْ هُوَ فِى ضَلَ<tajweed class=madda_normal>ـٰ</tajweed><tajweed class=idgham_ghunnah>لٍ م</tajweed>ُّب<tajweed class=madda_permissible>ِي</tajweed>نٍ <span class=end>٨٥</span>",
    transliteration:
      "'I<tajweed class=GhSh>nn</tajweed>a <tajweed class=HmA>A</tajweed>l-La<u>dh</u>ī Fa<tajweed class=R>ra</tajweed>đa `Ala<tajweed class=MS2>y</tajweed>ka <tajweed class=HmA>A</tajweed>l-<tajweed class=R>Q</tajweed>ur'<tajweed class=MB>ā</tajweed>na Lar<tajweed class=ML>ā</tajweed>dduka 'Ilá Ma`<tajweed class=MS2>ā</tajweed>di<tajweed class=KhQ>n</tajweed> ۚ <tajweed class=R>Q</tajweed>u<tajweed class=DJ>l</tajweed> <tajweed class=R>Ra</tajweed>bb<tajweed class=MJF>ī</tajweed> 'A`lamu Ma<tajweed class=KhQ>n</tajweed> J<tajweed class=MWT>ā</tajweed>'a Bil-Hudá Wa Man Huwa Fī <tajweed class=R>Đ</tajweed>al<tajweed class=MS2>ā</tajweed>li<tajweed class=Gh>n</tajweed> Mub<tajweed class=MS>ī</tajweed>n<tajweed class=EdAyh>in</tajweed>",
  },
  {
    chapter: 69,
    verse: 1,
    rules: ["madd-lazim", "ta-marbutah", "dropped-ending"],
    arabic: "ٱلْح<tajweed class=madda_necessary>َا</tajweed>ٓقَّةُ <span class=end>١</span>",
    transliteration:
      "Al-Ĥ<tajweed class=ML>ā</tajweed><tajweed class=R>qq</tajweed>a<tajweed class=Th>h</tajweed><tajweed class=EdAyh>u</tajweed>",
  },
  {
    chapter: 79,
    verse: 38,
    rules: ["hamzat-wasl", "madd-2", "izhar", "silent-letter"],
    arabic:
      "وَءَاثَرَ <tajweed class=ham_wasl>ٱ</tajweed>لْحَيَ<tajweed class=slnt>و</tajweed><tajweed class=madda_normal>ٲ</tajweed>ةَ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed>دُّنْيَا <span class=end>٣٨</span>",
    transliteration:
      "Wa 'Ā<u>th</u>a<tajweed class=R>ra</tajweed> <tajweed class=HmA>A</tajweed>l-Ĥayāata <tajweed class=HmA>A</tajweed>d-Du<tajweed class=ZQ>n</tajweed>yā",
  },
];
