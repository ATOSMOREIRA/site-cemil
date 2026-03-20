CREATE TABLE IF NOT EXISTS habilidades_importacao (
    id INT NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(40) NOT NULL,
    descricao LONGTEXT NOT NULL,
    documento VARCHAR(20) NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    disciplina_nome VARCHAR(120) NOT NULL,
    ano_escolar VARCHAR(40) NOT NULL,
    etapa_ensino VARCHAR(80) NOT NULL,
    unidade_tematica VARCHAR(200) DEFAULT NULL,
    objeto_conhecimento VARCHAR(255) DEFAULT NULL,
    habilidade_complementar VARCHAR(255) DEFAULT NULL,
    fonte_arquivo VARCHAR(255) DEFAULT NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    KEY idx_habilidades_importacao_disciplina_nome (disciplina_nome),
    KEY idx_habilidades_importacao_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

TRUNCATE TABLE habilidades_importacao;

LOAD DATA LOCAL INFILE 'C:/xampp/htdocs/temp/habilidades_bncc_dct.csv'
INTO TABLE habilidades_importacao
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ';'
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(codigo, descricao, documento, tipo, disciplina_nome, ano_escolar, etapa_ensino, unidade_tematica, objeto_conhecimento, habilidade_complementar, fonte_arquivo, ativo);

SELECT DISTINCT hi.disciplina_nome
FROM habilidades_importacao hi
LEFT JOIN disciplinas d_nome
    ON UPPER(TRIM(d_nome.nome)) = UPPER(TRIM(hi.disciplina_nome))
LEFT JOIN disciplinas d_sigla
    ON d_sigla.id = CASE SUBSTRING(TRIM(hi.codigo), 5, 2)
        WHEN 'AR' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'ARTE%' LIMIT 1)
        WHEN 'CI' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'CI%' LIMIT 1)
        WHEN 'EF' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'EDUCA%' LIMIT 1)
        WHEN 'ER' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'HIST%' LIMIT 1)
        WHEN 'GE' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'GEO%' LIMIT 1)
        WHEN 'HI' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'HIST%' LIMIT 1)
        WHEN 'LI' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'L%ING%' LIMIT 1)
        WHEN 'LP' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'L%PORTUG%' LIMIT 1)
        WHEN 'MA' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'MATEM%' LIMIT 1)
        ELSE NULL
    END
WHERE d_nome.id IS NULL
  AND d_sigla.id IS NULL
ORDER BY hi.disciplina_nome;

INSERT INTO habilidades (
    codigo,
    descricao,
    tipo,
    documento,
    disciplina_id,
    ano_escolar,
    etapa_ensino,
    unidade_tematica,
    objeto_conhecimento,
    habilidade_complementar,
    fonte_arquivo,
    ativo
)
SELECT
    TRIM(hi.codigo) AS codigo,
    TRIM(BOTH ' ' FROM
        TRIM(TRAILING '(' FROM
            TRIM(TRAILING '[' FROM
                TRIM(LEADING ')' FROM
                    TRIM(LEADING ']' FROM TRIM(hi.descricao))
                )
            )
        )
    ) AS descricao,
    TRIM(hi.tipo) AS tipo,
    UPPER(TRIM(hi.documento)) AS documento,
    d.id AS disciplina_id,
    TRIM(hi.ano_escolar) AS ano_escolar,
    TRIM(hi.etapa_ensino) AS etapa_ensino,
    NULLIF(TRIM(hi.unidade_tematica), '') AS unidade_tematica,
    NULLIF(TRIM(hi.objeto_conhecimento), '') AS objeto_conhecimento,
    NULLIF(TRIM(hi.habilidade_complementar), '') AS habilidade_complementar,
    NULLIF(TRIM(hi.fonte_arquivo), '') AS fonte_arquivo,
    IF(hi.ativo IS NULL, 1, hi.ativo) AS ativo
FROM habilidades_importacao hi
LEFT JOIN disciplinas d_nome
    ON UPPER(TRIM(d_nome.nome)) = UPPER(TRIM(hi.disciplina_nome))
LEFT JOIN disciplinas d_sigla
    ON d_sigla.id = CASE SUBSTRING(TRIM(hi.codigo), 5, 2)
        WHEN 'AR' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'ARTE%' LIMIT 1)
        WHEN 'CI' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'CI%' LIMIT 1)
        WHEN 'EF' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'EDUCA%' LIMIT 1)
        WHEN 'ER' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'HIST%' LIMIT 1)
        WHEN 'GE' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'GEO%' LIMIT 1)
        WHEN 'HI' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'HIST%' LIMIT 1)
        WHEN 'LI' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'L%ING%' LIMIT 1)
        WHEN 'LP' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'L%PORTUG%' LIMIT 1)
        WHEN 'MA' THEN (SELECT id FROM disciplinas WHERE UPPER(nome) LIKE 'MATEM%' LIMIT 1)
        ELSE NULL
    END
INNER JOIN disciplinas d
    ON d.id = COALESCE(d_nome.id, d_sigla.id)
WHERE TRIM(hi.codigo) <> ''
  AND TRIM(BOTH ' ' FROM
        TRIM(TRAILING '(' FROM
            TRIM(TRAILING '[' FROM
                TRIM(LEADING ')' FROM
                    TRIM(LEADING ']' FROM TRIM(hi.descricao))
                )
            )
        )
    ) <> ''
  AND TRIM(hi.ano_escolar) <> ''
ON DUPLICATE KEY UPDATE
    descricao = VALUES(descricao),
    tipo = VALUES(tipo),
    etapa_ensino = VALUES(etapa_ensino),
    unidade_tematica = VALUES(unidade_tematica),
    objeto_conhecimento = VALUES(objeto_conhecimento),
    habilidade_complementar = VALUES(habilidade_complementar),
    fonte_arquivo = VALUES(fonte_arquivo),
    ativo = VALUES(ativo),
    updated_at = CURRENT_TIMESTAMP;

UPDATE habilidades
SET descricao = TRIM(BOTH ' ' FROM
    TRIM(TRAILING '(' FROM
        TRIM(TRAILING '[' FROM
            TRIM(LEADING ')' FROM
                TRIM(LEADING ']' FROM TRIM(descricao))
            )
        )
    )
)
WHERE TRIM(descricao) LIKE ')%'
   OR TRIM(descricao) LIKE ']%'
   OR TRIM(descricao) LIKE '%('
   OR TRIM(descricao) LIKE '%[';

SELECT
    documento,
    ano_escolar,
    COUNT(*) AS total
FROM habilidades
GROUP BY documento, ano_escolar
ORDER BY documento, ano_escolar;
