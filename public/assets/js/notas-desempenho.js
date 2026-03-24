(function () {
  'use strict';

  /* ====================================================================
   *  Utilitários
   * ==================================================================== */

  function parseJsonScript(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    try { var p = JSON.parse(String(el.textContent || '').trim() || 'null'); return p === null ? fallback : p; }
    catch (_) { return fallback; }
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function fmtDecimal(v) {
    if (v === null || v === undefined || v === '') return '-';
    var n = Number(v);
    return isFinite(n) ? n.toFixed(1).replace('.', ',') : '-';
  }

  function fmtNota(v) {
    return fmtDecimal(v);
  }

  function fmtPct(v) {
    if (v === null || v === undefined) return '-';
    var n = Number(v);
    return isFinite(n) ? n.toFixed(1).replace('.', ',') + '%' : '-';
  }

  function fmtDate(v) {
    var s = String(v || '').trim();
    if (!s) return '-';
    var d = new Date(s.length <= 10 ? s + 'T00:00:00' : s.replace(' ', 'T'));
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
  }

  function dateInputValueLocal(date) {
    var value = date instanceof Date ? date : new Date();
    var year = value.getFullYear();
    var month = String(value.getMonth() + 1).padStart(2, '0');
    var day = String(value.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function fmtScore(nota, max) {
    var n = Number(nota);
    if (!isFinite(n)) return '-';
    var m = Number(max);
    if (isFinite(m) && m > 0) return fmtDecimal(n) + ' / ' + fmtDecimal(m);
    return fmtDecimal(n);
  }

  function buildEndpoint(path) {
    return typeof window.appBuildEndpoint === 'function' ? window.appBuildEndpoint(path) : path;
  }

  function normalizeText(value) {
    var text = String(value || '').trim().toLowerCase();
    if (!text) return '';

    if (typeof text.normalize === 'function') {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    return text;
  }

  function isDisciplinaLinguaPortuguesa(value) {
    var text = normalizeText(value);
    if (!text) return false;

    return text.indexOf('lingua portuguesa') >= 0 || text.indexOf('portugues') >= 0;
  }

  function profBadgeClass(prof) {
    if (!prof) return '';
    var p = String(prof).toLowerCase();
    if (p.indexOf('avan') === 0) return 'bg-success';
    if (p.indexOf('adequ') === 0) return 'bg-primary';
    if (p.indexOf('insu') === 0) return 'bg-warning text-dark';
    return 'bg-danger';
  }

  function classificarProficienciaPorNota(nota) {
    var n = Number(nota);
    if (!isFinite(n)) return null;
    if (n >= 9.5) return 'Avançado';
    if (n >= 6) return 'Adequado';
    if (n >= 4) return 'Insuficiente';
    return 'Crítico';
  }

  function profCellStyle(prof) {
    if (!prof) return '';
    var p = String(prof).toLowerCase();
    if (p.indexOf('avan') === 0) return 'background:#d1e7dd;';
    if (p.indexOf('adequ') === 0) return 'background:#cfe2ff;';
    if (p.indexOf('insu') === 0) return 'background:#fff3cd;';
    return 'background:#f8d7da;';
  }

  function diagColor(faixa) {
    var f = String(faixa || '').toLowerCase();
    if (f === 'alto') return '#198754';
    if (f === 'medio_alto') return '#0d6efd';
    if (f === 'medio_baixo') return '#fd7e14';
    return '#dc3545';
  }

  /* ====================================================================
   *  Init
   * ==================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('notasDesempenhoRoot');
    if (!root) return;

    var initialTurmas = parseJsonScript('notasDesempenhoTurmasData', []);
    var initialAlunos = parseJsonScript('notasDesempenhoAlunosData', []);
    var initialCategorias = parseJsonScript('notasDesempenhoCategoriasData', []);
    var initialDisciplinas = parseJsonScript('notasDesempenhoDisciplinasData', []);

    // DOM refs
    var turmaSelect = document.getElementById('notasDesempenhoTurma');
    var bimestreSelect = document.getElementById('notasDesempenhoBimestre');
    var anoSelect = document.getElementById('notasDesempenhoAno');
    var buscaInput = document.getElementById('notasDesempenhoBusca');
    var statusEl = document.getElementById('notasDesempenhoStatus');
    var overviewCards = document.getElementById('notasDesempenhoOverviewCards');
    var faixasBar = document.getElementById('notasDesempenhoFaixasBar');
    var disciplinaSelect = document.getElementById('notasDesempenhoDisciplinaSelect');
    var boletimContainer = document.getElementById('notasDesempenhoBoletimContainer');
    var boletimTable = document.getElementById('notasDesempenhoBoletimTable');
    var boletimXScroll = document.getElementById('notasDesempenhoBoletimXScroll');
    var boletimXScrollTrack = document.getElementById('notasDesempenhoBoletimXScrollTrack');
    var boletimHead = document.getElementById('notasDesempenhoBoletimHead');
    var boletimBody = document.getElementById('notasDesempenhoBoletimBody');
    var boletimOrigemModalEl = document.getElementById('notasDesempenhoBoletimOrigemModal');
    var boletimOrigemModalLabel = document.getElementById('notasDesempenhoBoletimOrigemModalLabel');
    var boletimOrigemModalBody = document.getElementById('notasDesempenhoBoletimOrigemModalBody');
    var correcaoDisciplinaModalEl = document.getElementById('notasDesempenhoCorrecaoDisciplinaModal');
    var correcaoDisciplinaModalLabel = document.getElementById('notasDesempenhoCorrecaoDisciplinaModalLabel');
    var correcaoDisciplinaResumo = document.getElementById('notasDesempenhoCorrecaoDisciplinaResumo');
    var correcaoDisciplinaBody = document.getElementById('notasDesempenhoCorrecaoDisciplinaBody');
    var correcaoDisciplinaError = document.getElementById('notasDesempenhoCorrecaoDisciplinaError');
    var correcaoDisciplinaSalvarBtn = document.getElementById('notasDesempenhoCorrecaoDisciplinaSalvarBtn');
    var confirmModalEl = document.getElementById('notasDesempenhoConfirmModal');
    var confirmModalLabel = document.getElementById('notasDesempenhoConfirmModalLabel');
    var confirmModalBody = document.getElementById('notasDesempenhoConfirmModalBody');
    var confirmModalConfirmBtn = document.getElementById('notasDesempenhoConfirmModalConfirmBtn');
    var diagContent = document.getElementById('notasDesempenhoDiagnosticoContent');
    var painelGraficoEl = document.getElementById('notasDesempenhoPainelGrafico');
    var entriesBody = document.getElementById('notasDesempenhoEntriesBody');
    var sgeBody = document.getElementById('notasDesempenhoSgeBody');
    var sgeStatus = document.getElementById('notasDesempenhoSgeStatus');
    var exportSgeBtn = document.getElementById('notasDesempenhoExportSgeBtn');
    var novoBtn = document.getElementById('notasDesempenhoNovoLancamentoBtn');
    var formModalEl = document.getElementById('notasDesempenhoFormModal');
    var formEl = document.getElementById('notasDesempenhoForm');
    var formTitle = document.getElementById('notasDesempenhoFormModalLabel');
    var formError = document.getElementById('notasDesempenhoFormError');
    var formSubmitBtn = document.getElementById('notasDesempenhoFormSubmitBtn');
    var recordIdInput = document.getElementById('notasDesempenhoRecordId');
    var formNotaWrap = document.getElementById('notasDesempenhoFormNotaWrap');
    var formAlunoSelect = formEl ? formEl.querySelector('[name="aluno_id"]') : null;
    var formTurmaSelect = formEl ? formEl.querySelector('[name="turma_id"]') : null;
    var formDisciplinaInput = document.getElementById('notasDesempenhoFormDisciplina');
    var formDisciplinasList = document.getElementById('notasDesempenhoDisciplinasList');
    var formCategoriaSelect = document.getElementById('notasDesempenhoFormCategoria');
    var formCicloWrap = document.getElementById('notasDesempenhoFormCicloWrap');
    var formCicloSelect = document.getElementById('notasDesempenhoFormCiclo');
    var bulkNotasWrap = document.getElementById('notasDesempenhoBulkNotasWrap');
    var bulkNotasBody = document.getElementById('notasDesempenhoBulkNotasBody');
    var formNotaInput = document.getElementById('notasDesempenhoFormNota');
    var formAlunosModalEl = document.getElementById('notasFormAlunosModal');
    var formAlunosOpenBtn = document.getElementById('notasFormAlunosOpenBtn');
    var formAlunosApplyBtn = document.getElementById('notasFormAlunosApplyBtn');
    var formAlunosSelectAllBtn = document.getElementById('notasFormAlunosSelectAllBtn');
    var formAlunosClearBtn = document.getElementById('notasFormAlunosClearBtn');
    var formAlunosBuscaInput = document.getElementById('notasFormAlunosBusca');
    var formAlunosListEl = document.getElementById('notasFormAlunosList');
    var formAlunosSummaryEl = document.getElementById('notasFormAlunosSummary');
    var csrfInput = formEl ? formEl.querySelector('input[name="csrf_token"]') : null;
    var formModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && formModalEl)
      ? bootstrap.Modal.getOrCreateInstance(formModalEl) : null;
    var boletimOrigemModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && boletimOrigemModalEl)
      ? bootstrap.Modal.getOrCreateInstance(boletimOrigemModalEl) : null;
    var correcaoDisciplinaModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && correcaoDisciplinaModalEl)
      ? bootstrap.Modal.getOrCreateInstance(correcaoDisciplinaModalEl) : null;
    var confirmModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && confirmModalEl)
      ? bootstrap.Modal.getOrCreateInstance(confirmModalEl) : null;

    var turmasModalEl = document.getElementById('notasFilterTurmasModal');
    var bimestresModalEl = document.getElementById('notasFilterBimestresModal');
    var anosModalEl = document.getElementById('notasFilterAnosModal');
    var disciplinasModalEl = document.getElementById('notasFilterDisciplinasModal');
    var turmasModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && turmasModalEl)
      ? bootstrap.Modal.getOrCreateInstance(turmasModalEl) : null;
    var bimestresModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && bimestresModalEl)
      ? bootstrap.Modal.getOrCreateInstance(bimestresModalEl) : null;
    var anosModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && anosModalEl)
      ? bootstrap.Modal.getOrCreateInstance(anosModalEl) : null;
    var disciplinasModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && disciplinasModalEl)
      ? bootstrap.Modal.getOrCreateInstance(disciplinasModalEl) : null;
    var formAlunosModal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && formAlunosModalEl)
      ? bootstrap.Modal.getOrCreateInstance(formAlunosModalEl) : null;

    // ----- Seletor de Habilidades -----
    var notasHbSelectorModalEl = document.getElementById('notasHabilidadeSelectorModal');
    var notasHbSelectorSearch = document.getElementById('notasHabilidadeSelectorSearch');
    var notasHbSelectorList = document.getElementById('notasHabilidadeSelectorList');
    var notasHbSelectorFieldLabel = document.getElementById('notasHabilidadeSelectorFieldLabel');
    var notasHbSelectorDisciplinaInfo = document.getElementById('notasHabilidadeSelectorDisciplinaInfo');
    var notasHbSelectorCount = document.getElementById('notasHabilidadeSelectorCount');
    var notasHbSelectorConfirmBtn = document.getElementById('notasHabilidadeSelectorConfirmBtn');
    var notasHbSelectorCustomInput = document.getElementById('notasHabilidadeSelectorCustomInput');
    var notasHbSelectorCustomAddBtn = document.getElementById('notasHabilidadeSelectorCustomAddBtn');
    var notasHbSelectorFilterBtns = notasHbSelectorModalEl ? notasHbSelectorModalEl.querySelectorAll('[data-notas-hb-filter]') : [];
    var notasHbSelectorBsModal = null;
    var notasHbSelectorCache = null;
    var notasHbSelectorActiveField = '';
    var notasHbSelectorActiveFilter = 'todos';
    var notasHbSelectorSelected = [];
    var notasHbAvaliadasSelected = [];

    var AUTO_REFRESH_INTERVAL = 5000;
    var loadToken = 0;
    var state = { data: null, entriesById: {}, scopePairs: {}, disciplinasCatalog: [] };
    var boletimScrollSyncing = false;
    var formFromOrigemContext = null;
    var origemLancamentoHighlight = { id: '', until: 0 };
    var origemBimestreSelecionado = {};
    var origemModalContext = null;
    var correcaoDisciplinaState = { payload: null, context: null };
    var confirmAction = null;
    var autoRefreshTimer = 0;
    var lastDashboardSignature = '';
    var pendingDashboardData = null;
    var pendingDashboardSignature = '';

    function syncBoletimXScroll() {
      if (!boletimContainer || !boletimTable || !boletimXScroll || !boletimXScrollTrack) return;

      var tableWidth = boletimTable.scrollWidth || 0;
      var containerWidth = boletimContainer.clientWidth || 0;

      boletimXScrollTrack.style.width = tableWidth + 'px';
      boletimXScroll.style.display = tableWidth > containerWidth ? 'block' : 'none';

      if (!boletimScrollSyncing) {
        boletimXScroll.scrollLeft = boletimContainer.scrollLeft;
      }
    }

    function isModalShown(element) {
      return !!(element && element.classList && element.classList.contains('show'));
    }

    function captureDashboardViewState() {
      return {
        boletimScrollTop: boletimContainer ? boletimContainer.scrollTop : 0,
        boletimScrollLeft: boletimContainer ? boletimContainer.scrollLeft : 0,
        boletimXScrollLeft: boletimXScroll ? boletimXScroll.scrollLeft : 0,
      };
    }

    function restoreDashboardViewState(viewState) {
      if (!viewState || !boletimContainer) {
        setTimeout(syncBoletimXScroll, 0);
        return;
      }

      boletimContainer.scrollTop = Number(viewState.boletimScrollTop || 0);
      boletimContainer.scrollLeft = Number(viewState.boletimScrollLeft || 0);
      if (boletimXScroll) {
        boletimXScroll.scrollLeft = Number(viewState.boletimXScrollLeft || viewState.boletimScrollLeft || 0);
      }

      setTimeout(syncBoletimXScroll, 0);
    }

    function buildDashboardSignature(data) {
      try {
        return JSON.stringify(data || {});
      } catch (_) {
        return String(Date.now());
      }
    }

    function hasBlockingAutoRefreshInteraction() {
      if (isModalShown(formModalEl) || isModalShown(correcaoDisciplinaModalEl) || isModalShown(confirmModalEl)) {
        return true;
      }

      var active = document.activeElement;
      if (!(active instanceof HTMLElement)) {
        return false;
      }

      if (active.closest('#notasDesempenhoFormModal, #notasDesempenhoCorrecaoDisciplinaModal')) {
        return true;
      }

      return false;
    }

    function applyPendingDashboardUpdate() {
      if (!pendingDashboardData || !pendingDashboardSignature) {
        return;
      }
      if (hasBlockingAutoRefreshInteraction()) {
        return;
      }

      var nextData = pendingDashboardData;
      var nextSignature = pendingDashboardSignature;
      pendingDashboardData = null;
      pendingDashboardSignature = '';
      applyDashboardData(nextData, nextSignature, { preserveView: true, syncOrigemModal: true });
    }

    function selectedValues(selectElement) {
      if (!selectElement) return [];
      var values = [];
      Array.prototype.slice.call(selectElement.options || []).forEach(function (option) {
        if (option && option.selected) {
          var v = String(option.value || '').trim();
          if (v !== '') values.push(v);
        }
      });
      return values;
    }

    function firstSelectedValue(selectElement, fallback) {
      var values = selectedValues(selectElement);
      return values.length ? values[0] : (fallback || '');
    }

    function enableClickToggleMulti(selectElement) {
      if (!selectElement || !selectElement.multiple) return;
      selectElement.addEventListener('mousedown', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLOptionElement)) return;
        event.preventDefault();
        target.selected = !target.selected;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    function optionLabelByValue(selectElement, value) {
      if (!selectElement) return value;
      var found = Array.prototype.slice.call(selectElement.options || []).find(function (option) {
        return String(option.value) === String(value);
      });
      return found ? String(found.textContent || found.label || value).trim() : String(value);
    }

    function buildScopePairsMap(data) {
      var raw = data && typeof data === 'object' && data.scope_pairs && typeof data.scope_pairs === 'object'
        ? data.scope_pairs
        : {};
      var result = {};

      Object.keys(raw).forEach(function (turmaId) {
        var turmaKey = String(turmaId || '').trim();
        if (!turmaKey) return;
        var byDisc = raw[turmaId];
        if (!byDisc || typeof byDisc !== 'object') return;

        result[turmaKey] = {};
        Object.keys(byDisc).forEach(function (discNorm) {
          var normalized = normalizeText(discNorm);
          if (!normalized) return;
          var label = String(byDisc[discNorm] == null ? '' : byDisc[discNorm]).trim();
          result[turmaKey][normalized] = label;
        });
      });

      if (Object.keys(result).length) {
        return result;
      }

      var fallback = {};
      var boletim = data && Array.isArray(data.boletim) ? data.boletim : [];
      boletim.forEach(function (row) {
        var turmaId = String(row && row.turma_id != null ? row.turma_id : '').trim();
        if (!turmaId) return;
        if (!fallback[turmaId]) fallback[turmaId] = {};

        var disciplinas = row && row.disciplinas && typeof row.disciplinas === 'object' ? row.disciplinas : {};
        Object.keys(disciplinas).forEach(function (discLabel) {
          var norm = normalizeText(discLabel);
          if (!norm) return;
          fallback[turmaId][norm] = String(discLabel || '').trim();
        });
      });

      return fallback;
    }

    function buildDisciplinasCatalog(data) {
      var map = {};

      (Array.isArray(initialDisciplinas) ? initialDisciplinas : []).forEach(function (item) {
        var label = String(item && item.nome ? item.nome : '').trim();
        var key = normalizeText(label);
        if (key) {
          map[key] = label;
        }
      });

      (data && Array.isArray(data.disciplinas) ? data.disciplinas : []).forEach(function (labelRaw) {
        var label = String(labelRaw || '').trim();
        var key = normalizeText(label);
        if (key) {
          map[key] = label;
        }
      });

      return Object.keys(map).map(function (key) {
        return map[key];
      }).sort(function (a, b) {
        return String(a).localeCompare(String(b), 'pt-BR');
      });
    }

    function getAllowedDisciplinasForTurma(turmaIdValue) {
      var turmaId = String(turmaIdValue || '').trim();
      if (!turmaId) {
        return [];
      }

      var pairMap = state && state.scopePairs && state.scopePairs[turmaId] ? state.scopePairs[turmaId] : {};
      var labelsByNorm = {};

      Object.keys(pairMap).forEach(function (discNorm) {
        var normalized = normalizeText(discNorm);
        if (!normalized) return;
        var label = String(pairMap[discNorm] || '').trim();
        if (label) {
          labelsByNorm[normalized] = label;
          return;
        }

        var fromCatalog = (Array.isArray(state.disciplinasCatalog) ? state.disciplinasCatalog : []).find(function (catalogLabel) {
          return normalizeText(catalogLabel) === normalized;
        });
        labelsByNorm[normalized] = fromCatalog || discNorm;
      });

      return Object.keys(labelsByNorm).map(function (key) {
        return labelsByNorm[key];
      }).sort(function (a, b) {
        return String(a).localeCompare(String(b), 'pt-BR');
      });
    }

    function isDisciplinaAllowedForTurma(turmaIdValue, disciplinaValue) {
      var turmaId = String(turmaIdValue || '').trim();
      var disciplinaNorm = normalizeText(disciplinaValue);
      if (!turmaId || !disciplinaNorm) {
        return false;
      }

      var pairMap = state && state.scopePairs && state.scopePairs[turmaId] ? state.scopePairs[turmaId] : null;
      if (!pairMap || typeof pairMap !== 'object') {
        return false;
      }

      return Object.prototype.hasOwnProperty.call(pairMap, disciplinaNorm);
    }

    function updateFormDisciplinaOptions(turmaIdValue) {
      if (!formDisciplinaInput || !formDisciplinasList) {
        return;
      }

      var turmaId = String(turmaIdValue || '').trim();
      var allowed = getAllowedDisciplinasForTurma(turmaId);
      formDisciplinasList.innerHTML = allowed.map(function (disciplina) {
        return '<option value="' + esc(disciplina) + '">';
      }).join('');

      formDisciplinaInput.disabled = turmaId === '';

      var currentDisc = String(formDisciplinaInput.value || '').trim();
      if (currentDisc && !isDisciplinaAllowedForTurma(turmaId, currentDisc)) {
        formDisciplinaInput.value = '';
      }
    }

    function updateSummary(selectElement, summaryElement, emptyLabel, maxItems) {
      if (!summaryElement) return;
      var values = selectedValues(selectElement);
      if (!values.length) {
        summaryElement.textContent = emptyLabel;
        return;
      }
      var labels = values.map(function (value) { return optionLabelByValue(selectElement, value); });
      var limit = maxItems || 3;
      if (labels.length <= limit) {
        summaryElement.textContent = labels.join(' • ');
        return;
      }
      summaryElement.textContent = labels.slice(0, limit).join(' • ') + ' +' + (labels.length - limit);
    }

    function renderModalChecklistFromSelect(selectElement, listElement, checkboxName) {
      if (!selectElement || !listElement) return;
      var options = Array.prototype.slice.call(selectElement.options || []);
      if (!options.length) {
        listElement.innerHTML = '<div class="small text-secondary">Nenhuma opção disponível.</div>';
        return;
      }

      listElement.innerHTML = options.map(function (option, index) {
        var value = String(option.value || '').trim();
        if (!value) return '';
        var checked = option.selected ? ' checked' : '';
        var id = checkboxName + '_' + index;
        return '<div class="form-check">'
          + '<input class="form-check-input js-filter-modal-checkbox" type="checkbox" id="' + esc(id) + '" data-value="' + esc(value) + '" data-select="' + esc(selectElement.id) + '"' + checked + '>'
          + '<label class="form-check-label" for="' + esc(id) + '">' + esc(String(option.textContent || option.label || value).trim()) + '</label>'
          + '</div>';
      }).join('');
    }

    function applyChecklistToSelect(selectElement, listElement) {
      if (!selectElement || !listElement) return;
      var selectedMap = {};
      listElement.querySelectorAll('.js-filter-modal-checkbox').forEach(function (checkbox) {
        if (checkbox.checked) selectedMap[String(checkbox.getAttribute('data-value') || '')] = true;
      });
      Array.prototype.slice.call(selectElement.options || []).forEach(function (option) {
        option.selected = selectedMap[String(option.value || '')] === true;
      });
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function openConfirmModal(title, message, onConfirm) {
      if (!confirmModal || !confirmModalConfirmBtn) {
        if (typeof onConfirm === 'function') {
          onConfirm();
        }
        return;
      }

      confirmAction = typeof onConfirm === 'function' ? onConfirm : null;
      if (confirmModalLabel) {
        confirmModalLabel.textContent = String(title || 'Confirmar ação');
      }
      if (confirmModalBody) {
        confirmModalBody.textContent = String(message || 'Tem certeza que deseja continuar?');
      }
      confirmModalConfirmBtn.disabled = false;
      confirmModal.show();
    }

    function setAllChecklist(listElement, shouldSelect) {
      if (!listElement) return;
      listElement.querySelectorAll('.js-filter-modal-checkbox').forEach(function (checkbox) {
        checkbox.checked = !!shouldSelect;
      });
    }

    function filterChecklistByText(listElement, rawTerm) {
      if (!listElement) {
        return;
      }

      var term = normalizeText(rawTerm);
      listElement.querySelectorAll('.form-check').forEach(function (itemEl) {
        if (!(itemEl instanceof HTMLElement)) {
          return;
        }

        if (term === '') {
          itemEl.classList.remove('d-none');
          return;
        }

        var labelEl = itemEl.querySelector('.form-check-label');
        var labelText = normalizeText(labelEl ? String(labelEl.textContent || '') : '');
        itemEl.classList.toggle('d-none', labelText.indexOf(term) === -1);
      });
    }

    /* ---- populate turma filter ---- */
    (function () {
      if (!turmaSelect) return;
      var html = '';
      (Array.isArray(initialTurmas) ? initialTurmas : []).forEach(function (t) {
        html += '<option value="' + esc(t.id) + '">' + esc(t.nome) + '</option>';
      });
      turmaSelect.innerHTML = html;
    })();

    var turmasSummaryEl = document.getElementById('notasFilterTurmasSummary');
    var bimestresSummaryEl = document.getElementById('notasFilterBimestresSummary');
    var anosSummaryEl = document.getElementById('notasFilterAnosSummary');
    var disciplinasSummaryEl = document.getElementById('notasFilterDisciplinasSummary');

    var turmasListEl = document.getElementById('notasFilterTurmasList');
    var bimestresListEl = document.getElementById('notasFilterBimestresList');
    var anosListEl = document.getElementById('notasFilterAnosList');
    var disciplinasListEl = document.getElementById('notasFilterDisciplinasList');

    /* ====================================================================
     *  Filters
     * ==================================================================== */

    function collectFilters() {
      return {
        turma_ids: selectedValues(turmaSelect).join(','),
        bimestres: selectedValues(bimestreSelect).join(','),
        anos_letivos: selectedValues(anoSelect).join(','),
        busca: buscaInput ? buscaInput.value : '',
      };
    }

    function queryString(f) {
      var sp = new URLSearchParams();
      Object.keys(f || {}).forEach(function (k) {
        var v = String(f[k] || '').trim();
        if (v) sp.set(k, v);
      });
      return sp.toString();
    }

    function showStatus(msg) { if (statusEl) statusEl.textContent = msg; }

    /* ====================================================================
     *  Overview cards
     * ==================================================================== */

    function renderOverview(data) {
      if (!overviewCards) return;
      var ov = (data && data.overview) || {};
      overviewCards.querySelectorAll('[data-card]').forEach(function (el) {
        var k = el.getAttribute('data-card');
        if (k === 'media_geral') {
          el.textContent = ov.media_geral != null ? fmtNota(ov.media_geral) : '-';
        } else {
          el.textContent = String(ov[k] != null ? ov[k] : 0);
        }
      });
      var subPart = overviewCards.querySelector('[data-card-sub="participacao"]');
      if (subPart) {
        subPart.textContent = ov.participacao != null ? fmtPct(ov.participacao) + ' participação' : '';
      }

      // faixas bar
      if (faixasBar) {
        var fx = ov.faixas || {};
        var total = (fx.avancado || 0) + (fx.adequado || 0) + (fx.insuficiente || 0) + (fx.critico || 0);
        if (total <= 0) {
          faixasBar.innerHTML = '<small class="text-secondary">Sem dados</small>';
          return;
        }
        var segments = [
          { label: 'Avançado', count: fx.avancado || 0, bg: '#198754' },
          { label: 'Adequado', count: fx.adequado || 0, bg: '#0d6efd' },
          { label: 'Insuficiente', count: fx.insuficiente || 0, bg: '#ffc107' },
          { label: 'Crítico', count: fx.critico || 0, bg: '#dc3545' },
        ];
        var barHtml = '<div class="d-flex rounded overflow-hidden" style="height:18px;">';
        segments.forEach(function (s) {
          if (s.count <= 0) return;
          var pct = ((s.count / total) * 100).toFixed(1);
          barHtml += '<div style="width:' + pct + '%;background:' + s.bg + ';" title="' + esc(s.label) + ': ' + s.count + ' (' + pct + '%)"></div>';
        });
        barHtml += '</div>';
        barHtml += '<div class="d-flex gap-2 mt-1 flex-wrap">';
        segments.forEach(function (s) {
          barHtml += '<small><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + s.bg + ';"></span> ' + s.count + ' ' + esc(s.label) + '</small>';
        });
        barHtml += '</div>';
        faixasBar.innerHTML = barHtml;
      }
    }

    /* ====================================================================
     *  Boletim tab
     * ==================================================================== */

    function populateDisciplinaSelect(disciplinas) {
      if (!disciplinaSelect) return;
      var current = selectedValues(disciplinaSelect);
      var currentMap = {};
      current.forEach(function (value) { currentMap[String(value)] = true; });
      var html = '';
      (Array.isArray(disciplinas) ? disciplinas : []).forEach(function (d) {
        html += '<option value="' + esc(d) + '"' + (currentMap[String(d)] ? ' selected' : '') + '>' + esc(d) + '</option>';
      });
      disciplinaSelect.innerHTML = html;

      updateSummary(disciplinaSelect, disciplinasSummaryEl, 'Todas as disciplinas', 2);
    }

    function renderBoletimOverview(data, selectedDisciplinas) {
      if (!boletimHead || !boletimBody) return;
      var boletim = (data && Array.isArray(data.boletim)) ? data.boletim : [];
      var disciplinasBase = (data && Array.isArray(data.disciplinas)) ? data.disciplinas : [];
      var disciplinas = disciplinasBase;
      if (Array.isArray(selectedDisciplinas) && selectedDisciplinas.length) {
        var selectedMap = {};
        selectedDisciplinas.forEach(function (value) { selectedMap[String(value)] = true; });
        disciplinas = disciplinasBase.filter(function (value) { return selectedMap[String(value)] === true; });
      }

      // Header
      var th = '<th class="text-center" style="min-width:40px;">#</th><th style="min-width:180px;">Estudante</th>';
      disciplinas.forEach(function (d) {
        th += '<th class="text-center" style="min-width:80px;font-size:0.75rem;">' + esc(d) + '</th>';
      });
      th += '<th class="text-center" style="min-width:90px;">Proficiência</th>';
      boletimHead.innerHTML = th;

      if (!boletim.length) {
        boletimBody.innerHTML = '<tr><td colspan="' + (disciplinas.length + 3) + '" class="text-center text-secondary py-4">Nenhum estudante encontrado.</td></tr>';
        return;
      }

      var rows = '';
      boletim.forEach(function (row, idx) {
        rows += '<tr>';
        rows += '<td class="text-center small">' + (idx + 1) + '</td>';
        rows += '<td><strong>' + esc(row.aluno_nome) + '</strong>';
        if (row.turma_nome) rows += '<div class="small text-secondary">' + esc(row.turma_nome) + '</div>';
        rows += '</td>';

        var somaFinais = 0;
        var totalFinais = 0;

        disciplinas.forEach(function (d) {
          var disc = (row.disciplinas && row.disciplinas[d]) ? row.disciplinas[d] : {};
          var nf = disc.nota_final;
          var prof = disc.proficiencia;
          if (isFinite(Number(nf))) {
            somaFinais += Number(nf);
            totalFinais += 1;
          }
          var style = prof ? profCellStyle(prof) : '';
          rows += '<td class="text-center js-notas-boletim-origem" style="' + style + '" '
            + 'data-aluno-id="' + esc(row.aluno_id) + '" data-disc="' + esc(d) + '" '
            + 'title="Clique para ver origem de ' + esc(d) + ': ' + fmtNota(nf) + (prof ? ' (' + prof + ')' : '') + '">' + fmtNota(nf) + '</td>';
        });

        var mediaRecorte = totalFinais > 0 ? (somaFinais / totalFinais) : null;
        var profRecorte = classificarProficienciaPorNota(mediaRecorte);
        rows += '<td class="text-center"><span class="badge ' + profBadgeClass(profRecorte) + '">' + esc(profRecorte || '-') + '</span></td>';
        rows += '</tr>';
      });

      boletimBody.innerHTML = rows;
    }

    function renderBoletimDisciplina(data, disc) {
      if (!boletimHead || !boletimBody) return;
      var boletim = (data && Array.isArray(data.boletim)) ? data.boletim : [];
      var permiteProdTextual = isDisciplinaLinguaPortuguesa(disc);
      var mediaFormulaLabel = permiteProdTextual ? '(50+30+20)' : '(50+50)';

      function resolveAvaliacaoAutoValue(grade) {
        var d = grade && typeof grade === 'object' ? grade : {};
        if (d.avaliacao != null) return d.avaliacao;
        if (d.avaliacao_ciclo_2 != null) return d.avaliacao_ciclo_2;
        if (d.simulado != null) return d.simulado;
        return null;
      }

      function origemAttrs(currentRow, label) {
        return ' class="text-center js-notas-boletim-origem" data-aluno-id="' + esc(currentRow.aluno_id) + '" data-disc="' + esc(disc) + '" title="Clique para ver origem de ' + esc(label) + '"';
      }

      var th = '<th class="text-center" style="min-width:40px;">#</th>'
        + '<th style="min-width:180px;">Estudante</th>'
        + '<th class="text-center" style="min-width:80px;">Avaliação<div class="small fw-normal text-secondary">(auto)</div></th>'
        + '<th class="text-center" style="min-width:90px;">Subjetiva<div class="small fw-normal text-secondary">(0-10)</div></th>'
        + (permiteProdTextual
          ? '<th class="text-center" style="min-width:90px;">Prod. Textual<div class="small fw-normal text-secondary">(0-10)</div></th>'
          : '')
        + '<th class="text-center" style="min-width:70px;">Média<div class="small fw-normal text-secondary">' + mediaFormulaLabel + '</div></th>'
        + '<th class="text-center" style="min-width:90px;">Recuperação<div class="small fw-normal text-secondary">(0-10)</div></th>'
        + '<th class="text-center" style="min-width:70px;">Final</th>'
        + '<th class="text-center" style="min-width:90px;">Proficiência</th>';
      boletimHead.innerHTML = th;

      if (!boletim.length) {
        boletimBody.innerHTML = '<tr><td colspan="' + (permiteProdTextual ? '9' : '8') + '" class="text-center text-secondary py-4">Nenhum estudante encontrado.</td></tr>';
        return;
      }

      var rows = '';
      boletim.forEach(function (row, idx) {
        var d = (row.disciplinas && row.disciplinas[disc]) ? row.disciplinas[disc] : {};
        var avaliacaoAuto = resolveAvaliacaoAutoValue(d);
        rows += '<tr>';
        rows += '<td class="text-center small">' + (idx + 1) + '</td>';
        rows += '<td><strong>' + esc(row.aluno_nome) + '</strong></td>';

        // Avaliação (auto – não editável)
        rows += '<td class="text-center js-notas-boletim-origem" data-aluno-id="' + esc(row.aluno_id) + '" data-disc="' + esc(disc) + '" title="Clique para ver origem da nota">' + fmtNota(avaliacaoAuto) + '</td>';

        rows += '<td' + origemAttrs(row, 'Subjetiva') + '>' + fmtNota(d.subjetiva) + '</td>';

        // Prod. Textual (somente em Língua Portuguesa)
        if (permiteProdTextual) {
          rows += '<td' + origemAttrs(row, 'Produção textual') + '>' + fmtNota(d.prod_textual) + '</td>';
        }

        // Média (calculado)
        rows += '<td class="text-center fw-bold js-notas-boletim-origem" data-aluno-id="' + esc(row.aluno_id) + '" data-disc="' + esc(disc) + '" title="Clique para ver origem da média">' + fmtNota(d.media) + '</td>';

        rows += '<td' + origemAttrs(row, 'Recuperação') + '>' + fmtNota(d.recuperacao) + '</td>';

        // Final
        var finalStyle = d.proficiencia ? profCellStyle(d.proficiencia) : '';
        rows += '<td class="text-center fw-bold js-notas-boletim-origem" data-aluno-id="' + esc(row.aluno_id) + '" data-disc="' + esc(disc) + '" style="' + finalStyle + '" title="Clique para ver origem da nota final">' + fmtNota(d.nota_final) + '</td>';

        // Proficiência
        rows += '<td' + origemAttrs(row, 'Proficiência') + '><span class="badge ' + profBadgeClass(d.proficiencia) + '">' + esc(d.proficiencia || '-') + '</span></td>';
        rows += '</tr>';
      });

      boletimBody.innerHTML = rows;
    }

    function renderBoletim(data) {
      var selected = selectedValues(disciplinaSelect);
      if (selected.length === 1) {
        renderBoletimDisciplina(data, selected[0]);
      } else {
        renderBoletimOverview(data, selected);
      }

      syncBoletimXScroll();
    }

    function getBoletimDisciplinaData(alunoId, disciplina) {
      var data = state && state.data ? state.data : null;
      var boletim = data && Array.isArray(data.boletim) ? data.boletim : [];
      var aluno = boletim.find(function (item) { return Number(item.aluno_id || 0) === Number(alunoId || 0); });
      if (!aluno) return null;
      var disciplinas = aluno.disciplinas && typeof aluno.disciplinas === 'object' ? aluno.disciplinas : {};
      var detalhe = disciplinas[disciplina];
      if (!detalhe) return null;
      return { aluno: aluno, detalhe: detalhe };
    }

    function resolveManualComponentCategory(entry) {
      var categoria = normalizeText(entry && entry.categoria ? entry.categoria : '');
      var categoriaLabel = normalizeText(entry && entry.categoria_label ? entry.categoria_label : '');

      if (categoria === 'recuperacao' || categoriaLabel.indexOf('recuperacao') >= 0) {
        return 'recuperacao';
      }

      if (categoria === 'producao_textual' || categoriaLabel.indexOf('producao textual') >= 0) {
        return 'prod_textual';
      }

      if (
        categoria === 'avaliacao_subjetiva'
        || categoria === 'subjetiva'
        || categoria === 'avaliacao'
        || categoriaLabel.indexOf('avaliacao subjetiva') >= 0
        || categoriaLabel.indexOf('subjetiva') >= 0
      ) {
        return 'subjetiva';
      }

      return '';
    }

    function getEntryPriorityTs(entry) {
      var fields = ['updated_at', 'data_referencia', 'created_at'];
      for (var i = 0; i < fields.length; i += 1) {
        var raw = String(entry && entry[fields[i]] ? entry[fields[i]] : '').trim();
        if (!raw) continue;
        var ts = Date.parse(raw.length <= 10 ? (raw + 'T00:00:00') : raw.replace(' ', 'T'));
        if (isFinite(ts)) {
          return Number(ts);
        }
      }
      return 0;
    }

    function extractManualComponentsForBimestre(alunoId, disciplina, bimestreSelecionado) {
      var result = { subjetiva: null, prod_textual: null, recuperacao: null };
      var latestTs = { subjetiva: -1, prod_textual: -1, recuperacao: -1 };
      var recoverySum = 0;
      var recoveryCount = 0;
      var entries = state.data && Array.isArray(state.data.entries) ? state.data.entries : [];
      var anosSelecionados = selectedValues(anoSelect).map(function (value) { return Number(value); }).filter(function (value) { return value > 0; });

      entries.forEach(function (entry) {
        var sameAluno = Number(entry && entry.aluno_id ? entry.aluno_id : 0) === Number(alunoId || 0);
        var sameDisc = normalizeText(entry && entry.disciplina ? entry.disciplina : '') === normalizeText(disciplina || '');
        var isManual = normalizeText(entry && entry.entry_type ? entry.entry_type : '') === 'manual';
        var entryBimestre = Number(entry && entry.bimestre ? entry.bimestre : 0);
        var entryAno = Number(entry && entry.ano_letivo ? entry.ano_letivo : 0);

        if (!sameAluno || !sameDisc || !isManual) {
          return;
        }

        if (Number(bimestreSelecionado || 0) > 0 && entryBimestre !== Number(bimestreSelecionado || 0)) {
          return;
        }

        if (anosSelecionados.length === 1 && entryAno !== anosSelecionados[0]) {
          return;
        }

        var component = resolveManualComponentCategory(entry);
        if (!component) {
          return;
        }

        var nota = Number(entry && entry.nota != null ? entry.nota : NaN);
        if (!isFinite(nota)) {
          return;
        }

        var ts = getEntryPriorityTs(entry);
        if (component === 'recuperacao') {
          recoverySum += nota;
          recoveryCount += 1;
          return;
        }

        if (ts < latestTs[component]) {
          return;
        }

        latestTs[component] = ts;
        result[component] = nota;
      });

      if (recoveryCount > 0) {
        result.recuperacao = Number(recoverySum.toFixed(2));
      }

      return result;
    }

    function renderBoletimOrigemModal(alunoId, disciplina) {
      if (!boletimOrigemModalBody) return;

      origemModalContext = {
        alunoId: String(alunoId || '').trim(),
        disciplina: String(disciplina || '').trim(),
      };

      var payload = getBoletimDisciplinaData(alunoId, disciplina);
      if (!payload) {
        boletimOrigemModalBody.innerHTML = '<div class="text-center text-secondary py-3">Não foi possível localizar os dados desta célula.</div>';
        if (boletimOrigemModal) boletimOrigemModal.show();
        return;
      }

      var aluno = payload.aluno;
      var d = payload.detalhe || {};
      var fontes = Array.isArray(d.avaliacao_fontes) ? d.avaliacao_fontes : [];
      var permiteProdTextual = isDisciplinaLinguaPortuguesa(disciplina);
      var formula = permiteProdTextual ? '50% Subjetiva + 30% Avaliação + 20% Produção Textual' : '50% Subjetiva + 50% Avaliação';
      var bimestresSelecionados = selectedValues(bimestreSelect).map(function (value) { return Number(value); }).filter(function (value) { return value >= 1 && value <= 4; });
      var exigeSelecaoBimestre = bimestresSelecionados.length !== 1;
      var origemContextKey = String(aluno.aluno_id || '') + '|' + String(disciplina || '');
      var bimestreEscolhido = Number(origemBimestreSelecionado[origemContextKey] || 0);
      var bimestresDisponiveis = bimestresSelecionados.length ? bimestresSelecionados.slice() : [1, 2, 3, 4];
      var allEntries = state.data && Array.isArray(state.data.entries) ? state.data.entries : [];
      var manualBimestres = [];

      allEntries.forEach(function (entry) {
        var sameAluno = Number(entry && entry.aluno_id ? entry.aluno_id : 0) === Number(aluno.aluno_id || 0);
        var sameDisc = normalizeText(entry && entry.disciplina ? entry.disciplina : '') === normalizeText(disciplina || '');
        var isManual = normalizeText(entry && entry.entry_type ? entry.entry_type : '') === 'manual';
        var entryBimestre = Number(entry && entry.bimestre ? entry.bimestre : 0);
        if (!sameAluno || !sameDisc || !isManual || entryBimestre < 1 || entryBimestre > 4) {
          return;
        }
        if (manualBimestres.indexOf(entryBimestre) === -1) {
          manualBimestres.push(entryBimestre);
        }
      });
      manualBimestres.sort(function (a, b) { return a - b; });

      if (bimestresSelecionados.length > 1) {
        bimestresDisponiveis = bimestresSelecionados.filter(function (value) {
          return manualBimestres.length === 0 || manualBimestres.indexOf(value) >= 0;
        });
        if (!bimestresDisponiveis.length) {
          bimestresDisponiveis = bimestresSelecionados.slice();
        }
      }

      if (bimestreEscolhido < 1 || bimestresDisponiveis.indexOf(bimestreEscolhido) === -1) {
        bimestreEscolhido = bimestresDisponiveis[0] || 1;
      }
      origemBimestreSelecionado[origemContextKey] = bimestreEscolhido;

      var fontesFiltradasPorBimestre = fontes.filter(function (src) {
        var srcBimestre = Number(src && src.bimestre ? src.bimestre : 0);
        return Number(bimestreEscolhido || 0) <= 0 || srcBimestre === Number(bimestreEscolhido || 0);
      });

      var manualForBimestre = extractManualComponentsForBimestre(aluno.aluno_id, disciplina, bimestreEscolhido);
      var subjetivaValor = manualForBimestre.subjetiva !== null ? manualForBimestre.subjetiva : d.subjetiva;
      var prodTextualValor = manualForBimestre.prod_textual !== null ? manualForBimestre.prod_textual : d.prod_textual;
      var recuperacaoValor = manualForBimestre.recuperacao !== null ? manualForBimestre.recuperacao : d.recuperacao;
      if (!permiteProdTextual) {
        prodTextualValor = null;
      }

      var avaliacaoValor = null;
      if (fontesFiltradasPorBimestre.length) {
        var fontesCorretas = 0;
        var fontesTotal = 0;
        fontesFiltradasPorBimestre.forEach(function (src) {
          fontesCorretas += Number(src && src.corretas ? src.corretas : 0);
          fontesTotal += Number(src && src.total ? src.total : 0);
        });
        if (fontesTotal > 0) {
          avaliacaoValor = Number(((fontesCorretas / fontesTotal) * 10).toFixed(2));
        }
      }
      var mediaValor = null;
      if (permiteProdTextual) {
        if (subjetivaValor !== null || avaliacaoValor !== null || prodTextualValor !== null) {
          mediaValor = Number(((0.5 * Number(subjetivaValor || 0)) + (0.3 * Number(avaliacaoValor || 0)) + (0.2 * Number(prodTextualValor || 0))).toFixed(2));
        }
      } else {
        if (subjetivaValor !== null || avaliacaoValor !== null) {
          mediaValor = Number(((0.5 * Number(subjetivaValor || 0)) + (0.5 * Number(avaliacaoValor || 0))).toFixed(2));
        }
      }

      var finalValor = mediaValor;
      if (mediaValor !== null && recuperacaoValor !== null && Number(mediaValor) < 6) {
        finalValor = Number((((Number(mediaValor) + Number(recuperacaoValor)) / 2).toFixed(2)));
      }

      if (boletimOrigemModalLabel) {
        boletimOrigemModalLabel.textContent = 'Origem da nota • ' + String(aluno.aluno_nome || '-') + ' • ' + String(disciplina || '-');
      }

      var inputSubjetiva = fmtNota(subjetivaValor);

      var inputProd = permiteProdTextual
        ? fmtNota(prodTextualValor)
        : '<span class="small text-secondary">Não se aplica</span>';

      var inputRecuperacao = fmtNota(recuperacaoValor);
      var seletorBimestreHtml = exigeSelecaoBimestre
        ? '<div class="d-flex align-items-center gap-2 mt-2">'
          + '<label for="notasOrigemBimestreSelect" class="small text-secondary mb-0">Bimestre (componente manual):</label>'
          + '<select id="notasOrigemBimestreSelect" class="form-select form-select-sm w-auto js-notas-origem-bimestre-select" data-aluno-id="' + esc(aluno.aluno_id || '') + '" data-disciplina="' + esc(disciplina || '') + '">'
          + bimestresDisponiveis.map(function (bim) {
            var selectedAttr = Number(bim) === Number(bimestreEscolhido) ? ' selected' : '';
            return '<option value="' + esc(bim) + '"' + selectedAttr + '>' + esc(String(bim) + 'º bimestre') + '</option>';
          }).join('')
          + '</select>'
          + '</div>'
        : '';
      var novoLancamentoBtn = '<button type="button" class="btn btn-outline-primary btn-sm js-notas-origem-novo-lancamento"'
        + ' data-aluno-id="' + esc(aluno.aluno_id || '') + '"'
        + ' data-turma-id="' + esc(aluno.turma_id || '') + '"'
        + ' data-bimestre="' + esc(bimestreEscolhido) + '"'
        + ' data-disciplina="' + esc(disciplina || '') + '">'
        + '<i class="las la-plus me-1"></i>Novo lançamento manual'
        + '</button>';

      var fontesHtml = fontesFiltradasPorBimestre.length
        ? '<div class="table-responsive"><table class="table table-sm table-bordered mb-0">'
          + '<thead><tr><th>Avaliação</th><th class="text-center">Data</th><th class="text-center">Acertos</th><th class="text-center">Nota</th><th class="text-center">Correção</th></tr></thead><tbody>'
          + fontesFiltradasPorBimestre.map(function (src) {
            return '<tr>'
              + '<td>' + esc(src.avaliacao_nome || 'Avaliação') + '</td>'
              + '<td class="text-center">' + esc(fmtDate(src.aplicacao || '')) + '</td>'
              + '<td class="text-center">' + esc(String(src.corretas || 0)) + '/' + esc(String(src.total || 0)) + '</td>'
              + '<td class="text-center fw-semibold">' + esc(fmtNota(src.nota)) + '</td>'
              + '<td class="text-center"><button type="button" class="btn btn-outline-primary btn-sm js-notas-origem-abrir-correcao"'
              + ' data-avaliacao-id="' + esc(String(src.avaliacao_id || 0)) + '"'
              + ' data-aluno-id="' + esc(String(aluno.aluno_id || 0)) + '"'
              + ' data-turma-id="' + esc(String(aluno.turma_id || 0)) + '"'
              + ' data-disciplina="' + esc(disciplina || '') + '">Abrir correção</button></td>'
              + '</tr>';
          }).join('')
          + '</tbody></table></div>'
        : '<div class="small text-secondary">Nenhuma avaliação corrigida encontrada para este bimestre nesta disciplina.</div>';

      var lancamentos = (state.data && Array.isArray(state.data.entries) ? state.data.entries : []).filter(function (entry) {
        var sameAluno = Number(entry && entry.aluno_id ? entry.aluno_id : 0) === Number(aluno.aluno_id || 0);
        var sameDisc = String(entry && entry.disciplina ? entry.disciplina : '').trim().toLowerCase() === String(disciplina || '').trim().toLowerCase();
        var sameBimestre = Number(entry && entry.bimestre ? entry.bimestre : 0) === Number(bimestreEscolhido || 0);
        if (!sameAluno || !sameDisc) {
          return false;
        }

        if (Number(bimestreEscolhido || 0) > 0 && !sameBimestre) {
          return false;
        }

        if (!permiteProdTextual) {
          var categoria = normalizeText(entry && entry.categoria ? entry.categoria : '');
          var categoriaLabel = normalizeText(entry && entry.categoria_label ? entry.categoria_label : '');
          if (categoria === 'producao_textual' || categoriaLabel.indexOf('producao textual') >= 0) {
            return false;
          }
        }

        return true;
      });

      var highlightedRecordId = (origemLancamentoHighlight.id && Date.now() <= origemLancamentoHighlight.until)
        ? String(origemLancamentoHighlight.id)
        : '';

      var lancamentosHtml = lancamentos.length
        ? '<div class="table-responsive"><table class="table table-sm table-bordered mb-0">'
          + '<thead><tr><th>Data</th><th>Título</th><th>Categoria</th><th class="text-center">Nota</th><th class="text-center">Ações</th></tr></thead><tbody>'
          + lancamentos.map(function (entry) {
            var recordId = String(entry && entry.id ? entry.id : '').trim();
            var highlightClass = (highlightedRecordId !== '' && recordId === highlightedRecordId)
              ? ' class="notas-lancamento-highlight js-notas-lancamento-highlight"'
              : '';
            var isManualEntry = String(entry && entry.entry_type ? entry.entry_type : '').trim().toLowerCase() === 'manual';
            var actionsHtml = isManualEntry
              ? '<button type="button" class="btn btn-outline-primary btn-sm js-notas-origem-entry-edit"'
                + ' data-id="' + esc(recordId) + '"'
                + ' data-aluno-id="' + esc(aluno.aluno_id || '') + '"'
                + ' data-disciplina="' + esc(disciplina || '') + '">Editar</button>'
              : '<span class="small text-secondary">Automático</span>';
            return '<tr' + highlightClass + '>'
              + '<td>' + esc(fmtDate(entry.data_referencia || '')) + '</td>'
              + '<td>' + esc(entry.titulo || '-') + '</td>'
              + '<td>' + esc(entry.categoria_label || entry.categoria || '-') + '</td>'
              + '<td class="text-center">' + esc(fmtScore(entry.nota, entry.nota_maxima)) + '</td>'
              + '<td class="text-center">' + actionsHtml + '</td>'
              + '</tr>';
          }).join('')
          + '</tbody></table></div>'
        : '<div class="small text-secondary">Sem lançamentos manuais para este estudante/disciplina no recorte atual.</div>';

      boletimOrigemModalBody.innerHTML = ''
        + '<div class="mb-3">'
        + '  <div><strong>Estudante:</strong> ' + esc(aluno.aluno_nome || '-') + '</div>'
        + '  <div><strong>Turma:</strong> ' + esc(aluno.turma_nome || '-') + '</div>'
        + '  <div><strong>Disciplina:</strong> ' + esc(disciplina || '-') + '</div>'
        + '  <div class="small text-secondary mt-1">Fórmula aplicada: ' + esc(formula) + '</div>'
        + seletorBimestreHtml
        + '<div class="small text-secondary mt-1">As notas manuais são atualizadas pelo botão Novo lançamento.</div>'
        + '<div class="mt-2">' + novoLancamentoBtn + '</div>'
        + '</div>'
        + '<div class="table-responsive mb-3"><table class="table table-sm table-bordered mb-0">'
        + '<thead><tr><th>Componente</th><th class="text-center">Valor</th><th class="text-center">Observação</th></tr></thead><tbody>'
        + '<tr><td>Avaliação (automática)</td><td class="text-center fw-semibold">' + esc(fmtNota(avaliacaoValor)) + '</td><td class="text-center small text-secondary">Ligado às correções</td></tr>'
        + '<tr><td>Subjetiva</td><td class="text-center">' + inputSubjetiva + '</td><td class="text-center small text-secondary">Componente manual</td></tr>'
        + (permiteProdTextual
          ? '<tr><td>Produção Textual</td><td class="text-center">' + inputProd + '</td><td class="text-center small text-secondary">Somente em Língua Portuguesa</td></tr>'
          : '')
        + '<tr><td>Média</td><td class="text-center fw-bold">' + esc(fmtNota(mediaValor)) + '</td><td class="text-center small text-secondary">Calculada automaticamente</td></tr>'
        + '<tr><td>Recuperação</td><td class="text-center">' + inputRecuperacao + '</td><td class="text-center small text-secondary">Componente manual</td></tr>'
        + '<tr><td>Final</td><td class="text-center fw-bold">' + esc(fmtNota(finalValor)) + '</td><td class="text-center"><span class="badge ' + profBadgeClass(d.proficiencia) + '">' + esc(d.proficiencia || '-') + '</span></td></tr>'
        + '</tbody></table></div>'
        + '<div class="mb-2 fw-semibold">Avaliações que compõem a nota automática</div>'
        + '<div class="mb-3">' + fontesHtml + '</div>'
        + '<div class="mb-2 fw-semibold">Lançamentos vinculados</div>'
        + '<div>' + lancamentosHtml + '</div>';

      if (highlightedRecordId !== '') {
        var remaining = origemLancamentoHighlight.until - Date.now();
        if (remaining > 0) {
          setTimeout(function () {
            if (!boletimOrigemModalBody) {
              return;
            }
            boletimOrigemModalBody.querySelectorAll('.js-notas-lancamento-highlight').forEach(function (rowEl) {
              rowEl.classList.remove('notas-lancamento-highlight');
              rowEl.classList.remove('js-notas-lancamento-highlight');
            });
            if (Date.now() >= origemLancamentoHighlight.until) {
              origemLancamentoHighlight.id = '';
            }
          }, remaining);
        }
      }

      if (boletimOrigemModal) boletimOrigemModal.show();
    }

    function setCorrecaoDisciplinaError(message) {
      if (!correcaoDisciplinaError) {
        return;
      }
      correcaoDisciplinaError.textContent = String(message || '').trim();
      correcaoDisciplinaError.classList.toggle('d-none', correcaoDisciplinaError.textContent === '');
    }

    function formatCorrecaoDisciplinaAnswerLabel(value, tipo) {
      if (value === null || value === undefined || String(value).trim() === '') {
        return String(tipo || '') === 'discursiva' ? '-' : 'Em branco';
      }

      if (String(tipo || '') === 'discursiva') {
        var numeric = Number(String(value).replace(',', '.'));
        if (!isFinite(numeric)) {
          return String(value);
        }
        return fmtDecimal(numeric);
      }

      return String(value).trim().toUpperCase();
    }

    function resolveCorrecaoDisciplinaLiveStatus(tipo, respostaAluno, respostaCorreta, peso) {
      var answer = String(respostaAluno == null ? '' : respostaAluno).trim();
      if (String(tipo || '') === 'discursiva') {
        if (answer === '') {
          return { label: 'Sem correção', className: 'bg-secondary' };
        }

        var nota = Number(answer.replace(',', '.'));
        var maxPeso = Number(peso || 0);
        if (!isFinite(nota)) {
          return { label: 'Sem correção', className: 'bg-secondary' };
        }

        return nota >= maxPeso
          ? { label: 'Correta', className: 'bg-success' }
          : { label: 'Incorreta', className: 'bg-danger' };
      }

      var upperAnswer = answer.toUpperCase();
      var upperCorrect = String(respostaCorreta == null ? '' : respostaCorreta).trim().toUpperCase();
      if (upperAnswer === '') {
        return { label: 'Sem correção', className: 'bg-secondary' };
      }

      return upperAnswer === upperCorrect
        ? { label: 'Correta', className: 'bg-success' }
        : { label: 'Incorreta', className: 'bg-danger' };
    }

    function getCorrecaoDisciplinaCurrentAnswer(questionNumber, tipo) {
      if (!correcaoDisciplinaBody) {
        return '';
      }

      if (String(tipo || '') === 'discursiva') {
        var discInput = correcaoDisciplinaBody.querySelector('.js-notas-correcao-input[data-tipo="discursiva"][data-qn="' + String(questionNumber) + '"]');
        if (!(discInput instanceof HTMLInputElement)) {
          return '';
        }
        return String(discInput.value || '').trim();
      }

      var checked = correcaoDisciplinaBody.querySelector('input.js-notas-correcao-input[data-tipo="objetiva"][data-qn="' + String(questionNumber) + '"]:checked');
      return checked ? String(checked.value || '').trim().toUpperCase() : '';
    }

    function refreshCorrecaoDisciplinaQuestionPreview(questionNumber) {
      if (!correcaoDisciplinaBody) {
        return;
      }

      var row = correcaoDisciplinaBody.querySelector('.js-notas-correcao-item[data-qn="' + String(questionNumber) + '"]');
      if (!(row instanceof HTMLElement)) {
        return;
      }

      var tipo = String(row.getAttribute('data-tipo') || 'objetiva');
      var respostaCorreta = String(row.getAttribute('data-correct-answer') || '');
      var peso = Number(row.getAttribute('data-peso') || 0);
      var respostaAluno = getCorrecaoDisciplinaCurrentAnswer(questionNumber, tipo);
      var alunoLabelEl = row.querySelector('.js-notas-correcao-preview-aluno');
      if (alunoLabelEl) {
        alunoLabelEl.textContent = formatCorrecaoDisciplinaAnswerLabel(respostaAluno, tipo);
      }

      var status = resolveCorrecaoDisciplinaLiveStatus(tipo, respostaAluno, respostaCorreta, peso);
      var statusBadgeEl = row.querySelector('.js-notas-correcao-preview-status');
      if (statusBadgeEl) {
        statusBadgeEl.textContent = status.label;
        statusBadgeEl.classList.remove('bg-success', 'bg-danger', 'bg-secondary');
        statusBadgeEl.classList.add(status.className);
      }

      if (tipo !== 'discursiva') {
        var answerUpper = String(respostaAluno || '').trim().toUpperCase();
        var correctUpper = String(respostaCorreta || '').trim().toUpperCase();
        row.querySelectorAll('.admin-gabarito-resposta-bolha[data-answer]').forEach(function (optionLabel) {
          if (!(optionLabel instanceof HTMLElement)) {
            return;
          }
          var answerLetter = String(optionLabel.getAttribute('data-answer') || '').trim().toUpperCase();
          optionLabel.classList.toggle('admin-avaliacao-correcao-edicao-correct', correctUpper !== '' && answerLetter === correctUpper);
          optionLabel.classList.toggle(
            'admin-avaliacao-correcao-edicao-incorrect',
            answerUpper !== '' && correctUpper !== '' && answerUpper !== correctUpper && answerLetter === answerUpper
          );
        });
      }
    }

    function refreshAllCorrecaoDisciplinaPreviews() {
      if (!correcaoDisciplinaBody) {
        return;
      }

      correcaoDisciplinaBody.querySelectorAll('.js-notas-correcao-item').forEach(function (item) {
        var qn = Number(item.getAttribute('data-qn') || 0);
        if (qn > 0) {
          refreshCorrecaoDisciplinaQuestionPreview(qn);
        }
      });
    }

    function renderCorrecaoDisciplinaForm(payload) {
      if (!correcaoDisciplinaBody) {
        return;
      }

      var data = payload && typeof payload === 'object' ? payload : {};
      var questoes = Array.isArray(data.questoes) ? data.questoes : [];
      if (!questoes.length) {
        correcaoDisciplinaBody.innerHTML = '<div class="text-center text-secondary py-3">Nenhuma questão da disciplina encontrada.</div>';
        return;
      }

      var html = '<div class="d-grid gap-2">';
      questoes.forEach(function (q) {
        var number = Number(q && q.question_number ? q.question_number : 0);
        var tipo = String(q && q.tipo ? q.tipo : 'objetiva');
        var peso = Number(q && q.peso != null ? q.peso : 1);
        var enunciado = String(q && q.enunciado ? q.enunciado : '').trim();
        var habilidade = String(q && q.habilidade ? q.habilidade : '').trim();
        var respostaAtual = q ? q.resposta_atual : null;
        var respostaCorreta = q ? q.resposta_correta : null;
        var respostaAlunoLabel = formatCorrecaoDisciplinaAnswerLabel(respostaAtual, tipo);
        var respostaCorretaLabel = (respostaCorreta === null || respostaCorreta === undefined || String(respostaCorreta).trim() === '')
          ? '-'
          : String(respostaCorreta).trim().toUpperCase();
        var isCorrectAtual = q && q.is_correct_atual === true;
        var hasCorrection = q && q.is_correct_atual !== null && q.is_correct_atual !== undefined;
        var statusClass = !hasCorrection ? 'bg-secondary' : (isCorrectAtual ? 'bg-success' : 'bg-danger');
        var statusLabel = !hasCorrection ? 'Sem correção' : (isCorrectAtual ? 'Correta' : 'Incorreta');
        var tipoLabel = tipo === 'discursiva' ? 'Discursiva' : 'Múltipla';
        var respostaCorretaHtml = tipo === 'discursiva'
          ? '<span class="text-secondary">-</span>'
          : (respostaCorretaLabel === '-'
            ? '<span class="text-secondary">-</span>'
            : '<span class="text-success fw-semibold">' + esc(respostaCorretaLabel) + '</span>');

        html += '<div class="admin-avaliacao-correcao-edicao-item js-notas-correcao-item" data-qn="' + esc(number) + '" data-tipo="' + esc(tipo) + '" data-correct-answer="' + esc(respostaCorretaLabel) + '" data-peso="' + esc(peso) + '">';
        html += '<span class="admin-gabarito-resposta-numero">' + esc(String(number).padStart(2, '0')) + '.</span>';
        html += '<div class="admin-avaliacao-correcao-edicao-item-main">';
        html += '<div class="admin-avaliacao-correcao-edicao-item-top">';
        html += '<span class="admin-avaliacao-correcao-edicao-item-type">' + esc(tipoLabel) + '</span>';
        html += '<span class="admin-avaliacao-correcao-edicao-item-meta">Disciplina: ' + esc(String(data.disciplina || 'Não informada')) + ' | Habilidade: ' + esc(habilidade || 'Não informada') + ' | Peso: ' + esc(peso.toFixed(2).replace('.', ',')) + '</span>';
        html += '</div>';

        if (enunciado) {
          html += '<div class="small text-secondary mt-1">' + esc(enunciado) + '</div>';
        }

        html += '<div class="row g-2 mt-1 mb-1">'
          + '<div class="col-md-6"><div class="small"><strong>Resposta do estudante:</strong> <span class="js-notas-correcao-preview-aluno">' + esc(respostaAlunoLabel) + '</span></div></div>'
          + '<div class="col-md-6"><div class="small"><strong>Resposta correta:</strong> ' + respostaCorretaHtml + '</div></div>'
          + '</div>';

        html += '<div class="small text-secondary d-flex align-items-center gap-2 mb-2"><span class="badge js-notas-correcao-preview-status ' + statusClass + '">' + esc(statusLabel) + '</span></div>';

        html += '<div class="admin-avaliacao-correcao-edicao-item-answer">';

        if (tipo === 'discursiva') {
          var discValue = (respostaAtual === null || respostaAtual === undefined || respostaAtual === '') ? '' : String(respostaAtual);
          html += '<div class="admin-avaliacao-correcao-edicao-item-reference is-neutral">Resposta correta: questão discursiva, nota máxima ' + esc(peso.toFixed(2).replace('.', ',')) + '.</div>';
          html += '<input type="number" step="0.01" min="0" max="' + esc(String(peso)) + '" class="form-control form-control-sm js-notas-correcao-input"'
            + ' data-qn="' + esc(number) + '" data-tipo="discursiva" value="' + esc(discValue) + '">';
        } else {
          var alternativas = Array.isArray(q.alternativas) && q.alternativas.length ? q.alternativas : ['A', 'B', 'C', 'D'];
          var selected = String(respostaAtual || '').trim().toUpperCase();
          html += '<div class="admin-avaliacao-correcao-edicao-item-reference' + (respostaCorretaLabel === '-' ? ' is-neutral' : '') + '">Resposta correta: ' + (respostaCorretaLabel === '-' ? 'não definida no gabarito.' : esc(respostaCorretaLabel)) + '</div>';
          html += '<label class="admin-avaliacao-correcao-edicao-blank">'
            + '<input type="radio" class="form-check-input js-notas-correcao-input" data-qn="' + esc(number) + '" data-tipo="objetiva" name="notasCorrecaoQ' + esc(number) + '" value=""' + (selected === '' ? ' checked' : '') + '>'
            + '<span class="admin-avaliacao-correcao-edicao-blank-pill">Em branco</span></label>';

          alternativas.forEach(function (_item, idx) {
            var letter = String.fromCharCode(65 + idx);
            var optionClasses = 'admin-gabarito-resposta-bolha';
            if (respostaCorretaLabel !== '-' && letter === respostaCorretaLabel) {
              optionClasses += ' admin-avaliacao-correcao-edicao-correct';
            }
            if (selected !== '' && respostaCorretaLabel !== '-' && selected !== respostaCorretaLabel && selected === letter) {
              optionClasses += ' admin-avaliacao-correcao-edicao-incorrect';
            }
            html += '<label class="' + optionClasses + '" data-answer="' + esc(letter) + '">'
              + '<input type="radio" class="form-check-input js-notas-correcao-input" data-qn="' + esc(number) + '" data-tipo="objetiva" name="notasCorrecaoQ' + esc(number) + '" value="' + esc(letter) + '"' + (selected === letter ? ' checked' : '') + '>'
              + '<span class="admin-gabarito-resposta-circulo">' + esc(letter) + '</span></label>';
          });
        }

        html += '</div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      correcaoDisciplinaBody.innerHTML = html;
      refreshAllCorrecaoDisciplinaPreviews();
    }

    function openCorrecaoDisciplinaModal(options) {
      if (!correcaoDisciplinaModal || !correcaoDisciplinaBody) {
        return;
      }

      var ctx = options && typeof options === 'object' ? options : {};
      var avaliacaoId = Number(ctx.avaliacaoId || 0);
      var alunoId = Number(ctx.alunoId || 0);
      var turmaId = Number(ctx.turmaId || 0);
      var disciplina = String(ctx.disciplina || '').trim();
      if (avaliacaoId <= 0 || alunoId <= 0 || turmaId <= 0 || !disciplina) {
        showStatus('Dados insuficientes para abrir a correção.');
        return;
      }

      correcaoDisciplinaState.context = {
        alunoId: alunoId,
        disciplina: disciplina,
      };
      correcaoDisciplinaState.payload = null;
      setCorrecaoDisciplinaError('');

      if (correcaoDisciplinaModalLabel) {
        correcaoDisciplinaModalLabel.textContent = 'Correção • ' + disciplina;
      }
      if (correcaoDisciplinaResumo) {
        correcaoDisciplinaResumo.textContent = 'Carregando questões da disciplina para edição...';
      }
      correcaoDisciplinaBody.innerHTML = '<div class="text-center text-secondary py-3">Carregando...</div>';
      correcaoDisciplinaModal.show();

      var url = buildEndpoint('/institucional/notas-desempenho/correcao-disciplina/dados')
        + '?avaliacao_id=' + encodeURIComponent(String(avaliacaoId))
        + '&aluno_id=' + encodeURIComponent(String(alunoId))
        + '&turma_id=' + encodeURIComponent(String(turmaId))
        + '&disciplina=' + encodeURIComponent(disciplina);

      fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Não foi possível carregar a correção.');
              }
              return payload;
            });
        })
        .then(function (payload) {
          correcaoDisciplinaState.payload = payload.data || null;
          if (correcaoDisciplinaResumo) {
            var p = payload.data || {};
            correcaoDisciplinaResumo.textContent = String(p.aluno_nome || '-') + ' • ' + String(p.turma_nome || '-') + ' • ' + String(p.avaliacao_nome || '-');
          }
          renderCorrecaoDisciplinaForm(payload.data || {});
        })
        .catch(function (error) {
          setCorrecaoDisciplinaError(error && error.message ? error.message : 'Erro ao carregar correção.');
          correcaoDisciplinaBody.innerHTML = '<div class="text-center text-secondary py-3">Não foi possível carregar a correção.</div>';
        });
    }

    function collectCorrecaoDisciplinaAnswers() {
      var payload = correcaoDisciplinaState && correcaoDisciplinaState.payload ? correcaoDisciplinaState.payload : null;
      var questoes = payload && Array.isArray(payload.questoes) ? payload.questoes : [];
      var respostas = {};

      questoes.forEach(function (q) {
        var qn = Number(q && q.question_number ? q.question_number : 0);
        if (qn <= 0) {
          return;
        }
        var tipo = String(q && q.tipo ? q.tipo : 'objetiva');

        if (tipo === 'discursiva') {
          var input = correcaoDisciplinaBody ? correcaoDisciplinaBody.querySelector('.js-notas-correcao-input[data-tipo="discursiva"][data-qn="' + String(qn) + '"]') : null;
          if (!(input instanceof HTMLInputElement)) {
            respostas[String(qn)] = null;
            return;
          }

          var raw = String(input.value || '').trim();
          if (raw === '') {
            respostas[String(qn)] = null;
            return;
          }

          var parsed = Number(raw.replace(',', '.'));
          if (!isFinite(parsed)) {
            throw new Error('Informe uma nota válida na Q' + qn + '.');
          }

          var peso = Number(q && q.peso != null ? q.peso : 1);
          if (parsed < 0 || parsed > peso) {
            throw new Error('A nota da Q' + qn + ' deve ficar entre 0 e ' + peso.toFixed(2).replace('.', ',') + '.');
          }

          respostas[String(qn)] = Number(parsed.toFixed(2));
          return;
        }

        var checked = correcaoDisciplinaBody
          ? correcaoDisciplinaBody.querySelector('input.js-notas-correcao-input[data-tipo="objetiva"][data-qn="' + String(qn) + '"]:checked')
          : null;
        respostas[String(qn)] = checked ? String(checked.value || '').trim().toUpperCase() : '';
      });

      return respostas;
    }

    /* ====================================================================
     *  Diagnóstico tab
     * ==================================================================== */

    function renderDiagnostico(data) {
      if (!diagContent) return;
      var diag = (data && Array.isArray(data.diagnostico)) ? data.diagnostico : [];
      var selectedDisciplinas = selectedValues(disciplinaSelect);
      var selectedMap = {};
      selectedDisciplinas.forEach(function (item) {
        selectedMap[normalizeText(item)] = true;
      });

      if (!diag.length) {
        diagContent.innerHTML = '<div class="text-center text-secondary py-4">Nenhuma avaliação corrigida encontrada para este filtro.</div>';
        return;
      }

      var html = '';
      diag.forEach(function (av) {
        var avaliacaoQuestoes = Array.isArray(av.questoes) ? av.questoes : [];
        if (selectedDisciplinas.length) {
          avaliacaoQuestoes = avaliacaoQuestoes.filter(function (q) {
            var disciplinaNorm = normalizeText(q && q.disciplina ? q.disciplina : '');
            return disciplinaNorm !== '' && selectedMap[disciplinaNorm] === true;
          });
        }

        if (!avaliacaoQuestoes.length) {
          return;
        }

        html += '<div class="mb-4">';
        html += '<div class="fw-semibold mb-1">' + esc(av.avaliacao_nome || 'Avaliação') + '</div>';
        html += '<div class="small text-secondary mb-2">Avaliados: ' + (av.total_avaliados || 0) + '</div>';

        // Group questions by discipline
        var byDisc = {};
        avaliacaoQuestoes.forEach(function (q) {
          var d = q.disciplina || 'Sem disciplina';
          if (!byDisc[d]) byDisc[d] = [];
          byDisc[d].push(q);
        });

        Object.keys(byDisc).forEach(function (discName) {
          var qs = byDisc[discName];
          html += '<div class="mb-2">';
          html += '<div class="small fw-semibold text-secondary mb-1">' + esc(discName) + '</div>';
          html += '<div class="d-flex flex-wrap gap-1">';
          qs.forEach(function (q) {
            var bgColor = diagColor(q.faixa);
            var textColor = '#fff';
            html += '<div class="text-center rounded px-2 py-1" '
              + 'style="background:' + bgColor + ';color:' + textColor + ';min-width:50px;font-size:0.75rem;cursor:default;" '
              + 'title="Q' + q.numero + ' – ' + esc(q.habilidade || '') + '\n' + fmtPct(q.percentual) + ' acerto (' + q.corretas + '/' + q.total + ')">'
              + '<div class="fw-bold">Q' + q.numero + '</div>'
              + '<div>' + fmtPct(q.percentual) + '</div>'
              + '</div>';
          });
          html += '</div></div>';
        });

        html += '</div>';
      });

      if (html === '') {
        diagContent.innerHTML = '<div class="text-center text-secondary py-4">Nenhuma questão encontrada para as disciplinas selecionadas.</div>';
        return;
      }

      diagContent.innerHTML = html;
    }

    function renderPainelGrafico(data) {
      if (!painelGraficoEl) return;
      painelGraficoEl.innerHTML = '';
    }

    /* ====================================================================
     *  Lançamentos tab
     * ==================================================================== */

    function renderEntries(data) {
      if (!entriesBody) return;
      var rows = (data && Array.isArray(data.entries)) ? data.entries : [];
      state.entriesById = {};

      if (!rows.length) {
        entriesBody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary py-4">Nenhum lançamento encontrado para o recorte atual.</td></tr>';
        return;
      }

      rows.forEach(function (row) {
        state.entriesById[String(row.id || '')] = row;
      });

      entriesBody.innerHTML = rows.map(function (row) {
        var percentual = row.percentual === null || row.percentual === undefined ? '-' : fmtPct(row.percentual);
        var badgeClass = row.entry_type === 'avaliacao' ? 'text-bg-primary' : 'text-bg-secondary';
        var actions = row.entry_type === 'manual'
          ? '<button type="button" class="btn btn-outline-primary btn-sm me-1 js-notas-entry-edit" data-id="' + esc(row.id) + '">Editar</button>'
            + '<button type="button" class="btn btn-outline-danger btn-sm js-notas-entry-delete" data-id="' + esc(row.id) + '" data-aluno-id="' + esc(String(row.aluno_id || 0)) + '" data-turma-id="' + esc(String(row.turma_id || 0)) + '" data-disciplina="' + esc(String(row.disciplina || '')) + '">Excluir</button>'
          : '<span class="small text-secondary">Automático</span>';

        return '<tr>'
          + '<td>' + esc(fmtDate(row.data_referencia)) + '</td>'
          + '<td><strong>' + esc(row.aluno_nome || '-') + '</strong></td>'
          + '<td>' + esc(row.turma_nome || '-') + '</td>'
          + '<td>' + esc(row.titulo || '-') + '</td>'
          + '<td>' + esc(row.disciplina || '-') + '</td>'
          + '<td><span class="badge ' + badgeClass + '">' + esc(row.categoria_label || row.categoria || '-') + '</span></td>'
          + '<td>' + esc(fmtScore(row.nota, row.nota_maxima)) + '</td>'
          + '<td>' + esc(percentual) + '</td>'
          + '<td class="text-end">' + actions + '</td>'
          + '</tr>';
      }).join('');
    }

    function buildSgeRows(data) {
      var boletim = (data && Array.isArray(data.boletim)) ? data.boletim : [];
      var selectedDisciplinas = selectedValues(disciplinaSelect);
      var selectedMap = {};
      if (selectedDisciplinas.length) {
        selectedDisciplinas.forEach(function (item) { selectedMap[String(item)] = true; });
      }

      var rows = [];
      boletim.forEach(function (item) {
        var alunoNome = String(item.aluno_nome || '');
        var turmaNome = String(item.turma_nome || '');
        var disciplinas = item && item.disciplinas ? item.disciplinas : {};

        Object.keys(disciplinas).forEach(function (disciplina) {
          if (selectedDisciplinas.length && !selectedMap[String(disciplina)]) {
            return;
          }

          var grade = disciplinas[disciplina] || {};
          var ciclo1 = grade.ciclo_1 != null ? grade.ciclo_1 : grade.avaliacao;
          var ciclo2 = grade.ciclo_2 != null ? grade.ciclo_2 : grade.subjetiva;
          if (ciclo1 === null && ciclo2 === null) {
            return;
          }

          rows.push({
            aluno_nome: alunoNome,
            turma_nome: turmaNome,
            disciplina: disciplina,
            ciclo_1: ciclo1,
            ciclo_2: ciclo2,
          });
        });
      });

      rows.sort(function (a, b) {
        if (a.aluno_nome !== b.aluno_nome) return a.aluno_nome.localeCompare(b.aluno_nome, 'pt-BR');
        return a.disciplina.localeCompare(b.disciplina, 'pt-BR');
      });

      return rows;
    }

    function renderSgePreview(data) {
      if (!sgeBody) return;

      var rows = buildSgeRows(data);
      state.sgeRows = rows;

      if (sgeStatus) {
        sgeStatus.textContent = rows.length + ' linha(s) prontas para conferência no SGE.';
      }

      if (!rows.length) {
        sgeBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum dado disponível para conferência no recorte atual.</td></tr>';
        return;
      }

      sgeBody.innerHTML = rows.map(function (row) {
        return '<tr>'
          + '<td><strong>' + esc(row.aluno_nome) + '</strong></td>'
          + '<td>' + esc(row.turma_nome || '-') + '</td>'
          + '<td>' + esc(row.disciplina || '-') + '</td>'
          + '<td class="text-center">' + esc(fmtNota(row.ciclo_1)) + '</td>'
          + '<td class="text-center">' + esc(fmtNota(row.ciclo_2)) + '</td>'
          + '</tr>';
      }).join('');
    }

    function csvEscape(value) {
      var text = String(value == null ? '' : value);
      if (text.indexOf('"') >= 0) text = text.replace(/"/g, '""');
      if (/[";,\n]/.test(text)) return '"' + text + '"';
      return text;
    }

    function exportSgeCsv() {
      var rows = Array.isArray(state.sgeRows) ? state.sgeRows : [];
      if (!rows.length) {
        showStatus('Não há dados para exportar no recorte atual.');
        return;
      }

      var header = ['Estudante', 'Turma', 'Disciplina', 'Ciclo_1', 'Ciclo_2'];
      var lines = [header.join(';')];
      rows.forEach(function (row) {
        lines.push([
          row.aluno_nome,
          row.turma_nome,
          row.disciplina,
          fmtNota(row.ciclo_1),
          fmtNota(row.ciclo_2),
        ].map(csvEscape).join(';'));
      });

      var blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'conferencia_sge_' + dateInputValueLocal(new Date()) + '.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    /* ====================================================================
     *  Dashboard load
     * ==================================================================== */

    function renderDashboard(data) {
      state.data = data;
      state.scopePairs = buildScopePairsMap(data || {});
      state.disciplinasCatalog = buildDisciplinasCatalog(data || {});
      populateDisciplinaSelect(data ? data.disciplinas : []);
      renderOverview(data);
      renderBoletim(data);
      renderPainelGrafico(data);
      renderDiagnostico(data);
      renderEntries(data);
      renderSgePreview(data);
      updateFormDisciplinaOptions(formTurmaSelect ? formTurmaSelect.value : '');

      var ov = (data && data.overview) || {};
      var turmasCount = selectedValues(turmaSelect).length;
      var bimestresCount = selectedValues(bimestreSelect).length;
      var anosCount = selectedValues(anoSelect).length;
      var editHint = (bimestresCount === 1 && anosCount === 1)
        ? 'edição inline ativa'
        : 'selecione 1 ano e 1 bimestre para editar notas';
      showStatus((ov.total_alunos ? ov.total_alunos + ' estudante(s)' : '0 estudante') + ' • '
        + turmasCount + ' turma(s) • ' + bimestresCount + ' bimestre(s) • ' + anosCount + ' ano(s) • ' + editHint);

      updateSummary(turmaSelect, turmasSummaryEl, 'Todas as turmas', 2);
      updateSummary(bimestreSelect, bimestresSummaryEl, 'Todos os bimestres', 2);
      updateSummary(anoSelect, anosSummaryEl, 'Ano atual', 2);
      updateSummary(disciplinaSelect, disciplinasSummaryEl, 'Todas as disciplinas', 2);

      // Populate turma filter from response if available
      if (data && Array.isArray(data.turmas) && data.turmas.length && turmaSelect) {
        var current = selectedValues(turmaSelect);
        var currentMap = {};
        current.forEach(function (value) { currentMap[String(value)] = true; });
        var html = '';
        data.turmas.forEach(function (t) {
          html += '<option value="' + esc(t.id) + '"' + (currentMap[String(t.id)] ? ' selected' : '') + '>' + esc(t.nome) + '</option>';
        });
        turmaSelect.innerHTML = html;
      }
    }

    function applyDashboardData(data, signature, options) {
      var opts = options || {};
      var viewState = opts.preserveView === false ? null : captureDashboardViewState();
      renderDashboard(data || {});
      lastDashboardSignature = signature || buildDashboardSignature(data || {});
      restoreDashboardViewState(viewState);

      if (opts.syncOrigemModal !== false && origemModalContext && isModalShown(boletimOrigemModalEl)) {
        renderBoletimOrigemModal(origemModalContext.alunoId, origemModalContext.disciplina);
      }
    }

    function loadDashboard(options) {
      var opts = options || {};
      var token = ++loadToken;
      if (!opts.silent) {
        showStatus('Carregando...');
      }
      var qs = queryString(collectFilters());
      var url = buildEndpoint('/institucional/notas-desempenho/dados') + (qs ? '?' + qs : '');

      return fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) {
          if (!r.ok) throw new Error('Erro ao carregar dados.');
          return r.json();
        })
        .then(function (payload) {
          if (token !== loadToken) return null;
          if (!payload || payload.ok !== true) throw new Error(payload && payload.message ? payload.message : 'Erro.');
          var data = payload.data || {};
          var signature = buildDashboardSignature(data);
          var changed = signature !== lastDashboardSignature;

          if (!changed && opts.renderIfUnchanged === false) {
            return state.data || data;
          }

          if (opts.deferIfBusy && changed && hasBlockingAutoRefreshInteraction()) {
            pendingDashboardData = data;
            pendingDashboardSignature = signature;
            return data;
          }

          pendingDashboardData = null;
          pendingDashboardSignature = '';
          applyDashboardData(data, signature, {
            preserveView: opts.preserveView !== false,
            syncOrigemModal: true,
          });
          return data;
        })
        .catch(function (err) {
          if (token !== loadToken) return null;
          showStatus(err.message || 'Erro ao carregar dados.');
          if (boletimBody) boletimBody.innerHTML = '<tr><td colspan="20" class="text-center text-danger py-4">' + esc(err.message) + '</td></tr>';
          return null;
        });
    }

    /* ====================================================================
     *  Discipline selector triggers boletim re-render
     * ==================================================================== */

    if (disciplinaSelect) {
      disciplinaSelect.addEventListener('change', function () {
        renderBoletim(state.data);
        renderDiagnostico(state.data);
        renderSgePreview(state.data);
        updateSummary(disciplinaSelect, disciplinasSummaryEl, 'Todas as disciplinas', 2);
      });
    }

    if (boletimContainer && boletimXScroll) {
      boletimContainer.addEventListener('scroll', function () {
        boletimScrollSyncing = true;
        boletimXScroll.scrollLeft = boletimContainer.scrollLeft;
        boletimScrollSyncing = false;
      });

      boletimXScroll.addEventListener('scroll', function () {
        boletimScrollSyncing = true;
        boletimContainer.scrollLeft = boletimXScroll.scrollLeft;
        boletimScrollSyncing = false;
      });
    }

    if (boletimBody) {
      boletimBody.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;

        var cell = target.closest('.js-notas-boletim-origem');
        if (!(cell instanceof HTMLElement)) return;

        var alunoId = String(cell.getAttribute('data-aluno-id') || '').trim();
        var disc = String(cell.getAttribute('data-disc') || '').trim();
        if (!alunoId || !disc) return;

        origemModalContext = { alunoId: alunoId, disciplina: disc };
        renderBoletimOrigemModal(alunoId, disc);
      });
    }

    if (boletimOrigemModalBody) {
      boletimOrigemModalBody.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;

        var origemEditBtn = target.closest('.js-notas-origem-entry-edit');
        if (origemEditBtn instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();

          var editId = String(origemEditBtn.getAttribute('data-id') || '').trim();
          var ctxAlunoId = String(origemEditBtn.getAttribute('data-aluno-id') || '').trim();
          var ctxDisciplina = String(origemEditBtn.getAttribute('data-disciplina') || '').trim();

          if (!editId || !state.entriesById[editId]) {
            return;
          }

          formFromOrigemContext = {
            alunoId: ctxAlunoId,
            disciplina: ctxDisciplina,
          };

          fillFormFromEntry(state.entriesById[editId], { preserveOrigemContext: true });
          return;
        }

        var origemBimestreSelect = target.closest('.js-notas-origem-bimestre-select');
        if (origemBimestreSelect instanceof HTMLElement) {
          return;
        }

        var correcaoBtn = target.closest('.js-notas-origem-abrir-correcao');
        if (correcaoBtn instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();

          openCorrecaoDisciplinaModal({
            avaliacaoId: correcaoBtn.getAttribute('data-avaliacao-id') || '',
            alunoId: correcaoBtn.getAttribute('data-aluno-id') || '',
            turmaId: correcaoBtn.getAttribute('data-turma-id') || '',
            disciplina: correcaoBtn.getAttribute('data-disciplina') || '',
          });
          return;
        }

        var launchBtn = target.closest('.js-notas-origem-novo-lancamento');
        if (!(launchBtn instanceof HTMLElement)) return;

        var alunoId = String(launchBtn.getAttribute('data-aluno-id') || '').trim();
        var turmaId = String(launchBtn.getAttribute('data-turma-id') || '').trim();
        var bimestre = String(launchBtn.getAttribute('data-bimestre') || '').trim();
        var disciplina = String(launchBtn.getAttribute('data-disciplina') || '').trim();

        openManualFormFromBoletimContext({
          alunoId: alunoId,
          turmaId: turmaId,
          bimestre: bimestre,
          disciplina: disciplina,
        });
      });

      boletimOrigemModalBody.addEventListener('change', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLSelectElement)) return;

        if (!target.classList.contains('js-notas-origem-bimestre-select')) {
          return;
        }

        var alunoId = String(target.getAttribute('data-aluno-id') || '').trim();
        var disciplina = String(target.getAttribute('data-disciplina') || '').trim();
        var bimestre = Number(target.value || 0);
        if (!alunoId || !disciplina || bimestre < 1 || bimestre > 4) {
          return;
        }

        origemBimestreSelecionado[alunoId + '|' + disciplina] = bimestre;
        origemModalContext = { alunoId: alunoId, disciplina: disciplina };
        renderBoletimOrigemModal(alunoId, disciplina);
      });
    }

    if (boletimOrigemModalEl) {
      boletimOrigemModalEl.addEventListener('hidden.bs.modal', function () {
        origemModalContext = null;
        applyPendingDashboardUpdate();
      });
    }

    [formModalEl, correcaoDisciplinaModalEl, confirmModalEl].forEach(function (modalElement) {
      if (!modalElement) return;
      modalElement.addEventListener('hidden.bs.modal', applyPendingDashboardUpdate);
    });

    window.addEventListener('focus', applyPendingDashboardUpdate);

    if (correcaoDisciplinaSalvarBtn) {
      correcaoDisciplinaSalvarBtn.addEventListener('click', function () {
        var payload = correcaoDisciplinaState && correcaoDisciplinaState.payload ? correcaoDisciplinaState.payload : null;
        if (!payload || !payload.correcao_id) {
          setCorrecaoDisciplinaError('Correção não carregada.');
          return;
        }

        var respostasDisciplina;
        try {
          respostasDisciplina = collectCorrecaoDisciplinaAnswers();
        } catch (error) {
          setCorrecaoDisciplinaError(error && error.message ? error.message : 'Não foi possível validar as respostas.');
          return;
        }

        openConfirmModal(
          'Salvar correção',
          'Confirma salvar as alterações desta correção?',
          function () {
            setCorrecaoDisciplinaError('');
            correcaoDisciplinaSalvarBtn.disabled = true;

            var body = new FormData();
            body.set('csrf_token', csrfInput ? String(csrfInput.value || '') : '');
            body.set('correcao_id', String(payload.correcao_id || 0));
            body.set('disciplina', String(payload.disciplina || ''));
            body.set('respostas_disciplina_json', JSON.stringify(respostasDisciplina));

            return fetch(buildEndpoint('/institucional/notas-desempenho/correcao-disciplina/salvar'), {
              method: 'POST',
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
              body: body,
            })
              .then(function (response) {
                return response.json()
                  .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
                  .then(function (responsePayload) {
                    if (!response.ok || !responsePayload.ok) {
                      throw new Error(responsePayload.message || 'Falha ao salvar correção.');
                    }
                    return responsePayload;
                  });
              })
              .then(function () {
                if (correcaoDisciplinaModal) {
                  correcaoDisciplinaModal.hide();
                }
                return loadDashboard().then(function () {
                  var ctx = correcaoDisciplinaState && correcaoDisciplinaState.context ? correcaoDisciplinaState.context : null;
                  if (ctx && ctx.alunoId && ctx.disciplina) {
                    renderBoletimOrigemModal(String(ctx.alunoId), String(ctx.disciplina));
                  }
                });
              })
              .catch(function (error) {
                setCorrecaoDisciplinaError(error && error.message ? error.message : 'Erro ao salvar correção.');
              })
              .finally(function () {
                correcaoDisciplinaSalvarBtn.disabled = false;
              });
          }
        );
      });
    }

    if (correcaoDisciplinaBody) {
      correcaoDisciplinaBody.addEventListener('change', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains('js-notas-correcao-input')) {
          return;
        }

        var qn = Number(target.getAttribute('data-qn') || 0);
        if (qn > 0) {
          refreshCorrecaoDisciplinaQuestionPreview(qn);
        }
      });

      correcaoDisciplinaBody.addEventListener('input', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains('js-notas-correcao-input')) {
          return;
        }

        var qn = Number(target.getAttribute('data-qn') || 0);
        if (qn > 0) {
          refreshCorrecaoDisciplinaQuestionPreview(qn);
        }
      });
    }

    window.addEventListener('resize', syncBoletimXScroll);

    /* ====================================================================
     *  Filter change handlers
     * ==================================================================== */

    var debounceTimer = null;
    function debouncedLoad() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadDashboard, 300);
    }

    [turmaSelect, bimestreSelect, anoSelect].forEach(function (el) {
      if (el) el.addEventListener('change', loadDashboard);
    });

    function bindFilterModal(config) {
      if (!config || !config.select || !config.modal) return;

      function applyAndRefreshSelection() {
        applyChecklistToSelect(config.select, config.list);
        if (config.select === disciplinaSelect) {
          renderBoletim(state.data);
          return;
        }
        loadDashboard();
      }

      if (config.openBtn) {
        config.openBtn.addEventListener('click', function () {
          renderModalChecklistFromSelect(config.select, config.list, config.name);
          config.modal.show();
        });
      }

      if (config.applyBtn) {
        config.applyBtn.addEventListener('click', function () {
          // Botão final funciona apenas como "Fechar" (data-bs-dismiss)
        });
      }

      if (config.list) {
        config.list.addEventListener('change', function (event) {
          var target = event.target;
          if (!(target instanceof HTMLInputElement) || !target.classList.contains('js-filter-modal-checkbox')) {
            return;
          }
          applyAndRefreshSelection();
        });
      }

      if (config.selectAllBtn) {
        config.selectAllBtn.addEventListener('click', function () {
          setAllChecklist(config.list, true);
          applyAndRefreshSelection();
        });
      }

      if (config.clearBtn) {
        config.clearBtn.addEventListener('click', function () {
          setAllChecklist(config.list, false);
          applyAndRefreshSelection();
        });
      }
    }

    bindFilterModal({
      name: 'turmas',
      select: turmaSelect,
      modal: turmasModal,
      list: turmasListEl,
      openBtn: document.getElementById('notasFilterTurmasOpenBtn'),
      applyBtn: document.getElementById('notasFilterTurmasApplyBtn'),
      selectAllBtn: document.getElementById('notasFilterTurmasSelectAllBtn'),
      clearBtn: document.getElementById('notasFilterTurmasClearBtn'),
    });

    bindFilterModal({
      name: 'bimestres',
      select: bimestreSelect,
      modal: bimestresModal,
      list: bimestresListEl,
      openBtn: document.getElementById('notasFilterBimestresOpenBtn'),
      applyBtn: document.getElementById('notasFilterBimestresApplyBtn'),
      selectAllBtn: document.getElementById('notasFilterBimestresSelectAllBtn'),
      clearBtn: document.getElementById('notasFilterBimestresClearBtn'),
    });

    bindFilterModal({
      name: 'anos',
      select: anoSelect,
      modal: anosModal,
      list: anosListEl,
      openBtn: document.getElementById('notasFilterAnosOpenBtn'),
      applyBtn: document.getElementById('notasFilterAnosApplyBtn'),
      selectAllBtn: document.getElementById('notasFilterAnosSelectAllBtn'),
      clearBtn: document.getElementById('notasFilterAnosClearBtn'),
    });

    bindFilterModal({
      name: 'disciplinas',
      select: disciplinaSelect,
      modal: disciplinasModal,
      list: disciplinasListEl,
      openBtn: document.getElementById('notasFilterDisciplinasOpenBtn'),
      applyBtn: document.getElementById('notasFilterDisciplinasApplyBtn'),
      selectAllBtn: document.getElementById('notasFilterDisciplinasSelectAllBtn'),
      clearBtn: document.getElementById('notasFilterDisciplinasClearBtn'),
    });

    if (buscaInput) buscaInput.addEventListener('input', debouncedLoad);

    /* ====================================================================
     *  Modal form (lançamento manual)
     * ==================================================================== */

    function setFormError(msg) {
      if (!formError) return;
      formError.textContent = String(msg || '').trim();
      formError.classList.toggle('d-none', !formError.textContent);
    }

    function isFormEditMode() {
      return Boolean(recordIdInput && String(recordIdInput.value || '').trim() !== '');
    }

    function normalizeOneDecimalInputValue(raw) {
      var text = String(raw == null ? '' : raw).trim().replace(',', '.');
      if (text === '') {
        return '';
      }
      if (!/^\d+(\.\d)?$/.test(text)) {
        return null;
      }
      var value = Number(text);
      if (!isFinite(value) || value < 0) {
        return null;
      }
      return value.toFixed(1);
    }

    function isSubjetivaCategoria(rawCategoria) {
      var categoria = normalizeText(rawCategoria || '');
      return categoria === 'avaliacao_subjetiva'
        || categoria === 'subjetiva'
        || categoria === 'avaliacao';
    }

    function normalizeManualCategoria(rawCategoria) {
      var categoria = normalizeText(rawCategoria || '');
      if (categoria === 'subjetiva' || categoria === 'avaliacao') {
        return 'avaliacao_subjetiva';
      }
      return categoria;
    }

    function toOneDecimalString(value) {
      var n = Number(value);
      if (!isFinite(n)) {
        return '0.0';
      }
      return n.toFixed(1);
    }

    function toOneDecimalLabel(value) {
      var n = Number(value);
      if (!isFinite(n)) {
        return '0,0';
      }
      return n.toFixed(1).replace('.', ',');
    }

    function buildManualLimitContext() {
      if (!formEl) {
        return null;
      }

      var turmaId = String(formTurmaSelect && formTurmaSelect.value ? formTurmaSelect.value : '').trim();
      var anoLetivo = Number((formEl.querySelector('[name="ano_letivo"]') || {}).value || 0);
      var bimestre = Number((formEl.querySelector('[name="bimestre"]') || {}).value || 0);
      var categoria = normalizeManualCategoria((formEl.querySelector('[name="categoria"]') || {}).value || '');
      var disciplina = String(formDisciplinaInput && formDisciplinaInput.value ? formDisciplinaInput.value : '').trim();
      var ciclo = Number((formEl.querySelector('[name="ciclo"]') || {}).value || 0);

      if (!turmaId || !isFinite(anoLetivo) || anoLetivo <= 0 || !isFinite(bimestre) || bimestre < 1 || bimestre > 4 || !categoria || !disciplina) {
        return null;
      }

      if (categoria === 'avaliacao_subjetiva' && ciclo !== 1 && ciclo !== 2) {
        return null;
      }

      return {
        turma_id: Number(turmaId),
        ano_letivo: anoLetivo,
        bimestre: bimestre,
        categoria: categoria,
        disciplina_norm: normalizeText(disciplina),
        ciclo: categoria === 'avaliacao_subjetiva' ? ciclo : 0,
      };
    }

    function isEntryFromSameManualGroup(entry, context, alunoId, editingRecordId) {
      if (!entry || !context) {
        return false;
      }

      if (normalizeText(entry.entry_type || '') !== 'manual') {
        return false;
      }

      if (Number(entry.aluno_id || 0) !== Number(alunoId || 0)) {
        return false;
      }

      if (editingRecordId && String(entry.id || '') === String(editingRecordId)) {
        return false;
      }

      if (Number(entry.turma_id || 0) !== Number(context.turma_id || 0)) {
        return false;
      }

      if (Number(entry.ano_letivo || 0) !== Number(context.ano_letivo || 0)) {
        return false;
      }

      if (Number(entry.bimestre || 0) !== Number(context.bimestre || 0)) {
        return false;
      }

      if (normalizeText(entry.disciplina || '') !== String(context.disciplina_norm || '')) {
        return false;
      }

      if (normalizeManualCategoria(entry.categoria || '') !== String(context.categoria || '')) {
        return false;
      }

      if (String(context.categoria || '') === 'avaliacao_subjetiva') {
        if (Number(entry.ciclo || 0) !== Number(context.ciclo || 0)) {
          return false;
        }
      }

      return true;
    }

    function getRemainingManualLimitForAluno(alunoId, context, editingRecordId) {
      var entries = state && state.data && Array.isArray(state.data.entries) ? state.data.entries : [];
      var total = 0;

      entries.forEach(function (entry) {
        if (!isEntryFromSameManualGroup(entry, context, alunoId, editingRecordId)) {
          return;
        }

        var nota = Number(entry && entry.nota != null ? entry.nota : NaN);
        if (!isFinite(nota)) {
          return;
        }

        total += nota;
      });

      var remaining = Number((10 - total).toFixed(1));
      if (!isFinite(remaining) || remaining < 0) {
        remaining = 0;
      }
      return remaining;
    }

    function showBulkNotaWarn(alunoId, remaining) {
      var warn = bulkNotasBody ? bulkNotasBody.querySelector('.notas-bulk-nota-warn[data-warn-aluno-id="' + String(alunoId) + '"]') : null;
      if (!warn) return;
      if (remaining !== null) {
        var span = warn.querySelector('span');
        if (span) span.textContent = 'Máximo disponível: ' + toOneDecimalLabel(remaining);
        warn.classList.remove('d-none');
      } else {
        warn.classList.add('d-none');
      }
    }

    function showFormNotaWarn(remaining) {
      var warn = document.getElementById('notasDesempenhoFormNotaWarn');
      if (!warn) return;
      if (remaining !== null) {
        var span = warn.querySelector('span');
        if (span) span.textContent = 'Máximo disponível: ' + toOneDecimalLabel(remaining);
        warn.classList.remove('d-none');
      } else {
        warn.classList.add('d-none');
      }
    }

    function applyManualNotaInputLimits() {
      var context = buildManualLimitContext();

      if (isFormEditMode()) {
        if (!(formNotaInput instanceof HTMLInputElement)) {
          return;
        }

        var selectedIds = getSelectedAlunoIdsFromForm();
        if (!context || selectedIds.length !== 1) {
          formNotaInput.removeAttribute('max');
          formNotaInput.removeAttribute('title');
          return;
        }

        var remaining = getRemainingManualLimitForAluno(selectedIds[0], context, recordIdInput ? recordIdInput.value : '');
        formNotaInput.max = toOneDecimalString(remaining);
        formNotaInput.title = 'Máximo disponível para este tipo: ' + toOneDecimalLabel(remaining);

        var currentValue = normalizeOneDecimalInputValue(formNotaInput.value || '');
        if (currentValue !== null && currentValue !== '' && Number(currentValue) > remaining) {
          formNotaInput.value = toOneDecimalString(remaining);
          showFormNotaWarn(remaining);
        } else if (currentValue !== null && currentValue !== '' && Number(currentValue) > 0) {
          showFormNotaWarn(remaining < 10 ? remaining : null);
        } else {
          showFormNotaWarn(remaining < 10 ? remaining : null);
        }
        return;
      }

      if (!(bulkNotasBody instanceof HTMLElement)) {
        return;
      }

      var editingRecordId = recordIdInput ? recordIdInput.value : '';
      bulkNotasBody.querySelectorAll('.js-notas-bulk-nota-input').forEach(function (input) {
        if (!(input instanceof HTMLInputElement)) {
          return;
        }

        var alunoId = Number(input.getAttribute('data-aluno-id') || 0);
        if (!context || alunoId <= 0) {
          input.removeAttribute('max');
          input.removeAttribute('title');
          return;
        }

        var remaining = getRemainingManualLimitForAluno(alunoId, context, editingRecordId);
        input.max = toOneDecimalString(remaining);
        input.title = 'Máximo disponível para este tipo: ' + toOneDecimalLabel(remaining);

        var currentValue = normalizeOneDecimalInputValue(input.value || '');
        if (currentValue !== null && currentValue !== '' && Number(currentValue) > remaining) {
          input.value = toOneDecimalString(remaining);
          showBulkNotaWarn(alunoId, remaining);
        } else {
          showBulkNotaWarn(alunoId, remaining < 10 ? remaining : null);
        }
      });
    }

    function syncFormCicloFieldVisibility() {
      var show = isSubjetivaCategoria(formCategoriaSelect ? formCategoriaSelect.value : '');
      if (formCicloWrap) {
        formCicloWrap.classList.toggle('d-none', !show);
      }
      if (formCicloSelect) {
        formCicloSelect.disabled = !show;
        formCicloSelect.required = show;
        if (!show) {
          formCicloSelect.value = '';
        }
      }
    }

    function getSelectedAlunoIdsFromForm() {
      if (!formAlunoSelect) {
        return [];
      }

      return Array.prototype.slice.call(formAlunoSelect.options || [])
        .filter(function (option) {
          return option && option.selected && String(option.value || '').trim() !== '';
        })
        .map(function (option) {
          return Number(option.value || 0);
        })
        .filter(function (id) {
          return id > 0;
        });
    }

    function updateFormAlunosSummary() {
      if (!formAlunosSummaryEl || !formAlunoSelect) {
        return;
      }

      var turmaSelecionada = formTurmaSelect ? String(formTurmaSelect.value || '').trim() : '';
      if (turmaSelecionada === '') {
        formAlunosSummaryEl.textContent = 'Selecione uma turma';
        return;
      }

      var selectedOptions = Array.prototype.slice.call(formAlunoSelect.options || []).filter(function (option) {
        return option && option.selected && String(option.value || '').trim() !== '';
      });

      if (!selectedOptions.length) {
        formAlunosSummaryEl.textContent = 'Nenhum estudante selecionado';
        return;
      }

      var labels = selectedOptions.map(function (option) {
        return String(option.textContent || option.label || '').trim();
      }).filter(function (label) {
        return label !== '';
      });

      if (labels.length <= 2) {
        formAlunosSummaryEl.textContent = labels.join(' • ');
      } else {
        formAlunosSummaryEl.textContent = labels.slice(0, 2).join(' • ') + ' +' + (labels.length - 2);
      }
    }

    function refreshBulkNotasTable() {
      if (!bulkNotasWrap || !bulkNotasBody || !formAlunoSelect) {
        return;
      }

      updateFormAlunosSummary();

      var editMode = isFormEditMode();
      if (formNotaWrap) {
        formNotaWrap.classList.toggle('d-none', !editMode);
      }

      if (editMode) {
        bulkNotasWrap.classList.add('d-none');
        bulkNotasBody.innerHTML = '';
        return;
      }

      var selectedIds = getSelectedAlunoIdsFromForm();
      if (!selectedIds.length) {
        bulkNotasWrap.classList.add('d-none');
        bulkNotasBody.innerHTML = '';
        return;
      }

      var existingNotas = {};
      bulkNotasBody.querySelectorAll('.js-notas-bulk-nota-input').forEach(function (input) {
        if (!(input instanceof HTMLInputElement)) {
          return;
        }
        var alunoId = Number(input.getAttribute('data-aluno-id') || 0);
        if (alunoId > 0) {
          existingNotas[alunoId] = String(input.value || '').trim();
        }
      });

      var alunosMap = {};
      (Array.isArray(initialAlunos) ? initialAlunos : []).forEach(function (item) {
        var alunoId = Number(item && item.id ? item.id : 0);
        if (alunoId > 0) {
          alunosMap[alunoId] = item;
        }
      });

      bulkNotasBody.innerHTML = selectedIds.map(function (alunoId) {
        var aluno = alunosMap[alunoId] || {};
        var notaValue = existingNotas[alunoId] != null ? existingNotas[alunoId] : '';
        return '<tr>'
          + '<td>' + esc(String(aluno.nome || 'Estudante')) + '</td>'
          + '<td>' + esc(String(aluno.turma || '-')) + '</td>'
          + '<td>'
          + '<div class="notas-bulk-nota-warn d-none text-warning small mb-1" data-warn-aluno-id="' + esc(alunoId) + '"><i class="las la-exclamation-triangle me-1"></i><span></span></div>'
          + '<input type="number" step="0.1" min="0" class="form-control form-control-sm js-notas-bulk-nota-input" data-aluno-id="' + esc(alunoId) + '" value="' + esc(notaValue) + '" placeholder="0,0">'
          + '</td>'
          + '</tr>';
      }).join('');

      bulkNotasWrap.classList.remove('d-none');
    }

    function collectBulkNotasPayload() {
      if (isFormEditMode()) {
        return { alunoIds: [], notasMap: {} };
      }

      var alunoIds = getSelectedAlunoIdsFromForm();
      if (!alunoIds.length) {
        throw new Error('Selecione pelo menos um estudante.');
      }

      var notasMap = {};
      alunoIds.forEach(function (alunoId) {
        var input = bulkNotasBody
          ? bulkNotasBody.querySelector('.js-notas-bulk-nota-input[data-aluno-id="' + String(alunoId) + '"]')
          : null;
        var normalizedNota = normalizeOneDecimalInputValue(input && input.value != null ? input.value : '');
        if (normalizedNota === null || normalizedNota === '') {
          var aluno = (Array.isArray(initialAlunos) ? initialAlunos : []).find(function (item) {
            return Number(item && item.id ? item.id : 0) === alunoId;
          });
          throw new Error('Informe uma nota válida (1 casa decimal) para ' + String(aluno && aluno.nome ? aluno.nome : ('estudante #' + alunoId)) + '.');
        }
        notasMap[String(alunoId)] = normalizedNota;
      });

      return { alunoIds: alunoIds, notasMap: notasMap };
    }

    function renderFormAlunoOptions(turmaIdValue, selectedAlunoIdsValue) {
      if (!formAlunoSelect) return;

      var turmaId = Number(turmaIdValue || 0);
      var selectedAlunoIds = Array.isArray(selectedAlunoIdsValue)
        ? selectedAlunoIdsValue.map(function (id) { return Number(id || 0); }).filter(function (id) { return id > 0; })
        : (Number(selectedAlunoIdsValue || 0) > 0 ? [Number(selectedAlunoIdsValue || 0)] : []);

      var selectedSet = {};
      selectedAlunoIds.forEach(function (id) {
        selectedSet[id] = true;
      });

      var alunosBase = Array.isArray(initialAlunos) ? initialAlunos : [];
      var alunosFiltrados = turmaId > 0
        ? alunosBase.filter(function (a) { return Number(a && a.turma_id ? a.turma_id : 0) === turmaId; })
        : [];

      var optionsHtml = '';
      if (turmaId <= 0) {
        optionsHtml = '';
      } else {
        optionsHtml += alunosFiltrados.map(function (a) {
          var alunoId = Number(a && a.id ? a.id : 0);
          var alunoNome = String(a && a.nome ? a.nome : '').trim();
          var alunoTurma = String(a && a.turma ? a.turma : '').trim();
          var selected = selectedSet[alunoId] ? ' selected' : '';
          return '<option value="' + esc(alunoId) + '"' + selected + '>' + esc(alunoNome + ' • ' + alunoTurma) + '</option>';
        }).join('');
      }

      formAlunoSelect.innerHTML = optionsHtml;
      updateFormDisciplinaOptions(turmaId);
      updateFormAlunosSummary();
      refreshBulkNotasTable();
    }

    function resetForm() {
      if (!formEl) return;
      formEl.reset();
      if (recordIdInput) recordIdInput.value = '';
      var anoInput = formEl.querySelector('[name="ano_letivo"]');
      if (anoInput) anoInput.value = String(new Date().getFullYear());
      var dataInput = formEl.querySelector('[name="data_referencia"]');
      if (dataInput) dataInput.value = dateInputValueLocal(new Date());
      renderFormAlunoOptions('', '');
      if (formNotaInput) {
        formNotaInput.step = '0.1';
      }
      if (formCicloSelect) {
        formCicloSelect.value = '';
      }
      setFormError('');
      if (formTitle) formTitle.textContent = 'Novo lançamento';
      if (formSubmitBtn) formSubmitBtn.innerHTML = '<i class="las la-save me-1"></i>Salvar lançamento';
      syncFormCicloFieldVisibility();
      refreshBulkNotasTable();
      applyManualNotaInputLimits();
      notasHbAvaliadasSelected = [];
      notasHbRenderTags('avaliadas');
    }

    function applyFormDefaultsFromCurrentFilters() {
      if (!formEl) return;

      var turmaValues = selectedValues(turmaSelect);
      var bimestreValues = selectedValues(bimestreSelect);
      var anoValues = selectedValues(anoSelect);
      var disciplinaValues = selectedValues(disciplinaSelect);

      var turmaField = formEl.querySelector('[name="turma_id"]');
      var bimestreField = formEl.querySelector('[name="bimestre"]');
      var anoField = formEl.querySelector('[name="ano_letivo"]');
      var disciplinaField = formEl.querySelector('[name="disciplina"]');

      if (turmaField) {
        turmaField.value = turmaValues.length === 1 ? String(turmaValues[0]) : '';
      }

      if (bimestreField) {
        bimestreField.value = bimestreValues.length === 1 ? String(bimestreValues[0]) : '';
      }

      if (anoField) {
        anoField.value = anoValues.length === 1 ? String(anoValues[0]) : String(new Date().getFullYear());
      }

      if (disciplinaField) {
        disciplinaField.value = disciplinaValues.length === 1
          ? optionLabelByValue(disciplinaSelect, disciplinaValues[0])
          : '';
      }

      renderFormAlunoOptions(turmaField ? turmaField.value : '', '');
      applyManualNotaInputLimits();
    }

    function fillFormFromEntry(entry, options) {
      if (!formEl || !entry) return;
      var preserveOrigemContext = Boolean(options && options.preserveOrigemContext);
      if (!preserveOrigemContext) {
        formFromOrigemContext = null;
      }
      resetForm();

      if (recordIdInput) {
        recordIdInput.value = String(entry.id || '');
      }

      if (formTitle) formTitle.textContent = 'Editar lançamento';
      if (formSubmitBtn) formSubmitBtn.innerHTML = '<i class="las la-save me-1"></i>Atualizar lançamento';

      function setField(name, value) {
        var field = formEl.querySelector('[name="' + name + '"]');
        if (field) field.value = value == null ? '' : String(value);
      }

      setField('turma_id', entry.turma_id || '');
      renderFormAlunoOptions(entry.turma_id || '', [entry.aluno_id || '']);
      setField('ano_letivo', entry.ano_letivo || '');
      setField('bimestre', entry.bimestre || '');
      setField('categoria', entry.categoria || '');
      setField('ciclo', entry.ciclo || '');
      setField('titulo', entry.titulo || '');
      setField('descricao', entry.descricao || '');
      setField('disciplina', entry.disciplina || '');
      setField('nota', entry.nota || '');
      setField('nota_maxima', entry.nota_maxima || '');
      setField('data_referencia', entry.data_referencia || '');
      setField('habilidades_avaliadas', Array.isArray(entry.habilidades_avaliadas) ? entry.habilidades_avaliadas.join(', ') : '');
      notasHbAvaliadasSelected = notasHbParseList(Array.isArray(entry.habilidades_avaliadas) ? entry.habilidades_avaliadas.join(', ') : String(entry.habilidades_avaliadas || ''));
      notasHbRenderTags('avaliadas');
      setField('observacoes', entry.observacoes || '');
      syncFormCicloFieldVisibility();
      refreshBulkNotasTable();
      applyManualNotaInputLimits();

      if (formModal) formModal.show();
    }

    function deleteEntry(entryId, alunoId, turmaId, disciplina) {
      if (!entryId || !alunoId || !turmaId || !disciplina) return;
      var fd = new FormData();
      fd.append('csrf_token', csrfInput ? String(csrfInput.value || '') : '');
      fd.append('id', String(entryId));
      fd.append('aluno_id', String(alunoId));
      fd.append('turma_id', String(turmaId));
      fd.append('disciplina', String(disciplina));

      return fetch(buildEndpoint('/institucional/notas-desempenho/excluir'), {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: fd,
      })
        .then(function (r) { return r.json().then(function (p) { return { ok: r.ok, p: p }; }); })
        .then(function (res) {
          if (!res.ok || !res.p || res.p.ok !== true) {
            throw new Error(res.p && res.p.message ? res.p.message : 'Erro ao excluir lançamento.');
          }
          loadDashboard();
        })
        .catch(function (err) {
          showStatus(err && err.message ? err.message : 'Erro ao excluir lançamento.');
        });
    }

    function openManualFormFromBoletimContext(options) {
      if (!formEl) return;

      var ctx = options && typeof options === 'object' ? options : {};
      var alunoId = String(ctx.alunoId || '').trim();
      var turmaId = String(ctx.turmaId || '').trim();
      var bimestre = String(ctx.bimestre || '').trim();
      var disciplina = String(ctx.disciplina || '').trim();

      formFromOrigemContext = {
        alunoId: alunoId,
        disciplina: disciplina,
      };

      resetForm();
      applyFormDefaultsFromCurrentFilters();

      if (formTurmaSelect && turmaId) {
        formTurmaSelect.value = turmaId;
      }

      renderFormAlunoOptions(formTurmaSelect ? formTurmaSelect.value : turmaId, alunoId ? [alunoId] : []);
      refreshBulkNotasTable();

      var bimestreField = formEl.querySelector('[name="bimestre"]');
      if (bimestreField && bimestre) {
        bimestreField.value = bimestre;
      }

      var disciplinaField = formEl.querySelector('[name="disciplina"]');
      if (disciplinaField && disciplina) {
        disciplinaField.value = disciplina;
      }

      if (formModal) {
        formModal.show();
      }
    }

    if (formAlunosOpenBtn) {
      formAlunosOpenBtn.addEventListener('click', function () {
        if (!formTurmaSelect || String(formTurmaSelect.value || '').trim() === '') {
          setFormError('Selecione a turma antes de escolher os estudantes.');
          return;
        }

        setFormError('');
        renderModalChecklistFromSelect(formAlunoSelect, formAlunosListEl, 'form_alunos');
        if (formAlunosBuscaInput) {
          formAlunosBuscaInput.value = '';
          filterChecklistByText(formAlunosListEl, '');
        }
        if (formAlunosModal) {
          formAlunosModal.show();
        }
      });
    }

    if (formAlunosApplyBtn) {
      formAlunosApplyBtn.addEventListener('click', function () {
        applyChecklistToSelect(formAlunoSelect, formAlunosListEl);
        updateFormAlunosSummary();
        refreshBulkNotasTable();
      });
    }

    if (formAlunosListEl) {
      formAlunosListEl.addEventListener('change', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.classList.contains('js-filter-modal-checkbox')) {
          return;
        }

        applyChecklistToSelect(formAlunoSelect, formAlunosListEl);
        updateFormAlunosSummary();
        refreshBulkNotasTable();
      });
    }

    if (formAlunosSelectAllBtn) {
      formAlunosSelectAllBtn.addEventListener('click', function () {
        setAllChecklist(formAlunosListEl, true);
        applyChecklistToSelect(formAlunoSelect, formAlunosListEl);
        updateFormAlunosSummary();
        refreshBulkNotasTable();
      });
    }

    if (formAlunosClearBtn) {
      formAlunosClearBtn.addEventListener('click', function () {
        setAllChecklist(formAlunosListEl, false);
        applyChecklistToSelect(formAlunoSelect, formAlunosListEl);
        updateFormAlunosSummary();
        refreshBulkNotasTable();
      });
    }

    if (formAlunosBuscaInput) {
      formAlunosBuscaInput.addEventListener('input', function () {
        filterChecklistByText(formAlunosListEl, formAlunosBuscaInput.value || '');
      });
    }

    if (novoBtn) {
      novoBtn.addEventListener('click', function () {
        formFromOrigemContext = null;
        resetForm();
        applyFormDefaultsFromCurrentFilters();
        if (formModal) formModal.show();
      });
    }

    // ===== SELETOR DE HABILIDADES (NOTAS) =====

    function notasHbParseList(raw) {
      return String(raw || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
    }

    function notasHbJoinList(arr) {
      return arr.join(', ');
    }

    function notasHbRenderTags(field) {
      var arr = notasHbAvaliadasSelected;
      var wrapId = 'notasFormHabilidadesAvaliadasWrap';
      var hiddenId = 'notasDesempenhoFormHabilidadesAvaliadas';
      var wrap = document.getElementById(wrapId);
      var hidden = document.getElementById(hiddenId);
      if (hidden) hidden.value = notasHbJoinList(arr);
      if (!wrap) return;
      if (arr.length === 0) {
        wrap.innerHTML = '<span class="small text-secondary">Nenhuma habilidade selecionada.</span>';
        return;
      }
      var html = '';
      arr.forEach(function (hb) {
        html += '<span class="badge text-bg-info me-1 mb-1 d-inline-flex align-items-center gap-1" style="font-size:.78rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;">'
          + esc(hb)
          + '<button type="button" class="btn-close btn-close-white ms-1 js-notas-hb-tag-remove" data-hb-field="' + esc(field) + '" data-hb-value="' + esc(hb) + '" style="font-size:.6rem;" aria-label="Remover"></button>'
          + '</span>';
      });
      wrap.innerHTML = html;
    }

    function notasHbOpenSelector(field) {
      if (!notasHbSelectorModalEl) return;
      notasHbSelectorActiveField = field;
      notasHbSelectorSelected = notasHbAvaliadasSelected.slice();
      notasHbSelectorActiveFilter = 'todos';

      if (notasHbSelectorFieldLabel) {
        notasHbSelectorFieldLabel.textContent = 'Habilidades Avaliadas';
      }

      var disciplinaAtual = formDisciplinaInput ? String(formDisciplinaInput.value || '').trim() : '';
      if (notasHbSelectorDisciplinaInfo) {
        notasHbSelectorDisciplinaInfo.textContent = disciplinaAtual
          ? 'Filtrando pela disciplina: ' + disciplinaAtual
          : 'Nenhuma disciplina selecionada — mostrando todas as habilidades';
      }

      if (notasHbSelectorSearch) notasHbSelectorSearch.value = '';

      Array.prototype.forEach.call(notasHbSelectorFilterBtns, function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-notas-hb-filter') === 'todos');
      });

      notasHbUpdateCount();

      if (notasHbSelectorList) {
        notasHbSelectorList.innerHTML = '<div class="text-center text-secondary py-4">Carregando habilidades...</div>';
      }

      if (!notasHbSelectorBsModal && window.bootstrap && window.bootstrap.Modal) {
        if (notasHbSelectorModalEl.parentElement !== document.body) {
          document.body.appendChild(notasHbSelectorModalEl);
        }
        notasHbSelectorBsModal = new window.bootstrap.Modal(notasHbSelectorModalEl);
        notasHbSelectorModalEl.addEventListener('shown.bs.modal', function () {
          var backdrops = document.querySelectorAll('.modal-backdrop');
          if (backdrops.length > 0) {
            backdrops[backdrops.length - 1].style.zIndex = '1060';
          }
          notasHbSelectorModalEl.style.zIndex = '1065';
        });
      }

      if (notasHbSelectorBsModal) notasHbSelectorBsModal.show();

      notasHbFetchCache(function (cache) {
        notasHbRenderList(cache, disciplinaAtual);
      });
    }

    function notasHbUpdateCount() {
      if (notasHbSelectorCount) {
        notasHbSelectorCount.textContent = String(notasHbSelectorSelected.length) + ' selecionada(s)';
      }
    }

    function notasHbFetchCache(cb) {
      if (notasHbSelectorCache) { cb(notasHbSelectorCache); return; }
      fetch(buildEndpoint('/institucional/habilidades/listar'), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || !data.ok || !Array.isArray(data.habilidades)) throw new Error('Resposta inválida');
          var disciplinasMap = {};
          if (Array.isArray(data.disciplinas)) {
            data.disciplinas.forEach(function (d) { disciplinasMap[String(d.id)] = d.nome; });
          }
          notasHbSelectorCache = { habilidades: data.habilidades, disciplinasMap: disciplinasMap };
          cb(notasHbSelectorCache);
        })
        .catch(function () {
          if (notasHbSelectorList) {
            notasHbSelectorList.innerHTML = '<div class="text-center text-danger py-4">Erro ao carregar habilidades.</div>';
          }
        });
    }

    function notasHbNormalize(v) {
      var s = String(v || '').trim().toLowerCase();
      if (typeof s.normalize === 'function') s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return s;
    }

    function notasHbNormalizeDocumento(value) {
      return String(value || '').trim().toUpperCase();
    }

    function notasHbRenderList(cache, disciplinaAtual) {
      if (!notasHbSelectorList) return;
      if (!cache) {
        notasHbSelectorList.innerHTML = '<div class="text-center text-danger py-4">Erro ao carregar habilidades.</div>';
        return;
      }

      var searchValue = notasHbNormalize(notasHbSelectorSearch ? notasHbSelectorSearch.value : '');
      var filterDoc = notasHbNormalizeDocumento(notasHbSelectorActiveFilter || 'todos');
      var disciplinaNorm = notasHbNormalize(disciplinaAtual || '');

      var filtered = cache.habilidades.filter(function (h) {
        var documento = notasHbNormalizeDocumento(h.documento || '');
        if (filterDoc !== 'TODOS') {
          if (documento !== filterDoc) return false;
        }
        if (disciplinaNorm !== '') {
          var discNome = notasHbNormalize(cache.disciplinasMap[String(h.disciplina_id)] || '');
          if (discNome !== disciplinaNorm) return false;
        }
        if (searchValue !== '') {
          var hay = notasHbNormalize(String(h.codigo || '') + ' ' + String(h.descricao || '') + ' ' + String(h.documento || ''));
          if (hay.indexOf(searchValue) === -1) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        notasHbSelectorList.innerHTML = '<div class="text-center text-secondary py-3 small">Nenhuma habilidade encontrada.</div>';
        return;
      }

      var maxRender = filtered.length;
      var html = '';
      var rendered = Math.min(filtered.length, maxRender);
      for (var i = 0; i < rendered; i++) {
        var h = filtered[i];
        var codigo = String(h.codigo || '').trim();
        var descricao = String(h.descricao || '').trim();
        var documento = notasHbNormalizeDocumento(h.documento || '');
        var isChecked = notasHbSelectorSelected.indexOf(codigo) !== -1;
        var safeId = 'notasHbSel_' + i;
        var docBadge = documento === 'BNCC'
          ? '<span class="badge text-bg-primary ms-1" style="font-size:.65rem">BNCC</span>'
          : documento === 'DCT'
            ? '<span class="badge text-bg-success ms-1" style="font-size:.65rem">DCT</span>'
            : documento === 'MATRIZ'
              ? '<span class="badge text-bg-warning text-dark ms-1" style="font-size:.65rem">Matriz</span>'
            : '';
        var descCutAt = descricao.length > 90 ? (function () { var sp = descricao.lastIndexOf(' ', 90); return sp > 54 ? sp : 90; }()) : 90;
        var descTrunc = descricao.length > 90
          ? esc(descricao.slice(0, descCutAt)) + '<span class="js-notas-hb-desc-rest"> \u2026 <span class="js-notas-hb-desc-full d-none">' + esc(descricao.slice(descCutAt).trimStart()) + '</span><button type="button" class="btn btn-link btn-sm p-0 js-notas-hb-toggle-desc" style="font-size:.72rem;vertical-align:baseline;">ver mais</button></span>'
          : esc(descricao);
        html += '<div class="d-flex align-items-start gap-1 px-2 border-bottom hb-selector-row">'
          + '<label class="d-flex align-items-start gap-2 flex-grow-1 min-w-0 py-1 mb-0" style="cursor:pointer;" for="' + safeId + '">'
          + '<input type="checkbox" class="form-check-input mt-1 flex-shrink-0 js-notas-hb-check" id="' + safeId + '" value="' + esc(codigo) + '"' + (isChecked ? ' checked' : '') + '>'
          + '<div class="small flex-grow-1 min-w-0"><span class="fw-bold me-1">' + esc(codigo) + '</span>' + docBadge
          + '<div class="text-secondary" style="font-size:.78rem;line-height:1.4;">' + descTrunc + '</div>'
          + '</div></label></div>';
      }

      notasHbSelectorList.innerHTML = html;
    }

    function notasHbConfirm() {
      notasHbAvaliadasSelected = notasHbSelectorSelected.slice();
      notasHbRenderTags(notasHbSelectorActiveField);
      if (notasHbSelectorBsModal) notasHbSelectorBsModal.hide();
    }

    function notasHbAddCustom() {
      if (!notasHbSelectorCustomInput) return;
      var value = String(notasHbSelectorCustomInput.value || '').replace(/\s+/g, ' ').trim();
      if (!value) return;
      if (notasHbSelectorSelected.indexOf(value) === -1) notasHbSelectorSelected.push(value);
      notasHbSelectorCustomInput.value = '';
      notasHbUpdateCount();
      var disciplinaAtual = formDisciplinaInput ? String(formDisciplinaInput.value || '').trim() : '';
      notasHbRenderList(notasHbSelectorCache, disciplinaAtual);
    }

    if (formCategoriaSelect) {
      formCategoriaSelect.addEventListener('change', function () {
        syncFormCicloFieldVisibility();
        applyManualNotaInputLimits();
      });
    }

    if (formCicloSelect) {
      formCicloSelect.addEventListener('change', function () {
        applyManualNotaInputLimits();
      });
    }

    if (formDisciplinaInput) {
      formDisciplinaInput.addEventListener('input', function () {
        applyManualNotaInputLimits();
      });
      formDisciplinaInput.addEventListener('change', function () {
        applyManualNotaInputLimits();
      });
    }

    ['ano_letivo', 'bimestre'].forEach(function (fieldName) {
      var field = formEl ? formEl.querySelector('[name="' + fieldName + '"]') : null;
      if (!field) return;
      field.addEventListener('change', function () {
        applyManualNotaInputLimits();
      });
    });

    if (formNotaInput) {
      formNotaInput.addEventListener('input', function () {
        var context = buildManualLimitContext();
        var selectedIds = getSelectedAlunoIdsFromForm();
        if (!context || selectedIds.length !== 1) { showFormNotaWarn(null); return; }
        var remaining = getRemainingManualLimitForAluno(selectedIds[0], context, recordIdInput ? recordIdInput.value : '');
        var v = Number(String(formNotaInput.value || '').replace(',', '.'));
        showFormNotaWarn(remaining < 10 ? remaining : null);
        if (isFinite(v) && v > remaining) {
          formNotaInput.classList.add('is-invalid');
        } else {
          formNotaInput.classList.remove('is-invalid');
        }
      });
      formNotaInput.addEventListener('blur', function () {
        var context = buildManualLimitContext();
        var selectedIds = getSelectedAlunoIdsFromForm();
        if (!context || selectedIds.length !== 1) return;
        var remaining = getRemainingManualLimitForAluno(selectedIds[0], context, recordIdInput ? recordIdInput.value : '');
        var v = Number(String(formNotaInput.value || '').replace(',', '.'));
        if (isFinite(v) && v > remaining) {
          formNotaInput.value = toOneDecimalString(remaining);
          formNotaInput.classList.remove('is-invalid');
        }
      });
    }

    if (bulkNotasBody) {
      bulkNotasBody.addEventListener('input', function (event) {
        var input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.classList.contains('js-notas-bulk-nota-input')) return;
        var alunoId = Number(input.getAttribute('data-aluno-id') || 0);
        if (alunoId <= 0) return;
        var context = buildManualLimitContext();
        if (!context) { showBulkNotaWarn(alunoId, null); return; }
        var remaining = getRemainingManualLimitForAluno(alunoId, context, '');
        showBulkNotaWarn(alunoId, remaining < 10 ? remaining : null);
        var v = Number(String(input.value || '').replace(',', '.'));
        if (isFinite(v) && v > remaining) {
          input.classList.add('is-invalid');
        } else {
          input.classList.remove('is-invalid');
        }
      });
      bulkNotasBody.addEventListener('blur', function (event) {
        var input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.classList.contains('js-notas-bulk-nota-input')) return;
        var alunoId = Number(input.getAttribute('data-aluno-id') || 0);
        if (alunoId <= 0) return;
        var context = buildManualLimitContext();
        if (!context) return;
        var remaining = getRemainingManualLimitForAluno(alunoId, context, '');
        var v = Number(String(input.value || '').replace(',', '.'));
        if (isFinite(v) && v > remaining) {
          input.value = toOneDecimalString(remaining);
          input.classList.remove('is-invalid');
        }
      }, true);
    }

    if (formSubmitBtn) {
      formSubmitBtn.addEventListener('click', function () {
        if (!formEl) return;
        if (!formModalEl || !formModalEl.classList.contains('show')) {
          return;
        }
        setFormError('');

        var isEdit = isFormEditMode();
        var formData = new FormData(formEl);

        try {
          var turmaId = Number(formData.get('turma_id') || 0);
          if (!isFinite(turmaId) || turmaId <= 0) {
            throw new Error('Selecione a turma do lançamento.');
          }

          var disciplina = String(formData.get('disciplina') || '').trim();
          if (!disciplina) {
            throw new Error('Selecione a disciplina do lançamento.');
          }

          if (!isDisciplinaAllowedForTurma(String(turmaId), disciplina)) {
            throw new Error('Você não possui vínculo direto desta disciplina com a turma selecionada.');
          }

          var categoria = String(formData.get('categoria') || '').trim();
          if (isSubjetivaCategoria(categoria)) {
            var ciclo = String(formData.get('ciclo') || '').trim();
            if (ciclo !== '1' && ciclo !== '2') {
              throw new Error('Selecione o ciclo da Avaliação Subjetiva (1º ou 2º).');
            }
          } else {
            formData.set('ciclo', '');
          }

          if (isEdit) {
            var selectedIdsEdit = getSelectedAlunoIdsFromForm();
            if (selectedIdsEdit.length !== 1) {
              throw new Error('Na edição, selecione apenas um estudante.');
            }
            formData.set('aluno_id', String(selectedIdsEdit[0]));
            var notaEdit = normalizeOneDecimalInputValue(formData.get('nota'));
            if (notaEdit !== null && notaEdit !== '') {
              formData.set('nota', notaEdit);
            }
          } else {
            var bulkPayload = collectBulkNotasPayload();
            formData.delete('aluno_id');
            formData.delete('nota');
            formData.append('aluno_ids_json', JSON.stringify(bulkPayload.alunoIds));
            formData.append('notas_por_aluno_json', JSON.stringify(bulkPayload.notasMap));
          }
        } catch (error) {
          setFormError(error && error.message ? error.message : 'Não foi possível validar os dados.');
          return;
        }

        openConfirmModal(
          isEdit ? 'Atualizar lançamento' : 'Salvar lançamento',
          isEdit
            ? 'Confirma atualizar este lançamento manual?'
            : 'Confirma salvar este lançamento manual?',
          function () {
            formSubmitBtn.disabled = true;

            return fetch(buildEndpoint('/institucional/notas-desempenho/salvar'), {
              method: 'POST',
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
              body: formData,
            })
              .then(function (r) { return r.json().then(function (p) { return { ok: r.ok, p: p }; }); })
              .then(function (res) {
                if (!res.ok || !res.p || res.p.ok !== true) {
                  throw new Error(res.p && res.p.message ? res.p.message : 'Erro ao salvar.');
                }
                var savedRecordId = String((res.p && res.p.data && res.p.data.id) ? res.p.data.id : '').trim();
                if (savedRecordId !== '' && isEdit) {
                  origemLancamentoHighlight.id = savedRecordId;
                  origemLancamentoHighlight.until = Date.now() + 4500;
                }
                if (formModal) formModal.hide();
                return loadDashboard().then(function () {
                  if (formFromOrigemContext && formFromOrigemContext.alunoId && formFromOrigemContext.disciplina) {
                    renderBoletimOrigemModal(formFromOrigemContext.alunoId, formFromOrigemContext.disciplina);
                  }
                });
              })
              .catch(function (err) { setFormError(err.message || 'Erro ao salvar.'); })
              .finally(function () { formSubmitBtn.disabled = false; });
          }
        );
      });
    }

    if (formModalEl) {
      formModalEl.addEventListener('hidden.bs.modal', function () {
        if (!formFromOrigemContext || !formFromOrigemContext.alunoId || !formFromOrigemContext.disciplina) {
          return;
        }

        renderBoletimOrigemModal(formFromOrigemContext.alunoId, formFromOrigemContext.disciplina);
      });
    }

    if (confirmModalEl) {
      confirmModalEl.addEventListener('hidden.bs.modal', function () {
        confirmAction = null;
        if (confirmModalConfirmBtn) {
          confirmModalConfirmBtn.disabled = false;
        }
      });
    }

    if (confirmModalConfirmBtn) {
      confirmModalConfirmBtn.addEventListener('click', function () {
        var action = confirmAction;
        if (!action) {
          if (confirmModal) confirmModal.hide();
          return;
        }

        confirmModalConfirmBtn.disabled = true;
        Promise.resolve()
          .then(function () { return action(); })
          .finally(function () {
            if (confirmModal) confirmModal.hide();
          });
      });
    }

    // Auto-fill turma when aluno changes
    if (formAlunoSelect) {
      formAlunoSelect.addEventListener('change', function () {
        var selectedIds = getSelectedAlunoIdsFromForm();
        var id = selectedIds.length ? Number(selectedIds[0]) : 0;
        var found = initialAlunos.find(function (a) { return Number(a.id) === id; });
        if (found && formTurmaSelect && !formTurmaSelect.value) {
          formTurmaSelect.value = String(found.turma_id || '');
        }
        refreshBulkNotasTable();
        applyManualNotaInputLimits();
      });
    }

    if (formTurmaSelect) {
      formTurmaSelect.addEventListener('change', function () {
        renderFormAlunoOptions(formTurmaSelect.value || '', []);
        applyManualNotaInputLimits();
      });
    }

    if (formEl) {
      formEl.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;

        var openBtn = target.closest('.js-notas-hb-select-btn');
        if (openBtn instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          notasHbOpenSelector(String(openBtn.getAttribute('data-hb-field') || 'avaliadas').trim() || 'avaliadas');
          return;
        }

        var removeBtn = target.closest('.js-notas-hb-tag-remove');
        if (!(removeBtn instanceof HTMLElement)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        var removeValue = String(removeBtn.getAttribute('data-hb-value') || '').trim();
        if (!removeValue) {
          return;
        }

        notasHbAvaliadasSelected = notasHbAvaliadasSelected.filter(function (item) {
          return item !== removeValue;
        });
        notasHbRenderTags('avaliadas');
      });
    }

    if (notasHbSelectorList) {
      notasHbSelectorList.addEventListener('change', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.classList.contains('js-notas-hb-check')) {
          return;
        }

        var value = String(target.value || '').trim();
        if (!value) {
          return;
        }

        if (target.checked) {
          if (notasHbSelectorSelected.indexOf(value) === -1) {
            notasHbSelectorSelected.push(value);
          }
        } else {
          notasHbSelectorSelected = notasHbSelectorSelected.filter(function (item) {
            return item !== value;
          });
        }

        notasHbUpdateCount();
      });

      notasHbSelectorList.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;

        var toggleBtn = target.closest('.js-notas-hb-toggle-desc');
        if (!(toggleBtn instanceof HTMLElement)) {
          return;
        }

        event.preventDefault();
        var restWrap = toggleBtn.closest('.js-notas-hb-desc-rest');
        if (!(restWrap instanceof HTMLElement)) {
          return;
        }

        var fullText = restWrap.querySelector('.js-notas-hb-desc-full');
        if (!(fullText instanceof HTMLElement)) {
          return;
        }

        var expanded = !fullText.classList.contains('d-none');
        fullText.classList.toggle('d-none', expanded);
        toggleBtn.textContent = expanded ? 'ver mais' : 'ver menos';
      });
    }

    if (notasHbSelectorSearch) {
      notasHbSelectorSearch.addEventListener('input', function () {
        var disciplinaAtual = formDisciplinaInput ? String(formDisciplinaInput.value || '').trim() : '';
        notasHbRenderList(notasHbSelectorCache, disciplinaAtual);
      });
    }

    Array.prototype.forEach.call(notasHbSelectorFilterBtns, function (btn) {
      btn.addEventListener('click', function () {
        notasHbSelectorActiveFilter = String(btn.getAttribute('data-notas-hb-filter') || 'todos').trim() || 'todos';
        Array.prototype.forEach.call(notasHbSelectorFilterBtns, function (innerBtn) {
          innerBtn.classList.toggle('active', innerBtn === btn);
        });
        var disciplinaAtual = formDisciplinaInput ? String(formDisciplinaInput.value || '').trim() : '';
        notasHbRenderList(notasHbSelectorCache, disciplinaAtual);
      });
    });

    if (notasHbSelectorCustomInput) {
      notasHbSelectorCustomInput.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') {
          return;
        }
        event.preventDefault();
        notasHbAddCustom();
      });
    }

    if (notasHbSelectorCustomAddBtn) {
      notasHbSelectorCustomAddBtn.addEventListener('click', function (event) {
        event.preventDefault();
        notasHbAddCustom();
      });
    }

    if (notasHbSelectorConfirmBtn) {
      notasHbSelectorConfirmBtn.addEventListener('click', function (event) {
        event.preventDefault();
        notasHbConfirm();
      });
    }

    if (notasHbSelectorModalEl) {
      notasHbSelectorModalEl.addEventListener('hidden.bs.modal', function () {
        if (formModalEl && formModalEl.classList.contains('show')) {
          document.body.classList.add('modal-open');
        }
      });
    }

    syncFormCicloFieldVisibility();

    if (entriesBody) {
      entriesBody.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;

        var editBtn = target.closest('.js-notas-entry-edit');
        if (editBtn instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          var editId = String(editBtn.getAttribute('data-id') || '');
          if (state.entriesById[editId]) {
            fillFormFromEntry(state.entriesById[editId]);
          }
          return;
        }

        var deleteBtn = target.closest('.js-notas-entry-delete');
        if (deleteBtn instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          var entryId = deleteBtn.getAttribute('data-id') || '';
          var alunoId = deleteBtn.getAttribute('data-aluno-id') || '';
          var turmaId = deleteBtn.getAttribute('data-turma-id') || '';
          var disciplina = deleteBtn.getAttribute('data-disciplina') || '';
          openConfirmModal(
            'Excluir lançamento',
            'Deseja realmente excluir este lançamento manual?',
            function () { return deleteEntry(entryId, alunoId, turmaId, disciplina); }
          );
        }
      });
    }

    if (exportSgeBtn) {
      exportSgeBtn.addEventListener('click', exportSgeCsv);
    }

    /* ====================================================================
     *  Start
     * ==================================================================== */

    autoRefreshTimer = window.setInterval(function () {
      loadDashboard({
        silent: true,
        preserveView: true,
        deferIfBusy: true,
        renderIfUnchanged: false,
      });
    }, AUTO_REFRESH_INTERVAL);

    loadDashboard({ preserveView: true });
    setTimeout(syncBoletimXScroll, 0);
  });
})();
