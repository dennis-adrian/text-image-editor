export interface PrintImage {
  dataUrl: string;
  label: string;
}

let store: PrintImage[] = [];

export const printStore = {
  set: (images: PrintImage[]) => {
    store = images;
  },
  get: () => store,
  clear: () => {
    store = [];
  },
};
