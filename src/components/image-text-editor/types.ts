export type TextAlign = "left" | "center" | "right";

export interface TextSettings {
  textInput: string;
  textX: number;
  textY: number;
  textBoxWidth: number;
  textBoxHeight: number;
  textColor: string;
  fontFamily: string;
  textAlign: TextAlign;
}

export const LOCAL_STORAGE_KEY = "image-text-editor-settings";

export const DEFAULT_SETTINGS: TextSettings = {
  textInput: "Your Text Here",
  textX: 14.8,
  textY: 31,
  textBoxWidth: 70,
  textBoxHeight: 10,
  textColor: "#55559D",
  fontFamily: "Reusco Display",
  textAlign: "center",
};
