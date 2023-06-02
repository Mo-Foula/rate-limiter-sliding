import { RequestAttemptDocumentType } from "../types/request_attempt_document_type";
import { RequestAttemptType } from "../types/request_attempt_type";

interface ILimiterRepo {
  set: (key: string, value: RequestAttemptType[]) => Promise<RequestAttemptDocumentType | undefined | null>;
  del: (key: string) => Promise<RequestAttemptDocumentType | undefined | null>;
  get: (key: string) => Promise<RequestAttemptDocumentType | undefined | null>;
}

export { ILimiterRepo };
