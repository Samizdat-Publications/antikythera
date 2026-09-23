/** Saving the stage as a picture: reading a canvas, handing the file to the browser, and the name it takes. */

/**
 * A canvas as a picture. The bitmap is copied in the task this is called in, which is what lets a
 * caller that raised its resolution put the screen's own back at once, without waiting for the file.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("the stage could not be turned into a picture"))), type);
  });
}

/** Offer the blob as a download, then let the object URL go once the browser has had it (Safari starts the download after this returns). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * The file's name: the view and the date the machine is set to, as in
 * `antikythera-front-close-12-May-205-BC.png`. Spaces in the date become hyphens and
 * anything a filename should not carry is dropped.
 */
export function snapshotName(view: string, date: string): string {
  const plain = date.replace(/ /g, "-").replace(/[^A-Za-z0-9-]/g, "");
  return `antikythera-${view}-${plain}.png`;
}
