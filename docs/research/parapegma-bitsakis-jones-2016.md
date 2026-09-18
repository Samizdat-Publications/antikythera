# Parapegma index letters on the front zodiac dial: attested positions

Research note, 2026-09-17. Read-only; nothing in the repo was changed.

**Primary source, opened in full and read directly:**
Bitsakis, Y. and Jones, A. (2016), "The Front Dial and Parapegma Inscriptions"
(*The Inscriptions of the Antikythera Mechanism* 3), *Almagest* 7.1, pp. 68-137.
DOI 10.1484/J.ALMAGEST.5.110734. **Open access (CC BY-NC 4.0)**, author PDF at
NYU's Faculty Digital Archive:
<https://archive.nyu.edu/jspui/bitstream/2451/71597/6/IAM%203%20bitsakis-jones-2016-the-front-dial-and-parapegma-inscriptions.pdf>

Not a paywall problem. The whole paper, including every transcription, was read.
All "verbatim" rows below were copied out of that PDF's own text layer (extracted
twice, with `pdftotext -layout` and with PyMuPDF, and cross-checked against each
other). Note: the paper's authorship is Bitsakis and Jones, not "Bitsakis, M." The
issue as a whole is Anastasiou, Bitsakis, Jones, Steele and Zafeiropoulou et al.

---

## 0. Bottom line for the model in the code

The current scheme (24 letters Α...Ω, two per sign, at 2.2° and 17.2°) does **not**
correspond to the attested machine. What Bitsakis and Jones establish is:

1. There were roughly **42 indexed events**, not 24: 30 stellar events plus 12
   zodiacal-sign entries. Verbatim: "The Mechanism's parapegma, with thirty stellar
   events, would have been selective even by the tradition's standards." (p. 109-110)
2. There were **two alphabetic sequences**, one per parapegma plate, so letters
   repeat. Verbatim: "The preserved index letters of col. iv, mu through pi,
   duplicate part of the sequence in PP1 col. ii. There must, therefore, have been
   more than one alphabetic sequence." (p. 99-100)
3. Density is **three or four events per sign**, at irregular degrees, not two per
   sign at fixed offsets.
4. The letter sits **immediately clockwise of a graduation mark**, and the graduation
   number equals the numeral written after the matching parapegma line. Verbatim
   (p. 68): index letters were "placed outside and immediately clockwise of the
   graduation marks corresponding to various degrees in the zodiacal signs."

**Conversion rule for code.** Bitsakis and Jones number graduations with the sign
boundary as graduation 1. Verbatim (p. 99):

> "The numerals could simply be the numbers of the graduations on the Zodiac Dial
> Scale where the index numbers were inscribed. They would thus represent the Sun's
> longitude in degrees within the currently occupied zodiacal sign, counting the
> first degree in the sign, what we would call 0° or perhaps more accurately the
> interval from 0° up to 1°, as 'degree 1.'"

So **offset into the sign in modern 0-based degrees = graduation number − 1**.
Α at the 1st graduation of Libra is exactly the autumnal equinoctial point, 180°.

Caveat the paper insists on: it cannot decide whether the numerals are degrees or
days, and calls them "day/degree numerals" throughout (p. 99). Voulgaris (2025)
argues for days. On the dial itself the letters are on graduation marks either way,
so for drawing the dial the graduation number is what matters.

---

## 1. Attested index letters: observed on the bronze of Fragment C

Source: Bitsakis and Jones 2016, section 3.4 "Transcription and translation",
sub-heading **"Index letters on the Zodiac Scale"**, **p. 84**. This is a prose list,
not a numbered table; the paper has no numbered tables at all (its exhibits are
Figs. 3.1-3.15). Reading basis stated by the authors: "The transcriptions are based
on the 2005 CT, PTM, and photographs, and on the 1905 photograph of C-1."

Every graduation number below is **verbatim** from p. 84. The degree column is a
mechanical `N − 1` application of the authors' own stated convention (marked
*derived*, not invented).

| Letter | Sign | Graduation (verbatim) | Degree into sign (derived) | Reading certainty (verbatim) | Verbatim / inferred |
|---|---|---|---|---|---|
| Ψ | Virgo | "To the right of the 19th graduation" | 18.0° | "Ψ̣: lower portion of a vertical with a broad serif" (dotted = uncertain) | verbatim |
| Ω | Virgo | "To the right of the 21st graduation" | 20.0° | undotted, secure | verbatim |
| Α | Libra | "To the right of the 1st graduation" | 0.0° | undotted | verbatim |
| Β | Libra | "To the right of the 11th graduation" | 10.0° | undotted | verbatim |
| Γ | Libra | "To the right of the 14th graduation" | 13.0° | undotted | verbatim |
| Δ | Libra | "To the right of the 16th graduation" | 15.0° | undotted | verbatim |
| Ε | Scorpio | "To the right of the 1st graduation" | 0.0° | undotted | verbatim |
| Ζ | Scorpio | "To the right of the 4th graduation" | 3.0° | undotted | verbatim |
| Η | Scorpio | "To the right of the 17th graduation" | 16.0° | undotted | verbatim |
| Θ | Scorpio | "To the right of the 22nd graduation" | 21.0° | undotted | verbatim |
| Ι | Sagittarius | "To the right of the 1st graduation" | 0.0° | undotted | verbatim |
| Κ | Sagittarius | "To the right of the 3rd graduation" | 2.0° | "Κ̣: entire letter visible but faint" | verbatim |
| Λ | Sagittarius | "To the right of the 7th graduation" | 6.0° | undotted | verbatim |

**13 letters with attested positions.** These are the only index letters that survive
on the physical zodiac scale. The surviving arc runs from mid-Virgo to mid-Sagittarius.

Additional verbatim qualifiers from the same page:

- Virgo sector: "preserved from its 15th graduation on, but surface damaged to the
  left of the 19th graduation".
- "The index letters in this sector were read from PTM ak32a; they cannot be seen in CT."
- Sector graduations are counted "clockwise from the presumed longer graduation
  marking the beginning of this sector, which we count as the 1st graduation".

**Earlier readings, superseded** (Bitsakis and Jones 2016, p. 84 n. 28, verbatim):
"Price 1959, 65, reports no index letters in this sector, but Price 1974, 18, reports
'with great uncertainty' Ω to the right of the 18th graduation ... We suspect that he
interpreted the remains of the psi that we report above as the lower right portion of
this supposed omega." So Price's Virgo 18 is rejected; use Ψ 19 / Ω 21.

I did **not** open Price 1974 or the Freeth et al. 2006 Nature Supplementary Notes.
Everything attributed to them here is Bitsakis and Jones reporting them.

### 1b. Day/degree numerals attested in the Parapegma Inscription text

These are positions for the *second* alphabetic sequence (plate PP1), whose stretch of
the zodiac scale is lost. They come from numerals engraved at the end of each
parapegma line, not from the dial. Source: section 3.4, pp. 86-88.

| Letter | Sign | Numeral (Greek, verbatim) | Value | Degree into sign (derived) | Verbatim / inferred |
|---|---|---|---|---|---|
| Ι | Aries | `[Α]` restored | 1 | 0.0° | restored by the editors (vernal equinox line is wholly lost) |
| Κ | Aries | lost (`nn`) | : | : | no value exists |
| Λ | Aries | `ΚΑ` | 21 or 24 : see §5 | 20.0° or 23.0° | verbatim but internally inconsistent in the paper |
| Μ | Taurus | `Α` | 1 | 0.0° | verbatim |
| Ν | Taurus | `ΙΑ` | 11 | 10.0° | verbatim (numeral secure; the letter `[Ν]` is restored) |
| Ξ | Taurus | `ΙΖ̣` | 17 | 16.0° | verbatim (final zeta dotted) |
| Ο | Taurus | `Κ̣Ε` | 25 | 24.0° | verbatim (kappa dotted) |
| Π | Gemini | `[Α]` restored | 1 | 0.0° | restored |
| Ρ | Gemini | lost (`nn`) | : | : | no value exists |
| Σ | Gemini | `Ι̣` | 10 | 9.0° | verbatim (iota dotted) |
| Η or Θ | Pisces (probable) | `ΙΑ` | 11 | 10.0° | numeral verbatim; letter and sign both inferred by the editors (pp. 101, 107, 113) |

PP2 col. iii independently repeats the dial values, which is the paper's own
cross-check: "index letters marking phenomena at the 1st, 11th, 14th, and 16th
division marks of Libra and the 1st division mark of Scorpio : exactly matching the
numerals in the parapegma inscription" (p. 99).

**Totals.** 13 positions read off the bronze scale; 6 further positions attested as
numerals in the inscription text for letters whose scale arc is lost (Λ, Μ, Ν, Ξ, Ο, Σ);
2 restored (Ι, Π); 1 attested numeral whose letter and sign are conjectural.
That is **19 positions resting on direct observation**, 21-22 if the restorations count.

---

## 2. Positions reconstructed by computation

**There is no such table.** This is the key negative result. Bitsakis and Jones do
not compute degree positions for the missing index letters. They run the inference in
the opposite direction: they take the attested day/degree numerals as data and fit a
*latitude* to them.

Verbatim (p. 117): "The identifications of the eight asterisms and phenomena whose
degree numbers in Virgo, Scorpio, and Sagittarius are marked by index letters on the
zodiac dial seem to us to be too uncertain to use."

And on Scorpio/Sagittarius (p. 111-112): "any identifications of the events that were
listed on the Mechanism would be exceedingly speculative in the absence of further
clues."

### What section 3.12 does contain (pp. 117-119)

- **Epoch of the computation: 100 BC.** Verbatim: "Zodiacal dates for each asterism
  were calculated by modern theory for 100 BC by the method described in Appendix 2."
  Sign-entry dates from JPL Horizons, tropical longitudes (p. 122 n. 57).
- **Earlier study** (Anastasiou et al. 2013) used **150 BC**, latitudes 25°-45°, and
  concluded the data "fit best latitudes between 33.3° and 37.0°".
- **Best-fit latitudes** (the paper's only tabular block in this section, p. 118;
  the PDF's own column alignment is garbled, so the row labels are reconstructed
  from the "Number of events" column, which is unambiguous):

| Data set | Latitude | Mean difference | Standard deviation | Number of events |
|---|---|---|---|---|
| Smaller set (PP1 col. ii only) | 34° 13′ | −3.1 d | 8.9 d | 5 |
| Larger set (+ PP2 col. iii) | 33° 4′ | −0.6 d | 8.6 d | 8 |

*Verbatim values; label-to-row assignment inferred from the event counts stated in
the surrounding prose.*

- **Corrected latitude estimate, verbatim:** "Correcting for this would bring the
  estimated latitude for the data in the Parapegma Inscription to about 35°, which
  suggests that its contents were based, directly or indirectly, on observations made
  at a mid-Mediterranean locality such as Rhodes or, at furthest north, southern
  Greece. Egypt (roughly 31° or less) is much less likely, and Epirus (around 41°)
  more or less out of the question."

### Appendix 1, "Model Parapegma" (section 3.13, pp. 122 ff.)

This is the nearest thing to computed positions, but it is **event → zodiacal date**,
not **letter → degree**. Columns: asterism, event code (ER/ES/MR/MS), computed dates
at latitudes **31°, 36°, 41°**, then the Euktemon and Eudoxos dates from the Geminos
Parapegma. It covers the standard repertoire of fifteen asterisms. Its purpose is to
suggest which asterism could fill a damaged line, not to place letters on the dial.
**I did not transcribe values from it: the multi-column layout is scrambled by text
extraction and I will not report numbers I cannot verify cell by cell.** If you want
these, they need reading off the rendered PDF pages 122-125 by eye.

---

## 3. Verbatim vs inferred: summary

- Every graduation number in §1 is **verbatim**, from p. 84.
- Every "degree into sign" is **derived** by `N − 1` from the authors' own stated
  convention (quoted in §0). Nothing is guessed.
- Every numeral in §1b is **verbatim** except the two marked restored.
- §2 reports the absence of a computed-position table as a **finding**, not a gap
  I failed to fill. No degree values were invented anywhere in this document.
- Letters with **no attested position at all**: the whole of PP1's Α-Θ except the
  ΙΑ=11 line, plus PP1 col. ii's Κ and Ρ, plus PP2 col. iv's Ρ, Σ, Τ, Υ, Φ, Χ.
  If the dial needs them drawn, they are model choices, not evidence.

---

## 4. The parapegma lines with their index letters

Layout established at pp. 103 and 107-108. Four columns, one per season, PP1 mounted
above the dial and PP2 below, so the columns run clockwise around the dial.

| Column | Signs | Index letters | Lines | Events |
|---|---|---|---|---|
| PP1 col. i | Capricorn – Pisces | alpha – theta | 9 | 8 (5 stellar) |
| PP1 col. ii | Aries – Gemini | iota – sigma | 11 | 10 (7 stellar) |
| PP2 col. iii | Libra – Sagittarius | alpha – lambda | 12 | 11 (8 stellar) |
| PP2 col. iv | Cancer – Virgo | mu – omega | 14 | 13 (10 stellar) |

*Verbatim from the totals block on p. 108.* Note the consequence stated on p. 106:
"On the dial, the sequence would have been continuous within each quadrant, but there
would have been discontinuities in the sequence of letters at the beginnings of
Cancer, Libra, and Capricorn." This is Freeth's hypothesis, which the authors accept.

### PP1 col. i : Capricorn to Pisces (letters Α-Θ)

Translation verbatim from pp. 85-86, with the reconstruction of p. 107.

| Line | Letter | Event (verbatim translation) | Numeral |
|---|---|---|---|
| 1 | [Α] | "[Capricorn] begins to rise." | : |
| 2 | : | "Winter [solstice. 1]" | [1] |
| 3 | [Β] | "[ ] rises in the evening. [nn]" : tentatively "[Sirius ri]ses in the evening" (p. 109) | lost |
| 4 | [Γ] | "[ ]…[" | lost |
| 5-7 | [Δ][Ε][Ζ] | lost; two of the lost lines were the Sun's entries into Aquarius and Pisces (p. 108) | lost |
| 8 | [Η] | lost text | `ΙΑ` = 11 |
| 9 | [Θ] | lost | lost |

The paper leaves open whether the ΙΑ line is line 8 (eta) or line 9 (theta), and
prefers line 8: "the wide line spacing in Fragment 9 argues for this line having been
the eighth" (p. 107).

### PP1 col. ii : Aries to Gemini (letters Ι-Σ)

Verbatim translation, pp. 86-87 (transcription line numbers x+1…x+9) with the
reconstruction line numbers of p. 108 in brackets.

| Line | Letter | Event (verbatim) | Numeral |
|---|---|---|---|
| [1] | [Ι] | "[Aries begins to rise.]" | : |
| [2] | : | "[Vernal equinox. 1]" | [1] |
| x+1 [3] | [Κ] | "[ ] in the evening. [nn]" : tentatively "[Κ Pleiades se]t in the evening" (p. 110) | lost |
| x+2 [4] | Λ | "Hyades set in the evening. 24" | `ΚΑ` : see §5 |
| x+3 [5] | Μ | "Taurus begins to rise. 1" | `Α` |
| x+4 [6] | [Ν] | "Lyra rises in the evening. 11" | `ΙΑ` |
| x+5 [7] | Ξ | "Pleiad rises in the morning. 17" | `ΙΖ̣` |
| x+6 [8] | Ο | "Hyad rises in the morning. 25" | `Κ̣Ε` |
| x+7 [9] | Π | "Gemini begin to rise. [1]" | `[Α]` |
| x+8 [10] | Ρ | "Aquila rises in the evening. [nn]" | lost |
| x+9 [11] | Σ | "Arcturus sets in the morning. 10" | `Ι̣` |

### PP2 col. iii : Libra to Sagittarius (letters Α-Λ)

Lines 1-6 verbatim, pp. 87-88; restorations of asterism names from p. 110.
Lines 7-12 have no surviving text; their degrees come from the dial (§1).

| Line | Letter | Event | Numeral / degree |
|---|---|---|---|
| 1 | [Α] | "[Α] Claws (i.e. Libra) begin to rise." | : |
| 2 | : | "[ ] Autumnal equinox. 1" | `Α` = 1 |
| 3 | [Β] | "[ ] rise in the evening. 11" : restored "[Β Haedi] rise in the evening" | `ΙΑ` = 11 |
| 4 | [Γ] | "[ ] rises in the evening. 14" : restored "[Γ Pleias] rises in the evening" | `ΙΔ` = 14 |
| 5 | [Δ] | "[ ] rises [in the morning/evening.] 16" : restored "[Δ Corona] rises [in the morning]" | `ΙϚ` = 16 |
| 6 | [Ε] | "[Ε Scorpio begins] to rise. 1" | `Α̣` = 1 |
| 7 | Ζ | text lost | Scorpio 4 (from dial) |
| 8 | Η | text lost | Scorpio 17 (from dial) |
| 9 | Θ | text lost | Scorpio 22 (from dial) |
| 10 | Ι | "Sagittarius begins to rise" (inferred from the dial's letter at the sign boundary) | Sagittarius 1 (from dial) |
| 11 | Κ | text lost | Sagittarius 3 (from dial) |
| 12 | Λ | text lost | Sagittarius 7 (from dial) |

Line 10's event is *inferred*: the paper's argument is that an index letter at a
sign's initial graduation must correspond to a "begins to rise" statement (p. 98).

### PP2 col. iv : Cancer to Virgo (letters Μ-Ω)

Lines 1-6 verbatim, p. 88. Lines 13-14 restored at p. 112.

| Line | Letter | Event (verbatim) | Numeral |
|---|---|---|---|
| 1 | Μ | "Cancer [begins to rise.]" | : |
| 2 | : | "[Summer solstice. 1]" | [1] |
| 3 | Ν | "Orion [rises in the morning. nn]" | lost |
| 4 | Ξ | "Sirius [rises in the morning. nn]" | lost |
| 5 | Ο | "Aquila [sets in the morning. nn]" | lost |
| 6 | Π | "Leo [begins to rise. 1]" | [1] |
| 7-12 | Ρ Σ Τ Υ Φ Χ | entirely lost | lost |
| 13 | [Ψ] | "[Ψ Capella rises in the evening. 19]" | restored |
| 14 | [Ω] | "[Ω Arcturus rises in the morning. 21]" | restored |

The authors' reasoning for line 14, verbatim (p. 112): "The morning rising of
Arcturus, a few days before the autumnal equinox, was perhaps the single most
important and widely recognized stellar event of the year for the Greeks, so that it
is hard to believe that the event indexed as omega at the 21st degree of Virgo was
anything else. The best candidate for the event indexed psi, at the 19th degree, is
the evening rising of Capella."

### Comparison with the list currently in the code

The scheme "Α spring equinox, Β Pleiades set in the evening, … Ω Pisces begins to
rise" does not match the source at any point:

- **Α is the autumnal equinox**, not the spring equinox. The spring equinox is **Ι**,
  and it is at the *start* of PP1 col. ii's alphabet, in the other sequence.
- **Β** is an evening rising in Libra, probably Haedi, at Libra 11. The evening
  setting of the Pleiades is **Κ**, in Aries.
- **Ω is the morning rising of Arcturus at Virgo 21**, not "Pisces begins to rise".
- No letter corresponds to "Pisces begins to rise"; that line falls in PP1 col. i
  among the lost Γ-Θ.
- "Two per sign" is wrong: Libra and Scorpio each carry four letters, Sagittarius at
  least three, Virgo at least two in its final third alone.

---

## 5. Discrepancies and open points

1. **Λ's numeral, 21 or 24.** The Greek transcription prints `ΚΑ` (= 21) in both
   places it appears (section 3.4, p. 86; the reconstruction, p. 108), while the
   English translation prints "24" (p. 86). Both extractors agree the glyphs are
   `ΚΑ`, and the same paper renders `ΚΑ` as "21" at p. 112 (line 14 of PP2 col. iv),
   so the "24" looks like a typo for 21 : but the delta in `Ὑάδ̣[ες]` on the same line
   is dotted, so I will not call it. **Verify against Fig. 3.8 before using.**
   Consequence: Aries 20.0° or Aries 23.0°.
2. **Fragment 28.** If Fragment 28 belongs to PP2 col. iv (Virgo) rather than PP1
   col. i (Aquarius), the last lines re-read as day counts in a 31-day Virgo:
   "[Χ Pegasus rises] in the evening. 16 / [Ψ Capella rises] in the evening. 20 /
   [Ω Arcturus rises] in the morning. [22]" (p. 116). **The dial positions are
   unaffected**: Ψ and Ω stay at the 19th and 21st graduations of Virgo either way.
   The authors do not decide between the Aquarius and Virgo placements.
3. **Degrees or days.** Unresolved in the source ("day/degree numerals", p. 99).
   Voulgaris (2025) argues the zodiac ring's 365 subdivisions are days, citing this
   very evidence: verbatim, "the parapegma units/days are in agreement with the
   zodiac ring subdivisions/days (the index letters are engraved on some of the
   zodiac subdivisions; see Bitsakis and Jones 2016a)." This bears on the ring's
   division, not on which graduation a letter sits against.
4. **Jones, *A Portable Cosmos* (2017)** was not consulted; it post-dates and
   summarises this paper, which is the primary publication. No need.
5. **Freeth et al. 2006 Supplementary Notes and Price 1974** were not opened. Both
   are superseded here for the index letters, and Bitsakis and Jones explicitly
   correct Price's Virgo reading (§1).

---

## Sources

1. Bitsakis, Y. and Jones, A. (2016), "The Front Dial and Parapegma Inscriptions",
   *Almagest* 7.1, 68-137. DOI 10.1484/J.ALMAGEST.5.110734. Open access PDF, read in
   full: <https://archive.nyu.edu/jspui/bitstream/2451/71597/6/IAM%203%20bitsakis-jones-2016-the-front-dial-and-parapegma-inscriptions.pdf>
   Sections used: 3.4 (p. 84, index letters on the Zodiac Scale; pp. 85-88,
   transcriptions), 3.7-3.9 (pp. 98-108, layout and reconstruction), 3.10 (pp. 109-112,
   tentative identifications), 3.11 (pp. 113-116, Fragment 28), 3.12 (pp. 117-119,
   astronomical assessment), 3.13 (pp. 122 ff., model parapegma).
2. Complete issue, *The Inscriptions of the Antikythera Mechanism*, *Almagest* 7.1
   (2016): <https://archive.nyu.edu/bitstream/2451/71597/2/IAM%20Almagest%207.1%202016%20Complete.pdf>
3. Publisher landing page (Brepols):
   <https://www.brepolsonline.net/content/journals/10.1484/J.ALMAGEST.5.110734>
4. Journal issue index (HPDST): <https://www.hpdst.gr/publications/almagest/issues/7-1>
5. Bryn Mawr Classical Review of the issue, 2017.03.11:
   <https://bmcr.brynmawr.edu/2017/2017.03.11/>
6. Voulgaris, A. et al. (2025), "Reconstructing the Antikythera Mechanism's Central
   Front Dial Parts: Division and Placement of the Zodiac Dial Ring", *Journal of
   Astronomical History and Heritage* 28(1), 257-279. Read in full via
   <https://arxiv.org/pdf/2505.08484>. Used only for the days-vs-degrees question;
   it does not list the index letters with their graduations.
7. Cited inside source 1, not opened here: Anastasiou et al. 2013 (latitude fit,
   150 BC); Freeth and Jones 2012, *ISAW Papers* 4, Fig. 4 (the index-letter
   hypothesis the paper adopts); Price 1959 and Price 1974 (superseded readings).
