import { useQuery, useMutation, UseQueryResult } from "@tanstack/react-query";
import taxesService from "../api/services/taxesService";
import QueryKeys from "../api/queryKeys";
import {
  TaxPeriodsResponse,
  TaxSummaryRequest,
  TaxSummaryResponse,
  TaxExportRequest,
  TaxDeadlineResponse,
  TaxPeriodType,
} from "../api/types/taxes";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { blobToBase64 } from "../utils/fileUtils";

export const useTaxPeriods = (): UseQueryResult<TaxPeriodsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.taxes.periods(),
    queryFn: () => taxesService.getTaxPeriods(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useTaxSummary = (
  params: TaxSummaryRequest,
  enabled: boolean = true
): UseQueryResult<TaxSummaryResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.taxes.summary(params),
    queryFn: () => taxesService.getTaxSummary(params),
    enabled: enabled && !!params.period && !!params.year,
    staleTime: 5 * 60 * 1000,
  });
};

export const useTaxDeadline = (
  periodType: TaxPeriodType = "quarterly"
): UseQueryResult<TaxDeadlineResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.taxes.deadline(periodType),
    queryFn: () => taxesService.getNextDeadline(periodType),
    staleTime: 60 * 60 * 1000,
  });
};

export const useExportTaxReturn = () => {
  return useMutation({
    mutationFn: async (params: TaxExportRequest) => {
      const blob = await taxesService.exportTaxReturn(params);

      const fileName = `btw-export-${params.periodType}-${params.period}-${
        params.year
      }.${params.format === "excel" ? "xlsx" : "csv"}`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = await blobToBase64(blob);
        const folderPath = "BTW aangifte";

        try {
          await Filesystem.mkdir({
            path: folderPath,
            directory: Directory.Documents,
            recursive: true,
          });
        } catch (error) {
          console.log("Folder already exists or error creating:", error);
        }

        await Filesystem.writeFile({
          path: `${folderPath}/${fileName}`,
          data: base64Data,
          directory: Directory.Documents,
        });

        const platform = Capacitor.getPlatform();
        const message =
          platform === "ios"
            ? "Bestand opgeslagen in Bestanden > Op mijn iPhone > Paperwork > BTW aangifte"
            : "Bestand opgeslagen in Documenten > BTW aangifte";

        return {
          success: true,
          message,
        };
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true, message: "Bestand gedownload" };
      }
    },
  });
};
