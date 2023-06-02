import { ILimiterRepo } from "./interfaces/limiter_repo_interface";
import { RequestAttemptType } from "./types/request_attempt_type";
import moment from "moment";
import { WindowsLimitsType } from "./types/windows_limits_type";

export class RequestsLimiter {
  private static async createNewRecord({
    limiterRepo,
    key,
  }: {
    limiterRepo: ILimiterRepo;
    key: string;
  }) {
    const currentTime = moment();
    const newRecord: RequestAttemptType[] = [];
    const requestLog = {
      requestTimeStamp: currentTime.unix(),
      requestCount: 1,
    };
    newRecord.push(requestLog);
    await limiterRepo.set(key, newRecord);
  }

  private static async deleteRecord({
    limiterRepo,
    key,
  }: {
    limiterRepo: ILimiterRepo;
    key: string;
  }) {
    return await limiterRepo.del(key);
  }

  private static async incrementRecord({
    limiterRepo,
    requestsLogs,
    key,
    durations,
  }: {
    durations: WindowsLimitsType;
    limiterRepo: ILimiterRepo;
    requestsLogs: Array<RequestAttemptType>;
    key: string;
  }) {
    const currentTime = moment();
    //When the number of requests made are less than the maximum the a new entry is logged
    const lastRequestLog = requestsLogs[requestsLogs.length - 1];
    const potentialCurrentWindowIntervalStartTimeStamp = moment()
      .subtract(durations.inner_window_log_duration_in_seconds, "seconds")
      .unix();
    //When the interval has not passed from the last request, then the counter increments
    if (
      lastRequestLog.requestTimeStamp >
      potentialCurrentWindowIntervalStartTimeStamp
    ) {
      lastRequestLog.requestCount++;
      requestsLogs[requestsLogs.length - 1] = lastRequestLog;
    } else {
      //When the interval has passed, a new entry for current user and timestamp is logged
      requestsLogs.push({
        requestTimeStamp: currentTime.unix(),
        requestCount: 1,
      });
    }
    limiterRepo.set(key, requestsLogs);
  }

  private static async limitByKey({
    key,
    windowsLimits,
    recordAttempt = true,
    limiterRepo,
  }: {
    windowsLimits: WindowsLimitsType;
    key: string;
    recordAttempt?: Boolean;
    limiterRepo: ILimiterRepo;
  }): Promise<
    { outerWindowBlocked: boolean; innerWindowBlocked: boolean } | undefined
  > {
    if (!limiterRepo) {
      return;
    }

    //Gets the records of the current user base on the IP address, returns a null if the is no user found
    const record = await limiterRepo.get(key);

    const blockedWindows = {
      outerWindowBlocked: false,
      innerWindowBlocked: false,
    };

    //When there is no user record then a new record is created for the user and stored in the Redis storage
    if (!record) {
      await RequestsLimiter.createNewRecord({ limiterRepo: limiterRepo, key });
    } else {
      //When the record is found then its value is parsed and the number of requests the user has made within the last window is calculated
      const requestsLogs = record.value;
      const outerWindowBeginTimestamp = moment()
        .subtract(windowsLimits.outer_window_duration_in_seconds, "seconds")
        .unix();

      const innerRequestsinWindow: RequestAttemptType[] = requestsLogs.filter(
        (entry: RequestAttemptType) => {
          return entry.requestTimeStamp > outerWindowBeginTimestamp;
        }
      );

      // recentInnerWindow can be null if there are previous requests but not in the past outerwindow
      const recentInnerWindow =
        innerRequestsinWindow[innerRequestsinWindow.length - 1];
      const currentTime = moment().unix();

      if (
        recentInnerWindow &&
        recentInnerWindow.requestCount >=
          windowsLimits.max_inner_window_request_count
      ) {
        const endOfBlockDuration = moment
          .unix(recentInnerWindow.requestTimeStamp)
          .add(windowsLimits.inner_window_block_duration_in_seconds, "seconds")
          .unix();

        if (currentTime < endOfBlockDuration) {
          blockedWindows.innerWindowBlocked = true;
        }
      }

      const totalOuterWindowRequestsCount = innerRequestsinWindow.reduce(
        (accumulator: any, entry: any) => {
          return accumulator + entry.requestCount;
        },
        0
      );
      //if maximum number of requests is exceeded then an error is returned
      if (
        totalOuterWindowRequestsCount >=
        windowsLimits.max_outer_window_request_count
      ) {
        blockedWindows.outerWindowBlocked = true;
      }
      if (
        !blockedWindows.innerWindowBlocked &&
        !blockedWindows.outerWindowBlocked &&
        recordAttempt
      ) {
        await RequestsLimiter.incrementRecord({
          requestsLogs,
          key,
          limiterRepo,
          durations: windowsLimits,
        });
      }
    }
    return blockedWindows;
  }

  public static async checkAndRecordAttemptByKey({
    key,
    limiterRepo,
    windowsLimits,
  }: {
    key: string;
    windowsLimits: WindowsLimitsType;
    limiterRepo: ILimiterRepo;
  }) {
    // [1] Check by IP and Email Addresses
    const canRequest = await RequestsLimiter.limitByKey({
      key,
      windowsLimits,
      limiterRepo,
    });

    if (
      canRequest &&
      (canRequest.innerWindowBlocked || canRequest.outerWindowBlocked)
    ) {
      return false;
    } else {
      return true;
    }
  }

  public static async checkAttemptByKey({
    key,
    limiterRepo,
    windowsLimits,
  }: {
    key: string;
    windowsLimits: WindowsLimitsType;
    limiterRepo: ILimiterRepo;
  }) {
    // [1] Check by IP and Email Addresses
    const canRequest = await RequestsLimiter.limitByKey({
      key,
      windowsLimits,
      recordAttempt: false,
      limiterRepo,
    });

    if (
      canRequest &&
      (canRequest.innerWindowBlocked || canRequest.outerWindowBlocked)
    ) {
      return false;
    } else {
      return true;
    }
  }

  public static async deleteAttemptByKey({
    limiterRepo,
    key,
  }: {
    limiterRepo: ILimiterRepo;
    key: string;
  }) {
    return await RequestsLimiter.deleteRecord({ limiterRepo, key });
  }
}
