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

/**
 * Every axis tick and label. ink-600 — 5.78:1 on white, 5.45:1 on the ink-50
 * plane, so it clears the 4.5:1 that axis text needs on either.
 *
 * There used to be a second, lighter `AXIS_MUTED` (ink-500) on the trend chart's
 * y-axis. It measured 3.76:1 on white and 3.54:1 once these charts moved off
 * their white card onto the page plane — under the bar in both cases. It is gone
 * rather than merely unused: a token that fails the floor invites the next reuse.
 */
export const AXIS_TEXT = '#6c6555'; // ink-600

/** Gauge track: a lighter step of the *same* ramp as the fill, never a neutral. */
export const TRACK = '#e7e9f8'; // brand-100

/**
 * The two surfaces a mark's ring is drawn against — the ring only separates the
 * mark from what is under it if it matches what is under it.
 *
 * The radar and the trend line sit directly on the page plane; only the gauge's
 * `card` tone still draws on white.
 */
export const SURFACE = '#ffffff';
export const PLANE = '#faf8f4'; // ink-50

/*
 * Dark-plate variants.
 *
 * The hero meter sits on the ink-950 plate, not on a white card, so it gets its
 * own **selected** steps of the same brand ramp — re-stepped for that surface
 * rather than reused from above or flipped automatically. Both were checked with
 * the dataviz validator against #1c1915 (`--mode dark --surface "#1c1915"`) and
 * clear the 3:1 mark floor; the ratios below are the measured values.
 *
 * Only the meter moved. The radar and the trend line still draw on white cards,
 * so they keep the light tokens and their existing validation stands.
 */
export const PLATE = '#1c1915'; // ink-950 — the hero surface

/** The score arc on the plate. brand-300 — 9.36:1 on #1c1915. */
export const YOU_ON_PLATE = '#b5bbe7';

/**
 * Its track: a *darker* step of the same ramp, so the whole ring reads as one
 * scale rather than fill-versus-void. 2.67:1 — recessive, but the unfilled arc
 * still has to be visible or the meter reads as a broken circle instead of a
 * score out of 100. brand-800 was the first pick and measured 2.07:1, which lost
 * the track against the plate entirely.
 */
export const TRACK_ON_PLATE = '#535896'; // brand-700
