import type { NoteCategory } from "./noteCategories";

type NoteCategoryOgp = {
  readonly image: string;
  readonly imageAlt: string;
};

export const noteCategoryOgps = {
  tech: {
    image: "/og-image-note-tech.png",
    imageAlt: "ノートパソコンで作業するコーギーと TECH の文字",
  },
  note: {
    image: "/og-image-note-note.png",
    imageAlt: "ノートに書き込むコーギーと NOTE の文字",
  },
  devlog: {
    image: "/og-image-note-devlog.png",
    imageAlt: "ターミナルに表示されたコーギーと DEVLOG の文字",
  },
} as const satisfies Record<NoteCategory, NoteCategoryOgp>;
