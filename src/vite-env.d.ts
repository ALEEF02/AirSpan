
interface Window {
  airspanDesktop?: {
    getPairingOrigin?: () => Promise<string>;
    getCaptureSources?: () => Promise<
      Array<{
        id: string;
        name: string;
        type: "screen" | "window";
        thumbnail: string;
        displayId: string | null;
      }>
    >;
    selectCaptureSource?: (
      sourceId: string,
    ) => Promise<{ ok: boolean }>;
  };
}
