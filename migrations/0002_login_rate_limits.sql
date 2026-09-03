CREATE TABLE login_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_login_rate_limits_blocked ON login_rate_limits(blocked_until);
