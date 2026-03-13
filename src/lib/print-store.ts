export interface PrintImage {
  dataUrl: string;
  label: string;
}

let store: PrintImage[] = [];

export const printStore = {
  add: (images: PrintImage[]) => {
    store = [...store, ...images];
  },
  set: (images: PrintImage[]) => {
    store = images;
  },
  get: () => store,
  clear: () => {
    store = [];
  },
};
