import { format } from "date-fns";
import { nl } from "date-fns/locale";

export const formatDateForDisplay = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return format(date, "dd-MM-yyyy", { locale: nl });
  } catch {
    return dateString;
  }
};

export const formatDateForPost = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return format(date, "yyyy-MM-dd");
  } catch {
    return dateString;
  }
};
