/**
 * Esquema de la base de datos Spectra (MySQL).
 * Una única fuente de verdad: torneos (pádel, fútbol, hockey) con campos comunes
 * y datos específicos por formato (escalera vs liga).
 */

/** Sentencias DDL compatibles con MySQL (sin IF NOT EXISTS en índices). */
export const statements = [
  `CREATE TABLE IF NOT EXISTS admin_user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS tournaments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date DATE NULL,
    end_date DATE NULL,
    rules TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    state_json LONGTEXT NULL,
    modality VARCHAR(20) NULL,
    CONSTRAINT chk_tournaments_sport CHECK (sport IN ('padel','futbol','hockey')),
    CONSTRAINT chk_tournaments_status CHECK (status IN ('active','finished')),
    CONSTRAINT chk_tournaments_modality CHECK (modality IS NULL OR modality IN ('escalera','grupo','liga'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_zones (
    id VARCHAR(50) PRIMARY KEY,
    tournament_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_league_zones_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_teams (
    id VARCHAR(50) PRIMARY KEY,
    tournament_id VARCHAR(50) NOT NULL,
    zone_id VARCHAR(50) NULL,
    name VARCHAR(255) NOT NULL,
    shield_url VARCHAR(500) NULL,
    UNIQUE KEY uq_league_teams_tournament_name (tournament_id, name),
    CONSTRAINT fk_league_teams_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_league_teams_zone FOREIGN KEY (zone_id) REFERENCES league_zones(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_matchdays (
    id VARCHAR(50) PRIMARY KEY,
    tournament_id VARCHAR(50) NOT NULL,
    number INT NOT NULL,
    UNIQUE KEY uq_league_matchdays_tournament_number (tournament_id, number),
    CONSTRAINT fk_league_matchdays_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_matches (
    id VARCHAR(50) PRIMARY KEY,
    matchday_id VARCHAR(50) NOT NULL,
    zone_id VARCHAR(50) NULL,
    home_team_id VARCHAR(50) NOT NULL,
    away_team_id VARCHAR(50) NOT NULL,
    home_score INT NULL,
    away_score INT NULL,
    home_games INT NULL,
    away_games INT NULL,
    played_at DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    CONSTRAINT fk_league_matches_matchday FOREIGN KEY (matchday_id) REFERENCES league_matchdays(id) ON DELETE CASCADE,
    CONSTRAINT fk_league_matches_zone FOREIGN KEY (zone_id) REFERENCES league_zones(id) ON DELETE SET NULL,
    CONSTRAINT fk_league_matches_home FOREIGN KEY (home_team_id) REFERENCES league_teams(id),
    CONSTRAINT fk_league_matches_away FOREIGN KEY (away_team_id) REFERENCES league_teams(id),
    CONSTRAINT chk_league_matches_status CHECK (status IN ('scheduled','played','postponed'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_goals (
    id VARCHAR(50) PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    team_id VARCHAR(50) NOT NULL,
    minute INT NULL,
    CONSTRAINT fk_league_goals_match FOREIGN KEY (match_id) REFERENCES league_matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_league_goals_team FOREIGN KEY (team_id) REFERENCES league_teams(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_cards (
    id VARCHAR(50) PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    team_id VARCHAR(50) NOT NULL,
    card_type VARCHAR(10) NOT NULL,
    CONSTRAINT fk_league_cards_match FOREIGN KEY (match_id) REFERENCES league_matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_league_cards_team FOREIGN KEY (team_id) REFERENCES league_teams(id),
    CONSTRAINT chk_league_cards_type CHECK (card_type IN ('yellow','red'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_team_players (
    id VARCHAR(50) PRIMARY KEY,
    team_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NULL,
    shirt_number INT NULL,
    CONSTRAINT fk_league_team_players_team FOREIGN KEY (team_id) REFERENCES league_teams(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_config (
    tournament_id VARCHAR(50) PRIMARY KEY,
    points_win INT NOT NULL DEFAULT 3,
    points_draw INT NOT NULL DEFAULT 1,
    points_loss INT NOT NULL DEFAULT 0,
    round_trip TINYINT(1) NOT NULL DEFAULT 0,
    phase VARCHAR(20) NOT NULL DEFAULT 'groups',
    qualify_per_zone JSON NULL,
    CONSTRAINT fk_league_config_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_playoff_rounds (
    id VARCHAR(50) PRIMARY KEY,
    tournament_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_league_playoff_rounds_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_playoff_matches (
    id VARCHAR(50) PRIMARY KEY,
    round_id VARCHAR(50) NOT NULL,
    home_team_id VARCHAR(50) NULL,
    away_team_id VARCHAR(50) NULL,
    home_slot VARCHAR(20) NULL,
    away_slot VARCHAR(20) NULL,
    home_score INT NULL,
    away_score INT NULL,
    winner_advances_to_match_id VARCHAR(50) NULL,
    winner_advances_as VARCHAR(10) NULL,
    played_at DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    CONSTRAINT fk_playoff_matches_round FOREIGN KEY (round_id) REFERENCES league_playoff_rounds(id) ON DELETE CASCADE,
    CONSTRAINT fk_playoff_matches_home FOREIGN KEY (home_team_id) REFERENCES league_teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_playoff_matches_away FOREIGN KEY (away_team_id) REFERENCES league_teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_playoff_matches_next FOREIGN KEY (winner_advances_to_match_id) REFERENCES league_playoff_matches(id) ON DELETE SET NULL,
    CONSTRAINT chk_playoff_matches_status CHECK (status IN ('scheduled','played','postponed')),
    CONSTRAINT chk_playoff_winner_as CHECK (winner_advances_as IS NULL OR winner_advances_as IN ('home','away'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_playoff_goals (
    id VARCHAR(50) PRIMARY KEY,
    playoff_match_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    team_id VARCHAR(50) NOT NULL,
    minute INT NULL,
    CONSTRAINT fk_playoff_goals_match FOREIGN KEY (playoff_match_id) REFERENCES league_playoff_matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_playoff_goals_team FOREIGN KEY (team_id) REFERENCES league_teams(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS league_playoff_cards (
    id VARCHAR(50) PRIMARY KEY,
    playoff_match_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    team_id VARCHAR(50) NOT NULL,
    card_type VARCHAR(10) NOT NULL,
    CONSTRAINT fk_playoff_cards_match FOREIGN KEY (playoff_match_id) REFERENCES league_playoff_matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_playoff_cards_team FOREIGN KEY (team_id) REFERENCES league_teams(id),
    CONSTRAINT chk_playoff_cards_type CHECK (card_type IN ('yellow','red'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
]

/** Índices adicionales (pueden fallar si ya existen). */
export const indexStatements = [
  'CREATE INDEX idx_tournaments_sport ON tournaments(sport)',
  'CREATE INDEX idx_tournaments_status ON tournaments(status)',
  'CREATE INDEX idx_league_zones_tournament ON league_zones(tournament_id)',
  'CREATE INDEX idx_league_teams_tournament ON league_teams(tournament_id)',
  'CREATE INDEX idx_league_teams_zone ON league_teams(zone_id)',
  'CREATE INDEX idx_league_matchdays_tournament ON league_matchdays(tournament_id)',
  'CREATE INDEX idx_league_matches_matchday ON league_matches(matchday_id)',
  'CREATE INDEX idx_league_team_players_team ON league_team_players(team_id)',
  'CREATE INDEX idx_league_goals_match ON league_goals(match_id)',
  'CREATE INDEX idx_league_cards_match ON league_cards(match_id)',
  'CREATE INDEX idx_league_config_tournament ON league_config(tournament_id)',
  'CREATE INDEX idx_league_playoff_rounds_tournament ON league_playoff_rounds(tournament_id)',
  'CREATE INDEX idx_league_playoff_matches_round ON league_playoff_matches(round_id)',
  'CREATE INDEX idx_league_playoff_goals_match ON league_playoff_goals(playoff_match_id)',
  'CREATE INDEX idx_league_playoff_cards_match ON league_playoff_cards(playoff_match_id)',
]

/**
 * Ejecuta el esquema sobre una conexión/pool de MySQL (promesas).
 * @param {import('mysql2/promise').Pool} pool
 */
/** Migraciones para bases ya creadas. */
const migrationStatements = [
  'ALTER TABLE league_config ADD COLUMN fase_final_activa TINYINT(1) NOT NULL DEFAULT 0 AFTER qualify_per_zone',
  "ALTER TABLE league_config ADD COLUMN odd_team_to VARCHAR(10) NULL DEFAULT 'upper' AFTER fase_final_activa",
  'ALTER TABLE league_playoff_rounds ADD COLUMN phase_final_group VARCHAR(10) NULL AFTER sort_order',
  'ALTER TABLE tournaments ADD COLUMN modality VARCHAR(20) NULL AFTER rules',
  'ALTER TABLE league_teams ADD COLUMN zone_id VARCHAR(50) NULL AFTER tournament_id',
  'ALTER TABLE league_matches ADD COLUMN zone_id VARCHAR(50) NULL AFTER matchday_id',
  'ALTER TABLE league_team_players ADD COLUMN dni VARCHAR(20) NULL AFTER player_name',
  'ALTER TABLE league_config ADD COLUMN phase VARCHAR(20) NOT NULL DEFAULT \'groups\' AFTER round_trip',
  'ALTER TABLE league_config ADD COLUMN qualify_per_zone JSON NULL AFTER phase',
  'ALTER TABLE league_matches ADD COLUMN home_games INT NULL AFTER away_score',
  'ALTER TABLE league_matches ADD COLUMN away_games INT NULL AFTER home_games',
  "ALTER TABLE league_team_players ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'player' AFTER shirt_number",
  'ALTER TABLE league_goals ADD COLUMN goals INT NOT NULL DEFAULT 1 AFTER minute',
  'ALTER TABLE league_playoff_goals ADD COLUMN goals INT NOT NULL DEFAULT 1 AFTER minute',
]
const migrationFkStatements = [
  'ALTER TABLE league_teams ADD CONSTRAINT fk_league_teams_zone FOREIGN KEY (zone_id) REFERENCES league_zones(id) ON DELETE SET NULL',
  'ALTER TABLE league_matches ADD CONSTRAINT fk_league_matches_zone FOREIGN KEY (zone_id) REFERENCES league_zones(id) ON DELETE SET NULL',
]

export async function createSchema(pool) {
  const conn = await pool.getConnection()
  try {
    for (const sql of statements) {
      await conn.query(sql)
    }
    for (const sql of migrationStatements) {
      try {
        await conn.query(sql)
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err
      }
    }
    for (const sql of migrationFkStatements) {
      try {
        await conn.query(sql)
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME' && err.code !== 'ER_FK_DUP_NAME' && err.code !== 'ER_DUP_FOREIGN_KEY') throw err
      }
    }
    for (const sql of indexStatements) {
      try {
        await conn.query(sql)
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') throw err
      }
    }
  } finally {
    conn.release()
  }
}
