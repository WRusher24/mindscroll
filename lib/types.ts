/** Client-safe DTOs shared between server and UI. Dates are ISO strings. */
export type TopicChip = { id: string; name: string; emoji: string; accent: string };

export type ArticleCard = {
  id: string;
  title: string;
  teaser: string;
  url: string;
  imageUrl: string | null;
  tags: string[];
  readingMinutes: number;
  publishedAt: string;
  author: string | null;
  source: string;
  topic: TopicChip;
  readLater: boolean;
  saved: boolean;
};

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export type HighlightDTO = {
  id: string;
  articleId: string;
  text: string;
  note: string | null;
  color: HighlightColor;
  startOffset: number;
  endOffset: number;
  createdAt: string;
};

export type ReaderArticle = ArticleCard & {
  contentHtml: string | null;
  extractionFailed: boolean;
  highlights: HighlightDTO[];
};

export type VaultGroup = {
  article: Pick<ArticleCard, "id" | "title" | "source" | "url" | "topic" | "readingMinutes">;
  highlights: HighlightDTO[];
  lastHighlightedAt: string;
};

export type TopicWithState = TopicChip & { description: string; sourceCount: number; subscribed: boolean };

export type ReaderThemeId = "oled" | "midnight" | "sepia" | "light" | "mint";
export type ReaderPrefsDTO = { theme: ReaderThemeId; fontSize: number; lineHeight: number; fontFamily: "serif" | "sans" };

export const DEFAULT_READER_PREFS: ReaderPrefsDTO = { theme: "midnight", fontSize: 19, lineHeight: 1.7, fontFamily: "serif" };

export type ReaderTheme = {
  id: ReaderThemeId;
  label: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  surface: string;
  border: string;
  dark: boolean;
};

/** Moon+ Reader Pro–style reading themes. */
export const READER_THEMES: ReaderTheme[] = [
  { id: "oled", label: "OLED Black", bg: "#000000", fg: "#d4d4d8", muted: "#71717a", accent: "#60a5fa", surface: "#0b0b0d", border: "#1f1f23", dark: true },
  { id: "midnight", label: "Midnight", bg: "#0f172a", fg: "#cbd5e1", muted: "#7c8aa5", accent: "#7dd3fc", surface: "#16213a", border: "#24324f", dark: true },
  { id: "sepia", label: "Sepia", bg: "#f4ecd8", fg: "#433422", muted: "#8a7656", accent: "#9a5b13", surface: "#ebe1c8", border: "#ddd0b0", dark: false },
  { id: "light", label: "Classic Light", bg: "#ffffff", fg: "#1f2937", muted: "#6b7280", accent: "#2563eb", surface: "#f3f4f6", border: "#e5e7eb", dark: false },
  { id: "mint", label: "Forest Mint", bg: "#e8f5e9", fg: "#1b3a26", muted: "#587a63", accent: "#15803d", surface: "#d7ecda", border: "#c1dfc6", dark: false },
];

export const HIGHLIGHT_SWATCHES: Record<HighlightColor, { light: string; dark: string; dot: string }> = {
  yellow: { light: "rgba(250, 204, 21, 0.45)", dark: "rgba(250, 204, 21, 0.32)", dot: "#facc15" },
  green: { light: "rgba(74, 222, 128, 0.42)", dark: "rgba(74, 222, 128, 0.28)", dot: "#4ade80" },
  blue: { light: "rgba(96, 165, 250, 0.42)", dark: "rgba(96, 165, 250, 0.32)", dot: "#60a5fa" },
  pink: { light: "rgba(244, 114, 182, 0.42)", dark: "rgba(244, 114, 182, 0.32)", dot: "#f472b6" },
};
