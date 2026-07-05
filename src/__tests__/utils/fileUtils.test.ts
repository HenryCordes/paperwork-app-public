import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { blobToBase64 } from "../../utils/fileUtils";

// ---------------------------------------------------------------------------
// FileReader stub helpers
// ---------------------------------------------------------------------------

type FileReaderEventHandler = ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null;

interface StubFileReader {
  result: string | ArrayBuffer | null;
  onloadend: FileReaderEventHandler;
  onerror: FileReaderEventHandler;
  readAsDataURL: ReturnType<typeof vi.fn>;
}

/**
 * Replace the global FileReader with a controllable stub and return a
 * handle so individual tests can drive onloadend / onerror.
 */
const buildFileReaderStub = () => {
  let instance: StubFileReader;

  const MockFileReader = vi.fn().mockImplementation(() => {
    instance = {
      result: null,
      onloadend: null,
      onerror: null,
      readAsDataURL: vi.fn(),
    };
    return instance;
  });

  vi.stubGlobal("FileReader", MockFileReader);

  const triggerLoad = (dataUrl: string) => {
    instance.result = dataUrl;
    instance.onloadend?.call(
      instance as unknown as FileReader,
      new ProgressEvent("loadend") as ProgressEvent<FileReader>
    );
  };

  const triggerError = (error: ProgressEvent<FileReader>) => {
    instance.onerror?.call(
      instance as unknown as FileReader,
      error
    );
  };

  return { triggerLoad, triggerError };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("blobToBase64", () => {
  let triggerLoad: (dataUrl: string) => void;
  let triggerError: (error: ProgressEvent<FileReader>) => void;

  beforeEach(() => {
    const stub = buildFileReaderStub();
    triggerLoad = stub.triggerLoad;
    triggerError = stub.triggerError;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Happy path – various MIME types
  // -------------------------------------------------------------------------

  it.each([
    [
      "image/jpeg",
      "data:image/jpeg;base64,/9j/4AAQSkZJRgAB",
      "/9j/4AAQSkZJRgAB",
    ],
    [
      "image/png",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
      "iVBORw0KGgoAAAANSUhEUgAAAAUA",
    ],
    [
      "application/pdf",
      "data:application/pdf;base64,JVBERi0xLjQ=",
      "JVBERi0xLjQ=",
    ],
    [
      "text/plain",
      "data:text/plain;base64,SGVsbG8gV29ybGQ=",
      "SGVsbG8gV29ybGQ=",
    ],
  ])(
    "resolves with the base64 payload for %s blobs",
    async (_mime, dataUrl, expectedBase64) => {
      const blob = new Blob(["content"], { type: _mime });
      const promise = blobToBase64(blob);

      triggerLoad(dataUrl);

      await expect(promise).resolves.toBe(expectedBase64);
    }
  );

  // -------------------------------------------------------------------------
  // Edge: data-URL whose base64 section itself contains "," characters
  // (e.g. a comma-padded string). The split(",")[1] must only use the FIRST
  // comma as the separator.
  // -------------------------------------------------------------------------
  it("returns only the part after the first comma when the payload contains commas", async () => {
    const blob = new Blob(["x"]);
    const promise = blobToBase64(blob);

    // Simulate a data-URL where the payload happens to contain a comma.
    // split(",")[1] picks the segment between the 1st and 2nd comma.
    // This documents (and pins) the current behaviour of the implementation.
    // FIXME(blobToBase64-comma-payload): If the base64 payload legitimately
    // contains a comma the result will be truncated at that comma. A more
    // robust implementation would use indexOf(",") + slice instead of
    // split(",")[1].
    triggerLoad("data:application/octet-stream;base64,abc,def");

    await expect(promise).resolves.toBe("abc");
  });

  // -------------------------------------------------------------------------
  // Error path – FileReader fires onerror
  // -------------------------------------------------------------------------
  it("rejects with the ProgressEvent when FileReader fires onerror", async () => {
    const blob = new Blob(["bad"]);
    const promise = blobToBase64(blob);

    const errorEvent = new ProgressEvent("error") as ProgressEvent<FileReader>;
    triggerError(errorEvent);

    await expect(promise).rejects.toBe(errorEvent);
  });

  // -------------------------------------------------------------------------
  // Verify readAsDataURL is called with the supplied Blob
  // -------------------------------------------------------------------------
  it("calls FileReader.readAsDataURL with the provided Blob", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const promise = blobToBase64(blob);

    // Grab the mock instance – it's the last constructed one.
    const readerInstance = (globalThis.FileReader as unknown as ReturnType<typeof vi.fn>).mock
      .results[0].value as StubFileReader;

    triggerLoad("data:text/plain;base64,aGVsbG8=");
    await promise;

    expect(readerInstance.readAsDataURL).toHaveBeenCalledOnce();
    expect(readerInstance.readAsDataURL).toHaveBeenCalledWith(blob);
  });

  // -------------------------------------------------------------------------
  // Empty Blob
  // -------------------------------------------------------------------------
  it("resolves for an empty Blob", async () => {
    const blob = new Blob([]);
    const promise = blobToBase64(blob);

    triggerLoad("data:application/octet-stream;base64,");

    // split(",")[1] on "data:...,<empty>" gives ""
    await expect(promise).resolves.toBe("");
  });

  // -------------------------------------------------------------------------
  // Each call creates an independent FileReader (no shared state)
  // -------------------------------------------------------------------------
  it("creates a new FileReader instance per call", () => {
    blobToBase64(new Blob(["a"]));
    blobToBase64(new Blob(["b"]));

    expect(
      (globalThis.FileReader as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBe(2);
  });
});
