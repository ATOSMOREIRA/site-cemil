CREATE TABLE IF NOT EXISTS habilidades (
    id INT NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(40) NOT NULL,
    descricao LONGTEXT NOT NULL,
    tipo VARCHAR(40) NOT NULL DEFAULT 'habilidade',
    documento VARCHAR(20) NOT NULL DEFAULT 'BNCC',
    disciplina_id INT NOT NULL,
    ano_escolar VARCHAR(40) NOT NULL,
    etapa_ensino VARCHAR(80) NOT NULL DEFAULT 'Ensino Fundamental',
    unidade_tematica VARCHAR(200) DEFAULT NULL,
    objeto_conhecimento VARCHAR(255) DEFAULT NULL,
    habilidade_complementar VARCHAR(255) DEFAULT NULL,
    fonte_arquivo VARCHAR(255) DEFAULT NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @has_disciplinaId := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'disciplinaId'
);
SET @sql := IF(@has_disciplinaId > 0,
    'ALTER TABLE habilidades CHANGE COLUMN disciplinaId disciplina_id INT NOT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_anoEscolar := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'anoEscolar'
);
SET @sql := IF(@has_anoEscolar > 0,
    'ALTER TABLE habilidades CHANGE COLUMN anoEscolar ano_escolar VARCHAR(40) NOT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_documento := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'documento'
);
SET @sql := IF(@has_documento = 0,
    'ALTER TABLE habilidades ADD COLUMN documento VARCHAR(20) NOT NULL DEFAULT ''BNCC'' AFTER tipo',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_etapa_ensino := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'etapa_ensino'
);
SET @sql := IF(@has_etapa_ensino = 0,
    'ALTER TABLE habilidades ADD COLUMN etapa_ensino VARCHAR(80) NOT NULL DEFAULT ''Ensino Fundamental'' AFTER ano_escolar',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_unidade_tematica := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'unidade_tematica'
);
SET @sql := IF(@has_unidade_tematica = 0,
    'ALTER TABLE habilidades ADD COLUMN unidade_tematica VARCHAR(200) NULL AFTER etapa_ensino',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_objeto_conhecimento := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'objeto_conhecimento'
);
SET @sql := IF(@has_objeto_conhecimento = 0,
    'ALTER TABLE habilidades ADD COLUMN objeto_conhecimento VARCHAR(255) NULL AFTER unidade_tematica',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_habilidade_complementar := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'habilidade_complementar'
);
SET @sql := IF(@has_habilidade_complementar = 0,
    'ALTER TABLE habilidades ADD COLUMN habilidade_complementar VARCHAR(255) NULL AFTER objeto_conhecimento',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fonte_arquivo := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'fonte_arquivo'
);
SET @sql := IF(@has_fonte_arquivo = 0,
    'ALTER TABLE habilidades ADD COLUMN fonte_arquivo VARCHAR(255) NULL AFTER habilidade_complementar',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_ativo := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'ativo'
);
SET @sql := IF(@has_ativo = 0,
    'ALTER TABLE habilidades ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER fonte_arquivo',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_created_at := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(@has_created_at = 0,
    'ALTER TABLE habilidades ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER ativo',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_updated_at := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND COLUMN_NAME = 'updated_at'
);
SET @sql := IF(@has_updated_at = 0,
    'ALTER TABLE habilidades ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE habilidades
    MODIFY COLUMN codigo VARCHAR(40) NOT NULL,
    MODIFY COLUMN descricao LONGTEXT NOT NULL,
    MODIFY COLUMN tipo VARCHAR(40) NOT NULL,
    MODIFY COLUMN documento VARCHAR(20) NOT NULL,
    MODIFY COLUMN ano_escolar VARCHAR(40) NOT NULL,
    MODIFY COLUMN etapa_ensino VARCHAR(80) NOT NULL,
    MODIFY COLUMN disciplina_id INT NOT NULL;

SET @has_uq := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND INDEX_NAME = 'uq_habilidades_codigo_disciplina_ano_documento'
);
SET @sql := IF(@has_uq = 0,
    'ALTER TABLE habilidades ADD UNIQUE KEY uq_habilidades_codigo_disciplina_ano_documento (codigo, disciplina_id, ano_escolar, documento)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_disciplina := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND INDEX_NAME = 'idx_habilidades_disciplina_id'
);
SET @sql := IF(@has_idx_disciplina = 0,
    'ALTER TABLE habilidades ADD KEY idx_habilidades_disciplina_id (disciplina_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_documento := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND INDEX_NAME = 'idx_habilidades_documento'
);
SET @sql := IF(@has_idx_documento = 0,
    'ALTER TABLE habilidades ADD KEY idx_habilidades_documento (documento)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_ano := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND INDEX_NAME = 'idx_habilidades_ano_escolar'
);
SET @sql := IF(@has_idx_ano = 0,
    'ALTER TABLE habilidades ADD KEY idx_habilidades_ano_escolar (ano_escolar)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'habilidades'
      AND CONSTRAINT_NAME = 'fk_habilidades_disciplina'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
    'ALTER TABLE habilidades ADD CONSTRAINT fk_habilidades_disciplina FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
