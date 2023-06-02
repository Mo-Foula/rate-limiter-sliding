export type WindowsLimitsType = {
  // Duration of outer window (requests in the same inner duration are grouped together in the same object in redis ip_email array)
  outer_window_duration_in_seconds: number;
  // Max requests can be done in the outer window
  max_outer_window_request_count: number;
  // Duration of inner window (requests in the same inner duration are grouped together in the same object in redis ip_email array)
  inner_window_log_duration_in_seconds: number;
  // The duration that the user will be blocked for if he reached inner window limit requests
  inner_window_block_duration_in_seconds: number;
  // Max requests can be done in the outer window
  max_inner_window_request_count: number;
};