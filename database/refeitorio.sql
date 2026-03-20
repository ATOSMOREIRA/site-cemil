-- ============================================================
-- Controle de Refeitório — Migração / Criação de tabelas
-- ============================================================

-- Tipos de refeição (café da manhã, almoço, lanche, jantar…)
CREATE TABLE IF NOT EXISTS refeitorio_tipos_refeicao (
    id           INT          NOT NULL AUTO_INCREMENT,
    nome         VARCHAR(80)  NOT NULL,
    descricao    VARCHAR(255) NULL,
    horario_ini  TIME         NULL COMMENT 'Hora de início da refeição',
    horario_fim  TIME         NULL COMMENT 'Hora de encerramento da refeição',
    cor          VARCHAR(7)   NOT NULL DEFAULT '#4a90d9' COMMENT 'Cor hex para exibição',
    ativo        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_refeitorio_tipos_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dados iniciais (tipos comuns de refeição)
INSERT IGNORE INTO refeitorio_tipos_refeicao (nome, descricao, horario_ini, horario_fim, cor) VALUES
    ('Café da Manhã', 'Refeição matinal',          '07:00:00', '09:00:00', '#f59e0b'),
    ('Lanche da Manhã','Lanche intermediário',      '09:30:00', '10:00:00', '#10b981'),
    ('Almoço',         'Refeição do meio-dia',      '11:00:00', '13:30:00', '#3b82f6'),
    ('Lanche da Tarde','Lanche da tarde',           '15:00:00', '15:30:00', '#8b5cf6'),
    ('Jantar',         'Refeição noturna',          '18:00:00', '19:30:00', '#ec4899');

-- Registros de consumo
-- A UNIQUE KEY (aluno_id, tipo_refeicao_id, data) garante que
-- o mesmo aluno não consuma a mesma refeição mais de uma vez por dia.
CREATE TABLE IF NOT EXISTS refeitorio_registros (
    id               INT         NOT NULL AUTO_INCREMENT,
    aluno_id         INT         NOT NULL,
    tipo_refeicao_id INT         NOT NULL,
    data             DATE        NOT NULL,
    horario          TIME        NOT NULL,
    usuario_id       INT         NULL COMMENT 'Operador que registrou',
    obs              VARCHAR(255) NULL,
    created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_refeitorio_aluno_tipo_data (aluno_id, tipo_refeicao_id, data),
    KEY idx_refeitorio_data              (data),
    KEY idx_refeitorio_tipo_data         (tipo_refeicao_id, data),
    KEY idx_refeitorio_aluno             (aluno_id),
    CONSTRAINT fk_refeitorio_reg_aluno FOREIGN KEY (aluno_id)
        REFERENCES alunos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_refeitorio_reg_tipo  FOREIGN KEY (tipo_refeicao_id)
        REFERENCES refeitorio_tipos_refeicao (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
