import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../test-utils";
import BtwPrecheckReportCard from "../../components/BtwPrecheckReportCard";
import {
  BtwPrecheckAlreadyRunningError,
  BtwPrecheckDailyCapReachedError,
} from "../../api/services/btwPrecheckService";
import type { Finding } from "../../api/types/btwPrecheck";

const push = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useHistory: () => ({ push }) };
});

const mockUseBtwPrecheckLatestReport = vi.fn();
const mockMutate = vi.fn();

const mockUseRunBtwPrecheck = vi.fn(() => ({
  mutate: mockMutate,
  isPending: false,
}));

vi.mock("../../hooks/useBtwPrecheck", () => ({
  useBtwPrecheckLatestReport: (...args: unknown[]) =>
    mockUseBtwPrecheckLatestReport(...args),
  useRunBtwPrecheck: () => mockUseRunBtwPrecheck(),
}));

// Mocked rather than driven through a real ToastProvider/IonToast: a real
// isOpen: false -> true transition on <ion-toast> post-mount runs Ionic's own
// present() call (fired synchronously, uncaught, from its isOpen watcher),
// whose md enter animation reads DOM state before Stencil's shadow-DOM
// render has flushed in jsdom, throwing `Cannot read properties of null
// (reading 'style')` as an unhandled rejection that fails the run
// regardless of assertions. This component's contract is "call showToast
// with the right message/type" — the toast's own rendering is Toast.test.tsx's
// concern, not this one's.
const mockShowToast = vi.fn();
vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  code: "MISSING_DOCUMENT",
  severity: "warning",
  messageNl: "Uitgave #1001 heeft geen bon.",
  messageEn: "Expense #1001 has no receipt.",
  entityType: "expense",
  entityId: "exp-1",
  meta: {},
  ...overrides,
});

const makeReport = (overrides = {}, findings: Finding[] = []) => ({
  data: {
    success: true,
    data: {
      _id: "report-1",
      tenantId: "tenant-1",
      periodType: "quarterly" as const,
      period: "Q2" as const,
      year: 2026,
      status: "completed" as const,
      trigger: "manual" as const,
      findings,
      meta: { anomalyStatus: "completed" as const },
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      ...overrides,
    },
  },
  isLoading: false,
  isError: false,
  error: null,
});

const renderCard = () =>
  renderWithProviders(<BtwPrecheckReportCard period="Q2" year={2026} />);

describe("BtwPrecheckReportCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRunBtwPrecheck.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("shows a spinner while loading", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    const { container } = renderCard();
    expect(container.querySelector("ion-spinner")).not.toBeNull();
  });

  it("shows the empty state when no report exists yet", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderCard();
    expect(
      screen.getByText("Nog geen controle uitgevoerd voor dit kwartaal.")
    ).toBeInTheDocument();
  });

  it("shows a running message when status is running", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({ status: "running" })
    );
    renderCard();
    expect(screen.getByText("Bezig met controleren...")).toBeInTheDocument();
    const button = screen.getByText("Bezig met controle...").closest(
      "ion-button"
    ) as (HTMLElement & { disabled: boolean }) | null;
    expect(button?.disabled).toBe(true);
    expect(screen.queryByText("Controleer nu")).not.toBeInTheDocument();
  });

  it("shows a failed message when status is failed", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({ status: "failed" })
    );
    renderCard();
    expect(
      screen.getByText("De controle is mislukt. Probeer het opnieuw.")
    ).toBeInTheDocument();
  });

  it("shows a clean message when completed with zero findings", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(makeReport({}, []));
    renderCard();
    expect(
      screen.getByText("Geen aandachtspunten gevonden.")
    ).toBeInTheDocument();
  });

  it("lists findings when completed with findings", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [finding()])
    );
    renderCard();
    expect(screen.getByText("Uitgave #1001 heeft geen bon.")).toBeInTheDocument();
  });

  it("navigates to the expense when a tappable expense finding is clicked", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [finding({ entityType: "expense", entityId: "exp-1" })])
    );
    renderCard();
    await userEvent.click(screen.getByText("Uitgave #1001 heeft geen bon."));
    expect(push).toHaveBeenCalledWith("/expenses/exp-1");
  });

  it("navigates to the invoice when a tappable invoice finding is clicked", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [
        finding({
          entityType: "invoice",
          entityId: "inv-1",
          messageNl: "Factuur #2001 komt mogelijk dubbel voor.",
        }),
      ])
    );
    renderCard();
    await userEvent.click(
      screen.getByText("Factuur #2001 komt mogelijk dubbel voor.")
    );
    expect(push).toHaveBeenCalledWith("/invoices/inv-1");
  });

  it("does not navigate for a period-level finding", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [
        finding({
          entityType: "period",
          entityId: null,
          code: "HISTORY_ANOMALY",
          messageNl: "Leverancier Shell ontbreekt dit kwartaal.",
        }),
      ])
    );
    renderCard();
    await userEvent.click(
      screen.getByText("Leverancier Shell ontbreekt dit kwartaal.")
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("calls the run mutation with the given period and year", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [])
    );
    renderCard();
    await userEvent.click(screen.getByText("Controleer nu"));
    expect(mockMutate).toHaveBeenCalledWith(
      { period: "Q2", year: 2026 },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("shows an info toast when a run is already in progress (409)", async () => {
    mockMutate.mockImplementation((_vars, opts) =>
      opts.onError(new BtwPrecheckAlreadyRunningError())
    );
    mockUseBtwPrecheckLatestReport.mockReturnValue(makeReport({}, []));
    renderCard();
    await userEvent.click(screen.getByText("Controleer nu"));
    expect(mockShowToast).toHaveBeenCalledWith(
      "Er loopt al een controle voor dit kwartaal.",
      "info"
    );
  });

  it("shows an info toast when the daily cap is reached (429)", async () => {
    mockMutate.mockImplementation((_vars, opts) =>
      opts.onError(new BtwPrecheckDailyCapReachedError())
    );
    mockUseBtwPrecheckLatestReport.mockReturnValue(makeReport({}, []));
    renderCard();
    await userEvent.click(screen.getByText("Controleer nu"));
    expect(mockShowToast).toHaveBeenCalledWith(
      "Maximaal aantal handmatige controles per dag bereikt.",
      "info"
    );
  });

  it("shows an unavailable message when the backend flag is off (503)", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 503 } },
    });
    renderCard();
    expect(
      screen.getByText("BTW pre-check is momenteel niet beschikbaar.")
    ).toBeInTheDocument();
  });

  it("disables and relabels the run-now button while the run mutation is pending, even with no report yet", () => {
    mockUseRunBtwPrecheck.mockReturnValue({ mutate: mockMutate, isPending: true });
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderCard();
    const button = screen.getByText("Bezig met controle...").closest(
      "ion-button"
    ) as (HTMLElement & { disabled: boolean }) | null;
    expect(button?.disabled).toBe(true);
    expect(screen.queryByText("Controleer nu")).not.toBeInTheDocument();
  });

  it("disables and relabels the run-now button while the run mutation is pending, after a failed run", () => {
    mockUseRunBtwPrecheck.mockReturnValue({ mutate: mockMutate, isPending: true });
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({ status: "failed" })
    );
    renderCard();
    const button = screen.getByText("Bezig met controle...").closest(
      "ion-button"
    ) as (HTMLElement & { disabled: boolean }) | null;
    expect(button?.disabled).toBe(true);
    expect(screen.queryByText("Controleer nu")).not.toBeInTheDocument();
  });

  it("disables and relabels the run-now button while the run mutation is pending, after a completed run", () => {
    mockUseRunBtwPrecheck.mockReturnValue({ mutate: mockMutate, isPending: true });
    mockUseBtwPrecheckLatestReport.mockReturnValue(makeReport({}, []));
    renderCard();
    const button = screen.getByText("Bezig met controle...").closest(
      "ion-button"
    ) as (HTMLElement & { disabled: boolean }) | null;
    expect(button?.disabled).toBe(true);
    expect(screen.queryByText("Controleer nu")).not.toBeInTheDocument();
  });

  it("does not disable or relabel the run-now button when the mutation is not pending and no report exists", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderCard();
    const button = screen.getByText("Controleer nu").closest("ion-button") as
      | (HTMLElement & { disabled: boolean })
      | null;
    expect(button?.disabled).toBe(false);
    expect(screen.queryByText("Bezig met controle...")).not.toBeInTheDocument();
  });
});
