(function () {
  'use strict';

  var root = document.getElementById('notasDesempenhoRoot');
  if (!root) {
    return;
  }

  var baseUrl = String(root.getAttribute('data-base-url') || '').replace(/\/$/, '');
  var initialTurmas = parseJsonScript('notasDesempenhoTurmasData', []);
  var initialDisciplinas = parseJsonScript('notasDesempenhoDisciplinasData', []);

  var turmaSelect = document.getElementById('notasDesempenhoTurma');
  var bimestreSelect = document.getElementById('notasDesempenhoBimestre');
  var anoSelect = document.getElementById('notasDesempenhoAno');
  var disciplinaSelect = document.getElementById('notasDesempenhoDisciplinaSelect');
  var buscaInput = document.getElementById('notasDesempenhoBusca');
  var statusEl = document.getElementById('notasDesempenhoStatus');
  var refreshBtn = document.getElementById('rankingPedagogicoRefreshBtn');

  var turmasSummaryEl = document.getElementById('notasFilterTurmasSummary');
  var bimestresSummaryEl = document.getElementById('notasFilterBimestresSummary');
  var anosSummaryEl = document.getElementById('notasFilterAnosSummary');
  var disciplinasSummaryEl = document.getElementById('notasFilterDisciplinasSummary');

  var bestTurmaEl = document.getElementById('rankingPedagogicoBestTurma');
  var bestTurmaMetaEl = document.getElementById('rankingPedagogicoBestTurmaMeta');
  var bestAnoEl = document.getElementById('rankingPedagogicoBestAnoEscolar');
  var bestAnoMetaEl = document.getElementById('rankingPedagogicoBestAnoEscolarMeta');
  var bestEstudanteEl = document.getElementById('rankingPedagogicoBestEstudante');
  var bestEstudanteMetaEl = document.getElementById('rankingPedagogicoBestEstudanteMeta');
  var avaliadosEl = document.getElementById('rankingPedagogicoAvaliados');
  var avaliadosMetaEl = document.getElementById('rankingPedagogicoAvaliadosMeta');

  var turmasStatusEl = document.getElementById('rankingPedagogicoTurmasStatus');
  var turmasPodiumEl = document.getElementById('rankingPedagogicoTurmasPodium');
  var turmasBodyEl = document.getElementById('rankingPedagogicoTurmasBody');

  var anosStatusEl = document.getElementById('rankingPedagogicoAnosStatus');
  var anosPodiumEl = document.getElementById('rankingPedagogicoAnosPodium');
  var anosBodyEl = document.getElementById('rankingPedagogicoAnosBody');

  var estudantesStatusEl = document.getElementById('rankingPedagogicoEstudantesStatus');
  var estudantesBodyEl = document.getElementById('rankingPedagogicoEstudantesBody');

  var searchTimer = 0;
  var loadToken = 0;
  var collator = typeof Intl !== 'undefined' && Intl.Collator ? new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true }) : null;

  var state = {
    rawData: null,
    turmaMetaById: buildTurmaMetaById(initialTurmas)
  };

  function parseJsonScript(id, fallback) {
    var el = document.getElementById(id);
    if (!el) {
      return fallback;
    }

    try {
      return JSON.parse(el.textContent || 'null');
    } catch (error) {
      return fallback;
    }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeText(value) {
    var text = String(value == null ? '' : value).trim().toLowerCase();
    if (typeof text.normalize === 'function') {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return text;
  }

  function compareText(a, b) {
    if (collator) {
      return collator.compare(String(a || ''), String(b || ''));
    }
    return String(a || '').localeCompare(String(b || ''), 'pt-BR');
  }

  function round2(value) {
    return Math.round(Number(value) * 100) / 100;
  }

  function fmtNota(value) {
    var number = Number(value);
    if (!isFinite(number)) {
      return '-';
    }
    return number.toFixed(2).replace('.', ',');
  }

  function fmtPct(value) {
    var number = Number(value);
    if (!isFinite(number)) {
      return '-';
    }
    return number.toFixed(1).replace('.', ',') + '%';
  }

  function classificarProficiencia(nota) {
    if (!isFinite(Number(nota))) {
      return null;
    }
    if (Number(nota) >= 9.5) {
      return 'Avançado';
    }
    if (Number(nota) >= 6) {
      return 'Adequado';
    }
    if (Number(nota) >= 4) {
      return 'Insuficiente';
    }
    return 'Crítico';
  }

  function profBadgeClass(label) {
    switch (String(label || '')) {
      case 'Avançado':
        return 'bg-success';
      case 'Adequado':
        return 'bg-primary';
      case 'Insuficiente':
        return 'bg-warning text-dark';
      case 'Crítico':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  function selectedValues(select) {
    if (!select) {
      return [];
    }

    return Array.prototype.slice.call(select.options || [])
      .filter(function (option) {
        return option && option.selected && String(option.value || '').trim() !== '';
      })
      .map(function (option) {
        return String(option.value || '').trim();
      });
  }

  function selectedNumbers(select) {
    return selectedValues(select)
      .map(function (value) {
        return Number(value);
      })
      .filter(function (value) {
        return isFinite(value) && value > 0;
      });
  }

  function updateSummary(select, target, defaultLabel, limit) {
    if (!target || !select) {
      return;
    }

    var selectedOptions = Array.prototype.slice.call(select.options || []).filter(function (option) {
      return option && option.selected && String(option.value || '').trim() !== '';
    });

    if (!selectedOptions.length) {
      target.textContent = defaultLabel;
      return;
    }

    var labels = selectedOptions.map(function (option) {
      return String(option.textContent || option.label || '').trim();
    }).filter(function (label) {
      return label !== '';
    });

    if (!labels.length) {
      target.textContent = defaultLabel;
      return;
    }

    if (labels.length <= limit) {
      target.textContent = labels.join(' • ');
      return;
    }

    target.textContent = labels.slice(0, limit).join(' • ') + ' +' + (labels.length - limit);
  }

  function normalizeAnoEscolarKey(raw) {
    var matches = String(raw || '').match(/\d+/g) || [];
    var unique = {};
    var values = [];

    matches.forEach(function (item) {
      var number = Number(item);
      var normalized = number > 0 ? String(number) : '';
      if (normalized === '' || unique[normalized]) {
        return;
      }
      unique[normalized] = true;
      values.push(normalized);
    });

    values.sort(function (a, b) {
      return Number(a) - Number(b);
    });

    return values.join(',');
  }

  function formatAnoEscolar(raw) {
    var key = normalizeAnoEscolarKey(raw);
    if (key === '') {
      return 'Sem ano escolar';
    }

    var labels = key.split(',').filter(Boolean).map(function (item) {
      return item + 'º';
    });

    if (labels.length === 1) {
      return labels[0] + ' ano';
    }

    return labels.join(', ') + ' anos';
  }

  function buildTurmaMetaById(turmas) {
    var map = {};
    (Array.isArray(turmas) ? turmas : []).forEach(function (item) {
      var turmaId = Number(item && item.id ? item.id : 0);
      if (turmaId <= 0) {
        return;
      }

      map[String(turmaId)] = {
        id: turmaId,
        nome: String(item && item.nome ? item.nome : '').trim(),
        ano_letivo: Number(item && item.ano_letivo ? item.ano_letivo : 0),
        ano_escolar_raw: String(item && item.ano_escolar ? item.ano_escolar : '').trim()
      };
    });
    return map;
  }

  function buildEndpoint(path) {
    return baseUrl + String(path || '');
  }

  function populateTurmaSelect() {
    if (!turmaSelect) {
      return;
    }

    var selectedMap = {};
    selectedValues(turmaSelect).forEach(function (value) {
      selectedMap[String(value)] = true;
    });

    turmaSelect.innerHTML = (Array.isArray(initialTurmas) ? initialTurmas : []).map(function (item) {
      var turmaId = Number(item && item.id ? item.id : 0);
      if (turmaId <= 0) {
        return '';
      }
      var selectedAttr = selectedMap[String(turmaId)] ? ' selected' : '';
      return '<option value="' + esc(turmaId) + '"' + selectedAttr + '>' + esc(String(item.nome || '')) + '</option>';
    }).join('');
  }

  function normalizeDisciplinaList(items) {
    var unique = {};
    var result = [];

    (Array.isArray(items) ? items : []).forEach(function (item) {
      var nome = typeof item === 'string'
        ? item
        : String(item && item.nome ? item.nome : '');
      nome = nome.trim();
      if (nome === '') {
        return;
      }
      var key = normalizeText(nome);
      if (key === '' || unique[key]) {
        return;
      }
      unique[key] = true;
      result.push(nome);
    });

    result.sort(compareText);
    return result;
  }

  function populateDisciplinaSelect(items) {
    if (!disciplinaSelect) {
      return;
    }

    var selectedMap = {};
    selectedValues(disciplinaSelect).forEach(function (value) {
      selectedMap[String(value)] = true;
    });

    var disciplinas = normalizeDisciplinaList(items);
    disciplinaSelect.innerHTML = disciplinas.map(function (nome) {
      var selectedAttr = selectedMap[nome] ? ' selected' : '';
      return '<option value="' + esc(nome) + '"' + selectedAttr + '>' + esc(nome) + '</option>';
    }).join('');
  }

  function renderChecklistFromSelect(select, listEl, prefix) {
    if (!select || !listEl) {
      return;
    }

    var options = Array.prototype.slice.call(select.options || []);
    if (!options.length) {
      listEl.innerHTML = '<div class="text-center text-secondary py-3">Nenhuma opção disponível.</div>';
      return;
    }

    listEl.innerHTML = options.map(function (option, index) {
      var optionId = prefix + '_' + index;
      return ''
        + '<label class="d-flex align-items-start gap-2 py-2 border-bottom small mb-0" for="' + optionId + '">'
        + '  <input class="form-check-input mt-1 js-ranking-filter-checkbox" id="' + optionId + '" type="checkbox" value="' + esc(option.value) + '"' + (option.selected ? ' checked' : '') + '>'
        + '  <span>' + esc(String(option.textContent || option.label || '')) + '</span>'
        + '</label>';
    }).join('');
  }

  function applyChecklistToSelect(select, listEl) {
    if (!select || !listEl) {
      return;
    }

    var selectedMap = {};
    listEl.querySelectorAll('.js-ranking-filter-checkbox').forEach(function (checkbox) {
      if (checkbox instanceof HTMLInputElement && checkbox.checked) {
        selectedMap[String(checkbox.value || '')] = true;
      }
    });

    Array.prototype.slice.call(select.options || []).forEach(function (option) {
      option.selected = selectedMap[String(option.value || '')] === true;
    });
  }

  function setAllChecklist(listEl, checked) {
    if (!listEl) {
      return;
    }

    listEl.querySelectorAll('.js-ranking-filter-checkbox').forEach(function (checkbox) {
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = checked;
      }
    });
  }

  function getModalInstance(modalEl) {
    var bootstrapApi = typeof window.bootstrap !== 'undefined' ? window.bootstrap : null;
    if (!modalEl || !bootstrapApi || !bootstrapApi.Modal || typeof bootstrapApi.Modal.getOrCreateInstance !== 'function') {
      return null;
    }
    return bootstrapApi.Modal.getOrCreateInstance(modalEl);
  }

  function attachFilterModal(config) {
    if (!config || !config.openBtn || !config.select || !config.listEl || !config.modalEl) {
      return;
    }

    config.openBtn.addEventListener('click', function () {
      renderChecklistFromSelect(config.select, config.listEl, config.prefix);
      var modal = getModalInstance(config.modalEl);
      if (modal && typeof modal.show === 'function') {
        modal.show();
      }
    });

    if (config.selectAllBtn) {
      config.selectAllBtn.addEventListener('click', function () {
        setAllChecklist(config.listEl, true);
      });
    }

    if (config.clearBtn) {
      config.clearBtn.addEventListener('click', function () {
        setAllChecklist(config.listEl, false);
      });
    }

    if (config.applyBtn) {
      config.applyBtn.addEventListener('click', function () {
        applyChecklistToSelect(config.select, config.listEl);
        updateSummary(config.select, config.summaryEl, config.defaultLabel, 2);
        if (config.reloadMode === 'server') {
          loadDashboard();
        } else {
          renderDashboard(state.rawData || {});
        }
      });
    }
  }

  function collectServerFilters() {
    var params = new URLSearchParams();

    selectedNumbers(turmaSelect).forEach(function (value) {
      params.append('turma_ids[]', String(value));
    });

    selectedNumbers(bimestreSelect).forEach(function (value) {
      params.append('bimestres[]', String(value));
    });

    selectedNumbers(anoSelect).forEach(function (value) {
      params.append('anos_letivos[]', String(value));
    });

    return params.toString();
  }

  function buildScoreModeLabel() {
    var selectedDisciplinas = selectedValues(disciplinaSelect);
    if (!selectedDisciplinas.length) {
      return 'media geral';
    }
    if (selectedDisciplinas.length === 1) {
      return 'componente curricular ' + selectedDisciplinas[0];
    }
    return 'media dos componentes curriculares selecionados';
  }

  function countAvailableDisciplinas(disciplinasMap) {
    var total = 0;
    Object.keys(disciplinasMap || {}).forEach(function (disciplina) {
      var item = disciplinasMap[disciplina] || {};
      var nota = Number(item && item.nota_final != null ? item.nota_final : NaN);
      if (isFinite(nota)) {
        total += 1;
      }
    });
    return total;
  }

  function resolveStudentScore(row, selectedDisciplinas) {
    var disciplinasMap = row && typeof row.disciplinas === 'object' ? row.disciplinas : {};

    if (Array.isArray(selectedDisciplinas) && selectedDisciplinas.length) {
      var soma = 0;
      var count = 0;
      selectedDisciplinas.forEach(function (disciplina) {
        var item = disciplinasMap[disciplina] || {};
        var nota = Number(item && item.nota_final != null ? item.nota_final : NaN);
        if (!isFinite(nota)) {
          return;
        }
        soma += nota;
        count += 1;
      });

      return {
        score: count > 0 ? round2(soma / count) : null,
        disciplinas_avaliadas: count,
        proficiencia: count > 0 ? classificarProficiencia(round2(soma / count)) : null
      };
    }

    var mediaGeral = Number(row && row.media_geral != null ? row.media_geral : NaN);
    return {
      score: isFinite(mediaGeral) ? round2(mediaGeral) : null,
      disciplinas_avaliadas: countAvailableDisciplinas(disciplinasMap),
      proficiencia: String(row && row.proficiencia_geral ? row.proficiencia_geral : '') || (isFinite(mediaGeral) ? classificarProficiencia(mediaGeral) : null)
    };
  }

  function buildStudentRows(data) {
    var boletim = data && Array.isArray(data.boletim) ? data.boletim : [];
    var selectedDisciplinas = selectedValues(disciplinaSelect);

    return boletim.map(function (row) {
      var turmaId = Number(row && row.turma_id ? row.turma_id : 0);
      var turmaMeta = state.turmaMetaById[String(turmaId)] || {};
      var scoreData = resolveStudentScore(row, selectedDisciplinas);
      var anoEscolarRaw = String(turmaMeta.ano_escolar_raw || '').trim();

      return {
        aluno_id: Number(row && row.aluno_id ? row.aluno_id : 0),
        aluno_nome: String(row && row.aluno_nome ? row.aluno_nome : '').trim(),
        turma_id: turmaId,
        turma_nome: String(row && row.turma_nome ? row.turma_nome : turmaMeta.nome || '').trim(),
        ano_letivo: Number(turmaMeta.ano_letivo || 0),
        ano_escolar_key: normalizeAnoEscolarKey(anoEscolarRaw),
        ano_escolar_label: formatAnoEscolar(anoEscolarRaw),
        score: scoreData.score,
        disciplinas_avaliadas: Number(scoreData.disciplinas_avaliadas || 0),
        proficiencia: scoreData.proficiencia
      };
    });
  }

  function filterStudentRows(rows) {
    var term = normalizeText(buscaInput ? buscaInput.value : '');
    if (term === '') {
      return rows.slice();
    }

    return rows.filter(function (row) {
      var haystack = normalizeText(
        String(row.aluno_nome || '') + ' ' + String(row.turma_nome || '') + ' ' + String(row.ano_escolar_label || '') + ' ' + String(row.ano_letivo || '')
      );
      return haystack.indexOf(term) >= 0;
    });
  }

  function sortByRanking(a, b, textField) {
    var aScore = a && a.media != null ? Number(a.media) : -1;
    var bScore = b && b.media != null ? Number(b.media) : -1;
    if (bScore !== aScore) {
      return bScore - aScore;
    }

    var aParticipacao = Number(a && a.participacao != null ? a.participacao : -1);
    var bParticipacao = Number(b && b.participacao != null ? b.participacao : -1);
    if (bParticipacao !== aParticipacao) {
      return bParticipacao - aParticipacao;
    }

    return compareText(a && a[textField] ? a[textField] : '', b && b[textField] ? b[textField] : '');
  }

  function buildTurmaRanking(studentRows) {
    var grouped = {};

    studentRows.forEach(function (row) {
      var key = String(row.turma_id || 0);
      if (!grouped[key]) {
        grouped[key] = {
          turma_id: Number(row.turma_id || 0),
          turma_nome: String(row.turma_nome || '').trim() || 'Sem turma',
          ano_letivo: Number(row.ano_letivo || 0),
          ano_escolar_key: String(row.ano_escolar_key || ''),
          ano_escolar_label: String(row.ano_escolar_label || 'Sem ano escolar'),
          total_estudantes: 0,
          total_avaliados: 0,
          soma: 0,
          destaque_nome: '',
          destaque_score: null
        };
      }

      grouped[key].total_estudantes += 1;
      if (!isFinite(Number(row.score))) {
        return;
      }

      grouped[key].total_avaliados += 1;
      grouped[key].soma += Number(row.score);
      if (!isFinite(Number(grouped[key].destaque_score)) || Number(row.score) > Number(grouped[key].destaque_score)) {
        grouped[key].destaque_nome = String(row.aluno_nome || '').trim();
        grouped[key].destaque_score = Number(row.score);
      }
    });

    return Object.keys(grouped).map(function (key) {
      var item = grouped[key];
      var media = item.total_avaliados > 0 ? round2(item.soma / item.total_avaliados) : null;
      return {
        turma_id: item.turma_id,
        turma_nome: item.turma_nome,
        ano_letivo: item.ano_letivo,
        ano_escolar_key: item.ano_escolar_key,
        ano_escolar_label: item.ano_escolar_label,
        total_estudantes: item.total_estudantes,
        total_avaliados: item.total_avaliados,
        participacao: item.total_estudantes > 0 ? round2((item.total_avaliados / item.total_estudantes) * 100) : 0,
        media: media,
        proficiencia: classificarProficiencia(media),
        destaque_nome: item.destaque_nome,
        destaque_score: item.destaque_score
      };
    }).sort(function (a, b) {
      return sortByRanking(a, b, 'turma_nome');
    });
  }

  function buildAnoRanking(studentRows, turmaRows) {
    var grouped = {};
    var bestTurmaByAno = {};

    turmaRows.forEach(function (row) {
      var key = String(row.ano_escolar_key || '__sem_ano__');
      if (!isFinite(Number(row.media))) {
        return;
      }
      if (!bestTurmaByAno[key] || Number(row.media) > Number(bestTurmaByAno[key].media)) {
        bestTurmaByAno[key] = row;
      }
    });

    studentRows.forEach(function (row) {
      var key = String(row.ano_escolar_key || '__sem_ano__');
      if (!grouped[key]) {
        grouped[key] = {
          ano_escolar_key: key,
          ano_escolar_label: String(row.ano_escolar_label || 'Sem ano escolar'),
          turma_map: {},
          total_estudantes: 0,
          total_avaliados: 0,
          soma: 0
        };
      }

      grouped[key].total_estudantes += 1;
      if (Number(row.turma_id || 0) > 0) {
        grouped[key].turma_map[String(row.turma_id)] = true;
      }
      if (!isFinite(Number(row.score))) {
        return;
      }

      grouped[key].total_avaliados += 1;
      grouped[key].soma += Number(row.score);
    });

    return Object.keys(grouped).map(function (key) {
      var item = grouped[key];
      var media = item.total_avaliados > 0 ? round2(item.soma / item.total_avaliados) : null;
      var bestTurma = bestTurmaByAno[key] || null;
      return {
        ano_escolar_key: key,
        ano_escolar_label: item.ano_escolar_label,
        turmas_count: Object.keys(item.turma_map).length,
        total_estudantes: item.total_estudantes,
        total_avaliados: item.total_avaliados,
        participacao: item.total_estudantes > 0 ? round2((item.total_avaliados / item.total_estudantes) * 100) : 0,
        media: media,
        proficiencia: classificarProficiencia(media),
        melhor_turma_nome: bestTurma ? bestTurma.turma_nome : '',
        melhor_turma_media: bestTurma ? bestTurma.media : null
      };
    }).sort(function (a, b) {
      return sortByRanking(a, b, 'ano_escolar_label');
    });
  }

  function buildRankingEstudantes(studentRows) {
    return studentRows.filter(function (row) {
      return isFinite(Number(row.score));
    }).sort(function (a, b) {
      if (Number(b.score) !== Number(a.score)) {
        return Number(b.score) - Number(a.score);
      }
      return compareText(a.aluno_nome, b.aluno_nome);
    });
  }

  function setText(el, value) {
    if (el) {
      el.textContent = value;
    }
  }

  function renderOverviewCards(turmaRows, anoRows, estudantesRows, scoreMode) {
    var bestTurma = turmaRows.find(function (row) {
      return isFinite(Number(row.media));
    }) || null;
    var bestAno = anoRows.find(function (row) {
      return isFinite(Number(row.media));
    }) || null;
    var bestEstudante = estudantesRows.length ? estudantesRows[0] : null;

    setText(bestTurmaEl, bestTurma ? bestTurma.turma_nome : '--');
    setText(bestTurmaMetaEl, bestTurma
      ? ('Média ' + fmtNota(bestTurma.media) + ' • ' + bestTurma.total_avaliados + '/' + bestTurma.total_estudantes + ' avaliados • ' + scoreMode)
      : 'Nenhuma turma com nota no recorte.');

    setText(bestAnoEl, bestAno ? bestAno.ano_escolar_label : '--');
    setText(bestAnoMetaEl, bestAno
      ? ('Média ' + fmtNota(bestAno.media) + ' • ' + bestAno.turmas_count + ' turma(s) • ' + scoreMode)
      : 'Nenhum ano escolar com nota no recorte.');

    setText(bestEstudanteEl, bestEstudante ? bestEstudante.aluno_nome : '--');
    setText(bestEstudanteMetaEl, bestEstudante
      ? (bestEstudante.turma_nome + ' • ' + fmtNota(bestEstudante.score) + ' • ' + String(bestEstudante.proficiencia || '-'))
      : 'Nenhum estudante com nota no recorte.');

    setText(avaliadosEl, String(estudantesRows.length));
    setText(avaliadosMetaEl, estudantesRows.length
      ? (scoreMode + ' • ' + turmaRows.length + ' turma(s) ranqueada(s)')
      : 'Nenhum estudante com nota no recorte.');
  }

  function renderPodium(container, rows, type) {
    if (!container) {
      return;
    }

    var topRows = rows.filter(function (row) {
      return isFinite(Number(row.media));
    }).slice(0, 3);

    if (!topRows.length) {
      container.innerHTML = '<div class="col-12"><div class="ranking-empty-state">Nenhum ranking disponivel para o recorte atual.</div></div>';
      return;
    }

    container.innerHTML = topRows.map(function (row, index) {
      var place = index + 1;
      var isFirst = place === 1 ? ' is-first' : '';
      var title = type === 'turma' ? row.turma_nome : row.ano_escolar_label;
      var meta = type === 'turma'
        ? row.ano_escolar_label + ' • ' + row.total_avaliados + '/' + row.total_estudantes + ' avaliados'
        : row.turmas_count + ' turma(s) • ' + row.total_avaliados + '/' + row.total_estudantes + ' avaliados';

      return ''
        + '<div class="col-12 col-lg-4">'
        + '  <div class="ranking-podium-card' + isFirst + '">'
        + '    <span class="ranking-podium-place">' + esc(place) + '</span>'
        + '    <div class="ranking-podium-title">' + esc(title) + '</div>'
        + '    <div class="ranking-podium-score">' + esc(fmtNota(row.media)) + '</div>'
        + '    <div class="ranking-podium-meta">' + esc(meta) + '</div>'
        + '  </div>'
        + '</div>';
    }).join('');
  }

  function renderTurmaTable(rows, scoreMode) {
    if (!turmasBodyEl) {
      return;
    }

    if (!rows.length) {
      turmasBodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">Nenhuma turma encontrada para o recorte atual.</td></tr>';
      return;
    }

    turmasBodyEl.innerHTML = rows.map(function (row, index) {
      var destaque = row.destaque_nome
        ? (row.destaque_nome + ' • ' + fmtNota(row.destaque_score))
        : 'Sem destaque';
      return ''
        + '<tr>'
        + '  <td class="text-center small fw-semibold">' + esc(index + 1) + '</td>'
        + '  <td><strong>' + esc(row.turma_nome) + '</strong><span class="ranking-table-note">' + esc(String(row.ano_letivo || '-')) + ' • ' + esc(scoreMode) + '</span></td>'
        + '  <td>' + esc(row.ano_escolar_label) + '</td>'
        + '  <td class="text-center"><span class="ranking-table-score">' + esc(fmtNota(row.media)) + '</span><span class="ranking-table-note">' + esc(String(row.proficiencia || '-')) + '</span></td>'
        + '  <td class="text-center">' + esc(row.total_avaliados) + '/' + esc(row.total_estudantes) + '</td>'
        + '  <td class="text-center">' + esc(fmtPct(row.participacao)) + '</td>'
        + '  <td>' + esc(destaque) + '</td>'
        + '</tr>';
    }).join('');
  }

  function renderAnoTable(rows, scoreMode) {
    if (!anosBodyEl) {
      return;
    }

    if (!rows.length) {
      anosBodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">Nenhum ano escolar encontrado para o recorte atual.</td></tr>';
      return;
    }

    anosBodyEl.innerHTML = rows.map(function (row, index) {
      var melhorTurma = row.melhor_turma_nome
        ? (row.melhor_turma_nome + ' • ' + fmtNota(row.melhor_turma_media))
        : 'Sem turma destaque';
      return ''
        + '<tr>'
        + '  <td class="text-center small fw-semibold">' + esc(index + 1) + '</td>'
        + '  <td><strong>' + esc(row.ano_escolar_label) + '</strong><span class="ranking-table-note">' + esc(scoreMode) + '</span></td>'
        + '  <td class="text-center">' + esc(row.turmas_count) + '</td>'
        + '  <td class="text-center"><span class="ranking-table-score">' + esc(fmtNota(row.media)) + '</span><span class="ranking-table-note">' + esc(String(row.proficiencia || '-')) + '</span></td>'
        + '  <td class="text-center">' + esc(row.total_avaliados) + '/' + esc(row.total_estudantes) + '</td>'
        + '  <td class="text-center">' + esc(fmtPct(row.participacao)) + '</td>'
        + '  <td>' + esc(melhorTurma) + '</td>'
        + '</tr>';
    }).join('');
  }

  function renderEstudantesTable(rows) {
    if (!estudantesBodyEl) {
      return;
    }

    if (!rows.length) {
      estudantesBodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">Nenhum estudante com média encontrada para o recorte atual.</td></tr>';
      return;
    }

    estudantesBodyEl.innerHTML = rows.map(function (row, index) {
      return ''
        + '<tr>'
        + '  <td class="text-center small fw-semibold">' + esc(index + 1) + '</td>'
        + '  <td><strong>' + esc(row.aluno_nome) + '</strong></td>'
        + '  <td>' + esc(row.turma_nome || '-') + '</td>'
        + '  <td>' + esc(row.ano_escolar_label || '-') + '</td>'
        + '  <td class="text-center"><span class="ranking-table-score">' + esc(fmtNota(row.score)) + '</span></td>'
        + '  <td class="text-center">' + esc(row.disciplinas_avaliadas) + '</td>'
        + '  <td class="text-center"><span class="badge ' + profBadgeClass(row.proficiencia) + '">' + esc(String(row.proficiencia || '-')) + '</span></td>'
        + '</tr>';
    }).join('');
  }

  function renderDashboard(data) {
    state.rawData = data || {};
    populateDisciplinaSelect(data && Array.isArray(data.disciplinas) ? data.disciplinas : initialDisciplinas);

    updateSummary(turmaSelect, turmasSummaryEl, 'Todas as turmas', 2);
    updateSummary(bimestreSelect, bimestresSummaryEl, 'Todos os bimestres', 2);
    updateSummary(anoSelect, anosSummaryEl, 'Ano atual', 2);
    updateSummary(disciplinaSelect, disciplinasSummaryEl, 'Todos os componentes curriculares', 2);

    var filteredStudents = filterStudentRows(buildStudentRows(state.rawData || {}));
    var turmaRows = buildTurmaRanking(filteredStudents);
    var anoRows = buildAnoRanking(filteredStudents, turmaRows);
    var estudantesRows = buildRankingEstudantes(filteredStudents);
    var scoreMode = buildScoreModeLabel();

    renderOverviewCards(turmaRows, anoRows, estudantesRows, scoreMode);
    renderPodium(turmasPodiumEl, turmaRows, 'turma');
    renderPodium(anosPodiumEl, anoRows, 'ano');
    renderTurmaTable(turmaRows, scoreMode);
    renderAnoTable(anoRows, scoreMode);
    renderEstudantesTable(estudantesRows);

    setText(turmasStatusEl, turmaRows.length + ' turma(s) ranqueada(s) • ' + scoreMode);
    setText(anosStatusEl, anoRows.length + ' grupo(s) de ano escolar • ' + scoreMode);
    setText(estudantesStatusEl, estudantesRows.length + ' estudante(s) com média • ' + scoreMode);

    showStatus(
      turmaRows.length + ' turma(s) • '
      + anoRows.length + ' grupo(s) • '
      + estudantesRows.length + ' estudante(s) ranqueados • '
      + scoreMode
    );
  }

  function renderLoadingState() {
    showStatus('Carregando ranking...');
    setText(turmasStatusEl, 'Carregando...');
    setText(anosStatusEl, 'Carregando...');
    setText(estudantesStatusEl, 'Carregando...');
  }

  function renderErrorState(message) {
    var errorMessage = String(message || 'Não foi possível carregar o ranking.');
    showStatus(errorMessage);
    setText(turmasStatusEl, errorMessage);
    setText(anosStatusEl, errorMessage);
    setText(estudantesStatusEl, errorMessage);

    if (turmasPodiumEl) {
      turmasPodiumEl.innerHTML = '<div class="col-12"><div class="ranking-empty-state text-danger">' + esc(errorMessage) + '</div></div>';
    }
    if (anosPodiumEl) {
      anosPodiumEl.innerHTML = '<div class="col-12"><div class="ranking-empty-state text-danger">' + esc(errorMessage) + '</div></div>';
    }
    if (turmasBodyEl) {
      turmasBodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">' + esc(errorMessage) + '</td></tr>';
    }
    if (anosBodyEl) {
      anosBodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">' + esc(errorMessage) + '</td></tr>';
    }
    if (estudantesBodyEl) {
      estudantesBodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">' + esc(errorMessage) + '</td></tr>';
    }
  }

  function showStatus(message) {
    if (statusEl) {
      statusEl.textContent = String(message || '');
    }
  }

  function loadDashboard() {
    var token = ++loadToken;
    renderLoadingState();

    var qs = collectServerFilters();
    var url = buildEndpoint('/institucional/notas-desempenho/dados') + (qs ? '?' + qs : '');

    return fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (response) {
        return response.json().catch(function () {
          return { ok: false, message: 'Resposta inválida do servidor.' };
        }).then(function (payload) {
          if (!response.ok || !payload || payload.ok !== true) {
            throw new Error(payload && payload.message ? payload.message : 'Não foi possível carregar o ranking.');
          }
          return payload;
        });
      })
      .then(function (payload) {
        if (token !== loadToken) {
          return null;
        }
        renderDashboard(payload.data || {});
        return payload.data || {};
      })
      .catch(function (error) {
        if (token !== loadToken) {
          return null;
        }
        renderErrorState(error && error.message ? error.message : 'Não foi possível carregar o ranking.');
        return null;
      });
  }

  attachFilterModal({
    openBtn: document.getElementById('notasFilterTurmasOpenBtn'),
    select: turmaSelect,
    listEl: document.getElementById('notasFilterTurmasList'),
    modalEl: document.getElementById('notasFilterTurmasModal'),
    selectAllBtn: document.getElementById('notasFilterTurmasSelectAllBtn'),
    clearBtn: document.getElementById('notasFilterTurmasClearBtn'),
    applyBtn: document.getElementById('notasFilterTurmasApplyBtn'),
    summaryEl: turmasSummaryEl,
    defaultLabel: 'Todas as turmas',
    prefix: 'ranking_turmas',
    reloadMode: 'server'
  });

  attachFilterModal({
    openBtn: document.getElementById('notasFilterBimestresOpenBtn'),
    select: bimestreSelect,
    listEl: document.getElementById('notasFilterBimestresList'),
    modalEl: document.getElementById('notasFilterBimestresModal'),
    selectAllBtn: document.getElementById('notasFilterBimestresSelectAllBtn'),
    clearBtn: document.getElementById('notasFilterBimestresClearBtn'),
    applyBtn: document.getElementById('notasFilterBimestresApplyBtn'),
    summaryEl: bimestresSummaryEl,
    defaultLabel: 'Todos os bimestres',
    prefix: 'ranking_bimestres',
    reloadMode: 'server'
  });

  attachFilterModal({
    openBtn: document.getElementById('notasFilterAnosOpenBtn'),
    select: anoSelect,
    listEl: document.getElementById('notasFilterAnosList'),
    modalEl: document.getElementById('notasFilterAnosModal'),
    selectAllBtn: document.getElementById('notasFilterAnosSelectAllBtn'),
    clearBtn: document.getElementById('notasFilterAnosClearBtn'),
    applyBtn: document.getElementById('notasFilterAnosApplyBtn'),
    summaryEl: anosSummaryEl,
    defaultLabel: 'Ano atual',
    prefix: 'ranking_anos',
    reloadMode: 'server'
  });

  attachFilterModal({
    openBtn: document.getElementById('notasFilterDisciplinasOpenBtn'),
    select: disciplinaSelect,
    listEl: document.getElementById('notasFilterDisciplinasList'),
    modalEl: document.getElementById('notasFilterDisciplinasModal'),
    selectAllBtn: document.getElementById('notasFilterDisciplinasSelectAllBtn'),
    clearBtn: document.getElementById('notasFilterDisciplinasClearBtn'),
    applyBtn: document.getElementById('notasFilterDisciplinasApplyBtn'),
    summaryEl: disciplinasSummaryEl,
    defaultLabel: 'Todos os componentes curriculares',
    prefix: 'ranking_disciplinas',
    reloadMode: 'local'
  });

  if (disciplinaSelect) {
    disciplinaSelect.addEventListener('change', function () {
      renderDashboard(state.rawData || {});
    });
  }

  if (buscaInput) {
    buscaInput.addEventListener('input', function () {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () {
        renderDashboard(state.rawData || {});
      }, 180);
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      loadDashboard();
    });
  }

  populateTurmaSelect();
  populateDisciplinaSelect(initialDisciplinas);
  updateSummary(turmaSelect, turmasSummaryEl, 'Todas as turmas', 2);
  updateSummary(bimestreSelect, bimestresSummaryEl, 'Todos os bimestres', 2);
  updateSummary(anoSelect, anosSummaryEl, 'Ano atual', 2);
  updateSummary(disciplinaSelect, disciplinasSummaryEl, 'Todos os componentes curriculares', 2);

  loadDashboard();
}());
