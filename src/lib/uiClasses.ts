/**
 * Reusable UI surface classes (styles live in globals.css).
 */
export const ui = {
  card: "ui-card",
  section: "ui-section",
  sectionEdit: "ui-section ui-section--edit",
  habitRow: "ui-habit-row",
  habitRowEdit: "ui-habit-row ui-habit-row--edit",
  surfaceInset: "ui-surface-inset",
  nav: "ui-nav",
  navLink: "ui-nav-link",
  navLinkActive: "ui-nav-link ui-nav-link--active",
  pillTabs: "ui-pill-tabs",
  pillTab: "ui-pill-tab",
  pillTabActive: "ui-pill-tab ui-pill-tab--active",
  modalBackdrop: "ui-modal-backdrop",
  modalPanel: "ui-modal-panel",
  graphModalPanel: "ui-graph-modal-panel",
  input: "ui-input",
  settingsBtn: "ui-settings-btn",
  navArrow: "ui-nav-arrow",
} as const;

/** Modal overlay + centered flex shell */
export const modalOverlay =
  "fixed inset-0 z-[60] flex items-center justify-center p-4";

export const modalOverlayLow = "fixed inset-0 z-50 flex items-center justify-center p-4";

export const labelClass = "block text-xs font-medium text-[var(--foreground)]/60";

export const selectClass = `mt-1 w-full px-3 py-2 text-sm ${ui.input}`;

export const textareaClass = `mt-2 w-full resize-y px-3 py-2.5 text-sm min-h-[120px] ${ui.input}`;
