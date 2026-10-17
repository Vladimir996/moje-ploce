-- Kolekcija ploča — šema baze
-- Pokreće se preko backend/db/migrate.js (ili ručno u MySQL klijentu).
-- Napomena: baza se ne pravi ovdje — migrate.js je pravi ako može (lokalno),
-- a hostovani provajderi (npr. Clever Cloud, Aiven) obično ne daju privilegiju
-- CREATE DATABASE, pa se tamo koristi dodijeljena baza iz DB_NAME.

-- Izvođači (bendovi, pjevači...) — odvojena tabela da bi filter po izvođaču bio pouzdan
CREATE TABLE IF NOT EXISTS artists (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Žanrovi (rock, jazz, narodna...) — jedna ploča može imati više žanrova
CREATE TABLE IF NOT EXISTS genres (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ploče u kolekciji
CREATE TABLE IF NOT EXISTS records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  artist_id INT UNSIGNED NOT NULL,
  release_year SMALLINT UNSIGNED NULL,
  label VARCHAR(120) NULL,
  catalog_number VARCHAR(60) NULL,
  country VARCHAR(80) NULL,
  format ENUM('LP', 'EP', 'Singl', 'Dupli LP', 'Box set') NOT NULL DEFAULT 'LP',
  speed ENUM('33', '45', '78') NOT NULL DEFAULT '33',
  -- Stanje po Goldmine skali: M, NM, VG+, VG, G+, G, P
  media_condition ENUM('M', 'NM', 'VG+', 'VG', 'G+', 'G', 'P') NULL,
  sleeve_condition ENUM('M', 'NM', 'VG+', 'VG', 'G+', 'G', 'P') NULL,
  cover_url VARCHAR(500) NULL,
  description TEXT NULL,
  -- Lične bilješke i podaci o kupovini — vidljivi samo administratoru
  notes TEXT NULL,
  purchase_price DECIMAL(8,2) NULL,
  purchase_date DATE NULL,
  purchased_from VARCHAR(160) NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  -- ID izdanja na Discogs-u ako je ploča uvezena odatle (link + upozorenje za duplikat)
  discogs_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_records_artist
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE RESTRICT,
  INDEX idx_records_created (created_at),
  INDEX idx_records_year (release_year),
  INDEX idx_records_title (title),
  INDEX idx_records_discogs (discogs_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS record_genres (
  record_id INT UNSIGNED NOT NULL,
  genre_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (record_id, genre_id),
  CONSTRAINT fk_record_genres_record
    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  CONSTRAINT fk_record_genres_genre
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spisak pjesama po stranama (A1, A2, B1...)
CREATE TABLE IF NOT EXISTS tracks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id INT UNSIGNED NOT NULL,
  position VARCHAR(10) NOT NULL,
  title VARCHAR(200) NOT NULL,
  duration VARCHAR(10) NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_tracks_record
    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  INDEX idx_tracks_record (record_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Administratorski nalozi (za dodavanje, izmjenu i brisanje ploča)
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log svake značajnije akcije nad API-jem (audit trag)
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(40) NULL,
  entity_id INT UNSIGNED NULL,
  payload JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_logs_action (action),
  INDEX idx_activity_logs_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
