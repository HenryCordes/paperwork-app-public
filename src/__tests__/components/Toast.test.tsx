import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../test-utils";
import { Toast } from "../../components/Toast";
import { ToastMessage } from "../../contexts/ToastContext";

beforeEach(() => {
  vi.clearAllMocks();
});

// IonToast renders as <ion-toast> (a custom element) in jsdom. Ionic sets
// props as JS properties on the element object, NOT as DOM attributes — so
// we inspect `(element as any).<prop>` rather than getAttribute().
//
// The cancel-button handler test lives in Toast.cancel.test.tsx (isolated
// vi.mock file) because module-level mocking of @ionic/react cannot coexist
// with tests that rely on the real custom-element behavior in this file.

type IonToastElement = HTMLElement & {
  isOpen?: boolean;
  message?: string;
  duration?: number;
  cssClass?: string;
  position?: string;
  buttons?: Array<{ text: string; role: string; handler: () => void }>;
  onDidDismiss?: ((evt: CustomEvent) => void) | unknown;
};

describe("Toast", () => {
  describe("with toast=null", () => {
    it("renders an ion-toast element and isOpen is falsy", () => {
      const onDismiss = vi.fn();
      const { container } = renderWithProviders(
        <Toast toast={null} onDismiss={onDismiss} />
      );

      const ionToast = container.querySelector("ion-toast") as IonToastElement;
      expect(ionToast).not.toBeNull();
      // isOpen should be false (or absent) when no toast is provided
      expect(ionToast.isOpen).toBeFalsy();
    });
  });

  describe("with a toast message", () => {
    const cases: Array<{ toast: ToastMessage; expectedClass: string }> = [
      {
        toast: { message: "File saved", type: "success" },
        expectedClass: "custom-toast-success",
      },
      {
        toast: { message: "Something went wrong", type: "error" },
        expectedClass: "custom-toast-error",
      },
      {
        toast: { message: "Just so you know", type: "info" },
        expectedClass: "custom-toast-info",
      },
    ];

    cases.forEach(({ toast, expectedClass }) => {
      it(`renders type="${toast.type}" with correct message and CSS class`, () => {
        const onDismiss = vi.fn();
        const { container } = renderWithProviders(
          <Toast toast={toast} onDismiss={onDismiss} />
        );

        const ionToast = container.querySelector(
          "ion-toast"
        ) as IonToastElement;
        expect(ionToast).not.toBeNull();

        // isOpen=true because toast is non-null
        expect(ionToast.isOpen).toBe(true);

        // message is forwarded correctly
        expect(ionToast.message).toBe(toast.message);

        // cssClass contains both the base class and type-specific class
        const cssClass = ionToast.cssClass ?? "";
        expect(cssClass).toContain("custom-toast");
        expect(cssClass).toContain(expectedClass);
      });
    });
  });

  describe("duration prop", () => {
    it("defaults to 3000ms when not specified", () => {
      const onDismiss = vi.fn();
      const toast: ToastMessage = { message: "Hi", type: "info" };
      const { container } = renderWithProviders(
        <Toast toast={toast} onDismiss={onDismiss} />
      );

      const ionToast = container.querySelector("ion-toast") as IonToastElement;
      expect(ionToast.duration).toBe(3000);
    });

    it("forwards a custom duration", () => {
      const onDismiss = vi.fn();
      const toast: ToastMessage = { message: "Hi", type: "info" };
      const { container } = renderWithProviders(
        <Toast toast={toast} onDismiss={onDismiss} duration={5000} />
      );

      const ionToast = container.querySelector("ion-toast") as IonToastElement;
      expect(ionToast.duration).toBe(5000);
    });
  });

  describe("position and dismiss wiring", () => {
    it("is positioned at top", () => {
      const onDismiss = vi.fn();
      const toast: ToastMessage = { message: "Hi", type: "success" };
      const { container } = renderWithProviders(
        <Toast toast={toast} onDismiss={onDismiss} />
      );

      const ionToast = container.querySelector("ion-toast") as IonToastElement;
      expect(ionToast.position).toBe("top");
    });

    it("wires onDismiss via the didDismiss custom event", () => {
      const onDismiss = vi.fn();
      const toast: ToastMessage = { message: "Bye", type: "info" };
      const { container } = renderWithProviders(
        <Toast toast={toast} onDismiss={onDismiss} />
      );

      const ionToast = container.querySelector("ion-toast") as IonToastElement;
      expect(ionToast).not.toBeNull();

      // Ionic React's createInlineOverlayComponent wires onDidDismiss by
      // adding a DOM listener for the 'didDismiss' custom event on the
      // <ion-toast> element (see @ionic/react createInlineOverlayComponent
      // componentDidMount). Dispatching it exercises the full callback path.
      ionToast.dispatchEvent(new CustomEvent("didDismiss"));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
