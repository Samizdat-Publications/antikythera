import { describe, expect, it } from "vitest";
import html from "../../index.html?raw";
import manifestRaw from "../../public/manifest.webmanifest?raw";
import main from "../main.ts?raw";

/**
 * The colour the browser paints its own chrome with cannot be a `var()`: it is read from
 * `<meta name="theme-color">` and from the web app manifest, before any stylesheet is in hand,
 * and it has to be sRGB rather than one of the OKLCH tokens in style.css. So the two values are
 * written out four times, in three files, and this test is what keeps them from drifting apart.
 * If a theme's ground changes in style.css, change the sRGB equivalent here and in those files.
 */
const VITRINE = "#17120e";                                     // --bg of the vitrine, lamp-black
const MANUSCRIPT = "#efe6d3";                                  // --bg of the manuscript, parchment

describe("the browser chrome colour", () => {
  const manifest = JSON.parse(manifestRaw) as Record<string, string>;

  it("starts the page on the vitrine's ground", () => {
    expect(html).toContain(`<meta name="theme-color" content="${VITRINE}" />`);
    expect(manifest.theme_color).toBe(VITRINE);
    expect(manifest.background_color).toBe(VITRINE);
  });
  it("repaints to the manuscript's before paint, and again when the version is switched", () => {
    expect(html).toContain(`m.setAttribute("content", "${MANUSCRIPT}")`);
    expect(main).toContain(`t === "manuscript" ? "${MANUSCRIPT}" : "${VITRINE}"`);
  });
  it("carries no third colour: every hex in the manifest is the vitrine's", () => {
    const hexes = (JSON.stringify(manifest).match(/#[0-9a-f]{6}/gi) ?? []).map((h) => h.toLowerCase());
    expect(new Set(hexes)).toEqual(new Set([VITRINE]));        // the manuscript's is only ever set by script
  });
});
