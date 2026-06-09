import documentsService from "../api/services/documentsService";
import { useMutation } from "@tanstack/react-query";

/**
 * Hook for document-related operations
 */
export const useDocuments = () => {
  /**
   * Get document URL for a file path
   * @param filePath - The document file path
   */
  const getDocumentUrl = (filePath: string): string => {
    return documentsService.getDocumentUrl(filePath);
  };

  /**
   * Get document URL for the api using a file path
   * @param filePath - The document file path
   */
  const getApiDocumentUrl = (filePath: string): string => {
    return documentsService.getApiDocumentUrl(filePath);
  };

  /**
   * Open document in new browser tab
   * @param filePath - The document file path
   */
  const openDocument = (filePath: string): void => {
    documentsService.openDocument(filePath);
  };

  /**
   * Upload a document file
   * @param file - The file to upload
   * @returns Mutation result with document location
   */
  const uploadDocument = useMutation({
    mutationFn: (file: File) => documentsService.uploadDocument(file),
  });

  return {
    getDocumentUrl,
    getApiDocumentUrl,
    openDocument,
    uploadDocument,
  };
};

export default useDocuments;
