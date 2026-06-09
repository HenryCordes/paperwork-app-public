import { describe, it, expect } from "vitest";
import { renderWithProviders } from "../test-utils";
import ResponsiveNote from "../../components/responsiveNote";

// IonNote renders as <ion-note> in jsdom (Ionic custom element — no ARIA role).
// emotion converts the boolean `isLong` prop to a hyphenated DOM attribute:
//   isLong=true  -> is-long="" (present, empty string)
//   isLong=false -> attribute absent entirely
// Confirmed by probing outerHTML in jsdom.

describe("ResponsiveNote", () => {
  it("renders the provided text", () => {
    const { getByText } = renderWithProviders(
      <ResponsiveNote text="Short text" />
    );
    expect(getByText("Short text")).toBeTruthy();
  });

  describe("short text (≤15 chars)", () => {
    it("renders an ion-note element with the text", () => {
      const { container } = renderWithProviders(
        <ResponsiveNote text="Brief" />
      );
      const note = container.querySelector("ion-note");
      expect(note).toBeTruthy();
      expect(note!.textContent).toBe("Brief");
    });

    it("does NOT set the is-long attribute when text is 15 characters", () => {
      // 15 chars: isLong should be false (>15 is the threshold)
      const text = "123456789012345"; // exactly 15 chars
      const { container } = renderWithProviders(
        <ResponsiveNote text={text} />
      );
      const note = container.querySelector("ion-note");
      expect(note).not.toBeNull();
      // emotion omits the attribute entirely when isLong=false
      expect(note!.hasAttribute("is-long")).toBe(false);
    });
  });

  describe("long text (>15 chars)", () => {
    it("sets the is-long attribute when text exceeds 15 characters", () => {
      const longText = "This is a longer note"; // 21 chars — triggers isLong
      const { container } = renderWithProviders(
        <ResponsiveNote text={longText} />
      );
      const note = container.querySelector("ion-note");
      expect(note).not.toBeNull();
      // emotion sets is-long="" (empty string) when isLong=true
      expect(note!.hasAttribute("is-long")).toBe(true);
      expect(note!.textContent).toBe(longText);
    });
  });

  describe("boundary: text length exactly 16 characters", () => {
    it("sets the is-long attribute at exactly 16 chars (the first long value)", () => {
      const borderText = "1234567890123456"; // 16 chars — isLong === true
      const { container } = renderWithProviders(
        <ResponsiveNote text={borderText} />
      );
      const note = container.querySelector("ion-note");
      expect(note).not.toBeNull();
      // 16 > 15, so isLong flips to true and is-long attribute appears
      expect(note!.hasAttribute("is-long")).toBe(true);
    });

    it("does NOT set the is-long attribute at exactly 15 chars (last short value)", () => {
      const borderText = "123456789012345"; // 15 chars — isLong === false
      const { container } = renderWithProviders(
        <ResponsiveNote text={borderText} />
      );
      const note = container.querySelector("ion-note");
      expect(note).not.toBeNull();
      expect(note!.hasAttribute("is-long")).toBe(false);
    });
  });

  describe("slot attribute", () => {
    it("renders the note with slot='end'", () => {
      const { container } = renderWithProviders(
        <ResponsiveNote text="Test slot" />
      );
      const note = container.querySelector("ion-note");
      expect(note).toBeTruthy();
      expect(note!.getAttribute("slot")).toBe("end");
    });
  });
});
