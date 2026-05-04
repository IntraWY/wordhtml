import { create } from "zustand";

type DialogType = "confirm" | "alert" | "prompt";

interface DialogState {
  open: boolean;
  type: DialogType;
  title: string;
  message: string;
  defaultValue: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onSubmit?: (value: string) => void;
  openConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => void;
  openAlert: (title: string, message: string) => void;
  openPrompt: (
    title: string,
    message: string,
    defaultValue: string,
    onSubmit: (value: string) => void,
    onCancel?: () => void
  ) => void;
  close: () => void;
}

export const useDialogStore = create<DialogState>()((set) => ({
  open: false,
  type: "alert",
  title: "",
  message: "",
  defaultValue: "",
  onConfirm: undefined,
  onCancel: undefined,
  onSubmit: undefined,
  openConfirm: (title, message, onConfirm, onCancel) =>
    set({
      open: true,
      type: "confirm",
      title,
      message,
      defaultValue: "",
      onConfirm,
      onCancel,
      onSubmit: undefined,
    }),
  openAlert: (title, message) =>
    set({
      open: true,
      type: "alert",
      title,
      message,
      defaultValue: "",
      onConfirm: undefined,
      onCancel: undefined,
      onSubmit: undefined,
    }),
  openPrompt: (title, message, defaultValue, onSubmit, onCancel) =>
    set({
      open: true,
      type: "prompt",
      title,
      message,
      defaultValue,
      onSubmit,
      onCancel,
      onConfirm: undefined,
    }),
  close: () =>
    set({
      open: false,
      onConfirm: undefined,
      onCancel: undefined,
      onSubmit: undefined,
    }),
}));
