export const getInvoiceBadgeColor = (state?: string) => {
  if (!state) return "medium";

  switch (state.toLowerCase()) {
    case "betaald":
      return "success";
    case "open":
      return "warning";
    case "te laat":
      return "danger";
    default:
      return "medium";
  }
};
