CREATE TABLE reading_list (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      CHAR(36)     NOT NULL,
  title           VARCHAR(255) NOT NULL,
  author          VARCHAR(255) NOT NULL,
  cover_url       VARCHAR(500) NULL,
  open_library_key VARCHAR(50) NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_session_book (session_id, open_library_key),
  INDEX idx_session (session_id)
);
