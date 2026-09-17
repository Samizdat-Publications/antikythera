/** Saving the stage as a picture: handing the file to the browser, and the name it takes. */

/** Offer the blob as a download, then let the object URL go. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
