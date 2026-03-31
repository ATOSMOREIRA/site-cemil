(function () {
  'use strict';

  if (!window.__useDedicatedHabilidadesScript) return;

  /* ── helpers ─────────────────────────────────────────── */

  function resolveBasePath() {
    var pathname = String(window.location.pathname || '');
    var idx = pathname.indexOf('/index.php/');
    return idx >= 0 ? pathname.slice(0, idx) : '';
  }

  function buildEndpoint(path) {
    var base = resolveBasePath();
    var pathname = String(window.location.pathname || '');
    if (pathname.indexOf('/index.php/') >= 0) return base + '/index.php' + path;
    return base + path;
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  function norm(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function showStatus(message, isError) {
    var existing = document.querySelector('.hb-top-status');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.className = 'hb-top-status alert ' + (isError ? 'alert-danger' : 'alert-success') + ' shadow-sm';
    el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;min-width:280px;max-width:92vw;padding:.5rem .85rem;font-size:.9rem;font-weight:500;';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 4000);
  }

  function bsModal(id) {
    var el = document.getElementById(id);
    if (!el || typeof bootstrap === 'undefined') return null;
    return bootstrap.Modal.getOrCreateInstance(el);
  }

  /* ── state ──────────────────────────────────────────── */

  var allHabilidades = [];
  var disciplinasMap = {};
  var disciplinasList = [];
  var pendingDeleteIds = [];
  var saving = false;

  /* ── DOM refs ───────────────────────────────────────── */

  var searchInput = document.getElementById('hbSearch');
  var filterDoc = document.getElementById('hbFilterDocumento');
  var filterDisc = document.getElementById('hbFilterDisciplina');
  var filterAno = document.getElementById('hbFilterAno');
  var filterAtivo = document.getElementById('hbFilterAtivo');
  var selectAll = document.getElementById('hbSelectAll');
  var deleteSelectedBtn = document.getElementById('hbDeleteSelectedBtn');
  var newBtn = document.getElementById('hbNewBtn');
  var importBtn = document.getElementById('hbImportBtn');
  var tableBody = document.getElementById('hbTableBody');
  var tableEmpty = document.getElementById('hbTableEmpty');

  /* form */
  var formModal = document.getElementById('hbFormModal');
  var form = document.getElementById('hbForm');
  var formId = document.getElementById('hbFormId');
  var formCodigo = document.getElementById('hbFormCodigo');
  var formDocumento = document.getElementById('hbFormDocumento');
  var formTipo = document.getElementById('hbFormTipo');
  var formDisciplina = document.getElementById('hbFormDisciplina');
  var formAno = document.getElementById('hbFormAno');
  var formEtapa = document.getElementById('hbFormEtapa');
  var formDescricao = document.getElementById('hbFormDescricao');
  var formUnidade = document.getElementById('hbFormUnidade');
  var formObjeto = document.getElementById('hbFormObjeto');
  var formComplementar = document.getElementById('hbFormComplementar');
  var formFonte = document.getElementById('hbFormFonte');
  var formAtivo = document.getElementById('hbFormAtivo');
  var formLabel = document.getElementById('hbFormModalLabel');
  var formSubmitBtn = document.getElementById('hbFormSubmitBtn');

  /* view */
  var viewModalBody = document.getElementById('hbViewModalBody');
  var viewModalTitle = document.getElementById('hbViewModalTitle');

  /* delete confirm */
  var deleteText = document.getElementById('hbDeleteConfirmText');
  var deleteConfirmBtn = document.getElementById('hbDeleteConfirmBtn');

  /* import */
  var importFile = document.getElementById('hbImportFile');
  var importText = document.getElementById('hbImportText');
  var importPreview = document.getElementById('hbImportPreviewStatus');
  var importSubmitBtn = document.getElementById('hbImportSubmitBtn');

  /* ── data loading ───────────────────────────────────── */

  function loadData() {
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-4">Carregando...</td></tr>';

    fetch(buildEndpoint('/institucional/habilidades/listar'), {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.ok) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Erro ao carregar dados.</td></tr>';
        return;
      }

      allHabilidades = Array.isArray(data.habilidades) ? data.habilidades : [];
      var disciplinas = Array.isArray(data.disciplinas) ? data.disciplinas : [];
      disciplinasMap = {};
      disciplinasList = disciplinas;

      disciplinas.forEach(function (d) {
        disciplinasMap[String(d.id)] = d.nome || '';
      });

      populateDisciplinaSelects(disciplinas);
      populateAnoFilter();
      renderTable();
    })
    .catch(function () {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Falha na conexão.</td></tr>';
    });
  }

  function populateDisciplinaSelects(disciplinas) {
    var opts = '<option value="">Componente Curricular</option>';
    var formOpts = '<option value="">Selecione</option>';

    disciplinas.forEach(function (d) {
      var id = String(d.id);
      var nome = esc(d.nome || '');
      opts += '<option value="' + id + '">' + nome + '</option>';
      formOpts += '<option value="' + id + '">' + nome + '</option>';
    });

    if (filterDisc) filterDisc.innerHTML = opts;
    if (formDisciplina) formDisciplina.innerHTML = formOpts;
  }

  function populateAnoFilter() {
    var anos = {};
    allHabilidades.forEach(function (h) {
      var a = String(h.ano_escolar || '').trim();
      if (a) anos[a] = true;
    });

    var sorted = Object.keys(anos).sort();
    var opts = '<option value="">Ano escolar</option>';
    sorted.forEach(function (a) {
      opts += '<option value="' + esc(a) + '">' + esc(a) + '</option>';
    });
    if (filterAno) filterAno.innerHTML = opts;
  }

  /* ── render ─────────────────────────────────────────── */

  function getFilteredData() {
    var searchVal = norm(searchInput ? searchInput.value : '');
    var docVal = filterDoc ? filterDoc.value : '';
    var discVal = filterDisc ? filterDisc.value : '';
    var anoVal = filterAno ? filterAno.value : '';
    var ativoVal = filterAtivo ? filterAtivo.value : '';

    return allHabilidades.filter(function (h) {
      if (docVal && String(h.documento || '') !== docVal) return false;
      if (discVal && String(h.disciplina_id || '0') !== discVal) return false;
      if (anoVal && String(h.ano_escolar || '') !== anoVal) return false;
      if (ativoVal !== '' && String(h.ativo) !== ativoVal) return false;

      if (searchVal) {
        var text = norm([
          h.codigo, h.descricao, h.documento, h.tipo,
          disciplinasMap[String(h.disciplina_id)] || '',
          h.ano_escolar, h.etapa_ensino, h.unidade_tematica, h.objeto_conhecimento
        ].join(' '));
        if (text.indexOf(searchVal) < 0) return false;
      }

      return true;
    });
  }

  function renderTable() {
    var filtered = getFilteredData();

    if (filtered.length === 0) {
      tableBody.innerHTML = '';
      if (tableEmpty) tableEmpty.classList.remove('d-none');
      updateSelectAllState();
      return;
    }

    if (tableEmpty) tableEmpty.classList.add('d-none');

    var html = '';
    filtered.forEach(function (h) {
      var id = parseInt(h.id, 10) || 0;
      var codigo = esc(h.codigo || '');
      var documento = esc(h.documento || '');
      var discNome = esc(disciplinasMap[String(h.disciplina_id)] || '-');
      var ano = esc(h.ano_escolar || '-');
      var descricao = String(h.descricao || '');
      var descricaoShort = descricao.length > 80 ? esc(descricao.substring(0, 80)) + '&hellip;' : esc(descricao);
      var ativo = parseInt(h.ativo, 10);
      var statusBadge = ativo
        ? '<span class="badge text-bg-success">Ativo</span>'
        : '<span class="badge text-bg-secondary">Inativo</span>';

      html += '<tr data-hb-id="' + id + '">'
        + '<td><input type="checkbox" class="form-check-input js-hb-select" data-id="' + id + '" aria-label="Selecionar"></td>'
        + '<td><strong>' + codigo + '</strong></td>'
        + '<td>' + documento + '</td>'
        + '<td>' + discNome + '</td>'
        + '<td>' + ano + '</td>'
        + '<td class="small">' + descricaoShort + '</td>'
        + '<td>' + statusBadge + '</td>'
        + '<td class="text-end">'
        + '<button type="button" class="btn btn-outline-info btn-sm js-hb-view" data-id="' + id + '"><i class="las la-eye me-1"></i>Ver</button> '
        + '<button type="button" class="btn btn-outline-primary btn-sm js-hb-edit" data-id="' + id + '"><i class="las la-pen me-1"></i>Editar</button> '
        + '<button type="button" class="btn btn-outline-danger btn-sm js-hb-delete" data-id="' + id + '"><i class="las la-trash-alt me-1"></i>Excluir</button>'
        + '</td></tr>';
    });

    tableBody.innerHTML = html;
    updateSelectAllState();
  }

  /* ── select all / delete selected ───────────────────── */

  function updateSelectAllState() {
    var checks = tableBody ? tableBody.querySelectorAll('.js-hb-select') : [];
    var checkedCount = 0;
    checks.forEach(function (c) { if (c.checked) checkedCount++; });

    if (selectAll) selectAll.checked = checks.length > 0 && checkedCount === checks.length;
    if (deleteSelectedBtn) deleteSelectedBtn.disabled = checkedCount === 0;
  }

  if (selectAll) {
    selectAll.addEventListener('change', function () {
      var checks = tableBody ? tableBody.querySelectorAll('.js-hb-select') : [];
      var val = selectAll.checked;
      checks.forEach(function (c) { c.checked = val; });
      updateSelectAllState();
    });
  }

  if (tableBody) {
    tableBody.addEventListener('change', function (e) {
      if (e.target && e.target.classList.contains('js-hb-select')) {
        updateSelectAllState();
      }
    });
  }

  /* ── filter events ──────────────────────────────────── */

  [searchInput, filterDoc, filterDisc, filterAno, filterAtivo].forEach(function (el) {
    if (!el) return;
    var ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, function () { renderTable(); });
  });

  /* ── table action delegation ────────────────────────── */

  if (tableBody) {
    tableBody.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;

      var id = parseInt(btn.dataset.id, 10) || 0;
      if (!id) return;

      if (btn.classList.contains('js-hb-view')) openView(id);
      else if (btn.classList.contains('js-hb-edit')) openEdit(id);
      else if (btn.classList.contains('js-hb-delete')) openDeleteConfirm([id]);
    });
  }

  /* ── view modal ─────────────────────────────────────── */

  function findById(id) {
    for (var i = 0; i < allHabilidades.length; i++) {
      if (parseInt(allHabilidades[i].id, 10) === id) return allHabilidades[i];
    }
    return null;
  }

  function openView(id) {
    var h = findById(id);
    if (!h) return;

    if (viewModalTitle) viewModalTitle.textContent = 'Detalhes — ' + (h.codigo || 'Habilidade');

    var discNome = disciplinasMap[String(h.disciplina_id)] || '-';
    var html = '<div class="row g-2">'
      + field('Código', h.codigo)
      + field('Documento', h.documento)
      + field('Tipo', h.tipo)
      + field('Componente Curricular', discNome)
      + field('Ano escolar', h.ano_escolar)
      + field('Etapa de ensino', h.etapa_ensino)
      + '</div>'
      + '<div class="mt-3"><strong class="small text-secondary">Descrição</strong><div style="white-space:pre-line;">' + esc(h.descricao || '-') + '</div></div>';

    if (h.unidade_tematica) html += detail('Unidade temática', h.unidade_tematica);
    if (h.objeto_conhecimento) html += detail('Objeto de conhecimento', h.objeto_conhecimento);
    if (h.habilidade_complementar) html += detail('Habilidade complementar', h.habilidade_complementar);
    if (h.fonte_arquivo) html += detail('Fonte / arquivo', h.fonte_arquivo);

    html += '<div class="mt-3"><strong class="small text-secondary">Status</strong><div>' + (parseInt(h.ativo, 10) ? 'Ativo' : 'Inativo') + '</div></div>';

    if (viewModalBody) viewModalBody.innerHTML = html;
    var m = bsModal('hbViewModal');
    if (m) m.show();
  }

  function field(label, value) {
    return '<div class="col-md-4 col-6"><strong class="small text-secondary">' + esc(label) + '</strong><div>' + esc(value || '-') + '</div></div>';
  }
  function detail(label, value) {
    return '<div class="mt-2"><strong class="small text-secondary">' + esc(label) + '</strong><div>' + esc(value) + '</div></div>';
  }

  /* ── form: new / edit ───────────────────────────────── */

  function resetForm() {
    if (form) form.reset();
    if (formId) formId.value = '0';
    if (formEtapa) formEtapa.value = 'Ensino Fundamental';
    if (formAtivo) formAtivo.checked = true;
    if (formDocumento) formDocumento.value = 'BNCC';
    if (formTipo) formTipo.value = 'Habilidade';
    if (formDisciplina) formDisciplina.value = '';
  }

  if (newBtn) {
    newBtn.addEventListener('click', function () {
      resetForm();
      if (formLabel) formLabel.textContent = 'Nova habilidade';
      if (formSubmitBtn) formSubmitBtn.innerHTML = '<i class="las la-save me-1"></i>Salvar habilidade';
      var m = bsModal('hbFormModal');
      if (m) m.show();
    });
  }

  function openEdit(id) {
    var h = findById(id);
    if (!h) return;

    resetForm();
    if (formId) formId.value = String(h.id);
    if (formCodigo) formCodigo.value = h.codigo || '';
    if (formDocumento) formDocumento.value = h.documento || 'BNCC';
    if (formTipo) formTipo.value = h.tipo || 'Habilidade';
    if (formDisciplina) formDisciplina.value = String(h.disciplina_id || '');
    if (formAno) formAno.value = h.ano_escolar || '';
    if (formEtapa) formEtapa.value = h.etapa_ensino || 'Ensino Fundamental';
    if (formDescricao) formDescricao.value = h.descricao || '';
    if (formUnidade) formUnidade.value = h.unidade_tematica || '';
    if (formObjeto) formObjeto.value = h.objeto_conhecimento || '';
    if (formComplementar) formComplementar.value = h.habilidade_complementar || '';
    if (formFonte) formFonte.value = h.fonte_arquivo || '';
    if (formAtivo) formAtivo.checked = parseInt(h.ativo, 10) === 1;

    if (formLabel) formLabel.textContent = 'Editar habilidade — ' + (h.codigo || '');
    if (formSubmitBtn) formSubmitBtn.innerHTML = '<i class="las la-save me-1"></i>Atualizar habilidade';

    var m = bsModal('hbFormModal');
    if (m) m.show();
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (saving) return;
      saving = true;
      if (formSubmitBtn) formSubmitBtn.disabled = true;

      var payload = {
        id: parseInt(formId ? formId.value : '0', 10) || 0,
        codigo: (formCodigo ? formCodigo.value : '').trim(),
        descricao: (formDescricao ? formDescricao.value : '').trim(),
        tipo: formTipo ? formTipo.value : 'Habilidade',
        documento: formDocumento ? formDocumento.value : 'BNCC',
        disciplina_id: parseInt(formDisciplina ? formDisciplina.value : '0', 10) || 0,
        ano_escolar: (formAno ? formAno.value : '').trim(),
        etapa_ensino: (formEtapa ? formEtapa.value : 'Ensino Fundamental').trim(),
        unidade_tematica: (formUnidade ? formUnidade.value : '').trim(),
        objeto_conhecimento: (formObjeto ? formObjeto.value : '').trim(),
        habilidade_complementar: (formComplementar ? formComplementar.value : '').trim(),
        fonte_arquivo: (formFonte ? formFonte.value : '').trim(),
        ativo: formAtivo && formAtivo.checked ? 1 : 0
      };

      fetch(buildEndpoint('/institucional/habilidades/salvar'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        saving = false;
        if (formSubmitBtn) formSubmitBtn.disabled = false;

        if (!data || !data.ok) {
          showStatus(data && data.message ? data.message : 'Erro ao salvar.', true);
          return;
        }

        showStatus(data.message || 'Habilidade salva com sucesso.');
        var m = bsModal('hbFormModal');
        if (m) m.hide();
        loadData();
      })
      .catch(function () {
        saving = false;
        if (formSubmitBtn) formSubmitBtn.disabled = false;
        showStatus('Falha na conexão ao salvar.', true);
      });
    });
  }

  /* ── delete ─────────────────────────────────────────── */

  function openDeleteConfirm(ids) {
    pendingDeleteIds = ids;

    if (ids.length === 1) {
      var h = findById(ids[0]);
      if (deleteText) deleteText.textContent = 'Deseja realmente excluir a habilidade "' + (h ? h.codigo : '') + '"?';
    } else {
      if (deleteText) deleteText.textContent = 'Deseja realmente excluir ' + ids.length + ' habilidades selecionadas?';
    }

    var m = bsModal('hbDeleteConfirmModal');
    if (m) m.show();
  }

  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', function () {
      if (!pendingDeleteIds.length) return;

      var remaining = pendingDeleteIds.slice();
      var errors = [];

      function deleteNext() {
        if (remaining.length === 0) {
          var m = bsModal('hbDeleteConfirmModal');
          if (m) m.hide();

          if (errors.length > 0) {
            showStatus('Erro ao excluir ' + errors.length + ' habilidade(s).', true);
          } else {
            showStatus('Habilidade(s) excluída(s) com sucesso.');
          }

          loadData();
          return;
        }

        var id = remaining.shift();
        fetch(buildEndpoint('/institucional/habilidades/excluir'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: id })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || !data.ok) errors.push(id);
          deleteNext();
        })
        .catch(function () {
          errors.push(id);
          deleteNext();
        });
      }

      deleteNext();
    });
  }

  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', function () {
      var checks = tableBody ? tableBody.querySelectorAll('.js-hb-select:checked') : [];
      var ids = [];
      checks.forEach(function (c) {
        var id = parseInt(c.dataset.id, 10);
        if (id > 0) ids.push(id);
      });
      if (ids.length === 0) return;
      openDeleteConfirm(ids);
    });
  }

  /* ── import CSV ─────────────────────────────────────── */

  var parsedImportRows = [];

  function parseCSV(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    if (lines.length < 2) return [];

    var sep = lines[0].indexOf(';') >= 0 ? ';' : ',';
    var headers = lines[0].split(sep).map(function (h) { return h.trim().toLowerCase().replace(/['"]/g, ''); });

    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split(sep);
      var obj = {};
      headers.forEach(function (key, idx) {
        obj[key] = (cols[idx] || '').trim().replace(/^["']|["']$/g, '');
      });
      if (obj.codigo && obj.descricao) rows.push(obj);
    }
    return rows;
  }

  function updateImportPreview() {
    var text = importText ? importText.value : '';
    parsedImportRows = parseCSV(text);

    if (importPreview) {
      importPreview.textContent = parsedImportRows.length > 0
        ? parsedImportRows.length + ' linha(s) válida(s) detectada(s).'
        : text.trim() ? 'Nenhuma linha válida detectada. Verifique o formato.' : '';
    }

    if (importSubmitBtn) importSubmitBtn.disabled = parsedImportRows.length === 0;
  }

  if (importFile) {
    importFile.addEventListener('change', function () {
      var file = importFile.files && importFile.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function () {
        if (importText) importText.value = reader.result || '';
        updateImportPreview();
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  if (importText) {
    importText.addEventListener('input', function () { updateImportPreview(); });
  }

  if (importBtn) {
    importBtn.addEventListener('click', function () {
      if (importText) importText.value = '';
      if (importFile) importFile.value = '';
      parsedImportRows = [];
      if (importPreview) importPreview.textContent = '';
      if (importSubmitBtn) importSubmitBtn.disabled = true;
      var m = bsModal('hbImportModal');
      if (m) m.show();
    });
  }

  if (importSubmitBtn) {
    importSubmitBtn.addEventListener('click', function () {
      if (parsedImportRows.length === 0) return;
      importSubmitBtn.disabled = true;

      fetch(buildEndpoint('/institucional/habilidades/importar'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ linhas: parsedImportRows })
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        importSubmitBtn.disabled = false;

        if (!data || !data.ok) {
          showStatus(data && data.message ? data.message : 'Erro na importação.', true);
          return;
        }

        showStatus((data.message || 'Importação concluída.') + (data.total ? ' (' + data.total + ' registros)' : ''));
        var m = bsModal('hbImportModal');
        if (m) m.hide();
        loadData();
      })
      .catch(function () {
        importSubmitBtn.disabled = false;
        showStatus('Falha na conexão ao importar.', true);
      });
    });
  }

  /* ── init ───────────────────────────────────────────── */

  loadData();
})();
