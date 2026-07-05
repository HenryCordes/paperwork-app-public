// jest-dom custom matchers. v5 exposes extend-expect (v6+ would use /vitest).
import "@testing-library/jest-dom/extend-expect";
import { setupIonicReact } from "@ionic/react";

// Ionic React must be initialized before its components mount in jsdom.
setupIonicReact();

// Some Ionic/components query matchMedia; jsdom does not implement it.
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () {
        return false;
      },
    } as unknown as MediaQueryList;
  };
