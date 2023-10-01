# rate-limiter-sliding
## Motivation:
I needed a rate limiter client that can:
<ol>
<li>connect to any data source easily.
<li>Have 2 window limiters (inner window and outer window).
<li>The inner window would have a blocking duration after the maximum number of attempts is reached
<li>Each window would have its own number of trials per duration, and blocking duration and these numbers would be easily specified by the user.

</ol>

And the ones that I found were either depending on other libraries and caused dependencies issues, or too simple and hardly customizable.

I implemented a solution for this problem by creating a client that would need a repository interface and this interface is exposed so that users that need to use this client can create their own repositories and implement my ILimiterRepo interface.

## Logic of limitations:
We have two windows, for example:

We can implement a restriction on a user's ability to make requests on a specific endpoint (such as login) by allowing them to attempt it only 5 times within a 10-minute window. and we can set a limit of 20 total attempts for the user within a day.

After the user makes 5 attempts in 10 minutes, he is blocked for 20 minutes, and when this duration passes the user can make another attempts as long as he doesn't exceed his daily limit.

To make these configurations we would make the following window limits:
```
const windowsLimits: WindowsLimitsType = {
  inner_window_block_duration_in_seconds: 20 * 60,
  inner_window_log_duration_in_seconds: 10 * 60,
  max_inner_window_request_count: 5,

  max_outer_window_request_count: 20,
  outer_window_duration_in_seconds: 24 * 60,
};
```

## Example of repository class:
The following class is an example of a repo class:

```
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
```

 The previous class caches the trials in an object because it is used for testing, usually your repo should connect to a database or data store client like redis.


## Example of limiter client usage:

```

// Limiter client testing parameters
const limiterRepo = new TestRepo();
const key = "test-repo";

// Windows limits (durations in seconds and number of attempts per window)
const windowsLimits: WindowsLimitsType = {
  inner_window_block_duration_in_seconds: 5,
  inner_window_log_duration_in_seconds: 5,
  max_inner_window_request_count: 2,

  max_outer_window_request_count: 3,
  outer_window_duration_in_seconds: 10,
};

async function makeAttempt() {
  return await RequestsLimiter.checkAndRecordAttemptByKey({
    key,
    limiterRepo,
    windowsLimits,
  });
}

async function deleteAttemptByKey() {
  return await RequestsLimiter.deleteAttemptByKey({
    key,
    limiterRepo,
  });
}

```

## Notes:
<ul>
<li>
This client can be used inside a middleware to limit users requests in order to block brute-force password trials.
</ol>
