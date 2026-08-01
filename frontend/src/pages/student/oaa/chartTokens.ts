/**
 * Chart colours for the OAA dashboard.
 *
 * Every value below was checked with the dataviz validator against the white card
 * surface rather than picked by eye — the numbers in the comments are the measured
 * contrast ratios, so a future change can be re-checked against the same bar.
 *
 * The form here is **emphasis**, not categorical: the student is the subject and
 * the class average is context. That is one hue plus a gray, which is why there is
 * no eight-slot palette in this file.
 */

/** The student's own marks. 4.93:1 on white — clears the 3:1 mark floor. */
export const YOU = '#646ab4'; // brand-600

/**
 * The class-average context series. 3.76:1 — passes.
 * ink-400 was the first choice and came back at 2.33:1, which would have needed a
 * relief channel; ink-500 clears the floor outright.
 */
export const COHORT = '#8b8372'; // ink-500

/** Chrome, deliberately recessive: gridlines sit one step off the surface. */
export const GRID = '#e9e3d8'; // ink-200
export const AXIS_TEXT = '#6c6555'; // ink-600 — 5.78:1, readable at tick size
export const AXIS_MUTED = '#8b8372'; // ink-500

/** Gauge track: a lighter step of the *same* ramp as the fill, never a neutral. */
export const TRACK = '#e7e9f8'; // brand-100

/** Marks sit on white cards throughout the app. */
export const SURFACE = '#ffffff';
