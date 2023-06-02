import { ILimiterRepo } from "../src/interfaces/limiter_repo_interface";
import { RequestAttemptDocumentType } from "../src/types/request_attempt_document_type";
import { RequestAttemptType } from "../src/types/request_attempt_type";

export class TestRepo implements ILimiterRepo{

    private usersAttempts: Record<string,RequestAttemptType[]> = {}

    async set(key: string, value: RequestAttemptType[]):  Promise<RequestAttemptDocumentType | null | undefined>{
        this.usersAttempts[key] = value
        return
    };

    async del(key: string):  Promise<RequestAttemptDocumentType | null | undefined>{
        const currentValue = {
            key,
            value: this.usersAttempts[key]
        }
        delete this.usersAttempts[key]
        return currentValue
    };

    async get(key: string):  Promise<RequestAttemptDocumentType | null | undefined>{
        const result = this.usersAttempts[key]
        return result? {
            key,
            value: this.usersAttempts[key]
        }: null
    };
    
}