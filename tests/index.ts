import { RequestsLimiter } from "../src/requests_limitter";
import { WindowsLimitsType } from "../src/types/windows_limits_type";
import { TestRepo } from "./test-repo";

const testRepo = new TestRepo();

const limiterRepo = testRepo;
const key = "test-repo";

const windowsLimits: WindowsLimitsType = {
  inner_window_block_duration_in_seconds: 5,
  inner_window_log_duration_in_seconds: 5,
  max_inner_window_request_count: 2,

  max_outer_window_request_count: 3,
  outer_window_duration_in_seconds: 10,
};
/*
    ----------------------------
    Test blocking functionality
    ----------------------------

    Make an attempt -> (works)
    Check limit -> true
    Check limit from repo (last in array) -> 1

    Make an attempt -> (works)
    Check limit -> false
    Check limit from repo (last in array) -> 2

    Make an attempt -> (fails)
    Check limit -> false
    Check limit from repo (last in array) -> 2

    Wait for inner window log duration -> 3 seconds
    Check limit -> false (to test that the block duration is working)

    Wait for inner window block duration -> (5 - 3 + 1 seconds)
    Check limit -> true

    Make an attempt -> (works)
    Check limit -> false (outer window)

    Make an attempt -> (fails)
    
    Wait for outer window block duration -> (10 seconds)

    Make an attempt -> (works)


    ----------------------------
    Test deleting functionality
    ----------------------------
    Check limit -> true
    Check limit from repo (last in array) -> 1

    Delete key attempts
    Check limit from repo (last in array) -> 0 or undefined

    Delete key attempts (should not crash the program)
    Check limit from repo (last in array) -> 0 or undefined

*/

async function checkAttempt() {
  return await RequestsLimiter.checkAttemptByKey({
    key,
    limiterRepo,
    windowsLimits,
  });
}

async function checkAttemptFromRepo() {
  const result = await testRepo.get(key);
  return result ? result.value[result.value.length-1].requestCount : 0;
}

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

function wait(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function logAndThrowTestErrors(message: string, expression: boolean) {
  console.log(message, expression);
  if (!expression) throw new Error(message);
}

async function testBlockingFunctionality() {
  /*
        ----------------------------
    Test blocking functionality
    ----------------------------

    1- Make an attempt -> (works)
    2- Check limit -> true
    3- Check limit from repo (last in array) -> 1

    4- Make an attempt -> (works)
    5- Check limit -> false
    6- Check limit from repo (last in array) -> 2

    7- Make an attempt -> (fails)
    8- Check limit -> false
    9- Check limit from repo (last in array) -> 2

    10- Wait for inner window log duration -> 3 seconds
    11- Check limit -> false (to test that the block duration is working)

    12- Wait for inner window block duration -> (5 - 3 + 1 seconds)
    13- Check limit -> true

    14- Make an attempt -> (works)
    15- Check limit -> false (outer window)

    16- Make an attempt -> (fails)
     
    17- Wait for outer window block duration -> (10 seconds)

    18- Make an attempt -> (works)
    */

  // 1- Make an attempt -> (works)
  const attempt1 = await makeAttempt();
  logAndThrowTestErrors("Step 1:", attempt1 === true);

  // 2- Check limit -> true
  const isLimitNotExceeded = await checkAttempt();
  logAndThrowTestErrors("Step 2:", isLimitNotExceeded === true);

  // 3- Check limit from repo (last in array) -> 1
  const lastAttempt = await checkAttemptFromRepo();
  logAndThrowTestErrors("Step 3:", lastAttempt === 1);

  // 4- Make an attempt -> (works)
  const attempt4 = await makeAttempt();
  logAndThrowTestErrors("Step 4:", attempt4 === true);

  // 5- Check limit -> false
  const isLimitNotExceeded2 = await checkAttempt();
  logAndThrowTestErrors("Step 5:", isLimitNotExceeded2 === false);

  // 6- Check limit from repo (last in array) -> 2
  const lastAttempt2 = await checkAttemptFromRepo();
  logAndThrowTestErrors("Step 6:", lastAttempt2 === 2);

  // 7- Make an attempt -> (fails)
  const attempt7 = await makeAttempt();
  logAndThrowTestErrors("Step 7:", attempt7 === false);

  // 8- Check limit -> false
  const isLimitNotExceeded3 = await checkAttempt();
  logAndThrowTestErrors("Step 8:", isLimitNotExceeded3 === false);

  // 9- Check limit from repo (last in array) -> 2
  const lastAttempt3 = await checkAttemptFromRepo();
  logAndThrowTestErrors("Step 9:", lastAttempt3 === 2);

  // 10- Wait for inner window log duration -> 3 seconds
  await wait(3);

  // 11- Check limit -> false (to test that the block duration is working)
  const isLimitNotExceeded4 = await checkAttempt();
  logAndThrowTestErrors("Step 11:", isLimitNotExceeded4 === false);

  // 12- Wait for inner window block duration -> (5 - 3 + 1 seconds)
  await wait(3);

  // 13- Check limit -> true
  const isLimitNotExceeded5 = await checkAttempt();
  logAndThrowTestErrors("Step 13:", isLimitNotExceeded5 === true);

  // 14- Make an attempt -> (works)
  const attempt14 = await makeAttempt();
  logAndThrowTestErrors("Step 14:", attempt14 === true);

  // 15- Check limit -> false (outer window)
  const isLimitNotExceeded6 = await checkAttempt();
  logAndThrowTestErrors("Step 15:", isLimitNotExceeded6 === false);

  // 16- Make an attempt -> (fails)
  const attempt16 = await makeAttempt();
  logAndThrowTestErrors("Step 16:", attempt16 === false);

  // 17- Wait for outer window block duration -> (10 seconds)
  await wait(10);

  // 18- Make an attempt -> (works)
  const attempt18 = await makeAttempt();
  logAndThrowTestErrors("Step 18:", attempt18 === true);
}

async function testDeletingFunctionality() {
  // Step 1: Check limit -> true
  const isLimitNotExceeded = await checkAttempt();
  logAndThrowTestErrors("Step 1:", isLimitNotExceeded === true);

  // Step 2: Check limit from repo (last in array) -> 1
  const lastAttempt = await checkAttemptFromRepo();
  logAndThrowTestErrors("Step 2:", lastAttempt === 1);

  // ...

  // Step 3: Delete key attempts
  try {
    await deleteAttemptByKey();
    logAndThrowTestErrors("Step 3:", true);
  } catch (error) {
    logAndThrowTestErrors("Step 3:", false);
  }

  // Step 4: Check limit from repo (last in array) -> 0 or undefined
  const lastAttempt2 = await checkAttemptFromRepo();
  logAndThrowTestErrors(
    "Step 4:",
    lastAttempt2 === 0 || lastAttempt2 === undefined
  );

  // Step 5: Delete key attempts (should not crash the program)
  try {
    await deleteAttemptByKey();
    logAndThrowTestErrors("Step 5:", true);
  } catch (error) {
    logAndThrowTestErrors("Step 5:", false);
  }

  // Step 6: Check limit from repo (last in array) -> 0 or undefined
  const lastAttempt3 = await checkAttemptFromRepo();
  logAndThrowTestErrors(
    "Step 6 - Last attempt:",
    lastAttempt3 === 0 || lastAttempt3 === undefined
  );
}

async function testLimiter() {
  console.log("Starting testing functionality")
  console.log("Testing blocking functionality")
  await testBlockingFunctionality();
  console.log("Done testing blocking functionality")
  console.log("Testing deleting functionality")
  await testDeletingFunctionality();
  console.log("Done testing deleting functionality")
  console.log("Testing is complete, program is working properly.");
  process.exit(0)
}

testLimiter();

