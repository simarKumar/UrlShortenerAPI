CREATE DATABASE IF NOT EXISTS url_shortener
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE url_shortener;

CREATE TABLE IF NOT EXISTS urls (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  short_code  VARCHAR(12)     NOT NULL,
  long_url    TEXT            NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY  idx_short_code (short_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clicks (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  url_id      BIGINT UNSIGNED NOT NULL,
  clicked_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address  VARCHAR(45)     DEFAULT NULL,
  user_agent  TEXT            DEFAULT NULL,
  referrer    VARCHAR(2048)   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_url_clicked (url_id, clicked_at),

  CONSTRAINT fk_clicks_url
    FOREIGN KEY (url_id) REFERENCES urls (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
