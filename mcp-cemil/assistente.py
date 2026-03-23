"""
Assistente escolar CEMIL — Groq API + Tool Use
Conecta ao banco MySQL e permite conversar com os dados em linguagem natural.

Uso:
    python assistente.py
"""

import json
import os
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib import error, request

import pymysql
import pymysql.cursors

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

def _load_env() -> dict[str, str]:
    env_path = Path(__file__).parent.parent / ".env"
    values: dict[str, str] = {}
    if not env_path.exists():
        return values
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        values[key.strip()] = val.strip().strip("'\"")
    return values

_env = _load_env()

DB_HOST     = os.getenv("DB_HOST")  or _env.get("DB_HOST",  "127.0.0.1")
DB_PORT     = int(os.getenv("DB_PORT") or _env.get("DB_PORT", "3306"))
DB_NAME     = os.getenv("DB_NAME")  or _env.get("DB_NAME",  "cemil")
DB_USER     = os.getenv("DB_USER")  or _env.get("DB_USER",  "root")
DB_PASS     = os.getenv("DB_PASS")  or _env.get("DB_PASS",  "")
GROQ_KEY    = (
    os.getenv("GROQ_API_KEY")
    or os.getenv("APIKEY_GROQ")
    or os.getenv("API_KEY_GROQ")
    or os.getenv("GROQ_KEY")
    or _env.get("GROQ_API_KEY", "")
    or _env.get("APIKEY_GROQ", "")
    or _env.get("API_KEY_GROQ", "")
    or _env.get("GROQ_KEY", "")
)

MODEL = os.getenv("GROQ_MODEL") or _env.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
SYSTEM = (
    "Você é o assistente pedagógico e administrativo da escola CEMIL - Jardenir Jorge Frederico. "
    "Seu foco é apoiar rotinas escolares, pedagógicas e administrativas com respostas práticas. "
    "Você tem acesso direto ao banco de dados da escola e deve consultar dados reais antes de responder sempre que a pergunta depender de informações do sistema. "
    "Nunca invente nomes, números, registros ou resultados. "
    "Responda sempre em português brasileiro, de forma clara, objetiva e curta, priorizando o essencial. "
    "Prefira respostas com no máximo 5 itens ou 1 parágrafo curto, salvo se o usuário pedir detalhes. "
    "Ao apresentar listas de dados, use listas curtas e fáceis de ler. "
    "Quando houver alguma limitação, explique em uma frase e diga o que falta para concluir. "
    "Se o usuário pedir análise pedagógica, destaque primeiro os pontos principais e depois as ações sugeridas. "
    f"Data de hoje: {date.today().isoformat()}."
)

# ---------------------------------------------------------------------------
# Banco de dados
# ---------------------------------------------------------------------------

def _conn() -> pymysql.Connection:
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user=DB_USER, password=DB_PASS,
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, autocommit=True,
    )

def _serial(obj: Any) -> str:
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError

def _j(data: Any) -> Any:
    """Converte para JSON serializável."""
    return json.loads(json.dumps(data, default=_serial))

# ---------------------------------------------------------------------------
# Funções de banco (chamadas pelas tools)
# ---------------------------------------------------------------------------

def listar_alunos(nome: str = "", turma_id: int = 0, limite: int = 100) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = ("SELECT id, nome, matricula, turma_id, turma, data_nascimento, "
               "data_entrada, data_saida, responsavel, telefone, email FROM alunos WHERE 1=1")
        params: list = []
        if nome:
            sql += " AND nome LIKE %s"; params.append(f"%{nome}%")
        if turma_id > 0:
            sql += " AND turma_id = %s"; params.append(turma_id)
        sql += " ORDER BY nome ASC LIMIT %s"; params.append(limite)
        cur.execute(sql, params)
        return _j(cur.fetchall())

def buscar_aluno(id: int = 0, matricula: str = "") -> Any:
    with _conn() as conn, conn.cursor() as cur:
        if id > 0:
            cur.execute("SELECT * FROM alunos WHERE id = %s LIMIT 1", (id,))
        elif matricula:
            cur.execute("SELECT * FROM alunos WHERE matricula = %s LIMIT 1", (matricula,))
        else:
            return {"erro": "Informe id ou matricula."}
        return _j(cur.fetchone() or {"erro": "Aluno não encontrado."})

def criar_aluno(nome: str, matricula: str, turma_id: int = 0, turma: str = "",
                data_nascimento: str = "", responsavel: str = "",
                telefone: str = "", email: str = "") -> Any:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO alunos (nome, matricula, turma_id, turma, data_nascimento, "
            "responsavel, telefone, email) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (nome, matricula, turma_id or None, turma, data_nascimento or None,
             responsavel or None, telefone or None, email or None),
        )
        return {"sucesso": True, "id": cur.lastrowid}

def atualizar_aluno(id: int, nome: str = "", turma_id: int = -1, turma: str = "",
                    data_nascimento: str = "", responsavel: str = "",
                    telefone: str = "", email: str = "") -> Any:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM alunos WHERE id = %s LIMIT 1", (id,))
        row = cur.fetchone()
        if not row:
            return {"erro": "Aluno não encontrado."}
        cur.execute(
            "UPDATE alunos SET nome=%s, turma_id=%s, turma=%s, data_nascimento=%s, "
            "responsavel=%s, telefone=%s, email=%s WHERE id=%s",
            (nome or row["nome"],
             (turma_id if turma_id >= 0 else row["turma_id"]) or None,
             turma or row["turma"],
             data_nascimento or row["data_nascimento"],
             responsavel or row["responsavel"],
             telefone or row["telefone"],
             email or row["email"], id),
        )
        return {"sucesso": True}

def excluir_aluno(id: int) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM alunos WHERE id = %s LIMIT 1", (id,))
        return {"sucesso": True}

def listar_turmas(ano_letivo: int = 0) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = "SELECT id, nome, ano_letivo, turno, capacidade, ano_escolar FROM turmas WHERE 1=1"
        params: list = []
        if ano_letivo > 0:
            sql += " AND ano_letivo = %s"; params.append(ano_letivo)
        sql += " ORDER BY ano_letivo DESC, nome ASC"
        cur.execute(sql, params)
        return _j(cur.fetchall())

def criar_turma(nome: str, ano_letivo: int, turno: str, capacidade: int,
                ano_escolar: str = "") -> Any:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO turmas (nome, ano_letivo, turno, capacidade, ano_escolar) VALUES (%s,%s,%s,%s,%s)",
            (nome, ano_letivo, turno, capacidade, ano_escolar or None),
        )
        return {"sucesso": True, "id": cur.lastrowid}

def listar_avaliacoes(bimestre: int = 0) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = ("SELECT a.id, a.nome, a.bimestre, a.aplicacao, a.turma, a.is_recuperacao, "
               "a.is_simulado, u.nome AS autor FROM avaliacoes a "
               "LEFT JOIN usuarios u ON u.id = a.autor_id WHERE 1=1")
        params: list = []
        if bimestre > 0:
            sql += " AND a.bimestre = %s"; params.append(bimestre)
        sql += " ORDER BY a.aplicacao DESC, a.created_at DESC"
        cur.execute(sql, params)
        return _j(cur.fetchall())

def buscar_avaliacao(id: int) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM avaliacoes WHERE id = %s LIMIT 1", (id,))
        return _j(cur.fetchone() or {"erro": "Não encontrada."})

def criar_avaliacao(nome: str, bimestre: int = 0, aplicacao: str = "",
                    turma: str = "", descricao: str = "",
                    is_recuperacao: bool = False) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO avaliacoes (nome, bimestre, aplicacao, turma, descricao, is_recuperacao) "
            "VALUES (%s,%s,%s,%s,%s,%s)",
            (nome, bimestre or None, aplicacao or None, turma or None,
             descricao or None, 1 if is_recuperacao else 0),
        )
        return {"sucesso": True, "id": cur.lastrowid}

def listar_correcoes(avaliacao_id: int = 0, aluno_id: int = 0) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = ("SELECT ac.*, al.nome AS aluno_nome, av.nome AS avaliacao_nome "
               "FROM avaliacoes_correcoes ac "
               "JOIN alunos al ON al.id = ac.aluno_id "
               "JOIN avaliacoes av ON av.id = ac.avaliacao_id WHERE 1=1")
        params: list = []
        if avaliacao_id > 0:
            sql += " AND ac.avaliacao_id = %s"; params.append(avaliacao_id)
        if aluno_id > 0:
            sql += " AND ac.aluno_id = %s"; params.append(aluno_id)
        cur.execute(sql, params)
        return _j(cur.fetchall())

def listar_usuarios(tipo: str = "") -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = "SELECT id, nome, usuario, email, tipo, departamento FROM usuarios WHERE 1=1"
        params: list = []
        if tipo:
            sql += " AND tipo = %s"; params.append(tipo)
        sql += " ORDER BY nome ASC"
        cur.execute(sql, params)
        return _j(cur.fetchall())

def listar_habilidades(disciplina_id: int = 0, ano_escolar: str = "",
                       codigo: str = "", limite: int = 50) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = ("SELECT h.id, h.codigo, h.descricao, d.nome AS disciplina, h.ano_escolar "
               "FROM habilidades h LEFT JOIN disciplinas d ON d.id = h.disciplina_id WHERE 1=1")
        params: list = []
        if disciplina_id > 0:
            sql += " AND h.disciplina_id = %s"; params.append(disciplina_id)
        if ano_escolar:
            sql += " AND h.ano_escolar = %s"; params.append(ano_escolar)
        if codigo:
            sql += " AND h.codigo LIKE %s"; params.append(f"%{codigo}%")
        sql += " ORDER BY h.codigo ASC LIMIT %s"; params.append(limite)
        cur.execute(sql, params)
        return _j(cur.fetchall())

def listar_disciplinas() -> Any:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM disciplinas ORDER BY nome ASC")
        return _j(cur.fetchall())

def resumo_refeitorio(data: str = "") -> Any:
    target = data or date.today().isoformat()
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT t.nome, COUNT(r.id) AS total FROM refeitorio_tipos_refeicao t "
            "LEFT JOIN refeitorio_registros r ON r.tipo_refeicao_id = t.id AND r.data = %s "
            "WHERE t.ativo = 1 GROUP BY t.id, t.nome ORDER BY t.horario_ini",
            (target,),
        )
        return _j({"data": target, "resumo": cur.fetchall()})

def relatorio_refeitorio(data_inicio: str, data_fim: str,
                         tipo_id: int = 0, turma_id: int = 0) -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = ("SELECT r.data, r.horario, a.nome AS aluno, a.turma, "
               "t.nome AS refeicao, r.obs "
               "FROM refeitorio_registros r "
               "JOIN alunos a ON a.id = r.aluno_id "
               "JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id "
               "WHERE r.data BETWEEN %s AND %s")
        params: list = [data_inicio, data_fim]
        if tipo_id > 0:
            sql += " AND r.tipo_refeicao_id = %s"; params.append(tipo_id)
        if turma_id > 0:
            sql += " AND a.turma_id = %s"; params.append(turma_id)
        sql += " ORDER BY r.data DESC, r.horario DESC"
        cur.execute(sql, params)
        rows = cur.fetchall()
        return _j({"periodo": f"{data_inicio} a {data_fim}", "total": len(rows), "registros": rows})

def registrar_refeicao(aluno_id: int, tipo_id: int, data: str = "", obs: str = "") -> Any:
    target = data or date.today().isoformat()
    horario = datetime.now().strftime("%H:%M:%S")
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM refeitorio_registros WHERE aluno_id=%s AND tipo_refeicao_id=%s AND data=%s LIMIT 1",
            (aluno_id, tipo_id, target),
        )
        if cur.fetchone():
            return {"erro": "Aluno já consumiu esta refeição nesta data."}
        cur.execute(
            "INSERT INTO refeitorio_registros (aluno_id, tipo_refeicao_id, data, horario, obs) "
            "VALUES (%s,%s,%s,%s,%s)",
            (aluno_id, tipo_id, target, horario, obs or None),
        )
        return {"sucesso": True, "id": cur.lastrowid}

def listar_reservas(item_id: int = 0, data_inicio: str = "", data_fim: str = "") -> Any:
    with _conn() as conn, conn.cursor() as cur:
        sql = ("SELECT r.id, i.nome AS item, r.responsavel_nome, r.inicio, r.fim, r.observacao "
               "FROM agendamento_reservas r JOIN agendamento_itens i ON i.id = r.item_id WHERE 1=1")
        params: list = []
        if item_id > 0:
            sql += " AND r.item_id = %s"; params.append(item_id)
        if data_inicio:
            sql += " AND r.inicio >= %s"; params.append(data_inicio)
        if data_fim:
            sql += " AND r.fim <= %s"; params.append(data_fim + " 23:59:59")
        sql += " ORDER BY r.inicio ASC"
        cur.execute(sql, params)
        return _j(cur.fetchall())

def estatisticas_gerais() -> Any:
    with _conn() as conn, conn.cursor() as cur:
        stats: dict[str, Any] = {}
        queries = {
            "alunos_total": "SELECT COUNT(*) FROM alunos",
            "alunos_ativos": "SELECT COUNT(*) FROM alunos WHERE data_saida IS NULL OR data_saida >= CURDATE()",
            "turmas": "SELECT COUNT(*) FROM turmas",
            "avaliacoes": "SELECT COUNT(*) FROM avaliacoes",
            "usuarios": "SELECT COUNT(*) FROM usuarios",
            "habilidades": "SELECT COUNT(*) FROM habilidades",
        }
        for k, sql in queries.items():
            try:
                cur.execute(sql)
                val = cur.fetchone()
                stats[k] = list(val.values())[0] if val else 0
            except Exception:
                stats[k] = None

        today = date.today().isoformat()
        cur.execute("SELECT COUNT(*) AS c FROM refeitorio_registros WHERE data = %s", (today,))
        r = cur.fetchone()
        stats["refeicoes_hoje"] = r["c"] if r else 0
        return _j(stats)

# ---------------------------------------------------------------------------
# Definição das tools para a Groq API
# ---------------------------------------------------------------------------

TOOLS: list[dict] = [
    {
        "name": "listar_alunos",
        "description": "Lista alunos cadastrados. Filtra por nome (parcial) e/ou turma_id.",
        "input_schema": {
            "type": "object",
            "properties": {
                "nome":     {"type": "string",  "description": "Filtro parcial pelo nome"},
                "turma_id": {"type": "integer", "description": "ID da turma"},
                "limite":   {"type": "integer", "description": "Máximo de resultados (padrão 100)"},
            },
        },
    },
    {
        "name": "buscar_aluno",
        "description": "Busca um aluno pelo ID ou pela matrícula.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id":        {"type": "integer", "description": "ID do aluno"},
                "matricula": {"type": "string",  "description": "Matrícula do aluno"},
            },
        },
    },
    {
        "name": "criar_aluno",
        "description": "Cadastra um novo aluno.",
        "input_schema": {
            "type": "object",
            "required": ["nome", "matricula"],
            "properties": {
                "nome":            {"type": "string"},
                "matricula":       {"type": "string"},
                "turma_id":        {"type": "integer"},
                "turma":           {"type": "string"},
                "data_nascimento": {"type": "string", "description": "YYYY-MM-DD"},
                "responsavel":     {"type": "string"},
                "telefone":        {"type": "string"},
                "email":           {"type": "string"},
            },
        },
    },
    {
        "name": "atualizar_aluno",
        "description": "Atualiza dados de um aluno existente.",
        "input_schema": {
            "type": "object",
            "required": ["id"],
            "properties": {
                "id":              {"type": "integer"},
                "nome":            {"type": "string"},
                "turma_id":        {"type": "integer"},
                "turma":           {"type": "string"},
                "data_nascimento": {"type": "string"},
                "responsavel":     {"type": "string"},
                "telefone":        {"type": "string"},
                "email":           {"type": "string"},
            },
        },
    },
    {
        "name": "excluir_aluno",
        "description": "Remove um aluno pelo ID.",
        "input_schema": {
            "type": "object",
            "required": ["id"],
            "properties": {"id": {"type": "integer"}},
        },
    },
    {
        "name": "listar_turmas",
        "description": "Lista todas as turmas. Filtra por ano_letivo se informado.",
        "input_schema": {
            "type": "object",
            "properties": {"ano_letivo": {"type": "integer"}},
        },
    },
    {
        "name": "criar_turma",
        "description": "Cria uma nova turma.",
        "input_schema": {
            "type": "object",
            "required": ["nome", "ano_letivo", "turno", "capacidade"],
            "properties": {
                "nome":        {"type": "string"},
                "ano_letivo":  {"type": "integer"},
                "turno":       {"type": "string", "description": "Ex: Manhã, Tarde, Noite"},
                "capacidade":  {"type": "integer"},
                "ano_escolar": {"type": "string", "description": "Ex: 1º Ano, 2º Ano"},
            },
        },
    },
    {
        "name": "listar_avaliacoes",
        "description": "Lista avaliações cadastradas. Filtra por bimestre.",
        "input_schema": {
            "type": "object",
            "properties": {"bimestre": {"type": "integer", "description": "1, 2, 3 ou 4"}},
        },
    },
    {
        "name": "buscar_avaliacao",
        "description": "Busca uma avaliação pelo ID (inclui gabarito).",
        "input_schema": {
            "type": "object",
            "required": ["id"],
            "properties": {"id": {"type": "integer"}},
        },
    },
    {
        "name": "criar_avaliacao",
        "description": "Cria uma nova avaliação.",
        "input_schema": {
            "type": "object",
            "required": ["nome"],
            "properties": {
                "nome":          {"type": "string"},
                "bimestre":      {"type": "integer"},
                "aplicacao":     {"type": "string", "description": "Data YYYY-MM-DD"},
                "turma":         {"type": "string"},
                "descricao":     {"type": "string"},
                "is_recuperacao":{"type": "boolean"},
            },
        },
    },
    {
        "name": "listar_correcoes",
        "description": "Lista correções de avaliações. Filtra por avaliacao_id e/ou aluno_id.",
        "input_schema": {
            "type": "object",
            "properties": {
                "avaliacao_id": {"type": "integer"},
                "aluno_id":     {"type": "integer"},
            },
        },
    },
    {
        "name": "listar_usuarios",
        "description": "Lista usuários do sistema. Filtra por tipo.",
        "input_schema": {
            "type": "object",
            "properties": {"tipo": {"type": "string", "description": "Ex: admin, professor"}},
        },
    },
    {
        "name": "listar_habilidades",
        "description": "Lista habilidades BNCC. Filtra por disciplina_id, ano_escolar ou código.",
        "input_schema": {
            "type": "object",
            "properties": {
                "disciplina_id": {"type": "integer"},
                "ano_escolar":   {"type": "string", "description": "Ex: 1º Ano"},
                "codigo":        {"type": "string", "description": "Código BNCC parcial"},
                "limite":        {"type": "integer"},
            },
        },
    },
    {
        "name": "listar_disciplinas",
        "description": "Lista todas as disciplinas cadastradas.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "resumo_refeitorio",
        "description": "Resumo de consumo do refeitório em uma data (padrão: hoje).",
        "input_schema": {
            "type": "object",
            "properties": {"data": {"type": "string", "description": "YYYY-MM-DD"}},
        },
    },
    {
        "name": "relatorio_refeitorio",
        "description": "Relatório de refeições em um período.",
        "input_schema": {
            "type": "object",
            "required": ["data_inicio", "data_fim"],
            "properties": {
                "data_inicio": {"type": "string", "description": "YYYY-MM-DD"},
                "data_fim":    {"type": "string", "description": "YYYY-MM-DD"},
                "tipo_id":     {"type": "integer"},
                "turma_id":    {"type": "integer"},
            },
        },
    },
    {
        "name": "registrar_refeicao",
        "description": "Registra o consumo de uma refeição por um aluno.",
        "input_schema": {
            "type": "object",
            "required": ["aluno_id", "tipo_id"],
            "properties": {
                "aluno_id": {"type": "integer"},
                "tipo_id":  {"type": "integer"},
                "data":     {"type": "string", "description": "YYYY-MM-DD (padrão: hoje)"},
                "obs":      {"type": "string"},
            },
        },
    },
    {
        "name": "listar_reservas",
        "description": "Lista reservas de agendamento. Filtra por item e/ou período.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_id":     {"type": "integer"},
                "data_inicio": {"type": "string"},
                "data_fim":    {"type": "string"},
            },
        },
    },
    {
        "name": "estatisticas_gerais",
        "description": "Retorna contagens gerais do sistema (alunos, turmas, avaliações, etc.).",
        "input_schema": {"type": "object", "properties": {}},
    },
]

# Mapa nome → função
TOOL_MAP: dict[str, Any] = {
    "listar_alunos":       listar_alunos,
    "buscar_aluno":        buscar_aluno,
    "criar_aluno":         criar_aluno,
    "atualizar_aluno":     atualizar_aluno,
    "excluir_aluno":       excluir_aluno,
    "listar_turmas":       listar_turmas,
    "criar_turma":         criar_turma,
    "listar_avaliacoes":   listar_avaliacoes,
    "buscar_avaliacao":    buscar_avaliacao,
    "criar_avaliacao":     criar_avaliacao,
    "listar_correcoes":    listar_correcoes,
    "listar_usuarios":     listar_usuarios,
    "listar_habilidades":  listar_habilidades,
    "listar_disciplinas":  listar_disciplinas,
    "resumo_refeitorio":   resumo_refeitorio,
    "relatorio_refeitorio":relatorio_refeitorio,
    "registrar_refeicao":  registrar_refeicao,
    "listar_reservas":     listar_reservas,
    "estatisticas_gerais": estatisticas_gerais,
}


def _build_groq_tools() -> list[dict[str, Any]]:
    tools: list[dict[str, Any]] = []
    for tool in TOOLS:
        parameters = dict(tool.get("input_schema", {"type": "object", "properties": {}}))
        properties = parameters.get("properties", {})
        if not isinstance(properties, dict):
            properties = {}
        parameters["type"] = parameters.get("type", "object")
        parameters["properties"] = properties
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": parameters,
                },
            }
        )
    return tools


GROQ_TOOLS = _build_groq_tools()

def executar_tool(nome: str, entrada: dict) -> str:
    fn = TOOL_MAP.get(nome)
    if fn is None:
        return json.dumps({"erro": f"Ferramenta '{nome}' não encontrada."})
    try:
        resultado = fn(**entrada)
        return json.dumps(resultado, ensure_ascii=False, default=_serial)
    except Exception as e:
        return json.dumps({"erro": str(e)})


def chamar_groq(messages: list[dict[str, Any]]) -> dict[str, Any]:
    payload = {
        "model": MODEL,
        "temperature": 0.2,
        "max_tokens": 8000,
        "messages": messages,
        "tools": GROQ_TOOLS,
        "tool_choice": "auto",
    }

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        GROQ_ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Bearer {GROQ_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=90) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Groq respondeu com erro HTTP {exc.code}: {detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Falha de conexão com a Groq: {exc.reason}") from exc

    decoded = json.loads(raw)
    if not isinstance(decoded, dict):
        raise RuntimeError("A resposta da Groq não pôde ser interpretada.")

    return decoded

# ---------------------------------------------------------------------------
# Loop de conversa
# ---------------------------------------------------------------------------

def conversar() -> None:
    messages: list[dict] = []

    print("=" * 60)
    print("  Assistente CEMIL — powered by Groq")
    print("  Digite 'sair' para encerrar.")
    print("=" * 60)

    while True:
        try:
            entrada = input("\nVocê: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nEncerrando...")
            break

        if entrada.lower() in ("sair", "exit", "quit"):
            print("Até logo!")
            break

        if not entrada:
            continue

        messages.append({"role": "user", "content": entrada})

        # Loop de tool use
        while True:
            response = chamar_groq([
                {"role": "system", "content": SYSTEM},
                *messages,
            ])

            choice = response.get("choices", [{}])[0]
            message = choice.get("message", {}) if isinstance(choice, dict) else {}
            content = str(message.get("content") or "").strip()
            tool_calls = message.get("tool_calls", []) if isinstance(message, dict) else []
            if not isinstance(tool_calls, list):
                tool_calls = []

            print("\nAssistente: ", end="", flush=True)
            if content:
                print(content, end="")
            print()

            assistant_message: dict[str, Any] = {"role": "assistant"}
            if content:
                assistant_message["content"] = content
            if tool_calls:
                assistant_message["tool_calls"] = tool_calls
            messages.append(assistant_message)

            if not tool_calls:
                break

            for tool_call in tool_calls:
                if not isinstance(tool_call, dict):
                    continue

                function_data = tool_call.get("function", {})
                if not isinstance(function_data, dict):
                    continue

                tool_name = str(function_data.get("name") or "").strip()
                raw_arguments = str(function_data.get("arguments") or "{}")
                tool_call_id = str(tool_call.get("id") or "").strip()
                if not tool_name or not tool_call_id:
                    continue

                try:
                    tool_input = json.loads(raw_arguments)
                except json.JSONDecodeError:
                    tool_input = {}

                if not isinstance(tool_input, dict):
                    tool_input = {}

                print(f"  [chamando tool: {tool_name}]", flush=True)
                resultado = executar_tool(tool_name, tool_input)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "content": resultado,
                    }
                )

if __name__ == "__main__":
    if not GROQ_KEY:
        print("ERRO: chave da Groq não encontrada no .env nem nas variáveis de ambiente.")
        print("Configure GROQ_API_KEY, APIKEY_GROQ, API_KEY_GROQ ou GROQ_KEY.")
        raise SystemExit(1)
    conversar()
