<?php
declare(strict_types=1);

/**
 * Serviço de Notas e Desempenho.
 *
 * Fórmulas adotadas:
 *   1º ciclo (geral) = 0.5 × subjetiva + 0.5 × avaliações do 1º ciclo
 *   1º ciclo (Língua Portuguesa) = 0.5 × subjetiva + 0.3 × avaliações do 1º ciclo + 0.2 × produção textual
 *   2º ciclo = 0.5 × subjetiva + 0.3 × avaliações do 2º ciclo + 0.2 × simulado
 *   Média dos ciclos = (1º ciclo + 2º ciclo) / 2
 *   Nota bimestral = (média dos ciclos + recuperação) / 2
 *
 * Faixas de proficiência:
 *   ≥ 9,5 → Avançado | ≥ 6 → Adequado | ≥ 4 → Insuficiente | < 4 → Crítico
 */
class AlunoDesempenhoService
{
    private const PAYLOAD_VERSION = 2;
    private const PESO_SUBJETIVA = 0.5;
    private const PESO_AVALIACAO = 0.3;
    private const PESO_PROD_TEXTUAL = 0.2;
    private const FAIXA_AVANCADO = 9.5;
    private const FAIXA_ADEQUADO = 6.0;
    private const FAIXA_INSUFICIENTE = 4.0;

    private AlunoModel $alunoModel;
    private TurmaModel $turmaModel;
    private AvaliacaoModel $avaliacaoModel;
    private AvaliacaoCorrecaoModel $correcaoModel;
    private ?array $disciplinaCatalogOptions = null;
    private ?array $disciplinaIdNameMap = null;

    public function __construct()
    {
        $this->alunoModel = new AlunoModel();
        $this->turmaModel = new TurmaModel();
        $this->avaliacaoModel = new AvaliacaoModel();
        $this->correcaoModel = new AvaliacaoCorrecaoModel();

        $this->alunoModel->ensureTableStructure();
        $this->turmaModel->ensureTableStructure();
        $this->avaliacaoModel->ensureTableStructure();
        $this->correcaoModel->ensureTableStructure();
    }

    /* ====================================================================
     *  DASHBOARD PRINCIPAL
     * ==================================================================== */

    public function buildDashboardData(array $filters = []): array
    {
        $turmaIds = $this->normalizeIntList($filters['turma_ids'] ?? ($filters['turma_id'] ?? []), 1, 999999);
        $bimestres = $this->normalizeIntList($filters['bimestres'] ?? ($filters['bimestre'] ?? []), 1, 4);
        $anosLetivos = $this->normalizeIntList($filters['anos_letivos'] ?? ($filters['ano_letivo'] ?? []), 2000, 2100);
        $busca = $this->normalizeSearch((string) ($filters['busca'] ?? ''));
        $categoriaFiltro = trim((string) ($filters['categoria'] ?? ''));

        $singleAno = count($anosLetivos) === 1 ? (int) $anosLetivos[0] : (int) date('Y');
        $selectedBimestres = $bimestres !== [] ? array_values($bimestres) : [1, 2, 3, 4];
        $singleBimestre = count($selectedBimestres) === 1 ? (int) $selectedBimestres[0] : 0;

        $alunos = !empty($turmaIds)
            ? $this->loadAlunosByTurmas($turmaIds)
            : $this->alunoModel->getAllOrdered(true);

        if ($busca !== '') {
            $alunos = array_values(array_filter($alunos, function (array $aluno) use ($busca): bool {
                $haystack = $this->normalizeSearch(
                    ($aluno['nome'] ?? '') . ' ' . ($aluno['turma'] ?? '') . ' ' . ($aluno['matricula'] ?? '')
                );
                return str_contains($haystack, $busca);
            }));
        }

        $alunoIds = [];
        foreach ($alunos as $a) {
            $id = (int) ($a['id'] ?? 0);
            if ($id > 0) $alunoIds[] = $id;
        }

        $corrections    = $this->loadCorrections($alunoIds, $bimestres, $anosLetivos);
        $dbDisciplinas = $this->getDisciplinaCatalogOptions();
        $disciplinasDiversificadas = [];
        foreach ($dbDisciplinas as $d) {
            if (!is_array($d)) {
                continue;
            }
            $nome = $this->resolveDisciplinaLabel((string) ($d['nome'] ?? ''));
            if ($nome === '') {
                continue;
            }
            $areaNome = trim((string) ($d['area_nome'] ?? ''));
            if ($this->isAreaDiversificada($areaNome)) {
                $disciplinasDiversificadas[$this->normalizeSearch($nome)] = true;
            }
        }

        $avaliacaoCache = [];
        $allDisciplinas = [];
        $perStudentDisciplineGrades = [];
        $perStudentDisciplineCycle2Grades = [];
        $perStudentDisciplineSimuladoGrades = [];
        $perStudentDisciplineSources = [];
        $perStudentDisciplineRecoverySources = [];
        $diagnosticoMap = [];

        foreach ($corrections as $cor) {
            $avaliacaoId = (int) ($cor['avaliacao_id'] ?? 0);
            if ($avaliacaoId <= 0) continue;

            if (!isset($avaliacaoCache[$avaliacaoId])) {
                $avaliacaoCache[$avaliacaoId] = $this->avaliacaoModel->findById($avaliacaoId);
            }
            $avaliacao = $avaliacaoCache[$avaliacaoId];
            if (!is_array($avaliacao)) continue;

            $avaliacaoIsRecuperacao = ((int) ($avaliacao['is_recuperacao'] ?? 0)) === 1;
            $avaliacaoCiclo = (int) ($avaliacao['ciclo'] ?? 1);
            if ($avaliacaoCiclo !== 1 && $avaliacaoCiclo !== 2) {
                $avaliacaoCiclo = 1;
            }
            $avaliacaoIsSimulado = ((int) ($avaliacao['is_simulado'] ?? 0)) === 1;

            $questionMeta = $this->extractQuestionMeta($avaliacao);
            $correcoes    = $this->decodeJsonArray($cor['correcoes_json'] ?? null);
            $alunoId      = (int) ($cor['aluno_id'] ?? 0);
            $aplicacao = trim((string) ($avaliacao['aplicacao'] ?? ''));
            $aplicacaoTs = $aplicacao !== '' ? strtotime($aplicacao) : false;
            $simuladoDisciplinas = [];
            $simuladoPontuacao = 0.0;
            $simuladoPontuacaoTotal = 0.0;
            $simuladoAcertos = 0;
            $simuladoTotalQuestoes = 0;

            foreach ($correcoes as $item) {
                if (!is_array($item)) continue;
                $qn = (int) ($item['questionNumber'] ?? 0);
                if ($qn <= 0) continue;

                $meta       = $questionMeta[$qn] ?? ['disciplina' => '', 'habilidade' => '', 'peso' => 1];
                $disciplina = $this->resolveDisciplinaLabel((string) ($meta['disciplina'] ?? ''));
                if ($disciplina === '') continue;
                if (isset($disciplinasDiversificadas[$this->normalizeSearch($disciplina)])) continue;

                $allDisciplinas[$disciplina] = true;
                $isCorrect = ($item['isCorrect'] ?? false) === true;
                $earnedPoints = $this->normalizeNullableFloat($item['pontuacao'] ?? null);
                $maxPoints = $this->normalizeNullableFloat($item['pontuacao_maxima'] ?? ($meta['peso'] ?? 1));
                if ($maxPoints === null || $maxPoints <= 0) {
                    $maxPoints = max(0.01, (float) ($meta['peso'] ?? 1));
                }
                if ($earnedPoints === null) {
                    $earnedPoints = $isCorrect ? $maxPoints : 0.0;
                }
                if ($earnedPoints < 0) {
                    $earnedPoints = 0.0;
                } elseif ($earnedPoints > $maxPoints) {
                    $earnedPoints = $maxPoints;
                }

                if (!$avaliacaoIsRecuperacao && $avaliacaoCiclo === 2 && $avaliacaoIsSimulado) {
                    $simuladoDisciplinas[$disciplina] = true;
                    $simuladoPontuacao += $earnedPoints;
                    $simuladoPontuacaoTotal += $maxPoints;
                    $simuladoTotalQuestoes++;
                    $simuladoAcertos += $isCorrect ? 1 : 0;
                }

                $key = $alunoId . '|' . $disciplina;
                if (!$avaliacaoIsRecuperacao) {
                    if ($avaliacaoCiclo === 2 && !$avaliacaoIsSimulado) {
                        if (!isset($perStudentDisciplineCycle2Grades[$key])) {
                            $perStudentDisciplineCycle2Grades[$key] = ['corretas' => 0, 'total' => 0];
                        }
                        $perStudentDisciplineCycle2Grades[$key]['total']++;
                        $perStudentDisciplineCycle2Grades[$key]['corretas'] += $isCorrect ? 1 : 0;
                    } elseif ($avaliacaoCiclo !== 2) {
                        if (!isset($perStudentDisciplineGrades[$key])) {
                            $perStudentDisciplineGrades[$key] = ['corretas' => 0, 'total' => 0];
                        }
                        $perStudentDisciplineGrades[$key]['total']++;
                        $perStudentDisciplineGrades[$key]['corretas'] += $isCorrect ? 1 : 0;
                    }

                    if (!isset($perStudentDisciplineSources[$key])) {
                        $perStudentDisciplineSources[$key] = [];
                    }
                    if (!isset($perStudentDisciplineSources[$key][$avaliacaoId])) {
                        $perStudentDisciplineSources[$key][$avaliacaoId] = [
                            'avaliacao_id'   => $avaliacaoId,
                            'avaliacao_nome' => trim((string) ($avaliacao['nome'] ?? 'Avaliação')),
                            'bimestre'       => (int) ($avaliacao['bimestre'] ?? 0),
                            'ciclo'          => $avaliacaoCiclo,
                            'is_simulado'    => $avaliacaoIsSimulado,
                            'ano_letivo'     => $aplicacaoTs !== false ? (int) date('Y', (int) $aplicacaoTs) : null,
                            'aplicacao'      => $aplicacao,
                            'corretas'       => 0,
                            'total'          => 0,
                            'pontuacao'      => 0.0,
                            'pontuacao_total'=> 0.0,
                            'is_adapted'     => true,
                            'adapted_grade'  => null,
                        ];
                    }
                    if (!($avaliacaoCiclo === 2 && $avaliacaoIsSimulado)) {
                        $adaptedGrade = $this->extractAdaptedGradeFromCorrectionItem($item, $earnedPoints, $maxPoints);
                        $perStudentDisciplineSources[$key][$avaliacaoId]['total']++;
                        $perStudentDisciplineSources[$key][$avaliacaoId]['corretas'] += $isCorrect ? 1 : 0;
                        $perStudentDisciplineSources[$key][$avaliacaoId]['pontuacao'] += $earnedPoints;
                        $perStudentDisciplineSources[$key][$avaliacaoId]['pontuacao_total'] += $maxPoints;
                        if ($adaptedGrade === null) {
                            $perStudentDisciplineSources[$key][$avaliacaoId]['is_adapted'] = false;
                        } elseif ($perStudentDisciplineSources[$key][$avaliacaoId]['adapted_grade'] === null) {
                            $perStudentDisciplineSources[$key][$avaliacaoId]['adapted_grade'] = $adaptedGrade;
                        } elseif (abs((float) $perStudentDisciplineSources[$key][$avaliacaoId]['adapted_grade'] - $adaptedGrade) > 0.02) {
                            $perStudentDisciplineSources[$key][$avaliacaoId]['is_adapted'] = false;
                            $perStudentDisciplineSources[$key][$avaliacaoId]['adapted_grade'] = null;
                        }
                    }
                } else {
                    if (!isset($perStudentDisciplineRecoverySources[$key])) {
                        $perStudentDisciplineRecoverySources[$key] = [];
                    }
                    if (!isset($perStudentDisciplineRecoverySources[$key][$avaliacaoId])) {
                        $perStudentDisciplineRecoverySources[$key][$avaliacaoId] = [
                            'avaliacao_id' => $avaliacaoId,
                            'bimestre' => (int) ($avaliacao['bimestre'] ?? 0),
                            'aplicacao' => $aplicacao,
                            'corretas' => 0,
                            'total' => 0,
                            'pontuacao' => 0.0,
                            'pontuacao_total' => 0.0,
                        ];
                    }
                    $perStudentDisciplineRecoverySources[$key][$avaliacaoId]['total']++;
                    $perStudentDisciplineRecoverySources[$key][$avaliacaoId]['corretas'] += $isCorrect ? 1 : 0;
                    $perStudentDisciplineRecoverySources[$key][$avaliacaoId]['pontuacao'] += $earnedPoints;
                    $perStudentDisciplineRecoverySources[$key][$avaliacaoId]['pontuacao_total'] += $maxPoints;
                }

                $dKey = $avaliacaoId . '|' . $qn;
                if (!isset($diagnosticoMap[$dKey])) {
                    $diagnosticoMap[$dKey] = [
                        'avaliacao_id'   => $avaliacaoId,
                        'avaliacao_nome' => trim((string) ($avaliacao['nome'] ?? '')),
                        'bimestre'       => (int) ($avaliacao['bimestre'] ?? 0),
                        'questao'        => $qn,
                        'disciplina'     => $disciplina,
                        'habilidade'     => $this->normalizeLabel((string) ($meta['habilidade'] ?? '')),
                        'corretas'       => 0,
                        'total'          => 0,
                        'pontuacao'      => 0.0,
                        'pontuacao_total'=> 0.0,
                    ];
                }
                $diagnosticoMap[$dKey]['total']++;
                $diagnosticoMap[$dKey]['corretas'] += $isCorrect ? 1 : 0;
                $diagnosticoMap[$dKey]['pontuacao'] += $earnedPoints;
                $diagnosticoMap[$dKey]['pontuacao_total'] += $maxPoints;
            }

            if (!$avaliacaoIsRecuperacao && $avaliacaoCiclo === 2 && $avaliacaoIsSimulado && $simuladoDisciplinas !== []) {
                foreach (array_keys($simuladoDisciplinas) as $disciplinaSimulado) {
                    $gradeKey = $alunoId . '|' . $disciplinaSimulado;

                    if (!isset($perStudentDisciplineSimuladoGrades[$gradeKey])) {
                        $perStudentDisciplineSimuladoGrades[$gradeKey] = ['corretas' => 0, 'total' => 0];
                    }
                    $perStudentDisciplineSimuladoGrades[$gradeKey]['corretas'] += $simuladoPontuacao;
                    $perStudentDisciplineSimuladoGrades[$gradeKey]['total'] += $simuladoPontuacaoTotal;

                    if (!isset($perStudentDisciplineSources[$gradeKey])) {
                        $perStudentDisciplineSources[$gradeKey] = [];
                    }
                    $perStudentDisciplineSources[$gradeKey][$avaliacaoId] = [
                        'avaliacao_id'   => $avaliacaoId,
                        'avaliacao_nome' => trim((string) ($avaliacao['nome'] ?? 'Avaliação')),
                        'bimestre'       => (int) ($avaliacao['bimestre'] ?? 0),
                        'ciclo'          => $avaliacaoCiclo,
                        'is_simulado'    => true,
                        'ano_letivo'     => $aplicacaoTs !== false ? (int) date('Y', (int) $aplicacaoTs) : null,
                        'aplicacao'      => $aplicacao,
                        'corretas'       => $simuladoAcertos,
                        'total'          => $simuladoTotalQuestoes,
                        'pontuacao'      => $simuladoPontuacao,
                        'pontuacao_total'=> $simuladoPontuacaoTotal,
                        'is_adapted'     => false,
                        'adapted_grade'  => null,
                    ];
                }
            }
        }

        $disciplinasList = array_values(array_filter(array_map(function ($disciplina): string {
            return $this->normalizeLabel((string) $disciplina);
        }, array_keys($allDisciplinas)), static function (string $disciplina): bool {
            return $disciplina !== '';
        }));
        sort($disciplinasList, SORT_LOCALE_STRING);
        foreach ($dbDisciplinas as $d) {
            $nome = $this->resolveDisciplinaLabel((string) ($d['nome'] ?? ''));
            if ($nome === '') {
                continue;
            }
            if (isset($disciplinasDiversificadas[$this->normalizeSearch($nome)])) {
                continue;
            }
            if ($nome !== '' && !in_array($nome, $disciplinasList, true)) {
                $disciplinasList[] = $nome;
            }
        }
        sort($disciplinasList, SORT_LOCALE_STRING);

        $boletim = [];
        $entries = [];
        $faixas  = ['critico' => 0, 'insuficiente' => 0, 'adequado' => 0, 'avancado' => 0];
        $somaMediaGeral  = 0.0;
        $countMediaGeral = 0;
        $painelDisciplinas = [];

        foreach ($alunos as $aluno) {
            $aId = (int) ($aluno['id'] ?? 0);
            if ($aId <= 0) continue;

            $payload      = $this->decodePayload((string) ($aluno['desempenho'] ?? ''));
            $records      = is_array($payload['records'] ?? null) ? $payload['records'] : [];
            $notasManuais = is_array($payload['notas_manuais'] ?? null) ? $payload['notas_manuais'] : [];
            $notasManuais = $this->mergeManualGradesFromRecords($notasManuais, $records);

            $studentDiscs = [];
            $somaNotas    = 0.0;
            $countNotas   = 0;

            foreach ($disciplinasList as $disciplinaItem) {
                $disc = $this->normalizeLabel((string) $disciplinaItem);
                if ($disc === '') {
                    continue;
                }

                $gradeKey = $aId . '|' . $disc;
                $avaliacaoFontes = [];
                if (isset($perStudentDisciplineSources[$gradeKey]) && is_array($perStudentDisciplineSources[$gradeKey])) {
                    foreach ($perStudentDisciplineSources[$gradeKey] as $src) {
                        if (!is_array($src)) {
                            continue;
                        }

                        $srcTotal = (int) ($src['total'] ?? 0);
                        $srcCorretas = (int) ($src['corretas'] ?? 0);
                        $srcPontuacao = $this->normalizeNullableFloat($src['pontuacao'] ?? null);
                        $srcPontuacaoTotal = $this->normalizeNullableFloat($src['pontuacao_total'] ?? null);
                        if ($srcPontuacao === null) {
                            $srcPontuacao = (float) $srcCorretas;
                        }
                        if ($srcPontuacaoTotal === null || $srcPontuacaoTotal <= 0) {
                            $srcPontuacaoTotal = (float) $srcTotal;
                        }
                        $srcPercentual = $srcPontuacaoTotal > 0 ? round(($srcPontuacao / $srcPontuacaoTotal) * 100, 2) : null;
                        $srcNota = $srcPontuacaoTotal > 0 ? round(($srcPontuacao / $srcPontuacaoTotal) * 10, 2) : null;

                        $avaliacaoFontes[] = [
                            'avaliacao_id'   => (int) ($src['avaliacao_id'] ?? 0),
                            'avaliacao_nome' => trim((string) ($src['avaliacao_nome'] ?? 'Avaliação')),
                            'bimestre'       => (int) ($src['bimestre'] ?? 0),
                            'ciclo'          => (int) ($src['ciclo'] ?? 1),
                            'is_simulado'    => ((int) ($src['is_simulado'] ?? 0)) === 1,
                            'ano_letivo'     => isset($src['ano_letivo']) && $src['ano_letivo'] !== null ? (int) $src['ano_letivo'] : null,
                            'aplicacao'      => trim((string) ($src['aplicacao'] ?? '')),
                            'corretas'       => $srcCorretas,
                            'total'          => $srcTotal,
                            'pontuacao'      => $srcPontuacao,
                            'pontuacao_total'=> $srcPontuacaoTotal,
                            'percentual'     => $srcPercentual,
                            'nota'           => $srcNota,
                            'is_adapted'     => (($src['is_adapted'] ?? false) === true) && $srcTotal > 0,
                            'adapted_grade'  => (($src['is_adapted'] ?? false) === true)
                                ? $this->normalizeNullableFloat($src['adapted_grade'] ?? null)
                                : null,
                        ];
                    }
                }

                usort($avaliacaoFontes, static function (array $a, array $b): int {
                    $aData = trim((string) ($a['aplicacao'] ?? ''));
                    $bData = trim((string) ($b['aplicacao'] ?? ''));
                    if ($aData !== $bData) {
                        return strcmp($aData, $bData);
                    }
                    return ((int) ($a['avaliacao_id'] ?? 0)) <=> ((int) ($b['avaliacao_id'] ?? 0));
                });

                $disciplinaEhPortugues = $this->isDisciplinaLinguaPortuguesa($disc);
                $studentDiscs[$disc] = $this->buildDashboardDisciplineSnapshot(
                    $aId,
                    $disc,
                    $singleAno,
                    $selectedBimestres,
                    $disciplinaEhPortugues,
                    $notasManuais,
                    $records,
                    $avaliacaoFontes,
                    $perStudentDisciplineRecoverySources[$gradeKey] ?? []
                );
                $studentDiscs[$disc]['avaliacao_fontes'] = $avaliacaoFontes;

                $notaFinal = $studentDiscs[$disc]['nota_final'];
                $proficiencia = $studentDiscs[$disc]['proficiencia'];

                if ($notaFinal !== null) {
                    $somaNotas += $notaFinal;
                    $countNotas++;

                    if (!isset($painelDisciplinas[$disc])) {
                        $painelDisciplinas[$disc] = [
                            'disciplina' => $disc,
                            'soma' => 0.0,
                            'avaliados' => 0,
                            'avancado' => 0,
                            'adequado_ou_acima' => 0,
                            'insuficiente' => 0,
                        ];
                    }
                    $painelDisciplinas[$disc]['soma'] += $notaFinal;
                    $painelDisciplinas[$disc]['avaliados']++;
                    if ($notaFinal >= self::FAIXA_AVANCADO) {
                        $painelDisciplinas[$disc]['avancado']++;
                    }
                    if ($notaFinal >= self::FAIXA_ADEQUADO) {
                        $painelDisciplinas[$disc]['adequado_ou_acima']++;
                    }
                    if ($notaFinal < self::FAIXA_INSUFICIENTE) {
                        $painelDisciplinas[$disc]['insuficiente']++;
                    }
                }
            }

            $mediaGeral        = $countNotas > 0 ? round($somaNotas / $countNotas, 2) : null;
            $proficienciaGeral = $this->classificarProficiencia($mediaGeral);

            if ($mediaGeral !== null) {
                $somaMediaGeral += $mediaGeral;
                $countMediaGeral++;
                $faixas[$this->faixaKey($mediaGeral)]++;
            }

            $boletim[] = [
                'aluno_id'           => $aId,
                'aluno_nome'         => trim((string) ($aluno['nome'] ?? '')),
                'turma_id'           => (int) ($aluno['turma_id'] ?? 0),
                'turma_nome'         => trim((string) ($aluno['turma'] ?? '')),
                'disciplinas'        => $studentDiscs,
                'media_geral'        => $mediaGeral,
                'proficiencia_geral' => $proficienciaGeral,
            ];

            foreach ($records as $record) {
                if (!is_array($record)) continue;

                $recordAno = (int) ($record['ano_letivo'] ?? 0);
                $recordBimestre = (int) ($record['bimestre'] ?? 0);
                $recordCategoria = trim((string) ($record['categoria'] ?? ''));

                if (!empty($anosLetivos) && !in_array($recordAno, $anosLetivos, true)) {
                    continue;
                }
                if (!empty($bimestres) && !in_array($recordBimestre, $bimestres, true)) {
                    continue;
                }
                if ($categoriaFiltro !== '' && $categoriaFiltro !== $recordCategoria) {
                    continue;
                }

                $record['aluno_id'] = (int) ($record['aluno_id'] ?? $aId);
                $record['aluno_nome'] = trim((string) ($record['aluno_nome'] ?? ($aluno['nome'] ?? '')));
                $record['turma_id'] = (int) ($record['turma_id'] ?? ($aluno['turma_id'] ?? 0));
                $record['turma_nome'] = trim((string) ($record['turma_nome'] ?? ($aluno['turma'] ?? '')));
                $record['entry_type'] = trim((string) ($record['entry_type'] ?? 'manual'));
                $record['editable'] = ($record['entry_type'] === 'manual');

                $entries[] = $record;
            }
        }

        $totalAlunos    = count($alunos);
        $totalAvaliados = $countMediaGeral;
        $participacao   = $totalAlunos > 0 ? round(($totalAvaliados / $totalAlunos) * 100, 1) : 0;
        $mediaGlobal    = $countMediaGeral > 0 ? round($somaMediaGeral / $countMediaGeral, 2) : null;

        $diagnostico = $this->buildDiagnosticoFromMap($diagnosticoMap);
        $painelGrafico = $this->buildPainelGrafico($painelDisciplinas, $boletim);
        $entries = $this->sortRecords($entries);

        $turmas = $this->turmaModel->getAllOrdered();
        $turmasOptions = [];
        foreach ($turmas as $t) {
            if (!is_array($t)) continue;
            $tId = (int) ($t['id'] ?? 0);
            if ($tId <= 0) continue;
            $turmasOptions[] = ['id' => $tId, 'nome' => trim((string) ($t['nome'] ?? ''))];
        }

        return [
            'overview' => [
                'total_alunos'    => $totalAlunos,
                'total_avaliados' => $totalAvaliados,
                'participacao'    => $participacao,
                'media_geral'     => $mediaGlobal,
                'faixas'          => $faixas,
            ],
            'disciplinas' => $disciplinasList,
            'boletim'     => $boletim,
            'diagnostico' => $diagnostico,
            'painel_grafico' => $painelGrafico,
            'entries' => $entries,
            'turmas'      => $turmasOptions,
        ];
    }

    private function buildPainelGrafico(array $painelDisciplinas, array $boletim): array
    {
        $disciplinas = [];
        foreach ($painelDisciplinas as $item) {
            $avaliados = (int) ($item['avaliados'] ?? 0);
            if ($avaliados <= 0) {
                continue;
            }

            $media = round(((float) ($item['soma'] ?? 0)) / $avaliados, 2);
            $adequadoOuAcima = (int) ($item['adequado_ou_acima'] ?? 0);

            $disciplinas[] = [
                'disciplina' => (string) ($item['disciplina'] ?? ''),
                'media' => $media,
                'avaliados' => $avaliados,
                'avancado' => (int) ($item['avancado'] ?? 0),
                'insuficiente' => (int) ($item['insuficiente'] ?? 0),
                'adequado_ou_acima_pct' => round(($adequadoOuAcima / $avaliados) * 100, 1),
            ];
        }

        usort($disciplinas, static function (array $a, array $b): int {
            return ($b['media'] <=> $a['media']);
        });

        $ranking = array_values(array_filter(array_map(static function (array $item): array {
            return [
                'aluno_id' => (int) ($item['aluno_id'] ?? 0),
                'aluno_nome' => trim((string) ($item['aluno_nome'] ?? '')),
                'turma_nome' => trim((string) ($item['turma_nome'] ?? '')),
                'media_geral' => $item['media_geral'] ?? null,
                'proficiencia_geral' => $item['proficiencia_geral'] ?? null,
            ];
        }, $boletim), static function (array $item): bool {
            return $item['media_geral'] !== null;
        }));

        usort($ranking, static function (array $a, array $b): int {
            return (($b['media_geral'] ?? -1) <=> ($a['media_geral'] ?? -1));
        });

        return [
            'disciplinas' => $disciplinas,
            'ranking_top' => array_slice($ranking, 0, 10),
            'ranking_alerta' => array_slice(array_reverse($ranking), 0, 10),
        ];
    }

    /* ====================================================================
     *  SALVAR NOTA MANUAL (inline no boletim)
     * ==================================================================== */

    public function saveNotaManual(
        int $alunoId,
        string $disciplina,
        int $bimestre,
        int $anoLetivo,
        string $componente,
        ?float $valor
    ): array {
        if ($alunoId <= 0) {
            throw new InvalidArgumentException('Aluno inválido.');
        }

        $disciplina = $this->normalizeLabel($disciplina);
        if ($disciplina === '') {
            throw new InvalidArgumentException('Disciplina inválida.');
        }

        if ($bimestre < 1 || $bimestre > 4) {
            throw new InvalidArgumentException('Bimestre inválido.');
        }

        if ($anoLetivo < 2000 || $anoLetivo > 2100) {
            throw new InvalidArgumentException('Ano letivo inválido.');
        }

        $componentesValidos = ['subjetiva', 'prod_textual', 'recuperacao'];
        if (!in_array($componente, $componentesValidos, true)) {
            throw new InvalidArgumentException('Componente inválido. Use: subjetiva, prod_textual ou recuperacao.');
        }

        if ($componente === 'prod_textual' && !$this->isDisciplinaLinguaPortuguesa($disciplina)) {
            throw new InvalidArgumentException('Produção textual é permitida apenas na disciplina Língua Portuguesa.');
        }

        if ($valor !== null && ($valor < 0 || $valor > 10)) {
            throw new InvalidArgumentException('A nota deve estar entre 0 e 10.');
        }

        $aluno = $this->alunoModel->findById($alunoId);
        if (!is_array($aluno)) {
            throw new RuntimeException('Aluno não encontrado.');
        }

        $payload      = $this->decodePayload((string) ($aluno['desempenho'] ?? ''));
        $notasManuais = is_array($payload['notas_manuais'] ?? null) ? $payload['notas_manuais'] : [];

        $yearKey = (string) $anoLetivo;
        $bimKey  = (string) $bimestre;

        if (!isset($notasManuais[$yearKey])) {
            $notasManuais[$yearKey] = [];
        }
        if (!isset($notasManuais[$yearKey][$bimKey])) {
            $notasManuais[$yearKey][$bimKey] = [];
        }
        if (!isset($notasManuais[$yearKey][$bimKey][$disciplina])) {
            $notasManuais[$yearKey][$bimKey][$disciplina] = [
                'subjetiva'    => null,
                'prod_textual' => null,
                'recuperacao'  => null,
            ];
        }

        $notasManuais[$yearKey][$bimKey][$disciplina][$componente] = $valor !== null ? round($valor, 2) : null;

        $payload['notas_manuais'] = $notasManuais;
        $payload['updated_at']    = date('Y-m-d H:i:s');
        $this->persistPayload($alunoId, $payload);

        return $notasManuais[$yearKey][$bimKey][$disciplina];
    }

    /* ====================================================================
     *  SYNC AUTOMÁTICO (chamado pelo AdminController ao salvar correção)
     * ==================================================================== */

    public function syncAutomaticRecord(array $avaliacao, array $correcao): void
    {
        $alunoId = (int) ($correcao['aluno_id'] ?? 0);
        if ($alunoId <= 0) return;

        $aluno = $this->alunoModel->findById($alunoId);
        if (!is_array($aluno)) return;

        $record  = $this->buildAutomaticRecord($avaliacao, $correcao, $aluno);
        $payload = $this->decodePayload((string) ($aluno['desempenho'] ?? ''));
        $records = is_array($payload['records'] ?? null) ? $payload['records'] : [];

        $idx = $this->findRecordIndexBySourceKey($records, $record['source_key']);
        if ($idx >= 0) {
            $record['created_at'] = (string) ($records[$idx]['created_at'] ?? $record['created_at']);
            $records[$idx] = $record;
        } else {
            $records[] = $record;
        }

        $payload['records']    = $this->sortRecords($records);
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $this->persistPayload($alunoId, $payload);
    }

    public function removeAutomaticRecordBySource(int $alunoId, int $avaliacaoId, int $turmaId): void
    {
        if ($alunoId <= 0 || $avaliacaoId <= 0) return;

        $aluno = $this->alunoModel->findById($alunoId);
        if (!is_array($aluno)) return;

        $sourceKey = $this->buildAutomaticSourceKey($alunoId, $avaliacaoId, $turmaId);
        $payload   = $this->decodePayload((string) ($aluno['desempenho'] ?? ''));
        $records   = is_array($payload['records'] ?? null) ? $payload['records'] : [];
        $idx       = $this->findRecordIndexBySourceKey($records, $sourceKey);
        if ($idx < 0) return;

        array_splice($records, $idx, 1);
        $payload['records']    = $this->sortRecords($records);
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $this->persistPayload($alunoId, $payload);
    }

    /* ====================================================================
     *  OPÇÕES DE CATEGORIA
     * ==================================================================== */

    public function getManualCategoryOptions(): array
    {
        $result = [];
        foreach ($this->getManualCategoryMap() as $value => $label) {
            $result[] = ['value' => $value, 'label' => $label];
        }
        return $result;
    }

    /* ====================================================================
     *  LANÇAMENTO MANUAL COMPLETO (modal – compatibilidade)
     * ==================================================================== */

    public function saveManualRecord(array $payload): array
    {
        $alunoId = (int) ($payload['aluno_id'] ?? 0);
        if ($alunoId <= 0) throw new InvalidArgumentException('Aluno inválido.');

        $aluno = $this->alunoModel->findById($alunoId);
        if (!is_array($aluno)) throw new RuntimeException('Aluno não encontrado.');

        $recordId       = trim((string) ($payload['id'] ?? ''));
        $categoria      = $this->normalizeCategory((string) ($payload['categoria'] ?? ''));
        $titulo         = trim((string) ($payload['titulo'] ?? ''));
        $disciplina     = $this->normalizeLabel((string) ($payload['disciplina'] ?? ''));
        $observacoes    = trim((string) ($payload['observacoes'] ?? ''));
        $anoLetivo      = (int) ($payload['ano_letivo'] ?? 0);
        $bimestre       = (int) ($payload['bimestre'] ?? 0);
        $nota           = $this->normalizeNullableFloat($payload['nota'] ?? null);
        $notaMaxima     = $this->normalizeNullableFloat($payload['nota_maxima'] ?? null);
        $dataReferencia = $this->normalizeNullableDate((string) ($payload['data_referencia'] ?? ''));
        $turmaId        = (int) ($payload['turma_id'] ?? 0);
        $ciclo          = (int) ($payload['ciclo'] ?? 0);

        if ($titulo === '') throw new InvalidArgumentException('Informe um título.');
        if ($disciplina === '') throw new InvalidArgumentException('Selecione uma disciplina.');
        if ($anoLetivo < 2000 || $anoLetivo > 2100) throw new InvalidArgumentException('Ano letivo inválido.');
        if ($bimestre < 1 || $bimestre > 4) throw new InvalidArgumentException('Bimestre inválido.');
        if ($categoria === 'producao_textual' && !$this->isDisciplinaLinguaPortuguesa($disciplina)) {
            throw new InvalidArgumentException('Produção textual é permitida apenas na disciplina Língua Portuguesa.');
        }
        if ($categoria === 'avaliacao_subjetiva' && $ciclo !== 1 && $ciclo !== 2) {
            throw new InvalidArgumentException('Selecione o ciclo da Avaliação Subjetiva (1º ou 2º).');
        }
        if ($categoria !== 'avaliacao_subjetiva') {
            $ciclo = 0;
        }
        if ($nota !== null && $notaMaxima !== null && $nota > $notaMaxima) {
            throw new InvalidArgumentException('A nota não pode ser maior que a nota máxima.');
        }
        if ($dataReferencia === null) $dataReferencia = date('Y-m-d');

        $turmaNome = trim((string) ($aluno['turma'] ?? ''));
        if ($turmaId > 0) {
            $turma = $this->turmaModel->findById($turmaId);
            if (is_array($turma)) $turmaNome = trim((string) ($turma['nome'] ?? $turmaNome));
        } else {
            $turmaId = (int) ($aluno['turma_id'] ?? 0);
        }

        $habilidadesAlcancadas = $this->parseListField($payload['habilidades_alcancadas'] ?? []);
        $habilidadesAvaliadas  = $this->parseListField($payload['habilidades_avaliadas'] ?? $habilidadesAlcancadas);
        $categoriaMap   = $this->getManualCategoryMap();
        $categoriaLabel = $categoriaMap[$categoria] ?? 'Outro lançamento';
        $percentual     = ($nota !== null && $notaMaxima !== null && $notaMaxima > 0)
            ? round(($nota / $notaMaxima) * 100, 2) : null;

        $data    = $this->decodePayload((string) ($aluno['desempenho'] ?? ''));
        $records = is_array($data['records'] ?? null) ? $data['records'] : [];
        $rIdx    = $this->findRecordIndexById($records, $recordId);

        if ($nota !== null) {
            $existingTotal = 0.0;
            foreach ($records as $existingRecord) {
                if (!is_array($existingRecord)) {
                    continue;
                }

                $existingId = trim((string) ($existingRecord['id'] ?? ''));
                if ($recordId !== '' && $existingId !== '' && $existingId === $recordId) {
                    continue;
                }

                if (!$this->isSameManualGradeGroup($existingRecord, $categoria, $ciclo, $anoLetivo, $bimestre, $disciplina)) {
                    continue;
                }

                $existingNota = $this->normalizeNullableFloat($existingRecord['nota'] ?? null);
                if ($existingNota === null) {
                    continue;
                }

                $existingTotal += $existingNota;
            }

            $remaining = round(10 - $existingTotal, 2);
            if ($remaining < 0) {
                $remaining = 0.0;
            }

            if ($nota > $remaining) {
                $remainingLabel = number_format($remaining, 1, ',', '.');
                throw new InvalidArgumentException('A soma de notas deste tipo não pode ultrapassar 10,0. Restante disponível: ' . $remainingLabel . '.');
            }
        }

        $now    = date('Y-m-d H:i:s');
        $record = [
            'id'                      => $recordId !== '' ? $recordId : ('manual-' . bin2hex(random_bytes(8))),
            'entry_type'              => 'manual',
            'source_key'              => $recordId !== '' ? $recordId : null,
            'categoria'               => $categoria,
            'categoria_label'         => $categoriaLabel,
            'ciclo'                   => $ciclo > 0 ? $ciclo : null,
            'titulo'                  => $titulo,
            'descricao'               => trim((string) ($payload['descricao'] ?? '')),
            'disciplina'              => $disciplina,
            'aluno_id'                => $alunoId,
            'aluno_nome'              => trim((string) ($aluno['nome'] ?? '')),
            'turma_id'                => $turmaId,
            'turma_nome'              => $turmaNome,
            'ano_letivo'              => $anoLetivo,
            'bimestre'                => $bimestre,
            'data_referencia'         => $dataReferencia,
            'nota'                    => $nota,
            'nota_maxima'             => $notaMaxima,
            'percentual'              => $percentual,
            'habilidades_alcancadas'  => $habilidadesAlcancadas,
            'habilidades_avaliadas'   => $habilidadesAvaliadas,
            'observacoes'             => $observacoes,
            'editable'                => true,
            'created_at'              => $rIdx >= 0 ? (string) ($records[$rIdx]['created_at'] ?? $now) : $now,
            'updated_at'              => $now,
        ];

        if ($rIdx >= 0) { $records[$rIdx] = $record; } else { $records[] = $record; }

        $data['records']    = $this->sortRecords($records);
        $data['updated_at'] = $now;
        $this->persistPayload($alunoId, $data);

        return $record;
    }

    private function isSameManualGradeGroup(array $record, string $categoria, int $ciclo, int $anoLetivo, int $bimestre, string $disciplina): bool
    {
        $entryType = strtolower(trim((string) ($record['entry_type'] ?? 'manual')));
        if ($entryType !== 'manual') {
            return false;
        }

        $recordAno = (int) ($record['ano_letivo'] ?? 0);
        $recordBimestre = (int) ($record['bimestre'] ?? 0);
        if ($recordAno !== $anoLetivo || $recordBimestre !== $bimestre) {
            return false;
        }

        $recordDisciplina = $this->normalizeLabel((string) ($record['disciplina'] ?? ''));
        if ($this->normalizeSearch($recordDisciplina) !== $this->normalizeSearch($disciplina)) {
            return false;
        }

        $recordCategoria = $this->normalizeCategory((string) ($record['categoria'] ?? ''));
        if ($recordCategoria !== $categoria) {
            return false;
        }

        if ($categoria === 'avaliacao_subjetiva') {
            $recordCiclo = (int) ($record['ciclo'] ?? 0);
            if ($recordCiclo !== $ciclo) {
                return false;
            }
        }

        return true;
    }

    public function deleteManualRecord(int $alunoId, string $recordId): bool
    {
        if ($alunoId <= 0 || trim($recordId) === '') return false;

        $aluno = $this->alunoModel->findById($alunoId);
        if (!is_array($aluno)) return false;

        $payload = $this->decodePayload((string) ($aluno['desempenho'] ?? ''));
        $records = is_array($payload['records'] ?? null) ? $payload['records'] : [];
        $idx     = $this->findRecordIndexById($records, $recordId);
        if ($idx < 0) return false;
        if (strtolower((string) ($records[$idx]['entry_type'] ?? '')) !== 'manual') return false;

        array_splice($records, $idx, 1);
        $payload['records']    = $this->sortRecords($records);
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $this->persistPayload($alunoId, $payload);
        return true;
    }

    /* ====================================================================
     *  CÁLCULOS
     * ==================================================================== */

    private function computePrimeiroCiclo(?float $subjetiva, ?float $avaliacaoCiclo1, ?float $prodTextual, bool $usaProducaoTextual): ?float
    {
        if ($usaProducaoTextual) {
            if ($subjetiva === null && $avaliacaoCiclo1 === null && $prodTextual === null) return null;

            return round(
                self::PESO_SUBJETIVA   * ($subjetiva ?? 0)
              + self::PESO_AVALIACAO   * ($avaliacaoCiclo1 ?? 0)
              + self::PESO_PROD_TEXTUAL * ($prodTextual ?? 0),
                2
            );
        }

        if ($subjetiva === null && $avaliacaoCiclo1 === null) return null;

        return round(
            0.5 * ($subjetiva ?? 0)
          + 0.5 * ($avaliacaoCiclo1 ?? 0),
            2
        );
    }

    private function computeSegundoCiclo(?float $subjetiva, ?float $avaliacaoCiclo2, ?float $simulado): ?float
    {
        if ($subjetiva === null && $avaliacaoCiclo2 === null && $simulado === null) {
            return null;
        }

        return round(
            0.5 * ($subjetiva ?? 0)
          + 0.3 * ($avaliacaoCiclo2 ?? 0)
          + 0.2 * ($simulado ?? 0),
            2
        );
    }

    private function computeMediaCiclos(?float $ciclo1, ?float $ciclo2): ?float
    {
        if ($ciclo1 === null && $ciclo2 === null) {
            return null;
        }

        if ($ciclo1 !== null && $ciclo2 !== null) {
            return round(($ciclo1 + $ciclo2) / 2, 2);
        }

        return round(($ciclo1 ?? $ciclo2 ?? 0), 2);
    }

    private function computeNotaBimestral(?float $mediaCiclos, ?float $recuperacao): ?float
    {
        if ($mediaCiclos === null) {
            return null;
        }

        if ($recuperacao === null) {
            return $mediaCiclos;
        }

        return round(($mediaCiclos + $recuperacao) / 2, 2);
    }

    private function buildDashboardDisciplineSnapshot(
        int $alunoId,
        string $disciplina,
        int $anoLetivo,
        array $selectedBimestres,
        bool $disciplinaEhPortugues,
        array $notasManuais,
        array $records,
        array $avaliacaoFontes,
        array $recoverySources
    ): array {
        $bimestres = [];
        foreach ($selectedBimestres as $bimestre) {
            $bimestre = (int) $bimestre;
            if ($bimestre >= 1 && $bimestre <= 4) {
                $bimestres[] = $bimestre;
            }
        }

        if ($bimestres === []) {
            $bimestres = [1, 2, 3, 4];
        }

        $snapshots = [];
        foreach ($bimestres as $bimestre) {
            $snapshots[] = $this->buildDashboardDisciplineSnapshotForBimestre(
                $alunoId,
                $disciplina,
                $anoLetivo,
                $bimestre,
                $disciplinaEhPortugues,
                $notasManuais,
                $records,
                $avaliacaoFontes,
                $recoverySources
            );
        }

        if (count($snapshots) === 1) {
            return $snapshots[0];
        }

        return $this->averageDashboardDisciplineSnapshots($snapshots, count($bimestres));
    }

    private function buildDashboardDisciplineSnapshotForBimestre(
        int $alunoId,
        string $disciplina,
        int $anoLetivo,
        int $bimestre,
        bool $disciplinaEhPortugues,
        array $notasManuais,
        array $records,
        array $avaliacaoFontes,
        array $recoverySources
    ): array {
        $manual = $this->getManualDisciplineGrade($notasManuais, $anoLetivo, $bimestre, $disciplina);
        $subjetivaCiclo1 = $manual['subjetiva_ciclo_1'] ?? $manual['subjetiva'];
        $subjetivaCiclo2 = $manual['subjetiva_ciclo_2'];
        $prodTextual = $disciplinaEhPortugues ? $manual['prod_textual'] : null;
        $avaliacaoCiclo1 = $this->extractGradeFromSources($avaliacaoFontes, $bimestre, 1, false);
        $avaliacaoCiclo2 = $this->extractGradeFromSources($avaliacaoFontes, $bimestre, 2, false);
        $simulado = $this->extractGradeFromSources($avaliacaoFontes, $bimestre, 2, true);
        $recuperacaoAuto = $this->extractLatestRecoveryGrade($recoverySources, $bimestre);
        $recuperacaoManual = $this->sumManualRecoveryFromRecords($records, $anoLetivo, $bimestre, $disciplina);
        $recuperacao = $recuperacaoManual !== null
            ? $recuperacaoManual
            : ($manual['recuperacao'] !== null ? $manual['recuperacao'] : $recuperacaoAuto);

        $ciclo1 = $this->computePrimeiroCiclo($subjetivaCiclo1, $avaliacaoCiclo1, $prodTextual, $disciplinaEhPortugues);
        $ciclo2 = $this->computeSegundoCiclo($subjetivaCiclo2, $avaliacaoCiclo2, $simulado);
        $media = $this->computeMediaCiclos($ciclo1, $ciclo2);
        $notaFinal = $this->computeNotaBimestral($media, $recuperacao);

        return [
            'aluno_id' => $alunoId,
            'bimestre' => $bimestre,
            'avaliacao' => $avaliacaoCiclo1,
            'avaliacao_ciclo_1' => $avaliacaoCiclo1,
            'avaliacao_ciclo_2' => $avaliacaoCiclo2,
            'simulado' => $simulado,
            'subjetiva' => $subjetivaCiclo1,
            'subjetiva_ciclo_1' => $subjetivaCiclo1,
            'subjetiva_ciclo_2' => $subjetivaCiclo2,
            'prod_textual' => $prodTextual,
            'ciclo_1' => $ciclo1,
            'ciclo_2' => $ciclo2,
            'media' => $media,
            'recuperacao' => $recuperacao,
            'nota_final' => $notaFinal,
            'proficiencia' => $this->classificarProficiencia($notaFinal),
        ];
    }

    private function averageDashboardDisciplineSnapshots(array $snapshots, int $divisor): array
    {
        $fields = [
            'avaliacao',
            'avaliacao_ciclo_1',
            'avaliacao_ciclo_2',
            'simulado',
            'subjetiva',
            'subjetiva_ciclo_1',
            'subjetiva_ciclo_2',
            'prod_textual',
            'ciclo_1',
            'ciclo_2',
            'media',
            'recuperacao',
            'nota_final',
        ];

        $result = [];
        foreach ($fields as $field) {
            $result[$field] = $this->averageSnapshotField($snapshots, $field, $divisor);
        }

        $result['proficiencia'] = $this->classificarProficiencia($result['nota_final']);

        return $result;
    }

    private function averageSnapshotField(array $snapshots, string $field, int $divisor): ?float
    {
        if ($divisor <= 0 || $snapshots === []) {
            return null;
        }

        $sum = 0.0;
        $hasValue = false;

        foreach ($snapshots as $snapshot) {
            if (!is_array($snapshot)) {
                continue;
            }

            $value = $snapshot[$field] ?? null;
            if ($value === null || $value === '') {
                continue;
            }

            $sum += (float) $value;
            $hasValue = true;
        }

        if (!$hasValue) {
            return null;
        }

        return round($sum / $divisor, 2);
    }

    private function extractGradeFromSources(array $sources, int $bimestre, int $ciclo, bool $isSimulado): ?float
    {
        $corretas = 0;
        $total = 0;

        foreach ($sources as $source) {
            if (!is_array($source)) {
                continue;
            }

            if ((int) ($source['bimestre'] ?? 0) !== $bimestre) {
                continue;
            }
            if ((int) ($source['ciclo'] ?? 0) !== $ciclo) {
                continue;
            }
            if (((bool) ($source['is_simulado'] ?? false)) !== $isSimulado) {
                continue;
            }

            $sourcePontuacao = $this->normalizeNullableFloat($source['pontuacao'] ?? null);
            $sourcePontuacaoTotal = $this->normalizeNullableFloat($source['pontuacao_total'] ?? null);
            if ($sourcePontuacao !== null && $sourcePontuacaoTotal !== null && $sourcePontuacaoTotal > 0) {
                $corretas += $sourcePontuacao;
                $total += $sourcePontuacaoTotal;
                continue;
            }

            $corretas += (int) ($source['corretas'] ?? 0);
            $total += (int) ($source['total'] ?? 0);
        }

        if ($total <= 0) {
            return null;
        }

        return round(($corretas / $total) * 10, 2);
    }

    private function classificarProficiencia(?float $nota): ?string
    {
        if ($nota === null) return null;
        if ($nota >= self::FAIXA_AVANCADO) return 'Avançado';
        if ($nota >= self::FAIXA_ADEQUADO) return 'Adequado';
        if ($nota >= self::FAIXA_INSUFICIENTE) return 'Insuficiente';
        return 'Crítico';
    }

    private function faixaKey(float $nota): string
    {
        if ($nota >= self::FAIXA_AVANCADO) return 'avancado';
        if ($nota >= self::FAIXA_ADEQUADO) return 'adequado';
        if ($nota >= self::FAIXA_INSUFICIENTE) return 'insuficiente';
        return 'critico';
    }

    /* ====================================================================
     *  HELPERS — carregamento de dados
     * ==================================================================== */

    private function loadAlunosByTurmas(array $turmaIds): array
    {
        if (empty($turmaIds)) {
            return $this->alunoModel->getAllOrdered(true);
        }

        $pdo  = Database::connection();
        $placeholders = implode(',', array_fill(0, count($turmaIds), '?'));
        $stmt = $pdo->prepare(
            "SELECT id, nome, matricula, desempenho, turma_id, turma
             FROM alunos WHERE ativo = 1 AND turma_id IN ($placeholders) ORDER BY nome ASC, id ASC"
        );
        $stmt->execute(array_values($turmaIds));
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function loadCorrections(array $alunoIds, array $bimestres = [], array $anosLetivos = []): array
    {
        if (empty($alunoIds)) return [];

        $pdo          = Database::connection();
        $alunoPlaceholders = implode(',', array_fill(0, count($alunoIds), '?'));
        $params = array_values($alunoIds);

        $sql = "SELECT c.id, c.avaliacao_id, c.aluno_id, c.turma_id,
                       c.correcoes_json, c.acertos, c.total_questoes,
                       c.pontuacao, c.pontuacao_total, c.percentual,
                       c.corrigido_em, c.created_at
                FROM avaliacao_correcoes c";

        $where = ["c.aluno_id IN ($alunoPlaceholders)"];

        if (!empty($bimestres) || !empty($anosLetivos)) {
            $sql .= " INNER JOIN avaliacoes a ON a.id = c.avaliacao_id";
        }

        if (!empty($bimestres)) {
            $bimPlaceholders = implode(',', array_fill(0, count($bimestres), '?'));
            $where[] = "a.bimestre IN ($bimPlaceholders)";
            $params = array_merge($params, array_values($bimestres));
        }

        if (!empty($anosLetivos)) {
            $anoPlaceholders = implode(',', array_fill(0, count($anosLetivos), '?'));
            $where[] = "YEAR(a.aplicacao) IN ($anoPlaceholders)";
            $params = array_merge($params, array_values($anosLetivos));
        }

        $sql .= " WHERE " . implode(' AND ', $where) . " ORDER BY c.corrigido_em DESC, c.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function extractQuestionMeta(array $avaliacao): array
    {
        $gabarito = trim((string) ($avaliacao['gabarito'] ?? ''));
        if ($gabarito === '') return [];

        $decoded = json_decode($gabarito, true);
        if (!is_array($decoded)) return [];

        $itens  = is_array($decoded['itens'] ?? null) ? $decoded['itens'] : [];
        $result = [];
        foreach ($itens as $index => $item) {
            if (!is_array($item)) continue;
            $result[$index + 1] = [
                'disciplina' => $this->resolveDisciplinaLabel((string) ($item['disciplina'] ?? '')),
                'habilidade' => $this->normalizeLabel((string) ($item['habilidade'] ?? '')),
                'peso'       => round((float) ($item['peso'] ?? 1), 2),
            ];
        }
        return $result;
    }

    private function getManualDisciplineGrade(array $notasManuais, int $anoLetivo, int $bimestre, string $disciplina): array
    {
        $disciplina = $this->resolveDisciplinaLabel($disciplina);
        $default = [
            'subjetiva' => null,
            'subjetiva_ciclo_1' => null,
            'subjetiva_ciclo_2' => null,
            'prod_textual' => null,
            'recuperacao' => null,
        ];
        $yearData = $notasManuais[(string) $anoLetivo] ?? null;
        if (!is_array($yearData)) return $default;

        if ($bimestre <= 0) {
            $resolved = $default;
            for ($bim = 1; $bim <= 4; $bim++) {
                $bimData = $yearData[(string) $bim] ?? null;
                if (!is_array($bimData)) {
                    continue;
                }

                $discData = $this->findManualDisciplineData($bimData, $disciplina);
                if (!is_array($discData)) {
                    continue;
                }

                $subjetivaLegacy = $this->normalizeNullableFloat($discData['subjetiva'] ?? null);
                $subjetivaCiclo1 = $this->normalizeNullableFloat($discData['subjetiva_ciclo_1'] ?? $subjetivaLegacy);
                $subjetivaCiclo2 = $this->normalizeNullableFloat($discData['subjetiva_ciclo_2'] ?? null);
                $prodTextual = $this->normalizeNullableFloat($discData['prod_textual'] ?? null);
                $recuperacao = $this->normalizeNullableFloat($discData['recuperacao'] ?? null);

                if ($subjetivaCiclo1 !== null) {
                    $resolved['subjetiva_ciclo_1'] = $subjetivaCiclo1;
                    $resolved['subjetiva'] = $subjetivaCiclo1;
                }
                if ($subjetivaCiclo2 !== null) {
                    $resolved['subjetiva_ciclo_2'] = $subjetivaCiclo2;
                }
                if ($prodTextual !== null) {
                    $resolved['prod_textual'] = $prodTextual;
                }
                if ($recuperacao !== null) {
                    $resolved['recuperacao'] = $recuperacao;
                }
            }

            return $resolved;
        }

        $bimData = $yearData[(string) $bimestre] ?? null;
        if (!is_array($bimData)) return $default;

        $discData = $this->findManualDisciplineData($bimData, $disciplina);
        if (!is_array($discData)) return $default;

        return [
            'subjetiva'    => $this->normalizeNullableFloat($discData['subjetiva'] ?? ($discData['subjetiva_ciclo_1'] ?? null)),
            'subjetiva_ciclo_1' => $this->normalizeNullableFloat($discData['subjetiva_ciclo_1'] ?? ($discData['subjetiva'] ?? null)),
            'subjetiva_ciclo_2' => $this->normalizeNullableFloat($discData['subjetiva_ciclo_2'] ?? null),
            'prod_textual' => $this->normalizeNullableFloat($discData['prod_textual'] ?? null),
            'recuperacao'  => $this->normalizeNullableFloat($discData['recuperacao'] ?? null),
        ];
    }

    private function mergeManualGradesFromRecords(array $notasManuais, array $records): array
    {
        if (empty($records)) {
            return $notasManuais;
        }

        $componentByCategory = [
            'producao_textual' => 'prod_textual',
            'recuperacao' => 'recuperacao',
        ];

        $latestByKey = [];

        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }

            $entryType = strtolower(trim((string) ($record['entry_type'] ?? 'manual')));
            if ($entryType !== 'manual') {
                continue;
            }

            $categoria = $this->normalizeCategory((string) ($record['categoria'] ?? ''));
            $componente = $componentByCategory[$categoria] ?? null;
            if ($componente === null && $categoria === 'avaliacao_subjetiva') {
                $recordCiclo = (int) ($record['ciclo'] ?? 0);
                $componente = $recordCiclo === 2 ? 'subjetiva_ciclo_2' : 'subjetiva_ciclo_1';
            }
            if ($componente === null) {
                $categoriaLabel = $this->normalizeSearch((string) ($record['categoria_label'] ?? ''));
                if (str_contains($categoriaLabel, 'recuperacao')) {
                    $componente = 'recuperacao';
                } elseif (str_contains($categoriaLabel, 'producao textual')) {
                    $componente = 'prod_textual';
                } elseif (str_contains($categoriaLabel, 'subjetiva') || str_contains($categoriaLabel, 'avaliacao subjetiva')) {
                    $recordCiclo = (int) ($record['ciclo'] ?? 0);
                    $componente = $recordCiclo === 2 ? 'subjetiva_ciclo_2' : 'subjetiva_ciclo_1';
                }
            }
            if ($componente === null) {
                continue;
            }

            $anoLetivo = (int) ($record['ano_letivo'] ?? 0);
            $bimestre = (int) ($record['bimestre'] ?? 0);
            if ($anoLetivo < 2000 || $anoLetivo > 2100 || $bimestre < 1 || $bimestre > 4) {
                continue;
            }

            $disciplina = $this->resolveDisciplinaLabel((string) ($record['disciplina'] ?? ''));
            if ($disciplina === '') {
                continue;
            }

            if ($componente === 'prod_textual' && !$this->isDisciplinaLinguaPortuguesa($disciplina)) {
                continue;
            }

            $nota = $this->normalizeNullableFloat($record['nota'] ?? ($record['valor'] ?? null));
            if ($nota === null) {
                continue;
            }

            $disciplinaKey = $this->normalizeSearch($disciplina);
            if ($disciplinaKey === '') {
                continue;
            }

            $key = $anoLetivo . '|' . $bimestre . '|' . $disciplinaKey . '|' . $componente;
            $timestamp = $this->getRecordPriorityTimestamp($record);

            if (isset($latestByKey[$key]) && $latestByKey[$key] > $timestamp) {
                continue;
            }

            $yearKey = (string) $anoLetivo;
            $bimKey = (string) $bimestre;

            if (!isset($notasManuais[$yearKey]) || !is_array($notasManuais[$yearKey])) {
                $notasManuais[$yearKey] = [];
            }
            if (!isset($notasManuais[$yearKey][$bimKey]) || !is_array($notasManuais[$yearKey][$bimKey])) {
                $notasManuais[$yearKey][$bimKey] = [];
            }
            if (!isset($notasManuais[$yearKey][$bimKey][$disciplina]) || !is_array($notasManuais[$yearKey][$bimKey][$disciplina])) {
                $notasManuais[$yearKey][$bimKey][$disciplina] = [
                    'subjetiva' => null,
                    'subjetiva_ciclo_1' => null,
                    'subjetiva_ciclo_2' => null,
                    'prod_textual' => null,
                    'recuperacao' => null,
                ];
            }

            if ($componente === 'subjetiva_ciclo_1') {
                $notasManuais[$yearKey][$bimKey][$disciplina]['subjetiva_ciclo_1'] = $nota;
                $notasManuais[$yearKey][$bimKey][$disciplina]['subjetiva'] = $nota;
            } elseif ($componente === 'subjetiva_ciclo_2') {
                $notasManuais[$yearKey][$bimKey][$disciplina]['subjetiva_ciclo_2'] = $nota;
            } else {
                $notasManuais[$yearKey][$bimKey][$disciplina][$componente] = $nota;
            }
            $latestByKey[$key] = $timestamp;
        }

        return $notasManuais;
    }

    private function getRecordPriorityTimestamp(array $record): int
    {
        $fields = ['updated_at', 'data_referencia', 'created_at'];
        foreach ($fields as $field) {
            $raw = trim((string) ($record[$field] ?? ''));
            if ($raw === '') {
                continue;
            }
            $ts = strtotime($raw);
            if ($ts !== false) {
                return (int) $ts;
            }
        }

        return 0;
    }

    private function extractLatestRecoveryGrade(array $sources, int $targetBimestre = 0): ?float
    {
        if ($sources === []) {
            return null;
        }

        $latestSource = null;
        foreach ($sources as $source) {
            if (!is_array($source)) {
                continue;
            }

            if ($targetBimestre >= 1 && $targetBimestre <= 4 && (int) ($source['bimestre'] ?? 0) !== $targetBimestre) {
                continue;
            }

            $total = (int) ($source['total'] ?? 0);
            if ($total <= 0) {
                continue;
            }

            $sourceData = trim((string) ($source['aplicacao'] ?? ''));
            $sourceTs = $sourceData !== '' ? strtotime($sourceData) : false;
            $sourceKeyTs = $sourceTs !== false ? (int) $sourceTs : 0;
            $sourceId = (int) ($source['avaliacao_id'] ?? 0);

            if ($latestSource === null) {
                $latestSource = $source + ['_ts' => $sourceKeyTs, '_id' => $sourceId];
                continue;
            }

            $latestTs = (int) ($latestSource['_ts'] ?? 0);
            $latestId = (int) ($latestSource['_id'] ?? 0);
            if ($sourceKeyTs > $latestTs || ($sourceKeyTs === $latestTs && $sourceId > $latestId)) {
                $latestSource = $source + ['_ts' => $sourceKeyTs, '_id' => $sourceId];
            }
        }

        if (!is_array($latestSource)) {
            return null;
        }

        $latestPontuacao = $this->normalizeNullableFloat($latestSource['pontuacao'] ?? null);
        $latestPontuacaoTotal = $this->normalizeNullableFloat($latestSource['pontuacao_total'] ?? null);
        if ($latestPontuacao !== null && $latestPontuacaoTotal !== null && $latestPontuacaoTotal > 0) {
            return round(($latestPontuacao / $latestPontuacaoTotal) * 10, 2);
        }

        $latestTotal = (int) ($latestSource['total'] ?? 0);
        if ($latestTotal <= 0) {
            return null;
        }

        $latestCorretas = (int) ($latestSource['corretas'] ?? 0);
        return round(($latestCorretas / $latestTotal) * 10, 2);
    }

    private function sumManualRecoveryFromRecords(array $records, int $anoLetivo, int $bimestre, string $disciplina): ?float
    {
        if ($bimestre < 1 || $bimestre > 4 || $records === []) {
            return null;
        }

        $disciplina = $this->resolveDisciplinaLabel($disciplina);
        $disciplinaKey = $this->normalizeSearch($disciplina);
        if ($disciplinaKey === '') {
            return null;
        }

        $sum = 0.0;
        $count = 0;

        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }

            $entryType = strtolower(trim((string) ($record['entry_type'] ?? 'manual')));
            if ($entryType !== 'manual') {
                continue;
            }

            $recordAno = (int) ($record['ano_letivo'] ?? 0);
            $recordBimestre = (int) ($record['bimestre'] ?? 0);
            if ($recordAno !== $anoLetivo || $recordBimestre !== $bimestre) {
                continue;
            }

            $recordDisciplina = $this->normalizeSearch($this->resolveDisciplinaLabel((string) ($record['disciplina'] ?? '')));
            if ($recordDisciplina !== $disciplinaKey) {
                continue;
            }

            $categoria = $this->normalizeCategory((string) ($record['categoria'] ?? ''));
            if ($categoria !== 'recuperacao') {
                continue;
            }

            $nota = $this->normalizeNullableFloat($record['nota'] ?? ($record['valor'] ?? null));
            if ($nota === null) {
                continue;
            }

            $sum += $nota;
            $count++;
        }

        if ($count === 0) {
            return null;
        }

        return round($sum, 2);
    }

    private function buildDiagnosticoFromMap(array $map): array
    {
        $byAvaliacao = [];
        foreach ($map as $entry) {
            $disciplinaNome = trim((string) ($entry['disciplina'] ?? ''));
            if ($this->isAreaDiversificada($disciplinaNome)) {
                continue;
            }

            $avId = (int) $entry['avaliacao_id'];
            if (!isset($byAvaliacao[$avId])) {
                $byAvaliacao[$avId] = [
                    'avaliacao_id'    => $avId,
                    'avaliacao_nome'  => $entry['avaliacao_nome'],
                    'bimestre'        => $entry['bimestre'],
                    'total_avaliados' => 0,
                    'questoes'        => [],
                ];
            }

            $entryPontuacao = $this->normalizeNullableFloat($entry['pontuacao'] ?? null);
            $entryPontuacaoTotal = $this->normalizeNullableFloat($entry['pontuacao_total'] ?? null);
            if ($entryPontuacao !== null && $entryPontuacaoTotal !== null && $entryPontuacaoTotal > 0) {
                $pct = round(($entryPontuacao / $entryPontuacaoTotal) * 100, 1);
            } else {
                $pct = $entry['total'] > 0
                    ? round(($entry['corretas'] / $entry['total']) * 100, 1) : 0;
            }

            $byAvaliacao[$avId]['questoes'][] = [
                'numero'     => $entry['questao'],
                'disciplina' => $disciplinaNome,
                'habilidade' => $entry['habilidade'],
                'percentual' => $pct,
                'faixa'      => $this->faixaPercentual($pct),
                'corretas'   => $entry['corretas'],
                'total'      => $entry['total'],
            ];

            if ($entry['total'] > $byAvaliacao[$avId]['total_avaliados']) {
                $byAvaliacao[$avId]['total_avaliados'] = $entry['total'];
            }
        }

        foreach ($byAvaliacao as &$av) {
            usort($av['questoes'], fn(array $a, array $b) => $a['numero'] <=> $b['numero']);
        }
        unset($av);

        return array_values($byAvaliacao);
    }

    private function faixaPercentual(float $pct): string
    {
        if ($pct > 80) return 'alto';
        if ($pct > 60) return 'medio_alto';
        if ($pct > 40) return 'medio_baixo';
        return 'baixo';
    }

    /* ====================================================================
     *  HELPERS — build automatic record (for sync)
     * ==================================================================== */

    private function buildAutomaticRecord(array $avaliacao, array $correcao, array $aluno): array
    {
        $questionMeta = $this->extractQuestionMeta($avaliacao);
        $correcoes    = is_array($correcao['correcoes'] ?? null) ? $correcao['correcoes'] : [];
        if (empty($correcoes)) {
            $correcoes = $this->decodeJsonArray($correcao['correcoes_json'] ?? null);
        }

        $disciplinas    = [];
        $habilidadesMap = [];

        foreach ($correcoes as $item) {
            if (!is_array($item)) continue;
            $qn = (int) ($item['questionNumber'] ?? 0);
            if ($qn <= 0) continue;

            $meta       = $questionMeta[$qn] ?? ['disciplina' => '', 'habilidade' => '', 'peso' => 1];
            $disciplina = $this->normalizeLabel((string) ($meta['disciplina'] ?? ''));
            $habilidade = $this->normalizeLabel((string) ($meta['habilidade'] ?? ''));
            $isCorrect  = ($item['isCorrect'] ?? false) === true;
            $earnedPoints = $this->normalizeNullableFloat($item['pontuacao'] ?? null);
            $maxPoints = $this->normalizeNullableFloat($item['pontuacao_maxima'] ?? ($meta['peso'] ?? 1));
            if ($maxPoints === null || $maxPoints <= 0) {
                $maxPoints = max(0.01, (float) ($meta['peso'] ?? 1));
            }
            if ($earnedPoints === null) {
                $earnedPoints = $isCorrect ? $maxPoints : 0.0;
            }
            if ($earnedPoints < 0) {
                $earnedPoints = 0.0;
            } elseif ($earnedPoints > $maxPoints) {
                $earnedPoints = $maxPoints;
            }

            if ($disciplina !== '') $disciplinas[$disciplina] = true;

            if ($habilidade !== '') {
                if (!isset($habilidadesMap[$habilidade])) {
                    $habilidadesMap[$habilidade] = ['earned' => 0, 'total' => 0];
                }
                $habilidadesMap[$habilidade]['total'] += $maxPoints;
                $habilidadesMap[$habilidade]['earned'] += $earnedPoints;
            }
        }

        $habilidadesAvaliadas  = array_keys($habilidadesMap);
        $habilidadesAlcancadas = [];
        foreach ($habilidadesMap as $h => $e) {
            if ($e['total'] > 0 && ($e['earned'] / $e['total']) >= 0.7) {
                $habilidadesAlcancadas[] = $h;
            }
        }

        $aplicacao = trim((string) ($avaliacao['aplicacao'] ?? ''));
        $anoLetivo = 0;
        if ($aplicacao !== '') {
            $ts = strtotime($aplicacao);
            if ($ts !== false) $anoLetivo = (int) date('Y', $ts);
        }

        $discList  = array_keys($disciplinas);
        $discLabel = count($discList) === 1 ? $discList[0] : (count($discList) > 1 ? 'Multidisciplinar' : '');

        return [
            'id'                     => 'auto-' . $this->buildAutomaticSourceKey((int)($correcao['aluno_id']??0), (int)($avaliacao['id']??0), (int)($correcao['turma_id']??0)),
            'entry_type'             => 'avaliacao',
            'source_key'             => $this->buildAutomaticSourceKey((int)($correcao['aluno_id']??0), (int)($avaliacao['id']??0), (int)($correcao['turma_id']??0)),
            'categoria'              => 'avaliacao',
            'categoria_label'        => 'Avaliação corrigida',
            'titulo'                 => trim((string)($avaliacao['nome'] ?? $correcao['avaliacao_nome'] ?? 'Avaliação')),
            'descricao'              => 'Registro automático a partir da correção.',
            'disciplina'             => $discLabel,
            'aluno_id'               => (int)($correcao['aluno_id']??0),
            'aluno_nome'             => trim((string)($correcao['aluno_nome'] ?? $aluno['nome'] ?? '')),
            'turma_id'               => (int)($correcao['turma_id'] ?? $aluno['turma_id'] ?? 0),
            'turma_nome'             => trim((string)($correcao['turma_nome'] ?? $aluno['turma'] ?? '')),
            'ano_letivo'             => $anoLetivo,
            'bimestre'               => (int)($avaliacao['bimestre']??0),
            'data_referencia'        => $aplicacao !== '' ? $aplicacao : date('Y-m-d'),
            'nota'                   => round((float)($correcao['pontuacao']??0), 2),
            'nota_maxima'            => round((float)($correcao['pontuacao_total']??0), 2),
            'percentual'             => round((float)($correcao['percentual']??0), 2),
            'habilidades_alcancadas' => $habilidadesAlcancadas,
            'habilidades_avaliadas'  => $habilidadesAvaliadas,
            'observacoes'            => '',
            'editable'               => false,
            'created_at'             => trim((string)($correcao['created_at']??'')) ?: date('Y-m-d H:i:s'),
            'updated_at'             => trim((string)($correcao['updated_at']??'')) ?: date('Y-m-d H:i:s'),
        ];
    }

    /* ====================================================================
     *  HELPERS — encoding / decoding
     * ==================================================================== */

    private function decodePayload(string $rawJson): array
    {
        if (trim($rawJson) === '') {
            return ['version' => self::PAYLOAD_VERSION, 'notas_manuais' => [], 'records' => [], 'updated_at' => null];
        }

        $decoded = json_decode($rawJson, true);
        if (!is_array($decoded)) {
            return ['version' => self::PAYLOAD_VERSION, 'notas_manuais' => [], 'records' => [], 'updated_at' => null];
        }

        return [
            'version'       => (int) ($decoded['version'] ?? self::PAYLOAD_VERSION),
            'notas_manuais' => is_array($decoded['notas_manuais'] ?? null) ? $decoded['notas_manuais'] : [],
            'records'       => is_array($decoded['records'] ?? null) ? $decoded['records'] : [],
            'updated_at'    => trim((string) ($decoded['updated_at'] ?? '')) ?: null,
        ];
    }

    private function persistPayload(int $alunoId, array $payload): void
    {
        $json = json_encode([
            'version'       => self::PAYLOAD_VERSION,
            'notas_manuais' => is_array($payload['notas_manuais'] ?? null) ? $payload['notas_manuais'] : [],
            'records'       => array_values(is_array($payload['records'] ?? null) ? $payload['records'] : []),
            'updated_at'    => trim((string) ($payload['updated_at'] ?? '')) ?: date('Y-m-d H:i:s'),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $this->alunoModel->updateDesempenho($alunoId, $json !== false ? $json : null);
    }

    private function getManualCategoryMap(): array
    {
        return [
            'avaliacao_subjetiva' => 'Avaliação Subjetiva',
            'producao_textual'    => 'Produção textual',
            'recuperacao'         => 'Recuperação',
        ];
    }

    private function normalizeLabel(string $value): string
    {
        return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    }

    private function getDisciplinaCatalogOptions(): array
    {
        if (is_array($this->disciplinaCatalogOptions)) {
            return $this->disciplinaCatalogOptions;
        }

        $disciplinaModel = new DisciplinaModel();
        try {
            $rows = $disciplinaModel->getSimpleOptions();
        } catch (Throwable) {
            $rows = [];
        }

        $this->disciplinaCatalogOptions = is_array($rows) ? $rows : [];
        return $this->disciplinaCatalogOptions;
    }

    private function getDisciplinaIdNameMap(): array
    {
        if (is_array($this->disciplinaIdNameMap)) {
            return $this->disciplinaIdNameMap;
        }

        $map = [];
        foreach ($this->getDisciplinaCatalogOptions() as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            $nome = $this->normalizeLabel((string) ($row['nome'] ?? ''));
            if ($id <= 0 || $nome === '') {
                continue;
            }

            $map[(string) $id] = $nome;
        }

        $this->disciplinaIdNameMap = $map;
        return $this->disciplinaIdNameMap;
    }

    private function resolveDisciplinaLabel(string $value): string
    {
        $normalized = $this->normalizeLabel($value);
        if ($normalized === '') {
            return '';
        }

        if (ctype_digit($normalized)) {
            $map = $this->getDisciplinaIdNameMap();
            if (isset($map[$normalized])) {
                return $map[$normalized];
            }
        }

        return $normalized;
    }

    private function findManualDisciplineData(array $bimData, string $disciplina): ?array
    {
        if ($disciplina === '') {
            return null;
        }

        if (isset($bimData[$disciplina]) && is_array($bimData[$disciplina])) {
            return $bimData[$disciplina];
        }

        $disciplinaKey = $this->normalizeSearch($disciplina);
        foreach ($bimData as $rawKey => $rawValue) {
            if (!is_array($rawValue)) {
                continue;
            }

            $resolvedKey = $this->resolveDisciplinaLabel((string) $rawKey);
            if ($this->normalizeSearch($resolvedKey) !== $disciplinaKey) {
                continue;
            }

            return $rawValue;
        }

        return null;
    }

    private function normalizeSearch(string $value): string
    {
        $n = trim(mb_strtolower($value, 'UTF-8'));
        if ($n === '') return '';
        $c = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $n);
        if (is_string($c) && $c !== '') $n = $c;
        $n = preg_replace('/[^a-z0-9]+/i', ' ', $n) ?? '';
        return trim($n);
    }

    private function normalizeCategory(string $value): string
    {
        $n = str_replace(' ', '_', $this->normalizeSearch($value));
        if ($n === '') return 'avaliacao_subjetiva';

        if ($n === 'subjetiva' || $n === 'avaliacao' || $n === 'avaliacao_subjetiva') {
            return 'avaliacao_subjetiva';
        }

        if ($n === 'producao_textual') {
            return 'producao_textual';
        }

        if ($n === 'recuperacao') {
            return 'recuperacao';
        }

        $map = $this->getManualCategoryMap();
        return isset($map[$n]) ? $n : 'avaliacao_subjetiva';
    }

    private function isDisciplinaLinguaPortuguesa(string $disciplina): bool
    {
        $normalized = $this->normalizeSearch($this->resolveDisciplinaLabel($disciplina));
        if ($normalized === '') {
            return false;
        }

        return str_contains($normalized, 'lingua portuguesa')
            || str_contains($normalized, 'portugues');
    }

    private function isAreaDiversificada(string $areaNome): bool
    {
        $normalized = $this->normalizeSearch($areaNome);
        if ($normalized === '') {
            return false;
        }

        return str_contains($normalized, 'diversificada');
    }

    private function normalizeIntList($value, int $min, int $max): array
    {
        $items = [];

        if (is_array($value)) {
            $items = $value;
        } else {
            $raw = trim((string) $value);
            if ($raw !== '') {
                $items = preg_split('/[\s,;|]+/u', $raw) ?: [];
            }
        }

        $result = [];
        foreach ($items as $item) {
            if (!is_scalar($item)) {
                continue;
            }

            $number = (int) trim((string) $item);
            if ($number < $min || $number > $max) {
                continue;
            }

            $result[$number] = $number;
        }

        return array_values($result);
    }

    private function normalizeNullableFloat($value): ?float
    {
        if ($value === null || $value === '') return null;
        if (is_string($value)) $value = str_replace(',', '.', trim($value));
        if (!is_numeric($value)) return null;
        return round((float) $value, 2);
    }

    private function extractAdaptedGradeFromCorrectionItem(array $item, float $earnedPoints, float $maxPoints): ?float
    {
        $adaptedMode = ($item['adaptedMode'] ?? false) === true
            || strtolower(trim((string) ($item['manualLaunchMode'] ?? ''))) === 'adaptada';

        $adaptedGrade = $this->normalizeNullableFloat($item['adaptedGrade'] ?? null);
        if ($adaptedGrade !== null) {
            return $adaptedGrade;
        }

        $adaptedRatio = $this->normalizeNullableFloat($item['adaptedRatio'] ?? null);
        if ($adaptedRatio !== null) {
            return round($adaptedRatio * 10, 2);
        }

        if (!$adaptedMode) {
            return null;
        }

        if ($maxPoints <= 0) {
            return 0.0;
        }

        return round(($earnedPoints / $maxPoints) * 10, 2);
    }

    private function normalizeNullableDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') return null;
        $ts = strtotime($value);
        return $ts !== false ? date('Y-m-d', $ts) : null;
    }

    private function decodeJsonArray($rawValue): array
    {
        if (!is_string($rawValue) || trim($rawValue) === '') return [];
        $decoded = json_decode($rawValue, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function parseListField($value): array
    {
        $items = is_array($value) ? $value : (preg_split('/[\n,;]+/u', (string) $value) ?: []);
        $result = [];
        foreach ($items as $item) {
            $label = $this->normalizeLabel((string) $item);
            if ($label !== '') $result[$label] = $label;
        }
        return array_values($result);
    }

    private function findRecordIndexById(array $records, string $recordId): int
    {
        if (trim($recordId) === '') return -1;
        foreach ($records as $i => $r) {
            if (is_array($r) && trim((string) ($r['id'] ?? '')) === $recordId) return $i;
        }
        return -1;
    }

    private function findRecordIndexBySourceKey(array $records, string $sourceKey): int
    {
        foreach ($records as $i => $r) {
            if (is_array($r) && trim((string) ($r['source_key'] ?? '')) === $sourceKey) return $i;
        }
        return -1;
    }

    private function buildAutomaticSourceKey(int $alunoId, int $avaliacaoId, int $turmaId): string
    {
        return 'avaliacao:' . $avaliacaoId . ':aluno:' . $alunoId . ':turma:' . $turmaId;
    }

    private function sortRecords(array $records): array
    {
        usort($records, static function (array $a, array $b): int {
            $da = strtotime((string) ($a['data_referencia'] ?? '')) ?: 0;
            $db = strtotime((string) ($b['data_referencia'] ?? '')) ?: 0;
            return $da !== $db ? ($db <=> $da) : ((strtotime((string) ($b['updated_at'] ?? '')) ?: 0) <=> (strtotime((string) ($a['updated_at'] ?? '')) ?: 0));
        });
        return array_values($records);
    }
}
