/**
 * Chart colours.
 *
 * Every value below was checked against the surfaces the charts sit on rather
 * than picked by eye — the numbers in the comments are the measured contrast
 * ratios, so a future change can be re-checked against the same bar. Marks need
 * ≥3:1 against their surface; axis text needs ≥4.5:1. Gridlines are the
 * exception: recessive by design.
 *
 * (Carried over from the OAA score charts, which are retired. Only the tokens in
 * use were kept — an unused token is an invitation to misuse it.)
 */

/** The student's own series. brand-600 — 4.93:1 on white, ~4.6:1 on ink-50. */
export const YOU = '#646ab4';

/**
 * A second series that means "pressure" — stress on the Burnout chart. accent-600,
 * the clay ramp that the portal reserves for warnings: 4.35:1 on white and 4.10:1
 * on ink-50, both over the 3:1 mark floor. Too light for small text (see
 * accent-700 in global.css), which is why it is only ever a line here.
 */
export const STRESS = '#a96a43';

/** Chrome, deliberately recessive: gridlines sit one step off the surface. */
export const GRID = '#e9e3d8'; // ink-200

/**
 * Every axis tick and label. ink-600 — 5.78:1 on white, 5.45:1 on the ink-50
 * plane, so it clears the 4.5:1 that axis text needs on either.
 */
export const AXIS_TEXT = '#6c6555'; // ink-600

/**
 * The two surfaces a mark's ring is drawn against — the ring only separates the
 * mark from what is under it if it matches what is under it.
 */
export const SURFACE = '#ffffff';
export const PLANE = '#faf8f4'; // ink-50
