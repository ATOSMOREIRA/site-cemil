# MCP Server — CEMIL Sistema Escolar

Assistente em Python que conecta diretamente ao banco MySQL do CEMIL
e conversa com a API da Groq usando tool calling.

---

## Pré-requisitos

- **Python 3.10+** — https://www.python.org/downloads/
- **MySQL** rodando (XAMPP já cuida disso)

---

## Instalação

Abra um terminal (Prompt de Comando ou PowerShell) e execute:

```cmd
cd C:\xampp\htdocs\mcp-cemil
pip install -r requirements.txt
```

---

## Configuração do banco (opcional)

Por padrão o servidor usa:
- Host: 127.0.0.1
- Porta: 3306
- Banco: cemil
- Usuário: root
- Senha: (vazia)

Se precisar mudar, defina variáveis de ambiente antes de rodar:

```cmd
set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_NAME=cemil
set DB_USER=root
set DB_PASS=
```

---

## Configuração da API Groq

Defina uma das chaves abaixo no arquivo .env do projeto:

```env
GROQ_API_KEY=sua_chave_aqui
```

Também são aceitas estas alternativas:

```env
APIKEY_GROQ=sua_chave_aqui
API_KEY_GROQ=sua_chave_aqui
GROQ_KEY=sua_chave_aqui
```

Opcionalmente, você pode trocar o modelo padrão:

```env
GROQ_MODEL=llama-3.3-70b-versatile
```

Para executar o assistente:

```cmd
cd C:\xampp\htdocs\mcp-cemil
python assistente.py
```

> Se o Python não estiver no PATH, use o caminho completo do executável.

---

## Ferramentas disponíveis

### Alunos
| Ferramenta | Descrição |
|---|---|
| `listar_alunos` | Lista alunos (filtra por nome ou turma) |
| `buscar_aluno` | Busca por ID ou matrícula |
| `criar_aluno` | Cadastra novo aluno |
| `atualizar_aluno` | Atualiza dados do aluno |
| `excluir_aluno` | Remove aluno |

### Turmas
| Ferramenta | Descrição |
|---|---|
| `listar_turmas` | Lista turmas (filtra por ano letivo) |
| `buscar_turma` | Busca turma por ID |
| `criar_turma` | Cria nova turma |
| `atualizar_turma` | Atualiza turma |
| `excluir_turma` | Remove turma |

### Avaliações
| Ferramenta | Descrição |
|---|---|
| `listar_avaliacoes` | Lista avaliações (filtra por bimestre/turma) |
| `buscar_avaliacao` | Busca avaliação por ID (com gabarito) |
| `criar_avaliacao` | Cria nova avaliação |
| `excluir_avaliacao` | Remove avaliação |

### Correções
| Ferramenta | Descrição |
|---|---|
| `listar_correcoes` | Lista correções (filtra por avaliação/aluno) |
| `buscar_correcao` | Busca correção por ID |

### Currículo
| Ferramenta | Descrição |
|---|---|
| `listar_habilidades` | Lista habilidades BNCC (filtra por disciplina/ano) |
| `listar_disciplinas` | Lista disciplinas |
| `listar_areas` | Lista áreas de conhecimento |

### Usuários
| Ferramenta | Descrição |
|---|---|
| `listar_usuarios` | Lista usuários (filtra por tipo) |
| `buscar_usuario` | Busca usuário por ID |

### Refeitório
| Ferramenta | Descrição |
|---|---|
| `listar_tipos_refeicao` | Lista tipos de refeição |
| `resumo_refeitorio` | Resumo de consumo de um dia |
| `relatorio_refeitorio` | Relatório por período |
| `registrar_refeicao` | Registra consumo de refeição |
| `excluir_registro_refeitorio` | Remove um registro |

### Agendamentos
| Ferramenta | Descrição |
|---|---|
| `listar_itens_agendamento` | Lista itens agendáveis |
| `listar_reservas` | Lista reservas (filtra por item/período) |
| `criar_reserva` | Cria nova reserva |
| `excluir_reserva` | Remove reserva |

### Modulação / Horários
| Ferramenta | Descrição |
|---|---|
| `listar_professores_modulacao` | Lista vínculos professor-turma-disciplina |
| `listar_horarios_modulacao` | Lista horários gerados |

### Geral
| Ferramenta | Descrição |
|---|---|
| `desempenho_aluno` | Retorna desempenho detalhado de um aluno |
| `estatisticas_gerais` | Contagens gerais do sistema |

### Análise com IA (Groq API)
| Ferramenta | Descrição |
|---|---|
| `analisar_desempenho_aluno` | Relatório pedagógico detalhado de um aluno |
| `analisar_desempenho_turma` | Diagnóstico coletivo de uma turma |
| `analisar_resultados_avaliacao` | Análise de resultados de uma avaliação |
| `gerar_relatorio_refeitorio_ia` | Relatório inteligente do refeitório |
| `sugerir_plano_aula` | Gera plano de aula baseado na BNCC |
| `responder_sobre_escola` | Responde perguntas de gestão usando dados reais |

> As ferramentas de IA leem a chave da Groq automaticamente do arquivo .env do projeto.
> O modelo padrão é llama-3.3-70b-versatile, podendo ser alterado por GROQ_MODEL.
