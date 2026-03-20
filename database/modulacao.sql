CREATE TABLE IF NOT EXISTS disciplinas (
    id INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    status ENUM('ativa', 'inativa') NOT NULL DEFAULT 'ativa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_disciplinas_nome (nome),
    KEY idx_disciplinas_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS professor_modulacoes (
    id INT NOT NULL AUTO_INCREMENT,
    professor_id INT NOT NULL,
    turma_id INT NOT NULL,
    disciplina_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_professor_modulacao (professor_id, turma_id, disciplina_id),
    KEY idx_professor_modulacoes_professor (professor_id),
    KEY idx_professor_modulacoes_turma (turma_id),
    KEY idx_professor_modulacoes_disciplina (disciplina_id),
    CONSTRAINT fk_professor_modulacoes_professor
        FOREIGN KEY (professor_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_professor_modulacoes_turma
        FOREIGN KEY (turma_id) REFERENCES turmas(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_professor_modulacoes_disciplina
        FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;