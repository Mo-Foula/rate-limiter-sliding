import { RequestAttemptType } from "./request_attempt_type";

export type RequestAttemptDocumentType = {
    key: string,
    value:  RequestAttemptType[],
  }