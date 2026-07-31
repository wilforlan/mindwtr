import type { MindwtrApi } from "@shared/types";

declare global {
  interface Window {
    mindwtr: MindwtrApi;
  }
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

export {};
