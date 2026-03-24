(function () {
  window.__useDedicatedAvaliacoesScript = true;

  window.__bindAdminAvaliacoesStandalone = function (deps) {
    var normalizeSearchValue = deps && typeof deps.normalizeSearchValue === 'function'
      ? deps.normalizeSearchValue
      : function (value) {
        return String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
      };

    var showGlobalStatus = deps && typeof deps.showGlobalStatus === 'function'
      ? deps.showGlobalStatus
      : function () { };

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    var loadAdminPanelModalContent = deps && typeof deps.loadAdminPanelModalContent === 'function'
      ? deps.loadAdminPanelModalContent
      : function () { return Promise.resolve(false); };

    var adminPanelModalBodyElement = deps && typeof deps.getAdminPanelModalBodyElement === 'function'
      ? deps.getAdminPanelModalBodyElement()
      : null;

    var form = document.getElementById('adminAvaliacaoForm');
    if (!form) {
      return;
    }

    if (form.dataset.avaliacoesBound === '1') {
      return;
    }

    form.dataset.avaliacoesBound = '1';

    var idInput = document.getElementById('adminAvaliacaoId');
    var nomeInput = document.getElementById('adminAvaliacaoNome');
    var isRecuperacaoInput = document.getElementById('adminAvaliacaoIsRecuperacao');
    var cicloInput = document.getElementById('adminAvaliacaoCiclo');
    var cicloWrap = document.getElementById('adminAvaliacaoCicloWrap');
    var isSimuladoInput = document.getElementById('adminAvaliacaoIsSimulado');
    var simuladoWrap = document.getElementById('adminAvaliacaoSimuladoWrap');
    var bimestreInput = document.getElementById('adminAvaliacaoBimestre');
    var aplicacaoInput = document.getElementById('adminAvaliacaoAplicacao');
    var aplicadorInput = document.getElementById('adminAvaliacaoAplicador');
    var aplicadoresModalElement = document.getElementById('adminAvaliacaoAplicadoresModal');
    var autorInput = document.getElementById('adminAvaliacaoAutor');
    var turmaCheckboxes = document.querySelectorAll('.js-admin-avaliacao-turma-checkbox');
    var turmaAnoEscolarMap = {};
    turmaCheckboxes.forEach(function (cb) {
      var id = String(cb.value || '').trim();
      if (id && id !== '0') turmaAnoEscolarMap[id] = String(cb.getAttribute('data-ano-escolar') || '');
    });
    var descricaoInput = document.getElementById('adminAvaliacaoDescricao');
    var gabaritoInput = document.getElementById('adminAvaliacaoGabarito');
    var submitButton = document.getElementById('adminAvaliacaoSubmitButton');
    var resetButton = document.getElementById('adminAvaliacaoResetButton');
    var newButton = document.querySelector('.js-admin-avaliacao-new');
    var formModalElement = document.getElementById('adminAvaliacaoFormModal');
    var turmasModalElement = document.getElementById('adminAvaliacaoTurmasModal');
    var alunosModalElement = document.getElementById('adminAvaliacaoAlunosModal');
    var formModalTitle = document.getElementById('adminAvaliacaoFormModalLabel');
    var turmasSearchInput = document.getElementById('adminAvaliacaoTurmasSearch');
    var turmasSearchEmpty = document.getElementById('adminAvaliacaoTurmasSearchEmpty');
    var openTurmasModalButton = document.getElementById('adminAvaliacaoOpenTurmasModalBtn');
    var clearTurmasButton = document.getElementById('adminAvaliacaoClearTurmasBtn');
    var turmasSummaryElement = document.getElementById('adminAvaliacaoTurmasSummary');
    var alunosSearchInput = document.getElementById('adminAvaliacaoAlunosSearch');
    var alunosTurmaFilterInput = document.getElementById('adminAvaliacaoAlunosTurmaFilter');
    var openAlunosModalButton = document.getElementById('adminAvaliacaoOpenAlunosModalBtn');
    var openAlunosFromTurmasButton = document.getElementById('adminAvaliacaoOpenAlunosFromTurmasBtn');
    var clearAlunosButton = document.getElementById('adminAvaliacaoClearAlunosBtn');
    var alunosSummaryElement = document.getElementById('adminAvaliacaoAlunosSummary');
    var aplicadoresSearchInput = document.getElementById('adminAvaliacaoAplicadoresSearch');
    var aplicadoresSearchEmpty = document.getElementById('adminAvaliacaoAplicadoresSearchEmpty');
    var openAplicadoresModalButton = document.getElementById('adminAvaliacaoOpenAplicadoresModalBtn');
    var clearAplicadoresButton = document.getElementById('adminAvaliacaoClearAplicadoresBtn');
    var aplicadoresSummaryElement = document.getElementById('adminAvaliacaoAplicadoresSummary');
    var aplicadoresListElement = document.getElementById('adminAvaliacaoAplicadoresList');
    var aplicadoresSelectAllButton = document.getElementById('adminAvaliacaoAplicadoresSelectAllBtn');
    var aplicadoresClearAllButton = document.getElementById('adminAvaliacaoAplicadoresClearAllBtn');
    var dashboardModalElement = document.getElementById('adminAvaliacaoDashboardModal');
    var dashboardModalTitle = document.getElementById('adminAvaliacaoDashboardModalLabel');
    var statsFiltersModalElement = document.getElementById('adminAvaliacaoStatsFiltersModal');
    var statsFiltersTurmaSearch = document.getElementById('adminAvaliacaoStatsFilterTurmaSearch');
    var statsFiltersAlunoSearch = document.getElementById('adminAvaliacaoStatsFilterAlunoSearch');
    var statsFiltersSectionSearch = document.getElementById('adminAvaliacaoStatsFilterSectionSearch');
    var statsFiltersTurmaList = document.getElementById('adminAvaliacaoStatsFilterTurmaList');
    var statsFiltersAlunoList = document.getElementById('adminAvaliacaoStatsFilterAlunoList');
    var statsFiltersSectionList = document.getElementById('adminAvaliacaoStatsFilterSectionList');
    var statsFiltersClearBtn = document.getElementById('adminAvaliacaoStatsFiltersClearBtn');
    var statsFiltersApplyBtn = document.getElementById('adminAvaliacaoStatsFiltersApplyBtn');
    var statsSkillsModalElement = document.getElementById('adminAvaliacaoStatsSkillsModal');
    var statsSkillsModalTitle = document.getElementById('adminAvaliacaoStatsSkillsModalLabel');
    var statsSkillsModalSummary = document.getElementById('adminAvaliacaoStatsSkillsModalSummary');
    var statsSkillsModalList = document.getElementById('adminAvaliacaoStatsSkillsModalList');
    var dashboardStatsTab = document.getElementById('adminAvaliacaoDashboardTabEstatisticas');
    var dashboardCorrecaoTab = document.getElementById('adminAvaliacaoDashboardTabCorrecao');
    var dashboardQuestoesTab = document.getElementById('adminAvaliacaoDashboardTabQuestoes');
    var dashboardLayoutTab = document.getElementById('adminAvaliacaoDashboardTabLayout');
    var dashboardGabaritoTab = document.getElementById('adminAvaliacaoDashboardTabGabarito');
    var dashboardImpressaoTab = document.getElementById('adminAvaliacaoDashboardTabImpressao');
    var gabaritoSubtabMarcacao = document.getElementById('adminAvaliacaoGabaritoSubtabMarcacao');
    var gabaritoSubtabDisciplinas = document.getElementById('adminAvaliacaoGabaritoSubtabDisciplinas');
    var gabaritoSubtabLayout = document.getElementById('adminAvaliacaoGabaritoSubtabLayout');
    var dashboardSaveBar = document.getElementById('adminAvaliacaoDashboardSaveBar');
    var statsRoot = document.getElementById('adminAvaliacaoStatsRoot');
    var questoesListContainer = document.getElementById('adminAvaliacaoQuestoesList');
    var disciplinasHabilidadesListContainer = document.getElementById('adminAvaliacaoDisciplinasHabilidadesList');
    var questoesAdicionarBtn = document.getElementById('adminAvaliacaoQuestoesAdicionarBtn');
    var questoesTotalInput = document.getElementById('adminAvaliacaoQuestoesTotal');
    var alternativasTotalInput = document.getElementById('adminAvaliacaoAlternativasTotal');
    var questoesPorColunaInput = document.getElementById('adminAvaliacaoQuestoesPorColuna');
    var restaurarRespostasBtn = document.getElementById('adminAvaliacaoRestaurarRespostasBtn');
    var questoesFormatBoldBtn = document.getElementById('adminAvaliacaoFormatBoldBtn');
    var questoesFormatItalicBtn = document.getElementById('adminAvaliacaoFormatItalicBtn');
    var questoesFormatUnderlineBtn = document.getElementById('adminAvaliacaoFormatUnderlineBtn');
    var questoesFormatColorInput = document.getElementById('adminAvaliacaoFormatColorInput');
    var questoesFormatColorPresets = document.getElementById('adminAvaliacaoFormatColorPresets');
    var questoesFormatClearBtn = document.getElementById('adminAvaliacaoFormatClearBtn');
    var layoutSpacingInput = document.getElementById('adminAvaliacaoLayoutSpacing');
    var layoutSpacingValue = document.getElementById('adminAvaliacaoLayoutSpacingValue');
    var layoutFontScaleInput = document.getElementById('adminAvaliacaoLayoutFontScale');
    var layoutFontScaleValue = document.getElementById('adminAvaliacaoLayoutFontScaleValue');
    var layoutSnapGridInput = document.getElementById('adminAvaliacaoLayoutSnapGrid');
    var layoutGridSizeInput = document.getElementById('adminAvaliacaoLayoutGridSize');
    var layoutBackgroundFileInput = document.getElementById('adminAvaliacaoLayoutBackgroundFile');
    var layoutBackgroundSelectBtn = document.getElementById('adminAvaliacaoLayoutBackgroundSelectBtn');
    var layoutBackgroundUploadBtn = document.getElementById('adminAvaliacaoLayoutBackgroundUploadBtn');
    var layoutBackgroundRemoveBtn = document.getElementById('adminAvaliacaoLayoutBackgroundRemoveBtn');
    var layoutImageFileInput = document.getElementById('adminAvaliacaoLayoutImageFile');
    var layoutImageAddBtn = document.getElementById('adminAvaliacaoLayoutImageAddBtn');
    var layoutInsertObjectBtn = document.getElementById('adminAvaliacaoLayoutInsertObjectBtn');
    var layoutInsertObjectButtons = document.querySelectorAll('.js-admin-layout-insert-object');
    var layoutObjectStyleGroup = document.getElementById('adminAvaliacaoLayoutObjectStyleGroup');
    var layoutObjectTextControls = document.getElementById('adminAvaliacaoLayoutObjectTextControls');
    var layoutObjectStrokeColorInput = document.getElementById('adminAvaliacaoLayoutObjectStrokeColor');
    var layoutObjectStrokeWidthInput = document.getElementById('adminAvaliacaoLayoutObjectStrokeWidth');
    var layoutObjectOpacityInput = document.getElementById('adminAvaliacaoLayoutObjectOpacity');
    var layoutObjectOpacityValue = document.getElementById('adminAvaliacaoLayoutObjectOpacityValue');
    var layoutObjectTextBoldBtn = document.getElementById('adminAvaliacaoLayoutObjectTextBoldBtn');
    var layoutObjectTextItalicBtn = document.getElementById('adminAvaliacaoLayoutObjectTextItalicBtn');
    var layoutObjectTextUnderlineBtn = document.getElementById('adminAvaliacaoLayoutObjectTextUnderlineBtn');
    var layoutObjectTextColorInput = document.getElementById('adminAvaliacaoLayoutObjectTextColor');
    var layoutObjectFontSizeInput = document.getElementById('adminAvaliacaoLayoutObjectFontSize');
    var layoutResetQuestionsBtn = document.getElementById('adminAvaliacaoLayoutResetQuestionsBtn');
    var layoutUndoBtn = document.getElementById('adminAvaliacaoLayoutUndoBtn');
    var layoutRedoBtn = document.getElementById('adminAvaliacaoLayoutRedoBtn');
    var layoutZoomOutBtn = document.getElementById('adminAvaliacaoLayoutZoomOutBtn');
    var layoutZoomResetBtn = document.getElementById('adminAvaliacaoLayoutZoomResetBtn');
    var layoutZoomInBtn = document.getElementById('adminAvaliacaoLayoutZoomInBtn');
    var layoutPagesInfo = document.getElementById('adminAvaliacaoLayoutPagesInfo');
    var layoutHint = document.getElementById('adminAvaliacaoLayoutHint');
    var layoutEditorCanvas = document.getElementById('adminAvaliacaoLayoutEditorCanvas');
    var layoutEditorWrap = layoutEditorCanvas ? layoutEditorCanvas.closest('.admin-avaliacao-layout-editor-wrap') : null;
    var gabaritoPane = document.getElementById('adminAvaliacaoDashboardPaneGabarito');
    var gabaritoLayoutWrap = document.querySelector('#adminAvaliacaoDashboardPaneGabarito .admin-avaliacao-gabarito-layout-wrap');
    var gabaritoEscalaValor = document.getElementById('adminAvaliacaoGabaritoEscalaValor');
    var gabaritoFundoArquivoInput = document.getElementById('adminAvaliacaoGabaritoFundoArquivo');
    var gabaritoFundoSelectBtn = document.getElementById('adminAvaliacaoGabaritoFundoSelectBtn');
    var gabaritoFundoRemoveBtn = document.getElementById('adminAvaliacaoGabaritoFundoRemoveBtn');
    var gabaritoFundoSetDefaultBtn = document.getElementById('adminAvaliacaoGabaritoFundoSetDefaultBtn');
    var gabaritoFundoClearDefaultBtn = document.getElementById('adminAvaliacaoGabaritoFundoClearDefaultBtn');
    var gabaritoImagemArquivoInput = document.getElementById('adminAvaliacaoGabaritoImagemArquivo');
    var gabaritoImagemSelectBtn = document.getElementById('adminAvaliacaoGabaritoImagemSelectBtn');
    var gabaritoImagemLayerDownBtn = document.getElementById('adminAvaliacaoGabaritoImagemLayerDownBtn');
    var gabaritoImagemLayerUpBtn = document.getElementById('adminAvaliacaoGabaritoImagemLayerUpBtn');
    var gabaritoImagemRotateLeftBtn = document.getElementById('adminAvaliacaoGabaritoImagemRotateLeftBtn');
    var gabaritoImagemRotateRightBtn = document.getElementById('adminAvaliacaoGabaritoImagemRotateRightBtn');
    var gabaritoImagemCropBtn = document.getElementById('adminAvaliacaoGabaritoImagemCropBtn');
    var gabaritoImagemCropResetBtn = document.getElementById('adminAvaliacaoGabaritoImagemCropResetBtn');
    var gabaritoImagemDeleteBtn = document.getElementById('adminAvaliacaoGabaritoImagemDeleteBtn');
    var gabaritoObjetoInsertBtn = document.getElementById('adminAvaliacaoGabaritoObjetoInsertBtn');
    var gabaritoFundoAtualLabel = document.getElementById('adminAvaliacaoGabaritoFundoAtual');
    var gabaritoFundoPadraoAtualLabel = document.getElementById('adminAvaliacaoGabaritoFundoPadraoAtual');
    var gabaritoPreviewCanvas = document.getElementById('adminAvaliacaoGabaritoPreviewCanvas');
    var gabaritoPreviewImage = document.getElementById('adminAvaliacaoGabaritoPreviewImage');
    var gabaritoA4EditorCanvas = document.getElementById('adminAvaliacaoA4EditorCanvas');
    var gabaritoZoomOutBtn = document.getElementById('adminAvaliacaoGabaritoZoomOutBtn');
    var gabaritoZoomResetBtn = document.getElementById('adminAvaliacaoGabaritoZoomResetBtn');
    var gabaritoZoomInBtn = document.getElementById('adminAvaliacaoGabaritoZoomInBtn');
    var gabaritoSaveButton = document.getElementById('adminAvaliacaoGabaritoSalvarBtn');
    var correcaoPane = document.getElementById('adminAvaliacaoDashboardPaneCorrecao');
    var correcaoResumo = document.getElementById('adminAvaliacaoCorrecaoResumo');
    var correcaoStepBadge = document.getElementById('adminAvaliacaoCorrecaoStepBadge');
    var correcaoStartBtn = document.getElementById('adminAvaliacaoCorrecaoStartBtn');
    var correcaoCaptureBtn = document.getElementById('adminAvaliacaoCorrecaoCaptureBtn');
    var correcaoStopBtn = document.getElementById('adminAvaliacaoCorrecaoStopBtn');
    var correcaoVideo = document.getElementById('adminAvaliacaoCorrecaoVideo');
    var correcaoVideoPlaceholder = document.getElementById('adminAvaliacaoCorrecaoVideoPlaceholder');
    var correcaoOverlay = document.getElementById('adminAvaliacaoCorrecaoOverlay');
    var correcaoDiagnosticsSvg = document.getElementById('adminAvaliacaoCorrecaoDiagnostics');
    var correcaoOverlayMessage = document.getElementById('adminAvaliacaoCorrecaoOverlayMessage');
    var correcaoAlignGuide = document.getElementById('adminAvaliacaoCorrecaoAlignGuide');
    var correcaoGuideTemplate = document.getElementById('adminAvaliacaoCorrecaoGuideTemplate');
    var correcaoOverlayTarget = document.getElementById('adminAvaliacaoCorrecaoOverlayTarget');
    var correcaoStatus = document.getElementById('adminAvaliacaoCorrecaoStatus');
    var correcaoTargetCard = document.getElementById('adminAvaliacaoCorrecaoTargetCard');
    var correcaoTargetText = document.getElementById('adminAvaliacaoCorrecaoTargetText');
    var correcaoConfirmWrap = document.getElementById('adminAvaliacaoCorrecaoConfirmWrap');
    var correcaoConfirmBtn = document.getElementById('adminAvaliacaoCorrecaoConfirmBtn');
    var correcaoZeroBtn = document.getElementById('adminAvaliacaoCorrecaoZeroBtn');
    var correcaoAbsentBtn = document.getElementById('adminAvaliacaoCorrecaoAbsentBtn');
    var correcaoNextWrap = document.getElementById('adminAvaliacaoCorrecaoNextWrap');
    var correcaoNextBtn = document.getElementById('adminAvaliacaoCorrecaoNextBtn');
    var correcaoRetryBtn = document.getElementById('adminAvaliacaoCorrecaoRetryBtn');
    var correcaoProcessWrap = document.getElementById('adminAvaliacaoCorrecaoProcessWrap');
    var correcaoProcessBtn = document.getElementById('adminAvaliacaoCorrecaoProcessBtn');
    var correcaoProcessingOverlay = document.getElementById('adminAvaliacaoCorrecaoProcessingOverlay');
    var correcaoProcessingContent = document.getElementById('adminAvaliacaoCorrecaoProcessingContent');
    var correcaoProcessingSpinner = document.getElementById('adminAvaliacaoCorrecaoProcessingSpinner');
    var correcaoProcessingTitle = document.getElementById('adminAvaliacaoCorrecaoProcessingTitle');
    var correcaoProcessingSummary = document.getElementById('adminAvaliacaoCorrecaoProcessingSummary');
    var correcaoRefreshBtn = document.getElementById('adminAvaliacaoCorrecaoRefreshBtn');
    var correcaoListStatus = document.getElementById('adminAvaliacaoCorrecaoListStatus');
    var correcaoTableBody = document.getElementById('adminAvaliacaoCorrecaoTableBody');
    var correcaoRosterStatus = document.getElementById('adminAvaliacaoCorrecaoRosterStatus');
    var correcaoRosterSearchInput = document.getElementById('adminAvaliacaoCorrecaoSearch');
    var correcaoRosterBody = document.getElementById('adminAvaliacaoCorrecaoRosterBody');
    var correcaoDiscursivaModalElement = document.getElementById('adminAvaliacaoCorrecaoDiscursivaModal');
    var correcaoDiscursivaSummary = document.getElementById('adminAvaliacaoCorrecaoDiscursivaSummary');
    var correcaoDiscursivaList = document.getElementById('adminAvaliacaoCorrecaoDiscursivaList');
    var correcaoDiscursivaError = document.getElementById('adminAvaliacaoCorrecaoDiscursivaError');
    var correcaoDiscursivaCancelBtn = document.getElementById('adminAvaliacaoCorrecaoDiscursivaCancelBtn');
    var correcaoDiscursivaSaveBtn = document.getElementById('adminAvaliacaoCorrecaoDiscursivaSaveBtn');
    var correcaoRevisaoModalElement = document.getElementById('adminAvaliacaoCorrecaoRevisaoModal');
    var correcaoRevisaoSummary = document.getElementById('adminAvaliacaoCorrecaoRevisaoSummary');
    var correcaoRevisaoList = document.getElementById('adminAvaliacaoCorrecaoRevisaoList');
    var correcaoRevisaoCancelBtn = document.getElementById('adminAvaliacaoCorrecaoRevisaoCancelBtn');
    var correcaoRevisaoSaveBtn = document.getElementById('adminAvaliacaoCorrecaoRevisaoSaveBtn');
    var correcaoEdicaoModalElement = document.getElementById('adminAvaliacaoCorrecaoEdicaoModal');
    var correcaoEdicaoSummary = document.getElementById('adminAvaliacaoCorrecaoEdicaoSummary');
    var correcaoEdicaoList = document.getElementById('adminAvaliacaoCorrecaoEdicaoList');
    var correcaoEdicaoError = document.getElementById('adminAvaliacaoCorrecaoEdicaoError');
    var correcaoEdicaoBlankBtn = document.getElementById('adminAvaliacaoCorrecaoEdicaoBlankBtn');
    var correcaoEdicaoAbsentBtn = document.getElementById('adminAvaliacaoCorrecaoEdicaoAbsentBtn');
    var correcaoEdicaoCancelBtn = document.getElementById('adminAvaliacaoCorrecaoEdicaoCancelBtn');
    var correcaoEdicaoSaveBtn = document.getElementById('adminAvaliacaoCorrecaoEdicaoSaveBtn');
    var impressaoPane = document.getElementById('adminAvaliacaoDashboardPaneImpressao');
    var impressaoResumo = document.getElementById('adminAvaliacaoImpressaoResumo');
    var impressaoStatus = document.getElementById('adminAvaliacaoImpressaoStatus');
    var impressaoTurmasWrap = document.getElementById('adminAvaliacaoImpressaoTurmasWrap');
    var impressaoTurmasTodasBtn = document.getElementById('adminAvaliacaoImpressaoTurmasTodasBtn');
    var impressaoTurmasNenhumaBtn = document.getElementById('adminAvaliacaoImpressaoTurmasNenhumaBtn');
    var impressaoSearchInput = document.getElementById('adminAvaliacaoImpressaoSearch');
    var impressaoGrid = document.getElementById('adminAvaliacaoImpressaoGrid');
    var impressaoAtualizarBtn = document.getElementById('adminAvaliacaoImpressaoAtualizarBtn');
    var impressaoImprimirBtn = document.getElementById('adminAvaliacaoImpressaoImprimirBtn');
    var deleteConfirmModalElement = document.getElementById('adminAvaliacaoDeleteConfirmModal');
    var deleteConfirmTextElement = document.getElementById('adminAvaliacaoDeleteConfirmText');
    var deleteConfirmButton = document.getElementById('adminAvaliacaoDeleteConfirmButton');
    var correcaoModalElement = document.getElementById('adminAvaliacaoCorrecaoModal');
    var alunosRelacionadosWrap = document.getElementById('adminAvaliacaoAlunosRelacionadosWrap');
    var tableSearchInput = document.getElementById('adminAvaliacoesTableSearch');
    var tableFiltersButton = document.getElementById('adminAvaliacoesFiltersButton');
    var tableFiltersModalElement = document.getElementById('adminAvaliacoesFiltersModal');
    var tableClearFiltersButton = document.getElementById('adminAvaliacoesClearFiltersButton');
    var tableCycleFiltersElement = document.getElementById('adminAvaliacoesCycleFilters');
    var tableTurmaFiltersElement = document.getElementById('adminAvaliacoesTurmaFilters');
    var tablePageSizeSelect = document.getElementById('adminAvaliacoesPageSize');
    var tablePaginationWrap = document.getElementById('adminAvaliacoesPaginationWrap');
    var tablePaginationInfo = document.getElementById('adminAvaliacoesPaginationInfo');
    var tablePaginationPages = document.getElementById('adminAvaliacoesPaginationPages');
    var tablePrevPageButton = document.getElementById('adminAvaliacoesPrevPageBtn');
    var tableNextPageButton = document.getElementById('adminAvaliacoesNextPageBtn');
    var tableRows = document.querySelectorAll('.js-admin-avaliacoes-row');
    var tableEmpty = document.getElementById('adminAvaliacoesTableEmpty');
    var listContainer = document.getElementById('avaliacoesListContainer');
    var selectAllCheckbox = document.getElementById('adminAvaliacoesSelectAll');
    var deleteSelectedButton = document.getElementById('adminAvaliacoesDeleteSelectedBtn');
    var alunosDataElement = document.getElementById('adminAvaliacoesAlunosData');
    var disciplinasDataElement = document.getElementById('adminAvaliacoesDisciplinasData');
    var defaultGabaritoDataElement = document.getElementById('adminAvaliacoesDefaultGabaritoData');
    var habilidadeSelectorModalElement = document.getElementById('adminAvaliacaoHabilidadeSelectorModal');
    var habilidadeSelectorSearch = document.getElementById('adminHabilidadeSelectorSearch');
    var habilidadeSelectorList = document.getElementById('adminHabilidadeSelectorList');
    var habilidadeSelectorQuestaoNum = document.getElementById('adminHabilidadeSelectorQuestaoNum');
    var habilidadeSelectorDisciplinaInfo = document.getElementById('adminHabilidadeSelectorDisciplinaInfo');
    var habilidadeSelectorCount = document.getElementById('adminHabilidadeSelectorCount');
    var habilidadeSelectorConfirmBtn = document.getElementById('adminHabilidadeSelectorConfirmBtn');
    var habilidadeSelectorCustomInput = document.getElementById('adminHabilidadeSelectorCustomInput');
    var habilidadeSelectorCustomAddBtn = document.getElementById('adminHabilidadeSelectorCustomAddBtn');
    var habilidadeSelectorFilterButtons = habilidadeSelectorModalElement ? habilidadeSelectorModalElement.querySelectorAll('[data-hb-filter]') : [];
    var habilidadeSelectorBsModal = null;
    var habilidadeSelectorCache = null;
    var habilidadeSelectorCacheLoading = false;
    var habilidadeSelectorCacheCallbacks = [];
    var habilidadeSelectorQuestionIndex = -1;
    var habilidadeSelectorActiveFilter = 'todos';
    var habilidadeSelectorSelected = [];
    var habilidadeSelectorActiveAnos = [];
    var avaliacaoAtivaTurmasIds = [];
    var habilidadeSelectorAnoFilterWrap = document.getElementById('adminHabilidadeAnoEscolarFilterWrap');
    var habilidadeSelectorAnoFilterInfo = document.getElementById('adminHabilidadeAnoEscolarInfo');
    var habilidadeSelectorClearAnoBtn = document.getElementById('adminHabilidadeSelectorClearAnoFilter');
    var alunosOptionsRaw = [];
    var disciplinasOptionsRaw = [];
    var defaultGabaritoPreset = null;

    if (alunosDataElement && String(alunosDataElement.textContent || '').trim() !== '') {
      try {
        var parsedAlunosOptions = JSON.parse(String(alunosDataElement.textContent || '[]'));
        if (Array.isArray(parsedAlunosOptions)) {
          alunosOptionsRaw = parsedAlunosOptions;
        }
      } catch (error) {
        alunosOptionsRaw = [];
      }
    }

    if (!Array.isArray(alunosOptionsRaw) || alunosOptionsRaw.length === 0) {
      alunosOptionsRaw = Array.isArray(window.__adminAvaliacoesAlunosOptions) ? window.__adminAvaliacoesAlunosOptions : [];
    }

    if (disciplinasDataElement && String(disciplinasDataElement.textContent || '').trim() !== '') {
      try {
        var parsedDisciplinasOptions = JSON.parse(String(disciplinasDataElement.textContent || '[]'));
        if (Array.isArray(parsedDisciplinasOptions)) {
          disciplinasOptionsRaw = parsedDisciplinasOptions;
        }
      } catch (error) {
        disciplinasOptionsRaw = [];
      }
    }

    if (!Array.isArray(disciplinasOptionsRaw) || disciplinasOptionsRaw.length === 0) {
      disciplinasOptionsRaw = Array.isArray(window.__adminAvaliacoesDisciplinasOptions) ? window.__adminAvaliacoesDisciplinasOptions : [];
    }

    if (defaultGabaritoDataElement && String(defaultGabaritoDataElement.textContent || '').trim() !== '') {
      try {
        var parsedDefaultGabaritoPreset = JSON.parse(String(defaultGabaritoDataElement.textContent || 'null'));
        if (parsedDefaultGabaritoPreset && typeof parsedDefaultGabaritoPreset === 'object' && !Array.isArray(parsedDefaultGabaritoPreset)) {
          defaultGabaritoPreset = parsedDefaultGabaritoPreset;
        }
      } catch (error) {
        defaultGabaritoPreset = null;
      }
    }

    var alunosOptions = alunosOptionsRaw.map(function (item) {
      if (!item || typeof item !== 'object') {
        return null;
      }

      var id = Number(item.id || 0);
      var turmaId = Number(item.turma_id || 0);
      var nome = String(item.nome || '').trim();
      var turmaNome = String(item.turma || '').trim();

      if (id <= 0 || turmaId <= 0 || nome === '') {
        return null;
      }

      return {
        id: id,
        turmaId: turmaId,
        nome: nome,
        turmaNome: turmaNome,
      };
    }).filter(function (item) {
      return !!item;
    });

    var disciplinasOptions = disciplinasOptionsRaw.map(function (item) {
      if (!item || typeof item !== 'object') {
        return null;
      }

      var id = Number(item.id || 0);
      var nome = String(item.nome || '').trim();
      var status = String(item.status || 'ativa').trim().toLowerCase() === 'inativa' ? 'inativa' : 'ativa';

      if (id <= 0 || nome === '') {
        return null;
      }

      return {
        id: id,
        nome: nome,
        status: status,
      };
    }).filter(function (item) {
      return !!item;
    });

    var formModalInstance = null;
    var turmasModalInstance = null;
    var alunosModalInstance = null;
    var aplicadoresModalInstance = null;
    var dashboardModalInstance = null;
    var deleteConfirmModalInstance = null;
    var correcaoModalInstance = null;
    var correcaoDiscursivaModalInstance = null;
    var correcaoRevisaoModalInstance = null;
    var correcaoEdicaoModalInstance = null;
    var statsFiltersModalInstance = null;
    var statsSkillsModalInstance = null;
    var tableFiltersModalInstance = null;
    var pendingDeleteForms = [];
    var selectedAlunosRelacionadosIds = [];
    var hasManualAlunosSelection = false;
    var lastSelectedTurmasIdsForAlunos = [];
    var pendingOpenAlunosAfterTurmasClose = false;
    var alunosModalSearchQuery = '';
    var alunosModalTurmaFilterValue = 'all';
    var aplicadoresModalSearchQuery = '';
    var gabaritoHasPendingChanges = false;
    var listSignature = listContainer ? String(listContainer.innerHTML || '').trim() : '';
    var selectedAvaliacaoIdsForDelete = [];
    var activeTableCycleFilter = 'all';
    var activeTableTurmaFilter = 'all';
    var tableCurrentPage = 1;
    var statsFiltersDraftState = {
      panelKey: 'resumo',
      turmaValues: ['all'],
      alunoValues: ['all'],
      sectionValues: ['all'],
      sectionOptions: [],
    };
    var gabaritoRespostasCorretas = {};
    var gabaritoQuestoesItens = [];
    var gabaritoAlternativasConfiguradas = 4;
    var gabaritoQuestoesPorColuna = 10;
    var gabaritoBubbleHitboxes = [];
    var gabaritoBubbleTemplateScores = {};
    var gabaritoPreviewLogicalWidth = 0;
    var gabaritoPreviewLogicalHeight = 0;
    var avaliacaoLayoutConfig = {
      spacing: 18,
      font_scale: 100,
      background: {
        path: '',
        url: '',
        x: 0,
        y: 0,
        scale: 1,
        scale_x: 1,
        scale_y: 1,
      },
      images: [],
      objects: [],
      question_positions: {},
      hidden_questions: {},
      snap_grid_enabled: true,
      grid_size: 12,
    };
    var layoutCanvasZoom = 1;
    var gabaritoCanvasZoom = 1;
    var avaliacaoLayoutBackgroundImage = new Image();
    var avaliacaoLayoutImageObjects = [];
    var avaliacaoLayoutObjectObjects = [];
    var avaliacaoLayoutImageCache = {};
    var avaliacaoLayoutImageErrorNotified = {};
    var avaliacaoLayoutPageRects = [];
    var avaliacaoLayoutQuestionBlocks = [];
    var avaliacaoLayoutQuestionDeleteRect = null;
    var avaliacaoLayoutQuestionMoveUpRects = [];
    var avaliacaoLayoutQuestionMoveDownRects = [];
    var avaliacaoLayoutImageDeleteRect = null;
    var avaliacaoLayoutImageLayerUpRect = null;
    var avaliacaoLayoutImageLayerDownRect = null;
    var avaliacaoLayoutImageRotateLeftRect = null;
    var avaliacaoLayoutImageRotateRightRect = null;
    var avaliacaoLayoutImageCropRect = null;
    var avaliacaoLayoutImageCropResetRect = null;
    var avaliacaoLayoutImageGrowWidthRect = null;
    var avaliacaoLayoutImageGrowHeightRect = null;
    var avaliacaoLayoutObjectDeleteRect = null;
    var avaliacaoLayoutObjectMoveRect = null;
    var avaliacaoLayoutObjectLayerUpRect = null;
    var avaliacaoLayoutObjectLayerDownRect = null;
    var avaliacaoLayoutObjectRotateLeftRect = null;
    var avaliacaoLayoutObjectRotateRightRect = null;
    var avaliacaoLayoutObjectGrowWidthRect = null;
    var avaliacaoLayoutObjectGrowHeightRect = null;
    var avaliacaoLayoutTextCaretObjectId = '';
    var avaliacaoLayoutTextCaretIndex = 0;
    var avaliacaoLayoutTextSelectionObjectId = '';
    var avaliacaoLayoutTextSelectionStart = 0;
    var avaliacaoLayoutTextSelectionEnd = 0;
    var avaliacaoLayoutTextSelectionAnchor = 0;
    var avaliacaoLayoutBackgroundActiveObject = null;
    var avaliacaoLayoutCropModeImageId = '';
    var avaliacaoLayoutSelection = {
      type: '',
      imageId: '',
      questionIndex: -1,
    };
    var avaliacaoLayoutDrag = {
      active: false,
      mode: '',
      pointerId: -1,
      pointerOffsetX: 0,
      pointerOffsetY: 0,
      startWidth: 0,
      startHeight: 0,
      startX: 0,
      startY: 0,
      startScale: 1,
      startPointerX: 0,
      imageId: '',
      questionIndex: -1,
      questionStartBlocks: [],
      questionStartY: 0,
      questionStartHeight: 0,
      cropHandle: '',
      cropStart: null,
      textSelectionAnchor: 0,
    };
    var avaliacaoLayoutHoverState = {
      backgroundResizeAxis: '',
    };
    var activeDashboardAvaliacaoId = 0;
    var activeDashboardAvaliacaoNome = '';
    var activeDashboardAvaliacaoAplicacao = '';
    var activeDashboardAutorId = 0;
    var activeDashboardTurmasIds = [];
    var activeDashboardAlunosIds = [];
    var currentUserId = Number(form.getAttribute('data-current-user-id') || 0);
    var isAdminViewer = form.getAttribute('data-is-admin') === '1';
    var selectedImpressaoTurmasIds = [];
    var impressaoTurmasSelectionInitialized = false;
    var impressaoBaseStatusMessage = impressaoStatus ? String(impressaoStatus.textContent || '').trim() : '';
    var qrCodeLibraryPromise = null;
    var qrScanLibraryPromise = null;
    var gabaritoTemplateMarkers = null;
    var gabaritoArucoDictionaryName = 'ARUCO_MIP_36h12';
    var gabaritoArucoMarkerIds = {
      topLeft: 10,
      topRight: 37,
      bottomLeft: 84,
      bottomRight: 142,
    };
    var gabaritoArucoDictionary = null;
    var gabaritoArucoDetector = null;
    var correcoesPollingTimer = 0;
    var correcoesRows = [];
    var correcaoCameraStream = null;
    var correcaoScanFrameId = 0;
    var correcaoScanRetryTimeoutId = 0;
    var correcaoScannerStep = 'idle';
    var correcaoCurrentTarget = null;
    var correcaoBusy = false;
    var correcaoLastAutoCaptureAt = 0;
    var correcaoQrValidatedAt = 0;
    var correcaoLastSuccessPayload = '';
    var correcaoLastSuccessAt = 0;
    var correcaoGabaritoStableFrames = 0;
    var correcaoCaptureCanvas = document.createElement('canvas');
    var correcaoAnalysisCanvas = document.createElement('canvas');
    var correcaoQrReferenceSignature = null;
    var correcaoLastDiagnostics = null;
    var correcaoDebugBubbles = false;
    var correcaoLastTransform = null;
    var correcaoDiscursivaResolver = null;
    var correcaoDiscursivaRejecter = null;
    var correcaoRevisaoResolver = null;
    var correcaoRevisaoRejecter = null;
    var correcaoEdicaoCurrentRowId = 0;
    var correcaoEdicaoCurrentRowData = null;
    var correcaoAutoReadFingerprint = '';
    var correcaoAutoReadStableReads = 0;
    var gabaritoTemplateImage = new Image();
    var correcaoGuideRegionRatios = {
      top: 0.12,
      right: 0.10,
      bottom: 0.12,
      left: 0.10,
    };
    var gabaritoBackgroundImage = new Image();
    var gabaritoBackgroundPath = '';
    var gabaritoBackgroundUrl = '';
    var gabaritoBackgroundCacheBust = '';
    var a4CanvasWidth = 794;
    var a4CanvasHeight = 1123;
    var gabaritoLayout = {
      x: 78,
      y: 360,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      aluno_box: { x: 26, y: 26, width: 566, height: 96 },
      qr_box: { x: 614, y: 26, width: 148, height: 148 },
      title_box: { x: 26, y: 142, width: 340, height: 64 },
      numeracao_box: { x: 528, y: 142, width: 170, height: 34 },
      disciplinas_box: { x: 26, y: 204, width: 360, height: 80 },
    };
    var gabaritoBackgroundLayout = {
      x: 0,
      y: 0,
      scale_x: 1,
      scale_y: 1,
    };
    var numeracaoAlunosPorTurma = null;
    var gabaritoImages = [];
    var gabaritoImageObjects = [];
    var gabaritoImageCache = {};
    var gabaritoSelectedImageId = '';
    var gabaritoCropModeImageId = '';
    var gabaritoLayoutRect = null;
    var gabaritoScaleHandleRect = null;
    var gabaritoBackgroundRect = null;
    var gabaritoBackgroundHandleRect = null;
    var gabaritoBackgroundGrowWidthRect = null;
    var gabaritoBackgroundGrowHeightRect = null;
    var gabaritoImageHandleRect = null;
    var gabaritoImageDeleteRect = null;
    var gabaritoImageLayerUpRect = null;
    var gabaritoImageLayerDownRect = null;
    var gabaritoImageRotateLeftRect = null;
    var gabaritoImageRotateRightRect = null;
    var gabaritoImageCropRect = null;
    var gabaritoImageCropResetRect = null;
    var gabaritoAlunoBoxRect = null;
    var gabaritoQrBoxRect = null;
    var gabaritoTitleBoxRect = null;
    var gabaritoDisciplinasBoxRect = null;
    var gabaritoNumeracaoBoxRect = null;
    var gabaritoInfoBoxHandleRects = {};
    var gabaritoSelectionType = 'template';
    var gabaritoDragging = {
      active: false,
      offsetX: 0,
      offsetY: 0,
    };
    var gabaritoResizing = {
      active: false,
      startScale: 1,
      startScaleX: 1,
      startScaleY: 1,
      startPointerX: 0,
      startPointerY: 0,
    };
    var gabaritoBackgroundDragging = {
      active: false,
      offsetX: 0,
      offsetY: 0,
    };
    var gabaritoBackgroundResizing = {
      active: false,
      mode: '',
      startScaleX: 1,
      startScaleY: 1,
      startPointerX: 0,
      startPointerY: 0,
    };
    var gabaritoImageDragging = {
      active: false,
      imageId: '',
      offsetX: 0,
      offsetY: 0,
    };
    var gabaritoImageResizing = {
      active: false,
      imageId: '',
      startWidth: 0,
      startHeight: 0,
      startPointerX: 0,
      startPointerY: 0,
    };
    var gabaritoImageCropping = {
      active: false,
      imageId: '',
      handle: '',
      start: null,
      offsetX: 0,
      offsetY: 0,
    };
    var gabaritoInfoBoxDragging = {
      active: false,
      type: '',
      offsetX: 0,
      offsetY: 0,
    };
    var gabaritoInfoBoxResizing = {
      active: false,
      type: '',
      startWidth: 0,
      startHeight: 0,
      startPointerX: 0,
      startPointerY: 0,
    };
    var brokenLayoutAssetSaveTimer = null;
    var gabaritoQuestoesLayoutFrame = 0;
    var activeRichTextEditable = null;
    var activeRichTextSelectionRange = null;
    var layoutHistoryPast = [];
    var layoutHistoryFuture = [];
    var layoutHistoryMaxSteps = 60;
    var layoutHistoryApplying = false;
    var gabaritoDragStartSignature = '';
    var pdfJsLoaderPromise = null;

    if (formModalElement && formModalElement.parentElement !== document.body) {
      var existingFormModal = document.body.querySelector('#adminAvaliacaoFormModal');
      if (existingFormModal && existingFormModal !== formModalElement) {
        existingFormModal.remove();
      }

      document.body.appendChild(formModalElement);
    }

    if (deleteConfirmModalElement && deleteConfirmModalElement.parentElement !== document.body) {
      var existingDeleteModal = document.body.querySelector('#adminAvaliacaoDeleteConfirmModal');
      if (existingDeleteModal && existingDeleteModal !== deleteConfirmModalElement) {
        existingDeleteModal.remove();
      }

      document.body.appendChild(deleteConfirmModalElement);
    }

    if (dashboardModalElement && dashboardModalElement.parentElement !== document.body) {
      var existingDashboardModal = document.body.querySelector('#adminAvaliacaoDashboardModal');
      if (existingDashboardModal && existingDashboardModal !== dashboardModalElement) {
        existingDashboardModal.remove();
      }

      document.body.appendChild(dashboardModalElement);
    }

    if (correcaoModalElement && correcaoModalElement.parentElement !== document.body) {
      var existingCorrecaoModal = document.body.querySelector('#adminAvaliacaoCorrecaoModal');
      if (existingCorrecaoModal && existingCorrecaoModal !== correcaoModalElement) {
        existingCorrecaoModal.remove();
      }

      document.body.appendChild(correcaoModalElement);
    }

    if (correcaoDiscursivaModalElement && correcaoDiscursivaModalElement.parentElement !== document.body) {
      var existingCorrecaoDiscursivaModal = document.body.querySelector('#adminAvaliacaoCorrecaoDiscursivaModal');
      if (existingCorrecaoDiscursivaModal && existingCorrecaoDiscursivaModal !== correcaoDiscursivaModalElement) {
        existingCorrecaoDiscursivaModal.remove();
      }

      document.body.appendChild(correcaoDiscursivaModalElement);
    }

    if (correcaoRevisaoModalElement && correcaoRevisaoModalElement.parentElement !== document.body) {
      var existingCorrecaoRevisaoModal = document.body.querySelector('#adminAvaliacaoCorrecaoRevisaoModal');
      if (existingCorrecaoRevisaoModal && existingCorrecaoRevisaoModal !== correcaoRevisaoModalElement) {
        existingCorrecaoRevisaoModal.remove();
      }

      document.body.appendChild(correcaoRevisaoModalElement);
    }

    if (correcaoEdicaoModalElement && correcaoEdicaoModalElement.parentElement !== document.body) {
      var existingCorrecaoEdicaoModal = document.body.querySelector('#adminAvaliacaoCorrecaoEdicaoModal');
      if (existingCorrecaoEdicaoModal && existingCorrecaoEdicaoModal !== correcaoEdicaoModalElement) {
        existingCorrecaoEdicaoModal.remove();
      }

      document.body.appendChild(correcaoEdicaoModalElement);
    }

    if (turmasModalElement && turmasModalElement.parentElement !== document.body) {
      var existingTurmasModal = document.body.querySelector('#adminAvaliacaoTurmasModal');
      if (existingTurmasModal && existingTurmasModal !== turmasModalElement) {
        existingTurmasModal.remove();
      }

      document.body.appendChild(turmasModalElement);
    }

    if (alunosModalElement && alunosModalElement.parentElement !== document.body) {
      var existingAlunosModal = document.body.querySelector('#adminAvaliacaoAlunosModal');
      if (existingAlunosModal && existingAlunosModal !== alunosModalElement) {
        existingAlunosModal.remove();
      }

      document.body.appendChild(alunosModalElement);
    }

    if (aplicadoresModalElement && aplicadoresModalElement.parentElement !== document.body) {
      var existingAplicadoresModal = document.body.querySelector('#adminAvaliacaoAplicadoresModal');
      if (existingAplicadoresModal && existingAplicadoresModal !== aplicadoresModalElement) {
        existingAplicadoresModal.remove();
      }

      document.body.appendChild(aplicadoresModalElement);
    }

    if (statsFiltersModalElement && statsFiltersModalElement.parentElement !== document.body) {
      var existingStatsFiltersModal = document.body.querySelector('#adminAvaliacaoStatsFiltersModal');
      if (existingStatsFiltersModal && existingStatsFiltersModal !== statsFiltersModalElement) {
        existingStatsFiltersModal.remove();
      }

      document.body.appendChild(statsFiltersModalElement);
    }

    if (statsSkillsModalElement && statsSkillsModalElement.parentElement !== document.body) {
      var existingStatsSkillsModal = document.body.querySelector('#adminAvaliacaoStatsSkillsModal');
      if (existingStatsSkillsModal && existingStatsSkillsModal !== statsSkillsModalElement) {
        existingStatsSkillsModal.remove();
      }

      document.body.appendChild(statsSkillsModalElement);
    }

    if (tableFiltersModalElement && tableFiltersModalElement.parentElement !== document.body) {
      var existingTableFiltersModal = document.body.querySelector('#adminAvaliacoesFiltersModal');
      if (existingTableFiltersModal && existingTableFiltersModal !== tableFiltersModalElement) {
        existingTableFiltersModal.remove();
      }

      document.body.appendChild(tableFiltersModalElement);
    }

    if (formModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      formModalInstance = bootstrap.Modal.getOrCreateInstance(formModalElement, {
        backdrop: 'static',
      });
    }

    if (turmasModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      turmasModalInstance = bootstrap.Modal.getOrCreateInstance(turmasModalElement, {
        backdrop: false,
      });
    }

    if (alunosModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      alunosModalInstance = bootstrap.Modal.getOrCreateInstance(alunosModalElement, {
        backdrop: false,
      });
    }

    if (aplicadoresModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      aplicadoresModalInstance = bootstrap.Modal.getOrCreateInstance(aplicadoresModalElement, {
        backdrop: false,
      });
    }

    if (statsFiltersModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      statsFiltersModalInstance = bootstrap.Modal.getOrCreateInstance(statsFiltersModalElement, {
        backdrop: false,
      });
    }

    if (statsSkillsModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      statsSkillsModalInstance = bootstrap.Modal.getOrCreateInstance(statsSkillsModalElement);
    }

    if (tableFiltersModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      tableFiltersModalInstance = bootstrap.Modal.getOrCreateInstance(tableFiltersModalElement);
    }

    if (deleteConfirmModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      deleteConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(deleteConfirmModalElement, {
        backdrop: 'static',
      });

      deleteConfirmModalElement.addEventListener('hidden.bs.modal', function () {
        pendingDeleteForms = [];
      });
    }

    if (deleteConfirmButton) {
      deleteConfirmButton.addEventListener('click', function () {
        var forms = pendingDeleteForms.slice();
        pendingDeleteForms = [];

        if (!forms.length) {
          return;
        }

        if (deleteConfirmModalInstance) {
          deleteConfirmModalInstance.hide();
        }

        // Resolve CSRF token: try to read from any delete form in the DOM
        function getCsrf() {
          var csrfInput = document.querySelector('.js-admin-avaliacao-delete-form input[name="csrf_token"]');
          return csrfInput ? String(csrfInput.value || '') : '';
        }

        var promises = forms.map(function (formItem) {
          var action, data;

          if (formItem && typeof formItem.nodeName === 'string') {
            // Real DOM <form> element
            action = String(formItem.action || '');
            data = new FormData(formItem);
          } else if (formItem && typeof formItem === 'object' && formItem.action) {
            // Plain object { action, method, fields }
            action = String(formItem.action || '');
            data = new FormData();
            var fields = formItem.fields || {};
            Object.keys(fields).forEach(function (key) {
              var val = key === 'csrf_token' && String(fields[key] || '') === '' ? getCsrf() : fields[key];
              data.append(key, val);
            });
          } else {
            return Promise.resolve(null);
          }

          return fetch(action, {
            method: 'POST',
            body: data,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
          })
            .then(function (response) { return response.json(); })
            .catch(function () { return null; });
        });

        Promise.all(promises).then(function (results) {
          var errors = results.filter(function (r) { return r && r.ok === false; });
          if (errors.length > 0) {
            var msg = errors.map(function (e) { return String(e.message || 'Erro desconhecido'); }).join('\n');
            alert('Erro ao excluir:\n' + msg);
          }

          refreshAvaliacoesCrudView();
        });
      });
    }

    if (dashboardModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      dashboardModalInstance = bootstrap.Modal.getOrCreateInstance(dashboardModalElement, {
        backdrop: 'static',
      });
      dashboardModalElement.addEventListener('hidden.bs.modal', function () {
        activeDashboardTurmasIds = [];
        activeDashboardAlunosIds = [];
        activeDashboardAvaliacaoAplicacao = '';
        impressaoTurmasSelectionInitialized = false;
      });
    }

    if (correcaoModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      correcaoModalInstance = bootstrap.Modal.getOrCreateInstance(correcaoModalElement, {
        backdrop: false,
        keyboard: false,
      });
      correcaoModalElement.addEventListener('hidden.bs.modal', function () {
        stopCorrecaoCamera();
        closeCorrecaoRevisaoModal();
        closeCorrecaoDiscursivaModal();
        if (dashboardModalElement) {
          dashboardModalElement.classList.remove('admin-avaliacao-dashboard-modal-underlay');
        }
        setCorrecaoBackdropIsolation(false);
      });
    }

    if (correcaoDiscursivaModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      correcaoDiscursivaModalInstance = bootstrap.Modal.getOrCreateInstance(correcaoDiscursivaModalElement, {
        backdrop: false,
        keyboard: false,
      });
    }

    if (correcaoRevisaoModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      correcaoRevisaoModalInstance = bootstrap.Modal.getOrCreateInstance(correcaoRevisaoModalElement, {
        backdrop: false,
        keyboard: false,
      });
    }

    if (correcaoEdicaoModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      correcaoEdicaoModalInstance = bootstrap.Modal.getOrCreateInstance(correcaoEdicaoModalElement, {
        backdrop: false,
        keyboard: false,
      });
    }

    // ── restored utility functions ───────────────────────────────

    function getGabaritoBaseWidth() {
      if (!gabaritoTemplateImage || !gabaritoTemplateImage.width) {
        return 0;
      }

      return Math.min(a4CanvasWidth - 120, gabaritoTemplateImage.width);
    }

    function getGabaritoBaseHeight() {
      if (!gabaritoTemplateImage || !gabaritoTemplateImage.height) {
        return 0;
      }

      return Math.min(a4CanvasHeight - 120, gabaritoTemplateImage.height);
    }

    function ensureGabaritoLayoutInBounds() {
      if (!gabaritoTemplateImage || !gabaritoTemplateImage.width || !gabaritoTemplateImage.height) {
        return;
      }

      var baseWidth = getGabaritoBaseWidth();
      var baseHeight = getGabaritoBaseHeight();
      var scaleX = gabaritoLayout.scaleX != null ? gabaritoLayout.scaleX : gabaritoLayout.scale;
      var scaleY = gabaritoLayout.scaleY != null ? gabaritoLayout.scaleY : gabaritoLayout.scale;
      var renderWidth = Math.max(120, Math.round(baseWidth * scaleX));
      var renderHeight = baseHeight > 0
        ? Math.max(160, Math.round(baseHeight * scaleY))
        : Math.max(160, Math.round(renderWidth * (gabaritoTemplateImage.height / gabaritoTemplateImage.width)));

      var maxX = Math.max(0, a4CanvasWidth - renderWidth);
      var maxY = Math.max(0, a4CanvasHeight - renderHeight);

      gabaritoLayout.x = clampInt(gabaritoLayout.x, 0, maxX, 0);
      gabaritoLayout.y = clampInt(gabaritoLayout.y, 0, maxY, 0);
      gabaritoLayoutRect = {
        x: gabaritoLayout.x,
        y: gabaritoLayout.y,
        width: renderWidth,
        height: renderHeight,
      };
    }

    function getAlternativeLetter(index) {
      var safeIndex = Number(index);
      if (!Number.isFinite(safeIndex) || safeIndex < 0) {
        return '';
      }

      var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (safeIndex < alphabet.length) {
        return alphabet.charAt(safeIndex);
      }

      return String(safeIndex + 1);
    }

    function sanitizeRichTextHtml(rawHtml) {
      var allowedTags = {
        B: true,
        STRONG: true,
        I: true,
        EM: true,
        U: true,
        SPAN: true,
        FONT: true,
        BR: true,
      };

      var wrapper = document.createElement('div');
      wrapper.innerHTML = String(rawHtml || '');

      (function cleanNode(node) {
        var children = Array.from(node.childNodes || []);
        children.forEach(function (child) {
          if (child.nodeType === Node.TEXT_NODE) {
            return;
          }

          if (child.nodeType !== Node.ELEMENT_NODE) {
            child.remove();
            return;
          }

          var element = child;
          if (!allowedTags[element.tagName]) {
            var fragment = document.createDocumentFragment();
            while (element.firstChild) {
              fragment.appendChild(element.firstChild);
            }
            element.replaceWith(fragment);
            cleanNode(node);
            return;
          }

          Array.from(element.attributes).forEach(function (attr) {
            if (element.tagName === 'SPAN' && attr.name === 'style') {
              var styleValue = String(attr.value || '');
              var styleParts = [];

              var colorMatch = styleValue.match(/color\s*:\s*([^;]+)/i);
              if (colorMatch && colorMatch[1]) {
                styleParts.push('color:' + colorMatch[1].trim());
              }

              if (/font-style\s*:\s*italic/i.test(styleValue)) {
                styleParts.push('font-style:italic');
              }

              if (/text-decoration\s*:\s*[^;]*underline/i.test(styleValue) || /text-decoration-line\s*:\s*[^;]*underline/i.test(styleValue)) {
                styleParts.push('text-decoration:underline');
              }

              if (styleParts.length) {
                element.setAttribute('style', styleParts.join(';'));
              } else {
                element.removeAttribute('style');
              }
              return;
            }

            if (element.tagName === 'FONT' && attr.name === 'color') {
              var safeColor = String(attr.value || '').trim();
              if (safeColor !== '') {
                element.setAttribute('style', 'color:' + safeColor);
              }
              return;
            }

            if (attr.name !== 'style') {
              element.removeAttribute(attr.name);
            }
          });

          if (element.tagName !== 'SPAN' && element.tagName !== 'FONT' && element.hasAttribute('style')) {
            element.removeAttribute('style');
          }

          cleanNode(element);
        });
      })(wrapper);

      return wrapper.innerHTML.trim();
    }

    function richTextToPlainText(rawHtml) {
      var temp = document.createElement('div');
      temp.innerHTML = sanitizeRichTextHtml(rawHtml);
      return String(temp.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function sanitizeGabaritoRespostas(rawRespostas, questoes, alternativas) {
      var safeQuestoes = clampInt(questoes, 1, 200, 1);
      var safeAlternativas = clampInt(alternativas, 2, 10, 4);

      if (!rawRespostas || typeof rawRespostas !== 'object') {
        return {};
      }

      var validLetters = [];
      for (var idx = 0; idx < safeAlternativas; idx += 1) {
        validLetters.push(getAlternativeLetter(idx));
      }

      var result = {};
      Object.keys(rawRespostas).forEach(function (rawKey) {
        var questionNumber = clampInt(rawKey, 1, safeQuestoes, 0);
        if (questionNumber <= 0 || questionNumber > safeQuestoes) {
          return;
        }

        var normalizedValue = String(rawRespostas[rawKey] || '').trim().toUpperCase();
        if (validLetters.indexOf(normalizedValue) === -1) {
          return;
        }

        result[String(questionNumber)] = normalizedValue;
      });

      return result;
    }

    function createDefaultQuestaoItem(alternativasCount) {
      var safeAlternativas = clampInt(alternativasCount, 2, 10, 4);
      var alternativas = [];
      for (var altIndex = 0; altIndex < safeAlternativas; altIndex += 1) {
        alternativas.push('');
      }

      return {
        enunciado: '',
        alternativas: alternativas,
        correta: '',
        tipo: 'multipla',
        anulada: false,
        peso: 1,
        disciplina: '',
        habilidade: '',
      };
    }

    function getQuestaoAltLabel(tipo, altIndex) {
      if (tipo === 'vf') {
        return altIndex === 0 ? 'V' : 'F';
      }
      return getAlternativeLetter(altIndex);
    }

    function sanitizeQuestaoItem(item) {
      if (!item || typeof item !== 'object') {
        return createDefaultQuestaoItem(4);
      }

      var tipo = (item.tipo === 'vf' || item.tipo === 'discursiva') ? item.tipo : 'multipla';
      var anulada = item.anulada === true;

      var alternativasRaw = Array.isArray(item.alternativas) ? item.alternativas : [];
      var safeAlternativasCount;
      if (tipo === 'vf') {
        safeAlternativasCount = 2;
      } else if (tipo === 'discursiva') {
        safeAlternativasCount = 0;
      } else {
        safeAlternativasCount = clampInt(alternativasRaw.length || 4, 2, 10, 4);
      }

      var alternativas = [];
      for (var index = 0; index < safeAlternativasCount; index += 1) {
        alternativas.push(sanitizeRichTextHtml(alternativasRaw[index]));
      }

      var correta = String(item.correta || '').trim().toUpperCase();
      if (anulada || tipo === 'discursiva') {
        correta = '';
      } else if (tipo === 'vf') {
        if (correta !== 'V' && correta !== 'F') correta = '';
      } else {
        var validLetters = alternativas.map(function (_v, ai) { return getAlternativeLetter(ai); });
        if (validLetters.indexOf(correta) === -1) correta = '';
      }

      return {
        enunciado: sanitizeRichTextHtml(item.enunciado),
        alternativas: alternativas,
        correta: correta,
        tipo: tipo,
        anulada: anulada,
        peso: sanitizeQuestaoPeso(item.peso, 1),
        disciplina: String(item.disciplina || '').trim(),
        habilidade: String(item.habilidade || '').trim(),
      };
    }

    function buildLegacyQuestoesItens(questoes, alternativas, respostas) {
      var safeQuestoes = clampInt(questoes, 1, 200, 1);
      var safeAlternativas = clampInt(alternativas, 2, 10, 4);
      var safeRespostas = sanitizeGabaritoRespostas(respostas, safeQuestoes, safeAlternativas);
      var itens = [];

      for (var questionIndex = 1; questionIndex <= safeQuestoes; questionIndex += 1) {
        var item = createDefaultQuestaoItem(safeAlternativas);
        item.correta = String(safeRespostas[String(questionIndex)] || '').trim().toUpperCase();
        itens.push(item);
      }

      return itens;
    }

    function sanitizeGabaritoQuestoesItens(rawItens, fallbackQuestoes, fallbackAlternativas, fallbackRespostas) {
      var source = Array.isArray(rawItens) ? rawItens : [];
      var itens = source.map(sanitizeQuestaoItem).filter(function (item) {
        if (!item) { return false; }
        if (item.tipo === 'discursiva') { return true; }
        return Array.isArray(item.alternativas) && item.alternativas.length >= 2;
      });

      if (!itens.length) {
        itens = buildLegacyQuestoesItens(fallbackQuestoes, fallbackAlternativas, fallbackRespostas);
      }

      if (!itens.length) {
        itens = [createDefaultQuestaoItem(4)];
      }

      return itens.slice(0, 200);
    }

    function getMaxAlternativasFromQuestoesItens(itens) {
      if (!Array.isArray(itens) || !itens.length) {
        return 4;
      }

      return clampInt(Math.max.apply(null, itens.map(function (item) {
        return Array.isArray(item.alternativas) ? item.alternativas.length : 0;
      })), 2, 10, 4);
    }

    function getConfiguredAlternativasCount() {
      var itensCount = getMaxAlternativasFromQuestoesItens(gabaritoQuestoesItens);
      return clampInt(Math.max(itensCount, Number(gabaritoAlternativasConfiguradas || 0)), 2, 10, 4);
    }

    function buildRespostasFromQuestoesItens(itens) {
      var respostas = {};
      if (!Array.isArray(itens) || !itens.length) {
        return respostas;
      }

      itens.forEach(function (item, index) {
        var correta = String(item && item.correta ? item.correta : '').trim().toUpperCase();
        var alternativasCount = Array.isArray(item && item.alternativas) ? item.alternativas.length : 0;
        var validLetters = [];
        for (var altIndex = 0; altIndex < alternativasCount; altIndex += 1) {
          validLetters.push(getAlternativeLetter(altIndex));
        }

        if (validLetters.indexOf(correta) !== -1) {
          respostas[String(index + 1)] = correta;
        }
      });

      return respostas;
    }

    function renderGabaritoQuestoesEditor() {
      if (!questoesListContainer) {
        return;
      }

      questoesListContainer.innerHTML = '';

      var questoes = gabaritoQuestoesItens.length;
      var rowsPerCol = clampInt(gabaritoQuestoesPorColuna, 1, 50, 10);
      var columnCount = Math.max(1, Math.ceil(questoes / rowsPerCol));

      var columnsWrap = document.createElement('div');
      columnsWrap.style.display = 'flex';
      columnsWrap.style.alignItems = 'flex-start';
      columnsWrap.style.justifyContent = 'center';
      columnsWrap.style.gap = '12px';
      columnsWrap.style.flexWrap = 'wrap';

      for (var col = 0; col < columnCount; col += 1) {
        var colDiv = document.createElement('div');
        colDiv.style.display = 'flex';
        colDiv.style.flexDirection = 'column';
        colDiv.style.gap = '3px';

        var startQ = col * rowsPerCol;
        var endQ = Math.min(startQ + rowsPerCol, questoes);

        for (var qi = startQ; qi < endQ; qi += 1) {
          var item = sanitizeQuestaoItem(gabaritoQuestoesItens[qi]);
          gabaritoQuestoesItens[qi] = item;
          var tipo = item.tipo || 'multipla';
          var anulada = item.anulada === true;
          var correta = String(item.correta || '').trim().toUpperCase();
          var alts = Array.isArray(item.alternativas) ? item.alternativas : [];
          var peso = sanitizeQuestaoPeso(item.peso, 1);

          var row = document.createElement('div');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.gap = '4px';
          row.style.lineHeight = '1';
          if (anulada) { row.style.opacity = '0.5'; }

          // --- Type cycle button (left) ---
          var typeLabels = { multipla: 'ME', vf: 'VF', discursiva: 'D' };
          var typeCycleBtn = document.createElement('button');
          typeCycleBtn.type = 'button';
          typeCycleBtn.className = 'js-admin-gabarito-type-cycle';
          typeCycleBtn.setAttribute('data-question-index', String(qi));
          typeCycleBtn.title = tipo === 'multipla' ? 'Múltipla Escolha — clique para alternar' : tipo === 'vf' ? 'Verdadeiro/Falso — clique para alternar' : 'Discursiva — clique para alternar';
          typeCycleBtn.textContent = typeLabels[tipo] || 'ME';
          typeCycleBtn.style.cssText = [
            'border:1px solid ' + (tipo === 'discursiva' ? '#6c757d' : tipo === 'vf' ? '#0dcaf0' : '#0d6efd'),
            'background:' + (tipo === 'discursiva' ? '#f8f9fa' : tipo === 'vf' ? '#cff4fc' : '#e7f0ff'),
            'color:' + (tipo === 'discursiva' ? '#6c757d' : tipo === 'vf' ? '#087990' : '#0d6efd'),
            'font-size:0.6rem',
            'font-weight:700',
            'padding:1px 4px',
            'border-radius:3px',
            'cursor:pointer',
            'white-space:nowrap',
            'min-width:1.8rem',
            'text-align:center',
            'line-height:1.4',
          ].join(';');
          row.appendChild(typeCycleBtn);

          // --- Question number ---
          var numSpan = document.createElement('span');
          numSpan.style.cssText = 'font-size:0.78rem;font-weight:600;min-width:1.6rem;text-align:right;color:#333;' + (anulada ? 'text-decoration:line-through;' : '');
          numSpan.textContent = String(qi + 1).padStart(2, '0') + '.';
          row.appendChild(numSpan);

          // --- Bubbles ---
          if (tipo === 'discursiva') {
            var discSpan = document.createElement('span');
            discSpan.style.cssText = 'font-size:0.7rem;color:#6c757d;font-style:italic;padding-left:2px;';
            discSpan.textContent = 'discursiva';
            row.appendChild(discSpan);
          } else if (anulada) {
            var annSpan = document.createElement('span');
            annSpan.style.cssText = 'font-size:0.7rem;color:#dc3545;font-weight:600;padding-left:2px;';
            annSpan.textContent = 'anulada';
            row.appendChild(annSpan);
          } else {
            alts.forEach(function (_v, ai) {
              var letter = getQuestaoAltLabel(tipo, ai);
              var isSelected = correta === letter;
              var bub = document.createElement('button');
              bub.type = 'button';
              bub.className = 'js-admin-gabarito-bubble';
              bub.setAttribute('data-question-index', String(qi));
              bub.setAttribute('data-alt-letter', letter);
              bub.textContent = letter;
              bub.style.cssText = [
                'width:1.5rem',
                'height:1.5rem',
                'border-radius:50%',
                'border:2px solid #111',
                'background:' + (isSelected ? '#111' : '#fff'),
                'color:' + (isSelected ? '#fff' : '#111'),
                'font-size:0.65rem',
                'font-weight:' + (isSelected ? '700' : '400'),
                'padding:0',
                'cursor:pointer',
                'display:inline-flex',
                'align-items:center',
                'justify-content:center',
                'flex-shrink:0',
              ].join(';');
              row.appendChild(bub);
            });
          }

          var pesoWrap = document.createElement('label');
          pesoWrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-left:6px;';

          var pesoLabel = document.createElement('span');
          pesoLabel.style.cssText = 'font-size:0.68rem;color:#6c757d;font-weight:600;white-space:nowrap;';
          pesoLabel.textContent = 'Peso';
          pesoWrap.appendChild(pesoLabel);

          var pesoInput = document.createElement('input');
          pesoInput.type = 'number';
          pesoInput.className = 'form-control form-control-sm js-admin-gabarito-peso';
          pesoInput.setAttribute('data-question-index', String(qi));
          pesoInput.setAttribute('min', '0.01');
          pesoInput.setAttribute('step', '0.01');
          pesoInput.setAttribute('inputmode', 'decimal');
          pesoInput.value = String(peso).replace(/\.00$/, '');
          pesoInput.style.cssText = 'width:4.75rem;min-width:4.75rem;padding:1px 4px;font-size:0.72rem;line-height:1.2;height:1.8rem;';
          pesoWrap.appendChild(pesoInput);

          row.appendChild(pesoWrap);

          // --- Action buttons (right) ---
          var actWrap = document.createElement('div');
          actWrap.style.cssText = 'display:flex;align-items:center;gap:2px;margin-left:4px;';

          var anularBtn = document.createElement('button');
          anularBtn.type = 'button';
          anularBtn.className = 'js-admin-gabarito-anular-btn';
          anularBtn.setAttribute('data-question-index', String(qi));
          anularBtn.title = anulada ? 'Reativar' : 'Anular';
          anularBtn.innerHTML = anulada ? '↩' : '⊘';
          anularBtn.style.cssText = 'width:1.3rem;height:1.3rem;border-radius:3px;border:1px solid ' + (anulada ? '#dc3545' : '#ffc107') + ';background:' + (anulada ? '#f8d7da' : '#fff3cd') + ';color:' + (anulada ? '#842029' : '#664d03') + ';font-size:0.7rem;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
          actWrap.appendChild(anularBtn);

          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'js-admin-gabarito-remove-question';
          delBtn.setAttribute('data-question-index', String(qi));
          delBtn.disabled = gabaritoQuestoesItens.length <= 1;
          delBtn.title = 'Remover questão';
          delBtn.innerHTML = '×';
          delBtn.style.cssText = 'width:1.3rem;height:1.3rem;border-radius:3px;border:1px solid #dc3545;background:#fff;color:#dc3545;font-size:0.85rem;font-weight:700;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
          actWrap.appendChild(delBtn);

          row.appendChild(actWrap);
          colDiv.appendChild(row);
        }

        columnsWrap.appendChild(colDiv);
      }

      questoesListContainer.appendChild(columnsWrap);
      renderDisciplinasHabilidadesEditor();
    }

    function renderDisciplinasHabilidadesEditor() {
      if (!disciplinasHabilidadesListContainer) { return; }
      disciplinasHabilidadesListContainer.innerHTML = '';

      var questoes = gabaritoQuestoesItens.length;
      if (questoes === 0) {
        disciplinasHabilidadesListContainer.innerHTML = '<div class="text-secondary small py-2 text-center">Nenhuma questão configurada.</div>';
        return;
      }

      var table = document.createElement('table');
      table.className = 'table table-sm table-borderless align-middle mb-0';
      table.style.width = '100%';

      var thead = document.createElement('thead');
      thead.innerHTML = '<tr><th class="text-secondary fw-normal" style="width:2.2rem;font-size:.72rem">Nº</th>'
        + '<th class="text-secondary fw-normal" style="font-size:.72rem">Disciplina</th>'
        + '<th class="text-secondary fw-normal" style="font-size:.72rem">Habilidade</th></tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');

      gabaritoQuestoesItens.forEach(function (item, qi) {
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';

        // Nº
        var tdNum = document.createElement('td');
        tdNum.style.cssText = 'font-size:.78rem;font-weight:600;color:#333;white-space:nowrap;vertical-align:middle;';
        tdNum.textContent = String(qi + 1).padStart(2, '0') + '.';
        tr.appendChild(tdNum);

        // Disciplina — select
        var tdDisc = document.createElement('td');
        tdDisc.style.cssText = 'vertical-align:middle;padding-right:4px;';
        var sel = document.createElement('select');
        sel.className = 'form-select form-select-sm js-admin-disc-hb-disciplina';
        sel.setAttribute('data-question-index', String(qi));
        sel.style.cssText = 'font-size:.75rem;max-width:220px;';

        var optBlank = document.createElement('option');
        optBlank.value = '';
        optBlank.textContent = '— disciplina —';
        sel.appendChild(optBlank);

        disciplinasOptions.forEach(function (d) {
          if (d.status === 'inativa') { return; }
          var opt = document.createElement('option');
          opt.value = String(d.id);
          opt.textContent = d.nome;
          if (String(item.disciplina || '') === String(d.id)) { opt.selected = true; }
          sel.appendChild(opt);
        });

        tdDisc.appendChild(sel);
        tr.appendChild(tdDisc);

        // Habilidade — tag + botão
        var tdHb = document.createElement('td');
        tdHb.style.cssText = 'vertical-align:middle;';

        var hbWrap = document.createElement('div');
        hbWrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;';

        var habilidade = String(item.habilidade || '').trim();
        if (habilidade !== '') {
          var tag = document.createElement('span');
          tag.className = 'badge text-bg-primary';
          tag.style.cssText = 'font-size:.7rem;font-weight:500;cursor:default;';
          tag.textContent = habilidade;

          var rmHb = document.createElement('button');
          rmHb.type = 'button';
          rmHb.className = 'btn-close btn-close-sm ms-1 js-admin-disc-hb-remove-habilidade';
          rmHb.setAttribute('data-question-index', String(qi));
          rmHb.style.cssText = 'font-size:.55rem;vertical-align:middle;';
          rmHb.title = 'Remover habilidade';
          tag.appendChild(rmHb);
          hbWrap.appendChild(tag);
        }

        var hbBtn = document.createElement('button');
        hbBtn.type = 'button';
        hbBtn.className = 'btn btn-outline-secondary btn-sm js-admin-disc-hb-select-habilidade';
        hbBtn.setAttribute('data-question-index', String(qi));
        hbBtn.style.cssText = 'font-size:.7rem;padding:1px 6px;white-space:nowrap;';
        hbBtn.textContent = habilidade !== '' ? '✏ trocar' : '+ habilidade';
        hbWrap.appendChild(hbBtn);

        tdHb.appendChild(hbWrap);
        tr.appendChild(tdHb);

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      disciplinasHabilidadesListContainer.appendChild(table);
    }

    function openHabilidadeSelector(questionIndex) {
      if (!habilidadeSelectorModalElement) { return; }
      habilidadeSelectorQuestionIndex = questionIndex;
      habilidadeSelectorActiveFilter = 'todos';

      var item = gabaritoQuestoesItens[questionIndex] || {};
      var habilidadeAtual = String(item.habilidade || '').trim();
      habilidadeSelectorSelected = habilidadeAtual !== '' ? [habilidadeAtual] : [];

      // título
      if (habilidadeSelectorQuestaoNum) {
        habilidadeSelectorQuestaoNum.textContent = String(questionIndex + 1).padStart(2, '0');
      }

      // info de disciplina para filtrar
      var disciplinaId = String(item.disciplina || '').trim();
      var disciplinaNome = '';
      if (disciplinaId !== '') {
        var discMatch = disciplinasOptions.filter(function (d) { return String(d.id) === disciplinaId; });
        if (discMatch.length > 0) { disciplinaNome = discMatch[0].nome; }
      }
      if (habilidadeSelectorDisciplinaInfo) {
        habilidadeSelectorDisciplinaInfo.textContent = disciplinaNome
          ? 'Filtrando pela disciplina: ' + disciplinaNome
          : 'Nenhuma disciplina selecionada — mostrando todas as habilidades';
      }

      // reset filtros visuais
      Array.prototype.forEach.call(habilidadeSelectorFilterButtons, function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-hb-filter') === 'todos');
      });
      if (habilidadeSelectorSearch) { habilidadeSelectorSearch.value = ''; }
      if (habilidadeSelectorCustomInput) { habilidadeSelectorCustomInput.value = ''; }
      updateHabilidadeSelectorCount();

      if (habilidadeSelectorList) {
        habilidadeSelectorList.innerHTML = '<div class="text-center text-secondary py-4">Carregando habilidades...</div>';
      }

      if (!habilidadeSelectorBsModal && window.bootstrap && window.bootstrap.Modal) {
        if (habilidadeSelectorModalElement.parentElement !== document.body) {
          document.body.appendChild(habilidadeSelectorModalElement);
        }
        habilidadeSelectorBsModal = new window.bootstrap.Modal(habilidadeSelectorModalElement);
        habilidadeSelectorModalElement.addEventListener('shown.bs.modal', function () {
          var backdrops = document.querySelectorAll('.modal-backdrop');
          if (backdrops.length > 0) {
            backdrops[backdrops.length - 1].style.zIndex = '1060';
          }
          habilidadeSelectorModalElement.style.zIndex = '1065';
          if (habilidadeSelectorSearch) { habilidadeSelectorSearch.focus(); }
        });
      }
      if (habilidadeSelectorBsModal) { habilidadeSelectorBsModal.show(); }

      habilidadeFetchCache(function (cache) {
        renderHabilidadeSelectorList(cache, disciplinaNome);
      });
    }

    function updateHabilidadeSelectorCount() {
      if (habilidadeSelectorCount) {
        habilidadeSelectorCount.textContent = String(habilidadeSelectorSelected.length) + ' selecionada(s)';
      }
    }

    function habilidadeNormalize(v) {
      var s = String(v || '').trim().toLowerCase();
      if (typeof s.normalize === 'function') { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
      return s;
    }

    function getHabilidadesListarUrl() {
      var path = '/institucional/habilidades/listar';
      return typeof window.appBuildEndpoint === 'function' ? window.appBuildEndpoint(path) : path;
    }

    function habilidadeFetchCache(cb) {
      if (habilidadeSelectorCache) { cb(habilidadeSelectorCache); return; }
      if (typeof cb === 'function') {
        habilidadeSelectorCacheCallbacks.push(cb);
      }
      if (habilidadeSelectorCacheLoading) {
        return;
      }
      habilidadeSelectorCacheLoading = true;
      fetch(getHabilidadesListarUrl(), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || !data.ok || !Array.isArray(data.habilidades)) { throw new Error('Resposta inválida'); }
          var disciplinasMap = {};
          if (Array.isArray(data.disciplinas)) {
            data.disciplinas.forEach(function (d) { disciplinasMap[String(d.id)] = d.nome; });
          }
          habilidadeSelectorCache = { habilidades: data.habilidades, disciplinasMap: disciplinasMap };
          habilidadeSelectorCacheLoading = false;
          var pendingCallbacks = habilidadeSelectorCacheCallbacks.slice();
          habilidadeSelectorCacheCallbacks = [];
          pendingCallbacks.forEach(function (callback) {
            callback(habilidadeSelectorCache);
          });
        })
        .catch(function () {
          habilidadeSelectorCacheLoading = false;
          habilidadeSelectorCacheCallbacks = [];
          if (habilidadeSelectorList) {
            habilidadeSelectorList.innerHTML = '<div class="text-center text-danger py-4">Erro ao carregar habilidades.</div>';
          }
        });
    }

    function getStatsSkillDisplayLabel(value, fallbackValue) {
      var safeValue = sanitizeQuestaoMetaField(value);
      if (safeValue === '') {
        return fallbackValue;
      }

      var habilidades = habilidadeSelectorCache && Array.isArray(habilidadeSelectorCache.habilidades)
        ? habilidadeSelectorCache.habilidades
        : [];

      for (var index = 0; index < habilidades.length; index += 1) {
        var habilidade = habilidades[index] && typeof habilidades[index] === 'object' ? habilidades[index] : null;
        if (!habilidade) {
          continue;
        }

        if (String(habilidade.codigo || '').trim() !== safeValue) {
          continue;
        }

        var descricao = String(habilidade.descricao || '').trim();
        if (descricao !== '') {
          return safeValue + ' - ' + descricao;
        }
      }

      return safeValue;
    }

    function renderHabilidadeSelectorList(cache, disciplinaFiltro) {
      function esc(v) {
        return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      if (!habilidadeSelectorList) { return; }
      if (!cache) {
        habilidadeSelectorList.innerHTML = '<div class="text-center text-danger py-4">Erro ao carregar habilidades.</div>';
        return;
      }

      var searchValue = habilidadeNormalize(habilidadeSelectorSearch ? habilidadeSelectorSearch.value : '');
      var filterDoc = habilidadeSelectorActiveFilter;
      var disciplinaNorm = habilidadeNormalize(disciplinaFiltro || '');

      var filtered = cache.habilidades.filter(function (h) {
        if (filterDoc !== 'todos') {
          if (String(h.documento || '').toUpperCase() !== filterDoc.toUpperCase()) { return false; }
        }
        if (disciplinaNorm !== '') {
          var discNome = habilidadeNormalize(cache.disciplinasMap[String(h.disciplina_id)] || '');
          if (discNome !== disciplinaNorm) { return false; }
        }
        if (searchValue !== '') {
          var hay = habilidadeNormalize(String(h.codigo || '') + ' ' + String(h.descricao || '') + ' ' + String(h.documento || ''));
          if (hay.indexOf(searchValue) === -1) { return false; }
        }
        return true;
      });

      if (filtered.length === 0) {
        habilidadeSelectorList.innerHTML = '<div class="text-center text-secondary py-3 small">Nenhuma habilidade encontrada.</div>';
        return;
      }

      var maxRender = 200;
      var html = '';
      var rendered = Math.min(filtered.length, maxRender);
      for (var i = 0; i < rendered; i++) {
        var h = filtered[i];
        var codigo = String(h.codigo || '').trim();
        var descricao = String(h.descricao || '').trim();
        var documento = String(h.documento || '').toUpperCase();
        var isChecked = habilidadeSelectorSelected.indexOf(codigo) !== -1;
        var safeId = 'adminHbSel_' + i;
        var docBadge = documento === 'BNCC'
          ? '<span class="badge text-bg-primary ms-1" style="font-size:.65rem">BNCC</span>'
          : documento === 'DCT'
            ? '<span class="badge text-bg-success ms-1" style="font-size:.65rem">DCT</span>'
            : documento === 'MATRIZ'
              ? '<span class="badge text-bg-warning text-dark ms-1" style="font-size:.65rem">Matriz</span>'
              : '';
        var descTrunc = descricao.length > 120 ? (descricao.slice(0, 120) + '…') : descricao;
        html += '<label class="d-flex align-items-start gap-2 px-2 py-1 border-bottom hb-selector-row" for="' + safeId + '" style="cursor:pointer;' + (isChecked ? 'background:#f0f7ff;' : '') + '">'
          + '<input type="radio" id="' + safeId + '" name="adminHbSel" value="' + esc(codigo) + '"' + (isChecked ? ' checked' : '') + ' class="mt-1 flex-shrink-0 js-admin-hb-radio">'
          + '<span class="small"><strong>' + esc(codigo) + '</strong>' + docBadge + '<br><span class="text-secondary" style="font-size:.72rem">' + esc(descTrunc) + '</span></span>'
          + '</label>';
      }
      if (filtered.length > maxRender) {
        html += '<div class="text-center text-secondary py-2 small">Mostrando ' + maxRender + ' de ' + filtered.length + ' resultados. Refine a busca.</div>';
      }
      habilidadeSelectorList.innerHTML = html;
    }

    function sanitizeAvaliacaoLayoutConfig(rawLayout) {
      function sanitizeImageCropRect(rawCrop) {
        var crop = rawCrop && typeof rawCrop === 'object' ? rawCrop : {};
        var safeX = clampFloat(crop.x, 0, 0.95, 0);
        var safeY = clampFloat(crop.y, 0, 0.95, 0);
        var safeWidth = clampFloat(crop.width, 0.05, 1, 1);
        var safeHeight = clampFloat(crop.height, 0.05, 1, 1);

        if ((safeX + safeWidth) > 1) {
          safeWidth = Math.max(0.05, 1 - safeX);
        }

        if ((safeY + safeHeight) > 1) {
          safeHeight = Math.max(0.05, 1 - safeY);
        }

        return {
          x: safeX,
          y: safeY,
          width: safeWidth,
          height: safeHeight,
        };
      }

      var fallback = {
        spacing: 18,
        background: {
          path: '',
          url: '',
          cache_bust: '',
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          crop: {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
          },
        },
        images: [],
        question_positions: {},
        hidden_questions: {},
        snap_grid_enabled: true,
        grid_size: 12,
      };

      if (!rawLayout || typeof rawLayout !== 'object') {
        return fallback;
      }

      var rawBackground = rawLayout.background && typeof rawLayout.background === 'object'
        ? rawLayout.background
        : {};
      var safeBackgroundAsset = sanitizeGabaritoBackground(rawBackground);

      var safeImages = Array.isArray(rawLayout.images) ? rawLayout.images.map(function (image, index) {
        var safeAsset = sanitizeGabaritoBackground(image);
        return {
          id: String(image && image.id ? image.id : ('img_' + index + '_' + Date.now())),
          path: safeAsset.path,
          url: safeAsset.url,
          cache_bust: safeAsset.cache_bust,
          x: clampFloat(image && image.x, -2000, 12000, 20),
          y: clampFloat(image && image.y, -2000, 12000, 20),
          width: clampFloat(image && image.width, 40, 1200, 180),
          height: clampFloat(image && image.height, 40, 1200, 140),
          page: clampInt(image && image.page, 1, 999, 1),
          rotation: clampFloat(image && image.rotation, -180, 180, 0),
          crop: sanitizeImageCropRect(image && image.crop),
        };
      }) : [];

      var rawQuestionPositions = rawLayout.question_positions && typeof rawLayout.question_positions === 'object'
        ? rawLayout.question_positions
        : {};

      var safeQuestionPositions = {};
      Object.keys(rawQuestionPositions).forEach(function (key) {
        var item = rawQuestionPositions[key];
        if (!item || typeof item !== 'object') {
          return;
        }

        var questionNumber = clampInt(key, 1, 200, 0);
        if (questionNumber <= 0) {
          return;
        }

        safeQuestionPositions[String(questionNumber)] = {
          page: clampInt(item.page, 1, 999, 1),
          x: clampFloat(item.x, 0, 2000, 0),
          y: clampFloat(item.y, 0, 5000, 0),
        };
      });

      var rawHiddenQuestions = rawLayout.hidden_questions && typeof rawLayout.hidden_questions === 'object'
        ? rawLayout.hidden_questions
        : {};
      var safeHiddenQuestions = {};
      Object.keys(rawHiddenQuestions).forEach(function (key) {
        var questionNumber = clampInt(key, 1, 200, 0);
        if (questionNumber <= 0) {
          return;
        }

        safeHiddenQuestions[String(questionNumber)] = Boolean(rawHiddenQuestions[key]);
      });

      return {
        spacing: clampInt(rawLayout.spacing, 8, 60, 18),
        background: {
          path: safeBackgroundAsset.path,
          url: safeBackgroundAsset.url,
          cache_bust: safeBackgroundAsset.cache_bust,
          x: clampFloat(rawBackground.x, -2000, 2000, 0),
          y: clampFloat(rawBackground.y, -2000, 2000, 0),
          scale: clampFloat(rawBackground.scale, 0.2, 3, 1),
          rotation: clampFloat(rawBackground.rotation, -180, 180, 0),
          crop: sanitizeImageCropRect(rawBackground.crop),
        },
        images: safeImages,
        question_positions: safeQuestionPositions,
        hidden_questions: safeHiddenQuestions,
        snap_grid_enabled: rawLayout.snap_grid_enabled !== false,
        grid_size: clampInt(rawLayout.grid_size, 4, 80, 12),
      };
    }

    function getCurrentGabaritoConfig() {
      var itens = sanitizeGabaritoQuestoesItens(gabaritoQuestoesItens, 1, 4, {});
      var questoes = itens.length;
      var alternativas = getMaxAlternativasFromQuestoesItens(itens);
      var respostas = sanitizeGabaritoRespostas(buildRespostasFromQuestoesItens(itens), questoes, alternativas);

      return {
        questoes: questoes,
        alternativas: alternativas,
        questoes_por_coluna: gabaritoQuestoesPorColuna,
        respostas: respostas,
        itens: itens,
        layout: sanitizeGabaritoLayout(gabaritoLayout),
        background: sanitizeGabaritoBackground({
          path: gabaritoBackgroundPath,
          url: gabaritoBackgroundUrl,
        }),
        avaliacao_layout: sanitizeAvaliacaoLayoutConfig(avaliacaoLayoutConfig),
      };
    }

    function syncGabaritoInput() {
      if (!gabaritoInput) {
        return;
      }

      var config = getCurrentGabaritoConfig();
      gabaritoInput.value = JSON.stringify(config);
    }

    function renderA4LayoutEditor() {
      if (!gabaritoA4EditorCanvas) {
        return;
      }

      var a4Dpr = 2;
      if (gabaritoA4EditorCanvas.width !== a4CanvasWidth * a4Dpr) {
        gabaritoA4EditorCanvas.width = a4CanvasWidth * a4Dpr;
      }

      if (gabaritoA4EditorCanvas.height !== a4CanvasHeight * a4Dpr) {
        gabaritoA4EditorCanvas.height = a4CanvasHeight * a4Dpr;
      }

      var ctx = gabaritoA4EditorCanvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, gabaritoA4EditorCanvas.width, gabaritoA4EditorCanvas.height);
      ctx.scale(a4Dpr, a4Dpr);

      ctx.fillStyle = '#f1f3f5';
      ctx.fillRect(0, 0, a4CanvasWidth, a4CanvasHeight);

      var pageMargin = 24;
      var pageX = pageMargin;
      var pageY = pageMargin;
      var pageWidth = a4CanvasWidth - (pageMargin * 2);
      var pageHeight = a4CanvasHeight - (pageMargin * 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pageX, pageY, pageWidth, pageHeight);
      ctx.strokeStyle = '#cfd4da';
      ctx.lineWidth = 2;
      ctx.strokeRect(pageX, pageY, pageWidth, pageHeight);

      gabaritoBackgroundRect = null;
      gabaritoBackgroundHandleRect = null;
      gabaritoBackgroundGrowWidthRect = null;
      gabaritoBackgroundGrowHeightRect = null;

      if (gabaritoBackgroundImage && gabaritoBackgroundImage.width > 0 && gabaritoBackgroundImage.height > 0) {
        var bgW = Math.round(pageWidth * gabaritoBackgroundLayout.scale_x);
        var bgH = Math.round(pageHeight * gabaritoBackgroundLayout.scale_y);
        var bgX = pageX + Math.round(gabaritoBackgroundLayout.x);
        var bgY = pageY + Math.round(gabaritoBackgroundLayout.y);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(gabaritoBackgroundImage, bgX, bgY, bgW, bgH);

        gabaritoBackgroundRect = { x: bgX, y: bgY, width: bgW, height: bgH };

        var bgSelected = (gabaritoSelectionType === 'background');
        if (bgSelected) {
          ctx.save();
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bgX - 2, bgY - 2, bgW + 4, bgH + 4);
          ctx.setLineDash([]);
          ctx.restore();

          var bgHSz = 13;
          // Bottom-right: scale both W and H
          var bgHx = bgX + bgW - bgHSz;
          var bgHy = bgY + bgH - bgHSz;
          ctx.fillStyle = '#555555';
          ctx.fillRect(bgHx, bgHy, bgHSz, bgHSz);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bgHx + 3, bgHy + 3, 2, 2);
          ctx.fillRect(bgHx + 7, bgHy + 7, 2, 2);
          gabaritoBackgroundHandleRect = { x: bgHx, y: bgHy, size: bgHSz };

          // Right edge: grow width only
          var gwX = bgX + bgW - bgHSz;
          var gwY = bgY + Math.round(bgH / 2) - Math.round(bgHSz / 2);
          ctx.fillStyle = '#777777';
          ctx.fillRect(gwX, gwY, bgHSz, bgHSz);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('↔', gwX + 1, gwY + bgHSz - 2);
          gabaritoBackgroundGrowWidthRect = { x: gwX, y: gwY, size: bgHSz };

          // Bottom edge: grow height only
          var ghX = bgX + Math.round(bgW / 2) - Math.round(bgHSz / 2);
          var ghY = bgY + bgH - bgHSz;
          ctx.fillStyle = '#777777';
          ctx.fillRect(ghX, ghY, bgHSz, bgHSz);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('↕', ghX + 1, ghY + bgHSz - 2);
          gabaritoBackgroundGrowHeightRect = { x: ghX, y: ghY, size: bgHSz };
        }
      }

      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#8b949e';
      ctx.lineWidth = 1.5;

      // --- Info boxes: aluno, qr, title, numeracao, disciplinas ---
      gabaritoAlunoBoxRect = null;
      gabaritoQrBoxRect = null;
      gabaritoTitleBoxRect = null;
      gabaritoNumeracaoBoxRect = null;
      gabaritoDisciplinasBoxRect = null;
      gabaritoInfoBoxHandleRects = {};

      ctx.restore();

      var _avaliacaoTitle = getCurrentGabaritoAvaliacaoTitle();

      // Unique discipline IDs → unique names (deduplicate both id and name)
      var _discIds = {};
      (gabaritoQuestoesItens || []).forEach(function (item) {
        var did = String(item && item.disciplina || '').trim();
        if (did !== '') { _discIds[did] = true; }
      });
      var _discNomesRaw = Object.keys(_discIds).map(function (did) {
        var match = disciplinasOptions.filter(function (d) { return String(d.id) === did; });
        return match.length > 0 ? String(match[0].nome || did) : did;
      });
      // Deduplicate names
      var _discNomesSeen = {};
      var _discNomes = _discNomesRaw.filter(function (n) {
        if (_discNomesSeen[n]) { return false; }
        _discNomesSeen[n] = true;
        return true;
      });
      var _disciplinasLabel = _discNomes.length > 0 ? _discNomes.join(' · ') : 'Disciplinas';

      // --- Font sizes derived from box height so resize of boxes scales the text ---
      var _pad = 16;
      var _titleFontSize = Math.max(12, Math.min(72, Math.round((gabaritoLayout.title_box.height - _pad) * 0.85)));
      var _numDiscLines = Math.max(1, _discNomes.length);
      var _discLineH = Math.max(16, Math.floor((gabaritoLayout.disciplinas_box.height - _pad) / _numDiscLines));
      var _discFontSize = Math.max(8, Math.round(_discLineH * 0.75));

      var infoBoxDefs = [
        { key: 'aluno', box: gabaritoLayout.aluno_box, label: 'Dados do estudante e turma', color: '#8b949e' },
        { key: 'qr', box: gabaritoLayout.qr_box, label: 'QR Code', color: '#8b949e' },
        { key: 'title', box: gabaritoLayout.title_box, label: _avaliacaoTitle || 'Nome da avaliação', color: '#8b949e' },
        { key: 'numeracao', box: gabaritoLayout.numeracao_box, label: 'Nº 00', color: '#8b949e' },
        { key: 'disciplinas', box: gabaritoLayout.disciplinas_box, label: _disciplinasLabel, color: '#8b949e' },
      ];

      infoBoxDefs.forEach(function (def) {
        var b = def.box;
        if (!b) { return; }
        var selected = (gabaritoSelectionType === def.key);

        ctx.save();
        ctx.setLineDash(selected ? [] : [8, 6]);
        ctx.strokeStyle = selected ? '#0d6efd' : '#8b949e';
        ctx.lineWidth = selected ? 2 : 1.5;
        ctx.strokeRect(b.x, b.y, b.width, b.height);
        if (selected) {
          ctx.fillStyle = 'rgba(13,110,253,0.06)';
          ctx.fillRect(b.x, b.y, b.width, b.height);
        }
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.rect(b.x, b.y, b.width, b.height);
        ctx.clip();
        ctx.fillStyle = selected ? '#0d6efd' : '#1a1f24';
        var isTitle = (def.key === 'title');
        var isDisc = (def.key === 'disciplinas') && (_discNomes.length > 0);
        var fontSize = isTitle ? _titleFontSize : (isDisc ? _discFontSize : 13);
        ctx.font = (isTitle || isDisc ? 'bold ' : (selected ? 'bold ' : '')) + fontSize + 'px Arial, sans-serif';

        if (isDisc) {
          var startY = b.y + _discFontSize + Math.round(_pad / 2);
          _discNomes.forEach(function (nome, ni) {
            ctx.fillText('● ' + String(nome || '').toUpperCase(), b.x + _pad, startY + ni * _discLineH);
          });
        } else {
          var labelY = b.y + Math.round(b.height / 2) + Math.round(fontSize / 2) - 2;
          ctx.fillText(def.label, b.x + _pad, labelY);
        }
        ctx.restore();

        if (selected) {
          var hSize = 12;
          var hx = b.x + b.width - hSize;
          var hy = b.y + b.height - hSize;
          ctx.fillStyle = '#0d6efd';
          ctx.fillRect(hx, hy, hSize, hSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hx + 3, hy + 3, 2, 2);
          ctx.fillRect(hx + 7, hy + 7, 2, 2);
          gabaritoInfoBoxHandleRects[def.key] = { x: hx, y: hy, size: hSize };
        }

        var hitRect = { x: b.x, y: b.y, width: b.width, height: b.height };
        if (def.key === 'aluno') { gabaritoAlunoBoxRect = hitRect; }
        else if (def.key === 'qr') { gabaritoQrBoxRect = hitRect; }
        else if (def.key === 'title') { gabaritoTitleBoxRect = hitRect; }
        else if (def.key === 'numeracao') { gabaritoNumeracaoBoxRect = hitRect; }
        else if (def.key === 'disciplinas') { gabaritoDisciplinasBoxRect = hitRect; }
      });

      gabaritoScaleHandleRect = null;

      if (gabaritoTemplateImage && gabaritoTemplateImage.width > 0 && gabaritoTemplateImage.height > 0) {
        ensureGabaritoLayoutInBounds();

        if (gabaritoLayoutRect) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(
            gabaritoTemplateImage,
            gabaritoLayoutRect.x,
            gabaritoLayoutRect.y,
            gabaritoLayoutRect.width,
            gabaritoLayoutRect.height
          );

          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = '#0d6efd';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            gabaritoLayoutRect.x - 2,
            gabaritoLayoutRect.y - 2,
            gabaritoLayoutRect.width + 4,
            gabaritoLayoutRect.height + 4
          );
          ctx.setLineDash([]);

          var handleSize = 14;
          gabaritoScaleHandleRect = {
            x: gabaritoLayoutRect.x + gabaritoLayoutRect.width - handleSize,
            y: gabaritoLayoutRect.y + gabaritoLayoutRect.height - handleSize,
            size: handleSize,
          };

          ctx.fillStyle = '#0d6efd';
          ctx.fillRect(gabaritoScaleHandleRect.x, gabaritoScaleHandleRect.y, handleSize, handleSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(gabaritoScaleHandleRect.x + 4, gabaritoScaleHandleRect.y + 4, 2, 2);
          ctx.fillRect(gabaritoScaleHandleRect.x + 8, gabaritoScaleHandleRect.y + 8, 2, 2);
        }
      }

      syncGabaritoInput();
    }

    // ── end restored utility functions ───────────────────────────

    // ── restored functions from history (layout, gabarito, CRUD, etc.) ──

    function updateScaleUi() {
      var effectiveScaleX = gabaritoLayout.scaleX != null ? gabaritoLayout.scaleX : gabaritoLayout.scale;
      var effectiveScaleY = gabaritoLayout.scaleY != null ? gabaritoLayout.scaleY : gabaritoLayout.scale;
      var pX = Math.round(effectiveScaleX * 100);
      var pY = Math.round(effectiveScaleY * 100);
      if (gabaritoEscalaValor) {
        var msg = pX === pY
          ? 'Escala atual: ' + pX + '% — arraste a alça no canto inferior direito do template para redimensionar'
          : 'Escala atual: L ' + pX + '% × A ' + pY + '% — arraste a alça para redimensionar';
        gabaritoEscalaValor.textContent = msg;
      }
    }

    function reorderQuestionPositions(questionIndex, direction) {
      var fromIndex = clampInt(questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
      if (fromIndex < 0) {
        return;
      }

      var toIndex = direction === 'up' ? (fromIndex - 1) : (fromIndex + 1);
      if (toIndex < 0 || toIndex >= gabaritoQuestoesItens.length) {
        return;
      }

      pushLayoutHistorySnapshot();

      var tempItem = gabaritoQuestoesItens[fromIndex];
      gabaritoQuestoesItens[fromIndex] = gabaritoQuestoesItens[toIndex];
      gabaritoQuestoesItens[toIndex] = tempItem;

      if (!avaliacaoLayoutConfig.question_positions || typeof avaliacaoLayoutConfig.question_positions !== 'object') {
        avaliacaoLayoutConfig.question_positions = {};
      }

      if (!avaliacaoLayoutConfig.hidden_questions || typeof avaliacaoLayoutConfig.hidden_questions !== 'object') {
        avaliacaoLayoutConfig.hidden_questions = {};
      }

      var fromKey = String(fromIndex + 1);
      var toKey = String(toIndex + 1);

      var fromPos = Object.prototype.hasOwnProperty.call(avaliacaoLayoutConfig.question_positions, fromKey)
        ? avaliacaoLayoutConfig.question_positions[fromKey]
        : undefined;
      var toPos = Object.prototype.hasOwnProperty.call(avaliacaoLayoutConfig.question_positions, toKey)
        ? avaliacaoLayoutConfig.question_positions[toKey]
        : undefined;

      if (toPos === undefined) {
        delete avaliacaoLayoutConfig.question_positions[fromKey];
      } else {
        avaliacaoLayoutConfig.question_positions[fromKey] = toPos;
      }

      if (fromPos === undefined) {
        delete avaliacaoLayoutConfig.question_positions[toKey];
      } else {
        avaliacaoLayoutConfig.question_positions[toKey] = fromPos;
      }

      var fromHidden = Object.prototype.hasOwnProperty.call(avaliacaoLayoutConfig.hidden_questions, fromKey)
        ? Boolean(avaliacaoLayoutConfig.hidden_questions[fromKey])
        : undefined;
      var toHidden = Object.prototype.hasOwnProperty.call(avaliacaoLayoutConfig.hidden_questions, toKey)
        ? Boolean(avaliacaoLayoutConfig.hidden_questions[toKey])
        : undefined;

      if (toHidden === undefined) {
        delete avaliacaoLayoutConfig.hidden_questions[fromKey];
      } else {
        avaliacaoLayoutConfig.hidden_questions[fromKey] = toHidden;
      }

      if (fromHidden === undefined) {
        delete avaliacaoLayoutConfig.hidden_questions[toKey];
      } else {
        avaliacaoLayoutConfig.hidden_questions[toKey] = fromHidden;
      }

      if (avaliacaoLayoutSelection.type === 'question') {
        if (avaliacaoLayoutSelection.questionIndex === fromIndex) {
          avaliacaoLayoutSelection.questionIndex = toIndex;
        } else if (avaliacaoLayoutSelection.questionIndex === toIndex) {
          avaliacaoLayoutSelection.questionIndex = fromIndex;
        }
      }

      syncGabaritoFromQuestoesEditor(true);
    }

    function syncGabaritoFromQuestoesEditor(shouldRerenderEditor) {
      gabaritoQuestoesItens = sanitizeGabaritoQuestoesItens(gabaritoQuestoesItens, 1, 4, gabaritoRespostasCorretas);
      gabaritoRespostasCorretas = buildRespostasFromQuestoesItens(gabaritoQuestoesItens);

      if (!avaliacaoLayoutConfig.question_positions || typeof avaliacaoLayoutConfig.question_positions !== 'object') {
        avaliacaoLayoutConfig.question_positions = {};
      }

      var validPositionMap = {};
      Object.keys(avaliacaoLayoutConfig.question_positions).forEach(function (key) {
        var questionNumber = clampInt(key, 1, gabaritoQuestoesItens.length, 0);
        if (questionNumber <= 0) {
          return;
        }

        validPositionMap[String(questionNumber)] = avaliacaoLayoutConfig.question_positions[key];
      });
      avaliacaoLayoutConfig.question_positions = validPositionMap;

      if (!avaliacaoLayoutConfig.hidden_questions || typeof avaliacaoLayoutConfig.hidden_questions !== 'object') {
        avaliacaoLayoutConfig.hidden_questions = {};
      }

      var validHiddenMap = {};
      Object.keys(avaliacaoLayoutConfig.hidden_questions).forEach(function (key) {
        var questionNumber = clampInt(key, 1, gabaritoQuestoesItens.length, 0);
        if (questionNumber <= 0) {
          return;
        }

        validHiddenMap[String(questionNumber)] = Boolean(avaliacaoLayoutConfig.hidden_questions[key]);
      });
      avaliacaoLayoutConfig.hidden_questions = validHiddenMap;

      if (avaliacaoLayoutSelection.type === 'question' && avaliacaoLayoutSelection.questionIndex >= gabaritoQuestoesItens.length) {
        avaliacaoLayoutSelection.type = '';
        avaliacaoLayoutSelection.questionIndex = -1;
      }

      if (shouldRerenderEditor) {
        renderGabaritoQuestoesEditor();
      }

      renderGabaritoPreview();
      renderAvaliacaoLayoutEditor();
    }

    function getLayoutHistorySnapshot() {
      return sanitizeAvaliacaoLayoutConfig(JSON.parse(JSON.stringify(avaliacaoLayoutConfig || {})));
    }

    function updateLayoutHistoryButtons() {
      if (layoutUndoBtn) {
        layoutUndoBtn.disabled = layoutHistoryPast.length === 0;
      }

      if (layoutRedoBtn) {
        layoutRedoBtn.disabled = layoutHistoryFuture.length === 0;
      }
    }

    function pushLayoutHistorySnapshot() {
      if (layoutHistoryApplying) {
        return;
      }

      var snapshot = getLayoutHistorySnapshot();
      var signature = JSON.stringify(snapshot);
      var lastSnapshot = layoutHistoryPast.length ? layoutHistoryPast[layoutHistoryPast.length - 1] : null;
      var lastSignature = lastSnapshot ? JSON.stringify(lastSnapshot) : '';

      if (signature === lastSignature) {
        return;
      }

      layoutHistoryPast.push(snapshot);
      if (layoutHistoryPast.length > layoutHistoryMaxSteps) {
        layoutHistoryPast.shift();
      }

      layoutHistoryFuture = [];
      updateLayoutHistoryButtons();
    }

    function applyLayoutHistorySnapshot(snapshot) {
      layoutHistoryApplying = true;
      avaliacaoLayoutConfig = sanitizeAvaliacaoLayoutConfig(snapshot);
      layoutHistoryApplying = false;

      updateLayoutSpacingUi();
      if (layoutSpacingInput) {
        layoutSpacingInput.value = String(avaliacaoLayoutConfig.spacing);
      }
      if (layoutSnapGridInput) {
        layoutSnapGridInput.checked = avaliacaoLayoutConfig.snap_grid_enabled === true;
      }
      if (layoutGridSizeInput) {
        layoutGridSizeInput.value = String(clampInt(avaliacaoLayoutConfig.grid_size, 4, 80, 12));
      }

      renderAvaliacaoLayoutEditor();
      updateLayoutHistoryButtons();
    }

    function undoLayoutChange() {
      if (!layoutHistoryPast.length) {
        return;
      }

      var currentSnapshot = getLayoutHistorySnapshot();
      var previousSnapshot = layoutHistoryPast.pop();
      layoutHistoryFuture.push(currentSnapshot);
      applyLayoutHistorySnapshot(previousSnapshot);
    }

    function redoLayoutChange() {
      if (!layoutHistoryFuture.length) {
        return;
      }

      var currentSnapshot = getLayoutHistorySnapshot();
      var nextSnapshot = layoutHistoryFuture.pop();
      layoutHistoryPast.push(currentSnapshot);
      applyLayoutHistorySnapshot(nextSnapshot);
    }

    function nudgeLayoutQuestionPosition(questionIndex, direction) {
      var movedIndex = clampInt(questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
      if (movedIndex < 0) {
        return false;
      }

      var movedBlock = (Array.isArray(avaliacaoLayoutQuestionBlocks) ? avaliacaoLayoutQuestionBlocks : []).find(function (entry) {
        return clampInt(entry && entry.questionIndex, 0, 9999, -1) === movedIndex;
      });

      if (!movedBlock) {
        return false;
      }

      if (!avaliacaoLayoutConfig.question_positions || typeof avaliacaoLayoutConfig.question_positions !== 'object') {
        avaliacaoLayoutConfig.question_positions = {};
      }

      var spacing = clampInt(avaliacaoLayoutConfig.spacing, 8, 60, 18);
      var delta = direction === 'up' ? -spacing : spacing;
      if (delta === 0) {
        return false;
      }

      pushLayoutHistorySnapshot();

      var movedHeight = Math.max(1, clampFloat(movedBlock.height, 1, 99999, 1));
      var startAbsY = movedBlock.y;
      var desiredAbsY = startAbsY + delta;

      var resolvedPage = clampInt(movedBlock.page, 1, 999, 1);
      var resolvedRect = getLayoutPageGeometry(resolvedPage - 1);
      var guard = 0;
      while (guard < 120) {
        guard += 1;
        var maxAbsY = resolvedRect.contentY + Math.max(0, resolvedRect.contentHeight - movedHeight);
        if (desiredAbsY < resolvedRect.contentY && resolvedPage > 1) {
          resolvedPage -= 1;
          resolvedRect = getLayoutPageGeometry(resolvedPage - 1);
          desiredAbsY = resolvedRect.contentY + Math.max(0, resolvedRect.contentHeight - movedHeight);
          continue;
        }

        if (desiredAbsY > maxAbsY) {
          resolvedPage += 1;
          resolvedRect = getLayoutPageGeometry(resolvedPage - 1);
          desiredAbsY = resolvedRect.contentY;
          continue;
        }

        break;
      }

      var movedKey = String(movedIndex + 1);
      avaliacaoLayoutConfig.question_positions[movedKey] = {
        page: resolvedPage,
        x: clampFloat(movedBlock.x - resolvedRect.contentX, 0, Math.max(0, resolvedRect.contentWidth - 80), 0),
        y: clampFloat(desiredAbsY - resolvedRect.contentY, 0, Math.max(0, resolvedRect.contentHeight - movedHeight), 0),
      };

      if (direction === 'down') {
        var dragDeltaY = (resolvedRect.contentY + avaliacaoLayoutConfig.question_positions[movedKey].y) - startAbsY;
        if (dragDeltaY > 0.5) {
          var minNextAbsY = (resolvedRect.contentY + avaliacaoLayoutConfig.question_positions[movedKey].y) + movedHeight + spacing;
          var startBlocks = (Array.isArray(avaliacaoLayoutQuestionBlocks) ? avaliacaoLayoutQuestionBlocks : []).slice();

          startBlocks
            .filter(function (entry) {
              return clampInt(entry.questionIndex, 0, 9999, -1) > movedIndex;
            })
            .sort(function (left, right) {
              return clampInt(left.questionIndex, 0, 9999, 0) - clampInt(right.questionIndex, 0, 9999, 0);
            })
            .forEach(function (entry) {
              var followerIndex = clampInt(entry.questionIndex, 0, 9999, -1);
              if (followerIndex < 0) {
                return;
              }

              var followerHeight = Math.max(1, clampFloat(entry.height, 1, 99999, 1));
              var desiredFollowerAbsY = Math.max(entry.y + dragDeltaY, minNextAbsY);
              var followerPage = clampInt(entry.page, 1, 999, 1);
              var followerRect = getLayoutPageGeometry(followerPage - 1);
              var followerGuard = 0;

              while (followerGuard < 120) {
                followerGuard += 1;
                var followerMaxAbsY = followerRect.contentY + Math.max(0, followerRect.contentHeight - followerHeight);
                if (desiredFollowerAbsY <= followerMaxAbsY) {
                  break;
                }
                followerPage += 1;
                followerRect = getLayoutPageGeometry(followerPage - 1);
                desiredFollowerAbsY = Math.max(desiredFollowerAbsY, followerRect.contentY);
              }

              avaliacaoLayoutConfig.question_positions[String(followerIndex + 1)] = {
                page: followerPage,
                x: clampFloat(entry.x - followerRect.contentX, 0, Math.max(0, followerRect.contentWidth - 80), 0),
                y: clampFloat(desiredFollowerAbsY - followerRect.contentY, 0, Math.max(0, followerRect.contentHeight - followerHeight), 0),
              };

              minNextAbsY = (followerRect.contentY + avaliacaoLayoutConfig.question_positions[String(followerIndex + 1)].y) + followerHeight + spacing;
            });
        }
      }

      renderAvaliacaoLayoutEditor();
      return true;
    }

    function applyLayoutCanvasZoom() {
      if (!layoutEditorCanvas) {
        return;
      }

      var safeZoom = clampFloat(layoutCanvasZoom, 0.5, 2, 1);
      var scaledWidth = Math.max(1, Math.round(layoutEditorCanvas.width * safeZoom));
      var scaledHeight = Math.max(1, Math.round(layoutEditorCanvas.height * safeZoom));

      layoutEditorCanvas.style.width = String(scaledWidth) + 'px';
      layoutEditorCanvas.style.height = String(scaledHeight) + 'px';

      if (layoutZoomResetBtn) {
        layoutZoomResetBtn.textContent = String(Math.round(safeZoom * 100)) + '%';
      }
    }

    function applyGabaritoCanvasZoom() {
      if (!gabaritoA4EditorCanvas) {
        return;
      }

      var safeZoom = clampFloat(gabaritoCanvasZoom, 0.5, 2, 1);
      var scaledWidth = Math.max(1, Math.round(gabaritoA4EditorCanvas.width * safeZoom));
      var scaledHeight = Math.max(1, Math.round(gabaritoA4EditorCanvas.height * safeZoom));

      gabaritoA4EditorCanvas.style.width = String(scaledWidth) + 'px';
      gabaritoA4EditorCanvas.style.height = String(scaledHeight) + 'px';

      if (gabaritoZoomResetBtn) {
        gabaritoZoomResetBtn.textContent = String(Math.round(safeZoom * 100)) + '%';
      }
    }

    function updateGabaritoImageButtons() {
      var hasSelected = gabaritoSelectedImageId !== '' && getGabaritoImageById(gabaritoSelectedImageId) !== null;
      if (gabaritoImagemLayerDownBtn) { gabaritoImagemLayerDownBtn.disabled = !hasSelected; }
      if (gabaritoImagemLayerUpBtn) { gabaritoImagemLayerUpBtn.disabled = !hasSelected; }
      if (gabaritoImagemRotateLeftBtn) { gabaritoImagemRotateLeftBtn.disabled = !hasSelected; }
      if (gabaritoImagemRotateRightBtn) { gabaritoImagemRotateRightBtn.disabled = !hasSelected; }
      if (gabaritoImagemCropBtn) { gabaritoImagemCropBtn.disabled = !hasSelected; }
      if (gabaritoImagemCropResetBtn) { gabaritoImagemCropResetBtn.disabled = !hasSelected; }
      if (gabaritoImagemDeleteBtn) { gabaritoImagemDeleteBtn.disabled = !hasSelected; }
    }

    function estimateTextLines(text, maxChars) {
      var safeText = String(text || '').trim();
      if (safeText === '') {
        return 1;
      }

      var words = safeText.split(/\s+/).filter(Boolean);
      if (!words.length) {
        return 1;
      }

      var lines = 1;
      var currentLen = 0;
      words.forEach(function (word) {
        var piece = String(word || '');
        if (currentLen === 0) {
          currentLen = piece.length;
          return;
        }

        if ((currentLen + 1 + piece.length) > maxChars) {
          lines += 1;
          currentLen = piece.length;
        } else {
          currentLen += 1 + piece.length;
        }
      });

      return lines;
    }

    function estimateQuestionBlockHeight(item) {
      var enunciadoLines = estimateTextLines(richTextToPlainText(item && item.enunciado ? item.enunciado : 'Sem enunciado'), 70);
      var alternatives = Array.isArray(item && item.alternativas) ? item.alternativas : [];
      var alternativesLines = alternatives.reduce(function (sum, alternativa) {
        return sum + estimateTextLines(richTextToPlainText(alternativa || '-'), 48);
      }, 0);

      return 22 + (enunciadoLines * 18) + (alternativesLines * 16) + 14;
    }

    function getLayoutPageGeometry(pageIndex) {
      var pageGap = 34;
      var canvasWidth = layoutEditorCanvas ? layoutEditorCanvas.width : a4CanvasWidth;
      var pageWidth = a4CanvasWidth - 60;
      var pageX = Math.max(24, Math.round((canvasWidth - pageWidth) / 2));
      var pageY = 24 + (pageIndex * (a4CanvasHeight + pageGap));
      var pageHeight = a4CanvasHeight - 48;
      var contentPaddingX = 40;
      var contentPaddingY = 50;

      return {
        x: pageX,
        y: pageY,
        width: pageWidth,
        height: pageHeight,
        contentX: pageX + contentPaddingX,
        contentY: pageY + contentPaddingY,
        contentWidth: pageWidth - (contentPaddingX * 2),
        contentHeight: pageHeight - (contentPaddingY * 2),
      };
    }

    function normalizeLayoutImageRotation(value) {
      var normalized = clampFloat(value, -3600, 3600, 0) % 360;
      if (normalized > 180) {
        normalized -= 360;
      }
      if (normalized < -180) {
        normalized += 360;
      }
      return normalized;
    }

    function getLayoutImageCropRect(imageData) {
      var crop = imageData && imageData.crop && typeof imageData.crop === 'object'
        ? imageData.crop
        : {};

      var safeX = clampFloat(crop.x, 0, 0.95, 0);
      var safeY = clampFloat(crop.y, 0, 0.95, 0);
      var safeWidth = clampFloat(crop.width, 0.05, 1, 1);
      var safeHeight = clampFloat(crop.height, 0.05, 1, 1);

      if ((safeX + safeWidth) > 1) {
        safeWidth = Math.max(0.05, 1 - safeX);
      }
      if ((safeY + safeHeight) > 1) {
        safeHeight = Math.max(0.05, 1 - safeY);
      }

      return {
        x: safeX,
        y: safeY,
        width: safeWidth,
        height: safeHeight,
      };
    }

    function getRotatedRectBounds(centerX, centerY, width, height, rotationRad) {
      var halfWidth = width / 2;
      var halfHeight = height / 2;
      var cosValue = Math.cos(rotationRad);
      var sinValue = Math.sin(rotationRad);
      var corners = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight },
      ];

      var minX = Number.POSITIVE_INFINITY;
      var minY = Number.POSITIVE_INFINITY;
      var maxX = Number.NEGATIVE_INFINITY;
      var maxY = Number.NEGATIVE_INFINITY;

      corners.forEach(function (corner) {
        var rotatedX = (corner.x * cosValue) - (corner.y * sinValue);
        var rotatedY = (corner.x * sinValue) + (corner.y * cosValue);
        var absoluteX = centerX + rotatedX;
        var absoluteY = centerY + rotatedY;
        minX = Math.min(minX, absoluteX);
        minY = Math.min(minY, absoluteY);
        maxX = Math.max(maxX, absoluteX);
        maxY = Math.max(maxY, absoluteY);
      });

      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }

    function getLayoutImagePointerLocal(imageObject, pointer) {
      if (!imageObject || !imageObject.renderMeta) {
        return null;
      }

      var meta = imageObject.renderMeta;
      var deltaX = pointer.x - meta.centerX;
      var deltaY = pointer.y - meta.centerY;
      var cosValue = Math.cos(-meta.rotationRad);
      var sinValue = Math.sin(-meta.rotationRad);
      var localX = (deltaX * cosValue) - (deltaY * sinValue);
      var localY = (deltaX * sinValue) + (deltaY * cosValue);

      return {
        x: localX + (meta.width / 2),
        y: localY + (meta.height / 2),
      };
    }

    function isPointerInsideLayoutImage(imageObject, pointer) {
      var local = getLayoutImagePointerLocal(imageObject, pointer);
      if (!local || !imageObject.renderMeta) {
        return false;
      }

      var cropRect = getLayoutImageCropRect(imageObject.data);
      var cropMinX = cropRect.x * imageObject.renderMeta.width;
      var cropMinY = cropRect.y * imageObject.renderMeta.height;
      var cropMaxX = cropMinX + (cropRect.width * imageObject.renderMeta.width);
      var cropMaxY = cropMinY + (cropRect.height * imageObject.renderMeta.height);

      return local.x >= cropMinX
        && local.x <= cropMaxX
        && local.y >= cropMinY
        && local.y <= cropMaxY;
    }

    function findLayoutImageObjectById(imageId) {
      var safeId = String(imageId || '');
      if (safeId === '') {
        return null;
      }

      for (var index = 0; index < avaliacaoLayoutImageObjects.length; index += 1) {
        var obj = avaliacaoLayoutImageObjects[index];
        if (String(obj && obj.data && obj.data.id ? obj.data.id : '') === safeId) {
          return obj;
        }
      }

      return null;
    }

    function getLayoutImageCropPixelRect(imageObject) {
      if (!imageObject || !imageObject.renderMeta) {
        return null;
      }

      var crop = getLayoutImageCropRect(imageObject.data);
      var width = Math.max(1, clampFloat(imageObject.renderMeta.width, 1, 100000, 1));
      var height = Math.max(1, clampFloat(imageObject.renderMeta.height, 1, 100000, 1));
      var x = clampFloat(crop.x * width, 0, width - 1, 0);
      var y = clampFloat(crop.y * height, 0, height - 1, 0);
      var cropWidth = clampFloat(crop.width * width, 1, width, width);
      var cropHeight = clampFloat(crop.height * height, 1, height, height);

      if ((x + cropWidth) > width) {
        cropWidth = Math.max(1, width - x);
      }
      if ((y + cropHeight) > height) {
        cropHeight = Math.max(1, height - y);
      }

      return {
        x: x,
        y: y,
        width: cropWidth,
        height: cropHeight,
      };
    }

    function setLayoutImageCropFromPixels(imageData, renderMeta, cropPixels) {
      if (!imageData || !renderMeta || !cropPixels) {
        return;
      }

      var width = Math.max(1, clampFloat(renderMeta.width, 1, 100000, 1));
      var height = Math.max(1, clampFloat(renderMeta.height, 1, 100000, 1));
      var minWidth = Math.max(1, width * 0.05);
      var minHeight = Math.max(1, height * 0.05);

      var x = clampFloat(cropPixels.x, 0, width - 1, 0);
      var y = clampFloat(cropPixels.y, 0, height - 1, 0);
      var cropWidth = clampFloat(cropPixels.width, minWidth, width, width);
      var cropHeight = clampFloat(cropPixels.height, minHeight, height, height);

      if ((x + cropWidth) > width) {
        cropWidth = Math.max(minWidth, width - x);
      }
      if ((y + cropHeight) > height) {
        cropHeight = Math.max(minHeight, height - y);
      }

      imageData.crop = {
        x: clampFloat(x / width, 0, 0.95, 0),
        y: clampFloat(y / height, 0, 0.95, 0),
        width: clampFloat(cropWidth / width, 0.05, 1, 1),
        height: clampFloat(cropHeight / height, 0.05, 1, 1),
      };
    }

    function getCropHandleFromLocalPoint(cropPixels, localPoint) {
      if (!cropPixels || !localPoint) {
        return '';
      }

      var corners = [
        { key: 'nw', x: cropPixels.x, y: cropPixels.y, radius: 10 },
        { key: 'ne', x: cropPixels.x + cropPixels.width, y: cropPixels.y, radius: 10 },
        { key: 'sw', x: cropPixels.x, y: cropPixels.y + cropPixels.height, radius: 10 },
        { key: 'se', x: cropPixels.x + cropPixels.width, y: cropPixels.y + cropPixels.height, radius: 10 },
        { key: 'n', x: cropPixels.x + (cropPixels.width / 2), y: cropPixels.y, radius: 13 },
        { key: 'e', x: cropPixels.x + cropPixels.width, y: cropPixels.y + (cropPixels.height / 2), radius: 13 },
        { key: 's', x: cropPixels.x + (cropPixels.width / 2), y: cropPixels.y + cropPixels.height, radius: 13 },
        { key: 'w', x: cropPixels.x, y: cropPixels.y + (cropPixels.height / 2), radius: 13 },
      ];

      for (var index = 0; index < corners.length; index += 1) {
        var corner = corners[index];
        var distance = Math.sqrt(
          Math.pow(localPoint.x - corner.x, 2)
          + Math.pow(localPoint.y - corner.y, 2)
        );
        if (distance <= corner.radius) {
          return corner.key;
        }
      }

      return '';
    }

    function getImageResizeHandlesLocal(imageObject) {
      if (!imageObject || !imageObject.renderMeta) {
        return null;
      }

      var crop = getLayoutImageCropRect(imageObject.data);
      var drawWidth = Math.max(1, clampFloat(imageObject.renderMeta.width, 1, 100000, 1));
      var drawHeight = Math.max(1, clampFloat(imageObject.renderMeta.height, 1, 100000, 1));
      var cropLocalX = -(drawWidth / 2) + (crop.x * drawWidth);
      var cropLocalY = -(drawHeight / 2) + (crop.y * drawHeight);
      var cropLocalWidth = Math.max(12, crop.width * drawWidth);
      var cropLocalHeight = Math.max(12, crop.height * drawHeight);
      var handleThickness = 10;

      return {
        widthHandle: {
          x: cropLocalX + cropLocalWidth - Math.floor(handleThickness / 2),
          y: cropLocalY + Math.max(0, Math.round(cropLocalHeight * 0.2)),
          width: handleThickness,
          height: Math.max(22, Math.round(cropLocalHeight * 0.6)),
        },
        heightHandle: {
          x: cropLocalX + Math.max(0, Math.round(cropLocalWidth * 0.2)),
          y: cropLocalY + cropLocalHeight - Math.floor(handleThickness / 2),
          width: Math.max(22, Math.round(cropLocalWidth * 0.6)),
          height: handleThickness,
        },
      };
    }

    function getImageResizeHandleHit(pointer, imageObject) {
      if (!pointer || !imageObject) {
        return '';
      }

      var localPointer = getLayoutImagePointerLocal(imageObject, pointer);
      var handles = getImageResizeHandlesLocal(imageObject);
      if (!localPointer || !handles) {
        return '';
      }

      if (
        localPointer.x >= handles.widthHandle.x
        && localPointer.x <= (handles.widthHandle.x + handles.widthHandle.width)
        && localPointer.y >= handles.widthHandle.y
        && localPointer.y <= (handles.widthHandle.y + handles.widthHandle.height)
      ) {
        return 'width';
      }

      if (
        localPointer.x >= handles.heightHandle.x
        && localPointer.x <= (handles.heightHandle.x + handles.heightHandle.width)
        && localPointer.y >= handles.heightHandle.y
        && localPointer.y <= (handles.heightHandle.y + handles.heightHandle.height)
      ) {
        return 'height';
      }

      return '';
    }

    function findResizeHandleUnderPointer(pointer) {
      if (!pointer || !Array.isArray(avaliacaoLayoutImageObjects)) {
        return null;
      }

      for (var index = avaliacaoLayoutImageObjects.length - 1; index >= 0; index -= 1) {
        var obj = avaliacaoLayoutImageObjects[index];
        if (!obj || !obj.data || !obj.renderMeta) {
          continue;
        }

        var imageId = String(obj.data.id || '');
        var cropModeActive = String(avaliacaoLayoutCropModeImageId || '') === imageId;
        if (cropModeActive) {
          continue;
        }

        var axis = getImageResizeHandleHit(pointer, obj);
        if (!axis) {
          continue;
        }

        var localPointer = getLayoutImagePointerLocal(obj, pointer);
        if (!localPointer) {
          continue;
        }

        return {
          imageObject: obj,
          axis: axis,
          localPointer: localPointer,
        };
      }

      return null;
    }

    function getVisibleImageBoundsForPlacement(imageData, pageRect, targetX, targetY) {
      if (!imageData || !pageRect) {
        return null;
      }

      var drawWidth = clampFloat(imageData.width, 1, 100000, 1);
      var drawHeight = clampFloat(imageData.height, 1, 100000, 1);
      var rotationDeg = normalizeLayoutImageRotation(imageData.rotation);
      var rotationRad = rotationDeg * (Math.PI / 180);
      var cropRect = getLayoutImageCropRect(imageData);

      var drawX = pageRect.contentX + targetX;
      var drawY = pageRect.contentY + targetY;
      var centerX = drawX + (drawWidth / 2);
      var centerY = drawY + (drawHeight / 2);

      var cropLocalX = -(drawWidth / 2) + (cropRect.x * drawWidth);
      var cropLocalY = -(drawHeight / 2) + (cropRect.y * drawHeight);
      var cropLocalWidth = Math.max(1, cropRect.width * drawWidth);
      var cropLocalHeight = Math.max(1, cropRect.height * drawHeight);

      var cropCenterLocalX = cropLocalX + (cropLocalWidth / 2);
      var cropCenterLocalY = cropLocalY + (cropLocalHeight / 2);
      var cropCenterGlobalX = centerX + (cropCenterLocalX * Math.cos(rotationRad)) - (cropCenterLocalY * Math.sin(rotationRad));
      var cropCenterGlobalY = centerY + (cropCenterLocalX * Math.sin(rotationRad)) + (cropCenterLocalY * Math.cos(rotationRad));

      return getRotatedRectBounds(
        cropCenterGlobalX,
        cropCenterGlobalY,
        cropLocalWidth,
        cropLocalHeight,
        rotationRad
      );
    }

    function getCenterSnapOffset(pageRect, itemCenterX, tolerance) {
      if (!pageRect) {
        return 0;
      }

      var safeTolerance = clampFloat(tolerance, 1, 40, 6);
      var pageCenterX = pageRect.contentX + (pageRect.contentWidth / 2);
      var delta = pageCenterX - itemCenterX;
      if (Math.abs(delta) <= safeTolerance) {
        return delta;
      }

      return 0;
    }

    function isPointerInRect(pointer, rect) {
      if (!pointer || !rect) {
        return false;
      }

      return pointer.x >= rect.x
        && pointer.x <= (rect.x + rect.width)
        && pointer.y >= rect.y
        && pointer.y <= (rect.y + rect.height);
    }

    function isPointerInRectWithPadding(pointer, rect, padding) {
      if (!pointer || !rect) {
        return false;
      }

      var hitPadding = clampInt(padding, 0, 30, 0);
      return pointer.x >= (rect.x - hitPadding)
        && pointer.x <= (rect.x + rect.width + hitPadding)
        && pointer.y >= (rect.y - hitPadding)
        && pointer.y <= (rect.y + rect.height + hitPadding);
    }

    function isPointerInHandleWithPadding(pointer, handleRect, padding) {
      if (!pointer || !handleRect) {
        return false;
      }

      var hitPadding = clampInt(padding, 0, 40, 0);
      var size = clampFloat(handleRect.size, 1, 200, 1);
      return pointer.x >= (handleRect.x - hitPadding)
        && pointer.x <= (handleRect.x + size + hitPadding)
        && pointer.y >= (handleRect.y - hitPadding)
        && pointer.y <= (handleRect.y + size + hitPadding);
    }

    function getLayoutCanvasCursor(pointer) {
      if (!pointer) {
        return 'default';
      }

      if (
        isPointerInRectWithPadding(pointer, avaliacaoLayoutImageDeleteRect, 4)
        || isPointerInRectWithPadding(pointer, avaliacaoLayoutImageLayerUpRect, 4)
        || isPointerInRectWithPadding(pointer, avaliacaoLayoutImageLayerDownRect, 4)
        || isPointerInRectWithPadding(pointer, avaliacaoLayoutImageRotateLeftRect, 4)
        || isPointerInRectWithPadding(pointer, avaliacaoLayoutImageRotateRightRect, 4)
        || isPointerInRectWithPadding(pointer, avaliacaoLayoutImageCropRect, 4)
        || isPointerInRectWithPadding(pointer, avaliacaoLayoutImageCropResetRect, 4)
      ) {
        return 'pointer';
      }

      if (isPointerInRect(pointer, avaliacaoLayoutImageGrowWidthRect)) {
        return 'ew-resize';
      }

      if (isPointerInRect(pointer, avaliacaoLayoutImageGrowHeightRect)) {
        return 'ns-resize';
      }

      if (isPointerInRect(pointer, avaliacaoLayoutQuestionDeleteRect)) {
        return 'pointer';
      }

      var selectedQuestionIndex = clampInt(avaliacaoLayoutSelection.questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
      if (avaliacaoLayoutSelection.type === 'question' && selectedQuestionIndex >= 0) {
        for (var upIndex = 0; upIndex < avaliacaoLayoutQuestionMoveUpRects.length; upIndex += 1) {
          var upRect = avaliacaoLayoutQuestionMoveUpRects[upIndex];
          if (upRect.disabled !== true && clampInt(upRect.questionIndex, 0, 9999, -1) === selectedQuestionIndex && isPointerInRect(pointer, upRect)) {
            return 'pointer';
          }
        }

        for (var downIndex = 0; downIndex < avaliacaoLayoutQuestionMoveDownRects.length; downIndex += 1) {
          var downRect = avaliacaoLayoutQuestionMoveDownRects[downIndex];
          if (downRect.disabled !== true && clampInt(downRect.questionIndex, 0, 9999, -1) === selectedQuestionIndex && isPointerInRect(pointer, downRect)) {
            return 'pointer';
          }
        }
      }

      if (avaliacaoLayoutSelection.type === 'image') {
        var selectedImageForCornerHandle = findLayoutImageObjectById(avaliacaoLayoutSelection.imageId);
        var selectedCropMode = String(avaliacaoLayoutCropModeImageId || '') === String(avaliacaoLayoutSelection.imageId || '');
        if (!selectedCropMode && selectedImageForCornerHandle && selectedImageForCornerHandle.handleRect && isPointerInHandleWithPadding(pointer, selectedImageForCornerHandle.handleRect, 14)) {
          return 'nwse-resize';
        }
      }

      var image = findLayoutImageUnderPointer(pointer);
      var resizeHandleHit = findResizeHandleUnderPointer(pointer);
      if (resizeHandleHit) {
        return resizeHandleHit.axis === 'width' ? 'ew-resize' : 'ns-resize';
      }

      if (image) {
        var cropModeActiveForImage = String(avaliacaoLayoutCropModeImageId || '') === String(image.data && image.data.id ? image.data.id : '');
        if (!cropModeActiveForImage) {
          var resizeHit = getImageResizeHandleHit(pointer, image);
          if (resizeHit === 'width') {
            return 'ew-resize';
          }
          if (resizeHit === 'height') {
            return 'ns-resize';
          }
        }

        var localPoint = getLayoutImagePointerLocal(image, pointer);
        if (cropModeActiveForImage && localPoint && image.renderMeta) {
          var cropPixels = getLayoutImageCropPixelRect(image);
          var cropHandle = getCropHandleFromLocalPoint(cropPixels, localPoint);
          if (cropHandle === 'nw' || cropHandle === 'se') {
            return 'nwse-resize';
          }
          if (cropHandle === 'ne' || cropHandle === 'sw') {
            return 'nesw-resize';
          }
          if (cropHandle === 'n' || cropHandle === 's') {
            return 'ns-resize';
          }
          if (cropHandle === 'e' || cropHandle === 'w') {
            return 'ew-resize';
          }

          var insideCrop = cropPixels
            && localPoint.x >= cropPixels.x
            && localPoint.x <= (cropPixels.x + cropPixels.width)
            && localPoint.y >= cropPixels.y
            && localPoint.y <= (cropPixels.y + cropPixels.height);

          if (insideCrop) {
            return 'move';
          }

          return 'crosshair';
        }

        if (image.handleRect && isPointerInHandleWithPadding(pointer, image.handleRect, 14)) {
          return 'nwse-resize';
        }

        return 'move';
      }

      var question = findLayoutQuestionUnderPointer(pointer);
      if (question) {
        return 'move';
      }

      var backgroundHit = getLayoutBackgroundHit(pointer);
      if (backgroundHit && backgroundHit.object) {
        var backgroundCropModeActive = String(avaliacaoLayoutCropModeImageId || '') === '__background__';
        if (backgroundCropModeActive && backgroundHit.object.renderMeta) {
          var bgLocalPoint = getLayoutImagePointerLocal(backgroundHit.object, pointer);
          var bgCropPixels = getLayoutImageCropPixelRect(backgroundHit.object);
          var bgCropHandle = getCropHandleFromLocalPoint(bgCropPixels, bgLocalPoint);
          if (bgCropHandle === 'nw' || bgCropHandle === 'se') {
            return 'nwse-resize';
          }
          if (bgCropHandle === 'ne' || bgCropHandle === 'sw') {
            return 'nesw-resize';
          }
          if (bgCropHandle === 'n' || bgCropHandle === 's') {
            return 'ns-resize';
          }
          if (bgCropHandle === 'e' || bgCropHandle === 'w') {
            return 'ew-resize';
          }

          var insideBgCrop = bgCropPixels
            && bgLocalPoint
            && bgLocalPoint.x >= bgCropPixels.x
            && bgLocalPoint.x <= (bgCropPixels.x + bgCropPixels.width)
            && bgLocalPoint.y >= bgCropPixels.y
            && bgLocalPoint.y <= (bgCropPixels.y + bgCropPixels.height);

          if (insideBgCrop) {
            return 'move';
          }
        }

        if (backgroundHit.object.handleRect && isPointerInHandleWithPadding(pointer, backgroundHit.object.handleRect, 14)) {
          return 'nwse-resize';
        }

        return 'move';
      }

      return 'default';
    }

    function getLayoutBackgroundRectForPage(pageRect) {
      if (!avaliacaoLayoutBackgroundImage || !avaliacaoLayoutBackgroundImage.width || !avaliacaoLayoutBackgroundImage.height) {
        return null;
      }

      var baseWidth = pageRect.contentWidth;
      var ratio = avaliacaoLayoutBackgroundImage.height / avaliacaoLayoutBackgroundImage.width;
      var width = Math.max(80, baseWidth * avaliacaoLayoutConfig.background.scale);
      var height = width * ratio;

      return {
        x: pageRect.contentX + avaliacaoLayoutConfig.background.x,
        y: pageRect.contentY + avaliacaoLayoutConfig.background.y,
        width: width,
        height: height,
      };
    }

    function buildLayoutBackgroundObjectForPage(pageRect, pageIndex) {
      var bgRect = getLayoutBackgroundRectForPage(pageRect);
      if (!bgRect) {
        return null;
      }

      var backgroundData = avaliacaoLayoutConfig.background || {};
      var rotationDeg = normalizeLayoutImageRotation(backgroundData.rotation);
      var rotationRad = rotationDeg * (Math.PI / 180);
      var centerX = bgRect.x + (bgRect.width / 2);
      var centerY = bgRect.y + (bgRect.height / 2);
      var cropRect = getLayoutImageCropRect(backgroundData);
      var cropLocalX = -(bgRect.width / 2) + (cropRect.x * bgRect.width);
      var cropLocalY = -(bgRect.height / 2) + (cropRect.y * bgRect.height);
      var cropLocalWidth = Math.max(1, cropRect.width * bgRect.width);
      var cropLocalHeight = Math.max(1, cropRect.height * bgRect.height);
      var cropCenterLocalX = cropLocalX + (cropLocalWidth / 2);
      var cropCenterLocalY = cropLocalY + (cropLocalHeight / 2);
      var cropCenterGlobalX = centerX + (cropCenterLocalX * Math.cos(rotationRad)) - (cropCenterLocalY * Math.sin(rotationRad));
      var cropCenterGlobalY = centerY + (cropCenterLocalX * Math.sin(rotationRad)) + (cropCenterLocalY * Math.cos(rotationRad));
      var visibleBounds = getRotatedRectBounds(cropCenterGlobalX, cropCenterGlobalY, cropLocalWidth, cropLocalHeight, rotationRad);

      return {
        data: backgroundData,
        image: avaliacaoLayoutBackgroundImage,
        renderRect: {
          x: visibleBounds.x,
          y: visibleBounds.y,
          width: visibleBounds.width,
          height: visibleBounds.height,
        },
        renderMeta: {
          centerX: centerX,
          centerY: centerY,
          width: bgRect.width,
          height: bgRect.height,
          rotationRad: rotationRad,
          localX: bgRect.x,
          localY: bgRect.y,
          pageIndex: pageIndex,
        },
        handleRect: null,
      };
    }

    function updateLayoutSpacingUi() {
      if (!layoutSpacingValue) {
        return;
      }

      layoutSpacingValue.textContent = String(avaliacaoLayoutConfig.spacing) + ' px';
    }

    function applyGridSnap(value) {
      if (avaliacaoLayoutConfig.snap_grid_enabled !== true) {
        return value;
      }

      var grid = clampInt(avaliacaoLayoutConfig.grid_size, 4, 80, 12);
      return Math.round(value / grid) * grid;
    }

    function renderLayoutActionPanels() {
      return;
    }

    function renderWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
      var words = String(text || '').split(/\s+/).filter(Boolean);
      if (!words.length) {
        ctx.fillText('-', x, y);
        return y + lineHeight;
      }

      var currentLine = '';
      var cursorY = y;

      words.forEach(function (word, index) {
        var testLine = currentLine === '' ? word : (currentLine + ' ' + word);
        if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
          ctx.fillText(currentLine, x, cursorY);
          currentLine = word;
          cursorY += lineHeight;
        } else {
          currentLine = testLine;
        }

        if (index === words.length - 1) {
          ctx.fillText(currentLine, x, cursorY);
          cursorY += lineHeight;
        }
      });

      return cursorY;
    }

    function buildRichTextRuns(rawHtml) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = sanitizeRichTextHtml(rawHtml);
      var runs = [];

      function walk(node, inheritedStyle) {
        var baseStyle = {
          bold: Boolean(inheritedStyle.bold),
          italic: Boolean(inheritedStyle.italic),
          underline: Boolean(inheritedStyle.underline),
          color: inheritedStyle.color || '#212529',
        };

        if (node.nodeType === Node.TEXT_NODE) {
          var text = String(node.nodeValue || '');
          if (text !== '') {
            runs.push({
              text: text,
              bold: baseStyle.bold,
              italic: baseStyle.italic,
              underline: baseStyle.underline,
              color: baseStyle.color,
            });
          }
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        var style = {
          bold: baseStyle.bold,
          italic: baseStyle.italic,
          underline: baseStyle.underline,
          color: baseStyle.color,
        };

        var tag = String(node.tagName || '').toUpperCase();
        if (tag === 'B' || tag === 'STRONG') {
          style.bold = true;
        }
        if (tag === 'I' || tag === 'EM') {
          style.italic = true;
        }
        if (tag === 'U') {
          style.underline = true;
        }

        var nodeStyle = String(node.getAttribute && node.getAttribute('style') ? node.getAttribute('style') : '');
        var colorMatch = nodeStyle.match(/color\s*:\s*([^;]+)/i);
        if (colorMatch && colorMatch[1]) {
          style.color = colorMatch[1].trim();
        }

        if (/font-style\s*:\s*italic/i.test(nodeStyle)) {
          style.italic = true;
        }

        if (/text-decoration\s*:\s*[^;]*underline/i.test(nodeStyle) || /text-decoration-line\s*:\s*[^;]*underline/i.test(nodeStyle)) {
          style.underline = true;
        }

        if (tag === 'BR') {
          runs.push({ newline: true });
          return;
        }

        Array.from(node.childNodes || []).forEach(function (child) {
          walk(child, style);
        });
      }

      Array.from(wrapper.childNodes || []).forEach(function (child) {
        walk(child, {
          bold: false,
          italic: false,
          underline: false,
          color: '#212529',
        });
      });

      return runs;
    }

    function applyCanvasTextStyle(ctx, runStyle, fontSize) {
      var fontParts = [];
      if (runStyle.italic) {
        fontParts.push('italic');
      }
      if (runStyle.bold) {
        fontParts.push('700');
      }
      fontParts.push(String(fontSize) + 'px');
      fontParts.push('Arial, sans-serif');

      ctx.font = fontParts.join(' ');
      ctx.fillStyle = runStyle.color || '#212529';
    }

    function renderRichTextHtml(ctx, rawHtml, x, y, maxWidth, fontSize, lineHeight, prefix) {
      var runs = buildRichTextRuns(rawHtml);
      var hasAnyText = runs.some(function (run) {
        return !run.newline && String(run.text || '').trim() !== '';
      });

      if (!hasAnyText) {
        runs = [{ text: '-', bold: false, italic: false, underline: false, color: '#212529' }];
      }

      if (String(prefix || '') !== '') {
        runs.unshift({ text: String(prefix), bold: false, italic: false, underline: false, color: '#212529' });
      }

      var cursorX = x;
      var cursorY = y;

      function moveToNextLine() {
        cursorX = x;
        cursorY += lineHeight;
      }

      runs.forEach(function (run) {
        if (run.newline) {
          moveToNextLine();
          return;
        }

        var text = String(run.text || '');
        if (text === '') {
          return;
        }

        var pieces = text.split(/(\s+)/);
        pieces.forEach(function (piece) {
          if (piece === '') {
            return;
          }

          applyCanvasTextStyle(ctx, run, fontSize);
          var pieceWidth = ctx.measureText(piece).width;
          var isWhitespace = /^\s+$/.test(piece);

          if (!isWhitespace && (cursorX + pieceWidth) > (x + maxWidth) && cursorX > x) {
            moveToNextLine();
            applyCanvasTextStyle(ctx, run, fontSize);
          }

          if (isWhitespace && cursorX === x) {
            return;
          }

          if (!isWhitespace && pieceWidth > maxWidth) {
            var chars = piece.split('');
            chars.forEach(function (char) {
              applyCanvasTextStyle(ctx, run, fontSize);
              var charWidth = ctx.measureText(char).width;
              if ((cursorX + charWidth) > (x + maxWidth) && cursorX > x) {
                moveToNextLine();
                applyCanvasTextStyle(ctx, run, fontSize);
              }

              ctx.fillText(char, cursorX, cursorY);
              if (run.underline) {
                var underlineY = cursorY + 2;
                ctx.beginPath();
                ctx.strokeStyle = run.color || '#212529';
                ctx.lineWidth = 1;
                ctx.moveTo(cursorX, underlineY);
                ctx.lineTo(cursorX + charWidth, underlineY);
                ctx.stroke();
              }
              cursorX += charWidth;
            });

            return;
          }

          ctx.fillText(piece, cursorX, cursorY);
          if (run.underline && !isWhitespace) {
            var textY = cursorY + 2;
            ctx.beginPath();
            ctx.strokeStyle = run.color || '#212529';
            ctx.lineWidth = 1;
            ctx.moveTo(cursorX, textY);
            ctx.lineTo(cursorX + pieceWidth, textY);
            ctx.stroke();
          }
          cursorX += pieceWidth;
        });
      });

      return cursorY + lineHeight;
    }

    function buildImageSourceFallbacks(source) {
      var safeSource = String(source || '').trim();
      if (safeSource === '') {
        return [];
      }

      var match = safeSource.match(/^(.*?)(\.(?:jpeg|jpg|png|webp))(\?.*)?$/i);
      if (!match) {
        return [safeSource];
      }

      var base = match[1];
      var currentExt = String(match[2] || '').toLowerCase();
      var suffix = String(match[3] || '');
      var candidates = [safeSource];
      var preferredExtOrder = ['.jpeg', '.jpg', '.png', '.webp'];

      preferredExtOrder.forEach(function (ext) {
        if (ext === currentExt) {
          return;
        }

        candidates.push(base + ext + suffix);
      });

      return candidates.filter(function (value, index, arr) {
        return arr.indexOf(value) === index;
      });
    }

    function updateAssetReferenceWithResolvedSource(assetRef, resolvedSource) {
      if (!assetRef || typeof assetRef !== 'object') {
        return;
      }

      var source = String(resolvedSource || '').trim();
      if (source === '') {
        return;
      }

      var matchCb = source.match(/[?&]cb=([^&]+)/i);
      if (matchCb && matchCb[1]) {
        assetRef.cache_bust = decodeURIComponent(String(matchCb[1] || ''));
      }

      var sourceBase = source.split('?')[0] || source;

      if (/^https?:\/\//i.test(sourceBase)) {
        assetRef.url = sourceBase;
        assetRef.path = '';
        return;
      }

      assetRef.path = sourceBase.replace(/^\/+/, '');
      assetRef.url = '';
    }

    function ensureLayoutAssetsLoaded() {
      var backgroundSource = resolveBackgroundSource(avaliacaoLayoutConfig.background);
      if (backgroundSource !== '') {
        if (avaliacaoLayoutBackgroundImage.dataset.source !== backgroundSource) {
          var backgroundCandidates = buildImageSourceFallbacks(backgroundSource);
          var backgroundCandidateIndex = 0;

          avaliacaoLayoutBackgroundImage.dataset.source = backgroundCandidates[0] || backgroundSource;
          avaliacaoLayoutBackgroundImage.onload = function () {
            if (backgroundCandidates[backgroundCandidateIndex]) {
              updateAssetReferenceWithResolvedSource(avaliacaoLayoutConfig.background, backgroundCandidates[backgroundCandidateIndex]);
            }

            renderAvaliacaoLayoutEditor();
          };
          avaliacaoLayoutBackgroundImage.onerror = function () {
            backgroundCandidateIndex += 1;
            if (backgroundCandidateIndex < backgroundCandidates.length) {
              var nextBackgroundSource = backgroundCandidates[backgroundCandidateIndex];
              avaliacaoLayoutBackgroundImage.dataset.source = nextBackgroundSource;
              avaliacaoLayoutBackgroundImage.src = nextBackgroundSource;
              return;
            }

            if (!avaliacaoLayoutImageErrorNotified.__layoutBackgroundMissing) {
              avaliacaoLayoutImageErrorNotified.__layoutBackgroundMissing = true;
              showGlobalStatus('Plano de fundo do layout não foi encontrado (404). Reenvie a imagem para corrigir.', true);
            }

            avaliacaoLayoutConfig.background.path = '';
            avaliacaoLayoutConfig.background.url = '';
            avaliacaoLayoutBackgroundImage.removeAttribute('src');
            avaliacaoLayoutBackgroundImage.dataset.source = '';
            renderAvaliacaoLayoutEditor();
            scheduleBrokenLayoutAssetCleanupSave();
          };
          avaliacaoLayoutBackgroundImage.src = backgroundCandidates[0] || backgroundSource;
        }
      } else {
        avaliacaoLayoutBackgroundImage.removeAttribute('src');
        avaliacaoLayoutBackgroundImage.dataset.source = '';
      }

      var validCacheKeys = {};

      avaliacaoLayoutImageObjects = avaliacaoLayoutConfig.images.map(function (imageItem) {
        var source = resolveBackgroundSource(imageItem);
        var imageId = String(imageItem && imageItem.id ? imageItem.id : '');
        var cacheKey = imageId + '|' + source;
        validCacheKeys[cacheKey] = true;

        var cacheEntry = avaliacaoLayoutImageCache[cacheKey] || null;
        if (!cacheEntry) {
          var image = new Image();
          var sourceCandidates = buildImageSourceFallbacks(source);
          cacheEntry = {
            image: image,
            source: source,
            hasError: false,
            hasLoaded: false,
            candidates: sourceCandidates,
            candidateIndex: 0,
          };

          image.onload = function () {
            cacheEntry.hasLoaded = true;
            cacheEntry.hasError = false;

            if (cacheEntry.candidates[cacheEntry.candidateIndex]) {
              updateAssetReferenceWithResolvedSource(imageItem, cacheEntry.candidates[cacheEntry.candidateIndex]);
            }

            renderAvaliacaoLayoutEditor();
          };

          image.onerror = function () {
            cacheEntry.candidateIndex += 1;
            if (cacheEntry.candidateIndex < cacheEntry.candidates.length) {
              cacheEntry.image.src = cacheEntry.candidates[cacheEntry.candidateIndex];
              return;
            }

            cacheEntry.hasError = true;
            cacheEntry.hasLoaded = false;

            var notifyKey = imageId !== '' ? imageId : cacheKey;
            if (!avaliacaoLayoutImageErrorNotified[notifyKey]) {
              avaliacaoLayoutImageErrorNotified[notifyKey] = true;
              showGlobalStatus('Uma imagem do layout não foi encontrada (404). Ela foi marcada como inválida.', true);
            }

            imageItem.path = '';
            imageItem.url = '';
            renderAvaliacaoLayoutEditor();
            scheduleBrokenLayoutAssetCleanupSave();
          };

          if (source !== '') {
            image.src = sourceCandidates[0] || source;
          }

          avaliacaoLayoutImageCache[cacheKey] = cacheEntry;
        }

        return {
          data: imageItem,
          image: cacheEntry.image,
          renderRect: null,
          handleRect: null,
        };
      });

      Object.keys(avaliacaoLayoutImageCache).forEach(function (key) {
        if (!validCacheKeys[key]) {
          delete avaliacaoLayoutImageCache[key];
        }
      });
    }

    function layoutQuestionsForPages() {
      var items = sanitizeGabaritoQuestoesItens(gabaritoQuestoesItens, 1, 4, gabaritoRespostasCorretas);
      gabaritoQuestoesItens = items;

      var blocks = [];
      var pageIndex = 0;
      var pageRect = getLayoutPageGeometry(pageIndex);
      var yCursor = pageRect.contentY;
      var spacing = clampInt(avaliacaoLayoutConfig.spacing, 8, 60, 18);
      var lastQuestionAbsoluteBottom = -999999;

      for (var index = 0; index < items.length; index += 1) {
        var item = items[index];
        var questionKey = String(index + 1);
        if (avaliacaoLayoutConfig.hidden_questions && avaliacaoLayoutConfig.hidden_questions[questionKey] === true) {
          continue;
        }

        var blockHeight = estimateQuestionBlockHeight(item);
        var manualPosition = avaliacaoLayoutConfig.question_positions && avaliacaoLayoutConfig.question_positions[questionKey]
          ? avaliacaoLayoutConfig.question_positions[questionKey]
          : null;

        var canFit = false;
        var guard = 0;
        while (!canFit && guard < 15) {
          guard += 1;

          if (yCursor + blockHeight <= (pageRect.contentY + pageRect.contentHeight)) {
            canFit = true;
          } else {
            pageIndex += 1;
            pageRect = getLayoutPageGeometry(pageIndex);
            yCursor = pageRect.contentY;
          }
        }

        var defaultPage = pageIndex + 1;
        var finalPage = defaultPage;
        var finalX = pageRect.contentX;
        var finalY = yCursor;

        if (manualPosition && typeof manualPosition === 'object') {
          finalPage = clampInt(manualPosition.page, 1, 999, defaultPage);
          var manualPageRect = getLayoutPageGeometry(finalPage - 1);
          finalX = manualPageRect.contentX + clampFloat(manualPosition.x, 0, Math.max(0, manualPageRect.contentWidth - 80), 0);
          finalY = manualPageRect.contentY + clampFloat(manualPosition.y, 0, Math.max(0, manualPageRect.contentHeight - 24), 0);
        }

        var normalizedPage = finalPage;
        var normalizedRect = getLayoutPageGeometry(normalizedPage - 1);
        var normalizedAbsY = finalY;
        var minimumAbsY = lastQuestionAbsoluteBottom > -999998
          ? (lastQuestionAbsoluteBottom + spacing)
          : normalizedRect.contentY;

        if (normalizedAbsY < minimumAbsY) {
          normalizedAbsY = minimumAbsY;
        }

        var guardFit = 0;
        while (guardFit < 120) {
          guardFit += 1;
          normalizedRect = getLayoutPageGeometry(normalizedPage - 1);

          if (normalizedAbsY < normalizedRect.contentY) {
            normalizedAbsY = normalizedRect.contentY;
          }

          var maxAbsY = normalizedRect.contentY + Math.max(0, normalizedRect.contentHeight - blockHeight);
          if (normalizedAbsY <= maxAbsY) {
            break;
          }

          normalizedPage += 1;
          var nextRect = getLayoutPageGeometry(normalizedPage - 1);
          normalizedAbsY = Math.max(normalizedAbsY, nextRect.contentY);
        }

        finalPage = normalizedPage;
        finalY = normalizedAbsY;

        var finalPageRect = getLayoutPageGeometry(finalPage - 1);
        finalX = clampFloat(finalX, finalPageRect.contentX, finalPageRect.contentX + Math.max(0, finalPageRect.contentWidth - 80), finalPageRect.contentX);

        blocks.push({
          questionIndex: index,
          page: finalPage,
          x: finalX,
          y: finalY,
          width: finalPageRect.contentWidth,
          height: blockHeight,
        });

        lastQuestionAbsoluteBottom = finalY + blockHeight;

        yCursor += blockHeight + spacing;
      }

      var maxManualPage = 1;
      Object.keys(avaliacaoLayoutConfig.question_positions || {}).forEach(function (key) {
        var entry = avaliacaoLayoutConfig.question_positions[key];
        if (!entry || typeof entry !== 'object') {
          return;
        }

        maxManualPage = Math.max(maxManualPage, clampInt(entry.page, 1, 999, 1));
      });

      return {
        blocks: blocks,
        pageCount: Math.max(1, pageIndex + 1, maxManualPage),
      };
    }

    function getPointerOnLayoutCanvas(event) {
      if (!layoutEditorCanvas) {
        return null;
      }

      var rect = layoutEditorCanvas.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      return {
        x: ((event.clientX - rect.left) / rect.width) * layoutEditorCanvas.width,
        y: ((event.clientY - rect.top) / rect.height) * layoutEditorCanvas.height,
      };
    }

    function renderAvaliacaoLayoutEditor() {
      if (!layoutEditorCanvas) {
        return;
      }

      ensureLayoutAssetsLoaded();

      var layoutCanvasWidth = a4CanvasWidth;
      if (layoutEditorWrap && Number.isFinite(layoutEditorWrap.clientWidth) && layoutEditorWrap.clientWidth > 0) {
        layoutCanvasWidth = Math.max(a4CanvasWidth, layoutEditorWrap.clientWidth - 8);
      }
      if (layoutEditorCanvas.width !== layoutCanvasWidth) {
        layoutEditorCanvas.width = layoutCanvasWidth;
      }

      var layoutData = layoutQuestionsForPages();
      avaliacaoLayoutQuestionBlocks = layoutData.blocks;

      var pageCount = Math.max(1, layoutData.pageCount);
      var pageGap = 34;
      var requiredHeight = (pageCount * a4CanvasHeight) + ((pageCount - 1) * pageGap) + 48;
      if (layoutEditorCanvas.height !== requiredHeight) {
        layoutEditorCanvas.height = requiredHeight;
      }

      var ctx = layoutEditorCanvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.clearRect(0, 0, layoutEditorCanvas.width, layoutEditorCanvas.height);
      ctx.fillStyle = '#eef1f5';
      ctx.fillRect(0, 0, layoutEditorCanvas.width, layoutEditorCanvas.height);

      avaliacaoLayoutPageRects = [];
      for (var pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        var pageRect = getLayoutPageGeometry(pageIndex);
        avaliacaoLayoutPageRects.push(pageRect);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
        ctx.strokeStyle = '#cfd4da';
        ctx.lineWidth = 2;
        ctx.strokeRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);

        if (avaliacaoLayoutConfig.snap_grid_enabled === true) {
          var gridSize = clampInt(avaliacaoLayoutConfig.grid_size, 4, 80, 12);
          ctx.save();
          ctx.strokeStyle = 'rgba(173, 181, 189, 0.35)';
          ctx.lineWidth = 1;
          for (var gx = pageRect.contentX; gx <= (pageRect.contentX + pageRect.contentWidth); gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, pageRect.contentY);
            ctx.lineTo(gx, pageRect.contentY + pageRect.contentHeight);
            ctx.stroke();
          }

          for (var gy = pageRect.contentY; gy <= (pageRect.contentY + pageRect.contentHeight); gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(pageRect.contentX, gy);
            ctx.lineTo(pageRect.contentX + pageRect.contentWidth, gy);
            ctx.stroke();
          }
          ctx.restore();
        }

        var bgObject = buildLayoutBackgroundObjectForPage(pageRect, pageIndex);
        if (bgObject && bgObject.renderMeta && avaliacaoLayoutBackgroundImage && avaliacaoLayoutBackgroundImage.width > 0) {
          var bgMeta = bgObject.renderMeta;
          var bgCropRect = getLayoutImageCropRect(avaliacaoLayoutConfig.background);
          var bgCropLocalX = -(bgMeta.width / 2) + (bgCropRect.x * bgMeta.width);
          var bgCropLocalY = -(bgMeta.height / 2) + (bgCropRect.y * bgMeta.height);
          var bgCropLocalWidth = Math.max(1, bgCropRect.width * bgMeta.width);
          var bgCropLocalHeight = Math.max(1, bgCropRect.height * bgMeta.height);
          var bgCropModeActive = String(avaliacaoLayoutCropModeImageId || '') === '__background__';

          ctx.save();
          ctx.translate(bgMeta.centerX, bgMeta.centerY);
          ctx.rotate(bgMeta.rotationRad);
          ctx.save();
          ctx.beginPath();
          ctx.rect(bgCropLocalX, bgCropLocalY, bgCropLocalWidth, bgCropLocalHeight);
          ctx.clip();
          ctx.drawImage(
            avaliacaoLayoutBackgroundImage,
            -(bgMeta.width / 2),
            -(bgMeta.height / 2),
            bgMeta.width,
            bgMeta.height
          );
          ctx.restore();

          if (avaliacaoLayoutSelection.type === 'background' && pageIndex === 0) {
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = 'rgba(13, 110, 253, 0.48)';
            ctx.lineWidth = 2;
            ctx.strokeRect(bgCropLocalX, bgCropLocalY, bgCropLocalWidth, bgCropLocalHeight);
            ctx.setLineDash([]);

            if (bgCropModeActive) {
              var bgCropPx = getLayoutImageCropPixelRect(bgObject);
              if (bgCropPx) {
                var bgLocalLeft = -(bgMeta.width / 2);
                var bgLocalTop = -(bgMeta.height / 2);
                var bgCropLocalDrawX = bgLocalLeft + bgCropPx.x;
                var bgCropLocalDrawY = bgLocalTop + bgCropPx.y;

                ctx.fillStyle = 'rgba(33, 37, 41, 0.35)';
                ctx.fillRect(bgLocalLeft, bgLocalTop, bgMeta.width, bgCropPx.y);
                ctx.fillRect(bgLocalLeft, bgCropLocalDrawY, bgCropPx.x, bgCropPx.height);
                ctx.fillRect(bgCropLocalDrawX + bgCropPx.width, bgCropLocalDrawY, bgMeta.width - bgCropPx.x - bgCropPx.width, bgCropPx.height);
                ctx.fillRect(bgLocalLeft, bgCropLocalDrawY + bgCropPx.height, bgMeta.width, bgMeta.height - bgCropPx.y - bgCropPx.height);

                ctx.strokeStyle = '#ffc107';
                ctx.lineWidth = 2;
                ctx.strokeRect(bgCropLocalDrawX, bgCropLocalDrawY, bgCropPx.width, bgCropPx.height);

                var bgCropHandlePoints = [
                  { x: bgCropLocalDrawX, y: bgCropLocalDrawY, size: 10 },
                  { x: bgCropLocalDrawX + bgCropPx.width, y: bgCropLocalDrawY, size: 10 },
                  { x: bgCropLocalDrawX, y: bgCropLocalDrawY + bgCropPx.height, size: 10 },
                  { x: bgCropLocalDrawX + bgCropPx.width, y: bgCropLocalDrawY + bgCropPx.height, size: 10 },
                  { x: bgCropLocalDrawX + (bgCropPx.width / 2), y: bgCropLocalDrawY, size: 14 },
                  { x: bgCropLocalDrawX + bgCropPx.width, y: bgCropLocalDrawY + (bgCropPx.height / 2), size: 14 },
                  { x: bgCropLocalDrawX + (bgCropPx.width / 2), y: bgCropLocalDrawY + bgCropPx.height, size: 14 },
                  { x: bgCropLocalDrawX, y: bgCropLocalDrawY + (bgCropPx.height / 2), size: 14 },
                ];

                ctx.fillStyle = '#ffc107';
                bgCropHandlePoints.forEach(function (point) {
                  var half = point.size / 2;
                  ctx.fillRect(point.x - half, point.y - half, point.size, point.size);
                });
              }
            }
          }

          ctx.restore();

          if (avaliacaoLayoutSelection.type === 'background' && pageIndex === 0) {
            avaliacaoLayoutBackgroundActiveObject = {
              data: avaliacaoLayoutConfig.background,
              image: avaliacaoLayoutBackgroundImage,
              renderRect: bgObject.renderRect,
              renderMeta: bgMeta,
              handleRect: null,
            };

            var bgVisibleBounds = bgObject.renderRect;
            var bgDeleteSize = 24;
            var bgMinToolbarY = pageRect.y + 4;
            var bgMaxToolbarY = pageRect.y + pageRect.height - bgDeleteSize - 4;
            var bgToolbarY = clampFloat(bgVisibleBounds.y - bgDeleteSize - 6, bgMinToolbarY, bgMaxToolbarY, bgMinToolbarY);
            var bgMinToolbarX = pageRect.x + 4;
            var bgMaxToolbarX = pageRect.x + pageRect.width - bgDeleteSize - 4;
            var bgDeleteX = clampFloat(bgVisibleBounds.x + bgVisibleBounds.width - bgDeleteSize, bgMinToolbarX, bgMaxToolbarX, bgMinToolbarX);
            var btnSize = 24;
            var rotateRightX = bgDeleteX - (btnSize + 6);
            var rotateLeftX = rotateRightX - (btnSize + 6);
            var cropX = rotateLeftX - (btnSize + 6);
            var cropResetX = cropX - (btnSize + 6);

            avaliacaoLayoutImageLayerUpRect = null;
            avaliacaoLayoutImageLayerDownRect = null;

            avaliacaoLayoutImageRotateLeftRect = {
              x: rotateLeftX,
              y: bgToolbarY,
              width: btnSize,
              height: btnSize,
              imageId: '__background__',
            };

            avaliacaoLayoutImageRotateRightRect = {
              x: rotateRightX,
              y: bgToolbarY,
              width: btnSize,
              height: btnSize,
              imageId: '__background__',
            };

            avaliacaoLayoutImageCropRect = {
              x: cropX,
              y: bgToolbarY,
              width: btnSize,
              height: btnSize,
              imageId: '__background__',
            };

            avaliacaoLayoutImageCropResetRect = {
              x: cropResetX,
              y: bgToolbarY,
              width: btnSize,
              height: btnSize,
              imageId: '__background__',
            };

            avaliacaoLayoutImageDeleteRect = {
              x: bgDeleteX,
              y: bgToolbarY,
              width: bgDeleteSize,
              height: bgDeleteSize,
              imageId: '__background__',
            };

            if (!bgCropModeActive) {
              var bgCornerLocalX = bgCropLocalX + bgCropLocalWidth;
              var bgCornerLocalY = bgCropLocalY + bgCropLocalHeight;
              var bgCornerGlobalX = bgMeta.centerX + (bgCornerLocalX * Math.cos(bgMeta.rotationRad)) - (bgCornerLocalY * Math.sin(bgMeta.rotationRad));
              var bgCornerGlobalY = bgMeta.centerY + (bgCornerLocalX * Math.sin(bgMeta.rotationRad)) + (bgCornerLocalY * Math.cos(bgMeta.rotationRad));
              avaliacaoLayoutBackgroundActiveObject.handleRect = {
                x: bgCornerGlobalX - 6,
                y: bgCornerGlobalY - 6,
                size: 12,
              };
              ctx.fillStyle = '#0d6efd';
              ctx.fillRect(
                avaliacaoLayoutBackgroundActiveObject.handleRect.x,
                avaliacaoLayoutBackgroundActiveObject.handleRect.y,
                avaliacaoLayoutBackgroundActiveObject.handleRect.size,
                avaliacaoLayoutBackgroundActiveObject.handleRect.size
              );
            }
          }
        }

        ctx.fillStyle = '#6c757d';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText('Página ' + (pageIndex + 1), pageRect.x + 10, pageRect.y + 18);
      }

      avaliacaoLayoutImageDeleteRect = null;
      avaliacaoLayoutImageLayerUpRect = null;
      avaliacaoLayoutImageLayerDownRect = null;
      avaliacaoLayoutImageRotateLeftRect = null;
      avaliacaoLayoutImageRotateRightRect = null;
      avaliacaoLayoutImageCropRect = null;
      avaliacaoLayoutImageCropResetRect = null;
      avaliacaoLayoutImageGrowWidthRect = null;
      avaliacaoLayoutImageGrowHeightRect = null;
      avaliacaoLayoutBackgroundActiveObject = null;
      avaliacaoLayoutImageObjects.forEach(function (obj) {
        obj.renderRect = null;
        obj.handleRect = null;
        obj.renderMeta = null;

        var targetPageIndex = clampInt(obj.data.page, 1, 999, 1) - 1;
        var targetPage = avaliacaoLayoutPageRects[targetPageIndex];
        if (!targetPage) {
          return;
        }

        var drawX = targetPage.contentX + obj.data.x;
        var drawY = targetPage.contentY + obj.data.y;
        var drawWidth = obj.data.width;
        var drawHeight = obj.data.height;
        var rotationDeg = normalizeLayoutImageRotation(obj.data.rotation);
        var rotationRad = rotationDeg * (Math.PI / 180);
        var centerX = drawX + (drawWidth / 2);
        var centerY = drawY + (drawHeight / 2);
        var cropRect = getLayoutImageCropRect(obj.data);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationRad);

        if (obj.image && obj.image.width > 0) {
          var cropLocalX = -(drawWidth / 2) + (cropRect.x * drawWidth);
          var cropLocalY = -(drawHeight / 2) + (cropRect.y * drawHeight);
          var cropLocalWidth = Math.max(1, cropRect.width * drawWidth);
          var cropLocalHeight = Math.max(1, cropRect.height * drawHeight);
          var isFullCrop = cropRect.x <= 0.0001
            && cropRect.y <= 0.0001
            && Math.abs(cropRect.width - 1) <= 0.0001
            && Math.abs(cropRect.height - 1) <= 0.0001;

          if (!isFullCrop) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(cropLocalX, cropLocalY, cropLocalWidth, cropLocalHeight);
            ctx.clip();
          }

          ctx.drawImage(
            obj.image,
            -(drawWidth / 2),
            -(drawHeight / 2),
            drawWidth,
            drawHeight
          );

          if (!isFullCrop) {
            ctx.restore();
          }
        } else {
          ctx.fillStyle = '#dee2e6';
          ctx.fillRect(-(drawWidth / 2), -(drawHeight / 2), drawWidth, drawHeight);
          ctx.strokeStyle = '#adb5bd';
          ctx.strokeRect(-(drawWidth / 2), -(drawHeight / 2), drawWidth, drawHeight);
        }

        ctx.restore();

        var bounds = getRotatedRectBounds(centerX, centerY, drawWidth, drawHeight, rotationRad);

        obj.renderRect = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        };

        obj.renderMeta = {
          centerX: centerX,
          centerY: centerY,
          width: drawWidth,
          height: drawHeight,
          rotationRad: rotationRad,
          localX: drawX,
          localY: drawY,
        };

        if (avaliacaoLayoutSelection.type === 'image' && avaliacaoLayoutSelection.imageId === obj.data.id) {
          var selectedImageId = String(obj.data && obj.data.id ? obj.data.id : '');

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(rotationRad);

          var selectedCropLocalX = -(drawWidth / 2) + (cropRect.x * drawWidth);
          var selectedCropLocalY = -(drawHeight / 2) + (cropRect.y * drawHeight);
          var selectedCropLocalWidth = Math.max(1, cropRect.width * drawWidth);
          var selectedCropLocalHeight = Math.max(1, cropRect.height * drawHeight);

          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(13, 110, 253, 0.48)';
          ctx.lineWidth = 2;
          ctx.strokeRect(selectedCropLocalX, selectedCropLocalY, selectedCropLocalWidth, selectedCropLocalHeight);
          ctx.setLineDash([]);

          var cropModeActive = String(avaliacaoLayoutCropModeImageId || '') === selectedImageId;
          var selectedCropLocalX = -(drawWidth / 2) + (cropRect.x * drawWidth);
          var selectedCropLocalY = -(drawHeight / 2) + (cropRect.y * drawHeight);
          var selectedCropLocalWidth = Math.max(1, cropRect.width * drawWidth);
          var selectedCropLocalHeight = Math.max(1, cropRect.height * drawHeight);

          var cropCenterLocalX = selectedCropLocalX + (selectedCropLocalWidth / 2);
          var cropCenterLocalY = selectedCropLocalY + (selectedCropLocalHeight / 2);
          var cropCenterGlobalX = centerX + (cropCenterLocalX * Math.cos(rotationRad)) - (cropCenterLocalY * Math.sin(rotationRad));
          var cropCenterGlobalY = centerY + (cropCenterLocalX * Math.sin(rotationRad)) + (cropCenterLocalY * Math.cos(rotationRad));
          var visibleBounds = getRotatedRectBounds(
            cropCenterGlobalX,
            cropCenterGlobalY,
            selectedCropLocalWidth,
            selectedCropLocalHeight,
            rotationRad
          );
          if (cropModeActive) {
            var cropPx = getLayoutImageCropPixelRect(obj);
            if (cropPx) {
              var localLeft = -(drawWidth / 2);
              var localTop = -(drawHeight / 2);
              var cropLocalX = localLeft + cropPx.x;
              var cropLocalY = localTop + cropPx.y;

              ctx.fillStyle = 'rgba(33, 37, 41, 0.35)';
              ctx.fillRect(localLeft, localTop, drawWidth, cropPx.y);
              ctx.fillRect(localLeft, cropLocalY, cropPx.x, cropPx.height);
              ctx.fillRect(cropLocalX + cropPx.width, cropLocalY, drawWidth - cropPx.x - cropPx.width, cropPx.height);
              ctx.fillRect(localLeft, cropLocalY + cropPx.height, drawWidth, drawHeight - cropPx.y - cropPx.height);

              ctx.setLineDash([]);
              ctx.strokeStyle = '#ffc107';
              ctx.lineWidth = 2;
              ctx.strokeRect(cropLocalX, cropLocalY, cropPx.width, cropPx.height);

              var cropHandlePoints = [
                { x: cropLocalX, y: cropLocalY, size: 10 },
                { x: cropLocalX + cropPx.width, y: cropLocalY, size: 10 },
                { x: cropLocalX, y: cropLocalY + cropPx.height, size: 10 },
                { x: cropLocalX + cropPx.width, y: cropLocalY + cropPx.height, size: 10 },
                { x: cropLocalX + (cropPx.width / 2), y: cropLocalY, size: 14 },
                { x: cropLocalX + cropPx.width, y: cropLocalY + (cropPx.height / 2), size: 14 },
                { x: cropLocalX + (cropPx.width / 2), y: cropLocalY + cropPx.height, size: 14 },
                { x: cropLocalX, y: cropLocalY + (cropPx.height / 2), size: 14 },
              ];

              ctx.fillStyle = '#ffc107';
              cropHandlePoints.forEach(function (point) {
                var half = point.size / 2;
                ctx.fillRect(point.x - half, point.y - half, point.size, point.size);
              });
            }
          }

          ctx.restore();

          if (!cropModeActive) {
            var cornerLocalX = selectedCropLocalX + selectedCropLocalWidth;
            var cornerLocalY = selectedCropLocalY + selectedCropLocalHeight;
            var cornerGlobalX = centerX + (cornerLocalX * Math.cos(rotationRad)) - (cornerLocalY * Math.sin(rotationRad));
            var cornerGlobalY = centerY + (cornerLocalX * Math.sin(rotationRad)) + (cornerLocalY * Math.cos(rotationRad));

            obj.handleRect = {
              x: cornerGlobalX - 6,
              y: cornerGlobalY - 6,
              size: 12,
            };
            ctx.fillStyle = '#0d6efd';
            ctx.fillRect(obj.handleRect.x, obj.handleRect.y, obj.handleRect.size, obj.handleRect.size);
          }

          var imageDeleteSize = 24;
          var minToolbarY = targetPage.y + 4;
          var maxToolbarY = targetPage.y + targetPage.height - imageDeleteSize - 4;
          var imageDeleteY = clampFloat(visibleBounds.y - imageDeleteSize - 6, minToolbarY, maxToolbarY, minToolbarY);
          var minToolbarX = targetPage.x + 4;
          var maxToolbarX = targetPage.x + targetPage.width - imageDeleteSize - 4;
          var imageDeleteX = clampFloat(visibleBounds.x + visibleBounds.width - imageDeleteSize, minToolbarX, maxToolbarX, minToolbarX);
          var selectedImageIndex = (Array.isArray(avaliacaoLayoutConfig.images) ? avaliacaoLayoutConfig.images : []).findIndex(function (item) {
            return String(item && item.id ? item.id : '') === selectedImageId;
          });

          var layerBtnSize = 24;
          var layerDownX = imageDeleteX - (layerBtnSize + 6);
          var layerUpX = layerDownX - (layerBtnSize + 6);
          var rotateRightX = layerUpX - (layerBtnSize + 6);
          var rotateLeftX = rotateRightX - (layerBtnSize + 6);
          var cropX = rotateLeftX - (layerBtnSize + 6);
          var cropResetX = cropX - (layerBtnSize + 6);
          var layerY = imageDeleteY;
          var canLayerDown = selectedImageIndex > 0;
          var canLayerUp = selectedImageIndex >= 0 && selectedImageIndex < (avaliacaoLayoutConfig.images.length - 1);

          ctx.fillStyle = canLayerUp ? '#6c757d' : '#ced4da';
          ctx.fillRect(layerUpX, layerY, layerBtnSize, layerBtnSize);
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px Arial, sans-serif';
          ctx.fillText('↑', layerUpX + 8, layerY + 16);

          ctx.fillStyle = canLayerDown ? '#6c757d' : '#ced4da';
          ctx.fillRect(layerDownX, layerY, layerBtnSize, layerBtnSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('↓', layerDownX + 8, layerY + 16);

          ctx.fillStyle = '#6c757d';
          ctx.fillRect(rotateLeftX, layerY, layerBtnSize, layerBtnSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('↺', rotateLeftX + 5, layerY + 16);

          ctx.fillStyle = '#6c757d';
          ctx.fillRect(rotateRightX, layerY, layerBtnSize, layerBtnSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('↻', rotateRightX + 5, layerY + 16);

          ctx.fillStyle = String(avaliacaoLayoutCropModeImageId || '') === selectedImageId ? '#0d6efd' : '#6c757d';
          ctx.fillRect(cropX, layerY, layerBtnSize, layerBtnSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('✂', cropX + 6, layerY + 16);

          ctx.fillStyle = '#6c757d';
          ctx.fillRect(cropResetX, layerY, layerBtnSize, layerBtnSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('□', cropResetX + 7, layerY + 16);

          if (!cropModeActive) {
            var resizeHandles = getImageResizeHandlesLocal(obj);
            if (resizeHandles) {
              ctx.save();
              ctx.translate(centerX, centerY);
              ctx.rotate(rotationRad);
              ctx.fillStyle = 'rgba(13, 110, 253, 0.9)';
              ctx.fillRect(
                resizeHandles.widthHandle.x,
                resizeHandles.widthHandle.y,
                resizeHandles.widthHandle.width,
                resizeHandles.widthHandle.height
              );
              ctx.fillRect(
                resizeHandles.heightHandle.x,
                resizeHandles.heightHandle.y,
                resizeHandles.heightHandle.width,
                resizeHandles.heightHandle.height
              );
              ctx.restore();

              var widthGlobalAabb = getRotatedRectBounds(
                centerX + ((resizeHandles.widthHandle.x + (resizeHandles.widthHandle.width / 2)) * Math.cos(rotationRad)) - ((resizeHandles.widthHandle.y + (resizeHandles.widthHandle.height / 2)) * Math.sin(rotationRad)),
                centerY + ((resizeHandles.widthHandle.x + (resizeHandles.widthHandle.width / 2)) * Math.sin(rotationRad)) + ((resizeHandles.widthHandle.y + (resizeHandles.widthHandle.height / 2)) * Math.cos(rotationRad)),
                resizeHandles.widthHandle.width,
                resizeHandles.widthHandle.height,
                rotationRad
              );

              var heightGlobalAabb = getRotatedRectBounds(
                centerX + ((resizeHandles.heightHandle.x + (resizeHandles.heightHandle.width / 2)) * Math.cos(rotationRad)) - ((resizeHandles.heightHandle.y + (resizeHandles.heightHandle.height / 2)) * Math.sin(rotationRad)),
                centerY + ((resizeHandles.heightHandle.x + (resizeHandles.heightHandle.width / 2)) * Math.sin(rotationRad)) + ((resizeHandles.heightHandle.y + (resizeHandles.heightHandle.height / 2)) * Math.cos(rotationRad)),
                resizeHandles.heightHandle.width,
                resizeHandles.heightHandle.height,
                rotationRad
              );

              avaliacaoLayoutImageGrowWidthRect = {
                x: widthGlobalAabb.x,
                y: widthGlobalAabb.y,
                width: widthGlobalAabb.width,
                height: widthGlobalAabb.height,
                imageId: selectedImageId,
              };

              avaliacaoLayoutImageGrowHeightRect = {
                x: heightGlobalAabb.x,
                y: heightGlobalAabb.y,
                width: heightGlobalAabb.width,
                height: heightGlobalAabb.height,
                imageId: selectedImageId,
              };
            }
          }

          ctx.fillStyle = '#dc3545';
          ctx.fillRect(imageDeleteX, imageDeleteY, imageDeleteSize, imageDeleteSize);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Arial, sans-serif';
          ctx.fillText('×', imageDeleteX + 7, imageDeleteY + 17);
          ctx.font = '11px Arial, sans-serif';
          ctx.fillStyle = '#dc3545';
          ctx.fillText('Excluir', imageDeleteX - 2, imageDeleteY - 4);

          avaliacaoLayoutImageDeleteRect = {
            x: imageDeleteX,
            y: imageDeleteY,
            width: imageDeleteSize,
            height: imageDeleteSize,
            imageId: String(obj.data.id || ''),
          };

          avaliacaoLayoutImageLayerUpRect = {
            x: layerUpX,
            y: layerY,
            width: layerBtnSize,
            height: layerBtnSize,
            imageId: selectedImageId,
            disabled: !canLayerUp,
          };

          avaliacaoLayoutImageLayerDownRect = {
            x: layerDownX,
            y: layerY,
            width: layerBtnSize,
            height: layerBtnSize,
            imageId: selectedImageId,
            disabled: !canLayerDown,
          };

          avaliacaoLayoutImageRotateLeftRect = {
            x: rotateLeftX,
            y: layerY,
            width: layerBtnSize,
            height: layerBtnSize,
            imageId: selectedImageId,
          };

          avaliacaoLayoutImageRotateRightRect = {
            x: rotateRightX,
            y: layerY,
            width: layerBtnSize,
            height: layerBtnSize,
            imageId: selectedImageId,
          };

          avaliacaoLayoutImageCropRect = {
            x: cropX,
            y: layerY,
            width: layerBtnSize,
            height: layerBtnSize,
            imageId: selectedImageId,
          };

          avaliacaoLayoutImageCropResetRect = {
            x: cropResetX,
            y: layerY,
            width: layerBtnSize,
            height: layerBtnSize,
            imageId: selectedImageId,
          };

        }
      });

      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#212529';
      avaliacaoLayoutQuestionDeleteRect = null;
      avaliacaoLayoutQuestionMoveUpRects = [];
      avaliacaoLayoutQuestionMoveDownRects = [];
      avaliacaoLayoutQuestionBlocks.forEach(function (block) {
        var pageRect = avaliacaoLayoutPageRects[block.page - 1];
        if (!pageRect) {
          return;
        }

        var item = gabaritoQuestoesItens[block.questionIndex] || createDefaultQuestaoItem(4);
        var cursorY = block.y;
        cursorY = renderRichTextHtml(
          ctx,
          item.enunciado || '',
          block.x,
          cursorY,
          block.width,
          14,
          18,
          String(block.questionIndex + 1) + ') '
        );

        (item.alternativas || []).forEach(function (alternativa, altIndex) {
          cursorY = renderRichTextHtml(
            ctx,
            alternativa || '',
            block.x + 14,
            cursorY,
            block.width - 14,
            13,
            16,
            getAlternativeLetter(altIndex) + ') '
          );
        });

        if (avaliacaoLayoutSelection.type === 'question' && avaliacaoLayoutSelection.questionIndex === block.questionIndex) {
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(25, 135, 84, 0.5)';
          ctx.lineWidth = 2;
          ctx.strokeRect(block.x - 6, block.y - 6, block.width + 12, block.height + 12);
          ctx.setLineDash([]);

          var deleteSize = 24;
          var deleteX = block.x + block.width - deleteSize;
          var deleteY = block.y - deleteSize - 6;
          ctx.fillStyle = '#dc3545';
          ctx.fillRect(deleteX, deleteY, deleteSize, deleteSize);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Arial, sans-serif';
          ctx.fillText('×', deleteX + 7, deleteY + 17);
          ctx.font = '11px Arial, sans-serif';
          ctx.fillStyle = '#dc3545';
          ctx.fillText('Excluir', deleteX - 2, deleteY - 4);
          ctx.font = '14px Arial, sans-serif';

          avaliacaoLayoutQuestionDeleteRect = {
            x: deleteX,
            y: deleteY,
            width: deleteSize,
            height: deleteSize,
            questionIndex: block.questionIndex,
          };
        }

        var moveBtnSize = 22;
        var moveGap = 4;
        var moveUpX = block.x + block.width - (moveBtnSize * 2) - moveGap;
        var moveDownX = moveUpX + moveBtnSize + moveGap;
        var moveY = block.y + 2;
        var isFirstQuestion = block.questionIndex <= 0;
        var isLastQuestion = block.questionIndex >= (gabaritoQuestoesItens.length - 1);

        ctx.fillStyle = isFirstQuestion ? '#ced4da' : '#6c757d';
        ctx.fillRect(moveUpX, moveY, moveBtnSize, moveBtnSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px Arial, sans-serif';
        ctx.fillText('↑', moveUpX + 7, moveY + 15);

        ctx.fillStyle = isLastQuestion ? '#ced4da' : '#6c757d';
        ctx.fillRect(moveDownX, moveY, moveBtnSize, moveBtnSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('↓', moveDownX + 7, moveY + 15);

        avaliacaoLayoutQuestionMoveUpRects.push({
          x: moveUpX,
          y: moveY,
          width: moveBtnSize,
          height: moveBtnSize,
          questionIndex: block.questionIndex,
          disabled: isFirstQuestion,
        });

        avaliacaoLayoutQuestionMoveDownRects.push({
          x: moveDownX,
          y: moveY,
          width: moveBtnSize,
          height: moveBtnSize,
          questionIndex: block.questionIndex,
          disabled: isLastQuestion,
        });

        ctx.font = '14px Arial, sans-serif';
      });

      var centerGuide = null;
      var centerGuideTolerance = 4;
      if (avaliacaoLayoutDrag.active && avaliacaoLayoutDrag.mode === 'move-question') {
        var movingQuestionIndex = clampInt(avaliacaoLayoutDrag.questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
        if (movingQuestionIndex >= 0) {
          var movingBlock = (Array.isArray(avaliacaoLayoutQuestionBlocks) ? avaliacaoLayoutQuestionBlocks : []).find(function (entry) {
            return clampInt(entry && entry.questionIndex, 0, 9999, -1) === movingQuestionIndex;
          });

          if (movingBlock) {
            var movingPageRect = avaliacaoLayoutPageRects[clampInt(movingBlock.page, 1, 999, 1) - 1] || null;
            if (movingPageRect) {
              var questionCenterX = movingBlock.x + (movingBlock.width / 2);
              var pageCenterX = movingPageRect.contentX + (movingPageRect.contentWidth / 2);
              if (Math.abs(questionCenterX - pageCenterX) <= centerGuideTolerance) {
                centerGuide = {
                  x: pageCenterX,
                  top: movingPageRect.contentY,
                  bottom: movingPageRect.contentY + movingPageRect.contentHeight,
                };
              }
            }
          }
        }
      } else if (avaliacaoLayoutDrag.active && avaliacaoLayoutDrag.mode === 'move-image') {
        var movingImageId = String(avaliacaoLayoutDrag.imageId || '');
        if (movingImageId !== '') {
          var movingImage = (Array.isArray(avaliacaoLayoutConfig.images) ? avaliacaoLayoutConfig.images : []).find(function (item) {
            return String(item && item.id ? item.id : '') === movingImageId;
          });

          if (movingImage) {
            var movingImagePage = clampInt(movingImage.page, 1, 999, 1) - 1;
            var movingImagePageRect = avaliacaoLayoutPageRects[movingImagePage] || null;
            if (movingImagePageRect) {
              var visibleImageBounds = getVisibleImageBoundsForPlacement(movingImage, movingImagePageRect, movingImage.x, movingImage.y);
              if (visibleImageBounds) {
                var imageCenterX = visibleImageBounds.x + (visibleImageBounds.width / 2);
                var imagePageCenterX = movingImagePageRect.contentX + (movingImagePageRect.contentWidth / 2);
                if (Math.abs(imageCenterX - imagePageCenterX) <= centerGuideTolerance) {
                  centerGuide = {
                    x: imagePageCenterX,
                    top: movingImagePageRect.contentY,
                    bottom: movingImagePageRect.contentY + movingImagePageRect.contentHeight,
                  };
                }
              }
            }
          }
        }
      }

      if (centerGuide) {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = 'rgba(142, 68, 173, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerGuide.x, centerGuide.top);
        ctx.lineTo(centerGuide.x, centerGuide.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      if (avaliacaoLayoutImageRotateLeftRect && avaliacaoLayoutImageRotateRightRect && avaliacaoLayoutImageCropRect && avaliacaoLayoutImageCropResetRect && avaliacaoLayoutImageDeleteRect) {
        var overlayButtons = [
          {
            rect: avaliacaoLayoutImageLayerUpRect,
            label: '↑',
            bg: avaliacaoLayoutImageLayerUpRect && avaliacaoLayoutImageLayerUpRect.disabled === true ? '#ced4da' : '#6c757d',
          },
          {
            rect: avaliacaoLayoutImageLayerDownRect,
            label: '↓',
            bg: avaliacaoLayoutImageLayerDownRect && avaliacaoLayoutImageLayerDownRect.disabled === true ? '#ced4da' : '#6c757d',
          },
          { rect: avaliacaoLayoutImageRotateLeftRect, label: '↺', bg: '#6c757d' },
          { rect: avaliacaoLayoutImageRotateRightRect, label: '↻', bg: '#6c757d' },
          {
            rect: avaliacaoLayoutImageCropRect,
            label: '✂',
            bg: String(avaliacaoLayoutCropModeImageId || '') === String(avaliacaoLayoutSelection.imageId || '') ? '#0d6efd' : '#6c757d',
          },
          { rect: avaliacaoLayoutImageCropResetRect, label: '□', bg: '#6c757d' },
        ];

        ctx.save();
        overlayButtons.forEach(function (item) {
          if (!item.rect) {
            return;
          }

          ctx.fillStyle = item.bg;
          ctx.fillRect(item.rect.x, item.rect.y, item.rect.width, item.rect.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px Arial, sans-serif';
          ctx.fillText(item.label, item.rect.x + 8, item.rect.y + 16);
        });

        ctx.fillStyle = '#dc3545';
        ctx.fillRect(
          avaliacaoLayoutImageDeleteRect.x,
          avaliacaoLayoutImageDeleteRect.y,
          avaliacaoLayoutImageDeleteRect.width,
          avaliacaoLayoutImageDeleteRect.height
        );
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('×', avaliacaoLayoutImageDeleteRect.x + 7, avaliacaoLayoutImageDeleteRect.y + 17);
        ctx.font = '11px Arial, sans-serif';
        ctx.fillStyle = '#dc3545';
        ctx.fillText('Excluir', avaliacaoLayoutImageDeleteRect.x - 2, avaliacaoLayoutImageDeleteRect.y - 4);
        ctx.restore();
      }

      if (layoutPagesInfo) {
        layoutPagesInfo.textContent = 'Páginas: ' + pageCount;
      }

      applyLayoutCanvasZoom();

      if (layoutHint) {
        layoutHint.textContent = 'Arraste questões, imagens e plano de fundo livremente. Na imagem selecionada, use ✂ para recorte visual (alças amarelas), ↺/↻ para rotação, arraste a alça lateral para largura, a alça inferior para altura, □ para limpar recorte e × para excluir.';
      }

      renderLayoutActionPanels();

      syncGabaritoInput();
    }

    function scheduleLayoutCanvasReflow() {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          syncLayoutEditorWrapHeight();
          syncQuestoesListContainerHeight();
          renderAvaliacaoLayoutEditor();
        });
      });
    }

    function syncQuestoesListContainerHeight() {
      if (!questoesListContainer) {
        return;
      }

      var questoesPane = document.getElementById('adminAvaliacaoDashboardPaneQuestoes');
      if (!(questoesPane instanceof HTMLElement)) {
        return;
      }

      if (!questoesPane.classList.contains('active')) {
        return;
      }

      var paneRect = questoesPane.getBoundingClientRect();
      var listRect = questoesListContainer.getBoundingClientRect();
      var availableHeight = Math.floor(paneRect.bottom - listRect.top - 10);

      if (!Number.isFinite(availableHeight)) {
        return;
      }

      var safeHeight = Math.max(220, availableHeight);
      questoesListContainer.style.height = String(safeHeight) + 'px';
      questoesListContainer.style.maxHeight = String(safeHeight) + 'px';
    }

    function syncLayoutEditorWrapHeight() {
      if (!layoutEditorWrap) {
        return;
      }

      var modalBody = dashboardModalElement
        ? dashboardModalElement.querySelector('.modal-body')
        : null;

      if (!(modalBody instanceof HTMLElement)) {
        return;
      }

      var modalBodyRect = modalBody.getBoundingClientRect();
      var wrapRect = layoutEditorWrap.getBoundingClientRect();
      var availableHeight = Math.floor(modalBodyRect.bottom - wrapRect.top - 12);

      if (!Number.isFinite(availableHeight)) {
        return;
      }

      var safeHeight = Math.max(320, availableHeight);
      layoutEditorWrap.style.height = String(safeHeight) + 'px';
      layoutEditorWrap.style.maxHeight = String(safeHeight) + 'px';
    }

    function findLayoutImageUnderPointer(pointer) {
      for (var index = avaliacaoLayoutImageObjects.length - 1; index >= 0; index -= 1) {
        var obj = avaliacaoLayoutImageObjects[index];
        if (!obj.renderRect || !obj.renderMeta) {
          continue;
        }

        if (isPointerInsideLayoutImage(obj, pointer)) {
          return obj;
        }
      }

      return null;
    }

    function findLayoutQuestionUnderPointer(pointer) {
      var hitPadding = 4;
      var matches = [];

      for (var index = avaliacaoLayoutQuestionBlocks.length - 1; index >= 0; index -= 1) {
        var block = avaliacaoLayoutQuestionBlocks[index];
        var inside = pointer.x >= (block.x - hitPadding)
          && pointer.x <= (block.x + block.width + hitPadding)
          && pointer.y >= (block.y - hitPadding)
          && pointer.y <= (block.y + block.height + hitPadding);

        if (inside) {
          matches.push(block);
        }
      }

      if (!matches.length) {
        return null;
      }

      if (avaliacaoLayoutSelection.type === 'question') {
        var selectedMatch = matches.find(function (entry) {
          return clampInt(entry && entry.questionIndex, 0, 9999, -1) === clampInt(avaliacaoLayoutSelection.questionIndex, 0, 9999, -2);
        });
        if (selectedMatch) {
          return selectedMatch;
        }
      }

      matches.sort(function (left, right) {
        var leftDistance = Math.abs(pointer.y - clampFloat(left && left.y, -99999, 99999, 0));
        var rightDistance = Math.abs(pointer.y - clampFloat(right && right.y, -99999, 99999, 0));
        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }

        return clampInt(left && left.questionIndex, 0, 9999, 0) - clampInt(right && right.questionIndex, 0, 9999, 0);
      });

      return matches[0] || null;
    }

    function getLayoutBackgroundHit(pointer) {
      for (var index = 0; index < avaliacaoLayoutPageRects.length; index += 1) {
        var pageRect = avaliacaoLayoutPageRects[index];
        var bgObject = buildLayoutBackgroundObjectForPage(pageRect, index);
        if (!bgObject || !bgObject.renderRect || !bgObject.renderMeta) {
          continue;
        }

        if (isPointerInsideLayoutImage(bgObject, pointer)) {
          return {
            pageIndex: index,
            rect: bgObject.renderRect,
            object: bgObject,
          };
        }
      }

      return null;
    }

    function removeSelectedLayoutImage() {
      if (avaliacaoLayoutSelection.type === 'background') {
        var hasBackgroundToRemove = String(avaliacaoLayoutConfig.background && avaliacaoLayoutConfig.background.path || '').trim() !== ''
          || String(avaliacaoLayoutConfig.background && avaliacaoLayoutConfig.background.url || '').trim() !== '';
        if (!hasBackgroundToRemove) {
          return false;
        }

        pushLayoutHistorySnapshot();
        avaliacaoLayoutConfig.background.path = '';
        avaliacaoLayoutConfig.background.url = '';
        avaliacaoLayoutConfig.background.cache_bust = '';
        avaliacaoLayoutConfig.background.x = 0;
        avaliacaoLayoutConfig.background.y = 0;
        avaliacaoLayoutConfig.background.scale = 1;
        avaliacaoLayoutConfig.background.rotation = 0;
        avaliacaoLayoutConfig.background.crop = { x: 0, y: 0, width: 1, height: 1 };
        avaliacaoLayoutCropModeImageId = '';
        renderAvaliacaoLayoutEditor();
        return true;
      }

      var deleteImageId = String(avaliacaoLayoutSelection.imageId || '');
      if (deleteImageId === '') {
        return false;
      }

      var previousLength = Array.isArray(avaliacaoLayoutConfig.images) ? avaliacaoLayoutConfig.images.length : 0;
      avaliacaoLayoutConfig.images = (avaliacaoLayoutConfig.images || []).filter(function (item) {
        return String(item && item.id ? item.id : '') !== deleteImageId;
      });

      if (avaliacaoLayoutConfig.images.length === previousLength) {
        return false;
      }

      pushLayoutHistorySnapshot();

      if (String(avaliacaoLayoutCropModeImageId || '') === deleteImageId) {
        avaliacaoLayoutCropModeImageId = '';
      }

      avaliacaoLayoutSelection.type = '';
      avaliacaoLayoutSelection.imageId = '';
      avaliacaoLayoutSelection.questionIndex = -1;
      renderAvaliacaoLayoutEditor();
      return true;
    }

    function rotateSelectedLayoutImage(direction) {
      if (avaliacaoLayoutSelection.type === 'background') {
        pushLayoutHistorySnapshot();
        var backgroundStep = direction === 'left' ? -90 : 90;
        avaliacaoLayoutConfig.background.rotation = normalizeLayoutImageRotation(
          clampFloat(avaliacaoLayoutConfig.background.rotation, -180, 180, 0) + backgroundStep
        );
        renderAvaliacaoLayoutEditor();
        return true;
      }

      var selectedImageId = String(avaliacaoLayoutSelection.imageId || '').trim();
      if (selectedImageId === '') {
        return false;
      }

      var images = Array.isArray(avaliacaoLayoutConfig.images) ? avaliacaoLayoutConfig.images : [];
      var imageData = images.find(function (item) {
        return String(item && item.id ? item.id : '') === selectedImageId;
      });

      if (!imageData) {
        return false;
      }

      var step = direction === 'left' ? -90 : 90;
      pushLayoutHistorySnapshot();
      imageData.rotation = normalizeLayoutImageRotation(clampFloat(imageData.rotation, -180, 180, 0) + step);
      renderAvaliacaoLayoutEditor();
      return true;
    }

    function toggleSelectedLayoutImageCropMode() {
      if (avaliacaoLayoutSelection.type === 'background') {
        if (String(avaliacaoLayoutCropModeImageId || '') === '__background__') {
          avaliacaoLayoutCropModeImageId = '';
        } else {
          avaliacaoLayoutCropModeImageId = '__background__';
        }
        renderAvaliacaoLayoutEditor();
        return true;
      }

      var selectedImageId = String(avaliacaoLayoutSelection.imageId || '').trim();
      if (selectedImageId === '') {
        return false;
      }

      var images = Array.isArray(avaliacaoLayoutConfig.images) ? avaliacaoLayoutConfig.images : [];
      var imageData = images.find(function (item) {
        return String(item && item.id ? item.id : '') === selectedImageId;
      });

      if (!imageData) {
        return false;
      }

      if (String(avaliacaoLayoutCropModeImageId || '') === selectedImageId) {
        avaliacaoLayoutCropModeImageId = '';
        renderAvaliacaoLayoutEditor();
        return true;
      }

      avaliacaoLayoutCropModeImageId = selectedImageId;
      renderAvaliacaoLayoutEditor();
      return true;
    }

    function resetSelectedLayoutImageCrop() {
      if (avaliacaoLayoutSelection.type === 'background') {
        var bgCrop = getLayoutImageCropRect(avaliacaoLayoutConfig.background || {});
        if (bgCrop.x === 0 && bgCrop.y === 0 && bgCrop.width === 1 && bgCrop.height === 1) {
          return false;
        }

        pushLayoutHistorySnapshot();
        avaliacaoLayoutConfig.background.crop = {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        };
        avaliacaoLayoutCropModeImageId = '';
        renderAvaliacaoLayoutEditor();
        return true;
      }

      var selectedImageId = String(avaliacaoLayoutSelection.imageId || '').trim();
      if (selectedImageId === '') {
        return false;
      }

      var images = Array.isArray(avaliacaoLayoutConfig.images) ? avaliacaoLayoutConfig.images : [];
      var imageData = images.find(function (item) {
        return String(item && item.id ? item.id : '') === selectedImageId;
      });

      if (!imageData) {
        return false;
      }

      var currentCrop = getLayoutImageCropRect(imageData);
      if (currentCrop.x === 0 && currentCrop.y === 0 && currentCrop.width === 1 && currentCrop.height === 1) {
        return false;
      }

      pushLayoutHistorySnapshot();
      imageData.crop = {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      };
      avaliacaoLayoutCropModeImageId = '';
      renderAvaliacaoLayoutEditor();
      return true;
    }

    function moveSelectedLayoutImageLayer(direction) {
      var selectedImageId = String(avaliacaoLayoutSelection.imageId || '').trim();
      if (selectedImageId === '') {
        return false;
      }

      var images = Array.isArray(avaliacaoLayoutConfig.images) ? avaliacaoLayoutConfig.images : [];
      var currentIndex = images.findIndex(function (item) {
        return String(item && item.id ? item.id : '') === selectedImageId;
      });

      if (currentIndex < 0) {
        return false;
      }

      var targetIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
      if (targetIndex < 0 || targetIndex >= images.length) {
        return false;
      }

      pushLayoutHistorySnapshot();

      var swap = images[targetIndex];
      images[targetIndex] = images[currentIndex];
      images[currentIndex] = swap;

      renderAvaliacaoLayoutEditor();
      return true;
    }

    function removeSelectedLayoutQuestion() {
      var deleteQuestionIndex = clampInt(avaliacaoLayoutSelection.questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
      if (deleteQuestionIndex < 0) {
        return false;
      }

      var deleteKey = String(deleteQuestionIndex + 1);
      if (!avaliacaoLayoutConfig.hidden_questions || typeof avaliacaoLayoutConfig.hidden_questions !== 'object') {
        avaliacaoLayoutConfig.hidden_questions = {};
      }

      pushLayoutHistorySnapshot();

      avaliacaoLayoutConfig.hidden_questions[deleteKey] = true;
      delete avaliacaoLayoutConfig.question_positions[deleteKey];

      avaliacaoLayoutSelection.type = '';
      avaliacaoLayoutSelection.imageId = '';
      avaliacaoLayoutSelection.questionIndex = -1;
      renderAvaliacaoLayoutEditor();
      showGlobalStatus('Questão excluída do layout.', false);
      return true;
    }

    function isTypingElement(target) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      var tagName = String(target.tagName || '').toUpperCase();
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
      }

      if (target.isContentEditable) {
        return true;
      }

      return false;
    }

    function removeSelectedLayoutItem() {
      if (avaliacaoLayoutSelection.type === 'image') {
        return removeSelectedLayoutImage();
      }

      if (avaliacaoLayoutSelection.type === 'question') {
        return removeSelectedLayoutQuestion();
      }

      return false;
    }

    function isRangeInsideElement(range, element) {
      if (!range || !(element instanceof HTMLElement)) {
        return false;
      }

      var commonNode = range.commonAncestorContainer;
      if (!commonNode) {
        return false;
      }

      if (commonNode === element) {
        return true;
      }

      return element.contains(commonNode);
    }

    function saveActiveRichTextSelection() {
      if (!activeRichTextEditable) {
        activeRichTextSelectionRange = null;
        return;
      }

      var selection = window.getSelection ? window.getSelection() : null;
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      var range = selection.getRangeAt(0);
      if (!isRangeInsideElement(range, activeRichTextEditable)) {
        return;
      }

      activeRichTextSelectionRange = range.cloneRange();
    }

    function restoreActiveRichTextSelection() {
      if (!activeRichTextEditable || !activeRichTextSelectionRange || !window.getSelection) {
        return;
      }

      try {
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(activeRichTextSelectionRange);
      } catch (error) {
      }
    }

    function handleLayoutEditorPointerDown(event) {
      if (!layoutEditorCanvas) {
        return;
      }

      var pointer = getPointerOnLayoutCanvas(event);
      if (!pointer) {
        return;
      }

      if (isPointerInRect(pointer, avaliacaoLayoutImageGrowWidthRect)) {
        var growWidthImage = findLayoutImageObjectById(avaliacaoLayoutImageGrowWidthRect.imageId);
        var growWidthLocalPointer = getLayoutImagePointerLocal(growWidthImage, pointer);
        if (growWidthImage && growWidthImage.data && growWidthLocalPointer) {
          pushLayoutHistorySnapshot();
          avaliacaoLayoutSelection.type = 'image';
          avaliacaoLayoutSelection.imageId = growWidthImage.data.id;
          avaliacaoLayoutSelection.questionIndex = -1;

          avaliacaoLayoutDrag.active = true;
          avaliacaoLayoutDrag.mode = 'resize-image-width';
          avaliacaoLayoutDrag.imageId = growWidthImage.data.id;
          avaliacaoLayoutDrag.startWidth = growWidthImage.data.width;
          avaliacaoLayoutDrag.startPointerX = growWidthLocalPointer.x;

          layoutEditorCanvas.classList.add('is-dragging');
          if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
            try {
              layoutEditorCanvas.setPointerCapture(event.pointerId);
              avaliacaoLayoutDrag.pointerId = event.pointerId;
            } catch (error) {
              avaliacaoLayoutDrag.pointerId = -1;
            }
          }
          renderAvaliacaoLayoutEditor();
          return;
        }
      }

      if (isPointerInRect(pointer, avaliacaoLayoutImageGrowHeightRect)) {
        var growHeightImage = findLayoutImageObjectById(avaliacaoLayoutImageGrowHeightRect.imageId);
        var growHeightLocalPointer = getLayoutImagePointerLocal(growHeightImage, pointer);
        if (growHeightImage && growHeightImage.data && growHeightLocalPointer) {
          pushLayoutHistorySnapshot();
          avaliacaoLayoutSelection.type = 'image';
          avaliacaoLayoutSelection.imageId = growHeightImage.data.id;
          avaliacaoLayoutSelection.questionIndex = -1;

          avaliacaoLayoutDrag.active = true;
          avaliacaoLayoutDrag.mode = 'resize-image-height';
          avaliacaoLayoutDrag.imageId = growHeightImage.data.id;
          avaliacaoLayoutDrag.startHeight = growHeightImage.data.height;
          avaliacaoLayoutDrag.startY = growHeightLocalPointer.y;

          layoutEditorCanvas.classList.add('is-dragging');
          if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
            try {
              layoutEditorCanvas.setPointerCapture(event.pointerId);
              avaliacaoLayoutDrag.pointerId = event.pointerId;
            } catch (error) {
              avaliacaoLayoutDrag.pointerId = -1;
            }
          }
          renderAvaliacaoLayoutEditor();
          return;
        }
      }

      var resizeHandleUnderPointer = findResizeHandleUnderPointer(pointer);
      if (resizeHandleUnderPointer && resizeHandleUnderPointer.imageObject && resizeHandleUnderPointer.localPointer) {
        pushLayoutHistorySnapshot();
        avaliacaoLayoutSelection.type = 'image';
        avaliacaoLayoutSelection.imageId = resizeHandleUnderPointer.imageObject.data.id;
        avaliacaoLayoutSelection.questionIndex = -1;

        avaliacaoLayoutDrag.active = true;
        avaliacaoLayoutDrag.mode = resizeHandleUnderPointer.axis === 'width' ? 'resize-image-width' : 'resize-image-height';
        avaliacaoLayoutDrag.imageId = resizeHandleUnderPointer.imageObject.data.id;
        if (resizeHandleUnderPointer.axis === 'width') {
          avaliacaoLayoutDrag.startWidth = resizeHandleUnderPointer.imageObject.data.width;
          avaliacaoLayoutDrag.startPointerX = resizeHandleUnderPointer.localPointer.x;
        } else {
          avaliacaoLayoutDrag.startHeight = resizeHandleUnderPointer.imageObject.data.height;
          avaliacaoLayoutDrag.startY = resizeHandleUnderPointer.localPointer.y;
        }

        layoutEditorCanvas.classList.add('is-dragging');
        if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
          try {
            layoutEditorCanvas.setPointerCapture(event.pointerId);
            avaliacaoLayoutDrag.pointerId = event.pointerId;
          } catch (error) {
            avaliacaoLayoutDrag.pointerId = -1;
          }
        }
        renderAvaliacaoLayoutEditor();
        return;
      }

      var selectedImageForResize = findLayoutImageObjectById(avaliacaoLayoutSelection.imageId);
      var selectedImageCropModeActive = String(avaliacaoLayoutCropModeImageId || '') === String(avaliacaoLayoutSelection.imageId || '');
      if (!selectedImageCropModeActive && selectedImageForResize && selectedImageForResize.handleRect && isPointerInHandleWithPadding(pointer, selectedImageForResize.handleRect, 14)) {
        pushLayoutHistorySnapshot();
        avaliacaoLayoutDrag.active = true;
        avaliacaoLayoutDrag.mode = 'resize-image';
        avaliacaoLayoutDrag.imageId = selectedImageForResize.data.id;
        avaliacaoLayoutDrag.startWidth = selectedImageForResize.data.width;
        avaliacaoLayoutDrag.startHeight = selectedImageForResize.data.height;
        avaliacaoLayoutDrag.startPointerX = pointer.x;
        avaliacaoLayoutDrag.startY = pointer.y;
        layoutEditorCanvas.classList.add('is-dragging');
        if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
          try {
            layoutEditorCanvas.setPointerCapture(event.pointerId);
            avaliacaoLayoutDrag.pointerId = event.pointerId;
          } catch (error) {
            avaliacaoLayoutDrag.pointerId = -1;
          }
        }
        renderAvaliacaoLayoutEditor();
        return;
      }

      var selectedResizeHit = selectedImageCropModeActive ? '' : getImageResizeHandleHit(pointer, selectedImageForResize);
      if (selectedResizeHit === 'width') {
        var widthLocalPointer = getLayoutImagePointerLocal(selectedImageForResize, pointer);
        if (selectedImageForResize && selectedImageForResize.data && widthLocalPointer) {
          pushLayoutHistorySnapshot();
          avaliacaoLayoutDrag.active = true;
          avaliacaoLayoutDrag.mode = 'resize-image-width';
          avaliacaoLayoutDrag.imageId = selectedImageForResize.data.id;
          avaliacaoLayoutDrag.startWidth = selectedImageForResize.data.width;
          avaliacaoLayoutDrag.startPointerX = widthLocalPointer.x;
          layoutEditorCanvas.classList.add('is-dragging');
          if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
            try {
              layoutEditorCanvas.setPointerCapture(event.pointerId);
              avaliacaoLayoutDrag.pointerId = event.pointerId;
            } catch (error) {
              avaliacaoLayoutDrag.pointerId = -1;
            }
          }
          renderAvaliacaoLayoutEditor();
        }
        return;
      } else if (selectedResizeHit === 'height') {
        var heightLocalPointer = getLayoutImagePointerLocal(selectedImageForResize, pointer);
        if (selectedImageForResize && selectedImageForResize.data && heightLocalPointer) {
          pushLayoutHistorySnapshot();
          avaliacaoLayoutDrag.active = true;
          avaliacaoLayoutDrag.mode = 'resize-image-height';
          avaliacaoLayoutDrag.imageId = selectedImageForResize.data.id;
          avaliacaoLayoutDrag.startHeight = selectedImageForResize.data.height;
          avaliacaoLayoutDrag.startY = heightLocalPointer.y;
          layoutEditorCanvas.classList.add('is-dragging');
          if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
            try {
              layoutEditorCanvas.setPointerCapture(event.pointerId);
              avaliacaoLayoutDrag.pointerId = event.pointerId;
            } catch (error) {
              avaliacaoLayoutDrag.pointerId = -1;
            }
          }
          renderAvaliacaoLayoutEditor();
        }
        return;
      }

      if (isPointerInRectWithPadding(pointer, avaliacaoLayoutImageRotateLeftRect, 4)) {
        rotateSelectedLayoutImage('left');
        return;
      }

      if (isPointerInRectWithPadding(pointer, avaliacaoLayoutImageRotateRightRect, 4)) {
        rotateSelectedLayoutImage('right');
        return;
      }

      if (isPointerInRectWithPadding(pointer, avaliacaoLayoutImageCropRect, 4)) {
        toggleSelectedLayoutImageCropMode();
        return;
      }

      if (isPointerInRectWithPadding(pointer, avaliacaoLayoutImageCropResetRect, 4)) {
        resetSelectedLayoutImageCrop();
        return;
      }

      if (
        avaliacaoLayoutImageLayerUpRect
        && avaliacaoLayoutImageLayerUpRect.disabled !== true
        && isPointerInRectWithPadding(pointer, avaliacaoLayoutImageLayerUpRect, 4)
      ) {
        moveSelectedLayoutImageLayer('up');
        return;
      }

      if (
        avaliacaoLayoutImageLayerDownRect
        && avaliacaoLayoutImageLayerDownRect.disabled !== true
        && isPointerInRectWithPadding(pointer, avaliacaoLayoutImageLayerDownRect, 4)
      ) {
        moveSelectedLayoutImageLayer('down');
        return;
      }

      if (isPointerInRectWithPadding(pointer, avaliacaoLayoutImageDeleteRect, 4)) {
        removeSelectedLayoutImage();
        return;
      }

      if (
        avaliacaoLayoutQuestionDeleteRect
        && pointer.x >= avaliacaoLayoutQuestionDeleteRect.x
        && pointer.x <= (avaliacaoLayoutQuestionDeleteRect.x + avaliacaoLayoutQuestionDeleteRect.width)
        && pointer.y >= avaliacaoLayoutQuestionDeleteRect.y
        && pointer.y <= (avaliacaoLayoutQuestionDeleteRect.y + avaliacaoLayoutQuestionDeleteRect.height)
      ) {
        removeSelectedLayoutQuestion();
        return;
      }

      var moveControlHit = null;
      var selectedQuestionIndex = clampInt(avaliacaoLayoutSelection.questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
      var hasSelectedQuestion = avaliacaoLayoutSelection.type === 'question' && selectedQuestionIndex >= 0;
      for (var upIndex = 0; upIndex < avaliacaoLayoutQuestionMoveUpRects.length; upIndex += 1) {
        var upRect = avaliacaoLayoutQuestionMoveUpRects[upIndex];
        if (!hasSelectedQuestion || clampInt(upRect.questionIndex, 0, 9999, -1) !== selectedQuestionIndex) {
          continue;
        }
        if (
          pointer.x >= upRect.x
          && pointer.x <= (upRect.x + upRect.width)
          && pointer.y >= upRect.y
          && pointer.y <= (upRect.y + upRect.height)
        ) {
          moveControlHit = { direction: 'up', rect: upRect };
          break;
        }
      }

      if (!moveControlHit) {
        for (var downIndex = 0; downIndex < avaliacaoLayoutQuestionMoveDownRects.length; downIndex += 1) {
          var downRect = avaliacaoLayoutQuestionMoveDownRects[downIndex];
          if (!hasSelectedQuestion || clampInt(downRect.questionIndex, 0, 9999, -1) !== selectedQuestionIndex) {
            continue;
          }
          if (
            pointer.x >= downRect.x
            && pointer.x <= (downRect.x + downRect.width)
            && pointer.y >= downRect.y
            && pointer.y <= (downRect.y + downRect.height)
          ) {
            moveControlHit = { direction: 'down', rect: downRect };
            break;
          }
        }
      }

      if (moveControlHit && moveControlHit.rect && moveControlHit.rect.disabled !== true) {
        avaliacaoLayoutSelection.type = 'question';
        avaliacaoLayoutSelection.imageId = '';
        avaliacaoLayoutSelection.questionIndex = clampInt(moveControlHit.rect.questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
        reorderQuestionPositions(moveControlHit.rect.questionIndex, moveControlHit.direction);
        return;
      }

      var questionBlock = findLayoutQuestionUnderPointer(pointer);
      if (questionBlock) {
        avaliacaoLayoutCropModeImageId = '';
        pushLayoutHistorySnapshot();
        avaliacaoLayoutSelection.type = 'question';
        avaliacaoLayoutSelection.imageId = '';
        avaliacaoLayoutSelection.questionIndex = questionBlock.questionIndex;

        avaliacaoLayoutDrag.active = true;
        avaliacaoLayoutDrag.mode = 'move-question';
        avaliacaoLayoutDrag.questionIndex = questionBlock.questionIndex;
        avaliacaoLayoutDrag.pointerOffsetX = pointer.x - questionBlock.x;
        avaliacaoLayoutDrag.pointerOffsetY = pointer.y - questionBlock.y;
        avaliacaoLayoutDrag.questionStartY = questionBlock.y;
        avaliacaoLayoutDrag.questionStartHeight = questionBlock.height;
        avaliacaoLayoutDrag.questionStartBlocks = (Array.isArray(avaliacaoLayoutQuestionBlocks) ? avaliacaoLayoutQuestionBlocks : []).map(function (entry) {
          return {
            questionIndex: clampInt(entry && entry.questionIndex, 0, 9999, 0),
            page: clampInt(entry && entry.page, 1, 999, 1),
            x: clampFloat(entry && entry.x, -99999, 99999, 0),
            y: clampFloat(entry && entry.y, -99999, 99999, 0),
            height: Math.max(1, clampFloat(entry && entry.height, 1, 99999, 1)),
          };
        });

        layoutEditorCanvas.classList.add('is-dragging');
        if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
          try {
            layoutEditorCanvas.setPointerCapture(event.pointerId);
            avaliacaoLayoutDrag.pointerId = event.pointerId;
          } catch (error) {
            avaliacaoLayoutDrag.pointerId = -1;
          }
        }
        renderAvaliacaoLayoutEditor();
        return;
      }

      var image = findLayoutImageUnderPointer(pointer);
      if (image) {
        pushLayoutHistorySnapshot();
        avaliacaoLayoutSelection.type = 'image';
        avaliacaoLayoutSelection.imageId = image.data.id;
        avaliacaoLayoutSelection.questionIndex = -1;

        var cropModeActiveForImage = String(avaliacaoLayoutCropModeImageId || '') === String(image.data.id || '');
        if (!cropModeActiveForImage) {
          var resizeHitOnHoveredImage = getImageResizeHandleHit(pointer, image);
          if (resizeHitOnHoveredImage === 'width' || resizeHitOnHoveredImage === 'height') {
            var localPointerForResize = getLayoutImagePointerLocal(image, pointer);
            if (localPointerForResize) {
              avaliacaoLayoutDrag.active = true;
              avaliacaoLayoutDrag.mode = resizeHitOnHoveredImage === 'width' ? 'resize-image-width' : 'resize-image-height';
              avaliacaoLayoutDrag.imageId = image.data.id;
              if (resizeHitOnHoveredImage === 'width') {
                avaliacaoLayoutDrag.startWidth = image.data.width;
                avaliacaoLayoutDrag.startPointerX = localPointerForResize.x;
              } else {
                avaliacaoLayoutDrag.startHeight = image.data.height;
                avaliacaoLayoutDrag.startY = localPointerForResize.y;
              }

              layoutEditorCanvas.classList.add('is-dragging');
              if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
                try {
                  layoutEditorCanvas.setPointerCapture(event.pointerId);
                  avaliacaoLayoutDrag.pointerId = event.pointerId;
                } catch (error) {
                  avaliacaoLayoutDrag.pointerId = -1;
                }
              }
              renderAvaliacaoLayoutEditor();
              return;
            }
          }
        }

        var imagePointerLocal = getLayoutImagePointerLocal(image, pointer);
        if (cropModeActiveForImage && imagePointerLocal && image.renderMeta) {
          var cropPixels = getLayoutImageCropPixelRect(image);
          var cropHandle = getCropHandleFromLocalPoint(cropPixels, imagePointerLocal);
          var insideCrop = cropPixels
            && imagePointerLocal.x >= cropPixels.x
            && imagePointerLocal.x <= (cropPixels.x + cropPixels.width)
            && imagePointerLocal.y >= cropPixels.y
            && imagePointerLocal.y <= (cropPixels.y + cropPixels.height);

          if (cropHandle || insideCrop) {
            avaliacaoLayoutDrag.active = true;
            avaliacaoLayoutDrag.mode = 'crop-image';
            avaliacaoLayoutDrag.imageId = image.data.id;
            avaliacaoLayoutDrag.cropHandle = cropHandle || 'move';
            avaliacaoLayoutDrag.cropStart = getLayoutImageCropRect(image.data);
            avaliacaoLayoutDrag.pointerOffsetX = cropPixels ? (imagePointerLocal.x - cropPixels.x) : 0;
            avaliacaoLayoutDrag.pointerOffsetY = cropPixels ? (imagePointerLocal.y - cropPixels.y) : 0;

            layoutEditorCanvas.classList.add('is-dragging');
            if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
              try {
                layoutEditorCanvas.setPointerCapture(event.pointerId);
                avaliacaoLayoutDrag.pointerId = event.pointerId;
              } catch (error) {
                avaliacaoLayoutDrag.pointerId = -1;
              }
            }
            renderAvaliacaoLayoutEditor();
            return;
          }
        }

        var handleRect = image.handleRect;
        if (!cropModeActiveForImage && isPointerInHandleWithPadding(pointer, handleRect, 14)) {
          avaliacaoLayoutDrag.active = true;
          avaliacaoLayoutDrag.mode = 'resize-image';
          avaliacaoLayoutDrag.imageId = image.data.id;
          avaliacaoLayoutDrag.startWidth = image.data.width;
          avaliacaoLayoutDrag.startHeight = image.data.height;
          avaliacaoLayoutDrag.startPointerX = pointer.x;
          avaliacaoLayoutDrag.startY = pointer.y;
        } else {
          if (cropModeActiveForImage) {
            renderAvaliacaoLayoutEditor();
            return;
          }

          avaliacaoLayoutDrag.active = true;
          avaliacaoLayoutDrag.mode = 'move-image';
          avaliacaoLayoutDrag.imageId = image.data.id;
          avaliacaoLayoutDrag.pointerOffsetX = imagePointerLocal ? imagePointerLocal.x : 0;
          avaliacaoLayoutDrag.pointerOffsetY = imagePointerLocal ? imagePointerLocal.y : 0;
        }

        layoutEditorCanvas.classList.add('is-dragging');
        if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
          try {
            layoutEditorCanvas.setPointerCapture(event.pointerId);
            avaliacaoLayoutDrag.pointerId = event.pointerId;
          } catch (error) {
            avaliacaoLayoutDrag.pointerId = -1;
          }
        }
        renderAvaliacaoLayoutEditor();
        return;
      }

      var backgroundHit = getLayoutBackgroundHit(pointer);
      if (backgroundHit) {
        if (String(avaliacaoLayoutCropModeImageId || '') !== '__background__') {
          avaliacaoLayoutCropModeImageId = '';
        }
        pushLayoutHistorySnapshot();
        avaliacaoLayoutSelection.type = 'background';
        avaliacaoLayoutSelection.imageId = '';
        avaliacaoLayoutSelection.questionIndex = -1;
        var backgroundObject = backgroundHit.object || null;
        var cropModeActiveForBackground = String(avaliacaoLayoutCropModeImageId || '') === '__background__';

        if (cropModeActiveForBackground && backgroundObject && backgroundObject.renderMeta) {
          var bgPointerLocal = getLayoutImagePointerLocal(backgroundObject, pointer);
          var bgCropPixels = getLayoutImageCropPixelRect(backgroundObject);
          var bgCropHandle = getCropHandleFromLocalPoint(bgCropPixels, bgPointerLocal);
          var bgInsideCrop = bgCropPixels
            && bgPointerLocal
            && bgPointerLocal.x >= bgCropPixels.x
            && bgPointerLocal.x <= (bgCropPixels.x + bgCropPixels.width)
            && bgPointerLocal.y >= bgCropPixels.y
            && bgPointerLocal.y <= (bgCropPixels.y + bgCropPixels.height);

          if (bgCropHandle || bgInsideCrop) {
            avaliacaoLayoutDrag.active = true;
            avaliacaoLayoutDrag.mode = 'crop-background';
            avaliacaoLayoutDrag.cropHandle = bgCropHandle || 'move';
            avaliacaoLayoutDrag.cropStart = getLayoutImageCropRect(avaliacaoLayoutConfig.background);
            avaliacaoLayoutDrag.pointerOffsetX = bgCropPixels ? (bgPointerLocal.x - bgCropPixels.x) : 0;
            avaliacaoLayoutDrag.pointerOffsetY = bgCropPixels ? (bgPointerLocal.y - bgCropPixels.y) : 0;

            layoutEditorCanvas.classList.add('is-dragging');
            if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
              try {
                layoutEditorCanvas.setPointerCapture(event.pointerId);
                avaliacaoLayoutDrag.pointerId = event.pointerId;
              } catch (error) {
                avaliacaoLayoutDrag.pointerId = -1;
              }
            }
            renderAvaliacaoLayoutEditor();
            return;
          }
        }

        var onHandle = Boolean(backgroundObject && backgroundObject.handleRect)
          && isPointerInHandleWithPadding(pointer, backgroundObject.handleRect, 14);

        avaliacaoLayoutDrag.active = true;
        avaliacaoLayoutDrag.mode = onHandle ? 'resize-background' : 'move-background';
        avaliacaoLayoutDrag.pointerOffsetX = pointer.x - backgroundHit.rect.x;
        avaliacaoLayoutDrag.pointerOffsetY = pointer.y - backgroundHit.rect.y;
        avaliacaoLayoutDrag.startScale = avaliacaoLayoutConfig.background.scale;
        avaliacaoLayoutDrag.startPointerX = pointer.x;
        layoutEditorCanvas.classList.add('is-dragging');
        if (event && Number.isFinite(event.pointerId) && typeof layoutEditorCanvas.setPointerCapture === 'function') {
          try {
            layoutEditorCanvas.setPointerCapture(event.pointerId);
            avaliacaoLayoutDrag.pointerId = event.pointerId;
          } catch (error) {
            avaliacaoLayoutDrag.pointerId = -1;
          }
        }
        renderAvaliacaoLayoutEditor();
        return;
      }

      avaliacaoLayoutSelection.type = '';
      avaliacaoLayoutSelection.imageId = '';
      avaliacaoLayoutSelection.questionIndex = -1;
      avaliacaoLayoutCropModeImageId = '';
      renderAvaliacaoLayoutEditor();
    }

    function handleLayoutEditorPointerMove(event) {
      if (!layoutEditorCanvas) {
        return;
      }

      var pointer = getPointerOnLayoutCanvas(event);
      if (!pointer) {
        return;
      }

      if (!avaliacaoLayoutDrag.active) {
        layoutEditorCanvas.style.cursor = getLayoutCanvasCursor(pointer);
      }

      if (!avaliacaoLayoutDrag.active) {
        return;
      }

      if (avaliacaoLayoutDrag.mode === 'move-question') {
        layoutEditorCanvas.style.cursor = 'grabbing';
        var movedQuestionIndex = clampInt(avaliacaoLayoutDrag.questionIndex, 0, gabaritoQuestoesItens.length - 1, -1);
        if (movedQuestionIndex >= 0) {
          var block = avaliacaoLayoutQuestionBlocks.find(function (entry) {
            return entry.questionIndex === movedQuestionIndex;
          });

          var targetPageRect = null;
          var targetPage = 1;
          for (var pageIdx = 0; pageIdx < avaliacaoLayoutPageRects.length; pageIdx += 1) {
            var pageRectCandidate = avaliacaoLayoutPageRects[pageIdx];
            var insidePage = pointer.x >= pageRectCandidate.x
              && pointer.x <= (pageRectCandidate.x + pageRectCandidate.width)
              && pointer.y >= pageRectCandidate.y
              && pointer.y <= (pageRectCandidate.y + pageRectCandidate.height);

            if (insidePage) {
              targetPageRect = pageRectCandidate;
              targetPage = pageIdx + 1;
              break;
            }
          }

          if (!targetPageRect && block) {
            targetPage = block.page;
            targetPageRect = avaliacaoLayoutPageRects[targetPage - 1] || null;
          }

          if (targetPageRect && block) {
            var questionKey = String(movedQuestionIndex + 1);
            if (!avaliacaoLayoutConfig.question_positions || typeof avaliacaoLayoutConfig.question_positions !== 'object') {
              avaliacaoLayoutConfig.question_positions = {};
            }

            var nextX = pointer.x - targetPageRect.contentX - avaliacaoLayoutDrag.pointerOffsetX;
            var nextY = pointer.y - targetPageRect.contentY - avaliacaoLayoutDrag.pointerOffsetY;

            nextX = applyGridSnap(nextX);
            nextY = applyGridSnap(nextY);

            var questionCenterX = targetPageRect.contentX + nextX + (block.width / 2);
            nextX += getCenterSnapOffset(targetPageRect, questionCenterX, 6);

            var movedYAbs = targetPageRect.contentY + clampFloat(nextY, 0, Math.max(0, targetPageRect.contentHeight - 24), 0);

            avaliacaoLayoutConfig.question_positions[questionKey] = {
              page: targetPage,
              x: clampFloat(nextX, 0, Math.max(0, targetPageRect.contentWidth - 80), 0),
              y: clampFloat(nextY, 0, Math.max(0, targetPageRect.contentHeight - 24), 0),
            };

            var startYAbs = clampFloat(avaliacaoLayoutDrag.questionStartY, -99999, 99999, movedYAbs);
            var dragDeltaY = movedYAbs - startYAbs;
            if (dragDeltaY > 0.5) {
              var spacing = clampInt(avaliacaoLayoutConfig.spacing, 8, 60, 18);
              var movedHeight = Math.max(1, clampFloat(block.height, 1, 99999, 1));
              var minNextAbsY = movedYAbs + movedHeight + spacing;
              var startBlocks = Array.isArray(avaliacaoLayoutDrag.questionStartBlocks) ? avaliacaoLayoutDrag.questionStartBlocks.slice() : [];

              startBlocks
                .filter(function (entry) {
                  return clampInt(entry.questionIndex, 0, 9999, -1) > movedQuestionIndex;
                })
                .sort(function (left, right) {
                  return clampInt(left.questionIndex, 0, 9999, 0) - clampInt(right.questionIndex, 0, 9999, 0);
                })
                .forEach(function (entry) {
                  var followerIndex = clampInt(entry.questionIndex, 0, 9999, -1);
                  if (followerIndex < 0) {
                    return;
                  }

                  var followerHeight = Math.max(1, clampFloat(entry.height, 1, 99999, 1));
                  var desiredAbsY = Math.max(entry.y + dragDeltaY, minNextAbsY);

                  var resolvedPage = 1;
                  var resolvedRect = getLayoutPageGeometry(0);
                  var resolvedAbsY = resolvedRect.contentY;
                  var guard = 0;

                  while (guard < 120) {
                    guard += 1;
                    var pageRectTry = getLayoutPageGeometry(resolvedPage - 1);
                    var maxAbsYOnPage = pageRectTry.contentY + Math.max(0, pageRectTry.contentHeight - followerHeight);
                    if (desiredAbsY <= maxAbsYOnPage) {
                      resolvedRect = pageRectTry;
                      resolvedAbsY = clampFloat(desiredAbsY, pageRectTry.contentY, maxAbsYOnPage, pageRectTry.contentY);
                      break;
                    }
                    resolvedPage += 1;
                  }

                  var sourcePageRect = getLayoutPageGeometry(clampInt(entry.page, 1, 999, 1) - 1);
                  var sourceLocalX = entry.x - sourcePageRect.contentX;

                  avaliacaoLayoutConfig.question_positions[String(followerIndex + 1)] = {
                    page: resolvedPage,
                    x: clampFloat(sourceLocalX, 0, Math.max(0, resolvedRect.contentWidth - 80), 0),
                    y: clampFloat(resolvedAbsY - resolvedRect.contentY, 0, Math.max(0, resolvedRect.contentHeight - followerHeight), 0),
                  };

                  minNextAbsY = resolvedAbsY + followerHeight + spacing;
                });
            }
          }
        }
      } else if (
        avaliacaoLayoutDrag.mode === 'move-image'
        || avaliacaoLayoutDrag.mode === 'resize-image'
        || avaliacaoLayoutDrag.mode === 'resize-image-width'
        || avaliacaoLayoutDrag.mode === 'resize-image-height'
        || avaliacaoLayoutDrag.mode === 'crop-image'
      ) {
        if (avaliacaoLayoutDrag.mode === 'move-image' || (avaliacaoLayoutDrag.mode === 'crop-image' && avaliacaoLayoutDrag.cropHandle === 'move')) {
          layoutEditorCanvas.style.cursor = 'grabbing';
        } else if (avaliacaoLayoutDrag.mode === 'resize-image-width') {
          layoutEditorCanvas.style.cursor = 'ew-resize';
        } else if (avaliacaoLayoutDrag.mode === 'resize-image-height') {
          layoutEditorCanvas.style.cursor = 'ns-resize';
        } else {
          layoutEditorCanvas.style.cursor = 'nwse-resize';
        }

        var imageData = avaliacaoLayoutConfig.images.find(function (item) {
          return item.id === avaliacaoLayoutDrag.imageId;
        });
        if (!imageData) {
          return;
        }

        var pageIndex = clampInt(imageData.page, 1, 999, 1) - 1;
        var pageRect = avaliacaoLayoutPageRects[pageIndex];
        if (!pageRect) {
          return;
        }

        if (avaliacaoLayoutDrag.mode === 'move-image') {
          var nextImageX = pointer.x - pageRect.contentX - avaliacaoLayoutDrag.pointerOffsetX;
          var nextImageY = pointer.y - pageRect.contentY - avaliacaoLayoutDrag.pointerOffsetY;
          nextImageX = applyGridSnap(nextImageX);
          nextImageY = applyGridSnap(nextImageY);

          var preSnapVisibleBounds = getVisibleImageBoundsForPlacement(imageData, pageRect, nextImageX, nextImageY);
          if (preSnapVisibleBounds) {
            var preSnapCenterX = preSnapVisibleBounds.x + (preSnapVisibleBounds.width / 2);
            nextImageX += getCenterSnapOffset(pageRect, preSnapCenterX, 6);
          }

          var visibleBounds = getVisibleImageBoundsForPlacement(imageData, pageRect, nextImageX, nextImageY);
          if (visibleBounds) {
            var adjustX = 0;
            var adjustY = 0;
            var minX = pageRect.contentX;
            var maxX = pageRect.contentX + pageRect.contentWidth;
            var minY = pageRect.contentY;
            var maxY = pageRect.contentY + pageRect.contentHeight;

            if (visibleBounds.x < minX) {
              adjustX += (minX - visibleBounds.x);
            }
            if ((visibleBounds.x + visibleBounds.width) > maxX) {
              adjustX -= ((visibleBounds.x + visibleBounds.width) - maxX);
            }
            if (visibleBounds.y < minY) {
              adjustY += (minY - visibleBounds.y);
            }
            if ((visibleBounds.y + visibleBounds.height) > maxY) {
              adjustY -= ((visibleBounds.y + visibleBounds.height) - maxY);
            }

            nextImageX += adjustX;
            nextImageY += adjustY;
          }

          imageData.x = clampFloat(nextImageX, -2000, pageRect.contentWidth + 2000, imageData.x);
          imageData.y = clampFloat(nextImageY, -2000, pageRect.contentHeight + 2000, imageData.y);
        } else if (avaliacaoLayoutDrag.mode === 'resize-image') {
          var delta = pointer.x - avaliacaoLayoutDrag.startPointerX;
          imageData.width = clampFloat(applyGridSnap(avaliacaoLayoutDrag.startWidth + delta), 40, pageRect.contentWidth, imageData.width);
          imageData.height = clampFloat(applyGridSnap(avaliacaoLayoutDrag.startHeight + delta), 40, pageRect.contentHeight, imageData.height);
        } else if (avaliacaoLayoutDrag.mode === 'resize-image-width') {
          var widthImageObject = findLayoutImageObjectById(avaliacaoLayoutDrag.imageId);
          var widthLocalPointer = getLayoutImagePointerLocal(widthImageObject, pointer);
          if (!widthLocalPointer) {
            return;
          }

          var widthDelta = widthLocalPointer.x - clampFloat(avaliacaoLayoutDrag.startPointerX, -100000, 100000, widthLocalPointer.x);
          imageData.width = clampFloat(
            applyGridSnap(clampFloat(avaliacaoLayoutDrag.startWidth, 40, pageRect.contentWidth, imageData.width) + widthDelta),
            40,
            pageRect.contentWidth,
            imageData.width
          );
        } else if (avaliacaoLayoutDrag.mode === 'resize-image-height') {
          var heightImageObject = findLayoutImageObjectById(avaliacaoLayoutDrag.imageId);
          var heightLocalPointer = getLayoutImagePointerLocal(heightImageObject, pointer);
          if (!heightLocalPointer) {
            return;
          }

          var heightDelta = heightLocalPointer.y - clampFloat(avaliacaoLayoutDrag.startY, -100000, 100000, heightLocalPointer.y);
          imageData.height = clampFloat(
            applyGridSnap(clampFloat(avaliacaoLayoutDrag.startHeight, 40, pageRect.contentHeight, imageData.height) + heightDelta),
            40,
            pageRect.contentHeight,
            imageData.height
          );
        } else {
          var imageObject = findLayoutImageObjectById(avaliacaoLayoutDrag.imageId);
          var pointerLocal = getLayoutImagePointerLocal(imageObject, pointer);
          if (!imageObject || !pointerLocal || !imageObject.renderMeta) {
            return;
          }

          var width = Math.max(1, clampFloat(imageObject.renderMeta.width, 1, 100000, 1));
          var height = Math.max(1, clampFloat(imageObject.renderMeta.height, 1, 100000, 1));
          var minWidth = Math.max(1, width * 0.05);
          var minHeight = Math.max(1, height * 0.05);
          var startCrop = avaliacaoLayoutDrag.cropStart && typeof avaliacaoLayoutDrag.cropStart === 'object'
            ? avaliacaoLayoutDrag.cropStart
            : getLayoutImageCropRect(imageData);

          var startLeft = clampFloat(startCrop.x, 0, 0.95, 0) * width;
          var startTop = clampFloat(startCrop.y, 0, 0.95, 0) * height;
          var startRight = startLeft + (clampFloat(startCrop.width, 0.05, 1, 1) * width);
          var startBottom = startTop + (clampFloat(startCrop.height, 0.05, 1, 1) * height);

          var cropLeft = startLeft;
          var cropTop = startTop;
          var cropRight = startRight;
          var cropBottom = startBottom;
          var handle = String(avaliacaoLayoutDrag.cropHandle || '');
          var localX = clampFloat(pointerLocal.x, 0, width, pointerLocal.x);
          var localY = clampFloat(pointerLocal.y, 0, height, pointerLocal.y);

          if (handle === 'move') {
            var moveWidth = startRight - startLeft;
            var moveHeight = startBottom - startTop;
            var nextLeft = localX - clampFloat(avaliacaoLayoutDrag.pointerOffsetX, -10000, 10000, 0);
            var nextTop = localY - clampFloat(avaliacaoLayoutDrag.pointerOffsetY, -10000, 10000, 0);
            nextLeft = clampFloat(nextLeft, 0, width - moveWidth, startLeft);
            nextTop = clampFloat(nextTop, 0, height - moveHeight, startTop);
            cropLeft = nextLeft;
            cropTop = nextTop;
            cropRight = nextLeft + moveWidth;
            cropBottom = nextTop + moveHeight;
          } else {
            if (handle.indexOf('w') >= 0) {
              cropLeft = clampFloat(localX, 0, cropRight - minWidth, cropLeft);
            }
            if (handle.indexOf('e') >= 0) {
              cropRight = clampFloat(localX, cropLeft + minWidth, width, cropRight);
            }
            if (handle.indexOf('n') >= 0) {
              cropTop = clampFloat(localY, 0, cropBottom - minHeight, cropTop);
            }
            if (handle.indexOf('s') >= 0) {
              cropBottom = clampFloat(localY, cropTop + minHeight, height, cropBottom);
            }

            if (event && event.shiftKey && handle !== '') {
              var aspect = Math.max(0.1, (startRight - startLeft) / Math.max(1, (startBottom - startTop)));
              var anchorX = handle.indexOf('w') >= 0 ? startRight : startLeft;
              var anchorY = handle.indexOf('n') >= 0 ? startBottom : startTop;
              var dirX = handle.indexOf('w') >= 0 ? -1 : 1;
              var dirY = handle.indexOf('n') >= 0 ? -1 : 1;
              var maxWidthPossible = Math.max(minWidth, dirX < 0 ? anchorX : (width - anchorX));
              var maxHeightPossible = Math.max(minHeight, dirY < 0 ? anchorY : (height - anchorY));

              var proposedWidth = Math.max(minWidth, Math.abs(cropRight - cropLeft));
              var proposedHeight = Math.max(minHeight, Math.abs(cropBottom - cropTop));
              var basedHeight = proposedWidth / aspect;
              var basedWidth = proposedHeight * aspect;
              var finalWidth = Math.abs(basedHeight - proposedHeight) <= Math.abs(basedWidth - proposedWidth)
                ? proposedWidth
                : basedWidth;

              finalWidth = clampFloat(finalWidth, minWidth, Math.max(minWidth, Math.min(maxWidthPossible, maxHeightPossible * aspect)), proposedWidth);
              var finalHeight = clampFloat(finalWidth / aspect, minHeight, maxHeightPossible, proposedHeight);
              if (finalHeight > maxHeightPossible) {
                finalHeight = maxHeightPossible;
                finalWidth = Math.max(minWidth, Math.min(maxWidthPossible, finalHeight * aspect));
              }

              if (dirX < 0) {
                cropRight = anchorX;
                cropLeft = anchorX - finalWidth;
              } else {
                cropLeft = anchorX;
                cropRight = anchorX + finalWidth;
              }

              if (dirY < 0) {
                cropBottom = anchorY;
                cropTop = anchorY - finalHeight;
              } else {
                cropTop = anchorY;
                cropBottom = anchorY + finalHeight;
              }
            }
          }

          setLayoutImageCropFromPixels(imageData, imageObject.renderMeta, {
            x: cropLeft,
            y: cropTop,
            width: cropRight - cropLeft,
            height: cropBottom - cropTop,
          });
        }
      } else if (avaliacaoLayoutDrag.mode === 'move-background' || avaliacaoLayoutDrag.mode === 'resize-background') {
        layoutEditorCanvas.style.cursor = avaliacaoLayoutDrag.mode === 'move-background' ? 'grabbing' : 'nwse-resize';
        var basePage = avaliacaoLayoutPageRects[0];
        if (!basePage) {
          return;
        }

        if (avaliacaoLayoutDrag.mode === 'move-background') {
          var nextBgX = pointer.x - basePage.contentX - avaliacaoLayoutDrag.pointerOffsetX;
          var nextBgY = pointer.y - basePage.contentY - avaliacaoLayoutDrag.pointerOffsetY;
          avaliacaoLayoutConfig.background.x = clampFloat(applyGridSnap(nextBgX), -2000, 2000, avaliacaoLayoutConfig.background.x);
          avaliacaoLayoutConfig.background.y = clampFloat(applyGridSnap(nextBgY), -2000, 2000, avaliacaoLayoutConfig.background.y);
        } else {
          var deltaScale = (pointer.x - avaliacaoLayoutDrag.startPointerX) / Math.max(120, basePage.contentWidth);
          avaliacaoLayoutConfig.background.scale = clampFloat(avaliacaoLayoutDrag.startScale + deltaScale, 0.2, 3, avaliacaoLayoutConfig.background.scale);
        }
      }

      renderAvaliacaoLayoutEditor();
    }

    function handleLayoutEditorPointerUp() {
      avaliacaoLayoutDrag.active = false;
      avaliacaoLayoutDrag.mode = '';
      var pointerIdToRelease = avaliacaoLayoutDrag.pointerId;
      avaliacaoLayoutDrag.pointerId = -1;
      avaliacaoLayoutDrag.questionIndex = -1;
      avaliacaoLayoutDrag.questionStartBlocks = [];
      avaliacaoLayoutDrag.questionStartY = 0;
      avaliacaoLayoutDrag.questionStartHeight = 0;
      avaliacaoLayoutDrag.cropHandle = '';
      avaliacaoLayoutDrag.cropStart = null;

      if (layoutEditorCanvas) {
        if (
          Number.isFinite(pointerIdToRelease)
          && pointerIdToRelease >= 0
          && typeof layoutEditorCanvas.releasePointerCapture === 'function'
        ) {
          try {
            if (typeof layoutEditorCanvas.hasPointerCapture !== 'function' || layoutEditorCanvas.hasPointerCapture(pointerIdToRelease)) {
              layoutEditorCanvas.releasePointerCapture(pointerIdToRelease);
            }
          } catch (error) {
          }
        }
        layoutEditorCanvas.classList.remove('is-dragging');
        layoutEditorCanvas.style.cursor = 'default';
      }

      syncGabaritoInput();
    }

    function parseGabaritoConfig(rawValue) {
      var raw = String(rawValue || '').trim();
      if (raw === '') {
        return null;
      }

      try {
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
          return null;
        }

        var safeQuestoes = clampInt(parsed.questoes, 1, 200, 1);
        var safeAlternativas = clampInt(parsed.alternativas, 2, 10, 4);
        var safeRespostas = sanitizeGabaritoRespostas(parsed.respostas, safeQuestoes, safeAlternativas);
        var safeItens = sanitizeGabaritoQuestoesItens(parsed.itens, safeQuestoes, safeAlternativas, safeRespostas);
        var maxAlternativas = getMaxAlternativasFromQuestoesItens(safeItens);
        var respostasFromItens = buildRespostasFromQuestoesItens(safeItens);

        return {
          questoes: safeItens.length,
          alternativas: maxAlternativas,
          respostas: sanitizeGabaritoRespostas(respostasFromItens, safeItens.length, maxAlternativas),
          itens: safeItens,
          layout: sanitizeGabaritoLayout(parsed.layout),
          background: sanitizeGabaritoBackground(parsed.background),
          avaliacao_layout: sanitizeAvaliacaoLayoutConfig(parsed.avaliacao_layout),
        };
      } catch (error) {
        return null;
      }
    }

    function applyGabaritoConfig(config) {
      var safeConfig = config && typeof config === 'object'
        ? config
        : { questoes: 1, alternativas: 4, respostas: {}, itens: [createDefaultQuestaoItem(4)] };

      gabaritoQuestoesItens = sanitizeGabaritoQuestoesItens(
        safeConfig.itens,
        safeConfig.questoes,
        safeConfig.alternativas,
        safeConfig.respostas
      );

      var safeQuestoes = gabaritoQuestoesItens.length;
      var safeAlternativas = getMaxAlternativasFromQuestoesItens(gabaritoQuestoesItens);
      gabaritoRespostasCorretas = sanitizeGabaritoRespostas(buildRespostasFromQuestoesItens(gabaritoQuestoesItens), safeQuestoes, safeAlternativas);
      gabaritoQuestoesPorColuna = clampInt(safeConfig.questoes_por_coluna, 1, 50, 10);
      gabaritoLayout = sanitizeGabaritoLayout(safeConfig.layout);
      setGabaritoBackground(safeConfig.background);
      gabaritoBackgroundLayout = sanitizeGabaritoBackgroundLayout(safeConfig.background_layout || null);
      avaliacaoLayoutConfig = sanitizeAvaliacaoLayoutConfig(safeConfig.avaliacao_layout);
      updateScaleUi();
      updateLayoutSpacingUi();

      if (layoutSpacingInput) {
        layoutSpacingInput.value = String(avaliacaoLayoutConfig.spacing);
      }

      if (layoutSnapGridInput) {
        layoutSnapGridInput.checked = avaliacaoLayoutConfig.snap_grid_enabled === true;
      }

      if (layoutGridSizeInput) {
        layoutGridSizeInput.value = String(clampInt(avaliacaoLayoutConfig.grid_size, 4, 80, 12));
      }

      layoutHistoryPast = [];
      layoutHistoryFuture = [];
      updateLayoutHistoryButtons();

      renderGabaritoQuestoesEditor();

      if (questoesTotalInput) {
        questoesTotalInput.value = String(gabaritoQuestoesItens.length);
      }
      if (alternativasTotalInput) {
        alternativasTotalInput.value = String(getMaxAlternativasFromQuestoesItens(gabaritoQuestoesItens));
      }
      if (questoesPorColunaInput) {
        questoesPorColunaInput.value = String(gabaritoQuestoesPorColuna);
      }

      renderGabaritoPreview();
      renderAvaliacaoLayoutEditor();
      syncGabaritoInput();
    }

    function getCanvasPointerPosition(canvas, event) {
      if (!canvas) {
        return null;
      }

      var rect = canvas.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      // Converte para coordenadas lógicas (independente do DPR do canvas)
      return {
        x: ((event.clientX - rect.left) / rect.width) * (rect.width),
        y: ((event.clientY - rect.top) / rect.height) * (rect.height),
      };
    }

    function handleA4EditorPointerDown(event) {
      if (!gabaritoA4EditorCanvas) {
        return;
      }

      var pointer = getCanvasPointerPosition(gabaritoA4EditorCanvas, event);
      if (!pointer) {
        return;
      }

      function inRect(r, px, py) {
        return r && px >= r.x && px <= r.x + (r.width != null ? r.width : r.size)
          && py >= r.y && py <= r.y + (r.height != null ? r.height : r.size);
      }

      // 0. Background handles (when selected)
      if (gabaritoSelectionType === 'background') {
        if (gabaritoBackgroundHandleRect && inRect(gabaritoBackgroundHandleRect, pointer.x, pointer.y)) {
          gabaritoBackgroundResizing.active = true;
          gabaritoBackgroundResizing.mode = 'both';
          gabaritoBackgroundResizing.startScaleX = gabaritoBackgroundLayout.scale_x;
          gabaritoBackgroundResizing.startScaleY = gabaritoBackgroundLayout.scale_y;
          gabaritoBackgroundResizing.startPointerX = pointer.x;
          gabaritoBackgroundResizing.startPointerY = pointer.y;
          gabaritoA4EditorCanvas.classList.add('is-dragging');
          if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') { gabaritoA4EditorCanvas.setPointerCapture(event.pointerId); }
          return;
        }
        if (gabaritoBackgroundGrowWidthRect && inRect(gabaritoBackgroundGrowWidthRect, pointer.x, pointer.y)) {
          gabaritoBackgroundResizing.active = true;
          gabaritoBackgroundResizing.mode = 'width';
          gabaritoBackgroundResizing.startScaleX = gabaritoBackgroundLayout.scale_x;
          gabaritoBackgroundResizing.startScaleY = gabaritoBackgroundLayout.scale_y;
          gabaritoBackgroundResizing.startPointerX = pointer.x;
          gabaritoBackgroundResizing.startPointerY = pointer.y;
          gabaritoA4EditorCanvas.classList.add('is-dragging');
          if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') { gabaritoA4EditorCanvas.setPointerCapture(event.pointerId); }
          return;
        }
        if (gabaritoBackgroundGrowHeightRect && inRect(gabaritoBackgroundGrowHeightRect, pointer.x, pointer.y)) {
          gabaritoBackgroundResizing.active = true;
          gabaritoBackgroundResizing.mode = 'height';
          gabaritoBackgroundResizing.startScaleX = gabaritoBackgroundLayout.scale_x;
          gabaritoBackgroundResizing.startScaleY = gabaritoBackgroundLayout.scale_y;
          gabaritoBackgroundResizing.startPointerX = pointer.x;
          gabaritoBackgroundResizing.startPointerY = pointer.y;
          gabaritoA4EditorCanvas.classList.add('is-dragging');
          if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') { gabaritoA4EditorCanvas.setPointerCapture(event.pointerId); }
          return;
        }
      }

      // 0b. Background drag / select — checked LAST so objects on top take priority
      // (moved below all info box and template checks)

      // 1. Resize handle of currently-selected info box
      var selectedHandle = gabaritoSelectionType && gabaritoInfoBoxHandleRects[gabaritoSelectionType];
      if (selectedHandle && inRect(selectedHandle, pointer.x, pointer.y)) {
        var selBox = gabaritoLayout[gabaritoSelectionType + '_box'];
        if (selBox) {
          gabaritoInfoBoxResizing.active = true;
          gabaritoInfoBoxResizing.type = gabaritoSelectionType;
          gabaritoInfoBoxResizing.startWidth = selBox.width;
          gabaritoInfoBoxResizing.startHeight = selBox.height;
          gabaritoInfoBoxResizing.startPointerX = pointer.x;
          gabaritoInfoBoxResizing.startPointerY = pointer.y;
          gabaritoA4EditorCanvas.classList.add('is-dragging');
          if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') {
            gabaritoA4EditorCanvas.setPointerCapture(event.pointerId);
          }
          return;
        }
      }

      // 2. Click on info box — select + drag
      var infoBoxDefs = [
        { type: 'aluno', rect: gabaritoAlunoBoxRect },
        { type: 'qr', rect: gabaritoQrBoxRect },
        { type: 'title', rect: gabaritoTitleBoxRect },
        { type: 'numeracao', rect: gabaritoNumeracaoBoxRect },
        { type: 'disciplinas', rect: gabaritoDisciplinasBoxRect },
      ];
      for (var i = 0; i < infoBoxDefs.length; i++) {
        var def = infoBoxDefs[i];
        if (def.rect && inRect(def.rect, pointer.x, pointer.y)) {
          gabaritoSelectionType = def.type;
          gabaritoInfoBoxDragging.active = true;
          gabaritoInfoBoxDragging.type = def.type;
          gabaritoInfoBoxDragging.offsetX = pointer.x - def.rect.x;
          gabaritoInfoBoxDragging.offsetY = pointer.y - def.rect.y;
          gabaritoA4EditorCanvas.classList.add('is-dragging');
          if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') {
            gabaritoA4EditorCanvas.setPointerCapture(event.pointerId);
          }
          renderA4LayoutEditor();
          return;
        }
      }

      // 3. Template scale handle
      if (gabaritoScaleHandleRect && inRect(gabaritoScaleHandleRect, pointer.x, pointer.y)) {
        gabaritoResizing.active = true;
        gabaritoResizing.startScale = gabaritoLayout.scale;
        gabaritoResizing.startScaleX = gabaritoLayout.scaleX != null ? gabaritoLayout.scaleX : gabaritoLayout.scale;
        gabaritoResizing.startScaleY = gabaritoLayout.scaleY != null ? gabaritoLayout.scaleY : gabaritoLayout.scale;
        gabaritoResizing.startPointerX = pointer.x;
        gabaritoResizing.startPointerY = pointer.y;
        gabaritoSelectionType = '';
        gabaritoA4EditorCanvas.classList.add('is-dragging');
        if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') {
          gabaritoA4EditorCanvas.setPointerCapture(event.pointerId);
        }
        return;
      }

      // 4. Template block drag
      if (gabaritoLayoutRect && inRect(gabaritoLayoutRect, pointer.x, pointer.y)) {
        gabaritoSelectionType = '';
        gabaritoDragging.active = true;
        gabaritoDragging.offsetX = pointer.x - gabaritoLayoutRect.x;
        gabaritoDragging.offsetY = pointer.y - gabaritoLayoutRect.y;
        gabaritoA4EditorCanvas.classList.add('is-dragging');
        if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') {
          gabaritoA4EditorCanvas.setPointerCapture(event.pointerId);
        }
        return;
      }

      // 4b. Background drag / select (lowest priority — only if nothing else was hit)
      if (gabaritoBackgroundRect && inRect(gabaritoBackgroundRect, pointer.x, pointer.y)) {
        gabaritoSelectionType = 'background';
        gabaritoBackgroundDragging.active = true;
        gabaritoBackgroundDragging.offsetX = pointer.x - gabaritoBackgroundRect.x;
        gabaritoBackgroundDragging.offsetY = pointer.y - gabaritoBackgroundRect.y;
        gabaritoA4EditorCanvas.classList.add('is-dragging');
        if (typeof gabaritoA4EditorCanvas.setPointerCapture === 'function') { gabaritoA4EditorCanvas.setPointerCapture(event.pointerId); }
        renderA4LayoutEditor();
        return;
      }

      // 5. Click on empty area — deselect
      gabaritoSelectionType = '';
      renderA4LayoutEditor();
    }

    function handleA4EditorPointerMove(event) {
      if (!gabaritoA4EditorCanvas) {
        return;
      }

      var pointer = getCanvasPointerPosition(gabaritoA4EditorCanvas, event);
      if (!pointer) {
        return;
      }

      function inRect(r, px, py) {
        return r && px >= r.x && px <= r.x + (r.width != null ? r.width : r.size)
          && py >= r.y && py <= r.y + (r.height != null ? r.height : r.size);
      }

      var anyActive = gabaritoDragging.active || gabaritoResizing.active
        || gabaritoInfoBoxDragging.active || gabaritoInfoBoxResizing.active
        || gabaritoBackgroundDragging.active || gabaritoBackgroundResizing.active;

      if (!anyActive) {
        // Cursor logic
        if (gabaritoSelectionType === 'background') {
          if ((gabaritoBackgroundHandleRect && inRect(gabaritoBackgroundHandleRect, pointer.x, pointer.y))
            || (gabaritoBackgroundGrowWidthRect && inRect(gabaritoBackgroundGrowWidthRect, pointer.x, pointer.y))
            || (gabaritoBackgroundGrowHeightRect && inRect(gabaritoBackgroundGrowHeightRect, pointer.x, pointer.y))) {
            gabaritoA4EditorCanvas.style.cursor = 'nwse-resize';
            return;
          }
        }
        var selHandle = gabaritoSelectionType && gabaritoInfoBoxHandleRects[gabaritoSelectionType];
        if (selHandle && inRect(selHandle, pointer.x, pointer.y)) {
          gabaritoA4EditorCanvas.style.cursor = 'nwse-resize';
          return;
        }

        var allInfoRects = [
          gabaritoAlunoBoxRect, gabaritoQrBoxRect, gabaritoTitleBoxRect,
          gabaritoNumeracaoBoxRect, gabaritoDisciplinasBoxRect,
        ];
        var hoveringInfo = allInfoRects.some(function (r) { return inRect(r, pointer.x, pointer.y); });
        if (hoveringInfo) {
          gabaritoA4EditorCanvas.style.cursor = 'grab';
          return;
        }

        var hoveringHandle = Boolean(gabaritoScaleHandleRect)
          && inRect(gabaritoScaleHandleRect, pointer.x, pointer.y);
        var hoveringBlock = Boolean(gabaritoLayoutRect)
          && inRect(gabaritoLayoutRect, pointer.x, pointer.y);
        if (hoveringHandle || hoveringBlock) {
          gabaritoA4EditorCanvas.style.cursor = hoveringHandle ? 'nwse-resize' : 'grab';
          return;
        }

        // Background cursor — lowest priority (behind all other objects)
        if (gabaritoBackgroundRect && inRect(gabaritoBackgroundRect, pointer.x, pointer.y)) {
          gabaritoA4EditorCanvas.style.cursor = 'grab';
          return;
        }

        gabaritoA4EditorCanvas.style.cursor = 'default';
        return;
      }

      // Background drag
      if (gabaritoBackgroundDragging.active) {
        var pageMarginM = 24;
        gabaritoBackgroundLayout.x = Math.round(pointer.x - gabaritoBackgroundDragging.offsetX - pageMarginM);
        gabaritoBackgroundLayout.y = Math.round(pointer.y - gabaritoBackgroundDragging.offsetY - pageMarginM);
        renderA4LayoutEditor();
        return;
      }

      // Background resize
      if (gabaritoBackgroundResizing.active) {
        var bgBaseW = a4CanvasWidth - 48;
        var bgBaseH = a4CanvasHeight - 48;
        if (bgBaseW > 0 && (gabaritoBackgroundResizing.mode === 'both' || gabaritoBackgroundResizing.mode === 'width')) {
          var dxBg = pointer.x - gabaritoBackgroundResizing.startPointerX;
          gabaritoBackgroundLayout.scale_x = clampFloat(gabaritoBackgroundResizing.startScaleX + (dxBg / bgBaseW), 0.05, 8, 1);
        }
        if (bgBaseH > 0 && (gabaritoBackgroundResizing.mode === 'both' || gabaritoBackgroundResizing.mode === 'height')) {
          var dyBg = pointer.y - gabaritoBackgroundResizing.startPointerY;
          gabaritoBackgroundLayout.scale_y = clampFloat(gabaritoBackgroundResizing.startScaleY + (dyBg / bgBaseH), 0.05, 8, 1);
        }
        renderA4LayoutEditor();
        return;
      }

      // Info box resize
      if (gabaritoInfoBoxResizing.active) {
        var resBoxKey = gabaritoInfoBoxResizing.type + '_box';
        var resBox = gabaritoLayout[resBoxKey];
        if (resBox) {
          var minW = (gabaritoInfoBoxResizing.type === 'qr' || gabaritoInfoBoxResizing.type === 'numeracao') ? 96 : 140;
          var minH = gabaritoInfoBoxResizing.type === 'qr' ? 96 : 28;
          resBox.width = Math.max(minW, Math.round(gabaritoInfoBoxResizing.startWidth + (pointer.x - gabaritoInfoBoxResizing.startPointerX)));
          resBox.height = Math.max(minH, Math.round(gabaritoInfoBoxResizing.startHeight + (pointer.y - gabaritoInfoBoxResizing.startPointerY)));
        }
        renderA4LayoutEditor();
        return;
      }

      // Info box drag
      if (gabaritoInfoBoxDragging.active) {
        var dragBoxKey = gabaritoInfoBoxDragging.type + '_box';
        var dragBox = gabaritoLayout[dragBoxKey];
        if (dragBox) {
          dragBox.x = Math.round(pointer.x - gabaritoInfoBoxDragging.offsetX);
          dragBox.y = Math.round(pointer.y - gabaritoInfoBoxDragging.offsetY);
        }
        renderA4LayoutEditor();
        return;
      }

      // Template resize (independent W/H via drag on bottom-right corner)
      if (gabaritoResizing.active) {
        var baseWidthR = getGabaritoBaseWidth();
        var baseHeightR = getGabaritoBaseHeight();
        if (baseWidthR > 0) {
          var deltaX = pointer.x - gabaritoResizing.startPointerX;
          gabaritoLayout.scaleX = clampFloat(gabaritoResizing.startScaleX + (deltaX / baseWidthR), 0.2, 3.0, 1);
        }
        if (baseHeightR > 0) {
          var deltaY = pointer.y - gabaritoResizing.startPointerY;
          gabaritoLayout.scaleY = clampFloat(gabaritoResizing.startScaleY + (deltaY / baseHeightR), 0.2, 3.0, 1);
        }
        gabaritoLayout.scale = clampFloat((gabaritoLayout.scaleX + gabaritoLayout.scaleY) / 2, 0.2, 3.0, 1);
        updateScaleUi();
      } else {
        // Template drag
        gabaritoLayout.x = Math.round(pointer.x - gabaritoDragging.offsetX);
        gabaritoLayout.y = Math.round(pointer.y - gabaritoDragging.offsetY);
      }

      ensureGabaritoLayoutInBounds();
      renderA4LayoutEditor();
    }

    function handleA4EditorPointerUp(event) {
      var wasActive = gabaritoDragging.active || gabaritoResizing.active
        || gabaritoInfoBoxDragging.active || gabaritoInfoBoxResizing.active
        || gabaritoBackgroundDragging.active || gabaritoBackgroundResizing.active;
      if (!wasActive || !gabaritoA4EditorCanvas) {
        return;
      }

      gabaritoDragging.active = false;
      gabaritoResizing.active = false;
      gabaritoInfoBoxDragging.active = false;
      gabaritoInfoBoxDragging.type = '';
      gabaritoInfoBoxResizing.active = false;
      gabaritoInfoBoxResizing.type = '';
      gabaritoBackgroundDragging.active = false;
      gabaritoBackgroundResizing.active = false;
      gabaritoBackgroundResizing.mode = '';
      gabaritoA4EditorCanvas.classList.remove('is-dragging');

      if (typeof gabaritoA4EditorCanvas.releasePointerCapture === 'function') {
        try {
          gabaritoA4EditorCanvas.releasePointerCapture(event.pointerId);
        } catch (error) {
        }
      }

      syncGabaritoInput();
    }

    function renderGabaritoPreview() {
      if (!gabaritoPreviewCanvas || !gabaritoPreviewImage) {
        return;
      }

      gabaritoQuestoesItens = sanitizeGabaritoQuestoesItens(gabaritoQuestoesItens, 1, 4, gabaritoRespostasCorretas);
      var questoes = gabaritoQuestoesItens.length;
      var alternativas = getMaxAlternativasFromQuestoesItens(gabaritoQuestoesItens);
      var espacamentoColunasBase = 16;
      gabaritoRespostasCorretas = sanitizeGabaritoRespostas(buildRespostasFromQuestoesItens(gabaritoQuestoesItens), questoes, alternativas);
      gabaritoBubbleHitboxes = [];

      var scale = 1.0;

      var rowsPerColumn = clampInt(gabaritoQuestoesPorColuna, 1, 50, 10);
      var columnCount = Math.max(1, Math.ceil(questoes / rowsPerColumn));
      var columnGap = Math.round(espacamentoColunasBase * scale);
      var headerHeight = Math.round(11 * scale);  // espaço para A B C D E acima de cada questão
      var rowHeight = Math.round(30 * scale);
      var groupSize = 1;  // cabeçalho A B C D acima de cada questão
      var numberLabelWidth = Math.round(30 * scale);
      var numberToBubblesGap = Math.round(1 * scale);
      var bubbleRadius = Math.max(9, Math.round(14 * scale));
      var bubbleSpacing = Math.round(34 * scale);
      var rightColumnPadding = Math.round(10 * scale);
      var alternativesWidth = (alternativas > 1)
        ? ((alternativas - 1) * bubbleSpacing) + (bubbleRadius * 2)
        : (bubbleRadius * 2);
      var columnWidth = numberLabelWidth + numberToBubblesGap + alternativesWidth + rightColumnPadding;

      var borderMargin = Math.round(14 * scale);
      var markerSize = Math.round(24 * scale);
      var safePadding = borderMargin + markerSize + Math.round(6 * scale);
      var innerHorizontalPadding = Math.round(6 * scale);
      var titleAreaHeight = Math.round(10 * scale);

      var contentWidth = (columnCount * columnWidth) + ((columnCount - 1) * columnGap);
      var safeContentWidth = contentWidth + (innerHorizontalPadding * 2);
      var width = safeContentWidth + (safePadding * 2);
      width = Math.max(420, width);

      var groupCount = Math.ceil(rowsPerColumn / groupSize);
      var contentHeight = (groupCount * headerHeight) + (rowsPerColumn * rowHeight) + Math.round(6 * scale);
      var safeHeight = titleAreaHeight + contentHeight + Math.round(6 * scale);
      var height = Math.max(100, safeHeight + (safePadding * 2));

      gabaritoTemplateMarkers = {
        kind: 'legacy',
        width: width,
        height: height,
        topLeft: {
          x: borderMargin + (markerSize / 2),
          y: borderMargin + (markerSize / 2),
        },
        topRight: {
          x: width - borderMargin - (markerSize / 2),
          y: borderMargin + (markerSize / 2),
        },
        bottomLeft: {
          x: borderMargin + (markerSize / 2),
          y: height - borderMargin - (markerSize / 2),
        },
        bottomRight: {
          x: width - borderMargin - (markerSize / 2),
          y: height - borderMargin - (markerSize / 2),
        },
      };

      // Retorna o Y base (relativo a contentTop) para texto/bolinha de uma linha.
      // Cada grupo ocupa (headerHeight + groupSize * rowHeight) px: headerHeight para o cabeçalho A B C D,
      // seguido de groupSize linhas de rowHeight cada.
      function getRowY(row) {
        var group = Math.floor(row / groupSize);
        var localRow = row % groupSize;
        var groupBlockH = headerHeight + groupSize * rowHeight;
        return group * groupBlockH + headerHeight + localRow * rowHeight + Math.round(rowHeight * 0.55);
      }

      function drawGabaritoTemplate(canvasElement, includeSelections, captureHitboxes) {
        if (!(canvasElement instanceof HTMLCanvasElement)) {
          return '';
        }

        var dpr = 2;
        var canvasW = width * dpr;
        var canvasH = height * dpr;

        if (canvasElement.width !== canvasW) {
          canvasElement.width = canvasW;
        }

        if (canvasElement.height !== canvasH) {
          canvasElement.height = canvasH;
        }

        var ctx = canvasElement.getContext('2d');
        if (!ctx) {
          return '';
        }

        if (captureHitboxes) {
          gabaritoBubbleHitboxes = [];
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#111111';
        ctx.fillRect(borderMargin, borderMargin, markerSize, markerSize);
        ctx.fillRect(width - borderMargin - markerSize, borderMargin, markerSize, markerSize);
        ctx.fillRect(borderMargin, height - borderMargin - markerSize, markerSize, markerSize);
        ctx.fillRect(width - borderMargin - markerSize, height - borderMargin - markerSize, markerSize, markerSize);

        var safeLeft = safePadding;
        var safeRight = width - safePadding;
        var safeTop = safePadding;
        var safeBottom = height - safePadding;
        var availableInnerWidth = (safeRight - safeLeft) - (innerHorizontalPadding * 2);
        var contentHorizontalOffset = Math.max(0, Math.round((availableInnerWidth - contentWidth) / 2));

        ctx.strokeStyle = '#dadada';
        ctx.lineWidth = 2;
        ctx.strokeRect(safeLeft, safeTop, safeRight - safeLeft, safeBottom - safeTop);

        var contentTop = safeTop + titleAreaHeight;

        ctx.font = 'bold ' + Math.round(13 * scale) + 'px Arial, sans-serif';
        ctx.fillStyle = '#555555';
        ctx.textAlign = 'center';
        for (var hCol = 0; hCol < columnCount; hCol += 1) {
          var hBaseX = safeLeft + innerHorizontalPadding + contentHorizontalOffset + (hCol * (columnWidth + columnGap));
          var hBubblesStartX = hBaseX + numberLabelWidth + numberToBubblesGap + bubbleRadius;
          var maxAltInCol = alternativas;
          for (var qi = hCol * rowsPerColumn; qi < Math.min((hCol + 1) * rowsPerColumn, questoes); qi += 1) {
            var qItem = gabaritoQuestoesItens[qi];
            if (qItem && Array.isArray(qItem.alternativas)) {
              maxAltInCol = Math.max(maxAltInCol, qItem.alternativas.length);
            }
          }
          maxAltInCol = clampInt(maxAltInCol, 2, 10, alternativas);

          for (var hRow = 0; hRow < rowsPerColumn; hRow += groupSize) {
            var hG = Math.floor(hRow / groupSize);
            var hGroupBlockH = headerHeight + groupSize * rowHeight;
            var hGroupY = contentTop + hG * hGroupBlockH + Math.round(headerHeight * 0.75);
            for (var hAlt = 0; hAlt < maxAltInCol; hAlt += 1) {
              var hX = hBubblesStartX + (hAlt * bubbleSpacing);
              ctx.fillText(getAlternativeLetter(hAlt), hX, hGroupY);
            }
          }
        }

        ctx.textAlign = 'left';
        ctx.strokeStyle = '#111111';
        ctx.fillStyle = '#111111';
        ctx.lineWidth = 2.5;
        ctx.font = Math.round(17 * scale) + 'px Arial, sans-serif';

        for (var questionIndex = 1; questionIndex <= questoes; questionIndex += 1) {
          var questaoItem = gabaritoQuestoesItens[questionIndex - 1] || createDefaultQuestaoItem(alternativas);
          var alternativasDaQuestao = Array.isArray(questaoItem.alternativas) ? questaoItem.alternativas.length : alternativas;
          alternativasDaQuestao = clampInt(alternativasDaQuestao, 2, 10, alternativas);
          var col = Math.floor((questionIndex - 1) / rowsPerColumn);
          var row = (questionIndex - 1) % rowsPerColumn;
          var baseX = safeLeft + innerHorizontalPadding + contentHorizontalOffset + (col * (columnWidth + columnGap));
          var baseY = contentTop + getRowY(row);

          ctx.fillStyle = '#111111';
          ctx.fillText(String(questionIndex).padStart(2, '0') + '.', baseX, baseY);

          var bubblesStartX = baseX + numberLabelWidth + numberToBubblesGap + bubbleRadius;
          var selectedLetter = includeSelections
            ? String(gabaritoRespostasCorretas[String(questionIndex)] || '').trim().toUpperCase()
            : '';

          for (var altIndex = 0; altIndex < alternativasDaQuestao; altIndex += 1) {
            var bubbleCenterX = bubblesStartX + (altIndex * bubbleSpacing);
            var bubbleCenterY = baseY - Math.round(4 * scale);
            var letter = getAlternativeLetter(altIndex);
            var isSelected = selectedLetter !== '' && selectedLetter === letter;

            ctx.beginPath();
            ctx.arc(bubbleCenterX, bubbleCenterY, bubbleRadius, 0, Math.PI * 2);
            if (isSelected) {
              ctx.fillStyle = '#111111';
              ctx.fill();
              ctx.fillStyle = '#111111';
            }
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            if (captureHitboxes) {
              gabaritoBubbleHitboxes.push({
                questao: questionIndex,
                alternativa: letter,
                x: bubbleCenterX,
                y: bubbleCenterY,
                r: bubbleRadius,
              });
            }
          }
        }

        return canvasElement.toDataURL('image/png');
      }

      gabaritoPreviewLogicalWidth = width;
      gabaritoPreviewLogicalHeight = height;

      var previewDataUrl = drawGabaritoTemplate(gabaritoPreviewCanvas, true, true);
      var templateCanvas = document.createElement('canvas');
      var templateDataUrl = drawGabaritoTemplate(templateCanvas, false, false);

      gabaritoPreviewImage.setAttribute('src', previewDataUrl);
      gabaritoTemplateImage.src = templateDataUrl || previewDataUrl;
      gabaritoTemplateImage.onload = renderA4LayoutEditor;
      if (gabaritoTemplateImage.complete) {
        renderA4LayoutEditor();
      }
      syncGabaritoInput();
    }

    function handleGabaritoPreviewClick(event) {
      if (!gabaritoPreviewImage || !gabaritoPreviewCanvas || !gabaritoBubbleHitboxes.length) {
        return;
      }

      var rect = gabaritoPreviewImage.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return;
      }

      var pointerX = event.clientX - rect.left;
      var pointerY = event.clientY - rect.top;

      var canvasX = (pointerX / rect.width) * (gabaritoPreviewLogicalWidth || gabaritoPreviewCanvas.width);
      var canvasY = (pointerY / rect.height) * (gabaritoPreviewLogicalHeight || gabaritoPreviewCanvas.height);

      var clicked = null;
      for (var i = 0; i < gabaritoBubbleHitboxes.length; i += 1) {
        var bubble = gabaritoBubbleHitboxes[i];
        var dx = canvasX - bubble.x;
        var dy = canvasY - bubble.y;
        if ((dx * dx) + (dy * dy) <= (bubble.r * bubble.r)) {
          clicked = bubble;
          break;
        }
      }

      if (!clicked) {
        return;
      }

      var questionIndex = clampInt(clicked.questao, 1, gabaritoQuestoesItens.length, 0) - 1;
      if (questionIndex < 0 || questionIndex >= gabaritoQuestoesItens.length) {
        return;
      }

      var current = String(gabaritoQuestoesItens[questionIndex].correta || '').trim().toUpperCase();

      if (current === clicked.alternativa) {
        gabaritoQuestoesItens[questionIndex].correta = '';
      } else {
        gabaritoQuestoesItens[questionIndex].correta = clicked.alternativa;
      }

      renderGabaritoQuestoesEditor();
      renderGabaritoPreview();
    }

    function getGabaritoSaveUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/salvar-gabarito';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      if (form.action.indexOf('/avaliacoes/salvar') === -1) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/salvar-gabarito');
    }

    function getGabaritoBackgroundUploadUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/upload-fundo-gabarito';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      if (form.action.indexOf('/avaliacoes/salvar') === -1) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/upload-fundo-gabarito');
    }

    function isInlineAssetSource(value) {
      var normalized = String(value || '').trim();
      return /^data:/i.test(normalized) || /^blob:/i.test(normalized);
    }

    function getAssetExtensionFromMimeType(mimeType, fallbackExtension) {
      var normalized = String(mimeType || '').trim().toLowerCase();
      if (normalized === 'image/jpeg') {
        return 'jpg';
      }
      if (normalized === 'image/png') {
        return 'png';
      }
      if (normalized === 'image/webp') {
        return 'webp';
      }
      if (normalized === 'application/pdf') {
        return 'pdf';
      }
      return String(fallbackExtension || 'png').trim().toLowerCase() || 'png';
    }

    function buildUploadFileFromInlineSource(source, preferredBaseName) {
      var inlineSource = String(source || '').trim();
      if (!isInlineAssetSource(inlineSource)) {
        return Promise.resolve(null);
      }

      return fetch(inlineSource)
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Não foi possível preparar o plano de fundo para upload.');
          }
          return response.blob();
        })
        .then(function (blob) {
          var mimeType = String(blob && blob.type || '').trim().toLowerCase();
          var extension = getAssetExtensionFromMimeType(mimeType, 'png');
          var filename = String(preferredBaseName || 'layout-asset').trim() || 'layout-asset';
          filename += '-' + String(Date.now()) + '.' + extension;

          if (typeof File === 'function') {
            return new File([blob], filename, {
              type: mimeType || 'application/octet-stream',
            });
          }

          try {
            blob.name = filename;
          } catch (error) {
            // Ignore: Blob may be immutable in older browsers.
          }

          return blob;
        });
    }

    function persistGabaritoBackgroundIfNeeded() {
      var currentPath = String(gabaritoBackgroundPath || '').trim();
      var currentUrl = String(gabaritoBackgroundUrl || '').trim();
      var inlineSource = '';

      if (isInlineAssetSource(currentUrl)) {
        inlineSource = currentUrl;
      } else if (isInlineAssetSource(currentPath)) {
        inlineSource = currentPath;
      }

      if (inlineSource === '') {
        return Promise.resolve({
          path: currentPath,
          url: currentUrl,
          cache_bust: String(gabaritoBackgroundCacheBust || '').trim(),
        });
      }

      return buildUploadFileFromInlineSource(inlineSource, 'gabarito-fundo')
        .then(function (file) {
          if (!file) {
            throw new Error('Não foi possível preparar o plano de fundo para upload.');
          }

          return uploadLayoutAsset(file, getGabaritoBackgroundUploadUrl());
        })
        .then(function (uploadedAsset) {
          var persistedBackground = {
            path: String(uploadedAsset && uploadedAsset.path || '').trim(),
            url: String(uploadedAsset && uploadedAsset.url || '').trim(),
            cache_bust: String(Date.now()),
          };
          setGabaritoBackground(persistedBackground);
          return persistedBackground;
        });
    }

    function getLayoutImageUploadUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/upload-imagem-layout';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      if (form.action.indexOf('/avaliacoes/salvar') === -1) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/upload-imagem-layout');
    }

    function scheduleBrokenLayoutAssetCleanupSave() {
      if (brokenLayoutAssetSaveTimer) {
        window.clearTimeout(brokenLayoutAssetSaveTimer);
      }

      brokenLayoutAssetSaveTimer = window.setTimeout(function () {
        brokenLayoutAssetSaveTimer = null;
        saveCurrentGabaritoToDatabase(false, '', true);
      }, 900);
    }

    function updateDashboardSaveButtonVisibility() {
      if (!dashboardSaveBar) {
        return;
      }

      var tabsRoot = document.getElementById('adminAvaliacaoDashboardTabs');
      var activeTabButton = tabsRoot ? tabsRoot.querySelector('.nav-link.active') : null;
      var activeTabId = activeTabButton ? String(activeTabButton.id || '') : '';
      var shouldShow = activeTabId === 'adminAvaliacaoDashboardTabQuestoes'
        || activeTabId === 'adminAvaliacaoDashboardTabLayout'
        || activeTabId === 'adminAvaliacaoDashboardTabGabarito';

      dashboardSaveBar.classList.toggle('d-none', !shouldShow);
    }

    function uploadLayoutAsset(file, uploadUrl) {
      var targetId = Number(activeDashboardAvaliacaoId || (idInput ? idInput.value : 0) || 0);
      var csrfInput = form ? form.querySelector('input[name="csrf_token"]') : null;
      var csrfToken = csrfInput ? String(csrfInput.value || '') : '';
      var safeUploadUrl = String(uploadUrl || '').trim() || getGabaritoBackgroundUploadUrl();

      if (!file) {
        return Promise.reject(new Error('Arquivo inválido para upload.'));
      }

      if (targetId <= 0 || csrfToken === '') {
        return Promise.reject(new Error('Salve a avaliação antes de enviar arquivos de layout.'));
      }

      var uploadData = new FormData();
      uploadData.append('csrf_token', csrfToken);
      uploadData.append('id', String(targetId));
      uploadData.append('fundo', file);

      return fetch(safeUploadUrl, {
        method: 'POST',
        body: uploadData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao enviar arquivo.');
              }

              return {
                path: String(payload.path || '').trim(),
                url: String(payload.url || '').trim(),
              };
            });
        });
    }

    function saveCurrentGabaritoToDatabase(_closeModal, successMessage, silentStatus) {
      var targetId = Number(activeDashboardAvaliacaoId || (idInput ? idInput.value : 0) || 0);
      var csrfInput = form ? form.querySelector('input[name="csrf_token"]') : null;
      var csrfToken = csrfInput ? String(csrfInput.value || '') : '';
      var isSilent = silentStatus === true;

      if (targetId <= 0 || csrfToken === '') {
        if (!isSilent) {
          showGlobalStatus('Configuração aplicada no formulário. Clique em "Salvar avaliação" para gravar no banco.', false);
        }
        return Promise.resolve(false);
      }

      return persistGabaritoBackgroundIfNeeded()
        .then(function () {
          syncGabaritoInput();

          var serializedConfig = JSON.stringify(getCurrentGabaritoConfig());
          var requestData = new FormData();
          requestData.append('csrf_token', csrfToken);
          requestData.append('id', String(targetId));
          requestData.append('gabarito', serializedConfig);

          return fetch(getGabaritoSaveUrl(), {
            method: 'POST',
            body: requestData,
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
            },
          });
        })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao salvar gabarito.');
              }

              return payload;
            });
        })
        .then(function (_payload) {
          var serializedConfig = JSON.stringify(getCurrentGabaritoConfig());

          document.querySelectorAll('.js-admin-avaliacao-dashboard, .js-admin-avaliacao-edit, .js-admin-avaliacao-copy').forEach(function (button) {
            if (!(button instanceof HTMLElement)) {
              return;
            }

            var buttonId = Number(button.getAttribute('data-id') || 0);
            if (buttonId !== targetId) {
              return;
            }

            button.setAttribute('data-gabarito', serializedConfig);
          });

          setGabaritoPendingChanges(false);
          var message = String(successMessage || '').trim() || 'Gabarito salvo com sucesso.';
          if (!isSilent) {
            showGlobalStatus(message, false);
          }
          return true;
        })
        .catch(function (error) {
          if (!isSilent) {
            showGlobalStatus(error && error.message ? error.message : 'Erro ao salvar gabarito.', true);
          }
          return false;
        });
    }

    function refreshTableRefs() {
      tableRows = document.querySelectorAll('.js-admin-avaliacoes-row');

      var validIds = [];
      tableRows.forEach(function (row) {
        var rowId = Number(row.getAttribute('data-avaliacao-id') || 0);
        if (rowId > 0) {
          validIds.push(rowId);
        }
      });

      selectedAvaliacaoIdsForDelete = selectedAvaliacaoIdsForDelete.filter(function (id) {
        return validIds.indexOf(id) !== -1;
      });

      selectAllCheckbox = document.getElementById('adminAvaliacoesSelectAll');
      deleteSelectedButton = document.getElementById('adminAvaliacoesDeleteSelectedBtn');
      rebuildTableFilterControls();
      bindRowSelectionCheckboxes();
      filterTable();
    }

    function splitTableFilterValues(rawValue) {
      return String(rawValue || '')
        .split('||')
        .map(function (value) { return String(value || '').trim(); })
        .filter(Boolean);
    }

    function getTablePageSizeValue() {
      if (!tablePageSizeSelect) {
        return 0;
      }

      var rawValue = String(tablePageSizeSelect.value || 'all').trim().toLowerCase();
      if (rawValue === 'all') {
        return 0;
      }

      return clampInt(parseInt(rawValue, 10), 10, 500, 10);
    }

    function renderTableFilterButtons(targetElement, options, activeValue, emptyLabel) {
      if (!targetElement) {
        return;
      }

      var safeOptions = Array.isArray(options) ? options : [];
      var html = '';
      html += '<button type="button" class="btn btn-sm institutional-avaliacoes-filter-chip' + (activeValue === 'all' ? ' is-active' : '') + '" data-filter-value="all">Todas</button>';

      safeOptions.forEach(function (option) {
        var optionValue = String(option && option.value || '').trim();
        var optionLabel = String(option && option.label || '').trim();
        if (optionValue === '' || optionLabel === '') {
          return;
        }

        html += '<button type="button" class="btn btn-sm institutional-avaliacoes-filter-chip' + (activeValue === optionValue ? ' is-active' : '') + '" data-filter-value="' + escapeHtml(optionValue) + '">' + escapeHtml(optionLabel) + '</button>';
      });

      if (safeOptions.length === 0 && String(emptyLabel || '').trim() !== '') {
        html += '<span class="institutional-avaliacoes-filter-empty">' + escapeHtml(emptyLabel) + '</span>';
      }

      targetElement.innerHTML = html;
    }

    function rebuildTableFilterControls() {
      var cycleMap = {};
      var turmaMap = {};

      tableRows.forEach(function (row) {
        var cycleValue = String(row.getAttribute('data-filter-cycle') || '').trim();
        if (cycleValue !== '' && !cycleMap[cycleValue]) {
          cycleMap[cycleValue] = cycleValue === '1'
            ? '1º ciclo'
            : cycleValue === '2'
              ? '2º ciclo'
              : ('Ciclo ' + cycleValue);
        }

        var turmaValues = splitTableFilterValues(row.getAttribute('data-filter-turmas'));
        var turmaLabels = splitTableFilterValues(row.getAttribute('data-filter-turmas-labels'));
        turmaValues.forEach(function (value, index) {
          if (value === '') {
            return;
          }

          if (!turmaMap[value]) {
            turmaMap[value] = turmaLabels[index] || value;
          }
        });
      });

      var cycleOptions = Object.keys(cycleMap)
        .sort(function (left, right) { return Number(left) - Number(right); })
        .map(function (value) {
          return {
            value: value,
            label: cycleMap[value],
          };
        });

      var turmaOptions = Object.keys(turmaMap)
        .sort(function (left, right) {
          return String(turmaMap[left] || '').localeCompare(String(turmaMap[right] || ''), 'pt-BR', { sensitivity: 'base' });
        })
        .map(function (value) {
          return {
            value: value,
            label: turmaMap[value],
          };
        });

      if (activeTableCycleFilter !== 'all' && !cycleMap[activeTableCycleFilter]) {
        activeTableCycleFilter = 'all';
      }

      if (activeTableTurmaFilter !== 'all' && !turmaMap[activeTableTurmaFilter]) {
        activeTableTurmaFilter = 'all';
      }

      renderTableFilterButtons(tableCycleFiltersElement, cycleOptions, activeTableCycleFilter, 'Nenhum ciclo disponível');
      renderTableFilterButtons(tableTurmaFiltersElement, turmaOptions, activeTableTurmaFilter, 'Nenhuma turma disponível');
    }

    function getFilteredTableRows() {
      var searchTerm = normalizeSearchValue(tableSearchInput ? tableSearchInput.value : '');

      return Array.prototype.filter.call(tableRows, function (row) {
        var searchText = normalizeSearchValue(row.getAttribute('data-search-text') || '');
        var cycleValue = String(row.getAttribute('data-filter-cycle') || '').trim();
        var turmaValues = splitTableFilterValues(row.getAttribute('data-filter-turmas'));

        var matchesSearch = searchTerm === '' || searchText.indexOf(searchTerm) !== -1;
        var matchesCycle = activeTableCycleFilter === 'all' || cycleValue === activeTableCycleFilter;
        var matchesTurma = activeTableTurmaFilter === 'all' || turmaValues.indexOf(activeTableTurmaFilter) !== -1;

        return matchesSearch && matchesCycle && matchesTurma;
      });
    }

    function renderTablePagination(totalFilteredRows, totalPages, startIndex, endIndex) {
      if (tablePaginationInfo) {
        if (totalFilteredRows <= 0) {
          tablePaginationInfo.textContent = 'Nenhuma avaliação encontrada para os filtros atuais.';
        } else {
          tablePaginationInfo.textContent = 'Mostrando ' + String(startIndex + 1) + ' a ' + String(endIndex) + ' de ' + String(totalFilteredRows) + ' avaliação(ões).';
        }
      }

      if (tablePaginationWrap) {
        tablePaginationWrap.classList.toggle('d-none', totalFilteredRows <= 0);
      }

      if (tablePrevPageButton) {
        tablePrevPageButton.disabled = totalFilteredRows <= 0 || tableCurrentPage <= 1;
      }

      if (tableNextPageButton) {
        tableNextPageButton.disabled = totalFilteredRows <= 0 || tableCurrentPage >= totalPages;
      }

      if (!tablePaginationPages) {
        return;
      }

      if (totalFilteredRows <= 0) {
        tablePaginationPages.innerHTML = '';
        return;
      }

      var maxButtons = 5;
      var windowStart = Math.max(1, tableCurrentPage - 2);
      var windowEnd = Math.min(totalPages, windowStart + maxButtons - 1);
      windowStart = Math.max(1, windowEnd - maxButtons + 1);

      var pages = [];
      for (var page = windowStart; page <= windowEnd; page += 1) {
        pages.push(page);
      }

      tablePaginationPages.innerHTML = pages.map(function (page) {
        return '<button type="button" class="btn btn-sm ' + (page === tableCurrentPage ? 'btn-danger' : 'btn-outline-secondary') + ' institutional-avaliacoes-page-btn" data-page="' + String(page) + '">' + String(page) + '</button>';
      }).join('');
    }

    function getVisibleAvaliacaoIds() {
      var ids = [];

      tableRows.forEach(function (row) {
        if (row.classList.contains('d-none')) {
          return;
        }

        var rowId = Number(row.getAttribute('data-avaliacao-id') || 0);
        if (rowId > 0) {
          ids.push(rowId);
        }
      });

      return ids;
    }

    function syncBulkSelectionState() {
      if (deleteSelectedButton) {
        var selectedCount = selectedAvaliacaoIdsForDelete.length;
        deleteSelectedButton.disabled = selectedCount === 0;
        deleteSelectedButton.innerHTML = selectedCount > 0
          ? ('<i class="las la-trash-alt me-1"></i>Excluir selecionadas (' + selectedCount + ')')
          : '<i class="las la-trash-alt me-1"></i>Excluir selecionadas';
      }

      if (!selectAllCheckbox) {
        return;
      }

      var visibleIds = getVisibleAvaliacaoIds();

      if (!visibleIds.length) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.disabled = true;
        return;
      }

      selectAllCheckbox.disabled = false;

      var selectedVisibleCount = visibleIds.filter(function (id) {
        return selectedAvaliacaoIdsForDelete.indexOf(id) !== -1;
      }).length;

      selectAllCheckbox.checked = selectedVisibleCount === visibleIds.length;
      selectAllCheckbox.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
    }

    function bindRowSelectionCheckboxes() {
      document.querySelectorAll('.js-admin-avaliacao-select').forEach(function (checkbox) {
        var rowId = Number(checkbox.getAttribute('data-select-id') || 0);
        checkbox.checked = rowId > 0 && selectedAvaliacaoIdsForDelete.indexOf(rowId) !== -1;

        if (checkbox.dataset.boundChange === '1') {
          return;
        }

        checkbox.dataset.boundChange = '1';
        checkbox.addEventListener('change', function () {
          if (rowId <= 0) {
            return;
          }

          if (checkbox.checked) {
            if (selectedAvaliacaoIdsForDelete.indexOf(rowId) === -1) {
              selectedAvaliacaoIdsForDelete.push(rowId);
            }
          } else {
            selectedAvaliacaoIdsForDelete = selectedAvaliacaoIdsForDelete.filter(function (id) {
              return id !== rowId;
            });
          }

          syncBulkSelectionState();
        });
      });
    }

    function bindRowActionButtons() {
      document.querySelectorAll('.js-admin-avaliacao-edit').forEach(function (button) {
        if (button.dataset.boundClick === '1') {
          return;
        }

        button.dataset.boundClick = '1';
        button.addEventListener('click', function () {
          if (!idInput || !nomeInput) {
            return;
          }

          idInput.value = button.getAttribute('data-id') || '0';
          activeDashboardAvaliacaoId = Number(button.getAttribute('data-id') || 0);
          activeDashboardAvaliacaoNome = String(button.getAttribute('data-nome') || '').trim();
          nomeInput.value = button.getAttribute('data-nome') || '';

          if (aplicacaoInput) {
            aplicacaoInput.value = button.getAttribute('data-aplicacao') || '';
          }
          if (bimestreInput) {
            bimestreInput.value = button.getAttribute('data-bimestre') || '';
          }
          if (isRecuperacaoInput) {
            isRecuperacaoInput.checked = button.getAttribute('data-is-recuperacao') === '1';
          }
          if (cicloInput) {
            cicloInput.value = button.getAttribute('data-ciclo') || '';
          }
          if (isSimuladoInput) {
            isSimuladoInput.checked = button.getAttribute('data-is-simulado') === '1';
          }
          if (autorInput) {
            autorInput.value = button.getAttribute('data-autor-id') || '';
          }
          if (descricaoInput) {
            descricaoInput.value = button.getAttribute('data-descricao') || '';
          }

          restoreSelectorState(
            button.getAttribute('data-turmas-ids') || '',
            button.getAttribute('data-alunos-ids') || '',
            button.getAttribute('data-aplicadores-ids') || '',
            button.getAttribute('data-alunos-explicit') === '1'
          );

          applyGabaritoConfig(parseGabaritoConfig(button.getAttribute('data-gabarito')));

          if (submitButton) {
            submitButton.innerHTML = '<i class="las la-save me-1"></i>Atualizar avaliação';
          }

          if (formModalTitle) {
            formModalTitle.textContent = 'Editar avaliação';
          }

          openFormModal();
        });
      });

      document.querySelectorAll('.js-admin-avaliacao-copy').forEach(function (button) {
        if (button.dataset.boundClick === '1') {
          return;
        }

        button.dataset.boundClick = '1';
        button.addEventListener('click', function () {
          if (!idInput || !nomeInput) {
            return;
          }

          idInput.value = '0';
          activeDashboardAvaliacaoId = 0;
          activeDashboardAvaliacaoNome = '';
          nomeInput.value = (button.getAttribute('data-nome') || '') + ' (cópia)';

          if (aplicacaoInput) {
            aplicacaoInput.value = button.getAttribute('data-aplicacao') || '';
          }
          if (bimestreInput) {
            bimestreInput.value = button.getAttribute('data-bimestre') || '';
          }
          if (isRecuperacaoInput) {
            isRecuperacaoInput.checked = button.getAttribute('data-is-recuperacao') === '1';
          }
          if (cicloInput) {
            cicloInput.value = button.getAttribute('data-ciclo') || '';
          }
          if (isSimuladoInput) {
            isSimuladoInput.checked = button.getAttribute('data-is-simulado') === '1';
          }
          if (autorInput) {
            autorInput.value = button.getAttribute('data-autor-id') || '';
          }
          if (descricaoInput) {
            descricaoInput.value = button.getAttribute('data-descricao') || '';
          }

          restoreSelectorState(
            button.getAttribute('data-turmas-ids') || '',
            '',
            button.getAttribute('data-aplicadores-ids') || '',
            false
          );

          applyGabaritoConfig(parseGabaritoConfig(button.getAttribute('data-gabarito')));

          if (submitButton) {
            submitButton.innerHTML = '<i class="las la-save me-1"></i>Salvar avaliação';
          }

          if (formModalTitle) {
            formModalTitle.textContent = 'Copiar avaliação';
          }

          openFormModal();
        });
      });

      document.querySelectorAll('.js-admin-avaliacao-delete-trigger').forEach(function (button) {
        if (button.dataset.boundClick === '1') {
          return;
        }

        button.dataset.boundClick = '1';
        button.addEventListener('click', function () {
          var deleteForm = button.closest('.js-admin-avaliacao-delete-form');
          var itemName = button.getAttribute('data-item-name') || '';
          openDeleteConfirmModal([deleteForm], itemName);
        });
      });

      document.querySelectorAll('.js-admin-avaliacao-dashboard').forEach(function (button) {
        if (button.dataset.boundClick === '1') {
          return;
        }

        button.dataset.boundClick = '1';
        button.addEventListener('click', function () {
          activeDashboardAvaliacaoId = Number(button.getAttribute('data-id') || 0);
          activeDashboardAvaliacaoNome = String(button.getAttribute('data-nome') || '').trim();
          activeDashboardAvaliacaoAplicacao = String(button.getAttribute('data-aplicacao') || '').trim();
          activeDashboardTurmasIds = String(button.getAttribute('data-turmas-ids') || '').split(',').map(Number).filter(Boolean);
          activeDashboardAlunosIds = String(button.getAttribute('data-alunos-ids') || '').split(',').map(Number).filter(Boolean);
          impressaoTurmasSelectionInitialized = false;
          applyGabaritoConfig(parseGabaritoConfig(button.getAttribute('data-gabarito')));
          openDashboardModal(button.getAttribute('data-id'), button.getAttribute('data-nome'));
        });
      });
    }

    function refreshAvaliacoesCrudView() {
      if (!adminPanelModalBodyElement) {
        if (!listContainer) {
          return Promise.resolve(true);
        }

        return fetch(window.location.href, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          },
        })
          .then(function (response) {
            if (!response.ok) {
              throw new Error('Falha ao atualizar avaliações.');
            }

            return response.text();
          })
          .then(function (html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            var newListContainer = doc.getElementById('avaliacoesListContainer');

            if (!newListContainer) {
              return false;
            }

            var newSignature = String(newListContainer.innerHTML || '').trim();
            if (newSignature === listSignature) {
              return true;
            }

            listContainer.innerHTML = newListContainer.innerHTML;
            listSignature = newSignature;
            refreshTableRefs();
            bindRowActionButtons();
            filterTable();
            return true;
          })
          .catch(function () {
            return false;
          });
      }

      return loadAdminPanelModalContent('gerenciamento_avaliacoes', 'Gerenciamento de Avaliações');
    }

    function reloadInstitutionalAvaliacoesIfNeeded() {
      var pathname = String(window.location.pathname || '');
      var search = String(window.location.search || '');

      if (pathname.indexOf('/institucional/avaliacoes') !== -1) {
        window.location.reload();
        return true;
      }

      var isSubservicePath = pathname.indexOf('/institucional/subservico') !== -1;
      if (!isSubservicePath) {
        return false;
      }

      var searchParams;
      try {
        searchParams = new URLSearchParams(search);
      } catch (error) {
        return false;
      }

      var key = String(searchParams.get('key') || '').trim().toLowerCase();
      var normalizedKey = key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      if (normalizedKey !== 'avaliacoes' && normalizedKey !== 'cadastro_de_avaliacoes') {
        return false;
      }

      window.location.reload();
      return true;
    }

    function resetForm() {
      if (!idInput || !nomeInput) {
        return;
      }

      idInput.value = '0';
      activeDashboardAvaliacaoId = 0;
      activeDashboardAvaliacaoNome = '';
      nomeInput.value = '';

      if (aplicacaoInput) {
        aplicacaoInput.value = '';
      }
      if (bimestreInput) {
        bimestreInput.value = '';
      }
      if (isRecuperacaoInput) {
        isRecuperacaoInput.checked = false;
      }
      if (cicloInput) {
        cicloInput.value = '';
      }
      if (isSimuladoInput) {
        isSimuladoInput.checked = false;
      }
      if (autorInput) {
        autorInput.value = '';
      }

      turmaCheckboxes.forEach(function (checkbox) {
        checkbox.checked = false;
      });

      selectedAlunosRelacionadosIds = [];
      hasManualAlunosSelection = false;
      syncAlunosHiddenInputs();

      getAplicadorCheckboxes().forEach(function (cb) { cb.checked = false; });
      syncAplicadoresSelect();

      if (descricaoInput) {
        descricaoInput.value = '';
      }

      applyGabaritoConfig(null);

      updateTurmasSummary();
      updateAlunosSummary();
      updateAplicadoresSummary();
      updateAlunosModalButtonState();

      if (submitButton) {
        submitButton.innerHTML = '<i class="las la-save me-1"></i>Salvar avaliação';
      }

      if (formModalTitle) {
        formModalTitle.textContent = 'Nova avaliação';
      }
    }

    function filterTable() {
      if (!tableRows.length) {
        if (tableEmpty) {
          tableEmpty.classList.remove('d-none');
        }
        if (tablePaginationWrap) {
          tablePaginationWrap.classList.add('d-none');
        }
        return;
      }

      var filteredRows = getFilteredTableRows();
      var pageSize = getTablePageSizeValue();
      var totalFilteredRows = filteredRows.length;
      var totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalFilteredRows / pageSize)) : (totalFilteredRows > 0 ? 1 : 0);

      if (totalPages <= 0) {
        tableCurrentPage = 1;
      } else {
        tableCurrentPage = clampInt(tableCurrentPage, 1, totalPages, 1);
      }

      var startIndex = pageSize > 0 ? ((tableCurrentPage - 1) * pageSize) : 0;
      var endIndex = pageSize > 0 ? Math.min(totalFilteredRows, startIndex + pageSize) : totalFilteredRows;
      var visibleLookup = {};

      filteredRows.slice(startIndex, endIndex).forEach(function (row) {
        visibleLookup[String(row.getAttribute('data-avaliacao-id') || '')] = true;
      });

      tableRows.forEach(function (row) {
        var rowId = String(row.getAttribute('data-avaliacao-id') || '');
        row.classList.toggle('d-none', !visibleLookup[rowId]);
      });

      if (tableEmpty) {
        tableEmpty.classList.toggle('d-none', totalFilteredRows > 0);
      }

      renderTablePagination(totalFilteredRows, totalPages || 1, totalFilteredRows > 0 ? startIndex : 0, totalFilteredRows > 0 ? endIndex : 0);
      syncBulkSelectionState();
    }

    function sendDeleteRequest(deleteForm) {
      if (!deleteForm) {
        return Promise.reject(new Error('Formulário de exclusão inválido.'));
      }

      return fetch(deleteForm.action, {
        method: 'POST',
        body: new FormData(deleteForm),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao excluir avaliação.');
              }

              return payload;
            });
        });
    }

    function executeDelete(deleteForm) {
      return sendDeleteRequest(deleteForm)
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Avaliação excluída com sucesso.', false);

          if (reloadInstitutionalAvaliacoesIfNeeded()) {
            return true;
          }

          return refreshAvaliacoesCrudView();
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao excluir avaliação.', true);
        });
    }

    function applyRichTextCommand(command, value) {
      if (!activeRichTextEditable) {
        return;
      }

      activeRichTextEditable.focus();

      var selection = window.getSelection ? window.getSelection() : null;
      var hasLiveSelectionInActive = false;
      if (selection && selection.rangeCount > 0) {
        var liveRange = selection.getRangeAt(0);
        hasLiveSelectionInActive = isRangeInsideElement(liveRange, activeRichTextEditable);
      }

      if (!hasLiveSelectionInActive) {
        restoreActiveRichTextSelection();
      }

      try {
        if (command === 'foreColor') {
          document.execCommand('styleWithCSS', false, true);
        }
        document.execCommand(command, false, value || null);
      } catch (error) {
      }

      activeRichTextEditable.dispatchEvent(new Event('input', { bubbles: true }));
      saveActiveRichTextSelection();
    }

    function handleZoomButtonAction(action) {
      if (action === 'out') {
        layoutCanvasZoom = clampFloat(layoutCanvasZoom - 0.1, 0.5, 2, 1);
        applyLayoutCanvasZoom();
        return;
      }

      if (action === 'in') {
        layoutCanvasZoom = clampFloat(layoutCanvasZoom + 0.1, 0.5, 2, 1);
        applyLayoutCanvasZoom();
        return;
      }

      if (action === 'reset') {
        layoutCanvasZoom = 1;
        applyLayoutCanvasZoom();
      }
    }

    // ── end restored functions from history ──


    function markFormBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      backdrops[backdrops.length - 1].classList.add('admin-info-form-backdrop');
    }

    function markConfirmBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      backdrops[backdrops.length - 1].classList.add('admin-info-confirm-backdrop');
    }

    function markCorrecaoBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      backdrops[backdrops.length - 1].classList.add('admin-avaliacao-correcao-backdrop');
    }

    function setCorrecaoBackdropIsolation(enabled) {
      document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
        if (!(backdrop instanceof HTMLElement)) {
          return;
        }

        if (backdrop.classList.contains('admin-avaliacao-correcao-backdrop')) {
          return;
        }

        backdrop.classList.toggle('admin-avaliacao-backdrop-underlay', enabled);
      });
    }

    function blurActiveElementIfInside(modalElement) {
      if (!(modalElement instanceof HTMLElement)) {
        return;
      }

      var activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && modalElement.contains(activeElement)) {
        activeElement.blur();
      }
    }

    function normalizeHiddenModalsDisplayState() {
      document.querySelectorAll('.modal[aria-hidden="true"]').forEach(function (modalElement) {
        if (!(modalElement instanceof HTMLElement) || modalElement.classList.contains('show')) {
          return;
        }

        blurActiveElementIfInside(modalElement);
        modalElement.style.display = 'none';
      });
    }

    function cleanupOrphanedBackdrops() {
      if (document.querySelectorAll('.modal.show').length > 0) {
        return;
      }

      document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
        backdrop.remove();
      });

      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
    }

    function getCanvas2DContext(canvasElement, options) {
      if (!(canvasElement instanceof HTMLCanvasElement)) {
        return null;
      }

      try {
        return options ? canvasElement.getContext('2d', options) : canvasElement.getContext('2d');
      } catch (error) {
        return canvasElement.getContext('2d');
      }
    }

    function applyCorrecaoCanvasLevels(canvas, contrastFactor, brightnessOffset) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        return canvas;
      }

      var ctx = getCanvas2DContext(canvas, { willReadFrequently: true });
      if (!ctx) {
        return canvas;
      }

      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var contrast = Number.isFinite(contrastFactor) ? contrastFactor : 1;
      var brightness = Number.isFinite(brightnessOffset) ? brightnessOffset : 0;
      for (var index = 0; index < imageData.data.length; index += 4) {
        for (var channel = 0; channel < 3; channel += 1) {
          var normalized = imageData.data[index + channel] / 255;
          var adjusted = (((normalized - 0.5) * contrast) + 0.5) * 255 + brightness;
          imageData.data[index + channel] = Math.max(0, Math.min(255, Math.round(adjusted)));
        }
        imageData.data[index + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      return canvas;
    }

    function convertCorrecaoCanvasToGrayscale(canvas) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        return canvas;
      }

      var ctx = getCanvas2DContext(canvas, { willReadFrequently: true });
      if (!ctx) {
        return canvas;
      }

      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var w = imageData.width;
      var h = imageData.height;
      var d = imageData.data;

      // 1) Grayscale Simples
      for (var index = 0; index < d.length; index += 4) {
        var r = d[index];
        var g = d[index + 1];
        var b = d[index + 2];
        var gray = 0.299 * r + 0.587 * g + 0.114 * b;

        d[index] = gray;
        d[index + 1] = gray;
        d[index + 2] = gray;
        d[index + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas;
    }

    function createCorrecaoAffineCandidate(sourceCanvas, options) {
      if (!(sourceCanvas instanceof HTMLCanvasElement)) {
        return null;
      }

      var settings = options && typeof options === 'object' ? options : {};
      var scale = Math.max(0.2, Number(settings.scale || 1));
      var rotationDegrees = Number(settings.rotationDegrees || 0);
      var radians = (rotationDegrees * Math.PI) / 180;
      var sourceWidth = Math.max(1, Number(sourceCanvas.width || 0));
      var sourceHeight = Math.max(1, Number(sourceCanvas.height || 0));
      var scaledWidth = sourceWidth * scale;
      var scaledHeight = sourceHeight * scale;
      var cos = Math.cos(radians);
      var sin = Math.sin(radians);
      var absCos = Math.abs(cos);
      var absSin = Math.abs(sin);
      var canvasWidth = Math.max(1, Math.round((scaledWidth * absCos) + (scaledHeight * absSin)));
      var canvasHeight = Math.max(1, Math.round((scaledWidth * absSin) + (scaledHeight * absCos)));
      var canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      var ctx = getCanvas2DContext(canvas, { willReadFrequently: true });
      if (!ctx) {
        return null;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate(radians);
      ctx.scale(scale, scale);
      ctx.drawImage(sourceCanvas, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      if (settings.contrast || settings.brightness) {
        applyCorrecaoCanvasLevels(canvas, Number(settings.contrast || 1), Number(settings.brightness || 0));
      }

      return {
        canvas: canvas,
        label: String(settings.label || 'candidate'),
        rotationDegrees: rotationDegrees,
        scaleFactor: scale,
        isIdentity: rotationDegrees === 0 && Math.abs(scale - 1) < 0.001,
        mapPointToSource: function (x, y) {
          var localX = Number(x || 0) - (canvasWidth / 2);
          var localY = Number(y || 0) - (canvasHeight / 2);
          var unrotatedX = (localX * cos) + (localY * sin);
          var unrotatedY = (-localX * sin) + (localY * cos);
          var sourceX = (unrotatedX / scale) + (sourceWidth / 2);
          var sourceY = (unrotatedY / scale) + (sourceHeight / 2);
          return {
            x: Math.max(0, Math.min(sourceWidth - 1, sourceX)),
            y: Math.max(0, Math.min(sourceHeight - 1, sourceY)),
          };
        },
      };
    }



    function mapCorrecaoDetectedMarkersToSource(candidate, detectedMarkers) {
      if (!candidate || typeof candidate.mapPointToSource !== 'function' || !detectedMarkers) {
        return detectedMarkers;
      }

      var mapped = {};
      var scaleFactor = Math.max(0.2, Number(candidate.scaleFactor || 1));
      Object.keys(detectedMarkers).forEach(function (key) {
        var marker = detectedMarkers[key];
        if (!marker) {
          return;
        }

        var point = candidate.mapPointToSource(marker.x, marker.y);
        mapped[key] = {
          x: point.x,
          y: point.y,
          width: Number(marker.width || 0) / scaleFactor,
          height: Number(marker.height || 0) / scaleFactor,
          fillRatio: marker.fillRatio,
          area: Number(marker.area || 0) / Math.max(0.1, scaleFactor * scaleFactor),
          score: marker.score,
          distanceRatio: marker.distanceRatio,
          markerPatternScore: marker.markerPatternScore,
        };
      });

      return mapped;
    }





    function buildCorrecaoLayoutTemplateBaselineScores(templateSpec) {
      var spec = templateSpec && typeof templateSpec === 'object' ? templateSpec : null;
      if (!spec || !(gabaritoPreviewCanvas instanceof HTMLCanvasElement) || !Array.isArray(spec.bubbles) || !spec.bubbles.length) {
        return gabaritoBubbleTemplateScores || {};
      }

      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Number(spec.targetWidth || 0));
      canvas.height = Math.max(1, Number(spec.targetHeight || 0));
      var ctx = getCanvas2DContext(canvas, { willReadFrequently: true });
      if (!ctx) {
        return gabaritoBubbleTemplateScores || {};
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(gabaritoPreviewCanvas, 0, 0, canvas.width, canvas.height);
      convertCorrecaoCanvasToGrayscale(canvas);

      var scaleX = canvas.width / gabaritoPreviewCanvas.width;
      var scaleY = canvas.height / gabaritoPreviewCanvas.height;

      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Aplicar o mesmo processamento de limpeza usado na detecção para consistência
      removeSmallBlobsFromImageData(imageData, 18);

      var scores = {};
      spec.bubbles.forEach(function (bubble) {
        var questionKey = String(bubble && bubble.questao || '').trim();
        var alternativa = String(bubble && bubble.alternativa || '').trim().toUpperCase();
        if (questionKey === '' || alternativa === '') {
          return;
        }

        scores[buildGabaritoBubbleScoreKey(questionKey, alternativa)] = scoreBubbleMark(
          imageData,
          Number(bubble.x || 0) * scaleX,
          Number(bubble.y || 0) * scaleY,
          Math.max(5, Number(bubble.r || 0) * 0.54 * Math.max(scaleX, scaleY))
        );
      });

      return scores;
    }

    function sampleCorrecaoImageDataBilinear(imageData, x, y) {
      if (!imageData) {
        return [255, 255, 255, 255];
      }

      var width = Math.max(1, Number(imageData.width || 0));
      var height = Math.max(1, Number(imageData.height || 0));
      if (x < 0 || y < 0 || x > (width - 1) || y > (height - 1)) {
        return [255, 255, 255, 255];
      }

      var x0 = Math.floor(x);
      var y0 = Math.floor(y);
      var x1 = Math.min(width - 1, x0 + 1);
      var y1 = Math.min(height - 1, y0 + 1);
      var xWeight = x - x0;
      var yWeight = y - y0;
      var topLeftIndex = ((y0 * width) + x0) * 4;
      var topRightIndex = ((y0 * width) + x1) * 4;
      var bottomLeftIndex = ((y1 * width) + x0) * 4;
      var bottomRightIndex = ((y1 * width) + x1) * 4;
      var sampled = [0, 0, 0, 255];

      for (var channel = 0; channel < 4; channel += 1) {
        var top = (imageData.data[topLeftIndex + channel] * (1 - xWeight)) + (imageData.data[topRightIndex + channel] * xWeight);
        var bottom = (imageData.data[bottomLeftIndex + channel] * (1 - xWeight)) + (imageData.data[bottomRightIndex + channel] * xWeight);
        sampled[channel] = Math.round((top * (1 - yWeight)) + (bottom * yWeight));
      }

      return sampled;
    }





    function prepareModalOpen() {
      bindCorrecaoControlFallback();
      normalizeHiddenModalsDisplayState();
      cleanupOrphanedBackdrops();
    }

    function bindPressAction(element, handler) {
      if (!(element instanceof HTMLElement) || typeof handler !== 'function' || element.dataset.pressBound === '1') {
        return;
      }

      var lastPointerUpAt = 0;
      var lastTouchEndAt = 0;
      element.dataset.pressBound = '1';
      element.style.pointerEvents = 'auto';
      element.style.touchAction = 'manipulation';
      element.addEventListener('pointerup', function (event) {
        lastPointerUpAt = Date.now();
        event.preventDefault();
        event.stopPropagation();
        handler(event);
      });
      element.addEventListener('touchend', function (event) {
        lastTouchEndAt = Date.now();
        event.preventDefault();
        event.stopPropagation();
        handler(event);
      }, { passive: false });
      element.addEventListener('click', function (event) {
        if ((Date.now() - lastPointerUpAt) < 400 || (Date.now() - lastTouchEndAt) < 400) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        event.stopPropagation();
        handler(event);
      });
    }

    function isCorrecaoControlVisible(element) {
      if (!(element instanceof HTMLElement) || element.classList.contains('d-none')) {
        return false;
      }

      var rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function isPointerInsideElement(event, element) {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      var clientX = typeof event.clientX === 'number' ? event.clientX : null;
      var clientY = typeof event.clientY === 'number' ? event.clientY : null;
      if (clientX === null || clientY === null) {
        return false;
      }

      var rect = element.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom;
    }

    function applyCorrecaoGuideBoxLayout(guideBox, templateWidth, templateHeight) {
      if (!(guideBox instanceof HTMLElement)) {
        return;
      }

      var safeTemplateWidth = Number(templateWidth || 0);
      var safeTemplateHeight = Number(templateHeight || 0);
      if (!Number.isFinite(safeTemplateWidth) || safeTemplateWidth <= 0 || !Number.isFinite(safeTemplateHeight) || safeTemplateHeight <= 0) {
        safeTemplateWidth = a4CanvasWidth;
        safeTemplateHeight = a4CanvasHeight;
      }

      var guideContainer = guideBox.parentElement;
      var containerWidth = guideContainer ? guideContainer.clientWidth : window.innerWidth;
      var containerHeight = guideContainer ? guideContainer.clientHeight : window.innerHeight;
      var horizontalPadding = containerWidth <= 767 ? 24 : 56;
      var verticalPadding = containerHeight <= 767 ? 96 : 140;
      var maxWidthByContainer = Math.max(220, containerWidth - horizontalPadding);
      var maxHeightByContainer = Math.max(280, containerHeight - verticalPadding);
      var maxWidthByHeight = maxHeightByContainer * (safeTemplateWidth / safeTemplateHeight);
      var resolvedWidth = Math.min(maxWidthByContainer, maxWidthByHeight);
      var resolvedHeight = resolvedWidth * (safeTemplateHeight / safeTemplateWidth);

      guideBox.style.width = Math.max(220, Math.round(resolvedWidth)) + 'px';
      guideBox.style.height = Math.max(280, Math.round(resolvedHeight)) + 'px';
      guideBox.style.aspectRatio = safeTemplateWidth + ' / ' + safeTemplateHeight;
    }

    function getCorrecaoGuideTemplateSize() {
      ensureGabaritoLayoutInBounds();

      if (gabaritoLayoutRect && gabaritoLayoutRect.width > 0 && gabaritoLayoutRect.height > 0) {
        return {
          width: gabaritoLayoutRect.width,
          height: gabaritoLayoutRect.height,
        };
      }

      if (gabaritoTemplateMarkers && gabaritoTemplateMarkers.width > 0 && gabaritoTemplateMarkers.height > 0) {
        return {
          width: gabaritoTemplateMarkers.width,
          height: gabaritoTemplateMarkers.height,
        };
      }

      return {
        width: a4CanvasWidth,
        height: a4CanvasHeight,
      };
    }

    function triggerCorrecaoControlFallback(event) {
      if (!(correcaoModalElement instanceof HTMLElement) || !correcaoModalElement.classList.contains('show')) {
        return;
      }

      var controls = [
        {
          element: correcaoStopBtn,
          action: closeCorrecaoModal,
        },
        {
          element: correcaoConfirmBtn,
          action: proceedCorrecaoToGabarito,
        },
        {
          element: correcaoZeroBtn,
          action: function () { saveCorrecaoStatusForCurrentTarget('gabarito_zerado'); },
        },
        {
          element: correcaoAbsentBtn,
          action: function () { saveCorrecaoStatusForCurrentTarget('ausente'); },
        },
        {
          element: correcaoNextBtn,
          action: goToNextCorrecaoQr,
        },
        {
          element: correcaoRetryBtn,
          action: retryCorrecaoForCurrentTarget,
        },
        {
          element: correcaoCaptureBtn,
          action: captureAndCorrectCurrentSheet,
        },
        {
          element: correcaoProcessBtn,
          action: processGabaritoManually,
        },
      ];

      var targetElement = event.target instanceof HTMLElement ? event.target : null;
      for (var index = 0; index < controls.length; index += 1) {
        var control = controls[index];
        var controlElement = control.element;
        if (!isCorrecaoControlVisible(controlElement)) {
          continue;
        }

        if (targetElement && controlElement && targetElement.closest('#' + controlElement.id)) {
          return;
        }

        if (!isPointerInsideElement(event, controlElement)) {
          continue;
        }

        event.preventDefault();
        event.stopPropagation();
        control.action();
        return;
      }
    }

    function bindCorrecaoControlFallback() {
      if (document.documentElement && document.documentElement.dataset.correcaoControlFallbackBound === '1') {
        return;
      }

      if (document.documentElement) {
        document.documentElement.dataset.correcaoControlFallbackBound = '1';
      }

      document.addEventListener('pointerup', triggerCorrecaoControlFallback, true);
      document.addEventListener('click', triggerCorrecaoControlFallback, true);
    }

    function formatCorrecaoScoreValue(value) {
      var numericValue = Number(value || 0);
      if (!Number.isFinite(numericValue)) {
        numericValue = 0;
      }

      var fixed = numericValue.toFixed(2).replace('.', ',');
      return fixed.replace(/,00$/, '');
    }

    function extractPlainTextFromHtml(rawHtml) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = String(rawHtml || '');
      return String(wrapper.textContent || wrapper.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function getCorrecaoDiscursivaQuestoes() {
      if (!Array.isArray(gabaritoQuestoesItens) || !gabaritoQuestoesItens.length) {
        return [];
      }

      return gabaritoQuestoesItens.map(function (item, index) {
        var questionItem = item || createDefaultQuestaoItem(4);
        var tipo = normalizeQuestaoTipo(questionItem.tipo);
        if (tipo !== 'discursiva') {
          return null;
        }

        return {
          questionNumber: index + 1,
          tipo: tipo,
          peso: sanitizeQuestaoPeso(questionItem.peso, 1),
          enunciado: extractPlainTextFromHtml(questionItem.enunciado || ''),
        };
      }).filter(function (item) {
        return !!item;
      });
    }

    function resetCorrecaoDiscursivaModalState() {
      if (correcaoDiscursivaList) {
        correcaoDiscursivaList.innerHTML = '';
      }
      if (correcaoDiscursivaError) {
        correcaoDiscursivaError.textContent = '';
        correcaoDiscursivaError.classList.add('d-none');
      }
      correcaoDiscursivaResolver = null;
      correcaoDiscursivaRejecter = null;
    }

    function resetCorrecaoRevisaoModalState() {
      if (correcaoRevisaoList) {
        correcaoRevisaoList.innerHTML = '';
      }
      if (correcaoRevisaoSummary) {
        correcaoRevisaoSummary.textContent = 'Revise os itens destacados antes de concluir a correção desta folha.';
      }
      correcaoRevisaoResolver = null;
      correcaoRevisaoRejecter = null;
    }

    function resetCorrecaoAutoReadStability() {
      correcaoAutoReadFingerprint = '';
      correcaoAutoReadStableReads = 0;
    }

    function buildCorrecaoFlowError(code, message) {
      var error = new Error(message || 'Falha durante a correção.');
      error.code = String(code || 'correcao-flow');
      return error;
    }

    function getCorrecaoConfidenceMeta(level) {
      if (level === 'high') {
        return { label: 'Confianca alta', className: 'is-high' };
      }

      if (level === 'medium') {
        return { label: 'Confianca media', className: 'is-medium' };
      }

      if (level === 'low') {
        return { label: 'Confianca baixa', className: 'is-low' };
      }

      return { label: 'Lancamento manual', className: 'is-manual' };
    }

    function getCorrecaoAnswerConfidenceLevel(metrics) {
      if (!metrics || typeof metrics !== 'object') {
        return 'low';
      }

      if (
        Number(metrics.markStrength || 0) >= 0.62
        && Number(metrics.centerDarkGain || 0) >= 0.36
        && Number(metrics.centerBrightnessDrop || 0) >= 78
        && Number(metrics.combinedGain || 0) >= 0.24
      ) {
        return 'high';
      }

      if (
        Number(metrics.markStrength || 0) >= 0.46
        && Number(metrics.centerDarkGain || 0) >= 0.28
        && Number(metrics.centerBrightnessDrop || 0) >= 62
        && Number(metrics.combinedGain || 0) >= 0.2
      ) {
        return 'medium';
      }

      return 'low';
    }

    function buildCorrecaoAnswersFingerprint(readingResult) {
      var answers = readingResult && readingResult.answers && typeof readingResult.answers === 'object'
        ? readingResult.answers
        : {};
      var keys = Object.keys(answers).sort(function (left, right) {
        return Number(left) - Number(right);
      });

      if (!keys.length) {
        return 'blank';
      }

      return keys.map(function (questionKey) {
        return questionKey + ':' + String(answers[questionKey] || '').trim().toUpperCase();
      }).join('|');
    }

    function buildCorrecaoReviewStats(corrections) {
      var stats = {
        lowConfidence: 0,
        mediumConfidence: 0,
        highConfidence: 0,
        discursiveCount: 0,
      };

      (Array.isArray(corrections) ? corrections : []).forEach(function (item) {
        if (!item || typeof item !== 'object') {
          return;
        }

        if (item.questionType === 'discursiva') {
          stats.discursiveCount += 1;
          return;
        }

        if (item.answerConfidence === 'low') {
          stats.lowConfidence += 1;
          return;
        }

        if (item.answerConfidence === 'medium') {
          stats.mediumConfidence += 1;
          return;
        }

        if (item.answerConfidence === 'high') {
          stats.highConfidence += 1;
        }
      });

      return stats;
    }

    function shouldOpenCorrecaoReviewModal(autoMode, comparison) {
      if (autoMode !== true || !comparison || !Array.isArray(comparison.corrections)) {
        return false;
      }

      var stats = buildCorrecaoReviewStats(comparison.corrections);
      return stats.lowConfidence > 0 || stats.mediumConfidence > 0 || stats.discursiveCount > 0;
    }

    function normalizeCorrecaoDiscursivaScoreInputValue(rawValue, maxScore) {
      var sanitizedValue = String(rawValue || '').replace(/[^0-9,\.]/g, '');
      var normalizedValue = '';
      var separatorUsed = false;

      for (var index = 0; index < sanitizedValue.length; index += 1) {
        var character = sanitizedValue.charAt(index);
        if (character >= '0' && character <= '9') {
          normalizedValue += character;
          continue;
        }

        if (!separatorUsed && (character === ',' || character === '.')) {
          if (normalizedValue === '') {
            normalizedValue = '0';
          }

          normalizedValue += '.';
          separatorUsed = true;
        }
      }

      if (separatorUsed) {
        var parts = normalizedValue.split('.');
        normalizedValue = parts[0] + '.' + String(parts[1] || '').slice(0, 2);
      }

      if (normalizedValue !== '') {
        var parsedValue = Number.parseFloat(normalizedValue);
        if (Number.isFinite(parsedValue) && parsedValue > maxScore) {
          normalizedValue = String(maxScore);
        }
      }

      return normalizedValue.replace('.', ',');
    }

    function collectCorrecaoDiscursivaScoresFromModal() {
      if (!correcaoDiscursivaList) {
        return {};
      }

      var result = {};
      var invalidMessages = [];
      correcaoDiscursivaList.querySelectorAll('.js-admin-correcao-discursiva-score-input').forEach(function (input) {
        if (!(input instanceof HTMLInputElement)) {
          return;
        }

        var questionNumber = clampInt(input.getAttribute('data-question-number'), 1, 9999, 0);
        var peso = sanitizeQuestaoPeso(input.getAttribute('data-max-score'), 1);
        if (questionNumber <= 0) {
          return;
        }

        var rawValue = String(input.value || '').trim().replace(',', '.');
        if (rawValue === '') {
          invalidMessages.push('Informe a nota da questão ' + questionNumber + '.');
          return;
        }

        if (!/^(?:\d+|\d*\.\d{1,2})$/.test(rawValue)) {
          invalidMessages.push('A nota da questão ' + questionNumber + ' deve usar no máximo 2 casas decimais.');
          return;
        }

        var parsedValue = Number.parseFloat(rawValue);
        if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > peso) {
          invalidMessages.push('A nota da questão ' + questionNumber + ' deve ficar entre 0 e ' + formatCorrecaoScoreValue(peso) + '.');
          return;
        }

        result[String(questionNumber)] = Math.round(parsedValue * 100) / 100;
      });

      if (invalidMessages.length) {
        throw new Error(invalidMessages[0]);
      }

      return result;
    }

    function openCorrecaoDiscursivaModal(entries) {
      if (!correcaoDiscursivaModalInstance || !correcaoDiscursivaList) {
        return Promise.resolve({});
      }

      resetCorrecaoDiscursivaModalState();
      if (correcaoDiscursivaSummary) {
        correcaoDiscursivaSummary.textContent = entries.length === 1
          ? 'Preencha a nota da questão discursiva antes de concluir a correção.'
          : ('Preencha as notas das ' + entries.length + ' questões discursivas antes de concluir a correção.');
      }

      entries.forEach(function (entry) {
        var itemElement = document.createElement('div');
        itemElement.className = 'admin-avaliacao-correcao-discursiva-item';

        var titleElement = document.createElement('div');
        titleElement.className = 'admin-avaliacao-correcao-discursiva-item-title mb-1';
        titleElement.textContent = 'Questão ' + entry.questionNumber;
        itemElement.appendChild(titleElement);

        var metaElement = document.createElement('div');
        metaElement.className = 'admin-avaliacao-correcao-discursiva-item-meta mb-2';
        metaElement.textContent = 'Pontuação máxima: ' + formatCorrecaoScoreValue(entry.peso);
        itemElement.appendChild(metaElement);

        if (entry.enunciado !== '') {
          var textElement = document.createElement('div');
          textElement.className = 'admin-avaliacao-correcao-discursiva-item-text mb-3';
          textElement.textContent = entry.enunciado;
          itemElement.appendChild(textElement);
        }

        var formRow = document.createElement('div');
        formRow.className = 'd-flex flex-wrap align-items-center gap-2';

        var labelElement = document.createElement('label');
        labelElement.className = 'small text-secondary';
        labelElement.setAttribute('for', 'adminAvaliacaoCorrecaoDiscursivaInput' + entry.questionNumber);
        labelElement.textContent = 'Nota';
        formRow.appendChild(labelElement);

        var inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'form-control form-control-sm js-admin-correcao-discursiva-score-input';
        inputElement.id = 'adminAvaliacaoCorrecaoDiscursivaInput' + entry.questionNumber;
        inputElement.value = '0';
        inputElement.placeholder = '0,0';
        inputElement.autocomplete = 'off';
        inputElement.setAttribute('inputmode', 'decimal');
        inputElement.setAttribute('pattern', '^(?:\\d+|\\d*[,.]\\d{1,2})$');
        inputElement.setAttribute('data-question-number', String(entry.questionNumber));
        inputElement.setAttribute('data-max-score', String(entry.peso));
        inputElement.addEventListener('input', function () {
          inputElement.value = normalizeCorrecaoDiscursivaScoreInputValue(inputElement.value, entry.peso);
        });
        formRow.appendChild(inputElement);

        var suffixElement = document.createElement('span');
        suffixElement.className = 'small text-secondary';
        suffixElement.textContent = 'de ' + formatCorrecaoScoreValue(entry.peso);
        formRow.appendChild(suffixElement);

        itemElement.appendChild(formRow);
        correcaoDiscursivaList.appendChild(itemElement);
      });

      return new Promise(function (resolve, reject) {
        correcaoDiscursivaResolver = resolve;
        correcaoDiscursivaRejecter = reject;
        correcaoDiscursivaModalInstance.show();
        setTimeout(function () {
          var firstInput = correcaoDiscursivaList.querySelector('.js-admin-correcao-discursiva-score-input');
          if (firstInput instanceof HTMLElement) {
            firstInput.focus({ preventScroll: true });
            if (window.innerWidth > 767 && typeof firstInput.select === 'function') {
              firstInput.select();
            }
          }
        }, 0);
      });
    }

    function closeCorrecaoDiscursivaModal() {
      if (correcaoDiscursivaModalElement instanceof HTMLElement) {
        blurActiveElementIfInside(correcaoDiscursivaModalElement);
      }

      if (!correcaoDiscursivaModalInstance) {
        resetCorrecaoDiscursivaModalState();
        return;
      }

      correcaoDiscursivaModalInstance.hide();
    }

    function submitCorrecaoDiscursivaModal() {
      if (!correcaoDiscursivaResolver) {
        closeCorrecaoDiscursivaModal();
        return;
      }

      try {
        var scores = collectCorrecaoDiscursivaScoresFromModal();
        var resolver = correcaoDiscursivaResolver;
        correcaoDiscursivaResolver = null;
        correcaoDiscursivaRejecter = null;
        if (correcaoDiscursivaError) {
          correcaoDiscursivaError.textContent = '';
          correcaoDiscursivaError.classList.add('d-none');
        }
        resolver(scores);
        closeCorrecaoDiscursivaModal();
      } catch (error) {
        if (correcaoDiscursivaError) {
          correcaoDiscursivaError.textContent = error && error.message ? error.message : 'Não foi possível validar as notas.';
          correcaoDiscursivaError.classList.remove('d-none');
        }
      }
    }

    function cancelCorrecaoDiscursivaModal() {
      if (correcaoDiscursivaRejecter) {
        var rejecter = correcaoDiscursivaRejecter;
        correcaoDiscursivaResolver = null;
        correcaoDiscursivaRejecter = null;
        rejecter(buildCorrecaoFlowError('correcao-discursiva-cancelled', 'Lançamento das notas discursivas cancelado.'));
      }
      closeCorrecaoDiscursivaModal();
    }

    function openCorrecaoRevisaoModal(reviewPayload) {
      if (!correcaoRevisaoModalInstance || !correcaoRevisaoList) {
        return Promise.resolve(true);
      }

      resetCorrecaoRevisaoModalState();

      var comparison = reviewPayload && reviewPayload.comparison ? reviewPayload.comparison : null;
      var alunoNome = reviewPayload && reviewPayload.alunoNome ? String(reviewPayload.alunoNome || '').trim() : '';
      var stats = buildCorrecaoReviewStats(comparison && comparison.corrections ? comparison.corrections : []);
      var reviewItems = (comparison && Array.isArray(comparison.corrections) ? comparison.corrections : []).filter(function (item) {
        return item && (item.questionType === 'discursiva' || item.answerConfidence === 'low' || item.answerConfidence === 'medium');
      });

      if (correcaoRevisaoSummary) {
        var summaryParts = [];
        if (alunoNome !== '') {
          summaryParts.push(alunoNome);
        }
        if (comparison) {
          summaryParts.push('Pontuacao ' + formatCorrecaoScoreValue(comparison.earnedPoints) + ' de ' + formatCorrecaoScoreValue(comparison.totalPoints));
        }
        if (stats.lowConfidence > 0) {
          summaryParts.push(stats.lowConfidence + ' leitura(s) com confianca baixa');
        } else if (stats.mediumConfidence > 0) {
          summaryParts.push(stats.mediumConfidence + ' leitura(s) com confianca media');
        } else if (stats.discursiveCount > 0) {
          summaryParts.push(stats.discursiveCount + ' questao(oes) discursiva(s) lancada(s)');
        }
        correcaoRevisaoSummary.textContent = summaryParts.join(' • ');
      }

      reviewItems.forEach(function (item) {
        var itemElement = document.createElement('div');
        itemElement.className = 'admin-avaliacao-correcao-revisao-item';

        var headerElement = document.createElement('div');
        headerElement.className = 'admin-avaliacao-correcao-revisao-item-header';

        var titleElement = document.createElement('div');
        titleElement.className = 'admin-avaliacao-correcao-revisao-item-title';
        titleElement.textContent = 'Questao ' + item.questionNumber;
        headerElement.appendChild(titleElement);

        var badgeMeta = getCorrecaoConfidenceMeta(item.questionType === 'discursiva' ? 'manual' : item.answerConfidence);
        var badgeElement = document.createElement('span');
        badgeElement.className = 'admin-avaliacao-correcao-revisao-badge ' + badgeMeta.className;
        badgeElement.textContent = badgeMeta.label;
        headerElement.appendChild(badgeElement);

        itemElement.appendChild(headerElement);

        var linesElement = document.createElement('div');
        linesElement.className = 'admin-avaliacao-correcao-revisao-lines';

        if (item.questionType === 'discursiva') {
          var scoreLine = document.createElement('div');
          scoreLine.className = 'admin-avaliacao-correcao-revisao-line';
          scoreLine.textContent = 'Nota informada: ' + formatCorrecaoScoreValue(item.pontuacao) + ' de ' + formatCorrecaoScoreValue(item.pontuacao_maxima);
          linesElement.appendChild(scoreLine);
        } else {
          var answerLine = document.createElement('div');
          answerLine.className = 'admin-avaliacao-correcao-revisao-line';
          answerLine.textContent = 'Leitura: ' + (item.studentAnswer === '*' ? 'Múltiplas marcações' : (item.studentAnswer || 'Em branco')) + ' • Gabarito: ' + (item.correctAnswer || '-');
          linesElement.appendChild(answerLine);

          var resultLine = document.createElement('div');
          resultLine.className = 'admin-avaliacao-correcao-revisao-line';
          resultLine.textContent = item.studentAnswer === null
            ? 'Resultado: em branco'
            : item.studentAnswer === '*'
              ? 'Resultado: incorreta (múltiplas marcações)'
              : (item.isCorrect ? 'Resultado: correta' : 'Resultado: incorreta');
          linesElement.appendChild(resultLine);

          if (typeof item.readStrength === 'number' && Number.isFinite(item.readStrength)) {
            var metricLine = document.createElement('div');
            metricLine.className = 'admin-avaliacao-correcao-revisao-line';
            metricLine.textContent = 'Forca da leitura: ' + item.readStrength.toFixed(2);
            linesElement.appendChild(metricLine);
          }
        }

        itemElement.appendChild(linesElement);
        correcaoRevisaoList.appendChild(itemElement);
      });

      return new Promise(function (resolve, reject) {
        correcaoRevisaoResolver = resolve;
        correcaoRevisaoRejecter = reject;
        correcaoRevisaoModalInstance.show();
      });
    }

    function closeCorrecaoRevisaoModal() {
      if (correcaoRevisaoModalElement instanceof HTMLElement) {
        blurActiveElementIfInside(correcaoRevisaoModalElement);
      }

      if (!correcaoRevisaoModalInstance) {
        resetCorrecaoRevisaoModalState();
        return;
      }

      correcaoRevisaoModalInstance.hide();
    }

    function confirmCorrecaoRevisaoModal() {
      if (correcaoRevisaoResolver) {
        var resolver = correcaoRevisaoResolver;
        correcaoRevisaoResolver = null;
        correcaoRevisaoRejecter = null;
        resolver(true);
      }
      closeCorrecaoRevisaoModal();
    }

    function cancelCorrecaoRevisaoModal() {
      if (correcaoRevisaoRejecter) {
        var rejecter = correcaoRevisaoRejecter;
        correcaoRevisaoResolver = null;
        correcaoRevisaoRejecter = null;
        rejecter(buildCorrecaoFlowError('correcao-review-cancelled', 'Revisão cancelada pelo usuário.'));
      }
      closeCorrecaoRevisaoModal();
    }

    function openFormModal() {
      if (!formModalInstance) {
        return;
      }

      prepareModalOpen();
      formModalInstance.show();
      setTimeout(markFormBackdrop, 0);
    }

    function openDeleteConfirmModal(deleteForms, itemName) {
      if (!deleteConfirmModalInstance) {
        return;
      }

      var forms = Array.isArray(deleteForms)
        ? deleteForms.filter(function (item) { return Boolean(item); })
        : [];

      if (!forms.length) {
        return;
      }

      prepareModalOpen();
      pendingDeleteForms = forms;
      if (deleteConfirmTextElement) {
        if (forms.length > 1) {
          deleteConfirmTextElement.textContent = 'Deseja realmente excluir as ' + forms.length + ' avaliações selecionadas?';
        } else {
          var label = String(itemName || '').trim();
          deleteConfirmTextElement.textContent = label !== ''
            ? ('Deseja realmente excluir "' + label + '"?')
            : 'Deseja realmente excluir esta avaliação?';
        }
      }

      deleteConfirmModalInstance.show();
      setTimeout(markConfirmBackdrop, 0);
    }

    function openDashboardModal(avaliacaoId, avaliacaoNome) {
      if (!dashboardModalInstance) {
        return;
      }

      var safeId = Number(avaliacaoId || 0);
      var safeNome = String(avaliacaoNome || '').trim();
      if (dashboardModalTitle) {
        dashboardModalTitle.textContent = safeNome !== ''
          ? ('Painel da Avaliação: ' + safeNome)
          : (safeId > 0 ? ('Painel da Avaliação #' + safeId) : 'Painel da Avaliação');
      }

      var canAccessConfiguracoes = isAdminViewer || (currentUserId > 0 && currentUserId === activeDashboardAutorId);
      if (dashboardGabaritoTab) {
        var gabaritoTabItem = dashboardGabaritoTab.closest('.nav-item');
        if (gabaritoTabItem) {
          if (canAccessConfiguracoes) {
            gabaritoTabItem.classList.remove('d-none');
          } else {
            gabaritoTabItem.classList.add('d-none');
          }
        }
      }

      if (dashboardStatsTab && typeof bootstrap !== 'undefined' && bootstrap.Tab) {
        bootstrap.Tab.getOrCreateInstance(dashboardStatsTab).show();
      } else if (canAccessConfiguracoes && dashboardGabaritoTab && typeof bootstrap !== 'undefined' && bootstrap.Tab) {
        bootstrap.Tab.getOrCreateInstance(dashboardGabaritoTab).show();
      }

      prepareModalOpen();
      dashboardModalInstance.show();
      setTimeout(markFormBackdrop, 0);
    }

    function clampInt(value, minValue, maxValue, fallbackValue) {
      var normalized = value === null || value === undefined ? '' : String(value);
      var parsed = Number.parseInt(normalized, 10);
      if (!Number.isFinite(parsed)) {
        return fallbackValue;
      }

      if (parsed < minValue) {
        return minValue;
      }

      if (parsed > maxValue) {
        return maxValue;
      }

      return parsed;
    }

    function clampFloat(value, minValue, maxValue, fallbackValue) {
      var normalized = value === null || value === undefined ? '' : String(value);
      var parsed = Number.parseFloat(normalized);
      if (!Number.isFinite(parsed)) {
        return fallbackValue;
      }

      if (parsed < minValue) {
        return minValue;
      }

      if (parsed > maxValue) {
        return maxValue;
      }

      return parsed;
    }

    function sanitizeQuestaoPeso(value, fallbackValue) {
      var safeFallback = clampFloat(fallbackValue, 0, Number.MAX_VALUE, 1);
      var parsed = clampFloat(value, 0, Number.MAX_VALUE, safeFallback);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return safeFallback > 0 ? safeFallback : 1;
      }
      return Math.round(parsed * 100) / 100;
    }

    function normalizeQuestaoTipo(value) {
      var normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'discursiva' || normalized === 'discursivo') {
        return 'discursiva';
      }
      if (normalized === 'vf' || normalized === 'v/f' || normalized === 'verdadeiro-falso' || normalized === 'verdadeiro_falso') {
        return 'vf';
      }
      return 'multipla';
    }

    function isQuestaoObjetiva(value) {
      var tipo = normalizeQuestaoTipo(value);
      return tipo === 'multipla' || tipo === 'vf';
    }

    function getQuestaoTipoLabel(value) {
      var tipo = normalizeQuestaoTipo(value);
      if (tipo === 'discursiva') {
        return 'Discursiva';
      }
      if (tipo === 'vf') {
        return 'V/F';
      }
      return 'Múltipla escolha';
    }

    function sanitizeQuestaoMetaField(value) {
      if (value === null || value === undefined) {
        return '';
      }

      var normalized = richTextToPlainText(String(value));
      return normalized.replace(/\s+/g, ' ').trim();
    }

    function getQuestaoAlternativaLabels(item, fallbackAlternativasCount) {
      var safeItem = sanitizeQuestaoItem(item);
      var tipo = normalizeQuestaoTipo(safeItem.tipo);
      if (!isQuestaoObjetiva(tipo)) {
        return [];
      }

      var totalAlternativas = tipo === 'vf'
        ? 2
        : clampInt(
          Array.isArray(safeItem.alternativas) && safeItem.alternativas.length
            ? safeItem.alternativas.length
            : fallbackAlternativasCount,
          2,
          10,
          4
        );
      var labels = [];
      for (var altIndex = 0; altIndex < totalAlternativas; altIndex += 1) {
        labels.push(getQuestaoAltLabel(tipo, altIndex));
      }

      return labels;
    }

    function sanitizeHexColor(rawColor, fallbackColor) {
      var color = String(rawColor || '').trim();
      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
        return color;
      }

      return fallbackColor;
    }

    function sanitizeLayoutTextRanges(rawRanges, maxLength) {
      var safeLength = Math.max(0, clampInt(maxLength, 0, 99999, 0));
      if (!Array.isArray(rawRanges) || safeLength <= 0) {
        return [];
      }

      var normalized = rawRanges.map(function (entry) {
        var start = clampInt(entry && entry.start, 0, safeLength, 0);
        var end = clampInt(entry && entry.end, 0, safeLength, 0);
        if (end <= start) {
          return null;
        }
        return {
          start: start,
          end: end,
        };
      }).filter(Boolean).sort(function (left, right) {
        if (left.start !== right.start) {
          return left.start - right.start;
        }
        return left.end - right.end;
      });

      if (!normalized.length) {
        return [];
      }

      var merged = [normalized[0]];
      for (var index = 1; index < normalized.length; index += 1) {
        var current = normalized[index];
        var last = merged[merged.length - 1];
        if (current.start <= last.end) {
          last.end = Math.max(last.end, current.end);
          continue;
        }
        merged.push(current);
      }

      return merged;
    }

    function isIndexInLayoutTextRanges(index, ranges) {
      var safeIndex = clampInt(index, 0, 99999, -1);
      if (safeIndex < 0 || !Array.isArray(ranges) || !ranges.length) {
        return false;
      }

      for (var rangeIndex = 0; rangeIndex < ranges.length; rangeIndex += 1) {
        var range = ranges[rangeIndex];
        if (!range) {
          continue;
        }

        if (safeIndex < range.start) {
          return false;
        }

        if (safeIndex >= range.start && safeIndex < range.end) {
          return true;
        }
      }

      return false;
    }

    function buildLayoutTextRangesFromFlags(flags) {
      if (!Array.isArray(flags) || !flags.length) {
        return [];
      }

      var ranges = [];
      var currentStart = -1;

      for (var index = 0; index < flags.length; index += 1) {
        var active = flags[index] === true;
        if (active && currentStart < 0) {
          currentStart = index;
          continue;
        }

        if (!active && currentStart >= 0) {
          ranges.push({
            start: currentStart,
            end: index,
          });
          currentStart = -1;
        }
      }

      if (currentStart >= 0) {
        ranges.push({
          start: currentStart,
          end: flags.length,
        });
      }

      return sanitizeLayoutTextRanges(ranges, flags.length);
    }

    function sanitizeGabaritoLayout(rawLayout) {
      if (!rawLayout || typeof rawLayout !== 'object') {
        return {
          x: 78,
          y: 360,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          aluno_box: {
            x: 26,
            y: 26,
            width: a4CanvasWidth - 228,
            height: 96,
          },
          qr_box: {
            x: 614,
            y: 26,
            width: 148,
            height: 148,
          },
          title_box: {
            x: 26,
            y: 142,
            width: 340,
            height: 64,
          },
          numeracao_box: {
            x: 528,
            y: 142,
            width: 170,
            height: 34,
          },
          disciplinas_box: {
            x: 26,
            y: 204,
            width: 360,
            height: 80,
          },
        };
      }

      return {
        x: clampInt(rawLayout.x, 0, a4CanvasWidth, 78),
        y: clampInt(rawLayout.y, 0, a4CanvasHeight, 360),
        scale: clampFloat(rawLayout.scale, 0.2, 3.0, 1),
        scaleX: clampFloat(rawLayout.scaleX != null ? rawLayout.scaleX : rawLayout.scale, 0.2, 3.0, 1),
        scaleY: clampFloat(rawLayout.scaleY != null ? rawLayout.scaleY : rawLayout.scale, 0.2, 3.0, 1),
        aluno_box: {
          x: clampFloat(rawLayout.aluno_box && rawLayout.aluno_box.x, -2000, 2000, 26),
          y: clampFloat(rawLayout.aluno_box && rawLayout.aluno_box.y, -2000, 2000, 26),
          width: clampFloat(rawLayout.aluno_box && rawLayout.aluno_box.width, 180, 2000, a4CanvasWidth - 228),
          height: clampFloat(rawLayout.aluno_box && rawLayout.aluno_box.height, 72, 2000, 96),
        },
        qr_box: {
          x: clampFloat(rawLayout.qr_box && rawLayout.qr_box.x, -2000, 2000, 614),
          y: clampFloat(rawLayout.qr_box && rawLayout.qr_box.y, -2000, 2000, 26),
          width: clampFloat(rawLayout.qr_box && rawLayout.qr_box.width, 96, 2000, 148),
          height: clampFloat(rawLayout.qr_box && rawLayout.qr_box.height, 96, 2000, 148),
        },
        title_box: {
          x: clampFloat(rawLayout.title_box && rawLayout.title_box.x, -2000, 2000, 26),
          y: clampFloat(rawLayout.title_box && rawLayout.title_box.y, -2000, 2000, 142),
          width: clampFloat(rawLayout.title_box && rawLayout.title_box.width, 140, 2000, 340),
          height: clampFloat(rawLayout.title_box && rawLayout.title_box.height, 24, 2000, 64),
        },
        numeracao_box: {
          x: clampFloat(rawLayout.numeracao_box && rawLayout.numeracao_box.x, -2000, 2000, 528),
          y: clampFloat(rawLayout.numeracao_box && rawLayout.numeracao_box.y, -2000, 2000, 142),
          width: clampFloat(rawLayout.numeracao_box && rawLayout.numeracao_box.width, 140, 2000, 170),
          height: clampFloat(rawLayout.numeracao_box && rawLayout.numeracao_box.height, 30, 2000, 34),
        },
        disciplinas_box: {
          x: clampFloat(rawLayout.disciplinas_box && rawLayout.disciplinas_box.x, -2000, 2000, 26),
          y: clampFloat(rawLayout.disciplinas_box && rawLayout.disciplinas_box.y, -2000, 2000, 204),
          width: clampFloat(rawLayout.disciplinas_box && rawLayout.disciplinas_box.width, 180, 2000, 360),
          height: clampFloat(rawLayout.disciplinas_box && rawLayout.disciplinas_box.height, 28, 2000, 80),
        },
      };
    }

    function getCurrentGabaritoAvaliacaoTitle() {
      var formTitle = nomeInput ? String(nomeInput.value || '').trim() : '';
      if (formTitle !== '') {
        return formTitle;
      }

      var dashboardTitle = String(activeDashboardAvaliacaoNome || '').trim();
      if (dashboardTitle !== '') {
        return dashboardTitle;
      }

      var currentId = Number(activeDashboardAvaliacaoId || (idInput ? idInput.value : 0) || 0);
      return currentId > 0 ? ('Avaliação #' + String(currentId)) : 'Título da prova';
    }

    function getGabaritoInfoBoxSpecs(ctx, pageRect, titleText, numeracaoText, disciplinasLines) {
      var pageWidth = pageRect && pageRect.width ? pageRect.width : Math.max(0, a4CanvasWidth - 48);
      var pageHeight = pageRect && pageRect.height ? pageRect.height : Math.max(0, a4CanvasHeight - 48);
      var titleBoxSize = getGabaritoTitleBoxSize(ctx, pageWidth, titleText);
      var numeracaoBoxSize = getGabaritoNumeracaoBoxSize(ctx, pageWidth, numeracaoText);
      var safeDisciplinasLines = Array.isArray(disciplinasLines) && disciplinasLines.length ? disciplinasLines : ['Nenhuma disciplina informada'];
      var disciplinasDefaultHeight = 32 + (safeDisciplinasLines.length * 24);

      return {
        aluno_box: {
          defaultX: 26,
          defaultY: 26,
          defaultWidth: Math.max(180, pageWidth - 180),
          defaultHeight: 96,
          minWidth: 140,
          minHeight: 28,
        },
        qr_box: {
          defaultX: Math.max(0, pageWidth - 174),
          defaultY: 26,
          defaultWidth: 148,
          defaultHeight: 148,
          minWidth: 96,
          minHeight: 96,
        },
        title_box: {
          defaultX: 26,
          defaultY: 142,
          defaultWidth: titleBoxSize.width,
          defaultHeight: titleBoxSize.height,
          minWidth: 140,
          minHeight: 28,
        },
        numeracao_box: {
          defaultX: Math.max(0, pageWidth - numeracaoBoxSize.width - 26),
          defaultY: 142,
          defaultWidth: numeracaoBoxSize.width,
          defaultHeight: numeracaoBoxSize.height,
          minWidth: 96,
          minHeight: 28,
        },
        disciplinas_box: {
          defaultX: 26,
          defaultY: 204,
          defaultWidth: Math.min(360, Math.max(240, Math.round(pageWidth * 0.5))),
          defaultHeight: disciplinasDefaultHeight,
          minWidth: 140,
          minHeight: 28,
        },
      };
    }

    function buildGabaritoInfoBoxes(ctx, pageRect, pageData, shouldPersist) {
      var safePageData = pageData && typeof pageData === 'object' ? pageData : {};
      var titleText = String(safePageData.avaliacaoNome || getCurrentGabaritoAvaliacaoTitle()).trim();
      var numeracaoText = String(safePageData.numeracaoLabel || getCurrentGabaritoNumeracaoLabel()).trim();
      var disciplinasList = getConfiguredDisciplinasList();
      var disciplinasLines = disciplinasList.length ? disciplinasList : ['Nenhuma disciplina informada'];
      var specs = getGabaritoInfoBoxSpecs(ctx, pageRect, titleText, numeracaoText, disciplinasLines);

      function buildBox(boxKey) {
        var spec = specs[boxKey] || {};
        var currentBox = gabaritoLayout && gabaritoLayout[boxKey] && typeof gabaritoLayout[boxKey] === 'object'
          ? gabaritoLayout[boxKey]
          : {};
        var width = clampFloat(currentBox.width, spec.minWidth, a4CanvasWidth, spec.defaultWidth);
        var height = clampFloat(currentBox.height, spec.minHeight, a4CanvasHeight, spec.defaultHeight);
        var x = clampFloat(currentBox.x, 0, Math.max(0, a4CanvasWidth - width), pageRect.x + spec.defaultX);
        var y = clampFloat(currentBox.y, 0, Math.max(0, a4CanvasHeight - height), pageRect.y + spec.defaultY);

        if (shouldPersist !== false) {
          if (!gabaritoLayout[boxKey] || typeof gabaritoLayout[boxKey] !== 'object') {
            gabaritoLayout[boxKey] = {};
          }
          gabaritoLayout[boxKey].x = x;
          gabaritoLayout[boxKey].y = y;
          gabaritoLayout[boxKey].width = width;
          gabaritoLayout[boxKey].height = height;
        }

        return {
          x: x,
          y: y,
          width: width,
          height: height,
        };
      }

      return {
        titleText: titleText,
        numeracaoText: numeracaoText,
        disciplinasLines: disciplinasLines,
        specs: specs,
        alunoBox: buildBox('aluno_box'),
        qrBox: buildBox('qr_box'),
        titleBox: buildBox('title_box'),
        numeracaoBox: buildBox('numeracao_box'),
        disciplinasBox: buildBox('disciplinas_box'),
      };
    }

    function getConfiguredDisciplinasList() {
      var disciplinas = [];
      var seenIds = {};
      var seenNomes = {};

      if (!Array.isArray(gabaritoQuestoesItens)) {
        return disciplinas;
      }

      gabaritoQuestoesItens.forEach(function (item) {
        var discId = String(item && item.disciplina || '').trim();
        if (discId === '' || seenIds[discId]) {
          return;
        }
        seenIds[discId] = true;

        var match = (disciplinasOptions || []).filter(function (d) { return String(d.id) === discId; });
        var nome = match.length > 0 ? String(match[0].nome || discId) : discId;
        var normalized = nome.toLowerCase();
        if (seenNomes[normalized]) {
          return;
        }
        seenNomes[normalized] = true;
        disciplinas.push(nome);
      });

      return disciplinas;
    }

    function getCurrentGabaritoNumeracaoLabel() {
      if (typeof numeracaoAlunosPorTurma === 'string') {
        var directValue = String(numeracaoAlunosPorTurma || '').trim();
        if (directValue !== '') {
          return directValue;
        }
      }

      if (numeracaoAlunosPorTurma && typeof numeracaoAlunosPorTurma === 'object') {
        if (typeof numeracaoAlunosPorTurma.label === 'string' && String(numeracaoAlunosPorTurma.label || '').trim() !== '') {
          return String(numeracaoAlunosPorTurma.label || '').trim();
        }

        if (typeof numeracaoAlunosPorTurma.text === 'string' && String(numeracaoAlunosPorTurma.text || '').trim() !== '') {
          return String(numeracaoAlunosPorTurma.text || '').trim();
        }

        if (typeof numeracaoAlunosPorTurma.valor === 'string' && String(numeracaoAlunosPorTurma.valor || '').trim() !== '') {
          return String(numeracaoAlunosPorTurma.valor || '').trim();
        }
      }

      return 'Numeracao por estudante/turma';
    }

    function getGabaritoNumeracaoBoxSize(ctx, availablePageWidth, numeracaoText) {
      var fontSize = 16;
      var minWidth = 170;
      var maxWidth = Math.max(minWidth, Math.round(availablePageWidth * 0.42));
      var horizontalPadding = 24;
      var verticalPadding = 16;
      var safeText = String(numeracaoText || '').trim();
      var measuredWidth = minWidth;
      var measuredHeight = fontSize;

      if (ctx) {
        ctx.save();
        ctx.font = 'bold 16px Arial, sans-serif';
        var metrics = ctx.measureText(safeText !== '' ? safeText : 'Numeracao por estudante/turma');
        measuredWidth = Math.max(minWidth, Math.ceil(metrics.width) + horizontalPadding);
        measuredHeight = Math.max(
          fontSize,
          Math.ceil((metrics.actualBoundingBoxAscent || fontSize * 0.75) + (metrics.actualBoundingBoxDescent || fontSize * 0.25))
        );
        ctx.restore();
      } else {
        var fallbackText = safeText !== '' ? safeText : 'Numeracao por estudante/turma';
        measuredWidth = Math.max(minWidth, Math.ceil(fallbackText.length * (fontSize * 0.7)) + horizontalPadding);
      }

      return {
        width: Math.min(maxWidth, measuredWidth),
        height: Math.max(34, measuredHeight + verticalPadding),
      };
    }

    function getA4PageRect() {
      var pageMargin = 24;
      return {
        x: pageMargin,
        y: pageMargin,
        width: a4CanvasWidth - (pageMargin * 2),
        height: a4CanvasHeight - (pageMargin * 2),
      };
    }

    function getGabaritoBackgroundRenderRect(pageRect) {
      if (!gabaritoBackgroundImage || gabaritoBackgroundImage.width <= 0 || gabaritoBackgroundImage.height <= 0) {
        return null;
      }
      return {
        x: pageRect.x,
        y: pageRect.y,
        width: pageRect.width,
        height: pageRect.height,
      };
    }

    function fitCanvasText(ctx, text, maxWidth) {
      var safeText = String(text || '').trim();
      if (!ctx || safeText === '' || !Number.isFinite(maxWidth) || maxWidth <= 0) {
        return safeText;
      }

      if (ctx.measureText(safeText).width <= maxWidth) {
        return safeText;
      }

      var ellipsis = '...';
      var output = safeText;
      while (output.length > 1 && ctx.measureText(output + ellipsis).width > maxWidth) {
        output = output.slice(0, -1);
      }

      return output.length < safeText.length ? (output + ellipsis) : output;
    }

    function getGabaritoScaledFontSize(boxRect, boxSpec, defaultSize, minSize, maxSize) {
      var safeBox = boxRect && typeof boxRect === 'object' ? boxRect : {};
      var safeSpec = boxSpec && typeof boxSpec === 'object' ? boxSpec : {};
      var referenceWidth = Math.max(1, Number(safeSpec.defaultWidth || safeBox.width || 1));
      var referenceHeight = Math.max(1, Number(safeSpec.defaultHeight || safeBox.height || 1));
      var widthRatio = Math.max(0.2, Number(safeBox.width || referenceWidth) / referenceWidth);
      var heightRatio = Math.max(0.2, Number(safeBox.height || referenceHeight) / referenceHeight);
      var scale = Math.min(widthRatio, heightRatio);

      return clampInt(Math.round(defaultSize * scale), minSize, maxSize, defaultSize);
    }

    function formatAvaliacaoAplicacao(dateValue) {
      var safeValue = String(dateValue || '').trim();
      if (safeValue === '') {
        return '-';
      }

      var parts = safeValue.split('-');
      if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
      }

      return safeValue;
    }

    function isImpressaoPaneActive() {
      return impressaoPane instanceof HTMLElement && impressaoPane.classList.contains('active');
    }

    function getImpressaoTurmaOptions() {
      var sourceIds = Array.isArray(activeDashboardTurmasIds) && activeDashboardTurmasIds.length
        ? activeDashboardTurmasIds.slice()
        : getSelectedTurmasIds();
      var optionsMap = {};

      sourceIds.forEach(function (turmaId) {
        var safeTurmaId = Number(turmaId || 0);
        if (safeTurmaId <= 0 || optionsMap[safeTurmaId]) {
          return;
        }

        var turmaNome = '';
        for (var index = 0; index < alunosOptions.length; index += 1) {
          if (Number(alunosOptions[index] && alunosOptions[index].turmaId || 0) === safeTurmaId) {
            turmaNome = String(alunosOptions[index].turmaNome || '').trim();
            if (turmaNome !== '') {
              break;
            }
          }
        }

        if (turmaNome === '') {
          turmaCheckboxes.forEach(function (checkbox) {
            if (turmaNome !== '') {
              return;
            }

            if (Number(checkbox.value || 0) !== safeTurmaId) {
              return;
            }

            var label = document.querySelector('label[for="' + checkbox.id + '"]');
            turmaNome = label ? String(label.textContent || '').trim() : '';
          });
        }

        optionsMap[safeTurmaId] = {
          id: safeTurmaId,
          nome: turmaNome !== '' ? turmaNome : ('Turma #' + safeTurmaId),
        };
      });

      return Object.keys(optionsMap).map(function (key) {
        return optionsMap[key];
      }).sort(function (left, right) {
        return String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR', { sensitivity: 'base' });
      });
    }

    function renderImpressaoTurmasSelector() {
      if (!impressaoTurmasWrap) {
        return;
      }

      var turmaOptions = getImpressaoTurmaOptions();
      if (!turmaOptions.length) {
        selectedImpressaoTurmasIds = [];
        impressaoTurmasWrap.innerHTML = '<div class="small text-secondary">Nenhuma turma vinculada à avaliação.</div>';
        return;
      }

      if (!impressaoTurmasSelectionInitialized) {
        selectedImpressaoTurmasIds = turmaOptions.map(function (item) {
          return item.id;
        });
        impressaoTurmasSelectionInitialized = true;
      } else {
        selectedImpressaoTurmasIds = selectedImpressaoTurmasIds.filter(function (turmaId) {
          return turmaOptions.some(function (item) { return item.id === turmaId; });
        });
      }

      var html = turmaOptions.map(function (item) {
        var checkboxId = 'adminAvaliacaoImpressaoTurma_' + item.id;
        var checked = selectedImpressaoTurmasIds.indexOf(item.id) !== -1;
        return '<div class="form-check">'
          + '<input class="form-check-input js-admin-avaliacao-impressao-turma-checkbox" type="checkbox" value="' + item.id + '" id="' + checkboxId + '"' + (checked ? ' checked' : '') + '>'
          + '<label class="form-check-label" for="' + checkboxId + '">' + escapeHtml(item.nome) + '</label>'
          + '</div>';
      }).join('');

      impressaoTurmasWrap.innerHTML = html;
      impressaoTurmasWrap.querySelectorAll('.js-admin-avaliacao-impressao-turma-checkbox').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
          var turmaId = Number(checkbox.value || 0);
          if (turmaId <= 0) {
            return;
          }

          if (checkbox.checked) {
            if (selectedImpressaoTurmasIds.indexOf(turmaId) === -1) {
              selectedImpressaoTurmasIds.push(turmaId);
            }
          } else {
            selectedImpressaoTurmasIds = selectedImpressaoTurmasIds.filter(function (currentId) {
              return currentId !== turmaId;
            });
          }

          renderImpressaoPreviewIfVisible();
        });
      });
    }

    function setImpressaoPreviewMessage(message) {
      if (!impressaoGrid) {
        return;
      }

      impressaoGrid.innerHTML = '<div class="admin-avaliacao-impressao-empty">' + escapeHtml(message) + '</div>';
      applyImpressaoPreviewFilter();
    }

    function setImpressaoStatusMessage(message) {
      impressaoBaseStatusMessage = String(message || '').trim();

      if (impressaoStatus) {
        impressaoStatus.textContent = impressaoBaseStatusMessage;
      }
    }

    function ensureImpressaoFilterEmptyState() {
      if (!impressaoGrid) {
        return null;
      }

      var existing = impressaoGrid.querySelector('.admin-avaliacao-impressao-empty[data-filter-empty="1"]');
      if (existing instanceof HTMLElement) {
        return existing;
      }

      var emptyState = document.createElement('div');
      emptyState.className = 'admin-avaliacao-impressao-empty d-none';
      emptyState.setAttribute('data-filter-empty', '1');
      emptyState.textContent = 'Nenhuma folha corresponde à busca atual.';
      impressaoGrid.appendChild(emptyState);
      return emptyState;
    }

    function applyImpressaoPreviewFilter() {
      if (!impressaoGrid) {
        return;
      }

      var query = normalizeSearchValue(impressaoSearchInput ? impressaoSearchInput.value : '');
      var pageElements = Array.prototype.slice.call(impressaoGrid.querySelectorAll('.admin-avaliacao-impressao-page'));
      var totalPages = pageElements.length;

      if (!totalPages) {
        if (impressaoStatus) {
          impressaoStatus.textContent = impressaoBaseStatusMessage;
        }
        return;
      }

      var visiblePages = 0;
      pageElements.forEach(function (pageElement) {
        if (!(pageElement instanceof HTMLElement)) {
          return;
        }

        var searchText = normalizeSearchValue(pageElement.getAttribute('data-search-text') || '');
        var isVisible = query === '' || searchText.indexOf(query) !== -1;
        pageElement.classList.toggle('d-none', !isVisible);
        if (isVisible) {
          visiblePages += 1;
        }
      });

      var filterEmptyState = ensureImpressaoFilterEmptyState();
      if (filterEmptyState instanceof HTMLElement) {
        filterEmptyState.classList.toggle('d-none', visiblePages > 0);
      }

      if (!impressaoStatus) {
        return;
      }

      if (query !== '') {
        impressaoStatus.textContent = impressaoBaseStatusMessage + ' Exibindo ' + String(visiblePages) + ' de ' + String(totalPages) + ' folha(s) filtradas.';
      } else {
        impressaoStatus.textContent = impressaoBaseStatusMessage;
      }
    }

    function getActiveAvaliacaoPrintData(overrideTurmasIds) {
      var selectedTurmasIds = Array.isArray(overrideTurmasIds)
        ? overrideTurmasIds.slice()
        : (Array.isArray(selectedImpressaoTurmasIds) && selectedImpressaoTurmasIds.length
          ? selectedImpressaoTurmasIds.slice()
          : []);
      var selectedAlunosIds = (Array.isArray(activeDashboardTurmasIds) && activeDashboardTurmasIds.length) || Number(activeDashboardAvaliacaoId || 0) > 0
        ? activeDashboardAlunosIds.slice()
        : selectedAlunosRelacionadosIds.slice();
      var avaliacaoNomeImpressao = String(activeDashboardAvaliacaoNome || '').trim() || getCurrentGabaritoAvaliacaoTitle();

      if (!selectedTurmasIds.length) {
        return {
          records: [],
          turmaCount: 0,
          alunoCount: 0,
          usingFallbackAlunos: false,
        };
      }

      var alunosDaAvaliacao = alunosOptions.filter(function (aluno) {
        return selectedTurmasIds.indexOf(aluno.turmaId) !== -1;
      });

      if (selectedAlunosIds.length) {
        alunosDaAvaliacao = alunosDaAvaliacao.filter(function (aluno) {
          return selectedAlunosIds.indexOf(aluno.id) !== -1;
        });
      }

      var alunosPorTurma = {};
      alunosDaAvaliacao.forEach(function (aluno) {
        var turmaId = Number(aluno.turmaId || 0);
        if (turmaId <= 0) {
          return;
        }

        if (!alunosPorTurma[turmaId]) {
          alunosPorTurma[turmaId] = [];
        }

        alunosPorTurma[turmaId].push(aluno);
      });

      var records = [];
      Object.keys(alunosPorTurma).sort(function (leftKey, rightKey) {
        var leftTurma = alunosPorTurma[leftKey] && alunosPorTurma[leftKey][0]
          ? String(alunosPorTurma[leftKey][0].turmaNome || '')
          : '';
        var rightTurma = alunosPorTurma[rightKey] && alunosPorTurma[rightKey][0]
          ? String(alunosPorTurma[rightKey][0].turmaNome || '')
          : '';
        return leftTurma.localeCompare(rightTurma, 'pt-BR', { sensitivity: 'base' });
      }).forEach(function (turmaKey) {
        var turmaId = Number(turmaKey || 0);
        var alunosDaTurma = Array.isArray(alunosPorTurma[turmaKey]) ? alunosPorTurma[turmaKey].slice() : [];

        alunosDaTurma.sort(function (left, right) {
          var nomeComparison = String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR', { sensitivity: 'base' });
          if (nomeComparison !== 0) {
            return nomeComparison;
          }

          return Number(left.id || 0) - Number(right.id || 0);
        });

        alunosDaTurma.forEach(function (aluno, index) {
          var numeroAlunoTurma = index + 1;
          records.push({
            avaliacaoId: Number(activeDashboardAvaliacaoId || (idInput ? idInput.value : 0) || 0),
            avaliacaoNome: avaliacaoNomeImpressao,
            aplicacao: formatAvaliacaoAplicacao(activeDashboardAvaliacaoAplicacao || (aplicacaoInput ? aplicacaoInput.value : '')),
            alunoId: aluno.id,
            alunoNome: aluno.nome,
            turmaId: turmaId,
            turmaNome: aluno.turmaNome || ('Turma #' + turmaId),
            numeracao: numeroAlunoTurma,
            numeracaoLabel: 'Nº ' + String(numeroAlunoTurma).padStart(2, '0'),
          });
        });
      });

      return {
        records: records,
        turmaCount: selectedTurmasIds.length,
        alunoCount: records.length,
        usingFallbackAlunos: selectedAlunosIds.length === 0,
      };
    }

    function ensureQrCodeLibraryLoaded() {
      if (typeof window.qrcode === 'function') {
        return Promise.resolve(window.qrcode);
      }

      if (qrCodeLibraryPromise) {
        return qrCodeLibraryPromise;
      }

      qrCodeLibraryPromise = new Promise(function (resolve, reject) {
        var sources = [
          'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
          'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
        ];

        function tryLoadSource(index) {
          if (typeof window.qrcode === 'function') {
            resolve(window.qrcode);
            return;
          }

          if (index >= sources.length) {
            reject(new Error('Biblioteca de QR Code indisponível.'));
            return;
          }

          var source = sources[index];
          var script = document.createElement('script');
          script.async = true;
          script.src = source;
          script.onload = function () {
            if (typeof window.qrcode === 'function') {
              resolve(window.qrcode);
              return;
            }

            tryLoadSource(index + 1);
          };
          script.onerror = function () {
            script.remove();
            tryLoadSource(index + 1);
          };
          document.head.appendChild(script);
        }

        tryLoadSource(0);
      }).catch(function (error) {
        qrCodeLibraryPromise = null;
        throw error;
      });

      return qrCodeLibraryPromise;
    }

    function buildGabaritoQrPayload(pageData) {
      return 'avaliacao_id=' + encodeURIComponent(String(pageData && pageData.avaliacaoId || '0'))
        + '&aluno_id=' + encodeURIComponent(String(pageData && pageData.alunoId || '0'))
        + '&turma_id=' + encodeURIComponent(String(pageData && pageData.turmaId || '0'));
    }

    function drawQrFallback(ctx, qrBox) {
      if (!ctx || !qrBox) {
        return;
      }

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrBox.x, qrBox.y, qrBox.width, qrBox.height);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QR indisponível', qrBox.x + (qrBox.width / 2), qrBox.y + (qrBox.height / 2));
      ctx.restore();
    }

    function drawQrCodeInBox(ctx, qrGenerator, qrPayload, qrBox) {
      if (!ctx || !qrBox) {
        return false;
      }

      var outerPadding = 0;
      var qrSize = Math.max(72, Math.floor(Math.min(qrBox.width, qrBox.height) - (outerPadding * 2)));
      var drawX = Math.round(qrBox.x + ((qrBox.width - qrSize) / 2));
      var drawY = Math.round(qrBox.y + ((qrBox.height - qrSize) / 2));

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(drawX, drawY, qrSize, qrSize);

      if (typeof qrGenerator !== 'function') {
        ctx.restore();
        drawQrFallback(ctx, qrBox);
        return false;
      }

      try {
        var qr = qrGenerator(0, 'H');
        qr.addData(String(qrPayload || ''));
        qr.make();

        var moduleCount = Math.max(1, qr.getModuleCount());
        var quietZoneModules = 4;
        var gridCount = moduleCount + (quietZoneModules * 2);
        var qrCanvas = document.createElement('canvas');
        qrCanvas.width = gridCount;
        qrCanvas.height = gridCount;
        var qrCtx = qrCanvas.getContext('2d');
        if (!qrCtx) {
          throw new Error('Canvas interno do QR indisponível.');
        }

        qrCtx.fillStyle = '#ffffff';
        qrCtx.fillRect(0, 0, gridCount, gridCount);
        qrCtx.fillStyle = '#000000';
        for (var rowIndex = 0; rowIndex < moduleCount; rowIndex += 1) {
          for (var colIndex = 0; colIndex < moduleCount; colIndex += 1) {
            if (!qr.isDark(rowIndex, colIndex)) {
              continue;
            }

            qrCtx.fillRect(colIndex + quietZoneModules, rowIndex + quietZoneModules, 1, 1);
          }
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(qrCanvas, drawX, drawY, qrSize, qrSize);
        ctx.imageSmoothingEnabled = true;

        ctx.restore();
        return true;
      } catch (error) {
        ctx.restore();
        drawQrFallback(ctx, qrBox);
        return false;
      }
    }

    function renderA4PrintPage(ctx, pageData, qrGenerator) {
      if (!ctx || !pageData) {
        return;
      }

      ctx.clearRect(0, 0, a4CanvasWidth, a4CanvasHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, a4CanvasWidth, a4CanvasHeight);

      var pageRect = getA4PageRect();
      var pageX = pageRect.x;
      var pageY = pageRect.y;
      var pageWidth = pageRect.width;
      var pageHeight = pageRect.height;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pageX, pageY, pageWidth, pageHeight);

      var backgroundRect = getGabaritoBackgroundRenderRect(pageRect);
      if (backgroundRect) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(pageX, pageY, pageWidth, pageHeight);
        ctx.clip();
        ctx.drawImage(gabaritoBackgroundImage, backgroundRect.x, backgroundRect.y, backgroundRect.width, backgroundRect.height);
        ctx.restore();
      }

      var infoBoxes = buildGabaritoInfoBoxes(ctx, pageRect, pageData, true);
      var alunoBox = infoBoxes.alunoBox;
      var qrBox = infoBoxes.qrBox;
      var titleBox = infoBoxes.titleBox;
      var numeracaoBox = infoBoxes.numeracaoBox;
      var disciplinasBox = infoBoxes.disciplinasBox;
      var titleText = infoBoxes.titleText;
      var numeracaoText = infoBoxes.numeracaoText;
      var disciplinasLines = infoBoxes.disciplinasLines;
      var infoSpecs = infoBoxes.specs || {};

      (Array.isArray(gabaritoImages) ? gabaritoImages : []).forEach(function (imageItem) {
        var imageAsset = getOrLoadGabaritoImageAsset(imageItem);
        if (!(imageAsset instanceof Image) || !imageAsset.complete || imageAsset.width <= 0 || imageAsset.height <= 0) {
          return;
        }

        var renderRect = {
          x: pageRect.x + clampFloat(imageItem.x, -2000, 2000, 20),
          y: pageRect.y + clampFloat(imageItem.y, -2000, 2000, 20),
          width: clampFloat(imageItem.width, 40, 2000, 180),
          height: clampFloat(imageItem.height, 40, 2000, 120),
        };
        var safeCrop = getGabaritoImageCropRect(imageItem);
        var rotation = normalizeGabaritoImageRotation(imageItem.rotation);
        var angle = rotation * (Math.PI / 180);
        var cropLocalX = -(renderRect.width / 2) + (safeCrop.x * renderRect.width);
        var cropLocalY = -(renderRect.height / 2) + (safeCrop.y * renderRect.height);
        var cropLocalWidth = Math.max(1, safeCrop.width * renderRect.width);
        var cropLocalHeight = Math.max(1, safeCrop.height * renderRect.height);
        var isFullCrop = safeCrop.x <= 0.0001
          && safeCrop.y <= 0.0001
          && Math.abs(safeCrop.width - 1) <= 0.0001
          && Math.abs(safeCrop.height - 1) <= 0.0001;

        ctx.save();
        ctx.beginPath();
        ctx.rect(pageX, pageY, pageWidth, pageHeight);
        ctx.clip();
        ctx.translate(renderRect.x + (renderRect.width / 2), renderRect.y + (renderRect.height / 2));
        ctx.rotate(angle);
        if (!isFullCrop) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(cropLocalX, cropLocalY, cropLocalWidth, cropLocalHeight);
          ctx.clip();
        }
        ctx.drawImage(imageAsset, -(renderRect.width / 2), -(renderRect.height / 2), renderRect.width, renderRect.height);
        if (!isFullCrop) {
          ctx.restore();
        }
        ctx.restore();
      });

      var alunoLabelFontSize = getGabaritoScaledFontSize(alunoBox, infoSpecs.aluno_box, 14, 10, 28);
      var alunoValueFontSize = getGabaritoScaledFontSize(alunoBox, infoSpecs.aluno_box, 14, 10, 28);
      var alunoPaddingX = Math.max(10, Math.round(alunoLabelFontSize * 0.85));
      var alunoLineOneY = alunoBox.y + Math.max(alunoLabelFontSize + 6, Math.round(alunoBox.height * 0.27));
      var alunoLineGap = Math.max(alunoLabelFontSize + 8, Math.round(alunoBox.height * 0.28));
      var alunoLineTwoY = Math.min(alunoBox.y + alunoBox.height - Math.max(8, Math.round(alunoValueFontSize * 0.35)), alunoLineOneY + alunoLineGap);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold ' + alunoLabelFontSize + 'px Arial, sans-serif';
      var alunoLabelWidth = Math.max(ctx.measureText('Estudante:').width, ctx.measureText('Turma:').width);
      var alunoValueGap = Math.max(16, Math.round(alunoLabelFontSize * 1.1));
      var alunoValueOffsetX = alunoPaddingX + Math.ceil(alunoLabelWidth) + alunoValueGap;
      ctx.fillText('Estudante:', alunoBox.x + alunoPaddingX, alunoLineOneY);
      ctx.font = alunoValueFontSize + 'px Arial, sans-serif';
      ctx.fillText(fitCanvasText(ctx, pageData.alunoNome, alunoBox.width - alunoValueOffsetX - (alunoPaddingX * 2)), alunoBox.x + alunoValueOffsetX, alunoLineOneY);
      ctx.font = 'bold ' + alunoLabelFontSize + 'px Arial, sans-serif';
      ctx.fillText('Turma:', alunoBox.x + alunoPaddingX, alunoLineTwoY);
      ctx.font = alunoValueFontSize + 'px Arial, sans-serif';
      ctx.fillText(fitCanvasText(ctx, pageData.turmaNome, alunoBox.width - alunoValueOffsetX - (alunoPaddingX * 2)), alunoBox.x + alunoValueOffsetX, alunoLineTwoY);

      var titleFontSize = Math.max(12, Math.min(72, Math.round((titleBox.height - 16) * 0.85)));
      var titlePaddingX = 16;
      var titleBaselineY = titleBox.y + Math.round(titleBox.height / 2) + Math.round(titleFontSize / 2) - 2;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold ' + titleFontSize + 'px Arial, sans-serif';
      ctx.fillText(fitCanvasText(ctx, titleText, titleBox.width - (titlePaddingX * 2)), titleBox.x + titlePaddingX, titleBaselineY);

      var numeracaoFontSize = getGabaritoScaledFontSize(numeracaoBox, infoSpecs.numeracao_box, 16, 10, 36);
      var numeracaoPaddingX = Math.max(10, Math.round(numeracaoFontSize * 0.75));
      var numeracaoBaselineY = numeracaoBox.y + numeracaoBox.height - Math.max(6, Math.round(numeracaoFontSize * 0.28));
      ctx.fillStyle = '#000000';
      ctx.font = 'bold ' + numeracaoFontSize + 'px Arial, sans-serif';
      ctx.fillText(fitCanvasText(ctx, numeracaoText, numeracaoBox.width - (numeracaoPaddingX * 2)), numeracaoBox.x + numeracaoPaddingX, numeracaoBaselineY);

      var disciplinasLineCount = Math.max(1, disciplinasLines.length);
      var disciplinasLineH = Math.max(16, Math.floor((disciplinasBox.height - 16) / disciplinasLineCount));
      var disciplinasFontSize = Math.max(9, Math.min(30, Math.round(disciplinasLineH * 0.75)));
      var disciplinasPaddingX = 16;
      var disciplinasStartY = disciplinasBox.y + disciplinasFontSize + 8;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold ' + disciplinasFontSize + 'px Arial, sans-serif';
      disciplinasLines.forEach(function (disciplina, index) {
        var lineY = disciplinasStartY + (index * disciplinasLineH);
        var disciplinaLabel = '● ' + String(disciplina || '').toUpperCase();
        ctx.fillText(fitCanvasText(ctx, disciplinaLabel, disciplinasBox.width - (disciplinasPaddingX * 2)), disciplinasBox.x + disciplinasPaddingX, lineY);
      });

      drawQrCodeInBox(ctx, qrGenerator, buildGabaritoQrPayload(pageData), qrBox);

      if (gabaritoTemplateImage && gabaritoTemplateImage.width > 0 && gabaritoTemplateImage.height > 0) {
        ensureGabaritoLayoutInBounds();
        if (gabaritoLayoutRect) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(gabaritoTemplateImage, gabaritoLayoutRect.x, gabaritoLayoutRect.y, gabaritoLayoutRect.width, gabaritoLayoutRect.height);
        }
      }
    }

    function renderImpressaoPreview() {
      if (!impressaoGrid) {
        return Promise.resolve(false);
      }

      var printData = getActiveAvaliacaoPrintData();
      if (impressaoResumo) {
        var resumoTexto = printData.turmaCount > 0
          ? (String(printData.alunoCount) + ' folha(s) para ' + String(printData.turmaCount) + ' turma(s)' + (printData.usingFallbackAlunos ? ' usando todos os estudantes das turmas vinculadas.' : '.'))
          : 'Nenhuma turma vinculada à avaliação para impressão.';
        impressaoResumo.textContent = resumoTexto;
      }

      if (!printData.records.length) {
        setImpressaoPreviewMessage('Nenhum estudante vinculado às turmas desta avaliação para gerar as folhas A4.');
        setImpressaoStatusMessage('Selecione estudantes válidos na avaliação para habilitar a impressão.');
        return Promise.resolve(false);
      }

      setImpressaoStatusMessage('Gerando visualização das folhas A4...');

      return ensureQrCodeLibraryLoaded()
        .then(function (qrGenerator) {
          return qrGenerator;
        })
        .catch(function () {
          return null;
        })
        .then(function (qrGenerator) {
          impressaoGrid.innerHTML = '';

          printData.records.forEach(function (record) {
            var pageElement = document.createElement('div');
            pageElement.className = 'admin-avaliacao-impressao-page';
            pageElement.setAttribute('data-search-text', normalizeSearchValue(
              String(record.turmaNome || '')
              + ' ' + String(record.alunoNome || '')
              + ' ' + String(record.numeracaoLabel || '')
              + ' ' + String(record.avaliacaoNome || '')
            ));

            var metaElement = document.createElement('div');
            metaElement.className = 'admin-avaliacao-impressao-page-meta';
            metaElement.textContent = record.turmaNome + ' | ' + record.alunoNome + ' | ' + record.numeracaoLabel;

            var canvas = document.createElement('canvas');
            var printDpr = 2;
            canvas.width = a4CanvasWidth * printDpr;
            canvas.height = a4CanvasHeight * printDpr;
            canvas.className = 'admin-avaliacao-impressao-page-canvas';
            canvas.setAttribute('data-aluno-id', String(record.alunoId));
            canvas.setAttribute('data-turma-id', String(record.turmaId));

            var context = canvas.getContext('2d');
            if (context) {
              context.scale(printDpr, printDpr);
              renderA4PrintPage(context, record, qrGenerator);
            }

            pageElement.appendChild(metaElement);
            pageElement.appendChild(canvas);
            impressaoGrid.appendChild(pageElement);
          });

          setImpressaoStatusMessage(qrGenerator
            ? 'Visualização pronta. O QR Code leva os ids da avaliação, do estudante e da turma em cada folha.'
            : 'Visualização pronta sem QR Code. Verifique a conexão para carregar a biblioteca de QR.');
          applyImpressaoPreviewFilter();

          return true;
        });
    }

    function renderImpressaoPreviewIfVisible() {
      if (!isImpressaoPaneActive()) {
        return;
      }

      renderImpressaoPreview();
    }

    function exportPrintCanvasDataUrl(canvas) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        return '';
      }

      var pageRect = getA4PageRect();
      var scaleX = canvas.width / a4CanvasWidth;
      var scaleY = canvas.height / a4CanvasHeight;
      var sourceX = Math.round(pageRect.x * scaleX);
      var sourceY = Math.round(pageRect.y * scaleY);
      var sourceWidth = Math.round(pageRect.width * scaleX);
      var sourceHeight = Math.round(pageRect.height * scaleY);

      if (sourceWidth <= 0 || sourceHeight <= 0) {
        return canvas.toDataURL('image/png');
      }

      var exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;

      var exportContext = exportCanvas.getContext('2d');
      if (!exportContext) {
        return canvas.toDataURL('image/png');
      }

      exportContext.fillStyle = '#ffffff';
      exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportContext.imageSmoothingEnabled = true;
      exportContext.imageSmoothingQuality = 'high';
      exportContext.drawImage(
        canvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
      );

      return exportCanvas.toDataURL('image/png');
    }

    function openImpressaoWindow() {
      if (!impressaoGrid) {
        return false;
      }

      var canvases = Array.prototype.slice.call(
        impressaoGrid.querySelectorAll('.admin-avaliacao-impressao-page:not(.d-none) .admin-avaliacao-impressao-page-canvas')
      );
      if (!canvases.length) {
        showGlobalStatus('Nenhuma folha visível está disponível para impressão com o filtro atual.', true);
        return false;
      }

      var printWindow = window.open('', '_blank');
      if (!printWindow) {
        showGlobalStatus('Não foi possível abrir a janela de impressão.', true);
        return false;
      }

      var pagesHtml = [];
      canvases.forEach(function (canvas) {
        if (!(canvas instanceof HTMLCanvasElement)) {
          return;
        }

        pagesHtml.push('<div class="print-page"><img src="' + exportPrintCanvasDataUrl(canvas) + '" alt="Folha A4 do gabarito"></div>');
      });

      printWindow.document.open();
      printWindow.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Impressão de Gabaritos</title><style>@page { size: A4 portrait; margin: 0; } html, body { width: 210mm; min-height: 297mm; margin: 0; padding: 0; background: #ffffff !important; } body { display: block; } .print-page { width: 210mm; min-height: 297mm; margin: 0; padding: 0; page-break-after: always; break-after: page; background: #ffffff !important; border: none !important; box-shadow: none !important; outline: none !important; } .print-page:last-child { page-break-after: auto; break-after: auto; } .print-page img { width: 210mm; height: 297mm; margin: 0; padding: 0; border: 0; box-shadow: none; outline: none; display: block; } @media print { html, body { width: 210mm; min-height: 297mm; background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-page { margin: 0; border: 0 !important; box-shadow: none !important; outline: none !important; } .print-page img { border: 0; box-shadow: none; outline: none; } }</style></head><body>' + pagesHtml.join('') + '<script>window.onload = function () { setTimeout(function () { window.print(); }, 250); }<' + '/script></body></html>');
      printWindow.document.close();
      return true;
    }

    function isCorrecaoPaneActive() {
      return correcaoPane instanceof HTMLElement && correcaoPane.classList.contains('active');
    }

    function isGabaritoMarcacaoPaneActive() {
      var gabaritoMarcacaoPane = document.getElementById('adminAvaliacaoGabaritoSubpaneMarcacao');
      return gabaritoPane instanceof HTMLElement
        && gabaritoPane.classList.contains('active')
        && gabaritoMarcacaoPane instanceof HTMLElement
        && gabaritoMarcacaoPane.classList.contains('active');
    }

    function getResponsiveGabaritoRowsPerColumn() {
      var totalQuestions = Array.isArray(gabaritoQuestoesItens) ? gabaritoQuestoesItens.length : 0;
      if (totalQuestions <= 0) {
        return 10;
      }

      return clampInt(gabaritoQuestoesPorColuna, 1, 50, 10);
    }

    function scheduleGabaritoQuestoesEditorRender() {
      if (!isGabaritoMarcacaoPaneActive()) {
        return;
      }

      if (gabaritoQuestoesLayoutFrame) {
        window.cancelAnimationFrame(gabaritoQuestoesLayoutFrame);
      }

      gabaritoQuestoesLayoutFrame = window.requestAnimationFrame(function () {
        gabaritoQuestoesLayoutFrame = 0;
        renderGabaritoQuestoesEditor();
        window.requestAnimationFrame(function () {
          syncQuestoesListContainerHeight();
        });
      });
    }

    function getCorrecaoListUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/correcoes/listar';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/correcoes/listar');
    }

    function getCorrecaoSaveUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/correcoes/salvar';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/correcoes/salvar');
    }

    function getCorrecaoUpdateUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/correcoes/atualizar';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/correcoes/atualizar');
    }

    function getCorrecaoDeleteUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/correcoes/excluir';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/correcoes/excluir');
    }

    function getCorrecaoVerifyUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/correcoes/verificar';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/correcoes/verificar');
    }

    function formatDateTimePtBr(dateTimeValue) {
      var safeValue = String(dateTimeValue || '').trim();
      if (safeValue === '') {
        return '-';
      }

      var normalized = safeValue.replace(' ', 'T');
      var date = new Date(normalized);
      if (Number.isNaN(date.getTime())) {
        return safeValue;
      }

      return date.toLocaleString('pt-BR');
    }

    function buildCorrecaoResultPayloadBase(basePayload, comparison) {
      var totalPoints = Number(comparison && comparison.totalPoints || 0);
      var earnedPoints = Number(comparison && comparison.earnedPoints || 0);
      var percentual = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      return {
        avaliacao_id: Number(basePayload && basePayload.avaliacao_id || 0),
        aluno_id: Number(basePayload && basePayload.aluno_id || 0),
        turma_id: Number(basePayload && basePayload.turma_id || 0),
        numeracao: String(basePayload && basePayload.numeracao || ''),
        qr_payload: String(basePayload && basePayload.qr_payload || ''),
        respostas: basePayload && basePayload.respostas && typeof basePayload.respostas === 'object' ? basePayload.respostas : {},
        correcoes: Array.isArray(comparison && comparison.corrections) ? comparison.corrections : [],
        acertos: Number(comparison && comparison.score || 0),
        total_questoes: Number(comparison && comparison.total || 0),
        pontuacao: Math.round(earnedPoints * 100) / 100,
        pontuacao_total: Math.round(totalPoints * 100) / 100,
        percentual: Math.round(percentual * 100) / 100,
      };
    }

    function normalizeCorrecaoStatus(value) {
      var normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'gabarito_zerado' || normalized === 'zerado') {
        return 'gabarito_zerado';
      }
      if (normalized === 'ausente' || normalized === 'aluno_ausente') {
        return 'ausente';
      }
      return 'corrigida';
    }

    function getCorrecaoStatusMeta(value) {
      var status = normalizeCorrecaoStatus(value);
      if (status === 'gabarito_zerado') {
        return {
          key: status,
          label: 'Gabarito zerado',
          badgeClass: 'text-bg-warning text-dark',
          resultLabel: 'Gabarito zerado',
        };
      }
      if (status === 'ausente') {
        return {
          key: status,
          label: 'Estudante ausente',
          badgeClass: 'text-bg-danger',
          resultLabel: 'Estudante ausente',
        };
      }

      return {
        key: status,
        label: 'Corrigida',
        badgeClass: 'text-bg-success',
        resultLabel: '',
      };
    }

    function buildCorrecaoStatusCounts(rows) {
      var counts = {
        corrigida: 0,
        gabarito_zerado: 0,
        ausente: 0,
      };

      (Array.isArray(rows) ? rows : []).forEach(function (row) {
        counts[normalizeCorrecaoStatus(row && row.status)] += 1;
      });

      return counts;
    }

    function buildCorrecaoSnapshotFromRow(row) {
      var safeRow = row && typeof row === 'object' ? row : {};
      var status = normalizeCorrecaoStatus(safeRow.status);
      var respostas = safeRow.respostas && typeof safeRow.respostas === 'object'
        ? safeRow.respostas
        : {};

      if (status === 'ausente') {
        return {
          avaliacao_id: Number(safeRow.avaliacao_id || 0),
          aluno_id: Number(safeRow.aluno_id || 0),
          turma_id: Number(safeRow.turma_id || 0),
          numeracao: String(safeRow.numeracao || ''),
          qr_payload: String(safeRow.qr_payload || ''),
          respostas: respostas,
          correcoes: [],
          acertos: 0,
          total_questoes: 0,
          pontuacao: 0,
          pontuacao_total: 0,
          percentual: 0,
          status: status,
        };
      }

      if (Array.isArray(safeRow.correcoes) && safeRow.correcoes.length) {
        return {
          avaliacao_id: Number(safeRow.avaliacao_id || 0),
          aluno_id: Number(safeRow.aluno_id || 0),
          turma_id: Number(safeRow.turma_id || 0),
          numeracao: String(safeRow.numeracao || ''),
          qr_payload: String(safeRow.qr_payload || ''),
          respostas: respostas,
          correcoes: safeRow.correcoes,
          acertos: Number(safeRow.acertos || 0),
          total_questoes: Number(safeRow.total_questoes || safeRow.correcoes.length || 0),
          pontuacao: Number(safeRow.pontuacao || 0),
          pontuacao_total: Number(safeRow.pontuacao_total || 0),
          percentual: Number(safeRow.percentual || 0),
          status: status,
        };
      }

      var comparison = buildCorrecaoCorrections(respostas, respostas, {});

      var resultPayload = buildCorrecaoResultPayloadBase({
        avaliacao_id: safeRow.avaliacao_id,
        aluno_id: safeRow.aluno_id,
        turma_id: safeRow.turma_id,
        numeracao: safeRow.numeracao,
        qr_payload: safeRow.qr_payload,
        respostas: respostas,
      }, comparison);

      resultPayload.status = status;
      return resultPayload;
    }

    function getCorrecoesSummaryStats(rows) {
      var normalizedRows = getStatsNormalizedCorrecoesRows(rows);
      var total = normalizedRows.length;
      var rowsForAverage = normalizedRows.filter(function (row) {
        return normalizeCorrecaoStatus(row.status) !== 'ausente';
      });
      var mediaPercentual = rowsForAverage.length > 0
        ? rowsForAverage.reduce(function (carry, row) {
          return carry + Number(row.percentual || 0);
        }, 0) / rowsForAverage.length
        : 0;

      return {
        total: total,
        total_questoes: total > 0 ? Number(normalizedRows[0].totalQuestoes || 0) : 0,
        media_percentual: Math.round(mediaPercentual * 100) / 100,
      };
    }

    function buildCorrecaoFrameSignature(captureCanvas) {
      if (!(captureCanvas instanceof HTMLCanvasElement)) {
        return null;
      }

      var analysisWidth = 32;
      var analysisHeight = 24;
      correcaoAnalysisCanvas.width = analysisWidth;
      correcaoAnalysisCanvas.height = analysisHeight;
      var ctx = getCanvas2DContext(correcaoAnalysisCanvas, { willReadFrequently: true });
      if (!ctx) {
        return null;
      }

      ctx.clearRect(0, 0, analysisWidth, analysisHeight);
      ctx.drawImage(captureCanvas, 0, 0, analysisWidth, analysisHeight);
      var imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
      var signature = new Uint8Array(analysisWidth * analysisHeight);
      for (var index = 0; index < signature.length; index += 1) {
        var offset = index * 4;
        signature[index] = Math.round(
          (imageData.data[offset] * 0.299)
          + (imageData.data[offset + 1] * 0.587)
          + (imageData.data[offset + 2] * 0.114)
        );
      }

      return signature;
    }

    function measureCorrecaoFrameDifference(leftSignature, rightSignature) {
      if (!(leftSignature instanceof Uint8Array) || !(rightSignature instanceof Uint8Array) || leftSignature.length !== rightSignature.length || leftSignature.length === 0) {
        return 1;
      }

      var totalDifference = 0;
      for (var index = 0; index < leftSignature.length; index += 1) {
        totalDifference += Math.abs(leftSignature[index] - rightSignature[index]);
      }

      return totalDifference / (leftSignature.length * 255);
    }

    function getCorrecaoFrameExposureStats(captureCanvas) {
      if (!(captureCanvas instanceof HTMLCanvasElement)) {
        return null;
      }

      var analysisWidth = 40;
      var analysisHeight = 30;
      correcaoAnalysisCanvas.width = analysisWidth;
      correcaoAnalysisCanvas.height = analysisHeight;
      var ctx = getCanvas2DContext(correcaoAnalysisCanvas, { willReadFrequently: true });
      if (!ctx) {
        return null;
      }

      ctx.clearRect(0, 0, analysisWidth, analysisHeight);
      ctx.drawImage(captureCanvas, 0, 0, analysisWidth, analysisHeight);
      var imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
      var totalPixels = analysisWidth * analysisHeight;
      var brightnessTotal = 0;
      var minBrightness = 255;
      var maxBrightness = 0;
      var darkPixels = 0;
      var brightPixels = 0;

      for (var index = 0; index < totalPixels; index += 1) {
        var offset = index * 4;
        var brightness = Math.round(
          (imageData.data[offset] * 0.299)
          + (imageData.data[offset + 1] * 0.587)
          + (imageData.data[offset + 2] * 0.114)
        );
        brightnessTotal += brightness;
        if (brightness < minBrightness) {
          minBrightness = brightness;
        }
        if (brightness > maxBrightness) {
          maxBrightness = brightness;
        }
        if (brightness <= 28) {
          darkPixels += 1;
        }
        if (brightness >= 90) {
          brightPixels += 1;
        }
      }

      return {
        averageBrightness: brightnessTotal / totalPixels,
        dynamicRange: maxBrightness - minBrightness,
        darkPixelRatio: darkPixels / totalPixels,
        brightPixelRatio: brightPixels / totalPixels,
      };
    }

    function isCorrecaoFrameObstructed(exposureStats) {
      if (!exposureStats || typeof exposureStats !== 'object') {
        return false;
      }

      return exposureStats.averageBrightness < 12
        && exposureStats.darkPixelRatio > 0.96
        && exposureStats.brightPixelRatio < 0.01
        && exposureStats.dynamicRange < 22;
    }

    function getQuestaoDisciplinaNome(questionItem) {
      var disciplinaId = String(questionItem && questionItem.disciplina || '').trim();
      if (disciplinaId === '') {
        return 'Sem disciplina';
      }

      var match = (disciplinasOptions || []).filter(function (disciplina) {
        return String(disciplina && disciplina.id || '') === disciplinaId;
      });

      if (match.length > 0) {
        return String(match[0].nome || disciplinaId).trim() || 'Sem disciplina';
      }

      return disciplinaId;
    }

    function buildCorrecaoSuccessSummary(comparison, currentTarget) {
      var safeComparison = comparison && typeof comparison === 'object' ? comparison : null;
      if (!safeComparison || !Array.isArray(safeComparison.corrections) || !safeComparison.corrections.length) {
        return null;
      }

      var groups = {};
      var order = [];

      safeComparison.corrections.forEach(function (correction, index) {
        var questionItem = Array.isArray(gabaritoQuestoesItens) ? (gabaritoQuestoesItens[index] || null) : null;
        var disciplinaNome = getQuestaoDisciplinaNome(questionItem);

        if (!groups[disciplinaNome]) {
          groups[disciplinaNome] = {
            nome: disciplinaNome,
            acertos: 0,
            total: 0,
            pontuacao: 0,
            pontuacaoTotal: 0,
          };
          order.push(disciplinaNome);
        }

        groups[disciplinaNome].total += 1;
        if (correction && correction.isCorrect) {
          groups[disciplinaNome].acertos += 1;
        }
        groups[disciplinaNome].pontuacao += Number(correction && correction.pontuacao || 0);
        groups[disciplinaNome].pontuacaoTotal += Number(correction && correction.pontuacao_maxima || 0);
      });

      var disciplinas = order.map(function (nome) {
        var item = groups[nome];
        var percentual = item.pontuacaoTotal > 0
          ? Math.round((item.pontuacao / item.pontuacaoTotal) * 100)
          : (item.total > 0 ? Math.round((item.acertos / item.total) * 100) : 0);

        return {
          nome: item.nome,
          acertos: item.acertos,
          total: item.total,
          pontuacao: item.pontuacao,
          pontuacaoTotal: item.pontuacaoTotal,
          percentual: percentual,
        };
      });

      return {
        alunoNome: String(currentTarget && currentTarget.alunoNome || '').trim(),
        turmaNome: String(currentTarget && currentTarget.turmaNome || '').trim(),
        acertos: Number(safeComparison.score || 0),
        total: Number(safeComparison.total || safeComparison.corrections.length || 0),
        pontuacao: Number(safeComparison.earnedPoints || 0),
        pontuacaoTotal: Number(safeComparison.totalPoints || 0),
        percentual: Number(safeComparison.totalPoints || 0) > 0
          ? Math.round((Number(safeComparison.earnedPoints || 0) / Number(safeComparison.totalPoints || 0)) * 100)
          : 0,
        disciplinas: disciplinas,
      };
    }

    function renderCorrecaoProcessingOverlay(mode, options) {
      if (!correcaoProcessingOverlay) {
        return;
      }

      var safeMode = String(mode || 'hidden').trim().toLowerCase();
      var safeOptions = options && typeof options === 'object' ? options : {};
      var title = typeof safeOptions.message === 'string' && safeOptions.message.trim() !== ''
        ? safeOptions.message.trim()
        : 'Processando...';

      correcaoProcessingOverlay.dataset.state = safeMode;

      if (safeMode === 'hidden') {
        correcaoProcessingOverlay.classList.add('d-none');
        correcaoProcessingOverlay.classList.remove('is-success', 'is-blocking');
        if (correcaoProcessingContent) {
          correcaoProcessingContent.classList.remove('is-success');
        }
        if (correcaoProcessingSpinner) {
          correcaoProcessingSpinner.classList.remove('d-none');
        }
        if (correcaoProcessingTitle) {
          correcaoProcessingTitle.textContent = 'Processando...';
        }
        if (correcaoProcessingSummary) {
          correcaoProcessingSummary.innerHTML = '';
          correcaoProcessingSummary.classList.add('d-none');
        }
        return;
      }

      correcaoProcessingOverlay.classList.remove('d-none');

      if (safeMode === 'success') {
        var summary = safeOptions.summary && typeof safeOptions.summary === 'object' ? safeOptions.summary : null;
        correcaoProcessingOverlay.classList.remove('is-blocking');
        correcaoProcessingOverlay.classList.add('is-success');
        if (correcaoProcessingContent) {
          correcaoProcessingContent.classList.add('is-success');
        }
        if (correcaoProcessingSpinner) {
          correcaoProcessingSpinner.classList.add('d-none');
        }
        if (correcaoProcessingTitle) {
          correcaoProcessingTitle.textContent = 'Correção concluída';
        }
        if (correcaoProcessingSummary) {
          if (summary) {
            var headerParts = [];
            if (summary.alunoNome) {
              headerParts.push(escapeHtml(summary.alunoNome));
            }
            if (summary.turmaNome) {
              headerParts.push(escapeHtml(summary.turmaNome));
            }

            var disciplinasHtml = Array.isArray(summary.disciplinas) && summary.disciplinas.length
              ? summary.disciplinas.map(function (item) {
                return ''
                  + '<div class="admin-avaliacao-correcao-processing-discipline-card">'
                  + '<div class="admin-avaliacao-correcao-processing-discipline-name">' + escapeHtml(item.nome) + '</div>'
                  + '<div class="admin-avaliacao-correcao-processing-discipline-score">' + escapeHtml(String(item.acertos)) + '/' + escapeHtml(String(item.total)) + ' acertos</div>'
                  + '<div class="admin-avaliacao-correcao-processing-discipline-meta">' + escapeHtml(String(item.percentual)) + '% • ' + escapeHtml(formatCorrecaoScoreValue(item.pontuacao)) + '/' + escapeHtml(formatCorrecaoScoreValue(item.pontuacaoTotal)) + ' pts</div>'
                  + '</div>';
              }).join('')
              : '<div class="admin-avaliacao-correcao-processing-empty">Resumo por disciplina indisponível.</div>';

            correcaoProcessingSummary.innerHTML = ''
              + (headerParts.length ? '<div class="admin-avaliacao-correcao-processing-student">' + headerParts.join(' • ') + '</div>' : '')
              + '<div class="admin-avaliacao-correcao-processing-total">' + escapeHtml(String(summary.acertos)) + '/' + escapeHtml(String(summary.total)) + ' acertos</div>'
              + '<div class="admin-avaliacao-correcao-processing-total-meta">' + escapeHtml(String(summary.percentual)) + '% de aproveitamento • ' + escapeHtml(formatCorrecaoScoreValue(summary.pontuacao)) + '/' + escapeHtml(formatCorrecaoScoreValue(summary.pontuacaoTotal)) + ' pontos</div>'
              + '<div class="admin-avaliacao-correcao-processing-discipline-grid">' + disciplinasHtml + '</div>';
          } else {
            correcaoProcessingSummary.innerHTML = '<div class="admin-avaliacao-correcao-processing-empty">Correção salva com sucesso.</div>';
          }
          correcaoProcessingSummary.classList.remove('d-none');
        }
        return;
      }

      correcaoProcessingOverlay.classList.remove('is-success');
      correcaoProcessingOverlay.classList.add('is-blocking');
      if (correcaoProcessingContent) {
        correcaoProcessingContent.classList.remove('is-success');
      }
      if (correcaoProcessingSpinner) {
        correcaoProcessingSpinner.classList.remove('d-none');
      }
      if (correcaoProcessingTitle) {
        correcaoProcessingTitle.textContent = title;
      }
      if (correcaoProcessingSummary) {
        correcaoProcessingSummary.innerHTML = '';
        correcaoProcessingSummary.classList.add('d-none');
      }
    }

    function setCorrecaoScannerStep(step, message) {
      correcaoScannerStep = String(step || 'idle');
      var safeMessage = typeof message === 'string' ? message.trim() : '';
      if (correcaoStepBadge) {
        var badgeText = 'Aguardando';
        if (correcaoScannerStep === 'scan-qr') {
          badgeText = 'Lendo QR';
        } else if (correcaoScannerStep === 'confirm-target') {
          badgeText = 'Confirmar';
        } else if (correcaoScannerStep === 'scan-gabarito') {
          badgeText = 'Lendo gabarito';
        } else if (correcaoScannerStep === 'processing') {
          badgeText = 'Processando';
        } else if (correcaoScannerStep === 'discursiva') {
          badgeText = 'Notas';
        } else if (correcaoScannerStep === 'review') {
          badgeText = 'Revisar';
        } else if (correcaoScannerStep === 'saving') {
          badgeText = 'Salvando';
        } else if (correcaoScannerStep === 'success') {
          badgeText = 'Concluido';
        }
        correcaoStepBadge.textContent = badgeText;
      }

      if (correcaoStatus && safeMessage !== '') {
        correcaoStatus.textContent = safeMessage;
      }

      if (correcaoOverlayMessage) {
        correcaoOverlayMessage.textContent = safeMessage;
      }

      syncCorrecaoGuideTemplate();

      if (correcaoCaptureBtn) {
        correcaoCaptureBtn.classList.toggle('d-none', correcaoScannerStep !== 'scan-gabarito');
      }

      if (correcaoConfirmWrap) {
        correcaoConfirmWrap.classList.toggle('d-none', correcaoScannerStep !== 'confirm-target' || !correcaoCurrentTarget);
      }

      if (correcaoNextWrap) {
        correcaoNextWrap.classList.toggle('d-none', correcaoScannerStep !== 'success');
      }

      if (correcaoProcessWrap) {
        var shouldShowProcess = correcaoScannerStep === 'scan-gabarito';
        correcaoProcessWrap.classList.toggle('d-none', !shouldShowProcess);
      }

      if (correcaoProcessingOverlay) {
        var hasSuccessOverlay = correcaoProcessingOverlay.dataset.state === 'success';
        if (correcaoScannerStep === 'processing' || correcaoScannerStep === 'saving') {
          renderCorrecaoProcessingOverlay('processing', { message: safeMessage });
        } else if (correcaoScannerStep === 'success' && hasSuccessOverlay) {
          correcaoProcessingOverlay.classList.remove('d-none');
        } else {
          renderCorrecaoProcessingOverlay('hidden');
        }
      }

      if (correcaoStopBtn) {
        var correcaoModalAberto = Boolean(correcaoModalElement && correcaoModalElement.classList.contains('show'));
        correcaoStopBtn.classList.toggle('d-none', !correcaoModalAberto);
      }

      if (correcaoOverlay) {
        var shouldShowOverlay = correcaoScannerStep !== 'idle' || safeMessage !== '';
        correcaoOverlay.classList.toggle('d-none', !shouldShowOverlay);
      }

      var shouldKeepDiagnostics = correcaoScannerStep === 'scan-gabarito' || correcaoScannerStep === 'saving';
      if (!shouldKeepDiagnostics && correcaoFrozenCanvas && correcaoLastDiagnostics && Array.isArray(correcaoLastDiagnostics.answerMarkers) && correcaoLastDiagnostics.answerMarkers.length) {
        shouldKeepDiagnostics = true;
      }
      if (!shouldKeepDiagnostics) {
        clearCorrecaoDiagnosticsOverlay();
      }

      var alignGuideEl = correcaoAlignGuide || document.getElementById('adminAvaliacaoCorrecaoAlignGuide');
      if (alignGuideEl) {
        var isGabarito = correcaoScannerStep === 'scan-gabarito';
        alignGuideEl.classList.toggle('d-none', !isGabarito);
        var guideBox = alignGuideEl.querySelector('.admin-avaliacao-correcao-align-guide-box');
        if (guideBox) {
          var guideTemplateSize = getCorrecaoGuideTemplateSize();
          applyCorrecaoGuideBoxLayout(guideBox, guideTemplateSize.width, guideTemplateSize.height);
        }
        if (isGabarito && gabaritoTemplateMarkers && gabaritoTemplateMarkers.width && gabaritoTemplateMarkers.height) {
          if (guideBox) {
            var tmW = gabaritoTemplateMarkers.width;
            var tmH = gabaritoTemplateMarkers.height;
            var markerPositions = [
              { id: 'alignGuideMarkerTL', pos: gabaritoTemplateMarkers.topLeft },
              { id: 'alignGuideMarkerTR', pos: gabaritoTemplateMarkers.topRight },
              { id: 'alignGuideMarkerBL', pos: gabaritoTemplateMarkers.bottomLeft },
              { id: 'alignGuideMarkerBR', pos: gabaritoTemplateMarkers.bottomRight },
            ];
            markerPositions.forEach(function (item) {
              var el = document.getElementById(item.id);
              if (el && item.pos) {
                el.style.left = ((item.pos.x / tmW) * 100).toFixed(3) + '%';
                el.style.top = ((item.pos.y / tmH) * 100).toFixed(3) + '%';
              }
            });
          }
        }
      }
    }

    function syncCorrecaoGuideTemplate() {
      if (!correcaoGuideTemplate) {
        return;
      }

      var hasTemplate = Boolean(
        gabaritoTemplateImage
        && typeof gabaritoTemplateImage.src === 'string'
        && gabaritoTemplateImage.src.trim() !== ''
      );

      if (hasTemplate && correcaoGuideTemplate.getAttribute('src') !== gabaritoTemplateImage.src) {
        correcaoGuideTemplate.setAttribute('src', gabaritoTemplateImage.src);
      }

      // Hide the floating "ghost" transparent guide layout entirely
      correcaoGuideTemplate.classList.add('d-none');
    }

    function clearCorrecaoDiagnosticsOverlay() {
      correcaoLastDiagnostics = null;
      correcaoLastTransform = null;
      if (correcaoDiagnosticsSvg instanceof SVGElement) {
        correcaoDiagnosticsSvg.innerHTML = '';
      }
    }

    function mapCorrecaoSourcePointToOverlay(sourceX, sourceY, sourceWidth, sourceHeight) {
      if (!(correcaoOverlay instanceof HTMLElement)) {
        return null;
      }

      var overlayRect = correcaoOverlay.getBoundingClientRect();
      if (!overlayRect || overlayRect.width <= 0 || overlayRect.height <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
        return null;
      }

      var useContain = false;
      if (correcaoVideo instanceof HTMLVideoElement && correcaoVideo.paused) {
        useContain = Boolean(String(correcaoVideo.style.backgroundImage || '').trim());
      }
      var baseFrozenWidth = 430;
      var baseFrozenHeight = 932;
      var scale = useContain
        ? Math.min(overlayRect.width / baseFrozenWidth, overlayRect.height / baseFrozenHeight)
        : Math.max(overlayRect.width / sourceWidth, overlayRect.height / sourceHeight);
      if (useContain) {
        scale *= 0.695;
      }
      var renderedWidth = (useContain ? baseFrozenWidth : sourceWidth) * scale;
      var renderedHeight = (useContain ? baseFrozenHeight : sourceHeight) * scale;
      var offsetX = (overlayRect.width - renderedWidth) / 2;
      var offsetY = (overlayRect.height - renderedHeight) / 2;
      if (useContain) {
        offsetX -= overlayRect.width * 0.077;
        offsetY += overlayRect.height * 0.138;
      }

      return {
        x: offsetX + (sourceX * scale),
        y: offsetY + (sourceY * scale),
        scale: scale,
      };
    }

    function renderCorrecaoDiagnosticsOverlay(diagnostics, sourceWidth, sourceHeight) {
      if (!(correcaoDiagnosticsSvg instanceof SVGElement)) {
        return;
      }

      correcaoLastDiagnostics = diagnostics || null;
      correcaoDiagnosticsSvg.innerHTML = '';
      if (!diagnostics || !sourceWidth || !sourceHeight) {
        return;
      }

      var resolvedSourceWidth = Number(diagnostics.sourceWidth || sourceWidth || 0);
      var resolvedSourceHeight = Number(diagnostics.sourceHeight || sourceHeight || 0);
      if (!resolvedSourceWidth || !resolvedSourceHeight) {
        return;
      }

      var overlayRect = correcaoOverlay ? correcaoOverlay.getBoundingClientRect() : null;
      if (!overlayRect || overlayRect.width <= 0 || overlayRect.height <= 0) {
        return;
      }

      correcaoDiagnosticsSvg.setAttribute('viewBox', '0 0 ' + Math.round(overlayRect.width) + ' ' + Math.round(overlayRect.height));

      function createSvgNode(tagName, attributes) {
        var node = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        Object.keys(attributes || {}).forEach(function (key) {
          node.setAttribute(key, String(attributes[key]));
        });
        correcaoDiagnosticsSvg.appendChild(node);
        return node;
      }

      if (diagnostics.paperBounds) {
        var paperTopLeft = mapCorrecaoSourcePointToOverlay(diagnostics.paperBounds.x, diagnostics.paperBounds.y, resolvedSourceWidth, resolvedSourceHeight);
        var paperBottomRight = mapCorrecaoSourcePointToOverlay(
          diagnostics.paperBounds.x + diagnostics.paperBounds.width,
          diagnostics.paperBounds.y + diagnostics.paperBounds.height,
          resolvedSourceWidth,
          resolvedSourceHeight
        );
        if (paperTopLeft && paperBottomRight) {
          createSvgNode('rect', {
            x: Math.round(paperTopLeft.x),
            y: Math.round(paperTopLeft.y),
            width: Math.max(1, Math.round(paperBottomRight.x - paperTopLeft.x)),
            height: Math.max(1, Math.round(paperBottomRight.y - paperTopLeft.y)),
            fill: 'rgba(84, 214, 44, 0.10)',
            stroke: '#54d62c',
            'stroke-width': 2,
            'stroke-dasharray': '8 6'
          });
        }
      }

      if (diagnostics.markers) {
        ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].forEach(function (key) {
          var marker = diagnostics.markers[key];
          if (!marker) {
            return;
          }

          var center = mapCorrecaoSourcePointToOverlay(marker.x, marker.y, resolvedSourceWidth, resolvedSourceHeight);
          if (!center) {
            return;
          }

          createSvgNode('circle', {
            cx: Math.round(center.x),
            cy: Math.round(center.y),
            r: 8,
            fill: '#00c2ff',
            stroke: '#ffffff',
            'stroke-width': 2,
          });

          createSvgNode('text', {
            x: Math.round(center.x + 11),
            y: Math.round(center.y - 10),
            fill: '#ffffff',
            'font-size': 12,
            'font-weight': 700,
          }).textContent = key === 'topLeft'
              ? 'TL'
              : (key === 'topRight'
                ? 'TR'
                : (key === 'bottomLeft' ? 'BL' : 'BR'));
        });

        if (diagnostics.markers.topLeft && diagnostics.markers.topRight && diagnostics.markers.bottomRight && diagnostics.markers.bottomLeft) {
          var ordered = [
            diagnostics.markers.topLeft,
            diagnostics.markers.topRight,
            diagnostics.markers.bottomRight,
            diagnostics.markers.bottomLeft,
          ].map(function (marker) {
            return mapCorrecaoSourcePointToOverlay(marker.x, marker.y, resolvedSourceWidth, resolvedSourceHeight);
          }).filter(function (point) {
            return !!point;
          });

          if (ordered.length === 4) {
            createSvgNode('polygon', {
              points: ordered.map(function (point) {
                return Math.round(point.x) + ',' + Math.round(point.y);
              }).join(' '),
              fill: 'rgba(0, 194, 255, 0.08)',
              stroke: '#00c2ff',
              'stroke-width': 2,
            });
          }
        }
      }

      if (Array.isArray(diagnostics.answerMarkers) && diagnostics.answerMarkers.length) {
        diagnostics.answerMarkers.forEach(function (marker) {
          if (!marker) {
            return;
          }
          var center = mapCorrecaoSourcePointToOverlay(marker.x, marker.y, resolvedSourceWidth, resolvedSourceHeight);
          if (!center) {
            return;
          }
          var confidence = String(marker.confidence || 'low');
          var strokeColor = confidence === 'high'
            ? '#2ecc71'
            : (confidence === 'medium' ? '#f1c40f' : '#e67e22');
          var radius = Math.max(10, Number(marker.r || 0) * center.scale * 1.5);
          var strokeWidth = Math.max(4, Math.round(radius * 0.18));
          var fontSize = Math.max(18, Math.round(radius * 1.05));
          createSvgNode('circle', {
            cx: Math.round(center.x),
            cy: Math.round(center.y),
            r: Math.round(radius),
            fill: 'rgba(0, 0, 0, 0.12)',
            stroke: strokeColor,
            'stroke-width': strokeWidth,
          });
          createSvgNode('text', {
            x: Math.round(center.x),
            y: Math.round(center.y + Math.max(6, radius * 0.24)),
            fill: '#ffffff',
            'font-size': fontSize,
            'font-weight': 700,
            'text-anchor': 'middle',
          }).textContent = String(marker.alternativa || '').toUpperCase();
        });
      }

      // Debug: desenha bolhas projetadas
      if (correcaoDebugBubbles && diagnostics.transform && diagnostics.transform.H && Array.isArray(gabaritoBubbleHitboxes)) {
        var bubbleColors = {
          'A': '#ff4444',
          'B': '#44ff44',
          'C': '#4444ff',
          'D': '#ffff44',
          'E': '#ff44ff',
        };
        gabaritoBubbleHitboxes.forEach(function (bubble) {
          var projected;
          if (diagnostics.transform.H) {
            projected = applyPerspectiveHomography(diagnostics.transform.H, bubble.x, bubble.y);
          } else {
            projected = {
              x: diagnostics.transform.offsetX + (bubble.x * diagnostics.transform.scaleX),
              y: diagnostics.transform.offsetY + (bubble.y * diagnostics.transform.scaleY),
            };
          }
          var overlayPoint = mapCorrecaoSourcePointToOverlay(projected.x, projected.y, resolvedSourceWidth, resolvedSourceHeight);
          if (!overlayPoint) {
            return;
          }
          var bubbleColor = bubbleColors[bubble.alternativa] || '#888888';
          var scale = (diagnostics.transform.scaleX + diagnostics.transform.scaleY) / 2;
          var radius = Math.max(4, bubble.r * scale * 0.65 * overlayPoint.scale);
          createSvgNode('circle', {
            cx: Math.round(overlayPoint.x),
            cy: Math.round(overlayPoint.y),
            r: Math.round(radius),
            fill: 'none',
            stroke: bubbleColor,
            'stroke-width': 2,
            'stroke-opacity': 0.8,
          });
          createSvgNode('text', {
            x: Math.round(overlayPoint.x),
            y: Math.round(overlayPoint.y + 4),
            fill: bubbleColor,
            'font-size': 10,
            'font-weight': 700,
            'text-anchor': 'middle',
          }).textContent = bubble.alternativa;
        });
      }
    }

    function renderCorrecaoTarget() {
      if (!correcaoTargetCard || !correcaoTargetText) {
        return;
      }

      if (!correcaoCurrentTarget) {
        correcaoTargetCard.classList.add('d-none');
        correcaoTargetText.textContent = '';
        if (correcaoOverlayTarget) {
          correcaoOverlayTarget.textContent = '';
          correcaoOverlayTarget.classList.add('d-none');
        }
        if (correcaoConfirmWrap) {
          correcaoConfirmWrap.classList.add('d-none');
        }
        return;
      }

      correcaoTargetCard.classList.remove('d-none');
      var targetText = correcaoCurrentTarget.alunoNome + ' | ' + correcaoCurrentTarget.turmaNome + ' | ' + correcaoCurrentTarget.numeracaoLabel;
      if (correcaoCurrentTarget.existingCorrection) {
        targetText += ' | já corrigida';
      }
      correcaoTargetText.textContent = targetText;
      if (correcaoOverlayTarget) {
        correcaoOverlayTarget.textContent = targetText;
        correcaoOverlayTarget.classList.remove('d-none');
      }
      if (correcaoConfirmWrap) {
        correcaoConfirmWrap.classList.toggle('d-none', correcaoScannerStep !== 'confirm-target');
      }
    }

    function getCorrecaoCameraModule() {
      if (window.__adminAvaliacoesCorrecaoCameraModule) {
        return window.__adminAvaliacoesCorrecaoCameraModule;
      }

      if (typeof window.__createAdminAvaliacaoCorrecaoCameraModule !== 'function' || !window.__adminAvaliacoesCorrecaoApi) {
        return null;
      }

      window.__adminAvaliacoesCorrecaoCameraModule = window.__createAdminAvaliacaoCorrecaoCameraModule(window.__adminAvaliacoesCorrecaoApi);
      return window.__adminAvaliacoesCorrecaoCameraModule;
    }

    function getCorrecaoCameraDeps() {
      return {
        elements: {
          dashboardModalElement: dashboardModalElement,
          correcaoModalElement: correcaoModalElement,
          correcaoModalInstance: correcaoModalInstance,
          correcaoVideo: correcaoVideo,
          correcaoVideoPlaceholder: correcaoVideoPlaceholder,
          idInput: idInput,
        },
        getActiveDashboardAvaliacaoId: function () {
          return Number(activeDashboardAvaliacaoId || 0);
        },
        getGabaritoQuestoesItens: function () {
          return Array.isArray(gabaritoQuestoesItens) ? gabaritoQuestoesItens : [];
        },
        getState: function () {
          return {
            correcaoCameraStream: correcaoCameraStream,
            correcaoScanFrameId: correcaoScanFrameId,
            correcaoScanRetryTimeoutId: correcaoScanRetryTimeoutId,
            correcaoScannerStep: correcaoScannerStep,
            correcaoCurrentTarget: correcaoCurrentTarget,
            correcaoBusy: correcaoBusy,
            correcaoLastAutoCaptureAt: correcaoLastAutoCaptureAt,
            correcaoQrValidatedAt: correcaoQrValidatedAt,
            correcaoLastSuccessPayload: correcaoLastSuccessPayload,
            correcaoLastSuccessAt: correcaoLastSuccessAt,
            correcaoGabaritoStableFrames: correcaoGabaritoStableFrames,
            correcaoQrReferenceSignature: correcaoQrReferenceSignature,
            correcaoLastDiagnostics: correcaoLastDiagnostics,
            correcaoAutoReadFingerprint: correcaoAutoReadFingerprint,
            correcaoAutoReadStableReads: correcaoAutoReadStableReads,
            correcaoFrozenCanvas: correcaoFrozenCanvas,
          };
        },
        setState: function (patch) {
          var safePatch = patch && typeof patch === 'object' ? patch : {};
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoCameraStream')) {
            correcaoCameraStream = safePatch.correcaoCameraStream;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoScanFrameId')) {
            correcaoScanFrameId = safePatch.correcaoScanFrameId;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoScanRetryTimeoutId')) {
            correcaoScanRetryTimeoutId = safePatch.correcaoScanRetryTimeoutId;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoScannerStep')) {
            correcaoScannerStep = safePatch.correcaoScannerStep;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoCurrentTarget')) {
            correcaoCurrentTarget = safePatch.correcaoCurrentTarget;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoBusy')) {
            correcaoBusy = safePatch.correcaoBusy;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoLastAutoCaptureAt')) {
            correcaoLastAutoCaptureAt = safePatch.correcaoLastAutoCaptureAt;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoQrValidatedAt')) {
            correcaoQrValidatedAt = safePatch.correcaoQrValidatedAt;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoLastSuccessPayload')) {
            correcaoLastSuccessPayload = safePatch.correcaoLastSuccessPayload;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoLastSuccessAt')) {
            correcaoLastSuccessAt = safePatch.correcaoLastSuccessAt;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoGabaritoStableFrames')) {
            correcaoGabaritoStableFrames = safePatch.correcaoGabaritoStableFrames;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoQrReferenceSignature')) {
            correcaoQrReferenceSignature = safePatch.correcaoQrReferenceSignature;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoLastDiagnostics')) {
            correcaoLastDiagnostics = safePatch.correcaoLastDiagnostics;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoAutoReadFingerprint')) {
            correcaoAutoReadFingerprint = safePatch.correcaoAutoReadFingerprint;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoAutoReadStableReads')) {
            correcaoAutoReadStableReads = safePatch.correcaoAutoReadStableReads;
          }
          if (Object.prototype.hasOwnProperty.call(safePatch, 'correcaoFrozenCanvas')) {
            correcaoFrozenCanvas = safePatch.correcaoFrozenCanvas;
          }
        },
        helpers: {
          prepareModalOpen: prepareModalOpen,
          setCorrecaoBackdropIsolation: setCorrecaoBackdropIsolation,
          closeCorrecaoRevisaoModal: closeCorrecaoRevisaoModal,
          closeCorrecaoDiscursivaModal: closeCorrecaoDiscursivaModal,
          resetCorrecaoAutoReadStability: resetCorrecaoAutoReadStability,
          renderCorrecaoTarget: renderCorrecaoTarget,
          setCorrecaoScannerStep: setCorrecaoScannerStep,
          buildCorrecaoFrameSignature: buildCorrecaoFrameSignature,
          captureCorrecaoFrame: captureCorrecaoFrame,
          clearCorrecaoDiagnosticsOverlay: clearCorrecaoDiagnosticsOverlay,
          decodeQrFromCurrentFrame: decodeQrFromCurrentFrame,
          handleCorrecaoQrPayload: handleCorrecaoQrPayload,
          buildCorrecaoMarkerTransform: buildCorrecaoMarkerTransform,
          renderCorrecaoDiagnosticsOverlay: renderCorrecaoDiagnosticsOverlay,
          validateCorrecaoFrameForReading: validateCorrecaoFrameForReading,
          normalizeQuestaoTipo: normalizeQuestaoTipo,
          showGlobalStatus: showGlobalStatus,
          isQuestaoObjetiva: isQuestaoObjetiva,
          detectAnswersFromCorrecaoCanvas: detectAnswersFromCorrecaoCanvas,
          buildCorrecaoAnswersFingerprint: buildCorrecaoAnswersFingerprint,
          buildCorrecaoFlowError: buildCorrecaoFlowError,
          getCurrentGabaritoNumeracaoLabel: getCurrentGabaritoNumeracaoLabel,
          getCorrecaoDiscursivaQuestoes: getCorrecaoDiscursivaQuestoes,
          openCorrecaoDiscursivaModal: openCorrecaoDiscursivaModal,
          buildCorrecaoCorrections: buildCorrecaoCorrections,
          buildCorrecaoSuccessSummary: buildCorrecaoSuccessSummary,
          shouldOpenCorrecaoReviewModal: shouldOpenCorrecaoReviewModal,
          openCorrecaoRevisaoModal: openCorrecaoRevisaoModal,
          saveCorrecaoResult: saveCorrecaoResult,
          renderCorrecoesTable: renderCorrecoesTable,
          resumeCorrecaoForNextSheet: resumeCorrecaoForNextSheet,
          resumeCorrecaoForNextSheetWithSummary: resumeCorrecaoForNextSheetWithSummary,
        },
      };
    }

    function openCorrecaoModal() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.openCorrecaoModal === 'function') {
        cameraModule.openCorrecaoModal();
      }
    }

    function closeCorrecaoModal() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.closeCorrecaoModal === 'function') {
        cameraModule.closeCorrecaoModal();
      }
    }

    function goToNextCorrecaoQr() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.goToNextCorrecaoQr === 'function') {
        cameraModule.goToNextCorrecaoQr();
      }
    }

    function proceedCorrecaoToGabarito() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.proceedCorrecaoToGabarito === 'function') {
        cameraModule.proceedCorrecaoToGabarito();
      }
    }

    function formatStatsPercent(value) {
      var numericValue = Number(value || 0);
      if (!Number.isFinite(numericValue)) {
        numericValue = 0;
      }

      return String(numericValue.toFixed(1)).replace('.', ',') + '%';
    }

    function getStatsMetaLabel(value, fallbackValue) {
      var safeValue = sanitizeQuestaoMetaField(value);
      return safeValue !== '' ? safeValue : fallbackValue;
    }

    function getStatsQuestionMetaMap() {
      var map = {};
      gabaritoQuestoesItens.forEach(function (item, index) {
        var safeItem = sanitizeQuestaoItem(item);
        var questionNumber = index + 1;
        var habilidadeCodigo = getStatsMetaLabel(safeItem.habilidade, 'Habilidade não informada');
        map[String(questionNumber)] = {
          questionNumber: questionNumber,
          tipo: normalizeQuestaoTipo(safeItem.tipo),
          tipoLabel: getQuestaoTipoLabel(safeItem.tipo),
          peso: sanitizeQuestaoPeso(safeItem.peso, 1),
          disciplina: getStatsMetaLabel(getQuestaoDisciplinaNome(safeItem), 'Disciplina não informada'),
          habilidadeCodigo: habilidadeCodigo,
          habilidade: getStatsSkillDisplayLabel(safeItem.habilidade, 'Habilidade não informada'),
          correta: String(safeItem.correta || '').trim().toUpperCase(),
          alternativas: getQuestaoAlternativaLabels(safeItem, gabaritoAlternativasConfiguradas),
          enunciado: richTextToPlainText(safeItem.enunciado || ''),
          anulada: safeItem.anulada === true,
        };
      });

      return map;
    }

    function getStatsNormalizedCorrecoesRows(rows) {
      return (Array.isArray(rows) ? rows : []).map(function (row) {
        var safeRow = row && typeof row === 'object' ? row : {};
        var snapshot = null;
        try {
          snapshot = buildCorrecaoSnapshotFromRow(safeRow);
        } catch (error) {
          snapshot = null;
        }
        var respostas = safeRow.respostas && typeof safeRow.respostas === 'object'
          ? safeRow.respostas
          : {};
        var correcoes = snapshot && Array.isArray(snapshot.correcoes)
          ? snapshot.correcoes
          : (Array.isArray(safeRow.correcoes) ? safeRow.correcoes : []);

        return {
          id: Number(safeRow.id || 0),
          alunoId: Number(safeRow.aluno_id || 0),
          turmaId: Number(safeRow.turma_id || 0),
          alunoNome: String(safeRow.aluno_nome || 'Estudante não identificado').trim() || 'Estudante não identificado',
          turmaNome: String(safeRow.turma_nome || 'Turma não informada').trim() || 'Turma não informada',
          percentual: snapshot ? Number(snapshot.percentual || 0) : Number(safeRow.percentual || 0),
          pontuacao: snapshot ? Number(snapshot.pontuacao || 0) : Number(safeRow.pontuacao || 0),
          pontuacaoTotal: snapshot ? Number(snapshot.pontuacao_total || 0) : Number(safeRow.pontuacao_total || 0),
          acertos: snapshot ? Number(snapshot.acertos || 0) : Number(safeRow.acertos || 0),
          totalQuestoes: snapshot ? Number(snapshot.total_questoes || 0) : Number(safeRow.total_questoes || 0),
          respostas: respostas,
          correcoes: correcoes,
          status: normalizeCorrecaoStatus(safeRow.status),
          corrigidoEm: String(safeRow.corrigido_em || safeRow.created_at || '').trim(),
          numeracao: String(safeRow.numeracao || '').trim(),
        };
      });
    }

    function buildStatsQuestionDistributionMap(questionMeta) {
      var map = {};
      Object.keys(questionMeta).forEach(function (questionKey) {
        var meta = questionMeta[questionKey];
        var alternativaCounts = {};
        (meta.alternativas || []).forEach(function (letter) {
          alternativaCounts[letter] = 0;
        });

        map[questionKey] = {
          questionNumber: meta.questionNumber,
          disciplina: meta.disciplina,
          habilidade: meta.habilidade,
          tipo: meta.tipo,
          tipoLabel: meta.tipoLabel,
          correta: meta.correta,
          anulada: meta.anulada === true,
          alternativas: meta.alternativas.slice(),
          enunciado: meta.enunciado,
          total: 0,
          corretas: 0,
          incorretas: 0,
          brancos: 0,
          earnedPoints: 0,
          totalPoints: 0,
          alternativaCounts: alternativaCounts,
          alternativasErradas: {},
        };
      });

      return map;
    }

    function ensureStatsAggregateEntry(store, key, defaults) {
      if (!store[key]) {
        store[key] = defaults;
      }

      return store[key];
    }

    function getStatsMasteryLevel(earnedPoints, totalPoints) {
      var ratio = totalPoints > 0 ? (earnedPoints / totalPoints) : 0;
      return ratio >= 0.7;
    }

    function getStatsQuestionMasteryLevel(meta, earnedPoints, totalPoints, correcao) {
      var safeMeta = meta && typeof meta === 'object' ? meta : {};
      var safeTotalPoints = Number(totalPoints || 0);
      var safeEarnedPoints = Number(earnedPoints || 0);

      if (normalizeQuestaoTipo(safeMeta.tipo) === 'discursiva') {
        if (safeTotalPoints <= 0) {
          return false;
        }

        return (safeEarnedPoints / safeTotalPoints) >= 0.5;
      }

      if (correcao && correcao.isCorrect === true) {
        return true;
      }

      return getStatsMasteryLevel(safeEarnedPoints, safeTotalPoints);
    }

    function getStatsSkillMasteryLevel(skillEntry) {
      var safeEntry = skillEntry && typeof skillEntry === 'object' ? skillEntry : {};
      var masteryUnitsTotal = Number(safeEntry.masteryUnitsTotal || 0);
      var masteryUnitsEarned = Number(safeEntry.masteryUnitsEarned || 0);

      if (masteryUnitsTotal > 0) {
        return (masteryUnitsEarned / masteryUnitsTotal) >= 0.7;
      }

      return getStatsMasteryLevel(Number(safeEntry.earnedPoints || 0), Number(safeEntry.totalPoints || 0));
    }

    function makeStatsTurmaScopeKey(row) {
      var turmaId = Number(row && row.turmaId || 0);
      if (turmaId > 0) {
        return 'turma:' + String(turmaId);
      }

      return 'turma-nome:' + normalizeSearchValue(row && row.turmaNome || 'turma-nao-informada');
    }

    function makeStatsAlunoScopeKey(row) {
      var alunoId = Number(row && row.alunoId || 0);
      if (alunoId > 0) {
        return 'aluno:' + String(alunoId);
      }

      return 'aluno-nome:' + normalizeSearchValue(row && row.alunoNome || 'aluno-nao-identificado');
    }

    function normalizeStatsFilterValues(values, validValues) {
      var sourceValues = Array.isArray(values)
        ? values
        : [values];
      var normalizedValues = sourceValues.map(function (value) {
        return String(value || '').trim();
      }).filter(Boolean);

      if (!normalizedValues.length || normalizedValues.indexOf('all') !== -1) {
        return ['all'];
      }

      var validList = Array.isArray(validValues) ? validValues.map(function (value) {
        return String(value || '').trim();
      }).filter(Boolean) : [];
      if (!validList.length) {
        return ['all'];
      }

      var uniqueValues = [];
      normalizedValues.forEach(function (value) {
        if (validList.indexOf(value) !== -1 && uniqueValues.indexOf(value) === -1) {
          uniqueValues.push(value);
        }
      });

      return uniqueValues.length ? uniqueValues : ['all'];
    }

    function parseStatsDatasetFilterValues(rawValue) {
      if (Array.isArray(rawValue)) {
        return normalizeStatsFilterValues(rawValue, rawValue);
      }

      var stringValue = String(rawValue || '').trim();
      if (stringValue === '' || stringValue === 'all') {
        return ['all'];
      }

      if (stringValue.charAt(0) === '[') {
        try {
          var parsed = JSON.parse(stringValue);
          return Array.isArray(parsed) ? normalizeStatsFilterValues(parsed, parsed) : ['all'];
        } catch (error) {
          return ['all'];
        }
      }

      return [stringValue];
    }

    function writeStatsDatasetFilterValues(datasetKey, values) {
      if (!statsRoot) {
        return;
      }

      statsRoot.dataset[datasetKey] = JSON.stringify(normalizeStatsFilterValues(values, Array.isArray(values) ? values : [values]));
    }

    function readStatsDatasetFilterValues(datasetKey) {
      if (!statsRoot) {
        return ['all'];
      }

      return parseStatsDatasetFilterValues(statsRoot.dataset[datasetKey]);
    }

    function hasActiveStatsFilterValues(values) {
      return Array.isArray(values) && values.length > 0 && !(values.length === 1 && values[0] === 'all');
    }

    function buildStatsScopeOptions(rows, selectedTurmaKeys, selectedAlunoKeys) {
      var normalizedRows = Array.isArray(rows) ? rows : [];
      var turmaMap = {};
      var alunoMap = {};

      normalizedRows.forEach(function (row) {
        var turmaKey = makeStatsTurmaScopeKey(row);
        if (!turmaMap[turmaKey]) {
          turmaMap[turmaKey] = {
            value: turmaKey,
            label: String(row && row.turmaNome || 'Turma não informada').trim() || 'Turma não informada',
          };
        }
      });

      var turmaOptions = Object.keys(turmaMap).map(function (key) {
        return turmaMap[key];
      }).sort(function (left, right) {
        return String(left.label || '').localeCompare(String(right.label || ''), 'pt-BR', { sensitivity: 'base' });
      });

      var turmaValues = normalizeStatsFilterValues(selectedTurmaKeys, Object.keys(turmaMap));

      normalizedRows.forEach(function (row) {
        var alunoKey = makeStatsAlunoScopeKey(row);
        if (!alunoMap[alunoKey]) {
          var alunoNome = String(row && row.alunoNome || 'Estudante não identificado').trim() || 'Estudante não identificado';
          var turmaNome = String(row && row.turmaNome || 'Turma não informada').trim() || 'Turma não informada';
          alunoMap[alunoKey] = {
            value: alunoKey,
            label: alunoNome + ' • ' + turmaNome,
          };
        }
      });

      var alunoOptions = Object.keys(alunoMap).map(function (key) {
        return alunoMap[key];
      }).sort(function (left, right) {
        return String(left.label || '').localeCompare(String(right.label || ''), 'pt-BR', { sensitivity: 'base' });
      });

      var alunoValues = normalizeStatsFilterValues(selectedAlunoKeys, Object.keys(alunoMap));

      return {
        turmaValues: turmaValues,
        alunoValues: alunoValues,
        turmaOptions: turmaOptions,
        alunoOptions: alunoOptions,
      };
    }

    function filterStatsRowsByScope(rows, turmaValues, alunoValues) {
      var safeTurmaValues = normalizeStatsFilterValues(turmaValues, Array.isArray(turmaValues) ? turmaValues : [turmaValues]);
      var safeAlunoValues = normalizeStatsFilterValues(alunoValues, Array.isArray(alunoValues) ? alunoValues : [alunoValues]);

      return (Array.isArray(rows) ? rows : []).filter(function (row) {
        if (hasActiveStatsFilterValues(safeTurmaValues) && safeTurmaValues.indexOf(makeStatsTurmaScopeKey(row)) === -1) {
          return false;
        }

        if (hasActiveStatsFilterValues(safeAlunoValues) && safeAlunoValues.indexOf(makeStatsAlunoScopeKey(row)) === -1) {
          return false;
        }

        return true;
      });
    }

    function buildAvaliacaoStatsDatasetFromNormalizedRows(normalizedRows) {
      var safeRows = Array.isArray(normalizedRows) ? normalizedRows : [];
      var questionMeta = getStatsQuestionMetaMap();
      var questionStats = buildStatsQuestionDistributionMap(questionMeta);
      var turmaMap = {};
      var disciplinaMap = {};
      var habilidadeMap = {};
      var alunoMap = {};
      var allSkills = {};
      var overallEarnedPoints = 0;
      var overallTotalPoints = 0;

      safeRows.forEach(function (row) {
        overallEarnedPoints += Number(row.pontuacao || 0);
        overallTotalPoints += Number(row.pontuacaoTotal || 0);

        var turmaEntry = ensureStatsAggregateEntry(turmaMap, row.turmaNome, {
          nome: row.turmaNome,
          totalAlunos: 0,
          percentualSum: 0,
          earnedPoints: 0,
          totalPoints: 0,
        });
        turmaEntry.totalAlunos += 1;
        turmaEntry.percentualSum += Number(row.percentual || 0);
        turmaEntry.earnedPoints += Number(row.pontuacao || 0);
        turmaEntry.totalPoints += Number(row.pontuacaoTotal || 0);

        var alunoEntry = ensureStatsAggregateEntry(alunoMap, String(row.alunoId || row.alunoNome), {
          alunoNome: row.alunoNome,
          turmaNome: row.turmaNome,
          percentual: Number(row.percentual || 0),
          earnedPoints: Number(row.pontuacao || 0),
          totalPoints: Number(row.pontuacaoTotal || 0),
          habilidades: {},
        });

        row.correcoes.forEach(function (correcao, correctionIndex) {
          var questionKey = String(correcao && correcao.questionNumber ? correcao.questionNumber : (correctionIndex + 1));
          var meta = questionMeta[questionKey] || {
            questionNumber: Number(questionKey || 0),
            tipo: normalizeQuestaoTipo(correcao && correcao.questionType),
            tipoLabel: getQuestaoTipoLabel(correcao && correcao.questionType),
            peso: sanitizeQuestaoPeso(correcao && correcao.pontuacao_maxima, 1),
            disciplina: 'Disciplina não informada',
            habilidadeCodigo: 'Habilidade não informada',
            habilidade: 'Habilidade não informada',
            correta: String(correcao && correcao.correctAnswer || '').trim().toUpperCase(),
            alternativas: [],
            enunciado: '',
          };
          var earnedPoints = Number(correcao && correcao.pontuacao || 0);
          var totalPoints = Number(correcao && correcao.pontuacao_maxima || meta.peso || 0);
          var questionMastered = getStatsQuestionMasteryLevel(meta, earnedPoints, totalPoints, correcao);
          var studentAnswer = correcao && correcao.studentAnswer !== undefined && correcao.studentAnswer !== null
            ? String(correcao.studentAnswer || '').trim().toUpperCase()
            : '';
          var questionEntry = questionStats[questionKey] || ensureStatsAggregateEntry(questionStats, questionKey, {
            questionNumber: Number(questionKey || 0),
            disciplina: meta.disciplina,
            habilidade: meta.habilidade,
            tipo: meta.tipo,
            tipoLabel: meta.tipoLabel,
            correta: meta.correta,
            alternativas: Array.isArray(meta.alternativas) ? meta.alternativas.slice() : [],
            enunciado: meta.enunciado,
            total: 0,
            corretas: 0,
            incorretas: 0,
            brancos: 0,
            earnedPoints: 0,
            totalPoints: 0,
            alternativaCounts: {},
            alternativasErradas: {},
          });

          var effectiveIsCorrect = (correcao && correcao.isCorrect) || (meta.anulada === true && studentAnswer !== '');

          questionEntry.total += 1;
          questionEntry.earnedPoints += earnedPoints;
          questionEntry.totalPoints += totalPoints;

          if (meta.tipo !== 'discursiva') {
            if (studentAnswer === '') {
              questionEntry.brancos += 1;
            } else if (effectiveIsCorrect) {
              questionEntry.corretas += 1;
            } else {
              questionEntry.incorretas += 1;
            }

            if (studentAnswer !== '') {
              questionEntry.alternativaCounts[studentAnswer] = Number(questionEntry.alternativaCounts[studentAnswer] || 0) + 1;
              if (!effectiveIsCorrect) {
                questionEntry.alternativasErradas[studentAnswer] = Number(questionEntry.alternativasErradas[studentAnswer] || 0) + 1;
              }
            }
          } else if (totalPoints > 0 && earnedPoints >= totalPoints) {
            questionEntry.corretas += 1;
          }

          var disciplinaEntry = ensureStatsAggregateEntry(disciplinaMap, meta.disciplina, {
            nome: meta.disciplina,
            earnedPoints: 0,
            totalPoints: 0,
            totalQuestoes: 0,
            corretas: 0,
            brancos: 0,
          });
          disciplinaEntry.earnedPoints += earnedPoints;
          disciplinaEntry.totalPoints += totalPoints;
          disciplinaEntry.totalQuestoes += 1;
          disciplinaEntry.corretas += effectiveIsCorrect ? 1 : 0;
          disciplinaEntry.brancos += studentAnswer === '' ? 1 : 0;

          var skillKey = String(meta.habilidadeCodigo || meta.habilidade || 'Habilidade não informada');
          var habilidadeEntry = ensureStatsAggregateEntry(habilidadeMap, skillKey, {
            nome: meta.habilidade,
            earnedPoints: 0,
            totalPoints: 0,
            totalQuestoes: 0,
            masteryUnitsEarned: 0,
            masteryUnitsTotal: 0,
            alunosAtingiram: 0,
            alunosNaoAtingiram: 0,
          });
          habilidadeEntry.earnedPoints += earnedPoints;
          habilidadeEntry.totalPoints += totalPoints;
          habilidadeEntry.totalQuestoes += 1;
          habilidadeEntry.masteryUnitsTotal += 1;
          habilidadeEntry.masteryUnitsEarned += questionMastered ? 1 : 0;

          allSkills[skillKey] = {
            nome: meta.habilidade,
          };
          if (!alunoEntry.habilidades[skillKey]) {
            alunoEntry.habilidades[skillKey] = {
              habilidade: meta.habilidade,
              earnedPoints: 0,
              totalPoints: 0,
              masteryUnitsEarned: 0,
              masteryUnitsTotal: 0,
            };
          }
          alunoEntry.habilidades[skillKey].earnedPoints += earnedPoints;
          alunoEntry.habilidades[skillKey].totalPoints += totalPoints;
          alunoEntry.habilidades[skillKey].masteryUnitsTotal += 1;
          alunoEntry.habilidades[skillKey].masteryUnitsEarned += questionMastered ? 1 : 0;
        });
      });

      Object.keys(alunoMap).forEach(function (key) {
        var alunoEntry = alunoMap[key];
        var habilidadesAtingidas = [];
        var habilidadesPendentes = [];

        Object.keys(allSkills).forEach(function (skillKey) {
          var skillLabel = allSkills[skillKey] && allSkills[skillKey].nome
            ? allSkills[skillKey].nome
            : skillKey;
          var skillEntry = alunoEntry.habilidades[skillKey] || {
            habilidade: skillLabel,
            earnedPoints: 0,
            totalPoints: 0,
            masteryUnitsEarned: 0,
            masteryUnitsTotal: 0,
          };
          var reached = getStatsSkillMasteryLevel(skillEntry);
          if (reached) {
            habilidadesAtingidas.push(skillLabel);
          } else {
            habilidadesPendentes.push(skillLabel);
          }
        });

        alunoEntry.habilidadesAtingidas = habilidadesAtingidas;
        alunoEntry.habilidadesPendentes = habilidadesPendentes;
      });

      Object.keys(habilidadeMap).forEach(function (skillName) {
        var reachedCount = 0;
        var pendingCount = 0;
        Object.keys(alunoMap).forEach(function (alunoKey) {
          var skillEntry = alunoMap[alunoKey].habilidades[skillName] || {
            habilidade: habilidadeMap[skillName].nome,
            earnedPoints: 0,
            totalPoints: 0,
            masteryUnitsEarned: 0,
            masteryUnitsTotal: 0,
          };
          if (getStatsSkillMasteryLevel(skillEntry)) {
            reachedCount += 1;
          } else {
            pendingCount += 1;
          }
        });

        habilidadeMap[skillName].alunosAtingiram = reachedCount;
        habilidadeMap[skillName].alunosNaoAtingiram = pendingCount;
      });

      var turmaStats = Object.keys(turmaMap).map(function (key) {
        var item = turmaMap[key];
        item.mediaPercentual = item.totalAlunos > 0 ? (item.percentualSum / item.totalAlunos) : 0;
        item.masteryPercent = item.totalPoints > 0 ? ((item.earnedPoints / item.totalPoints) * 100) : 0;
        return item;
      }).sort(function (left, right) {
        return right.mediaPercentual - left.mediaPercentual || left.nome.localeCompare(right.nome, 'pt-BR', { sensitivity: 'base' });
      });

      var disciplinaStats = Object.keys(disciplinaMap).map(function (key) {
        var item = disciplinaMap[key];
        item.masteryPercent = item.totalPoints > 0 ? ((item.earnedPoints / item.totalPoints) * 100) : 0;
        return item;
      }).sort(function (left, right) {
        return right.masteryPercent - left.masteryPercent || left.nome.localeCompare(right.nome, 'pt-BR', { sensitivity: 'base' });
      });

      var habilidadeStats = Object.keys(habilidadeMap).map(function (key) {
        var item = habilidadeMap[key];
        item.masteryPercent = item.totalPoints > 0 ? ((item.earnedPoints / item.totalPoints) * 100) : 0;
        item.alcancePercent = safeRows.length > 0 ? ((item.alunosAtingiram / safeRows.length) * 100) : 0;
        return item;
      }).sort(function (left, right) {
        return right.masteryPercent - left.masteryPercent || left.nome.localeCompare(right.nome, 'pt-BR', { sensitivity: 'base' });
      });

      var questionStatsList = Object.keys(questionStats).map(function (key) {
        var item = questionStats[key];
        item.acertoPercent = item.total > 0 ? ((item.corretas / item.total) * 100) : 0;
        item.erroPercent = item.total > 0 ? ((item.incorretas / item.total) * 100) : 0;
        item.brancoPercent = item.total > 0 ? ((item.brancos / item.total) * 100) : 0;
        item.masteryPercent = item.totalPoints > 0 ? ((item.earnedPoints / item.totalPoints) * 100) : item.acertoPercent;
        return item;
      }).sort(function (left, right) {
        return left.questionNumber - right.questionNumber;
      });

      var alunoStats = Object.keys(alunoMap).map(function (key) {
        return alunoMap[key];
      }).sort(function (left, right) {
        return right.percentual - left.percentual || left.alunoNome.localeCompare(right.alunoNome, 'pt-BR', { sensitivity: 'base' });
      });

      return {
        totalCorrecoes: safeRows.length,
        mediaPercentual: safeRows.length > 0
          ? (safeRows.reduce(function (sum, row) { return sum + Number(row.percentual || 0); }, 0) / safeRows.length)
          : 0,
        pontuacaoTotal: overallTotalPoints,
        pontuacaoObtida: overallEarnedPoints,
        turmaStats: turmaStats,
        disciplinaStats: disciplinaStats,
        habilidadeStats: habilidadeStats,
        questionStats: questionStatsList,
        alunoStats: alunoStats,
      };
    }

    function buildAvaliacaoStatsDataset(rows) {
      return buildAvaliacaoStatsDatasetFromNormalizedRows(getStatsNormalizedCorrecoesRows(rows));
    }

    function renderStatsBadgeList(items, emptyLabel) {
      var safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
      if (!safeItems.length) {
        return '<span class="admin-avaliacao-stats-badge is-muted">' + escapeHtml(emptyLabel) + '</span>';
      }

      var visibleItems = safeItems.slice(0, 4);
      var badges = visibleItems.map(function (item) {
        return '<span class="admin-avaliacao-stats-badge">' + escapeHtml(item) + '</span>';
      });

      if (safeItems.length > visibleItems.length) {
        badges.push('<span class="admin-avaliacao-stats-badge is-muted">+' + escapeHtml(String(safeItems.length - visibleItems.length)) + '</span>');
      }

      return badges.join('');
    }

    function renderStatsSkillListButton(kind, items, alunoNome, turmaNome) {
      var safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
      var safeKind = String(kind || '').trim() === 'pendentes' ? 'pendentes' : 'atingidas';
      var buttonClass = safeKind === 'pendentes' ? 'btn-outline-warning' : 'btn-outline-primary';
      var buttonLabel = safeKind === 'pendentes' ? 'Visualizar não alcançadas' : 'Visualizar alcançadas';
      var serializedItems = escapeHtml(JSON.stringify(safeItems));

      return '<button type="button" class="btn btn-sm ' + buttonClass + ' js-admin-avaliacao-stats-skills-view"'
        + ' data-kind="' + escapeHtml(safeKind) + '"'
        + ' data-aluno="' + escapeHtml(alunoNome) + '"'
        + ' data-turma="' + escapeHtml(turmaNome) + '"'
        + ' data-items="' + serializedItems + '"'
        + (safeItems.length ? '' : ' disabled') + '>'
        + escapeHtml(buttonLabel + ' (' + safeItems.length + ')')
        + '</button>';
    }

    function openStatsSkillsModal(kind, alunoNome, turmaNome, items) {
      var safeKind = String(kind || '').trim() === 'pendentes' ? 'pendentes' : 'atingidas';
      var safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
      var tipoLabel = safeKind === 'pendentes' ? 'Habilidades não alcançadas' : 'Habilidades alcançadas';
      var alunoLabel = String(alunoNome || '').trim() || 'Estudante não identificado';
      var turmaLabel = String(turmaNome || '').trim() || 'Turma não informada';

      if (statsSkillsModalTitle) {
        statsSkillsModalTitle.textContent = tipoLabel;
      }

      if (statsSkillsModalSummary) {
        statsSkillsModalSummary.textContent = alunoLabel + ' • ' + turmaLabel + ' • ' + safeItems.length + ' item(ns)';
      }

      if (statsSkillsModalList) {
        statsSkillsModalList.innerHTML = safeItems.length
          ? safeItems.map(function (item) {
            return '<div class="border rounded px-3 py-2 bg-light small">' + escapeHtml(item) + '</div>';
          }).join('')
          : '<div class="text-secondary small text-center py-3">Nenhuma habilidade nesta categoria.</div>';
      }

      if (statsSkillsModalInstance) {
        statsSkillsModalInstance.show();
      }
    }

    function buildStatsFilterableAttrs(searchText, filterTokens) {
      var normalizedSearch = normalizeSearchValue(searchText);
      var safeTokens = Array.isArray(filterTokens) ? filterTokens.filter(Boolean) : [];
      return ' class="admin-avaliacao-stats-filterable js-admin-avaliacao-stats-filterable" data-search="' + escapeHtml(normalizedSearch) + '" data-filter="' + escapeHtml(safeTokens.join('|')) + '"';
    }

    function renderStatsToolbar(searchPlaceholder, filterOptions) {
      var options = Array.isArray(filterOptions) ? filterOptions : [];
      var turmaFilterValues = readStatsDatasetFilterValues('scopeTurma');
      var alunoFilterValues = readStatsDatasetFilterValues('scopeAluno');
      var panelKey = arguments.length > 2 ? String(arguments[2] || '').trim() : '';
      var panelFilterValues = getStatsPanelFilterValue(panelKey, options);
      var summaryChips = [];

      getStatsScopeOptionLabels('scopeTurmaOptions', turmaFilterValues).forEach(function (label) {
        summaryChips.push(renderStatsFilterChip(label, 'Turma'));
      });
      getStatsScopeOptionLabels('scopeAlunoOptions', alunoFilterValues).forEach(function (label) {
        summaryChips.push(renderStatsFilterChip(label, 'Estudante'));
      });
      getStatsSectionOptionLabels(options, panelFilterValues).forEach(function (label) {
        summaryChips.push(renderStatsFilterChip(label, 'Filtro'));
      });

      var summaryBody = summaryChips.length
        ? '<div class="admin-avaliacao-selector-chip-list">' + summaryChips.join('') + '</div>'
        : '<div class="small text-secondary">Nenhum filtro selecionado.</div>';

      return '<div class="admin-avaliacao-stats-toolbar">'
        + '<div class="admin-avaliacao-stats-toolbar-search-wrap">'
        + '<input type="search" class="form-control form-control-sm admin-avaliacao-stats-search js-admin-avaliacao-stats-search" placeholder="' + escapeHtml(searchPlaceholder || 'Buscar...') + '" autocomplete="off">'
        + '</div>'
        + '<div class="admin-avaliacao-selector-summary-card admin-avaliacao-stats-filters-card">'
        + '<div class="admin-avaliacao-selector-summary-body">'
        + summaryBody
        + '</div>'
        + '<div class="admin-avaliacao-stats-filters-actions">'
        + '<button type="button" class="btn btn-outline-primary btn-sm js-admin-avaliacao-stats-filters-open" data-stats-panel="' + escapeHtml(panelKey) + '" data-filter-options="' + escapeHtml(JSON.stringify(options)) + '"><i class="las la-sliders-h me-1"></i>Selecionar filtros</button>'
        + '<button type="button" class="btn btn-outline-secondary btn-sm js-admin-avaliacao-stats-filters-clear" data-stats-panel="' + escapeHtml(panelKey) + '"><i class="las la-eraser me-1"></i>Limpar filtros</button>'
        + '</div>'
        + '</div>'
        + '</div>';
    }

    function getStatsPanelFilterMap() {
      if (!statsRoot) {
        return {};
      }

      try {
        var parsed = JSON.parse(String(statsRoot.dataset.panelFilters || '{}'));
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        return {};
      }
    }

    function setStatsPanelFilterValue(panelKey, value) {
      if (!statsRoot) {
        return;
      }

      var safePanelKey = String(panelKey || '').trim();
      if (safePanelKey === '') {
        return;
      }

      var panelFilters = getStatsPanelFilterMap();
      panelFilters[safePanelKey] = normalizeStatsFilterValues(value, Array.isArray(value) ? value : [value]);
      statsRoot.dataset.panelFilters = JSON.stringify(panelFilters);
    }

    function getStatsPanelFilterValue(panelKey, options) {
      var safePanelKey = String(panelKey || '').trim();
      if (safePanelKey === '') {
        return ['all'];
      }

      var panelFilters = getStatsPanelFilterMap();
      var currentValues = parseStatsDatasetFilterValues(panelFilters[safePanelKey]);
      var safeOptions = Array.isArray(options) ? options : [];
      currentValues = normalizeStatsFilterValues(currentValues, safeOptions.map(function (option) {
        return String(option && option.value || '').trim();
      }));

      return currentValues;
    }

    function getStatsScopeOptionsByDatasetKey(datasetKey) {
      if (!statsRoot) {
        return [];
      }

      try {
        var parsed = JSON.parse(String(statsRoot.dataset[datasetKey] || '[]'));
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function getStatsScopeOptionLabels(datasetKey, values) {
      var safeValues = normalizeStatsFilterValues(values, Array.isArray(values) ? values : [values]);
      if (!hasActiveStatsFilterValues(safeValues)) {
        return [];
      }

      var options = getStatsScopeOptionsByDatasetKey(datasetKey);
      return safeValues.map(function (safeValue) {
        var match = options.find(function (option) {
          return String(option && option.value || '') === safeValue;
        });
        return String(match && match.label || '').trim();
      }).filter(Boolean);
    }

    function getStatsSectionOptionLabels(options, values) {
      var safeValues = normalizeStatsFilterValues(values, Array.isArray(values) ? values : [values]);
      if (!hasActiveStatsFilterValues(safeValues)) {
        return [];
      }

      var safeOptions = Array.isArray(options) ? options : [];
      return safeValues.map(function (safeValue) {
        var match = safeOptions.find(function (option) {
          return String(option && option.value || '') === safeValue;
        });
        return String(match && match.label || '').trim();
      }).filter(Boolean);
    }

    function renderStatsFilterChip(label, prefix) {
      var safeLabel = String(label || '').trim();
      var safePrefix = String(prefix || '').trim();
      if (safeLabel === '') {
        return '';
      }

      return '<span class="admin-avaliacao-selector-chip is-muted">' + escapeHtml(safePrefix !== '' ? (safePrefix + ': ' + safeLabel) : safeLabel) + '</span>';
    }

    function renderStatsFilterCheckboxCards(listElement, groupName, options, selectedValues, defaultLabel) {
      if (!(listElement instanceof HTMLElement)) {
        return;
      }

      var safeGroupName = String(groupName || '').trim();
      var safeSelectedValues = normalizeStatsFilterValues(selectedValues, [{ value: 'all' }].concat(Array.isArray(options) ? options : []).map(function (option) {
        return String(option && option.value || option || '').trim();
      }));
      var safeOptions = Array.isArray(options) ? options : [];
      var cards = [{ value: 'all', label: String(defaultLabel || 'Todos') }].concat(safeOptions.filter(function (option) {
        return String(option && option.value || '').trim() !== 'all';
      }).map(function (option) {
        return {
          value: String(option && option.value || ''),
          label: String(option && option.label || ''),
        };
      })).filter(function (option) {
        return option.label.trim() !== '';
      });

      listElement.innerHTML = cards.map(function (option, index) {
        var optionValue = String(option.value || '').trim() || 'all';
        var optionLabel = String(option.label || '').trim();
        var optionId = 'adminAvaliacaoStatsFilter' + safeGroupName + index;
        return '<label class="admin-avaliacao-stats-filter-card">'
          + '<input type="checkbox" class="form-check-input admin-avaliacao-stats-filter-card-input js-admin-avaliacao-stats-filter-option"'
          + ' id="' + escapeHtml(optionId) + '"'
          + ' data-filter-group="' + escapeHtml(safeGroupName) + '"'
          + ' data-filter-search="' + escapeHtml(normalizeSearchValue(optionLabel)) + '"'
          + ' value="' + escapeHtml(optionValue) + '"'
          + (safeSelectedValues.indexOf(optionValue) !== -1 ? ' checked' : '')
          + '>'
          + '<span class="admin-avaliacao-stats-filter-card-body">'
          + '<span class="admin-avaliacao-stats-filter-card-title">' + escapeHtml(optionLabel) + '</span>'
          + '</span>'
          + '</label>';
      }).join('');
    }

    function applyStatsFilterCardSearch(listElement, query) {
      if (!(listElement instanceof HTMLElement)) {
        return;
      }

      var normalizedQuery = normalizeSearchValue(query || '');
      listElement.querySelectorAll('.admin-avaliacao-stats-filter-card').forEach(function (card) {
        if (!(card instanceof HTMLElement)) {
          return;
        }

        var input = card.querySelector('.js-admin-avaliacao-stats-filter-option');
        var searchableText = input instanceof HTMLElement ? String(input.getAttribute('data-filter-search') || '') : '';
        var shouldShow = normalizedQuery === '' || searchableText.indexOf(normalizedQuery) !== -1;
        card.classList.toggle('d-none', !shouldShow);
      });
    }

    function renderStatsFiltersAlunoCards() {
      if (!statsRoot) {
        return;
      }

      var normalizedRows = getStatsNormalizedCorrecoesRows(correcoesRows);
      var scopeConfig = buildStatsScopeOptions(normalizedRows, statsFiltersDraftState.turmaValues, statsFiltersDraftState.alunoValues);
      statsFiltersDraftState.turmaValues = scopeConfig.turmaValues;
      statsFiltersDraftState.alunoValues = scopeConfig.alunoValues;
      renderStatsFilterCheckboxCards(statsFiltersAlunoList, 'Estudante', scopeConfig.alunoOptions, statsFiltersDraftState.alunoValues, 'Todos os estudantes');
      applyStatsFilterCardSearch(statsFiltersAlunoList, statsFiltersAlunoSearch ? statsFiltersAlunoSearch.value : '');
    }

    function renderStatsFilterEmpty() {
      return '<div class="admin-avaliacao-stats-filter-empty d-none js-admin-avaliacao-stats-filter-empty">Nenhum resultado encontrado para os filtros atuais.</div>';
    }

    function getStatsInsightCategory(item) {
      var title = normalizeSearchValue(item && item.title || '');
      if (title.indexOf('quest') !== -1) {
        return 'questoes';
      }
      if (title.indexOf('disciplina') !== -1) {
        return 'disciplinas';
      }
      if (title.indexOf('habilidade') !== -1) {
        return 'habilidades';
      }
      if (title.indexOf('turma') !== -1) {
        return 'turmas';
      }
      return 'geral';
    }

    function renderStatsBarList(items, percentKey, metaBuilder, options) {
      if (!Array.isArray(items) || !items.length) {
        return '<div class="admin-avaliacao-stats-empty-text">Nenhum dado disponível.</div>';
      }

      var config = options && typeof options === 'object' ? options : {};

      return '<div class="admin-avaliacao-stats-bar-list">' + items.map(function (item) {
        var percentValue = Math.max(0, Math.min(100, Number(item[percentKey] || 0)));
        var searchText = typeof config.searchTextBuilder === 'function'
          ? config.searchTextBuilder(item)
          : String(item.nome || '');
        var filterTokens = typeof config.filterTokensBuilder === 'function'
          ? config.filterTokensBuilder(item)
          : [];
        return '<div' + buildStatsFilterableAttrs(searchText, filterTokens) + '><div class="admin-avaliacao-stats-bar-item">'
          + '<div class="admin-avaliacao-stats-bar-head">'
          + '<span class="admin-avaliacao-stats-bar-label">' + escapeHtml(String(item.nome || '-')) + '</span>'
          + '<span>' + escapeHtml(metaBuilder(item)) + '</span>'
          + '</div>'
          + '<div class="admin-avaliacao-stats-bar-track"><div class="admin-avaliacao-stats-bar-fill" style="width:' + escapeHtml(String(percentValue.toFixed(2))) + '%"></div></div>'
          + '</div></div>';
      }).join('') + '</div>';
    }

    function renderStatsQuestionDistribution(question) {
      var labels = Array.isArray(question.alternativas) && question.alternativas.length
        ? question.alternativas
        : Object.keys(question.alternativaCounts || {}).sort();
      if (!labels.length) {
        return '<span class="admin-avaliacao-stats-micro">Questão discursiva.</span>';
      }

      return '<div class="admin-avaliacao-stats-question-dist">' + labels.map(function (label) {
        var totalCount = Number(question.alternativaCounts && question.alternativaCounts[label] || 0);
        var wrongCount = Number(question.alternativasErradas && question.alternativasErradas[label] || 0);
        var percent = question.total > 0 ? ((totalCount / question.total) * 100) : 0;
        return '<div class="admin-avaliacao-stats-question-alt">'
          + '<span class="admin-avaliacao-stats-question-alt-label">' + escapeHtml(label) + (label === question.correta ? ' correta' : '') + '</span>'
          + '<div class="admin-avaliacao-stats-question-alt-track"><div class="admin-avaliacao-stats-question-alt-fill" style="width:' + escapeHtml(String(percent.toFixed(2))) + '%"></div></div>'
          + '<span>' + escapeHtml(formatStatsPercent(percent)) + ' • erradas ' + escapeHtml(String(wrongCount)) + '</span>'
          + '</div>';
      }).join('') + '</div>';
    }

    function buildAvaliacaoStatsInsights(dataset) {
      var insights = [];
      var hardestQuestions = dataset.questionStats.filter(function (item) {
        return item.tipo !== 'discursiva';
      }).slice().sort(function (left, right) {
        return left.acertoPercent - right.acertoPercent;
      }).slice(0, 3);
      if (hardestQuestions.length) {
        insights.push({
          title: 'Questões com maior dificuldade',
          text: hardestQuestions.map(function (item) {
            return 'Q' + item.questionNumber + ' (' + formatStatsPercent(item.acertoPercent) + ' de acerto)';
          }).join(' • '),
        });
      }

      var lowDisciplines = dataset.disciplinaStats.filter(function (item) {
        return item.masteryPercent < 60;
      }).slice(0, 3);
      if (lowDisciplines.length) {
        insights.push({
          title: 'Disciplinas que pedem reforço',
          text: lowDisciplines.map(function (item) {
            return item.nome + ' (' + formatStatsPercent(item.masteryPercent) + ')';
          }).join(' • '),
        });
      }

      var pendingSkills = dataset.habilidadeStats.filter(function (item) {
        return item.alcancePercent < 50;
      }).slice(0, 3);
      if (pendingSkills.length) {
        insights.push({
          title: 'Habilidades menos alcançadas',
          text: pendingSkills.map(function (item) {
            return item.nome + ' (' + formatStatsPercent(item.alcancePercent) + ' dos estudantes atingiram)';
          }).join(' • '),
        });
      }

      var bestTurma = dataset.turmaStats[0];
      if (bestTurma) {
        insights.push({
          title: 'Turma com melhor desempenho geral',
          text: bestTurma.nome + ' com média de ' + formatStatsPercent(bestTurma.mediaPercentual) + '.',
        });
      }

      return insights;
    }

    function renderStatsSideNav(items, activeKey) {
      return '<aside class="admin-avaliacao-stats-sidebar">'
        + '<div class="admin-avaliacao-stats-sidebar-card">'
        + '<div class="admin-avaliacao-stats-sidebar-title">Leituras disponíveis</div>'
        + '<div class="admin-avaliacao-stats-sidebar-subtitle">Selecione um card para abrir o detalhamento ao lado.</div>'
        + '<div class="admin-avaliacao-stats-sidebar-list">'
        + items.map(function (item) {
          var isActive = item.key === activeKey;
          return '<button type="button" class="admin-avaliacao-stats-side-tab js-admin-avaliacao-stats-tab' + (isActive ? ' is-active' : '') + '" data-stats-tab="' + escapeHtml(item.key) + '" aria-selected="' + (isActive ? 'true' : 'false') + '">'
            + '<span class="admin-avaliacao-stats-side-tab-top">'
            + '<span class="admin-avaliacao-stats-side-tab-title">' + escapeHtml(item.title) + '</span>'
            + '<span class="admin-avaliacao-stats-side-tab-value">' + escapeHtml(item.value) + '</span>'
            + '</span>'
            + '<span class="admin-avaliacao-stats-side-tab-meta">' + escapeHtml(item.meta) + '</span>'
            + '</button>';
        }).join('')
        + '</div>'
        + '</div>'
        + '</aside>';
    }

    function renderStatsDetailPanel(key, title, subtitle, pill, content, isActive) {
      return '<section class="admin-avaliacao-stats-detail-panel' + (isActive ? ' is-active' : '') + '" data-stats-panel="' + escapeHtml(key) + '" aria-hidden="' + (isActive ? 'false' : 'true') + '">'
        + '<div class="admin-avaliacao-stats-card">'
        + '<div class="admin-avaliacao-stats-card-body">'
        + '<div class="admin-avaliacao-stats-header">'
        + '<div><div class="admin-avaliacao-stats-title">' + escapeHtml(title) + '</div><div class="admin-avaliacao-stats-subtitle">' + escapeHtml(subtitle) + '</div></div>'
        + (pill ? '<span class="admin-avaliacao-stats-pill">' + escapeHtml(pill) + '</span>' : '')
        + '</div>'
        + content
        + '</div>'
        + '</div>'
        + '</section>';
    }

    function applyAvaliacaoStatsActiveTab(activeKey) {
      if (!statsRoot) {
        return;
      }

      var safeActiveKey = String(activeKey || '').trim() || 'resumo';
      statsRoot.dataset.activeTab = safeActiveKey;
      statsRoot.querySelectorAll('.js-admin-avaliacao-stats-tab').forEach(function (button) {
        if (!(button instanceof HTMLElement)) {
          return;
        }

        var isActive = String(button.getAttribute('data-stats-tab') || '') === safeActiveKey;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      statsRoot.querySelectorAll('[data-stats-panel]').forEach(function (panel) {
        if (!(panel instanceof HTMLElement)) {
          return;
        }

        var isActive = String(panel.getAttribute('data-stats-panel') || '') === safeActiveKey;
        panel.classList.toggle('is-active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        if (isActive) {
          applyStatsPanelFilters(panel);
        }
      });

      resetAvaliacaoStatsScrollPosition(safeActiveKey);
    }

    function resetScrollableElementToTop(element) {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      element.scrollTop = 0;
      if (typeof element.scrollTo === 'function') {
        element.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }

    function resetAvaliacaoStatsScrollPosition(activeKey) {
      if (!statsRoot) {
        return;
      }

      var panelSelector = '[data-stats-panel="' + String(activeKey || '').trim() + '"]';
      var activePanel = statsRoot.querySelector(panelSelector);
      resetScrollableElementToTop(activePanel);
    }

    function applyStatsPanelFilters(panelElement) {
      if (!(panelElement instanceof HTMLElement)) {
        return;
      }

      var panelKey = String(panelElement.getAttribute('data-stats-panel') || '').trim();
      var searchInput = panelElement.querySelector('.js-admin-avaliacao-stats-search');
      var searchValue = normalizeSearchValue(searchInput instanceof HTMLInputElement ? searchInput.value : '');
      var filterOptions = [];
      var openButton = panelElement.querySelector('.js-admin-avaliacao-stats-filters-open');
      if (openButton instanceof HTMLElement) {
        try {
          filterOptions = JSON.parse(String(openButton.getAttribute('data-filter-options') || '[]'));
        } catch (error) {
          filterOptions = [];
        }
      }
      var filterValues = getStatsPanelFilterValue(panelKey, filterOptions);
      var visibleCount = 0;

      panelElement.querySelectorAll('.js-admin-avaliacao-stats-filterable').forEach(function (element) {
        if (!(element instanceof HTMLElement)) {
          return;
        }

        var haystack = String(element.getAttribute('data-search') || '');
        var tokens = String(element.getAttribute('data-filter') || '').split('|').filter(Boolean);
        var matchesSearch = searchValue === '' || haystack.indexOf(searchValue) !== -1;
        var matchesFilter = !hasActiveStatsFilterValues(filterValues) || filterValues.some(function (value) {
          return tokens.indexOf(value) !== -1;
        });
        var shouldShow = matchesSearch && matchesFilter;
        element.classList.toggle('d-none', !shouldShow);
        if (shouldShow) {
          visibleCount += 1;
        }
      });

      var emptyState = panelElement.querySelector('.js-admin-avaliacao-stats-filter-empty');
      if (emptyState instanceof HTMLElement) {
        emptyState.classList.toggle('d-none', visibleCount > 0);
      }
    }

    function renderAvaliacaoStats() {
      if (!statsRoot) {
        return;
      }

      var normalizedRows = getStatsNormalizedCorrecoesRows(correcoesRows);
      if (!habilidadeSelectorCache && normalizedRows.length) {
        habilidadeFetchCache(function () {
          renderAvaliacaoStats();
        });
      }
      var scopeConfig = buildStatsScopeOptions(
        normalizedRows,
        readStatsDatasetFilterValues('scopeTurma'),
        readStatsDatasetFilterValues('scopeAluno')
      );
      writeStatsDatasetFilterValues('scopeTurma', scopeConfig.turmaValues);
      writeStatsDatasetFilterValues('scopeAluno', scopeConfig.alunoValues);
      statsRoot.dataset.scopeTurmaOptions = JSON.stringify(scopeConfig.turmaOptions);
      statsRoot.dataset.scopeAlunoOptions = JSON.stringify(scopeConfig.alunoOptions);

      var filteredRows = filterStatsRowsByScope(normalizedRows, scopeConfig.turmaValues, scopeConfig.alunoValues);
      var dataset = buildAvaliacaoStatsDatasetFromNormalizedRows(filteredRows);
      if (dataset.totalCorrecoes <= 0) {
        var scopeMessage = (hasActiveStatsFilterValues(scopeConfig.turmaValues) || hasActiveStatsFilterValues(scopeConfig.alunoValues))
          ? 'As estatísticas aparecerão aqui quando houver correções para os filtros de turma/estudante selecionados.'
          : 'As estatísticas aparecerão aqui assim que houver correções salvas para esta avaliação.';
        statsRoot.innerHTML = '<div class="admin-avaliacao-stats-empty">'
          + '<div class="admin-avaliacao-stats-empty-title">Painel pedagógico</div>'
          + '<div class="admin-avaliacao-stats-empty-text">' + escapeHtml(scopeMessage) + '</div>'
          + '</div>';
        return;
      }

      var bestTurma = dataset.turmaStats[0] || null;
      var strongestDisciplina = dataset.disciplinaStats[0] || null;
      var weakestQuestion = dataset.questionStats.slice().sort(function (left, right) {
        return left.masteryPercent - right.masteryPercent;
      })[0] || null;
      var insights = buildAvaliacaoStatsInsights(dataset);

      var currentActiveTab = String(statsRoot.dataset.activeTab || '').trim();
      var navItems = [
        {
          key: 'resumo',
          title: 'Resumo pedagógico',
          value: formatStatsPercent(dataset.mediaPercentual),
          meta: String(dataset.totalCorrecoes) + ' correções consolidadas',
        },
        {
          key: 'alertas',
          title: 'Alertas pedagógicos',
          value: String(insights.length),
          meta: insights.length > 0 ? 'Sinais para intervenção imediata' : 'Sem alertas críticos agora',
        },
        {
          key: 'turmas',
          title: 'Acertos por turma',
          value: bestTurma ? bestTurma.nome : '-',
          meta: bestTurma ? ('Melhor média: ' + formatStatsPercent(bestTurma.mediaPercentual)) : 'Sem turmas avaliadas',
        },
        {
          key: 'disciplinas',
          title: 'Desempenho por disciplina',
          value: strongestDisciplina ? strongestDisciplina.nome : '-',
          meta: strongestDisciplina ? ('Maior domínio: ' + formatStatsPercent(strongestDisciplina.masteryPercent)) : 'Sem disciplinas avaliadas',
        },
        {
          key: 'habilidades',
          title: 'Habilidades',
          value: String(dataset.habilidadeStats.length),
          meta: 'Alcance e domínio por habilidade',
        },
        {
          key: 'questoes',
          title: 'Questão por questão',
          value: weakestQuestion ? ('Q' + weakestQuestion.questionNumber) : '-',
          meta: weakestQuestion ? ('Mais crítica em ' + formatStatsPercent(weakestQuestion.masteryPercent)) : 'Sem questões avaliadas',
        },
        {
          key: 'alunos',
          title: 'Mapa por estudante',
          value: String(dataset.alunoStats.length),
          meta: 'Visão individual de desempenho',
        }
      ];
      var activeTab = navItems.some(function (item) {
        return item.key === currentActiveTab;
      }) ? currentActiveTab : 'resumo';

      var resumoContent = ''
        + renderStatsToolbar('Buscar indicador, insight ou destaque...', [
          { value: 'all', label: 'Tudo' },
          { value: 'indicadores', label: 'Indicadores' },
          { value: 'insights', label: 'Insights' },
        ], 'resumo')
        + '<div class="admin-avaliacao-stats-kpi-grid">'
        + '  <div' + buildStatsFilterableAttrs('media geral aproveitamento medio avaliacao', ['indicadores']) + '><div class="admin-avaliacao-stats-kpi"><div class="admin-avaliacao-stats-kpi-label">Média geral</div><div class="admin-avaliacao-stats-kpi-value">' + escapeHtml(formatStatsPercent(dataset.mediaPercentual)) + '</div><div class="admin-avaliacao-stats-kpi-meta">Aproveitamento médio da avaliação</div></div></div>'
        + '  <div' + buildStatsFilterableAttrs('melhor turma ' + (bestTurma ? bestTurma.nome : ''), ['indicadores']) + '><div class="admin-avaliacao-stats-kpi"><div class="admin-avaliacao-stats-kpi-label">Melhor turma</div><div class="admin-avaliacao-stats-kpi-value">' + escapeHtml(bestTurma ? bestTurma.nome : '-') + '</div><div class="admin-avaliacao-stats-kpi-meta">' + escapeHtml(bestTurma ? formatStatsPercent(bestTurma.mediaPercentual) : 'Sem dados') + '</div></div></div>'
        + '  <div' + buildStatsFilterableAttrs('questao critica q' + (weakestQuestion ? weakestQuestion.questionNumber : ''), ['indicadores']) + '><div class="admin-avaliacao-stats-kpi"><div class="admin-avaliacao-stats-kpi-label">Questão crítica</div><div class="admin-avaliacao-stats-kpi-value">' + escapeHtml(weakestQuestion ? ('Q' + weakestQuestion.questionNumber) : '-') + '</div><div class="admin-avaliacao-stats-kpi-meta">' + escapeHtml(weakestQuestion ? formatStatsPercent(weakestQuestion.masteryPercent) : 'Sem dados') + '</div></div></div>'
        + '</div>'
        + '<div class="admin-avaliacao-stats-grid-two admin-avaliacao-stats-detail-grid">'
        + '  <div' + buildStatsFilterableAttrs('melhor disciplina ' + (strongestDisciplina ? strongestDisciplina.nome : ''), ['indicadores']) + '><div class="admin-avaliacao-stats-kpi"><div class="admin-avaliacao-stats-kpi-label">Melhor disciplina</div><div class="admin-avaliacao-stats-kpi-value">' + escapeHtml(strongestDisciplina ? strongestDisciplina.nome : '-') + '</div><div class="admin-avaliacao-stats-kpi-meta">' + escapeHtml(strongestDisciplina ? formatStatsPercent(strongestDisciplina.masteryPercent) : 'Sem dados') + '</div></div></div>'
        + '  <div' + buildStatsFilterableAttrs('habilidades monitoradas cobertura pedagogica', ['indicadores']) + '><div class="admin-avaliacao-stats-kpi"><div class="admin-avaliacao-stats-kpi-label">Habilidades monitoradas</div><div class="admin-avaliacao-stats-kpi-value">' + escapeHtml(String(dataset.habilidadeStats.length)) + '</div><div class="admin-avaliacao-stats-kpi-meta">Cobertura pedagógica desta avaliação</div></div></div>'
        + '</div>'
        + '<div class="admin-avaliacao-stats-list admin-avaliacao-stats-detail-grid">' + insights.map(function (item) {
          return '<div' + buildStatsFilterableAttrs(item.title + ' ' + item.text, ['insights', getStatsInsightCategory(item)]) + '><div class="admin-avaliacao-stats-insight"><div class="admin-avaliacao-stats-insight-title">' + escapeHtml(item.title) + '</div><div class="admin-avaliacao-stats-insight-text">' + escapeHtml(item.text) + '</div></div></div>';
        }).join('') + '</div>'
        + renderStatsFilterEmpty();

      var alertasContent = renderStatsToolbar('Buscar alerta por texto ou tema...', [
        { value: 'all', label: 'Todos os alertas' },
        { value: 'questoes', label: 'Questões' },
        { value: 'disciplinas', label: 'Disciplinas' },
        { value: 'habilidades', label: 'Habilidades' },
        { value: 'turmas', label: 'Turmas' },
        { value: 'geral', label: 'Geral' },
      ], 'alertas')
        + (insights.length
          ? '<div class="admin-avaliacao-stats-list">' + insights.map(function (item) {
            return '<div' + buildStatsFilterableAttrs(item.title + ' ' + item.text, [getStatsInsightCategory(item)]) + '><div class="admin-avaliacao-stats-insight"><div class="admin-avaliacao-stats-insight-title">' + escapeHtml(item.title) + '</div><div class="admin-avaliacao-stats-insight-text">' + escapeHtml(item.text) + '</div></div></div>';
          }).join('') + '</div>' + renderStatsFilterEmpty()
          : '<div class="admin-avaliacao-stats-empty-text">Sem alertas pedagógicos relevantes no momento.</div>');

      var turmasContent = renderStatsToolbar('Buscar turma...', [
        { value: 'all', label: 'Todas as turmas' },
        { value: 'alto', label: 'Média acima de 70%' },
        { value: 'medio', label: 'Média entre 50% e 70%' },
        { value: 'baixo', label: 'Média abaixo de 50%' },
      ], 'turmas')
        + renderStatsBarList(dataset.turmaStats, 'mediaPercentual', function (item) {
          return formatStatsPercent(item.mediaPercentual) + ' • ' + item.totalAlunos + ' estudante(s)';
        }, {
          searchTextBuilder: function (item) {
            return item.nome + ' ' + item.totalAlunos + ' ' + formatStatsPercent(item.mediaPercentual);
          },
          filterTokensBuilder: function (item) {
            return [item.mediaPercentual >= 70 ? 'alto' : (item.mediaPercentual >= 50 ? 'medio' : 'baixo')];
          }
        })
        + '<div class="admin-avaliacao-stats-table-wrap mt-3"><table class="admin-avaliacao-stats-table"><thead><tr><th>Turma</th><th>Média</th><th>Estudantes corrigidos</th></tr></thead><tbody>'
        + dataset.turmaStats.map(function (item) {
          return '<tr' + buildStatsFilterableAttrs(item.nome + ' ' + item.totalAlunos + ' ' + formatStatsPercent(item.mediaPercentual), [item.mediaPercentual >= 70 ? 'alto' : (item.mediaPercentual >= 50 ? 'medio' : 'baixo')]) + '>'
            + '<td><strong>' + escapeHtml(item.nome) + '</strong></td>'
            + '<td>' + escapeHtml(formatStatsPercent(item.mediaPercentual)) + '</td>'
            + '<td>' + escapeHtml(String(item.totalAlunos)) + '</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table></div>'
        + renderStatsFilterEmpty();

      var disciplinasContent = renderStatsToolbar('Buscar disciplina...', [
        { value: 'all', label: 'Todas as disciplinas' },
        { value: 'forte', label: 'Domínio acima de 70%' },
        { value: 'atencao', label: 'Domínio entre 50% e 70%' },
        { value: 'critico', label: 'Domínio abaixo de 50%' },
      ], 'disciplinas')
        + renderStatsBarList(dataset.disciplinaStats, 'masteryPercent', function (item) {
          return formatStatsPercent(item.masteryPercent);
        }, {
          searchTextBuilder: function (item) {
            return item.nome + ' ' + formatStatsPercent(item.masteryPercent);
          },
          filterTokensBuilder: function (item) {
            return [item.masteryPercent >= 70 ? 'forte' : (item.masteryPercent >= 50 ? 'atencao' : 'critico')];
          }
        })
        + '<div class="admin-avaliacao-stats-table-wrap mt-3"><table class="admin-avaliacao-stats-table"><thead><tr><th>Disciplina</th><th>Domínio</th><th>Brancos</th></tr></thead><tbody>'
        + dataset.disciplinaStats.map(function (item) {
          return '<tr' + buildStatsFilterableAttrs(item.nome + ' ' + formatStatsPercent(item.masteryPercent), [item.masteryPercent >= 70 ? 'forte' : (item.masteryPercent >= 50 ? 'atencao' : 'critico')]) + '>'
            + '<td><strong>' + escapeHtml(item.nome) + '</strong></td>'
            + '<td>' + escapeHtml(formatStatsPercent(item.masteryPercent)) + '</td>'
            + '<td>' + escapeHtml(String(item.brancos || 0)) + '</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table></div>'
        + renderStatsFilterEmpty();

      var habilidadesContent = renderStatsToolbar('Buscar habilidade...', [
        { value: 'all', label: 'Todas as habilidades' },
        { value: 'alcancada', label: 'Alcance acima de 70%' },
        { value: 'parcial', label: 'Alcance entre 50% e 70%' },
        { value: 'pendente', label: 'Alcance abaixo de 50%' },
      ], 'habilidades')
        + renderStatsBarList(dataset.habilidadeStats, 'alcancePercent', function (item) {
          return formatStatsPercent(item.alcancePercent) + ' atingiram • domínio ' + formatStatsPercent(item.masteryPercent);
        }, {
          searchTextBuilder: function (item) {
            return item.nome + ' ' + formatStatsPercent(item.alcancePercent) + ' ' + formatStatsPercent(item.masteryPercent);
          },
          filterTokensBuilder: function (item) {
            return [item.alcancePercent >= 70 ? 'alcancada' : (item.alcancePercent >= 50 ? 'parcial' : 'pendente')];
          }
        })
        + '<div class="admin-avaliacao-stats-section-note">Critério de habilidade alcançada: pelo menos <span class="admin-avaliacao-stats-highlight">70%</span> da pontuação disponível na habilidade.</div>'
        + '<div class="admin-avaliacao-stats-table-wrap mt-3"><table class="admin-avaliacao-stats-table"><thead><tr><th>Habilidade</th><th>Domínio</th><th>Alcance</th><th>Atingiram</th><th>Não atingiram</th></tr></thead><tbody>'
        + dataset.habilidadeStats.map(function (item) {
          return '<tr' + buildStatsFilterableAttrs(item.nome + ' ' + formatStatsPercent(item.alcancePercent) + ' ' + formatStatsPercent(item.masteryPercent), [item.alcancePercent >= 70 ? 'alcancada' : (item.alcancePercent >= 50 ? 'parcial' : 'pendente')]) + '>'
            + '<td><strong>' + escapeHtml(item.nome) + '</strong></td>'
            + '<td>' + escapeHtml(formatStatsPercent(item.masteryPercent)) + '</td>'
            + '<td>' + escapeHtml(formatStatsPercent(item.alcancePercent)) + '</td>'
            + '<td>' + escapeHtml(String(item.alunosAtingiram || 0)) + '</td>'
            + '<td>' + escapeHtml(String(item.alunosNaoAtingiram || 0)) + '</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table></div>'
        + renderStatsFilterEmpty();

      var questoesContent = renderStatsToolbar('Buscar questão, disciplina ou habilidade...', [
        { value: 'all', label: 'Todas as questões' },
        { value: 'objetiva', label: 'Objetivas' },
        { value: 'discursiva', label: 'Discursivas' },
        { value: 'critica', label: 'Críticas abaixo de 50%' },
      ], 'questoes')
        + '<div class="admin-avaliacao-stats-table-wrap"><table class="admin-avaliacao-stats-table"><thead><tr><th>Questão</th><th>Contexto</th><th>Acerto</th><th>Fluxo de resposta</th><th>Distribuição por alternativa</th></tr></thead><tbody>'
        + dataset.questionStats.map(function (item) {
          return '<tr' + buildStatsFilterableAttrs('questao ' + item.questionNumber + ' ' + item.disciplina + ' ' + item.habilidade + ' ' + item.tipoLabel + ' ' + (item.correta || ''), [item.tipo === 'discursiva' ? 'discursiva' : 'objetiva', item.masteryPercent < 50 ? 'critica' : 'regular']) + '>'
            + '<td><strong>Q' + escapeHtml(String(item.questionNumber)) + '</strong><div class="admin-avaliacao-stats-micro">' + escapeHtml(item.tipoLabel) + '</div></td>'
            + '<td><div><strong>' + escapeHtml(item.disciplina) + '</strong></div><div class="admin-avaliacao-stats-micro">' + escapeHtml(item.habilidade) + '</div></td>'
            + '<td><div><strong>' + escapeHtml(formatStatsPercent(item.masteryPercent)) + '</strong></div><div class="admin-avaliacao-stats-micro">' + (item.anulada ? 'Anulada' : 'Gabarito: ' + escapeHtml(item.correta || 'Discursiva')) + '</div></td>'
            + '<td><div class="admin-avaliacao-stats-stacked-track"><span class="admin-avaliacao-stats-stacked-segment is-correct" style="width:' + escapeHtml(String(item.acertoPercent.toFixed(2))) + '%"></span><span class="admin-avaliacao-stats-stacked-segment is-wrong" style="width:' + escapeHtml(String(item.erroPercent.toFixed(2))) + '%"></span><span class="admin-avaliacao-stats-stacked-segment is-blank" style="width:' + escapeHtml(String(item.brancoPercent.toFixed(2))) + '%"></span></div><div class="admin-avaliacao-stats-micro">Acertos ' + escapeHtml(formatStatsPercent(item.acertoPercent)) + ' • Erros ' + escapeHtml(formatStatsPercent(item.erroPercent)) + ' • Brancos ' + escapeHtml(formatStatsPercent(item.brancoPercent)) + '</div></td>'
            + '<td>' + renderStatsQuestionDistribution(item) + '</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table></div>'
        + renderStatsFilterEmpty();

      var alunosContent = renderStatsToolbar('Buscar estudante, turma ou habilidade...', [
        { value: 'all', label: 'Todos os estudantes' },
        { value: 'destaque', label: 'Sem pendências' },
        { value: 'atencao', label: 'Com pendências' },
      ], 'alunos')
        + '<div class="admin-avaliacao-stats-table-wrap"><table class="admin-avaliacao-stats-table"><thead><tr><th>Estudante</th><th>Turma</th><th>Resultado</th><th>Habilidades alcançadas</th><th>Habilidades não alcançadas</th></tr></thead><tbody>'
        + dataset.alunoStats.map(function (item) {
          return '<tr' + buildStatsFilterableAttrs(item.alunoNome + ' ' + item.turmaNome + ' ' + item.habilidadesAtingidas.join(' ') + ' ' + item.habilidadesPendentes.join(' '), [item.habilidadesPendentes.length ? 'atencao' : 'destaque']) + '>'
            + '<td><strong>' + escapeHtml(item.alunoNome) + '</strong></td>'
            + '<td>' + escapeHtml(item.turmaNome) + '</td>'
            + '<td><div><strong>' + escapeHtml(formatStatsPercent(item.percentual)) + '</strong></div></td>'
            + '<td>' + renderStatsSkillListButton('atingidas', item.habilidadesAtingidas, item.alunoNome, item.turmaNome) + '</td>'
            + '<td>' + renderStatsSkillListButton('pendentes', item.habilidadesPendentes, item.alunoNome, item.turmaNome) + '</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table></div>'
        + renderStatsFilterEmpty();

      statsRoot.innerHTML = '<div class="admin-avaliacao-stats-shell">'
        + renderStatsSideNav(navItems, activeTab)
        + '<div class="admin-avaliacao-stats-detail">'
        + renderStatsDetailPanel('resumo', 'Resumo pedagógico', 'Leitura consolidada por turma, disciplina, habilidade, questão e estudante.', String(dataset.totalCorrecoes) + ' correções', resumoContent, activeTab === 'resumo')
        + renderStatsDetailPanel('alertas', 'Alertas pedagógicos', 'Sinais imediatos para intervenção e revisão.', insights.length ? String(insights.length) + ' alertas' : '', alertasContent, activeTab === 'alertas')
        + renderStatsDetailPanel('turmas', 'Acertos por turma', 'Média percentual e volume de estudantes corrigidos.', bestTurma ? ('Destaque: ' + bestTurma.nome) : '', turmasContent, activeTab === 'turmas')
        + renderStatsDetailPanel('disciplinas', 'Desempenho por disciplina', 'Domínio percentual e volume de respostas em branco por disciplina.', strongestDisciplina ? ('Top: ' + strongestDisciplina.nome) : '', disciplinasContent, activeTab === 'disciplinas')
        + renderStatsDetailPanel('habilidades', 'Habilidades e alcance pedagógico', 'Domínio da habilidade e percentual de estudantes que a atingiram.', String(dataset.habilidadeStats.length) + ' habilidades', habilidadesContent, activeTab === 'habilidades')
        + renderStatsDetailPanel('questoes', 'Questão por questão', 'Acertos, brancos, dificuldade e distribuição das alternativas marcadas.', weakestQuestion ? ('Crítica: Q' + weakestQuestion.questionNumber) : '', questoesContent, activeTab === 'questoes')
        + renderStatsDetailPanel('alunos', 'Mapa por estudante', 'Percentual geral e habilidades alcançadas ou pendentes por estudante.', String(dataset.alunoStats.length) + ' estudantes', alunosContent, activeTab === 'alunos')
        + '</div>'
        + '</div>';

      applyAvaliacaoStatsActiveTab(activeTab);
    }

    if (statsRoot && statsRoot.dataset.statsTabsBound !== '1') {
      statsRoot.dataset.statsTabsBound = '1';
      statsRoot.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        var tabButton = target.closest('.js-admin-avaliacao-stats-tab');
        if (!(tabButton instanceof HTMLElement)) {
          return;
        }

        var tabKey = String(tabButton.getAttribute('data-stats-tab') || '').trim();
        if (tabKey === '') {
          return;
        }

        applyAvaliacaoStatsActiveTab(tabKey);

        return;
      });
      statsRoot.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        var openButton = target.closest('.js-admin-avaliacao-stats-filters-open');
        if (openButton instanceof HTMLElement) {
          var panelKey = String(openButton.getAttribute('data-stats-panel') || '').trim() || 'resumo';
          var sectionOptions = [];
          try {
            sectionOptions = JSON.parse(String(openButton.getAttribute('data-filter-options') || '[]'));
          } catch (error) {
            sectionOptions = [];
          }

          statsFiltersDraftState.panelKey = panelKey;
          statsFiltersDraftState.turmaValues = readStatsDatasetFilterValues('scopeTurma');
          statsFiltersDraftState.alunoValues = readStatsDatasetFilterValues('scopeAluno');
          statsFiltersDraftState.sectionValues = getStatsPanelFilterValue(panelKey, sectionOptions);
          statsFiltersDraftState.sectionOptions = sectionOptions;

          if (statsFiltersTurmaSearch) {
            statsFiltersTurmaSearch.value = '';
          }
          if (statsFiltersAlunoSearch) {
            statsFiltersAlunoSearch.value = '';
          }
          if (statsFiltersSectionSearch) {
            statsFiltersSectionSearch.value = '';
          }

          renderStatsFilterCheckboxCards(statsFiltersTurmaList, 'Turma', getStatsScopeOptionsByDatasetKey('scopeTurmaOptions'), statsFiltersDraftState.turmaValues, 'Todas as turmas');
          renderStatsFiltersAlunoCards();
          renderStatsFilterCheckboxCards(statsFiltersSectionList, 'Section', sectionOptions, statsFiltersDraftState.sectionValues, 'Todos');
          applyStatsFilterCardSearch(statsFiltersTurmaList, '');
          applyStatsFilterCardSearch(statsFiltersAlunoList, '');
          applyStatsFilterCardSearch(statsFiltersSectionList, '');

          if (statsFiltersModalInstance) {
            statsFiltersModalInstance.show();
          }
          return;
        }

        var clearButton = target.closest('.js-admin-avaliacao-stats-filters-clear');
        if (clearButton instanceof HTMLElement) {
          var clearPanelKey = String(clearButton.getAttribute('data-stats-panel') || '').trim() || 'resumo';
          writeStatsDatasetFilterValues('scopeTurma', ['all']);
          writeStatsDatasetFilterValues('scopeAluno', ['all']);
          setStatsPanelFilterValue(clearPanelKey, ['all']);
          renderAvaliacaoStats();
          return;
        }

        var skillsButton = target.closest('.js-admin-avaliacao-stats-skills-view');
        if (skillsButton instanceof HTMLElement) {
          var skillKind = String(skillsButton.getAttribute('data-kind') || 'atingidas');
          var skillAluno = String(skillsButton.getAttribute('data-aluno') || '');
          var skillTurma = String(skillsButton.getAttribute('data-turma') || '');
          var skillItems = [];
          try {
            skillItems = JSON.parse(String(skillsButton.getAttribute('data-items') || '[]'));
          } catch (error) {
            skillItems = [];
          }
          openStatsSkillsModal(skillKind, skillAluno, skillTurma, skillItems);
          return;
        }
      });
      statsRoot.addEventListener('input', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains('js-admin-avaliacao-stats-search')) {
          return;
        }

        var panel = target.closest('[data-stats-panel]');
        applyStatsPanelFilters(panel);
      });
      statsRoot.addEventListener('change', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        if (!target.classList.contains('js-admin-avaliacao-stats-filter')) {
          return;
        }

        var panel = target.closest('[data-stats-panel]');
        applyStatsPanelFilters(panel);
      });
    }

    if (statsFiltersModalElement) {
      statsFiltersModalElement.addEventListener('change', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.classList.contains('js-admin-avaliacao-stats-filter-option')) {
          return;
        }

        var groupName = String(target.getAttribute('data-filter-group') || '').trim();
        var selectedValue = String(target.value || 'all');
        var currentValues = groupName === 'Turma'
          ? statsFiltersDraftState.turmaValues.slice()
          : (groupName === 'Aluno'
            ? statsFiltersDraftState.alunoValues.slice()
            : statsFiltersDraftState.sectionValues.slice());

        if (selectedValue === 'all') {
          currentValues = target.checked ? ['all'] : ['all'];
        } else if (target.checked) {
          currentValues = currentValues.filter(function (value) {
            return value !== 'all' && value !== selectedValue;
          });
          currentValues.push(selectedValue);
        } else {
          currentValues = currentValues.filter(function (value) {
            return value !== 'all' && value !== selectedValue;
          });
          if (!currentValues.length) {
            currentValues = ['all'];
          }
        }

        if (groupName === 'Turma') {
          statsFiltersDraftState.turmaValues = currentValues;
          renderStatsFiltersAlunoCards();
          renderStatsFilterCheckboxCards(statsFiltersTurmaList, 'Turma', getStatsScopeOptionsByDatasetKey('scopeTurmaOptions'), statsFiltersDraftState.turmaValues, 'Todas as turmas');
          applyStatsFilterCardSearch(statsFiltersTurmaList, statsFiltersTurmaSearch ? statsFiltersTurmaSearch.value : '');
          return;
        }

        if (groupName === 'Aluno') {
          statsFiltersDraftState.alunoValues = currentValues;
          renderStatsFiltersAlunoCards();
          return;
        }

        if (groupName === 'Section') {
          statsFiltersDraftState.sectionValues = currentValues;
          renderStatsFilterCheckboxCards(statsFiltersSectionList, 'Section', statsFiltersDraftState.sectionOptions, statsFiltersDraftState.sectionValues, 'Todos');
          applyStatsFilterCardSearch(statsFiltersSectionList, statsFiltersSectionSearch ? statsFiltersSectionSearch.value : '');
        }
      });
    }

    if (statsFiltersClearBtn) {
      statsFiltersClearBtn.addEventListener('click', function () {
        statsFiltersDraftState.turmaValues = ['all'];
        statsFiltersDraftState.alunoValues = ['all'];
        statsFiltersDraftState.sectionValues = ['all'];
        renderStatsFilterCheckboxCards(statsFiltersTurmaList, 'Turma', getStatsScopeOptionsByDatasetKey('scopeTurmaOptions'), ['all'], 'Todas as turmas');
        renderStatsFiltersAlunoCards();
        renderStatsFilterCheckboxCards(statsFiltersSectionList, 'Section', statsFiltersDraftState.sectionOptions, ['all'], 'Todos');
        applyStatsFilterCardSearch(statsFiltersTurmaList, statsFiltersTurmaSearch ? statsFiltersTurmaSearch.value : '');
        applyStatsFilterCardSearch(statsFiltersAlunoList, statsFiltersAlunoSearch ? statsFiltersAlunoSearch.value : '');
        applyStatsFilterCardSearch(statsFiltersSectionList, statsFiltersSectionSearch ? statsFiltersSectionSearch.value : '');
      });
    }

    if (statsFiltersTurmaSearch) {
      statsFiltersTurmaSearch.addEventListener('input', function () {
        applyStatsFilterCardSearch(statsFiltersTurmaList, statsFiltersTurmaSearch.value);
      });
    }

    if (statsFiltersAlunoSearch) {
      statsFiltersAlunoSearch.addEventListener('input', function () {
        applyStatsFilterCardSearch(statsFiltersAlunoList, statsFiltersAlunoSearch.value);
      });
    }

    if (statsFiltersSectionSearch) {
      statsFiltersSectionSearch.addEventListener('input', function () {
        applyStatsFilterCardSearch(statsFiltersSectionList, statsFiltersSectionSearch.value);
      });
    }

    if (statsFiltersApplyBtn) {
      statsFiltersApplyBtn.addEventListener('click', function () {
        writeStatsDatasetFilterValues('scopeTurma', statsFiltersDraftState.turmaValues);
        writeStatsDatasetFilterValues('scopeAluno', statsFiltersDraftState.alunoValues);
        setStatsPanelFilterValue(statsFiltersDraftState.panelKey, statsFiltersDraftState.sectionValues);
        if (statsFiltersModalInstance) {
          blurActiveElementIfInside(statsFiltersModalElement);
          statsFiltersModalInstance.hide();
        }
        renderAvaliacaoStats();
      });
    }

    function renderCorrecoesTable(rows, stats) {
      correcoesRows = Array.isArray(rows) ? rows.slice() : [];
      renderAvaliacaoStats();
      renderCorrecoesRoster();

      var normalizedRows = getStatsNormalizedCorrecoesRows(correcoesRows);
      var summaryStats = getCorrecoesSummaryStats(correcoesRows);

      if (correcaoTableBody) {
        if (!normalizedRows.length) {
          correcaoTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">Nenhuma prova corrigida ainda.</td></tr>';
        } else {
          correcaoTableBody.innerHTML = normalizedRows.map(function (row) {
            var statusMeta = getCorrecaoStatusMeta(row.status);
            var earnedScore = Number(row.pontuacao);
            var totalScore = Number(row.pontuacaoTotal);
            var resultLabel = statusMeta.resultLabel !== ''
              ? statusMeta.resultLabel
              : (Number.isFinite(earnedScore) && Number.isFinite(totalScore) && totalScore > 0
                ? (formatCorrecaoScoreValue(earnedScore) + '/' + formatCorrecaoScoreValue(totalScore))
                : (String(row.acertos || 0) + '/' + String(row.totalQuestoes || 0)));
            return '<tr>'
              + '<td>' + escapeHtml(row.alunoNome || '-') + (statusMeta.key !== 'corrigida' ? ' <span class="badge ' + escapeHtml(statusMeta.badgeClass) + '">' + escapeHtml(statusMeta.label) + '</span>' : '') + '</td>'
              + '<td>' + escapeHtml(row.turmaNome || '-') + '</td>'
              + '<td>' + escapeHtml(row.numeracao || '-') + '</td>'
              + '<td>' + escapeHtml(resultLabel) + '</td>'
              + '<td>' + escapeHtml(statusMeta.key === 'ausente' ? '-' : (String(Number(row.percentual || 0).toFixed(2)).replace('.', ',') + '%')) + '</td>'
              + '<td>' + escapeHtml(formatDateTimePtBr(row.corrigidoEm || '')) + '</td>'
              + '<td class="text-end">'
              + '<button type="button" class="btn btn-outline-primary btn-sm me-2 js-admin-correcao-edit" data-id="' + escapeHtml(String(row.id || 0)) + '">Editar</button>'
              + '<button type="button" class="btn btn-outline-danger btn-sm js-admin-correcao-delete" data-id="' + escapeHtml(String(row.id || 0)) + '">Excluir</button>'
              + '</td>'
              + '</tr>';
          }).join('');
        }
      }

      if (correcaoListStatus) {
        var total = Number(summaryStats.total);
        var media = Number(summaryStats.media_percentual);
        var statusCounts = buildCorrecaoStatusCounts(correcoesRows);
        if (!Number.isFinite(total)) {
          total = normalizedRows.length;
        }
        if (!Number.isFinite(media)) {
          media = 0;
        }
        correcaoListStatus.textContent = total > 0
          ? (String(total) + ' registro(s) | ' + String(statusCounts.corrigida) + ' corrigida(s) | ' + String(statusCounts.gabarito_zerado) + ' zerado(s) | ' + String(statusCounts.ausente) + ' ausente(s) | média ' + String(media.toFixed(2)).replace('.', ',') + '%')
          : 'Nenhuma prova corrigida ainda.';
      }
    }

    function getCorrecaoRowById(correcaoId) {
      var safeId = Number(correcaoId || 0);
      if (safeId <= 0) {
        return null;
      }

      for (var index = 0; index < correcoesRows.length; index += 1) {
        var row = correcoesRows[index];
        if (Number(row && row.id || 0) === safeId) {
          return row;
        }
      }

      return null;
    }

    function getCorrecaoRosterItems() {
      var printData = getActiveAvaliacaoPrintData(Array.isArray(activeDashboardTurmasIds) ? activeDashboardTurmasIds.slice() : []);
      var records = Array.isArray(printData && printData.records) ? printData.records : [];
      var correctionMap = {};

      correcoesRows.forEach(function (row) {
        var safeRow = row && typeof row === 'object' ? row : {};
        var key = String(Number(safeRow.aluno_id || 0)) + ':' + String(Number(safeRow.turma_id || 0));
        correctionMap[key] = safeRow;
      });

      return records.map(function (record) {
        var safeRecord = record && typeof record === 'object' ? record : {};
        var key = String(Number(safeRecord.alunoId || 0)) + ':' + String(Number(safeRecord.turmaId || 0));
        var correction = correctionMap[key] || null;
        var snapshot = null;
        if (correction) {
          try {
            snapshot = buildCorrecaoSnapshotFromRow(correction);
          } catch (error) {
            snapshot = null;
          }
        }

        return {
          avaliacaoId: Number(safeRecord.avaliacaoId || activeDashboardAvaliacaoId || 0),
          alunoId: Number(safeRecord.alunoId || 0),
          turmaId: Number(safeRecord.turmaId || 0),
          alunoNome: String(safeRecord.alunoNome || '').trim() || 'Estudante não identificado',
          turmaNome: String(safeRecord.turmaNome || '').trim() || 'Turma não informada',
          numeracao: String(safeRecord.numeracao || '').trim(),
          numeracaoLabel: String(safeRecord.numeracaoLabel || '').trim(),
          correction: correction,
          snapshot: snapshot,
          correctionStatus: normalizeCorrecaoStatus(correction && correction.status),
        };
      });
    }

    function renderCorrecoesRoster() {
      if (!correcaoRosterBody) {
        return;
      }

      var rosterItems = getCorrecaoRosterItems();
      var query = normalizeSearchValue(correcaoRosterSearchInput ? correcaoRosterSearchInput.value : '');
      var filteredItems = [];
      if (correcaoRosterStatus) {
        var correctedCount = rosterItems.filter(function (item) {
          return !!item.correction;
        }).length;
        correcaoRosterStatus.textContent = rosterItems.length > 0
          ? (String(correctedCount) + ' de ' + String(rosterItems.length) + ' estudante(s) com correção registrada.')
          : 'Nenhum estudante relacionado a esta avaliação.';
      }

      if (!rosterItems.length) {
        correcaoRosterBody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">Nenhum estudante relacionado a esta avaliação.</td></tr>';
        return;
      }

      filteredItems = rosterItems.filter(function (item) {
        var hasCorrection = !!item.correction;
        var resultLabel = '-';
        var correctedAt = '-';
        var statusMeta = getCorrecaoStatusMeta(item.correctionStatus);

        if (item.snapshot) {
          var earnedScore = Number(item.snapshot.pontuacao || 0);
          var totalScore = Number(item.snapshot.pontuacao_total || 0);
          resultLabel = statusMeta.resultLabel !== ''
            ? statusMeta.resultLabel
            : (totalScore > 0
              ? (formatCorrecaoScoreValue(earnedScore) + '/' + formatCorrecaoScoreValue(totalScore) + ' (' + String(Number(item.snapshot.percentual || 0).toFixed(2)).replace('.', ',') + '%)')
              : (String(item.snapshot.acertos || 0) + '/' + String(item.snapshot.total_questoes || 0)));
        }

        if (item.correction) {
          correctedAt = formatDateTimePtBr(item.correction.corrigido_em || item.correction.created_at || '');
        }

        item.__resultLabel = resultLabel;
        item.__correctedAt = correctedAt;
        if (query === '') {
          return true;
        }

        var searchText = normalizeSearchValue([
          item.alunoNome,
          item.turmaNome,
          item.numeracao,
          item.numeracaoLabel,
          hasCorrection ? statusMeta.label : 'pendente',
          resultLabel,
          correctedAt
        ].join(' '));

        return searchText.indexOf(query) !== -1;
      });

      if (correcaoRosterStatus && rosterItems.length > 0 && query !== '') {
        correcaoRosterStatus.textContent += ' Exibindo ' + String(filteredItems.length) + ' resultado(s) para a busca.';
      }

      if (!filteredItems.length) {
        correcaoRosterBody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">Nenhum resultado encontrado para a busca informada.</td></tr>';
        return;
      }

      correcaoRosterBody.innerHTML = filteredItems.map(function (item) {
        var hasCorrection = !!item.correction;
        var resultLabel = typeof item.__resultLabel === 'string' ? item.__resultLabel : '-';
        var correctedAt = typeof item.__correctedAt === 'string' ? item.__correctedAt : '-';
        var statusMeta = getCorrecaoStatusMeta(item.correctionStatus);

        return '<tr>'
          + '<td><strong>' + escapeHtml(item.alunoNome) + '</strong></td>'
          + '<td>' + escapeHtml(item.turmaNome) + '</td>'
          + '<td>' + (hasCorrection
            ? '<span class="badge ' + escapeHtml(statusMeta.badgeClass) + '">' + escapeHtml(statusMeta.label) + '</span>'
            : '<span class="badge text-bg-secondary">Pendente</span>') + '</td>'
          + '<td>' + escapeHtml(resultLabel) + '</td>'
          + '<td>' + escapeHtml(correctedAt) + '</td>'
          + '<td class="text-end">'
          + (hasCorrection
            ? '<button type="button" class="btn btn-outline-primary btn-sm me-2 js-admin-correcao-edit" data-id="' + escapeHtml(String(item.correction.id || 0)) + '">Editar</button>'
            + '<button type="button" class="btn btn-outline-danger btn-sm js-admin-correcao-delete" data-id="' + escapeHtml(String(item.correction.id || 0)) + '">Excluir</button>'
            : '<button type="button" class="btn btn-outline-secondary btn-sm js-admin-correcao-create-manual"'
            + ' data-avaliacao-id="' + escapeHtml(String(item.avaliacaoId || activeDashboardAvaliacaoId || 0)) + '"'
            + ' data-aluno-id="' + escapeHtml(String(item.alunoId || 0)) + '"'
            + ' data-turma-id="' + escapeHtml(String(item.turmaId || 0)) + '"'
            + ' data-aluno-nome="' + escapeHtml(item.alunoNome) + '"'
            + ' data-turma-nome="' + escapeHtml(item.turmaNome) + '"'
            + ' data-numeracao="' + escapeHtml(String(item.numeracao || '')) + '"'
            + ' data-qr-payload="">Lançar manualmente</button>')
          + '</td>'
          + '</tr>';
      }).join('');
    }

    function loadCorrecoesList(silent) {
      var avaliacaoId = Number(activeDashboardAvaliacaoId || (idInput ? idInput.value : 0) || 0);
      if (avaliacaoId <= 0) {
        renderCorrecoesTable([], { total: 0, media_percentual: 0 });
        return Promise.resolve([]);
      }

      if (!silent && correcaoListStatus) {
        correcaoListStatus.textContent = 'Atualizando lista...';
      }

      return fetch(getCorrecaoListUrl() + '?id=' + encodeURIComponent(String(avaliacaoId)), {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Não foi possível carregar as correções.');
          }

          return response.json();
        })
        .then(function (payload) {
          if (!payload || payload.ok !== true) {
            throw new Error(payload && payload.message ? payload.message : 'Erro ao carregar correções.');
          }

          renderCorrecoesTable(payload.rows || [], payload.stats || {});
          return payload.rows || [];
        })
        .catch(function (error) {
          if (correcaoListStatus) {
            correcaoListStatus.textContent = error && error.message ? error.message : 'Erro ao atualizar a lista de correções.';
          }
          return [];
        });
    }

    function deleteCorrecaoById(correcaoId) {
      var safeId = Number(correcaoId || 0);
      if (safeId <= 0) {
        return Promise.reject(new Error('Correção inválida.'));
      }

      var csrfInput = form ? form.querySelector('input[name="csrf_token"]') : null;
      var csrfToken = csrfInput ? String(csrfInput.value || '').trim() : '';
      var body = new URLSearchParams();
      body.set('csrf_token', csrfToken);
      body.set('id', String(safeId));

      return fetch(getCorrecaoDeleteUrl(), {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: body.toString(),
      }).then(function (response) {
        return response.json().catch(function () {
          return { ok: false, message: 'Resposta inválida do servidor.' };
        }).then(function (payload) {
          if (!response.ok || !payload || payload.ok !== true) {
            throw new Error(payload && payload.message ? payload.message : 'Não foi possível excluir a correção.');
          }

          return payload;
        });
      });
    }

    function verifyExistingCorrecao(avaliacaoId, alunoId, turmaId) {
      var query = '?avaliacao_id=' + encodeURIComponent(String(avaliacaoId || 0))
        + '&aluno_id=' + encodeURIComponent(String(alunoId || 0))
        + '&turma_id=' + encodeURIComponent(String(turmaId || 0));

      return fetch(getCorrecaoVerifyUrl() + query, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      }).then(function (response) {
        return response.json().catch(function () {
          return { ok: false, message: 'Resposta inválida do servidor.' };
        }).then(function (payload) {
          if (!response.ok || !payload || payload.ok !== true) {
            throw new Error(payload && payload.message ? payload.message : 'Não foi possível verificar a correção desta folha.');
          }

          return payload;
        });
      });
    }

    function startCorrecoesPolling() {
      if (correcoesPollingTimer) {
        window.clearInterval(correcoesPollingTimer);
      }

      correcoesPollingTimer = window.setInterval(function () {
        if (!isCorrecaoPaneActive()) {
          return;
        }

        loadCorrecoesList(true);
      }, 5000);
    }

    function stopCorrecoesPolling() {
      if (!correcoesPollingTimer) {
        return;
      }

      window.clearInterval(correcoesPollingTimer);
      correcoesPollingTimer = 0;
    }

    function ensureQrScanLibraryLoaded() {
      if (typeof window.jsQR === 'function') {
        return Promise.resolve(window.jsQR);
      }

      if (qrScanLibraryPromise) {
        return qrScanLibraryPromise;
      }

      qrScanLibraryPromise = new Promise(function (resolve, reject) {
        var sources = [
          'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
          'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
        ];

        function tryLoad(index) {
          if (typeof window.jsQR === 'function') {
            resolve(window.jsQR);
            return;
          }

          if (index >= sources.length) {
            reject(new Error('Biblioteca de leitura de QR indisponível.'));
            return;
          }

          var script = document.createElement('script');
          script.async = true;
          script.src = sources[index];
          script.onload = function () {
            if (typeof window.jsQR === 'function') {
              resolve(window.jsQR);
              return;
            }

            tryLoad(index + 1);
          };
          script.onerror = function () {
            script.remove();
            tryLoad(index + 1);
          };
          document.head.appendChild(script);
        }

        tryLoad(0);
      }).catch(function (error) {
        qrScanLibraryPromise = null;
        throw error;
      });

      return qrScanLibraryPromise;
    }

    function captureCorrecaoFrame() {
      if (!(correcaoVideo instanceof HTMLVideoElement) || correcaoVideo.readyState < 2 || correcaoVideo.videoWidth <= 0 || correcaoVideo.videoHeight <= 0) {
        return null;
      }

      correcaoCaptureCanvas.width = correcaoVideo.videoWidth;
      correcaoCaptureCanvas.height = correcaoVideo.videoHeight;
      var ctx = correcaoCaptureCanvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      ctx.drawImage(correcaoVideo, 0, 0, correcaoCaptureCanvas.width, correcaoCaptureCanvas.height);
      return correcaoCaptureCanvas;
    }

    function parseCorrecaoQrPayload(rawPayload) {
      var query = String(rawPayload || '').trim();
      if (query === '') {
        return null;
      }

      if (query.indexOf('?') !== -1) {
        query = query.slice(query.indexOf('?') + 1);
      }

      if (query.indexOf('#') !== -1) {
        query = query.slice(0, query.indexOf('#'));
      }

      if (query.indexOf('avaliacao_id=') === -1 && query.indexOf('%3F') !== -1) {
        try {
          query = decodeURIComponent(query);
          if (query.indexOf('?') !== -1) {
            query = query.slice(query.indexOf('?') + 1);
          }
        } catch (error) {
        }
      }

      var params;
      try {
        params = new URLSearchParams(query);
      } catch (error) {
        return null;
      }

      var avaliacaoId = Number(params.get('avaliacao_id') || 0);
      var alunoId = Number(params.get('aluno_id') || 0);
      var turmaId = Number(params.get('turma_id') || 0);
      if (avaliacaoId <= 0 || alunoId <= 0 || turmaId <= 0) {
        return null;
      }

      return {
        avaliacaoId: avaliacaoId,
        alunoId: alunoId,
        turmaId: turmaId,
        raw: query,
      };
    }

    function getAllowedCorrecaoAluno(alunoId, turmaId) {
      var safeAlunoId = Number(alunoId || 0);
      var safeTurmaId = Number(turmaId || 0);
      if (safeAlunoId <= 0 || safeTurmaId <= 0) {
        return null;
      }

      var selectedTurmas = Array.isArray(activeDashboardTurmasIds) ? activeDashboardTurmasIds : [];
      var selectedAlunos = Array.isArray(activeDashboardAlunosIds) ? activeDashboardAlunosIds : [];
      if (selectedTurmas.length && selectedTurmas.indexOf(safeTurmaId) === -1) {
        return null;
      }

      if (selectedAlunos.length && selectedAlunos.indexOf(safeAlunoId) === -1) {
        return null;
      }

      for (var index = 0; index < alunosOptions.length; index += 1) {
        var aluno = alunosOptions[index];
        if (Number(aluno && aluno.id || 0) === safeAlunoId && Number(aluno && aluno.turmaId || 0) === safeTurmaId) {
          return aluno;
        }
      }

      return null;
    }

    function getCorrecaoPrintRecord(alunoId, turmaId) {
      var printData = getActiveAvaliacaoPrintData(Array.isArray(activeDashboardTurmasIds) ? activeDashboardTurmasIds.slice() : []);
      var records = Array.isArray(printData && printData.records) ? printData.records : [];
      for (var index = 0; index < records.length; index += 1) {
        var record = records[index];
        if (Number(record.alunoId || 0) === Number(alunoId || 0) && Number(record.turmaId || 0) === Number(turmaId || 0)) {
          return record;
        }
      }

      return null;
    }

    function stopCorrecaoScanLoop() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.stopCorrecaoScanLoop === 'function') {
        cameraModule.stopCorrecaoScanLoop();
      }
    }

    function stopCorrecaoCamera() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.stopCorrecaoCamera === 'function') {
        cameraModule.stopCorrecaoCamera();
      }
    }

    function startCorrecaoCamera() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.startCorrecaoCamera === 'function') {
        return cameraModule.startCorrecaoCamera();
      }
      return Promise.reject(new Error('Módulo de câmera da correção não está disponível.'));
    }

    function decodeQrFromCurrentFrame() {
      var captureCanvas = captureCorrecaoFrame();
      if (!(captureCanvas instanceof HTMLCanvasElement)) {
        return Promise.resolve(null);
      }

      return decodeQrFromCanvas(captureCanvas);
    }

    function frameHasVisibleQrCode(captureCanvas) {
      return decodeQrFromCanvas(captureCanvas).then(function (payload) {
        return String(payload || '').trim() !== '';
      }).catch(function () {
        return false;
      });
    }

    function cloneCanvasRegionForQr(sourceCanvas, region) {
      if (!(sourceCanvas instanceof HTMLCanvasElement) || !region) {
        return null;
      }

      var width = Math.max(1, Math.round(Number(region.width || 0)));
      var height = Math.max(1, Math.round(Number(region.height || 0)));
      if (width <= 0 || height <= 0) {
        return null;
      }

      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return null;
      }

      ctx.drawImage(
        sourceCanvas,
        Math.max(0, Math.round(Number(region.x || 0))),
        Math.max(0, Math.round(Number(region.y || 0))),
        width,
        height,
        0,
        0,
        width,
        height
      );

      return canvas;
    }

    function scaleCanvasForQr(sourceCanvas, maxDimension) {
      if (!(sourceCanvas instanceof HTMLCanvasElement)) {
        return null;
      }

      var safeMaxDimension = Math.max(240, Number(maxDimension || 0));
      var sourceWidth = Math.max(1, Number(sourceCanvas.width || 0));
      var sourceHeight = Math.max(1, Number(sourceCanvas.height || 0));
      var largestDimension = Math.max(sourceWidth, sourceHeight);
      if (largestDimension <= safeMaxDimension) {
        return sourceCanvas;
      }

      var scale = safeMaxDimension / largestDimension;
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));

      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return null;
      }

      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      return canvas;
    }

    function buildQrDecodeCanvasCandidates(sourceCanvas) {
      if (!(sourceCanvas instanceof HTMLCanvasElement)) {
        return [];
      }

      var sourceWidth = Math.max(1, Number(sourceCanvas.width || 0));
      var sourceHeight = Math.max(1, Number(sourceCanvas.height || 0));
      var candidates = [];

      function pushCandidate(canvas) {
        if (!(canvas instanceof HTMLCanvasElement)) {
          return;
        }

        if (!canvas.width || !canvas.height) {
          return;
        }

        for (var index = 0; index < candidates.length; index += 1) {
          if (candidates[index].width === canvas.width && candidates[index].height === canvas.height && candidates[index] === canvas) {
            return;
          }
        }

        candidates.push(canvas);
      }

      pushCandidate(sourceCanvas);
      pushCandidate(scaleCanvasForQr(sourceCanvas, 1600));
      pushCandidate(scaleCanvasForQr(sourceCanvas, 1100));
      pushCandidate(scaleCanvasForQr(sourceCanvas, 800));

      var regions = [
        { x: Math.round(sourceWidth * 0.5), y: 0, width: Math.round(sourceWidth * 0.5), height: Math.round(sourceHeight * 0.55) },
        { x: Math.round(sourceWidth * 0.42), y: 0, width: Math.round(sourceWidth * 0.58), height: Math.round(sourceHeight * 0.68) },
        { x: 0, y: 0, width: sourceWidth, height: Math.round(sourceHeight * 0.6) }
      ];

      regions.forEach(function (region) {
        var croppedCanvas = cloneCanvasRegionForQr(sourceCanvas, region);
        pushCandidate(croppedCanvas);
        pushCandidate(scaleCanvasForQr(croppedCanvas, 1200));
        pushCandidate(scaleCanvasForQr(croppedCanvas, 800));
      });

      return candidates;
    }

    function decodeQrWithJsQr(jsQr, candidateCanvas) {
      if (!(candidateCanvas instanceof HTMLCanvasElement) || typeof jsQr !== 'function') {
        return null;
      }

      var ctx = candidateCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return null;
      }

      var imageData = ctx.getImageData(0, 0, candidateCanvas.width, candidateCanvas.height);
      var optionsList = [
        { inversionAttempts: 'attemptBoth' },
        { inversionAttempts: 'dontInvert' },
        { inversionAttempts: 'onlyInvert' }
      ];

      for (var index = 0; index < optionsList.length; index += 1) {
        var decoded = jsQr(imageData.data, candidateCanvas.width, candidateCanvas.height, optionsList[index]);
        if (decoded && decoded.data) {
          return String(decoded.data);
        }
      }

      return null;
    }

    function decodeQrFromCanvas(captureCanvas) {
      if (!(captureCanvas instanceof HTMLCanvasElement)) {
        return Promise.resolve(null);
      }

      if (typeof window.BarcodeDetector === 'function') {
        try {
          var detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          return detector.detect(captureCanvas).then(function (codes) {
            if (Array.isArray(codes) && codes.length && codes[0] && codes[0].rawValue) {
              return String(codes[0].rawValue || '');
            }

            return null;
          }).catch(function () {
            return null;
          });
        } catch (error) {
        }
      }

      return ensureQrScanLibraryLoaded().then(function (jsQr) {
        if (typeof jsQr !== 'function') {
          return null;
        }

        var candidates = buildQrDecodeCanvasCandidates(captureCanvas);
        for (var index = 0; index < candidates.length; index += 1) {
          var decoded = decodeQrWithJsQr(jsQr, candidates[index]);
          if (decoded) {
            return decoded;
          }
        }

        return null;
      }).catch(function () {
        return null;
      });
    }

    function buildCorrecaoExpectedAnswersMap() {
      var rawMap = sanitizeGabaritoRespostas(buildRespostasFromQuestoesItens(gabaritoQuestoesItens), gabaritoQuestoesItens.length, getConfiguredAlternativasCount());
      var result = {};
      Object.keys(rawMap || {}).forEach(function (key) {
        var safeKey = String(key || '').trim();
        var safeValue = String(rawMap[key] || '').trim().toUpperCase();
        if (safeKey !== '' && safeValue !== '') {
          result[safeKey] = safeValue;
        }
      });
      return result;
    }

    function getGabaritoArucoDictionary() {
      if (gabaritoArucoDictionary) {
        return gabaritoArucoDictionary;
      }

      if (!window.AR || typeof window.AR.Dictionary !== 'function') {
        return null;
      }

      try {
        gabaritoArucoDictionary = new window.AR.Dictionary(gabaritoArucoDictionaryName);
      } catch (error) {
        console.warn('Falha ao inicializar o dicionario ArUco do gabarito.', error);
        gabaritoArucoDictionary = null;
      }

      return gabaritoArucoDictionary;
    }

    function getGabaritoArucoDetector() {
      if (gabaritoArucoDetector) {
        return gabaritoArucoDetector;
      }

      if (!window.AR || typeof window.AR.Detector !== 'function') {
        return null;
      }

      try {
        gabaritoArucoDetector = new window.AR.Detector({
          dictionaryName: gabaritoArucoDictionaryName,
          maxHammingDistance: 4,
        });
      } catch (error) {
        console.warn('Falha ao inicializar o detector ArUco do gabarito.', error);
        gabaritoArucoDetector = null;
      }

      return gabaritoArucoDetector;
    }

    function createGabaritoArucoMarkerCanvas(markerId) {
      var dictionary = getGabaritoArucoDictionary();
      if (!dictionary) {
        return null;
      }

      var code = dictionary.codeList[markerId];
      if (typeof code !== 'string' || code === '') {
        return null;
      }

      var payloadSize = Math.round(Math.sqrt(dictionary.nBits));
      if (payloadSize <= 0) {
        return null;
      }

      var totalCells = payloadSize + 4;
      var markerCanvas = document.createElement('canvas');
      markerCanvas.width = totalCells;
      markerCanvas.height = totalCells;

      var markerCtx = markerCanvas.getContext('2d');
      if (!markerCtx) {
        return null;
      }

      markerCtx.fillStyle = '#ffffff';
      markerCtx.fillRect(0, 0, totalCells, totalCells);
      markerCtx.fillStyle = '#111111';
      markerCtx.fillRect(1, 1, totalCells - 2, totalCells - 2);
      markerCtx.fillStyle = '#ffffff';

      for (var bitY = 0; bitY < payloadSize; bitY += 1) {
        for (var bitX = 0; bitX < payloadSize; bitX += 1) {
          if (code[(bitY * payloadSize) + bitX] === '1') {
            markerCtx.fillRect(bitX + 2, bitY + 2, 1, 1);
          }
        }
      }

      return markerCanvas;
    }

    function drawGabaritoArucoMarker(ctx, left, top, size, markerId) {
      if (!ctx) {
        return false;
      }

      var markerCanvas = createGabaritoArucoMarkerCanvas(markerId);
      if (!markerCanvas) {
        return false;
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(markerCanvas, Math.round(left), Math.round(top), Math.round(size), Math.round(size));
      ctx.restore();
      return true;
    }

    function drawGabaritoTemplateMarker(ctx, left, top, size, markerType) {
      if (markerType && gabaritoArucoMarkerIds[markerType] != null) {
        if (drawGabaritoArucoMarker(ctx, left, top, size, gabaritoArucoMarkerIds[markerType])) {
          return;
        }
      }

      if (!ctx) {
        return;
      }

      var safeSize = Math.max(12, Math.round(Number(size || 0)));
      var safeLeft = Math.round(Number(left || 0));
      var safeTop = Math.round(Number(top || 0));
      var innerSquareSize = Math.max(6, Math.round(safeSize * 0.34));
      var slitWidth = Math.max(4, Math.round(safeSize * 0.18));
      var slitHeight = Math.max(8, Math.round(safeSize * 0.56));
      var horizontalWidth = Math.max(8, Math.round(safeSize * 0.56));
      var horizontalHeight = Math.max(4, Math.round(safeSize * 0.18));

      ctx.fillStyle = '#111111';
      ctx.fillRect(safeLeft, safeTop, safeSize, safeSize);

      if (markerType === 'center-hole') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          safeLeft + Math.round((safeSize - innerSquareSize) / 2),
          safeTop + Math.round((safeSize - innerSquareSize) / 2),
          innerSquareSize,
          innerSquareSize
        );
      } else if (markerType === 'vertical-slit') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          safeLeft + Math.round((safeSize - slitWidth) / 2),
          safeTop + Math.round((safeSize - slitHeight) / 2),
          slitWidth,
          slitHeight
        );
      } else if (markerType === 'horizontal-slit') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          safeLeft + Math.round((safeSize - horizontalWidth) / 2),
          safeTop + Math.round((safeSize - horizontalHeight) / 2),
          horizontalWidth,
          horizontalHeight
        );
      }
    }

    function measureMarkerRegionDarkness(grayscale, width, height, startX, startY, regionWidth, regionHeight) {
      var safeStartX = Math.max(0, Math.min(width - 1, Math.round(startX)));
      var safeStartY = Math.max(0, Math.min(height - 1, Math.round(startY)));
      var safeWidth = Math.max(1, Math.min(width - safeStartX, Math.round(regionWidth)));
      var safeHeight = Math.max(1, Math.min(height - safeStartY, Math.round(regionHeight)));
      var totalDarkness = 0;
      var pixels = 0;

      for (var y = safeStartY; y < safeStartY + safeHeight; y += 1) {
        for (var x = safeStartX; x < safeStartX + safeWidth; x += 1) {
          totalDarkness += 1 - (grayscale[(y * width) + x] / 255);
          pixels += 1;
        }
      }

      return pixels > 0 ? (totalDarkness / pixels) : 0;
    }

    function scoreDetectedMarkerPattern(grayscale, localWidth, localHeight, component, markerType) {
      if (!component || !markerType) {
        return 0;
      }

      var boxWidth = Math.max(1, component.maxX - component.minX + 1);
      var boxHeight = Math.max(1, component.maxY - component.minY + 1);
      var centerX = component.minX + (boxWidth / 2);
      var centerY = component.minY + (boxHeight / 2);
      var centerSize = Math.max(3, Math.round(Math.min(boxWidth, boxHeight) * 0.28));
      var verticalWidth = Math.max(2, Math.round(boxWidth * 0.18));
      var verticalHeight = Math.max(4, Math.round(boxHeight * 0.54));
      var horizontalWidth = Math.max(4, Math.round(boxWidth * 0.54));
      var horizontalHeight = Math.max(2, Math.round(boxHeight * 0.18));
      var centerDarkness = measureMarkerRegionDarkness(
        grayscale,
        localWidth,
        localHeight,
        centerX - (centerSize / 2),
        centerY - (centerSize / 2),
        centerSize,
        centerSize
      );
      var verticalDarkness = measureMarkerRegionDarkness(
        grayscale,
        localWidth,
        localHeight,
        centerX - (verticalWidth / 2),
        centerY - (verticalHeight / 2),
        verticalWidth,
        verticalHeight
      );
      var horizontalDarkness = measureMarkerRegionDarkness(
        grayscale,
        localWidth,
        localHeight,
        centerX - (horizontalWidth / 2),
        centerY - (horizontalHeight / 2),
        horizontalWidth,
        horizontalHeight
      );

      if (markerType === 'solid') {
        return centerDarkness;
      }

      if (markerType === 'center-hole') {
        return Math.max(0, 1 - centerDarkness);
      }

      if (markerType === 'vertical-slit') {
        return Math.max(0, (1 - verticalDarkness) * 0.7) + Math.max(0, horizontalDarkness - verticalDarkness) * 0.6;
      }

      if (markerType === 'horizontal-slit') {
        return Math.max(0, (1 - horizontalDarkness) * 0.7) + Math.max(0, verticalDarkness - horizontalDarkness) * 0.6;
      }

      return 0;
    }

    function findMarkerInCapture(imageData, centerXRatio, centerYRatio, markerType) {
      if (!imageData || !gabaritoTemplateMarkers) {
        return null;
      }

      var width = imageData.width;
      var height = imageData.height;
      // Restringe a busca à região próxima do canto esperado (20% da imagem)
      // para não confundir bolhas preenchidas com marcadores de canto
      var windowHalfWidth = Math.max(32, Math.round(width * 0.20));
      var windowHalfHeight = Math.max(32, Math.round(height * 0.20));
      var centerX = Math.round(width * centerXRatio);
      var centerY = Math.round(height * centerYRatio);
      var startX = Math.max(0, centerX - windowHalfWidth);
      var endX = Math.min(width - 1, centerX + windowHalfWidth);
      var startY = Math.max(0, centerY - windowHalfHeight);
      var endY = Math.min(height - 1, centerY + windowHalfHeight);
      var localWidth = endX - startX + 1;
      var localHeight = endY - startY + 1;
      var grayscale = new Uint8Array(localWidth * localHeight);
      var totalBrightness = 0;

      for (var localY = 0; localY < localHeight; localY += 1) {
        for (var localX = 0; localX < localWidth; localX += 1) {
          var pixelX = startX + localX;
          var pixelY = startY + localY;
          var pixelOffset = ((pixelY * width) + pixelX) * 4;
          var brightness = Math.round(
            (imageData.data[pixelOffset] * 0.299)
            + (imageData.data[pixelOffset + 1] * 0.587)
            + (imageData.data[pixelOffset + 2] * 0.114)
          );
          grayscale[(localY * localWidth) + localX] = brightness;
          totalBrightness += brightness;
        }
      }

      var averageBrightness = totalBrightness / Math.max(1, grayscale.length);
      var darkThreshold = Math.round(Math.max(60, Math.min(185, averageBrightness * 0.85)));
      var darkMask = new Uint8Array(localWidth * localHeight);
      var visited = new Uint8Array(localWidth * localHeight);
      for (var maskIndex = 0; maskIndex < grayscale.length; maskIndex += 1) {
        darkMask[maskIndex] = grayscale[maskIndex] <= darkThreshold ? 1 : 0;
      }

      var bestComponent = null;
      var expectedLocalX = centerX - startX;
      var expectedLocalY = centerY - startY;
      var queueX = [];
      var queueY = [];

      for (var scanY = 0; scanY < localHeight; scanY += 1) {
        for (var scanX = 0; scanX < localWidth; scanX += 1) {
          var scanIndex = (scanY * localWidth) + scanX;
          if (!darkMask[scanIndex] || visited[scanIndex]) {
            continue;
          }

          var head = 0;
          queueX.length = 0;
          queueY.length = 0;
          queueX.push(scanX);
          queueY.push(scanY);
          visited[scanIndex] = 1;

          var componentCount = 0;
          var componentSumX = 0;
          var componentSumY = 0;
          var componentMinX = scanX;
          var componentMaxX = scanX;
          var componentMinY = scanY;
          var componentMaxY = scanY;

          while (head < queueX.length) {
            var currentX = queueX[head];
            var currentY = queueY[head];
            head += 1;

            componentCount += 1;
            componentSumX += currentX;
            componentSumY += currentY;
            if (currentX < componentMinX) {
              componentMinX = currentX;
            }
            if (currentX > componentMaxX) {
              componentMaxX = currentX;
            }
            if (currentY < componentMinY) {
              componentMinY = currentY;
            }
            if (currentY > componentMaxY) {
              componentMaxY = currentY;
            }

            var neighbours = [
              [currentX - 1, currentY],
              [currentX + 1, currentY],
              [currentX, currentY - 1],
              [currentX, currentY + 1],
              [currentX - 1, currentY - 1],
              [currentX + 1, currentY - 1],
              [currentX - 1, currentY + 1],
              [currentX + 1, currentY + 1]
            ];

            for (var neighbourIndex = 0; neighbourIndex < neighbours.length; neighbourIndex += 1) {
              var neighbourX = neighbours[neighbourIndex][0];
              var neighbourY = neighbours[neighbourIndex][1];
              if (neighbourX < 0 || neighbourY < 0 || neighbourX >= localWidth || neighbourY >= localHeight) {
                continue;
              }

              var neighbourFlatIndex = (neighbourY * localWidth) + neighbourX;
              if (!darkMask[neighbourFlatIndex] || visited[neighbourFlatIndex]) {
                continue;
              }

              visited[neighbourFlatIndex] = 1;
              queueX.push(neighbourX);
              queueY.push(neighbourY);
            }
          }

          if (componentCount < 2) {
            continue;
          }

          var componentWidth = Math.max(1, componentMaxX - componentMinX + 1);
          var componentHeight = Math.max(1, componentMaxY - componentMinY + 1);
          var componentFillRatio = componentCount / Math.max(1, componentWidth * componentHeight);
          var componentAspectRatio = componentWidth / Math.max(1, componentHeight);

          // Marcadores devem ter tamanho mínimo (pelo menos 8x8 pixels)
          // Letras impressas (~3-5mm) são menores que os quadrados de canto (~8-15mm)
          if (componentWidth < 8 || componentHeight < 8) {
            continue;
          }
          // Marcadores são aproximadamente quadrados (mais rígido para rejeitar bolhas circulares e letras)
          if (componentAspectRatio < 0.55 || componentAspectRatio > 1.80) {
            continue;
          }
          // Fill ratio elevado — quadrados sólidos têm ~0.65-0.95.
          // Letras impressas (ex: 'D', 'A') têm fill ratio ~0.15-0.40 (estrutura oca)
          if (componentFillRatio < 0.50) {
            continue;
          }

          var componentCenterX = componentSumX / Math.max(1, componentCount);
          var componentCenterY = componentSumY / Math.max(1, componentCount);
          var distanceRatio = Math.sqrt(
            Math.pow((componentCenterX - expectedLocalX) / Math.max(1, localWidth), 2)
            + Math.pow((componentCenterY - expectedLocalY) / Math.max(1, localHeight), 2)
          );

          // Com janela menor (20%), tolerância de distância mais apertada
          if (distanceRatio > 0.50) {
            continue;
          }

          var proximityScore = Math.max(0.05, 1 - (distanceRatio * 0.8));
          var squarenessScore = 1 - Math.min(0.9, Math.abs(1 - componentAspectRatio) * 0.7);
          var densityScore = Math.min(1.25, componentFillRatio / 0.25);
          var areaScore = Math.max(0.15, Math.min(2, componentCount / 4));
          var patternScore = scoreDetectedMarkerPattern(grayscale, localWidth, localHeight, {
            minX: componentMinX,
            maxX: componentMaxX,
            minY: componentMinY,
            maxY: componentMaxY,
          }, markerType || 'solid');
          // Pattern score: quadrado sólido deve ter interior escuro e, idealmente, borda clara ao redor
          // Letras impressas passam pelo BFS mas falham aqui por terem interior oco
          if (patternScore < 0.25) {
            continue;
          }

          var totalScore = proximityScore * squarenessScore * densityScore * areaScore * Math.max(0.2, patternScore);

          if (!bestComponent || totalScore > bestComponent.score) {
            bestComponent = {
              x: startX + componentCenterX,
              y: startY + componentCenterY,
              width: componentWidth,
              height: componentHeight,
              fillRatio: componentFillRatio,
              area: componentCount,
              score: totalScore,
              distanceRatio: distanceRatio,
              markerPatternScore: patternScore,
            };
          }
        }
      }

      if (!bestComponent) {
        return null;
      }

      // Verificação final de distância
      if (bestComponent.distanceRatio > 0.70) {
        return null;
      }

      return bestComponent;
    }

    function getCorrecaoGuideRegion(canvasWidth, canvasHeight) {
      var safeWidth = Math.max(1, Number(canvasWidth || 0));
      var safeHeight = Math.max(1, Number(canvasHeight || 0));
      var regionX = Math.max(0, Math.round(safeWidth * correcaoGuideRegionRatios.left));
      var regionY = Math.max(0, Math.round(safeHeight * correcaoGuideRegionRatios.top));
      var regionWidth = Math.max(1, Math.round(safeWidth * (1 - correcaoGuideRegionRatios.left - correcaoGuideRegionRatios.right)));
      var regionHeight = Math.max(1, Math.round(safeHeight * (1 - correcaoGuideRegionRatios.top - correcaoGuideRegionRatios.bottom)));
      return {
        x: regionX,
        y: regionY,
        width: Math.min(regionWidth, safeWidth - regionX),
        height: Math.min(regionHeight, safeHeight - regionY),
      };
    }

    function cropImageDataRegion(imageData, region) {
      if (!imageData || !region) {
        return null;
      }

      var sourceWidth = Math.max(1, Number(imageData.width || 0));
      var sourceHeight = Math.max(1, Number(imageData.height || 0));
      var startX = Math.max(0, Math.min(sourceWidth - 1, Math.round(Number(region.x || 0))));
      var startY = Math.max(0, Math.min(sourceHeight - 1, Math.round(Number(region.y || 0))));
      var cropWidth = Math.max(1, Math.min(sourceWidth - startX, Math.round(Number(region.width || 0))));
      var cropHeight = Math.max(1, Math.min(sourceHeight - startY, Math.round(Number(region.height || 0))));
      var cropped = new ImageData(cropWidth, cropHeight);

      for (var y = 0; y < cropHeight; y += 1) {
        var sourceOffset = (((startY + y) * sourceWidth) + startX) * 4;
        var targetOffset = y * cropWidth * 4;
        cropped.data.set(imageData.data.subarray(sourceOffset, sourceOffset + (cropWidth * 4)), targetOffset);
      }

      return cropped;
    }

    function detectCorrecaoPaperBounds(imageData, region) {
      if (!imageData || !region) {
        return null;
      }

      var cropped = cropImageDataRegion(imageData, region);
      if (!cropped) {
        return null;
      }

      var width = cropped.width;
      var height = cropped.height;
      var brightnessTotal = 0;
      var pixels = width * height;
      for (var index = 0; index < pixels; index += 1) {
        var offset = index * 4;
        brightnessTotal += (cropped.data[offset] * 0.299) + (cropped.data[offset + 1] * 0.587) + (cropped.data[offset + 2] * 0.114);
      }

      var averageBrightness = brightnessTotal / Math.max(1, pixels);
      var brightThreshold = Math.max(168, Math.min(242, averageBrightness * 1.06));
      var minColumnFill = Math.max(3, Math.round(height * 0.24));
      var minRowFill = Math.max(3, Math.round(width * 0.24));
      var left = -1;
      var right = -1;
      var top = -1;
      var bottom = -1;

      for (var x = 0; x < width; x += 1) {
        var brightCount = 0;
        for (var y = 0; y < height; y += 1) {
          var offset = ((y * width) + x) * 4;
          var brightness = (cropped.data[offset] * 0.299) + (cropped.data[offset + 1] * 0.587) + (cropped.data[offset + 2] * 0.114);
          if (brightness >= brightThreshold) {
            brightCount += 1;
          }
        }

        if (brightCount >= minColumnFill) {
          left = x;
          break;
        }
      }

      for (var xr = width - 1; xr >= 0; xr -= 1) {
        var brightCountRight = 0;
        for (var yr = 0; yr < height; yr += 1) {
          var offsetRight = ((yr * width) + xr) * 4;
          var brightnessRight = (cropped.data[offsetRight] * 0.299) + (cropped.data[offsetRight + 1] * 0.587) + (cropped.data[offsetRight + 2] * 0.114);
          if (brightnessRight >= brightThreshold) {
            brightCountRight += 1;
          }
        }

        if (brightCountRight >= minColumnFill) {
          right = xr;
          break;
        }
      }

      for (var scanY = 0; scanY < height; scanY += 1) {
        var brightCountTop = 0;
        for (var scanX = 0; scanX < width; scanX += 1) {
          var offsetTop = ((scanY * width) + scanX) * 4;
          var brightnessTop = (cropped.data[offsetTop] * 0.299) + (cropped.data[offsetTop + 1] * 0.587) + (cropped.data[offsetTop + 2] * 0.114);
          if (brightnessTop >= brightThreshold) {
            brightCountTop += 1;
          }
        }

        if (brightCountTop >= minRowFill) {
          top = scanY;
          break;
        }
      }

      for (var scanYBottom = height - 1; scanYBottom >= 0; scanYBottom -= 1) {
        var brightCountBottom = 0;
        for (var scanXBottom = 0; scanXBottom < width; scanXBottom += 1) {
          var offsetBottom = ((scanYBottom * width) + scanXBottom) * 4;
          var brightnessBottom = (cropped.data[offsetBottom] * 0.299) + (cropped.data[offsetBottom + 1] * 0.587) + (cropped.data[offsetBottom + 2] * 0.114);
          if (brightnessBottom >= brightThreshold) {
            brightCountBottom += 1;
          }
        }

        if (brightCountBottom >= minRowFill) {
          bottom = scanYBottom;
          break;
        }
      }

      if (left < 0 || right < 0 || top < 0 || bottom < 0 || right <= left || bottom <= top) {
        return null;
      }

      var detectedWidth = right - left + 1;
      var detectedHeight = bottom - top + 1;
      if (detectedWidth < Math.round(width * 0.30) || detectedHeight < Math.round(height * 0.30)) {
        return null;
      }

      return {
        x: region.x + left,
        y: region.y + top,
        width: detectedWidth,
        height: detectedHeight,
      };
    }

    function detectCorrecaoMarkersFromImageData(imageData, bounds, useLegacySolidMarkers) {
      if (!imageData || !bounds || !gabaritoTemplateMarkers) {
        return null;
      }

      var cropped = cropImageDataRegion(imageData, bounds);
      if (!cropped) {
        return null;
      }

      var markerKeys = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
      var detected = {};
      for (var index = 0; index < markerKeys.length; index += 1) {
        var key = markerKeys[index];
        var marker = gabaritoTemplateMarkers[key];
        if (!marker) {
          return null;
        }

        var found = findMarkerInCapture(
          cropped,
          marker.x / gabaritoTemplateMarkers.width,
          marker.y / gabaritoTemplateMarkers.height,
          useLegacySolidMarkers ? 'solid' : marker.type
        );
        if (!found) {
          return null;
        }

        detected[key] = {
          x: bounds.x + found.x,
          y: bounds.y + found.y,
          width: found.width,
          height: found.height,
          fillRatio: found.fillRatio,
          area: found.area,
          score: found.score,
          distanceRatio: found.distanceRatio,
          markerPatternScore: found.markerPatternScore,
        };
      }

      return detected;
    }

    function computeArucoMarkerDetectionMetrics(marker) {
      if (!marker || !Array.isArray(marker.corners) || marker.corners.length !== 4) {
        return null;
      }

      var minX = Number.POSITIVE_INFINITY;
      var minY = Number.POSITIVE_INFINITY;
      var maxX = Number.NEGATIVE_INFINITY;
      var maxY = Number.NEGATIVE_INFINITY;
      var sumX = 0;
      var sumY = 0;
      var twiceArea = 0;

      for (var index = 0; index < marker.corners.length; index += 1) {
        var corner = marker.corners[index];
        var nextCorner = marker.corners[(index + 1) % marker.corners.length];
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
        sumX += corner.x;
        sumY += corner.y;
        twiceArea += (corner.x * nextCorner.y) - (nextCorner.x * corner.y);
      }

      return {
        x: sumX / marker.corners.length,
        y: sumY / marker.corners.length,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        area: Math.max(1, Math.abs(twiceArea) / 2),
        hammingDistance: Math.max(0, Number(marker.hammingDistance || 0)),
      };
    }

    function detectCorrecaoArucoMarkersFromImageData(imageData, bounds) {
      if (!imageData || !bounds || !gabaritoTemplateMarkers) {
        return null;
      }

      if (gabaritoTemplateMarkers.kind !== 'aruco') {
        return null;
      }

      var cropped = cropImageDataRegion(imageData, bounds);
      if (!cropped) {
        return null;
      }

      var detector = getGabaritoArucoDetector();
      if (!detector) {
        return null;
      }

      var markers = [];
      try {
        markers = detector.detect(cropped) || [];
      } catch (error) {
        console.warn('Falha ao detectar marcadores ArUco na captura.', error);
        return null;
      }

      if (!markers.length) {
        return null;
      }

      var markerKeys = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
      var detected = {};
      for (var index = 0; index < markerKeys.length; index += 1) {
        var key = markerKeys[index];
        var marker = gabaritoTemplateMarkers[key];
        if (!marker || marker.id == null) {
          return null;
        }

        var bestMarker = null;
        var bestMetrics = null;
        for (var markerIndex = 0; markerIndex < markers.length; markerIndex += 1) {
          var currentMarker = markers[markerIndex];
          if (!currentMarker || currentMarker.id !== marker.id) {
            continue;
          }

          var metrics = computeArucoMarkerDetectionMetrics(currentMarker);
          if (!metrics) {
            continue;
          }

          if (!bestMetrics
            || metrics.hammingDistance < bestMetrics.hammingDistance
            || (metrics.hammingDistance === bestMetrics.hammingDistance && metrics.area > bestMetrics.area)) {
            bestMarker = currentMarker;
            bestMetrics = metrics;
          }
        }

        if (!bestMarker || !bestMetrics) {
          return null;
        }

        detected[key] = {
          x: bounds.x + bestMetrics.x,
          y: bounds.y + bestMetrics.y,
          width: bestMetrics.width,
          height: bestMetrics.height,
          fillRatio: 1,
          area: bestMetrics.area,
          score: 1 / (1 + bestMetrics.hammingDistance),
          distanceRatio: 0,
          markerPatternScore: 1 / (1 + bestMetrics.hammingDistance),
        };
      }

      return detected;
    }

    function computePerspectiveHomography(srcPts, dstPts) {
      // Solves for 3x3 homography H such that dstPt ~ H * srcPt (homogeneous coords)
      // srcPts / dstPts: arrays of 4 {x, y} in order: topLeft, topRight, bottomLeft, bottomRight
      var A = [];
      var b = [];
      for (var i = 0; i < 4; i += 1) {
        var sx = srcPts[i].x;
        var sy = srcPts[i].y;
        var dx = dstPts[i].x;
        var dy = dstPts[i].y;
        A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
        b.push(dx);
        A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
        b.push(dy);
      }

      // Gaussian elimination with partial pivoting on 8x8 system
      var M = [];
      for (var row = 0; row < 8; row += 1) {
        M.push(A[row].concat([b[row]]));
      }

      for (var col = 0; col < 8; col += 1) {
        var maxRow = col;
        var maxVal = Math.abs(M[col][col]);
        for (var r = col + 1; r < 8; r += 1) {
          if (Math.abs(M[r][col]) > maxVal) {
            maxVal = Math.abs(M[r][col]);
            maxRow = r;
          }
        }
        var tmp = M[col]; M[col] = M[maxRow]; M[maxRow] = tmp;
        if (Math.abs(M[col][col]) < 1e-10) {
          return null;
        }
        for (var r2 = col + 1; r2 < 8; r2 += 1) {
          var factor = M[r2][col] / M[col][col];
          for (var j = col; j <= 8; j += 1) {
            M[r2][j] -= factor * M[col][j];
          }
        }
      }

      var h = new Array(8);
      for (var i2 = 7; i2 >= 0; i2 -= 1) {
        h[i2] = M[i2][8];
        for (var j2 = i2 + 1; j2 < 8; j2 += 1) {
          h[i2] -= M[i2][j2] * h[j2];
        }
        h[i2] /= M[i2][i2];
      }

      return [
        [h[0], h[1], h[2]],
        [h[3], h[4], h[5]],
        [h[6], h[7], 1],
      ];
    }

    function applyPerspectiveHomography(H, x, y) {
      var w = H[2][0] * x + H[2][1] * y + H[2][2];
      if (Math.abs(w) < 1e-10) {
        return { x: 0, y: 0 };
      }
      return {
        x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
        y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w,
      };
    }

    function finalizeCorrecaoMarkerTransform(captureCanvas, detected) {
      if (!(captureCanvas instanceof HTMLCanvasElement) || !detected || !gabaritoTemplateMarkers) {
        return null;
      }

      var markerKeys = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
      var detectedAreas = [];
      for (var markerIndex = 0; markerIndex < markerKeys.length; markerIndex += 1) {
        var detectedMarker = detected[markerKeys[markerIndex]];
        if (!detectedMarker) {
          return null;
        }

        detectedAreas.push(detectedMarker.area || 0);
      }

      var averageArea = detectedAreas.reduce(function (sum, value) {
        return sum + value;
      }, 0) / Math.max(1, detectedAreas.length);

      for (var validationIndex = 0; validationIndex < markerKeys.length; validationIndex += 1) {
        var markerToValidate = detected[markerKeys[validationIndex]];
        var areaRatio = (markerToValidate.area || 0) / Math.max(1, averageArea);
        if (areaRatio < 0.12 || areaRatio > 6.2) {
          return null;
        }
      }

      // Verificar que os 4 marcadores formam um retângulo válido
      // Os marcadores não podem estar muito próximos (evita confundir bolhas com marcadores)
      var minMarkerDistance = Math.min(captureCanvas.width, captureCanvas.height) * 0.02;
      var topDistance = Math.sqrt(
        Math.pow(detected.topRight.x - detected.topLeft.x, 2) +
        Math.pow(detected.topRight.y - detected.topLeft.y, 2)
      );
      var bottomDistance = Math.sqrt(
        Math.pow(detected.bottomRight.x - detected.bottomLeft.x, 2) +
        Math.pow(detected.bottomRight.y - detected.bottomLeft.y, 2)
      );
      var leftDistance = Math.sqrt(
        Math.pow(detected.bottomLeft.x - detected.topLeft.x, 2) +
        Math.pow(detected.bottomLeft.y - detected.topLeft.y, 2)
      );
      var rightDistance = Math.sqrt(
        Math.pow(detected.bottomRight.x - detected.topRight.x, 2) +
        Math.pow(detected.bottomRight.y - detected.topRight.y, 2)
      );
      if (topDistance < minMarkerDistance || bottomDistance < minMarkerDistance ||
        leftDistance < minMarkerDistance || rightDistance < minMarkerDistance) {
        return null;
      }

      // Verificar que topLeft está realmente no canto superior esquerdo, etc.
      if (detected.topRight.x <= detected.topLeft.x ||
        detected.bottomLeft.y <= detected.topLeft.y ||
        detected.bottomRight.x <= detected.bottomLeft.x ||
        detected.bottomRight.y <= detected.topRight.y) {
        return null;
      }

      var templateWidthBetweenMarkers = Math.max(1, gabaritoTemplateMarkers.topRight.x - gabaritoTemplateMarkers.topLeft.x);
      var templateHeightBetweenMarkers = Math.max(1, gabaritoTemplateMarkers.bottomLeft.y - gabaritoTemplateMarkers.topLeft.y);
      var detectedWidthBetweenMarkers = Math.max(1, detected.topRight.x - detected.topLeft.x);
      var detectedHeightBetweenMarkers = Math.max(1, detected.bottomLeft.y - detected.topLeft.y);
      var scaleX = detectedWidthBetweenMarkers / templateWidthBetweenMarkers;
      var scaleY = detectedHeightBetweenMarkers / templateHeightBetweenMarkers;
      var offsetX = detected.topLeft.x - (gabaritoTemplateMarkers.topLeft.x * scaleX);
      var offsetY = detected.topLeft.y - (gabaritoTemplateMarkers.topLeft.y * scaleY);
      var centerX = (detected.topLeft.x + detected.topRight.x + detected.bottomLeft.x + detected.bottomRight.x) / 4;
      var centerY = (detected.topLeft.y + detected.topRight.y + detected.bottomLeft.y + detected.bottomRight.y) / 4;

      var perspectiveH = computePerspectiveHomography(
        [gabaritoTemplateMarkers.topLeft, gabaritoTemplateMarkers.topRight, gabaritoTemplateMarkers.bottomLeft, gabaritoTemplateMarkers.bottomRight],
        [detected.topLeft, detected.topRight, detected.bottomLeft, detected.bottomRight]
      );

      return {
        scaleX: scaleX,
        scaleY: scaleY,
        offsetX: offsetX,
        offsetY: offsetY,
        H: perspectiveH,
        detectedWidth: detectedWidthBetweenMarkers,
        detectedHeight: detectedHeightBetweenMarkers,
        centerX: centerX,
        centerY: centerY,
        canvasWidth: captureCanvas.width,
        canvasHeight: captureCanvas.height,
        markers: detected,
      };
    }

    function buildCorrecaoMarkerTransform(captureCanvas) {
      if (!(captureCanvas instanceof HTMLCanvasElement) || !gabaritoTemplateMarkers) {
        correcaoLastDiagnostics = null;
        return null;
      }

      // IMPORTANTE: Aplicar a binarização local ANTES de qualqer detecção de marcadores 
      // para evitar falhas de contraste no background
      convertCorrecaoCanvasToGrayscale(captureCanvas);

      var ctx = getCanvas2DContext(captureCanvas, { willReadFrequently: true });
      if (!ctx) {
        correcaoLastDiagnostics = null;
        return null;
      }

      var imageData = ctx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
      var wholeCanvasBounds = {
        x: 0,
        y: 0,
        width: captureCanvas.width,
        height: captureCanvas.height,
      };
      var diagnostics = {
        guideRegion: null,
        paperBounds: null,
        markers: null,
        source: 'none',
      };

      // Tenta detectar marcadores em toda a câmera
      var detectedSource = 'none';
      var detectedFromWholeCanvas = detectCorrecaoArucoMarkersFromImageData(imageData, wholeCanvasBounds);
      if (detectedFromWholeCanvas) {
        detectedSource = 'aruco';
      } else {
        detectedFromWholeCanvas = detectCorrecaoMarkersFromImageData(imageData, wholeCanvasBounds, true)
          || detectCorrecaoMarkersFromImageData(imageData, wholeCanvasBounds);
        if (detectedFromWholeCanvas) {
          detectedSource = 'legacy';
        }
      }
      if (detectedFromWholeCanvas) {
        // Tenta transform estrito primeiro (validação axial)
        var wholeCanvasTransform = finalizeCorrecaoMarkerTransform(captureCanvas, detectedFromWholeCanvas);

        // Se falhou (câmera rotacionada), tenta homografia direta sem validação axial
        if (!wholeCanvasTransform) {
          var tl = detectedFromWholeCanvas.topLeft;
          var tr = detectedFromWholeCanvas.topRight;
          var bl = detectedFromWholeCanvas.bottomLeft;
          var br = detectedFromWholeCanvas.bottomRight;
          if (tl && tr && bl && br && gabaritoTemplateMarkers) {
            var perspH = computePerspectiveHomography(
              [gabaritoTemplateMarkers.topLeft, gabaritoTemplateMarkers.topRight, gabaritoTemplateMarkers.bottomLeft, gabaritoTemplateMarkers.bottomRight],
              [tl, tr, bl, br]
            );
            if (perspH) {
              var dw = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
              var dh = Math.sqrt(Math.pow(bl.x - tl.x, 2) + Math.pow(bl.y - tl.y, 2));
              var tmplW = Math.max(1, gabaritoTemplateMarkers.topRight.x - gabaritoTemplateMarkers.topLeft.x);
              var tmplH = Math.max(1, gabaritoTemplateMarkers.bottomLeft.y - gabaritoTemplateMarkers.topLeft.y);
              wholeCanvasTransform = {
                scaleX: dw / tmplW,
                scaleY: dh / tmplH,
                offsetX: tl.x - (gabaritoTemplateMarkers.topLeft.x * (dw / tmplW)),
                offsetY: tl.y - (gabaritoTemplateMarkers.topLeft.y * (dh / tmplH)),
                H: perspH,
                detectedWidth: dw,
                detectedHeight: dh,
                centerX: (tl.x + tr.x + bl.x + br.x) / 4,
                centerY: (tl.y + tr.y + bl.y + br.y) / 4,
                canvasWidth: captureCanvas.width,
                canvasHeight: captureCanvas.height,
                markers: detectedFromWholeCanvas,
              };
            }
          }
        }

        if (wholeCanvasTransform) {
          diagnostics.markers = detectedFromWholeCanvas;
          diagnostics.paperBounds = null;
          diagnostics.source = detectedSource === 'aruco' ? 'whole-aruco' : 'whole';
          diagnostics.transform = wholeCanvasTransform;
          wholeCanvasTransform.diagnostics = diagnostics;
          correcaoLastDiagnostics = diagnostics;
          correcaoLastTransform = wholeCanvasTransform;
          return wholeCanvasTransform;
        }
      }

      correcaoLastDiagnostics = diagnostics;
      correcaoLastTransform = null;
      return null;
    }

    function validateCorrecaoMarkerTransform(transform) {
      if (!transform) {
        throw new Error('Não foi possível localizar os 4 marcadores do gabarito. Posicione a câmera sobre a área do gabarito e tente novamente.');
      }

      var widthRatio = transform.detectedWidth / Math.max(1, transform.canvasWidth);
      var heightRatio = transform.detectedHeight / Math.max(1, transform.canvasHeight);
      var horizontalCenterOffset = Math.abs(transform.centerX - (transform.canvasWidth / 2)) / Math.max(1, transform.canvasWidth);
      var verticalCenterOffset = Math.abs(transform.centerY - (transform.canvasHeight / 2)) / Math.max(1, transform.canvasHeight);
      var topHorizontalDelta = Math.abs((transform.markers.topLeft.y || 0) - (transform.markers.topRight.y || 0)) / Math.max(1, transform.canvasHeight);
      var bottomHorizontalDelta = Math.abs((transform.markers.bottomLeft.y || 0) - (transform.markers.bottomRight.y || 0)) / Math.max(1, transform.canvasHeight);
      var leftVerticalDelta = Math.abs((transform.markers.topLeft.x || 0) - (transform.markers.bottomLeft.x || 0)) / Math.max(1, transform.canvasWidth);
      var rightVerticalDelta = Math.abs((transform.markers.topRight.x || 0) - (transform.markers.bottomRight.x || 0)) / Math.max(1, transform.canvasWidth);
      var diagonalRatio = transform.detectedWidth / Math.max(1, transform.detectedHeight);

      if (widthRatio < 0.03 || heightRatio < 0.02) {
        throw new Error('QR identificado. Aproxime a câmera da área do gabarito para iniciar a leitura.');
      }

      if (horizontalCenterOffset > 0.42 || verticalCenterOffset > 0.45) {
        throw new Error('QR identificado. Centralize o gabarito dentro da área destacada da câmera.');
      }

      if (topHorizontalDelta > 0.20 || bottomHorizontalDelta > 0.20 || leftVerticalDelta > 0.20 || rightVerticalDelta > 0.20) {
        throw new Error('Correção liberada somente com os 4 marcadores do gabarito corretamente enquadrados.');
      }

      if (diagonalRatio < 0.35 || diagonalRatio > 5.0) {
        throw new Error('Correção liberada somente com os 4 marcadores do gabarito corretamente enquadrados.');
      }

      return transform;
    }

    /**
     * Remove blobs escuros com área menor que minArea pixels da imageData (in-place).
     * A imageData deve estar em escala de cinza (R=G=B). Usa limiar isDark < 115.
     * Blobs pequenos (poeira, ruído, fragmentos de letra) são embranquecidos,
     * preservando bolhas marcadas e marcadores de canto (área muito maior).
     */
    function removeSmallBlobsFromImageData(imageData, minArea) {
      var width = imageData.width;
      var height = imageData.height;
      var totalPixels = width * height;
      var isDarkThreshold = 115;

      // Máscara binária de pixels escuros (imagem já está em cinza: R=G=B)
      var darkMask = new Uint8Array(totalPixels);
      for (var i = 0; i < totalPixels; i++) {
        darkMask[i] = imageData.data[i * 4] < isDarkThreshold ? 1 : 0;
      }

      var visited = new Uint8Array(totalPixels);
      // Reutiliza buffer fixo para a fila do BFS (evita alocações repetidas)
      var queueBuffer = new Int32Array(totalPixels);

      for (var sy = 0; sy < height; sy++) {
        for (var sx = 0; sx < width; sx++) {
          var startIdx = (sy * width) + sx;
          if (!darkMask[startIdx] || visited[startIdx]) {
            continue;
          }

          // BFS 4-conectado para encontrar o componente
          var head = 0;
          var tail = 0;
          queueBuffer[tail] = startIdx;
          tail += 1;
          visited[startIdx] = 1;

          while (head < tail) {
            var idx = queueBuffer[head];
            head += 1;
            var cx = idx % width;
            var cy = (idx - cx) / width;

            if (cx > 0 && darkMask[idx - 1] && !visited[idx - 1]) {
              visited[idx - 1] = 1;
              queueBuffer[tail] = idx - 1;
              tail += 1;
            }
            if (cx < width - 1 && darkMask[idx + 1] && !visited[idx + 1]) {
              visited[idx + 1] = 1;
              queueBuffer[tail] = idx + 1;
              tail += 1;
            }
            if (cy > 0 && darkMask[idx - width] && !visited[idx - width]) {
              visited[idx - width] = 1;
              queueBuffer[tail] = idx - width;
              tail += 1;
            }
            if (cy < height - 1 && darkMask[idx + width] && !visited[idx + width]) {
              visited[idx + width] = 1;
              queueBuffer[tail] = idx + width;
              tail += 1;
            }
          }

          // tail == tamanho do componente; queueBuffer[0..tail-1] == seus índices
          if (tail < minArea) {
            for (var pi = 0; pi < tail; pi++) {
              var pixelOffset = queueBuffer[pi] * 4;
              imageData.data[pixelOffset] = 255;
              imageData.data[pixelOffset + 1] = 255;
              imageData.data[pixelOffset + 2] = 255;
            }
          }
        }
      }

      return imageData;
    }

    function scoreBubbleMark(imageData, centerX, centerY, radius) {
      var width = imageData.width;
      var height = imageData.height;
      var safeRadius = Math.max(5, Math.round(radius));
      var innerRadius = Math.max(2, Math.round(safeRadius * 0.34));
      var ringStartRadius = Math.max(innerRadius + 1, Math.round(safeRadius * 0.62));
      var startX = Math.max(0, Math.round(centerX - safeRadius));
      var endX = Math.min(width - 1, Math.round(centerX + safeRadius));
      var startY = Math.max(0, Math.round(centerY - safeRadius));
      var endY = Math.min(height - 1, Math.round(centerY + safeRadius));
      var totalBrightness = 0;
      var totalPixels = 0;
      var darkPixels = 0;
      var radiusSquared = safeRadius * safeRadius;
      var innerRadiusSquared = innerRadius * innerRadius;
      var ringStartRadiusSquared = ringStartRadius * ringStartRadius;
      var centerBrightnessTotal = 0;
      var centerPixels = 0;
      var centerDarkPixels = 0;
      var ringPixels = 0;
      var ringDarkPixels = 0;
      var roiHalfSize = Math.max(8, Math.round(safeRadius * 1.1));
      var roiStartX = Math.max(0, Math.round(centerX - roiHalfSize));
      var roiEndX = Math.min(width - 1, Math.round(centerX + roiHalfSize));
      var roiStartY = Math.max(0, Math.round(centerY - roiHalfSize));
      var roiEndY = Math.min(height - 1, Math.round(centerY + roiHalfSize));
      var roiBrightnessTotal = 0;
      var roiPixelCount = 0;
      var roiDarkPixels = 0;
      var roiAdaptiveDarkPixels = 0;

      for (var roiY = roiStartY; roiY <= roiEndY; roiY += 1) {
        for (var roiX = roiStartX; roiX <= roiEndX; roiX += 1) {
          var roiOffset = ((roiY * width) + roiX) * 4;
          var roiBrightness = imageData.data[roiOffset];
          roiBrightnessTotal += roiBrightness;
          roiPixelCount += 1;
          if (roiBrightness < 138) {
            roiDarkPixels += 1;
          }
        }
      }

      var roiAverageBrightness = roiPixelCount > 0 ? (roiBrightnessTotal / roiPixelCount) : 255;
      var roiAdaptiveThreshold = Math.max(90, Math.min(210, roiAverageBrightness - 18));

      for (var roiY2 = roiStartY; roiY2 <= roiEndY; roiY2 += 1) {
        for (var roiX2 = roiStartX; roiX2 <= roiEndX; roiX2 += 1) {
          var roiOffset2 = ((roiY2 * width) + roiX2) * 4;
          var roiBrightness2 = imageData.data[roiOffset2];
          if (roiBrightness2 < roiAdaptiveThreshold) {
            roiAdaptiveDarkPixels += 1;
          }
        }
      }

      for (var y = startY; y <= endY; y += 1) {
        for (var x = startX; x <= endX; x += 1) {
          var dx = x - centerX;
          var dy = y - centerY;
          var distanceSquared = (dx * dx) + (dy * dy);
          if (distanceSquared > radiusSquared) {
            continue;
          }

          var offset = ((y * width) + x) * 4;
          var r = imageData.data[offset];
          var g = imageData.data[offset + 1];
          var b = imageData.data[offset + 2];
          var brightness = (r * 0.299) + (g * 0.587) + (b * 0.114);
          totalBrightness += brightness;
          totalPixels += 1;

          // Tinta escura conta (caneta/lápis) com tolerância um pouco maior para lápis/caneta claros.
          // 138 recupera marcas reais fracas sem abrir demais para o impresso.
          var isDark = brightness < 138;

          if (isDark) {
            darkPixels += 1;
          }

          if (distanceSquared <= innerRadiusSquared) {
            centerBrightnessTotal += brightness;
            centerPixels += 1;
            if (isDark) {
              centerDarkPixels += 1;
            }
          } else if (distanceSquared >= ringStartRadiusSquared) {
            ringPixels += 1;
            if (isDark) {
              ringDarkPixels += 1;
            }
          }
        }
      }

      if (totalPixels === 0) {
        return {
          averageBrightness: 255,
          darkRatio: 0,
          centerAverageBrightness: 255,
          centerDarkRatio: 0,
          ringDarkRatio: 0,
          roiAverageBrightness: 255,
          roiDarkRatio: 0,
          roiAdaptiveDarkRatio: 0,
          combined: 0,
        };
      }

      var averageBrightness = totalBrightness / totalPixels;
      var darkRatio = darkPixels / totalPixels;
      var darknessScore = Math.max(0, (255 - averageBrightness) / 255);
      var centerAverageBrightness = centerPixels > 0 ? (centerBrightnessTotal / centerPixels) : averageBrightness;
      var centerDarkRatio = centerPixels > 0 ? (centerDarkPixels / centerPixels) : darkRatio;
      var ringDarkRatio = ringPixels > 0 ? (ringDarkPixels / ringPixels) : darkRatio;
      var centerDarknessScore = Math.max(0, (255 - centerAverageBrightness) / 255);
      var roiDarkRatio = roiPixelCount > 0 ? (roiDarkPixels / roiPixelCount) : 0;
      var roiAdaptiveDarkRatio = roiPixelCount > 0 ? (roiAdaptiveDarkPixels / roiPixelCount) : 0;

      return {
        averageBrightness: averageBrightness,
        darkRatio: darkRatio,
        centerAverageBrightness: centerAverageBrightness,
        centerDarkRatio: centerDarkRatio,
        ringDarkRatio: ringDarkRatio,
        roiAverageBrightness: roiAverageBrightness,
        roiDarkRatio: roiDarkRatio,
        roiAdaptiveDarkRatio: roiAdaptiveDarkRatio,
        combined: (centerDarknessScore * 0.5) + (centerDarkRatio * 0.26) + (Math.min(1, roiAdaptiveDarkRatio * 1.8) * 0.14) + (darknessScore * 0.06) + (darkRatio * 0.02) + (Math.min(1, roiDarkRatio * 1.4) * 0.02),
      };
    }

    function buildGabaritoBubbleScoreKey(questionKey, alternativa) {
      return String(questionKey || '').trim() + '::' + String(alternativa || '').trim().toUpperCase();
    }

    function calibrateGabaritoBubbleTemplateScores() {
      gabaritoBubbleTemplateScores = {};

      if (!(gabaritoPreviewCanvas instanceof HTMLCanvasElement) || !Array.isArray(gabaritoBubbleHitboxes) || !gabaritoBubbleHitboxes.length) {
        return;
      }

      var ctx = getCanvas2DContext(gabaritoPreviewCanvas, { willReadFrequently: true });
      if (!ctx) {
        return;
      }

      var dprScale = (gabaritoPreviewLogicalWidth > 0 && gabaritoPreviewCanvas.width > gabaritoPreviewLogicalWidth)
        ? (gabaritoPreviewCanvas.width / gabaritoPreviewLogicalWidth)
        : 1;
      var imageData = ctx.getImageData(0, 0, gabaritoPreviewCanvas.width, gabaritoPreviewCanvas.height);

      // Aplicar o mesmo processamento de limpeza usado na detecção para consistência
      removeSmallBlobsFromImageData(imageData, 18);
      gabaritoBubbleHitboxes.forEach(function (bubble) {
        var questionKey = String(bubble && bubble.questao || '').trim();
        var alternativa = String(bubble && bubble.alternativa || '').trim().toUpperCase();
        if (questionKey === '' || alternativa === '') {
          return;
        }

        var baselineScore = scoreBubbleMark(
          imageData,
          Number(bubble.x || 0) * dprScale,
          Number(bubble.y || 0) * dprScale,
          Math.max(5, Number(bubble.r || 0) * dprScale * 0.54)
        );

        gabaritoBubbleTemplateScores[buildGabaritoBubbleScoreKey(questionKey, alternativa)] = baselineScore;
      });
    }

    function detectAnswersFromCorrecaoCanvas(captureCanvas) {
      if (!(captureCanvas instanceof HTMLCanvasElement) || !Array.isArray(gabaritoBubbleHitboxes) || !gabaritoBubbleHitboxes.length) {
        throw new Error('O gabarito desta avaliação ainda não está pronto para correção.');
      }

      var originalSourceWidth = captureCanvas.width;
      var originalSourceHeight = captureCanvas.height;

      // Aplica o filtro de escala de cinza ANTES da detecção para melhorar a leitura
      convertCorrecaoCanvasToGrayscale(captureCanvas);

      var transform = captureCanvas._userTransform || buildCorrecaoMarkerTransform(captureCanvas);
      if (!transform) {
        throw new Error('Não foi possível localizar os 4 marcadores do gabarito. Posicione a câmera sobre a área do gabarito e tente novamente.');
      }

      var ctx = getCanvas2DContext(captureCanvas, { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Falha ao processar a imagem capturada.');
      }

      var imageData = ctx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);

      // Homography warp: Align image to look like Gradepen
      if (transform && transform.H && gabaritoTemplateMarkers) {
        var tmW = Math.round(gabaritoTemplateMarkers.width);
        var tmH = Math.round(gabaritoTemplateMarkers.height);
        var warpedData = new ImageData(tmW, tmH);
        for (var wy = 0; wy < tmH; wy++) {
          for (var wx = 0; wx < tmW; wx++) {
            var tw = transform.H[2][0] * wx + transform.H[2][1] * wy + transform.H[2][2];
            var srcX = Math.round((transform.H[0][0] * wx + transform.H[0][1] * wy + transform.H[0][2]) / tw);
            var srcY = Math.round((transform.H[1][0] * wx + transform.H[1][1] * wy + transform.H[1][2]) / tw);
            var destIdx = (wy * tmW + wx) * 4;
            if (srcX >= 0 && srcX < captureCanvas.width && srcY >= 0 && srcY < captureCanvas.height) {
              var srcIdx = (srcY * captureCanvas.width + srcX) * 4;
              warpedData.data[destIdx] = imageData.data[srcIdx];
              warpedData.data[destIdx + 1] = imageData.data[srcIdx + 1];
              warpedData.data[destIdx + 2] = imageData.data[srcIdx + 2];
              warpedData.data[destIdx + 3] = 255;
            } else {
              warpedData.data[destIdx] = 255;
              warpedData.data[destIdx + 1] = 255;
              warpedData.data[destIdx + 2] = 255;
              warpedData.data[destIdx + 3] = 255;
            }
          }
        }
        imageData = warpedData;
        transform = { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, H: null };
        if (correcaoLastDiagnostics) {
          correcaoLastDiagnostics.transform = transform;
          correcaoLastDiagnostics.sourceWidth = originalSourceWidth;
          correcaoLastDiagnostics.sourceHeight = originalSourceHeight;
        }
        if (window.correcaoDiagnosticsSvg instanceof SVGElement) {
          correcaoDiagnosticsSvg.innerHTML = '';
        }
      }

      // Mantendo APENAS a conversão para escala de cinza (sem qualquer binarização agressiva para evitar borrados)
      (function applyAdvancedBinarization(imgData) {
        var w = imgData.width;
        var h = imgData.height;
        var d = imgData.data;
        for (var i = 0; i < d.length; i += 4) {
          var r = d[i];
          var g = d[i + 1];
          var b = d[i + 2];
          var gray = 0.299 * r + 0.587 * g + 0.114 * b;
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
          d[i + 3] = 255;
        }
      })(imageData);

      // Remove blobs escuros pequenos (ruído, poeira, fragmentos de letra impressa).
      // Blobs com menos de 18 pixels conectados são embranquecidos.
      // Bolhas marcadas e marcadores de canto têm área muito maior e não são afetados.
      removeSmallBlobsFromImageData(imageData, 18);

      // Adjust canvas dimensions and context to actually fit the warped image
      if (captureCanvas.width !== imageData.width || captureCanvas.height !== imageData.height) {
        captureCanvas.width = imageData.width;
        captureCanvas.height = imageData.height;
        ctx = getCanvas2DContext(captureCanvas, { willReadFrequently: true });
      }
      ctx.putImageData(imageData, 0, 0);

      // Calculate average brightness specifically to prevent instant reject of the thresholded image
      var adjustedBrightnessSum = 0;
      for (var i = 0; i < imageData.data.length; i += 4) {
        adjustedBrightnessSum += imageData.data[i];
      }
      var imageAvgBrightness = adjustedBrightnessSum / (imageData.width * imageData.height);

      // Se a imagem for majoritariamente preta após threshold, ela é inválida
      if (imageAvgBrightness < 40) {
        return { answers: {}, diagnosticsByQuestion: {}, acceptedAnswerDiagnostics: [], confidenceStats: { low: 0, medium: 0, high: 0 } };
      }

      var baselineScores = gabaritoBubbleTemplateScores;
      var brightnessSum = 0;
      var brightnessSampleCount = 0;
      var brightnessStep = Math.max(1, Math.floor(imageData.data.length / (4 * 2000)));
      for (var bIndex = 0; bIndex < imageData.data.length; bIndex += 4 * brightnessStep) {
        // A imagem já está em tons de cinza (R=G=B=Luminance), então apenas lemos um canal
        brightnessSum += imageData.data[bIndex];
        brightnessSampleCount += 1;
      }
      // Pular o bloqueio por globalAverageBrightness da imagem pós threshold

      var grouped = {};
      gabaritoBubbleHitboxes.forEach(function (bubble) {
        var questionKey = String(bubble.questao || '');
        if (questionKey === '') {
          return;
        }

        if (!grouped[questionKey]) {
          grouped[questionKey] = [];
        }

        grouped[questionKey].push(bubble);
      });

      var studentAnswers = {};
      var acceptedAnswerDiagnostics = [];
      var diagnosticsByQuestion = {};
      Object.keys(grouped).sort(function (left, right) {
        return Number(left) - Number(right);
      }).forEach(function (questionKey) {
        var options = grouped[questionKey].slice().sort(function (left, right) {
          return String(left.alternativa || '').localeCompare(String(right.alternativa || ''), 'pt-BR', { sensitivity: 'base' });
        }).map(function (bubble) {
          var projected;
          if (transform.H) {
            projected = applyPerspectiveHomography(transform.H, bubble.x, bubble.y);
          } else {
            projected = {
              x: transform.offsetX + (bubble.x * transform.scaleX),
              y: transform.offsetY + (bubble.y * transform.scaleY),
            };
          }

          var centerX = projected.x;
          var centerY = projected.y;

          var projectedRadius;
          if (transform.H) {
            var rightEdgeProjected = applyPerspectiveHomography(transform.H, bubble.x + Number(bubble.r || 6), bubble.y);
            var dx = rightEdgeProjected.x - centerX;
            var dy = rightEdgeProjected.y - centerY;
            projectedRadius = Math.sqrt(dx * dx + dy * dy);
          } else {
            projectedRadius = Number(bubble.r || 6) * Math.max(transform.scaleX, transform.scaleY);
          }
          // Raio de 54% da bolinha: cobre bem a área preenchida sem abrir demais para a borda impressa.
          var radius = Math.max(5, projectedRadius * 0.54);

          var score = scoreBubbleMark(imageData, centerX, centerY, radius);
          var baselineScore = baselineScores[buildGabaritoBubbleScoreKey(questionKey, bubble.alternativa)] || {
            averageBrightness: 255,
            darkRatio: 0,
            centerAverageBrightness: 255,
            centerDarkRatio: 0,
            ringDarkRatio: 0,
            roiAverageBrightness: 255,
            roiDarkRatio: 0,
            roiAdaptiveDarkRatio: 0,
            combined: 0,
          };
          var brightnessDrop = Math.max(0, baselineScore.averageBrightness - score.averageBrightness);
          var centerBrightnessDrop = Math.max(0, baselineScore.centerAverageBrightness - score.centerAverageBrightness);
          var roiBrightnessDrop = Math.max(0, baselineScore.roiAverageBrightness - score.roiAverageBrightness);
          var darkRatioGain = Math.max(0, score.darkRatio - baselineScore.darkRatio);
          var centerDarkGain = Math.max(0, score.centerDarkRatio - baselineScore.centerDarkRatio);
          var roiDarkRatioGain = Math.max(0, score.roiDarkRatio - baselineScore.roiDarkRatio);
          var roiAdaptiveDarkGain = Math.max(0, score.roiAdaptiveDarkRatio - baselineScore.roiAdaptiveDarkRatio);
          var combinedGain = Math.max(0, score.combined - baselineScore.combined);
          var ringPenalty = Math.max(0, score.ringDarkRatio - baselineScore.ringDarkRatio - 0.05);
          var markStrength = (centerDarkGain * 0.56)
            + (Math.min(1, centerBrightnessDrop / 95) * 0.28)
            + (combinedGain * 0.14)
            + (Math.min(1, brightnessDrop / 135) * 0.04)
            - (ringPenalty * 0.22);
          var roiMarkStrength = (Math.min(1, roiAdaptiveDarkGain * 2.4) * 0.52)
            + (Math.min(1, roiBrightnessDrop / 85) * 0.28)
            + (Math.min(1, roiDarkRatioGain * 2) * 0.20);
          var legacyBubbleScore = (Math.min(1, roiAdaptiveDarkGain * 3.2) * 0.54)
            + (Math.min(1, roiBrightnessDrop / 78) * 0.28)
            + (Math.min(1, centerBrightnessDrop / 96) * 0.10)
            + (Math.min(1, roiDarkRatioGain * 2.2) * 0.08);
          var effectiveMarkStrength = Math.max(markStrength, roiMarkStrength * 0.96, legacyBubbleScore * 0.98, (markStrength * 0.54) + (roiMarkStrength * 0.28) + (legacyBubbleScore * 0.34));
          var decisionScore = Math.max(legacyBubbleScore, effectiveMarkStrength * 0.94, (legacyBubbleScore * 0.68) + (effectiveMarkStrength * 0.32));

          // Desenho para debug
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();

          return {
            alternativa: String(bubble.alternativa || '').trim().toUpperCase(),
            score: score,
            baselineScore: baselineScore,
            brightnessDrop: brightnessDrop,
            centerBrightnessDrop: centerBrightnessDrop,
            darkRatioGain: darkRatioGain,
            centerDarkGain: centerDarkGain,
            roiBrightnessDrop: roiBrightnessDrop,
            roiDarkRatioGain: roiDarkRatioGain,
            roiAdaptiveDarkGain: roiAdaptiveDarkGain,
            combinedGain: combinedGain,
            ringPenalty: ringPenalty,
            markStrength: markStrength,
            roiMarkStrength: roiMarkStrength,
            legacyBubbleScore: legacyBubbleScore,
            effectiveMarkStrength: effectiveMarkStrength,
            decisionScore: decisionScore,
            centerX: centerX,
            centerY: centerY,
            radius: radius
          };
        }).sort(function (left, right) {
          return right.decisionScore - left.decisionScore || right.legacyBubbleScore - left.legacyBubbleScore || right.effectiveMarkStrength - left.effectiveMarkStrength || right.markStrength - left.markStrength || right.score.combined - left.score.combined;
        });

        if (!options.length) {
          return;
        }

        var best = options[0];
        var second = options[1] || {
          score: { combined: 0, averageBrightness: 255, centerDarkRatio: 0, roiAdaptiveDarkRatio: 0 },
          markStrength: 0,
          roiMarkStrength: 0,
          legacyBubbleScore: 0,
          effectiveMarkStrength: 0,
          decisionScore: 0,
          brightnessDrop: 0,
          centerBrightnessDrop: 0,
          roiBrightnessDrop: 0,
          darkRatioGain: 0,
          centerDarkGain: 0,
          roiAdaptiveDarkGain: 0,
          combinedGain: 0,
        };
        var third = options[2] || {
          score: { combined: 0, averageBrightness: 255, centerDarkRatio: 0, roiAdaptiveDarkRatio: 0 },
          markStrength: 0,
          roiMarkStrength: 0,
          legacyBubbleScore: 0,
          effectiveMarkStrength: 0,
          decisionScore: 0,
          brightnessDrop: 0,
          centerBrightnessDrop: 0,
          roiBrightnessDrop: 0,
          darkRatioGain: 0,
          centerDarkGain: 0,
          roiAdaptiveDarkGain: 0,
          combinedGain: 0,
        };
        var strengthGap = best.decisionScore - second.decisionScore;
        var thirdGap = best.decisionScore - third.decisionScore;
        var siblingOptions = options.slice(1);
        var siblingCount = siblingOptions.length || 1;
        var siblingAverageStrength = siblingOptions.reduce(function (sum, option) {
          return sum + Number(option.decisionScore || 0);
        }, 0) / siblingCount;
        var siblingAverageCenterDarkRatio = siblingOptions.reduce(function (sum, option) {
          return sum + Number(option.score && option.score.centerDarkRatio || 0);
        }, 0) / siblingCount;
        var siblingAverageRoiMarkStrength = siblingOptions.reduce(function (sum, option) {
          return sum + Number(option.roiMarkStrength || 0);
        }, 0) / siblingCount;
        var siblingAverageRoiAdaptiveDarkGain = siblingOptions.reduce(function (sum, option) {
          return sum + Number(option.roiAdaptiveDarkGain || 0);
        }, 0) / siblingCount;
        var siblingAverageBrightnessDrop = siblingOptions.reduce(function (sum, option) {
          return sum + Number(option.centerBrightnessDrop || 0);
        }, 0) / siblingCount;
        var localRoiMarkGain = best.roiMarkStrength - siblingAverageRoiMarkStrength;
        var localRoiAdaptiveDarkGain = best.roiAdaptiveDarkGain - siblingAverageRoiAdaptiveDarkGain;
        var localStrengthGain = best.decisionScore - siblingAverageStrength;
        var localCenterDarkRatioGain = best.score.centerDarkRatio - siblingAverageCenterDarkRatio;
        var localBrightnessDropGain = best.centerBrightnessDrop - siblingAverageBrightnessDrop;

        var candidateMarkedOptions = options.filter(function (option) {
          var relativeStrength = best.decisionScore > 0 ? (option.decisionScore / best.decisionScore) : 0;
          var localStrengthAgainstSiblings = option.decisionScore - siblingAverageStrength;
          var localRoiAgainstSiblings = option.roiMarkStrength - siblingAverageRoiMarkStrength;
          var localBrightnessAgainstSiblings = option.centerBrightnessDrop - siblingAverageBrightnessDrop;

          return (
            option.decisionScore >= 0.045
            || option.roiMarkStrength >= 0.06
            || option.legacyBubbleScore >= 0.075
            || option.centerDarkGain >= 0.045
            || option.centerBrightnessDrop >= 8
            || option.roiAdaptiveDarkGain >= 0.04
            || option.roiBrightnessDrop >= 6
            || option.score.centerDarkRatio >= 0.18
          ) && (
              relativeStrength >= 0.18
              || localStrengthAgainstSiblings >= 0.012
              || localRoiAgainstSiblings >= 0.018
              || localBrightnessAgainstSiblings >= 3
              || option.legacyBubbleScore >= 0.10
              || option.roiAdaptiveDarkGain >= 0.055
            ) && option.ringPenalty <= 0.12;
        });

        var duplicateCandidates = candidateMarkedOptions.filter(function (option) {
          if (option.alternativa === best.alternativa) {
            return false;
          }

          var relativeStrength = best.decisionScore > 0 ? (option.decisionScore / best.decisionScore) : 0;
          return (
            option.decisionScore >= 0.07
            || option.roiMarkStrength >= 0.09
            || option.legacyBubbleScore >= 0.10
            || option.centerDarkGain >= 0.06
            || option.centerBrightnessDrop >= 12
            || option.roiAdaptiveDarkGain >= 0.06
            || option.score.centerDarkRatio >= 0.18
          ) && (
              relativeStrength >= 0.58
              || option.roiMarkStrength >= Math.max(0.08, best.roiMarkStrength - 0.035)
              || option.legacyBubbleScore >= Math.max(0.09, best.legacyBubbleScore - 0.05)
              || option.roiAdaptiveDarkGain >= Math.max(0.05, best.roiAdaptiveDarkGain - 0.03)
              || option.score.centerDarkRatio >= Math.max(0.18, best.score.centerDarkRatio - 0.07)
              || option.centerBrightnessDrop >= Math.max(10, best.centerBrightnessDrop - 7)
            );
        });

        var secondAlsoMarked = duplicateCandidates.length > 0 || (
          second.decisionScore >= Math.max(0.09, best.decisionScore - 0.035)
          && second.legacyBubbleScore >= Math.max(0.08, best.legacyBubbleScore - 0.05)
        ) || (
            second.legacyBubbleScore >= Math.max(0.10, best.legacyBubbleScore - 0.04)
            && second.roiAdaptiveDarkGain >= Math.max(0.045, best.roiAdaptiveDarkGain - 0.025)
            && second.centerBrightnessDrop >= Math.max(8, best.centerBrightnessDrop - 8)
          );
        var hasSingleMarkedCandidate = candidateMarkedOptions.length === 1
          && candidateMarkedOptions[0].alternativa === best.alternativa;

        // Detecção híbrida com base em candidatos marcados, para aceitar bolhas preenchidas
        // mais leves sem deixar passar questões com duas alternativas plausíveis.
        var passesRelativeCheck = (
          best.decisionScore >= 0.10
          && (best.centerDarkGain >= 0.06 || best.centerBrightnessDrop >= 12 || best.score.centerDarkRatio >= 0.22 || best.roiMarkStrength >= 0.10 || best.roiAdaptiveDarkGain >= 0.06 || best.legacyBubbleScore >= 0.11)
          && strengthGap >= 0.03
          && thirdGap >= 0.05
        ) || (
            hasSingleMarkedCandidate
            && (best.decisionScore >= 0.07 || best.roiMarkStrength >= 0.08 || best.legacyBubbleScore >= 0.09)
            && (best.centerDarkGain >= 0.04 || best.centerBrightnessDrop >= 8 || best.score.centerDarkRatio >= 0.18 || best.roiAdaptiveDarkGain >= 0.05 || best.legacyBubbleScore >= 0.09)
          );
        var passesAdaptiveSingleCheck = !secondAlsoMarked && (
          (
            best.decisionScore >= 0.07
            && localStrengthGain >= 0.02
            && localCenterDarkRatioGain >= 0.03
          ) || (
            best.roiMarkStrength >= 0.08
            && best.roiAdaptiveDarkGain >= 0.05
            && localRoiMarkGain >= 0.025
          ) || (
            best.legacyBubbleScore >= 0.10
            && best.roiAdaptiveDarkGain >= 0.05
            && strengthGap >= 0.025
          ) || (
            best.centerBrightnessDrop >= 8
            && localBrightnessDropGain >= 3
            && best.score.centerDarkRatio >= 0.18
          ) || (
            hasSingleMarkedCandidate
            && (best.score.centerDarkRatio >= 0.18 || best.roiMarkStrength >= 0.08)
            && (localStrengthGain >= 0.01 || localBrightnessDropGain >= 2 || best.roiAdaptiveDarkGain >= 0.04)
          ) || (
            hasSingleMarkedCandidate
            && best.legacyBubbleScore >= 0.08
            && best.roiMarkStrength >= 0.065
            && best.roiAdaptiveDarkGain >= 0.04
            && best.roiBrightnessDrop >= 6
            && (localRoiMarkGain >= 0.012 || localStrengthGain >= 0.008 || localBrightnessDropGain >= 1.5)
          )
        );
        var passesLocalDominanceCheck = !secondAlsoMarked && (
          (
            best.decisionScore >= 0.045
            && strengthGap >= 0.025
            && localStrengthGain >= 0.012
            && localCenterDarkRatioGain >= 0.02
          ) || (
            best.roiMarkStrength >= 0.06
            && best.roiAdaptiveDarkGain >= 0.038
            && localRoiAdaptiveDarkGain >= 0.015
          ) || (
            best.legacyBubbleScore >= 0.08
            && strengthGap >= 0.018
            && (localRoiMarkGain >= 0.012 || localStrengthGain >= 0.008)
          ) || (
            best.centerBrightnessDrop >= 6
            && localBrightnessDropGain >= 2
            && strengthGap >= 0.025
          ) || (
            hasSingleMarkedCandidate
            && (best.decisionScore >= 0.045 || best.roiMarkStrength >= 0.055 || best.legacyBubbleScore >= 0.075)
            && (best.score.centerDarkRatio >= 0.15 || best.roiAdaptiveDarkGain >= 0.038)
            && (localStrengthGain >= 0.006 || localBrightnessDropGain >= 1.5 || best.roiBrightnessDrop >= 5)
          )
        );
        // Método absoluto: usa score bruto alto e separação real da segunda opção.
        var passesAbsoluteCheck = (
          best.score.centerDarkRatio >= 0.50
          && best.score.combined >= 0.40
          && best.score.centerDarkRatio - second.score.centerDarkRatio >= 0.20
        ) || (
            best.legacyBubbleScore >= 0.15
            && best.roiMarkStrength >= 0.11
            && best.roiAdaptiveDarkGain >= 0.055
            && best.roiBrightnessDrop >= 10
            && strengthGap >= 0.025
          );
        if ((passesRelativeCheck || passesAdaptiveSingleCheck || passesLocalDominanceCheck || passesAbsoluteCheck) && !secondAlsoMarked) {
          var confidenceLevel = getCorrecaoAnswerConfidenceLevel(best);
          studentAnswers[questionKey] = best.alternativa;

          // Draw final answer chosen
          if (best.centerX !== undefined && best.centerY !== undefined) {
            ctx.beginPath();
            ctx.arc(best.centerX, best.centerY, best.radius + 2, 0, 2 * Math.PI);
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(best.alternativa, best.centerX - 8, best.centerY - best.radius - 8);
          }

          diagnosticsByQuestion[questionKey] = {
            questionKey: questionKey,
            alternativa: best.alternativa,
            confidence: confidenceLevel,
            markStrength: best.markStrength,
            decisionScore: best.decisionScore,
            effectiveMarkStrength: best.effectiveMarkStrength,
            roiMarkStrength: best.roiMarkStrength,
            legacyBubbleScore: best.legacyBubbleScore,
            centerDarkGain: best.centerDarkGain,
            centerBrightnessDrop: best.centerBrightnessDrop,
            roiBrightnessDrop: best.roiBrightnessDrop,
            roiAdaptiveDarkGain: best.roiAdaptiveDarkGain,
            brightnessDrop: best.brightnessDrop,
            combinedGain: best.combinedGain,
            scoreCenterDarkRatio: best.score.centerDarkRatio,
            localStrengthGain: localStrengthGain,
            localCenterDarkRatioGain: localCenterDarkRatioGain,
            localBrightnessDropGain: localBrightnessDropGain,
            detectionMethod: passesAbsoluteCheck ? 'absolute' : (passesAdaptiveSingleCheck ? 'adaptive' : (passesLocalDominanceCheck ? 'dominance' : 'relative')),
          };
          acceptedAnswerDiagnostics.push({
            questionKey: questionKey,
            confidence: confidenceLevel,
            markStrength: best.markStrength,
            decisionScore: best.decisionScore,
            effectiveMarkStrength: best.effectiveMarkStrength,
            roiMarkStrength: best.roiMarkStrength,
            legacyBubbleScore: best.legacyBubbleScore,
            centerDarkGain: best.centerDarkGain,
            centerBrightnessDrop: best.centerBrightnessDrop,
            roiBrightnessDrop: best.roiBrightnessDrop,
            roiAdaptiveDarkGain: best.roiAdaptiveDarkGain,
            combinedGain: best.combinedGain,
            scoreCenterDarkRatio: best.score.centerDarkRatio,
            localStrengthGain: localStrengthGain,
            localCenterDarkRatioGain: localCenterDarkRatioGain,
            localBrightnessDropGain: localBrightnessDropGain,
            detectionMethod: passesAbsoluteCheck ? 'absolute' : (passesAdaptiveSingleCheck ? 'adaptive' : (passesLocalDominanceCheck ? 'dominance' : 'relative')),
          });
        }
      });

      // Validação pós-processamento mais tolerante para folhas com poucas respostas
      // Não descartar respostas individuais válidas apenas por serem poucas
      if (acceptedAnswerDiagnostics.length > 0 && acceptedAnswerDiagnostics.length <= 3) {
        var averageAcceptedStrength = acceptedAnswerDiagnostics.reduce(function (sum, item) {
          return sum + Math.max(Number(item.markStrength || 0), Number(item.decisionScore || 0), Number(item.effectiveMarkStrength || 0), Number(item.roiMarkStrength || 0), Number(item.legacyBubbleScore || 0));
        }, 0) / acceptedAnswerDiagnostics.length;
        var averageAcceptedCenterGain = acceptedAnswerDiagnostics.reduce(function (sum, item) {
          return sum + Math.max(Number(item.centerDarkGain || 0), Number(item.roiAdaptiveDarkGain || 0));
        }, 0) / acceptedAnswerDiagnostics.length;
        var maxAcceptedBrightnessDrop = acceptedAnswerDiagnostics.reduce(function (maxValue, item) {
          return Math.max(maxValue, Number(item.centerBrightnessDrop || 0), Number(item.roiBrightnessDrop || 0));
        }, 0);
        var maxAcceptedAbsoluteScore = acceptedAnswerDiagnostics.reduce(function (maxValue, item) {
          return Math.max(maxValue, Number(item.scoreCenterDarkRatio || 0));
        }, 0);
        var hasStrongDetection = acceptedAnswerDiagnostics.some(function (item) {
          return item.detectionMethod === 'absolute' || item.detectionMethod === 'adaptive' || item.detectionMethod === 'dominance';
        });

        // Validação pós-processamento mais tolerante: não descartar respostas individuais válidas
        // apenas porque são poucas ou não atingem médias globais altas
        var maxAcceptedLegacyScore = acceptedAnswerDiagnostics.reduce(function (maxValue, item) {
          return Math.max(maxValue, Number(item.legacyBubbleScore || 0), Number(item.roiMarkStrength || 0));
        }, 0);
        var passesRelativePostValidation = averageAcceptedStrength >= 0.035 && averageAcceptedCenterGain >= 0.018 && maxAcceptedBrightnessDrop >= 5;
        var passesAbsolutePostValidation = hasStrongDetection && (maxAcceptedAbsoluteScore >= 0.22 || maxAcceptedLegacyScore >= 0.11);
        if (!passesRelativePostValidation && !passesAbsolutePostValidation) {
          studentAnswers = {};
          acceptedAnswerDiagnostics = [];
          diagnosticsByQuestion = {};
        }
      }

      var confidenceStats = {
        low: 0,
        medium: 0,
        high: 0,
      };
      Object.keys(diagnosticsByQuestion).forEach(function (questionKey) {
        var confidence = String(diagnosticsByQuestion[questionKey] && diagnosticsByQuestion[questionKey].confidence || 'low');
        if (confidence === 'high') {
          confidenceStats.high += 1;
        } else if (confidence === 'medium') {
          confidenceStats.medium += 1;
        } else {
          confidenceStats.low += 1;
        }
      });

      if (Array.isArray(gabaritoBubbleHitboxes)) {
        if (!correcaoLastDiagnostics) {
          correcaoLastDiagnostics = {
            guideRegion: null,
            paperBounds: null,
            markers: null,
            source: 'answers',
            transform: transform || null,
            sourceWidth: originalSourceWidth,
            sourceHeight: originalSourceHeight,
          };
        } else if (!correcaoLastDiagnostics.transform) {
          correcaoLastDiagnostics.transform = transform || null;
          correcaoLastDiagnostics.sourceWidth = originalSourceWidth;
          correcaoLastDiagnostics.sourceHeight = originalSourceHeight;
        }

        var answerMarkers = [];
        var transformForMarkers = correcaoLastDiagnostics.transform || { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, H: null };
        var averageScale = (Number(transformForMarkers.scaleX || 0) + Number(transformForMarkers.scaleY || 0)) / 2;
        if (!Number.isFinite(averageScale) || averageScale <= 0) {
          averageScale = 1;
        }
        Object.keys(diagnosticsByQuestion).forEach(function (questionKey) {
          var answerData = diagnosticsByQuestion[questionKey];
          var alternativa = String(answerData && answerData.alternativa || '').trim().toUpperCase();
          if (alternativa === '') {
            return;
          }
          var bubbleMatch = null;
          for (var bIndex = 0; bIndex < gabaritoBubbleHitboxes.length; bIndex += 1) {
            var bubble = gabaritoBubbleHitboxes[bIndex];
            if (String(bubble && bubble.questao || '') === String(questionKey) && String(bubble && bubble.alternativa || '').trim().toUpperCase() === alternativa) {
              bubbleMatch = bubble;
              break;
            }
          }
          if (!bubbleMatch) {
            return;
          }
          var projected;
          if (transformForMarkers.H) {
            projected = applyPerspectiveHomography(transformForMarkers.H, bubbleMatch.x, bubbleMatch.y);
          } else {
            projected = {
              x: transformForMarkers.offsetX + (bubbleMatch.x * transformForMarkers.scaleX),
              y: transformForMarkers.offsetY + (bubbleMatch.y * transformForMarkers.scaleY),
            };
          }
          if (!projected) {
            return;
          }
          answerMarkers.push({
            x: projected.x,
            y: projected.y,
            r: Math.max(6, Number(bubbleMatch.r || 0) * averageScale * 0.95),
            alternativa: alternativa,
            questao: String(questionKey),
            confidence: String(answerData && answerData.confidence || 'low'),
          });
        });
        correcaoLastDiagnostics.answerMarkers = answerMarkers;
        renderCorrecaoDiagnosticsOverlay(correcaoLastDiagnostics, captureCanvas.width, captureCanvas.height);
      }

      var res = {
        answers: studentAnswers,
        diagnosticsByQuestion: diagnosticsByQuestion,
        acceptedAnswerDiagnostics: acceptedAnswerDiagnostics,
        confidenceStats: confidenceStats,
      };

      if (correcaoVideo instanceof HTMLVideoElement && correcaoVideo.paused) {
        try {
          correcaoVideo.style.backgroundImage = 'url(' + captureCanvas.toDataURL('image/jpeg', 0.92) + ')';
          correcaoVideo.style.backgroundSize = 'contain';
          correcaoVideo.style.backgroundPosition = 'center';
          correcaoVideo.style.backgroundColor = '#000';

          if (correcaoLastDiagnostics) {
            correcaoLastDiagnostics.markers = null;
            correcaoLastDiagnostics.paperBounds = null;
            renderCorrecaoDiagnosticsOverlay(correcaoLastDiagnostics, captureCanvas.width, captureCanvas.height);
          }
        } catch (e) { }
      }

      return res;
    }

    function validateCorrecaoFrameForReading(captureCanvas) {
      if (!(captureCanvas instanceof HTMLCanvasElement)) {
        throw new Error('A imagem da câmera ainda não está pronta.');
      }

      var exposureStats = getCorrecaoFrameExposureStats(captureCanvas);
      if (isCorrecaoFrameObstructed(exposureStats)) {
        throw buildCorrecaoFlowError('correcao-camera-obstruida', 'Imagem muito escura. Afaste a mão da câmera e enquadre somente o gabarito.');
      }

      if (captureCanvas._userTransform) {
        return Promise.resolve(captureCanvas);
      }

      var currentSignature = buildCorrecaoFrameSignature(captureCanvas);
      var frameDifference = measureCorrecaoFrameDifference(correcaoQrReferenceSignature, currentSignature);
      if (correcaoQrReferenceSignature instanceof Uint8Array && frameDifference < 0.12) {
        throw new Error('QR identificado. Mova a câmera para o gabarito antes de iniciar a leitura.');
      }

      return frameHasVisibleQrCode(captureCanvas).then(function (hasQrCode) {
        if (hasQrCode) {
          throw new Error('QR identificado. Agora mova a câmera para exibir somente o gabarito.');
        }

        validateCorrecaoMarkerTransform(buildCorrecaoMarkerTransform(captureCanvas));
        return captureCanvas;
      });
    }

    function buildCorrecaoCorrections(studentAnswers, discursiveScores, objectiveDiagnostics) {
      var correctAnswers = buildCorrecaoExpectedAnswersMap();
      var hasObjectiveQuestions = gabaritoQuestoesItens.some(function (item) {
        return isQuestaoObjetiva(item && item.tipo);
      });
      if (hasObjectiveQuestions && !Object.keys(correctAnswers).length) {
        throw new Error('Configure as respostas corretas do gabarito antes de iniciar a correção.');
      }

      var corrections = [];
      var score = 0;
      var earnedPoints = 0;
      var totalPoints = 0;
      gabaritoQuestoesItens.forEach(function (item, index) {
        var questionNumber = index + 1;
        var questionKey = String(questionNumber);
        var questionItem = item || createDefaultQuestaoItem(getConfiguredAlternativasCount());
        var tipo = normalizeQuestaoTipo(questionItem.tipo);
        var peso = sanitizeQuestaoPeso(questionItem.peso, 1);

        totalPoints += peso;

        if (tipo === 'discursiva') {
          var discursiveScore = discursiveScores && Object.prototype.hasOwnProperty.call(discursiveScores, questionKey)
            ? clampFloat(discursiveScores[questionKey], 0, peso, 0)
            : 0;
          earnedPoints += discursiveScore;
          corrections.push({
            questionNumber: questionNumber,
            questionType: tipo,
            peso: peso,
            studentAnswer: null,
            correctAnswer: null,
            isCorrect: discursiveScore >= peso,
            pontuacao: Math.round(discursiveScore * 100) / 100,
            pontuacao_maxima: peso,
          });
          return;
        }

        var correctAnswer = String(correctAnswers[questionKey] || '').trim().toUpperCase();
        var studentAnswer = studentAnswers && studentAnswers[questionKey]
          ? String(studentAnswers[questionKey] || '').trim().toUpperCase()
          : null;
        var questionDiagnostic = objectiveDiagnostics && objectiveDiagnostics[questionKey]
          ? objectiveDiagnostics[questionKey]
          : null;
        var isCorrect = studentAnswer !== null && (questionItem.anulada === true || studentAnswer === correctAnswer);
        if (isCorrect) {
          score += 1;
          earnedPoints += peso;
        }

        corrections.push({
          questionNumber: questionNumber,
          questionType: tipo,
          peso: peso,
          studentAnswer: studentAnswer,
          correctAnswer: correctAnswer,
          isCorrect: isCorrect,
          pontuacao: isCorrect ? peso : 0,
          pontuacao_maxima: peso,
          answerConfidence: studentAnswer === null ? 'blank' : String(questionDiagnostic && questionDiagnostic.confidence || 'medium'),
          readStrength: questionDiagnostic ? Number(questionDiagnostic.markStrength || 0) : null,
        });
      });

      return {
        score: score,
        total: corrections.length,
        earnedPoints: earnedPoints,
        totalPoints: totalPoints,
        corrections: corrections,
      };
    }

    function saveCorrecaoResult(resultPayload) {
      var csrfInput = form ? form.querySelector('input[name="csrf_token"]') : null;
      var csrfToken = csrfInput ? String(csrfInput.value || '').trim() : '';
      var body = new URLSearchParams();
      body.set('csrf_token', csrfToken);
      body.set('avaliacao_id', String(resultPayload.avaliacao_id || '0'));
      body.set('aluno_id', String(resultPayload.aluno_id || '0'));
      body.set('turma_id', String(resultPayload.turma_id || '0'));
      body.set('numeracao', String(resultPayload.numeracao || ''));
      body.set('qr_payload', String(resultPayload.qr_payload || ''));
      body.set('respostas_json', JSON.stringify(resultPayload.respostas || {}));
      body.set('correcoes_json', JSON.stringify(resultPayload.correcoes || []));
      body.set('status', String(normalizeCorrecaoStatus(resultPayload.status) || 'corrigida'));
      body.set('acertos', String(resultPayload.acertos || 0));
      body.set('total_questoes', String(resultPayload.total_questoes || 0));
      body.set('pontuacao', String(resultPayload.pontuacao || 0));
      body.set('pontuacao_total', String(resultPayload.pontuacao_total || 0));
      body.set('percentual', String(resultPayload.percentual || 0));

      return fetch(getCorrecaoSaveUrl(), {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: body.toString(),
      }).then(function (response) {
        return response.json().catch(function () {
          return { ok: false, message: 'Resposta inválida do servidor.' };
        }).then(function (payload) {
          if (!response.ok || !payload || payload.ok !== true) {
            throw new Error(payload && payload.message ? payload.message : 'Não foi possível salvar a correção.');
          }

          return payload;
        });
      });
    }

    function updateCorrecaoResult(correcaoId, resultPayload) {
      var safeId = Number(correcaoId || 0);
      if (safeId <= 0) {
        return Promise.reject(new Error('Correção inválida.'));
      }

      var csrfInput = form ? form.querySelector('input[name="csrf_token"]') : null;
      var csrfToken = csrfInput ? String(csrfInput.value || '').trim() : '';
      var body = new URLSearchParams();
      body.set('csrf_token', csrfToken);
      body.set('id', String(safeId));
      body.set('respostas_json', JSON.stringify(resultPayload.respostas || {}));
      body.set('correcoes_json', JSON.stringify(resultPayload.correcoes || []));
      body.set('status', String(normalizeCorrecaoStatus(resultPayload.status) || 'corrigida'));
      body.set('acertos', String(resultPayload.acertos || 0));
      body.set('total_questoes', String(resultPayload.total_questoes || 0));
      body.set('pontuacao', String(resultPayload.pontuacao || 0));
      body.set('pontuacao_total', String(resultPayload.pontuacao_total || 0));
      body.set('percentual', String(resultPayload.percentual || 0));
      body.set('numeracao', String(resultPayload.numeracao || ''));
      body.set('qr_payload', String(resultPayload.qr_payload || ''));

      return fetch(getCorrecaoUpdateUrl(), {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: body.toString(),
      }).then(function (response) {
        return response.json().catch(function () {
          return { ok: false, message: 'Resposta inválida do servidor.' };
        }).then(function (payload) {
          if (!response.ok || !payload || payload.ok !== true) {
            throw new Error(payload && payload.message ? payload.message : 'Não foi possível atualizar a correção.');
          }

          return payload;
        });
      });
    }

    function resetCorrecaoEdicaoModalState() {
      correcaoEdicaoCurrentRowId = 0;
      correcaoEdicaoCurrentRowData = null;
      if (correcaoEdicaoList) {
        correcaoEdicaoList.innerHTML = '';
      }
      if (correcaoEdicaoSummary) {
        correcaoEdicaoSummary.textContent = 'Revise as respostas e notas antes de salvar as alterações.';
      }
      if (correcaoEdicaoError) {
        correcaoEdicaoError.textContent = '';
        correcaoEdicaoError.classList.add('d-none');
      }
      if (correcaoEdicaoSaveBtn) {
        correcaoEdicaoSaveBtn.removeAttribute('disabled');
      }
      if (correcaoEdicaoBlankBtn) {
        correcaoEdicaoBlankBtn.removeAttribute('disabled');
        correcaoEdicaoBlankBtn.classList.add('d-none');
      }
      if (correcaoEdicaoAbsentBtn) {
        correcaoEdicaoAbsentBtn.removeAttribute('disabled');
        correcaoEdicaoAbsentBtn.classList.add('d-none');
      }
    }

    function setCorrecaoEdicaoQuickActionsVisible(visible) {
      var shouldShow = visible === true;
      if (correcaoEdicaoBlankBtn) {
        correcaoEdicaoBlankBtn.classList.toggle('d-none', !shouldShow);
      }
      if (correcaoEdicaoAbsentBtn) {
        correcaoEdicaoAbsentBtn.classList.toggle('d-none', !shouldShow);
      }
    }

    function setCorrecaoEdicaoActionButtonsDisabled(disabled) {
      var shouldDisable = disabled === true;
      [correcaoEdicaoSaveBtn, correcaoEdicaoBlankBtn, correcaoEdicaoAbsentBtn].forEach(function (button) {
        if (!(button instanceof HTMLElement)) {
          return;
        }
        if (shouldDisable) {
          button.setAttribute('disabled', 'disabled');
        } else {
          button.removeAttribute('disabled');
        }
      });
    }

    function submitCorrecaoEdicaoQuickStatus(status) {
      var row = correcaoEdicaoCurrentRowData && typeof correcaoEdicaoCurrentRowData === 'object'
        ? correcaoEdicaoCurrentRowData
        : null;

      if (!row) {
        if (correcaoEdicaoError) {
          correcaoEdicaoError.textContent = 'Correção não carregada.';
          correcaoEdicaoError.classList.remove('d-none');
        }
        return Promise.resolve(false);
      }

      var normalizedStatus = normalizeCorrecaoStatus(status);
      var resultPayload;

      if (correcaoEdicaoError) {
        correcaoEdicaoError.textContent = '';
        correcaoEdicaoError.classList.add('d-none');
      }

      setCorrecaoEdicaoActionButtonsDisabled(true);

      if (normalizedStatus === 'ausente') {
        resultPayload = {
          avaliacao_id: Number(row.avaliacao_id || row.avaliacaoId || activeDashboardAvaliacaoId || 0),
          aluno_id: Number(row.aluno_id || row.alunoId || 0),
          turma_id: Number(row.turma_id || row.turmaId || 0),
          numeracao: String(row.numeracao || ''),
          qr_payload: String(row.qr_payload || row.qrPayload || ''),
          respostas: {},
          correcoes: [],
          status: 'ausente',
          acertos: 0,
          total_questoes: 0,
          pontuacao: '0.00',
          pontuacao_total: '0.00',
          percentual: '0.00',
        };
      } else {
        var comparison = buildCorrecaoCorrections({}, {}, {});
        resultPayload = {
          avaliacao_id: Number(row.avaliacao_id || row.avaliacaoId || activeDashboardAvaliacaoId || 0),
          aluno_id: Number(row.aluno_id || row.alunoId || 0),
          turma_id: Number(row.turma_id || row.turmaId || 0),
          numeracao: String(row.numeracao || ''),
          qr_payload: String(row.qr_payload || row.qrPayload || ''),
          respostas: {},
          correcoes: comparison.corrections,
          status: 'corrigida',
          acertos: comparison.score,
          total_questoes: comparison.total,
          pontuacao: comparison.earnedPoints.toFixed(2),
          pontuacao_total: comparison.totalPoints.toFixed(2),
          percentual: comparison.totalPoints > 0 ? ((comparison.earnedPoints / comparison.totalPoints) * 100).toFixed(2) : '0.00',
        };
      }

      var request = Number(correcaoEdicaoCurrentRowId || 0) > 0
        ? updateCorrecaoResult(correcaoEdicaoCurrentRowId, resultPayload)
        : saveCorrecaoResult(resultPayload);

      return request.then(function (payload) {
        renderCorrecoesTable(payload.rows || [], payload.stats || getCorrecoesSummaryStats(payload.rows || []));
        closeCorrecaoEdicaoModal();
        showGlobalStatus(normalizedStatus === 'ausente' ? 'Estudante marcado como ausente com sucesso.' : 'Correção lançada como em branco com sucesso.', false);
        return true;
      }).catch(function (error) {
        if (correcaoEdicaoError) {
          correcaoEdicaoError.textContent = error && error.message ? error.message : 'Não foi possível salvar a correção.';
          correcaoEdicaoError.classList.remove('d-none');
        }
        return false;
      }).finally(function () {
        setCorrecaoEdicaoActionButtonsDisabled(false);
      });
    }

    function closeCorrecaoEdicaoModal() {
      if (correcaoEdicaoModalElement instanceof HTMLElement) {
        blurActiveElementIfInside(correcaoEdicaoModalElement);
      }

      if (!correcaoEdicaoModalInstance) {
        resetCorrecaoEdicaoModalState();
        return;
      }

      correcaoEdicaoModalInstance.hide();
    }

    function submitCorrecaoEdicaoModal() {
      var row = correcaoEdicaoCurrentRowData && typeof correcaoEdicaoCurrentRowData === 'object'
        ? correcaoEdicaoCurrentRowData
        : null;

      if (!row) {
        if (correcaoEdicaoError) {
          correcaoEdicaoError.textContent = 'Correção não carregada.';
          correcaoEdicaoError.classList.remove('d-none');
        }
        return Promise.resolve(false);
      }

      setCorrecaoEdicaoActionButtonsDisabled(true);

      if (correcaoEdicaoError) {
        correcaoEdicaoError.textContent = '';
        correcaoEdicaoError.classList.add('d-none');
      }

      var respostas;
      try {
        respostas = collectCorrecaoEdicaoPayload();
      } catch (error) {
        if (correcaoEdicaoError) {
          correcaoEdicaoError.textContent = error && error.message ? error.message : 'Não foi possível validar as respostas informadas.';
          correcaoEdicaoError.classList.remove('d-none');
        }
        setCorrecaoEdicaoActionButtonsDisabled(false);
        return Promise.resolve(false);
      }

      var comparison = buildCorrecaoCorrections(respostas, {}, {});
      var resultPayload = {
        avaliacao_id: Number(row.avaliacao_id || row.avaliacaoId || activeDashboardAvaliacaoId || 0),
        aluno_id: Number(row.aluno_id || row.alunoId || 0),
        turma_id: Number(row.turma_id || row.turmaId || 0),
        numeracao: String(row.numeracao || ''),
        qr_payload: String(row.qr_payload || row.qrPayload || ''),
        respostas: respostas,
        correcoes: comparison.corrections,
        status: normalizeCorrecaoStatus(row.status),
        acertos: comparison.score,
        total_questoes: comparison.total,
        pontuacao: comparison.earnedPoints.toFixed(2),
        pontuacao_total: comparison.totalPoints.toFixed(2),
        percentual: comparison.totalPoints > 0 ? ((comparison.earnedPoints / comparison.totalPoints) * 100).toFixed(2) : '0.00',
      };

      var request = Number(correcaoEdicaoCurrentRowId || 0) > 0
        ? updateCorrecaoResult(correcaoEdicaoCurrentRowId, resultPayload)
        : saveCorrecaoResult(resultPayload);

      return request.then(function (payload) {
        renderCorrecoesTable(payload.rows || [], payload.stats || getCorrecoesSummaryStats(payload.rows || []));
        closeCorrecaoEdicaoModal();
        showGlobalStatus(Number(correcaoEdicaoCurrentRowId || 0) > 0 ? 'Correção atualizada com sucesso.' : 'Correção lançada com sucesso.', false);
        return true;
      }).catch(function (error) {
        if (correcaoEdicaoError) {
          correcaoEdicaoError.textContent = error && error.message ? error.message : 'Não foi possível salvar a correção.';
          correcaoEdicaoError.classList.remove('d-none');
        }
        return false;
      }).finally(function () {
        setCorrecaoEdicaoActionButtonsDisabled(false);
      });
    }

    function openCorrecaoEdicaoModal(correcaoRow) {
      if (!correcaoEdicaoModalInstance || !correcaoEdicaoList) {
        return;
      }

      var row = correcaoRow && typeof correcaoRow === 'object' ? correcaoRow : null;
      if (!row) {
        return;
      }

      resetCorrecaoEdicaoModalState();
      correcaoEdicaoCurrentRowId = Number(row.id || 0);
      correcaoEdicaoCurrentRowData = row;
      setCorrecaoEdicaoQuickActionsVisible(Number(row.id || 0) <= 0);

      if (correcaoEdicaoSummary) {
        correcaoEdicaoSummary.textContent = String(row.aluno_nome || 'Estudante') + ' | ' + String(row.turma_nome || 'Turma') + ' | numeração ' + String(row.numeracao || '-');
      }

      if (!Array.isArray(gabaritoQuestoesItens) || gabaritoQuestoesItens.length === 0) {
        var emptyState = document.createElement('div');
        emptyState.className = 'small text-secondary';
        emptyState.textContent = 'Nenhuma questão configurada para esta avaliação.';
        correcaoEdicaoList.appendChild(emptyState);
        correcaoEdicaoModalInstance.show();
        return;
      }

      var rowsPerColumn = getResponsiveGabaritoRowsPerColumn();
      var columnCount = Math.max(1, Math.ceil(gabaritoQuestoesItens.length / rowsPerColumn));
      var layoutWrap = document.createElement('div');
      layoutWrap.className = 'admin-gabarito-respostas-layout admin-avaliacao-correcao-edicao-layout';
      var correctionByQuestion = {};

      if (Array.isArray(row.correcoes)) {
        row.correcoes.forEach(function (correctionItem) {
          var questionNumber = clampInt(correctionItem && correctionItem.questionNumber, 1, 9999, 0);
          if (questionNumber > 0) {
            correctionByQuestion[String(questionNumber)] = correctionItem;
          }
        });
      }

      var columnElements = [];
      for (var columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        var columnElement = document.createElement('div');
        columnElement.className = 'admin-gabarito-respostas-coluna';
        layoutWrap.appendChild(columnElement);
        columnElements.push(columnElement);
      }

      gabaritoQuestoesItens.forEach(function (item, index) {
        var safeItem = sanitizeQuestaoItem(item);
        var questionNumber = index + 1;
        var questionKey = String(questionNumber);
        var tipo = normalizeQuestaoTipo(safeItem.tipo);
        var peso = sanitizeQuestaoPeso(safeItem.peso, 1);
        var currentColumnIndex = Math.floor(index / rowsPerColumn);
        var parentColumn = columnElements[currentColumnIndex] || columnElements[0];
        if (!parentColumn) {
          return;
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'admin-avaliacao-correcao-edicao-item';
        wrapper.setAttribute('data-question-number', questionKey);

        var numberLabel = document.createElement('span');
        numberLabel.className = 'admin-gabarito-resposta-numero';
        numberLabel.textContent = String(questionNumber).padStart(2, '0') + '.';
        wrapper.appendChild(numberLabel);

        var main = document.createElement('div');
        main.className = 'admin-avaliacao-correcao-edicao-item-main';

        var top = document.createElement('div');
        top.className = 'admin-avaliacao-correcao-edicao-item-top';

        var typeBadge = document.createElement('span');
        typeBadge.className = 'admin-avaliacao-correcao-edicao-item-type';
        typeBadge.textContent = getQuestaoTipoLabel(tipo);
        top.appendChild(typeBadge);

        main.appendChild(top);

        var answerWrap = document.createElement('div');
        answerWrap.className = 'admin-avaliacao-correcao-edicao-item-answer';

        if (tipo === 'discursiva') {
          var discInput = document.createElement('input');
          var savedDiscursiveCorrection = correctionByQuestion[questionKey] && typeof correctionByQuestion[questionKey] === 'object'
            ? correctionByQuestion[questionKey]
            : null;
          var savedDiscursiveScore = savedDiscursiveCorrection && savedDiscursiveCorrection.pontuacao !== undefined
            ? savedDiscursiveCorrection.pontuacao
            : (row.respostas && row.respostas[questionKey] !== undefined ? row.respostas[questionKey] : 0);
          discInput.type = 'text';
          discInput.className = 'form-control form-control-sm js-admin-correcao-edit-discursiva-input';
          discInput.value = normalizeCorrecaoDiscursivaScoreInputValue(savedDiscursiveScore, peso);
          discInput.placeholder = '0,0';
          discInput.setAttribute('inputmode', 'decimal');
          discInput.setAttribute('data-question-number', questionKey);
          discInput.setAttribute('data-max-score', String(peso));
          discInput.addEventListener('input', function () {
            discInput.value = normalizeCorrecaoDiscursivaScoreInputValue(discInput.value, peso);
          });
          answerWrap.appendChild(discInput);
        } else {
          var selectedResposta = String(row.respostas && row.respostas[questionKey] || '').trim().toUpperCase();
          var respostaCorreta = String(safeItem.correta || '').trim().toUpperCase();

          var blankLabel = document.createElement('label');
          blankLabel.className = 'admin-avaliacao-correcao-edicao-blank';

          var blankInput = document.createElement('input');
          blankInput.type = 'radio';
          blankInput.className = 'form-check-input js-admin-correcao-edit-objetiva-input';
          blankInput.name = 'adminCorrecaoEdicaoResposta_' + questionKey;
          blankInput.value = '';
          blankInput.checked = selectedResposta === '';
          blankInput.setAttribute('data-question-number', questionKey);
          blankLabel.appendChild(blankInput);

          var blankPill = document.createElement('span');
          blankPill.className = 'admin-avaliacao-correcao-edicao-blank-pill';
          blankPill.textContent = 'Em branco';
          blankLabel.appendChild(blankPill);
          answerWrap.appendChild(blankLabel);

          getQuestaoAlternativaLabels(safeItem, gabaritoAlternativasConfiguradas).forEach(function (letter) {
            var optionLabel = document.createElement('label');
            optionLabel.className = 'admin-gabarito-resposta-bolha';
            if (respostaCorreta !== '' && respostaCorreta === letter) {
              optionLabel.classList.add('admin-avaliacao-correcao-edicao-correct');
            }
            if (
              selectedResposta !== ''
              && selectedResposta !== respostaCorreta
              && selectedResposta === letter
            ) {
              optionLabel.classList.add('admin-avaliacao-correcao-edicao-incorrect');
            }

            var optionInput = document.createElement('input');
            optionInput.type = 'radio';
            optionInput.className = 'form-check-input js-admin-correcao-edit-objetiva-input';
            optionInput.name = 'adminCorrecaoEdicaoResposta_' + questionKey;
            optionInput.value = letter;
            optionInput.checked = selectedResposta === letter;
            optionInput.setAttribute('data-question-number', questionKey);
            optionLabel.appendChild(optionInput);

            var optionBubble = document.createElement('span');
            optionBubble.className = 'admin-gabarito-resposta-circulo';
            optionBubble.textContent = letter;
            optionLabel.appendChild(optionBubble);

            answerWrap.appendChild(optionLabel);
          });
        }

        main.appendChild(answerWrap);
        wrapper.appendChild(main);
        parentColumn.appendChild(wrapper);
      });

      correcaoEdicaoList.appendChild(layoutWrap);

      correcaoEdicaoModalInstance.show();
    }

    function collectCorrecaoEdicaoPayload() {
      if (!correcaoEdicaoList) {
        throw new Error('Modal de edição indisponível.');
      }

      var respostas = {};
      correcaoEdicaoList.querySelectorAll('.admin-avaliacao-correcao-edicao-item[data-question-number]').forEach(function (itemElement) {
        if (!(itemElement instanceof HTMLElement)) {
          return;
        }

        var questionNumber = clampInt(itemElement.getAttribute('data-question-number'), 1, 9999, 0);
        if (questionNumber <= 0) {
          return;
        }

        var checkedInput = itemElement.querySelector('.js-admin-correcao-edit-objetiva-input:checked');
        var value = checkedInput instanceof HTMLInputElement
          ? String(checkedInput.value || '').trim().toUpperCase()
          : '';
        respostas[String(questionNumber)] = value === '' ? null : value;
      });

      correcaoEdicaoList.querySelectorAll('.js-admin-correcao-edit-discursiva-input').forEach(function (input) {
        if (!(input instanceof HTMLInputElement)) {
          return;
        }

        var questionNumber = clampInt(input.getAttribute('data-question-number'), 1, 9999, 0);
        var peso = sanitizeQuestaoPeso(input.getAttribute('data-max-score'), 1);
        if (questionNumber <= 0) {
          return;
        }

        var rawValue = String(input.value || '').trim().replace(',', '.');
        if (rawValue === '') {
          throw new Error('Informe a nota da questão ' + questionNumber + '.');
        }
        if (!/^(?:\d+|\d*\.\d{1,2})$/.test(rawValue)) {
          throw new Error('A nota da questão ' + questionNumber + ' deve usar no máximo 2 casas decimais.');
        }

        var parsedValue = Number.parseFloat(rawValue);
        if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > peso) {
          throw new Error('A nota da questão ' + questionNumber + ' deve ficar entre 0 e ' + formatCorrecaoScoreValue(peso) + '.');
        }

        respostas[String(questionNumber)] = Math.round(parsedValue * 100) / 100;
      });

      return respostas;
    }

    function resumeCorrecaoForNextSheet() {
      renderCorrecaoProcessingOverlay('hidden');
      setCorrecaoScannerStep('success', 'Correção concluída. Use o botão abaixo para ir ao próximo QR Code.');
    }

    function resumeCorrecaoForNextSheetWithSummary(summary) {
      renderCorrecaoProcessingOverlay('success', { summary: summary });
      setCorrecaoScannerStep('success', 'Correção concluída. Use o botão abaixo para ir ao próximo QR Code.');
    }

    function saveCorrecaoStatusForCurrentTarget(status) {
      if (!correcaoCurrentTarget || correcaoBusy) {
        return Promise.resolve(false);
      }

      var normalizedStatus = normalizeCorrecaoStatus(status);
      var numeracaoText = getCurrentGabaritoNumeracaoLabel();
      var numeracaoValue = correcaoCurrentTarget.numeracao || numeracaoText;
      if (!numeracaoValue || numeracaoValue === 'Numeracao por estudante/turma') {
        numeracaoValue = String(correcaoCurrentTarget.numeracaoLabel || '').replace(/^Nº\s*/i, '').trim();
      }

      var resultPayload;
      if (normalizedStatus === 'gabarito_zerado') {
        var comparison = buildCorrecaoCorrections({}, {}, {});
        resultPayload = {
          avaliacao_id: correcaoCurrentTarget.avaliacaoId,
          aluno_id: correcaoCurrentTarget.alunoId,
          turma_id: correcaoCurrentTarget.turmaId,
          numeracao: numeracaoValue,
          qr_payload: correcaoCurrentTarget.qrPayload,
          respostas: {},
          correcoes: comparison.corrections,
          acertos: comparison.score,
          total_questoes: comparison.total,
          pontuacao: comparison.earnedPoints.toFixed(2),
          pontuacao_total: comparison.totalPoints.toFixed(2),
          percentual: comparison.totalPoints > 0 ? ((comparison.earnedPoints / comparison.totalPoints) * 100).toFixed(2) : '0.00',
          status: normalizedStatus,
        };
      } else {
        resultPayload = {
          avaliacao_id: correcaoCurrentTarget.avaliacaoId,
          aluno_id: correcaoCurrentTarget.alunoId,
          turma_id: correcaoCurrentTarget.turmaId,
          numeracao: numeracaoValue,
          qr_payload: correcaoCurrentTarget.qrPayload,
          respostas: {},
          correcoes: [],
          acertos: 0,
          total_questoes: 0,
          pontuacao: '0.00',
          pontuacao_total: '0.00',
          percentual: '0.00',
          status: normalizedStatus,
        };
      }

      correcaoBusy = true;
      setCorrecaoScannerStep('saving', normalizedStatus === 'ausente' ? 'Registrando estudante ausente...' : 'Registrando gabarito zerado...');

      return saveCorrecaoResult(resultPayload).then(function (payload) {
        renderCorrecoesTable(payload.rows || [], payload.stats || getCorrecoesSummaryStats(payload.rows || []));

        var match = null;
        if (Array.isArray(payload.rows)) {
          for (var rowIndex = 0; rowIndex < payload.rows.length; rowIndex += 1) {
            var row = payload.rows[rowIndex];
            if (row && Number(row.aluno_id || 0) === Number(correcaoCurrentTarget.alunoId || 0)
              && Number(row.turma_id || 0) === Number(correcaoCurrentTarget.turmaId || 0)
              && Number(row.avaliacao_id || 0) === Number(correcaoCurrentTarget.avaliacaoId || 0)) {
              match = row;
              break;
            }
          }
        }

        if (match) {
          correcaoCurrentTarget.existingCorrection = match;
        }

        correcaoLastSuccessPayload = String(correcaoCurrentTarget.qrPayload || '');
        correcaoLastSuccessAt = Date.now();
        resumeCorrecaoForNextSheet();
        return true;
      }).catch(function (error) {
        setCorrecaoScannerStep('confirm-target', error && error.message ? error.message : 'Não foi possível registrar este status.');
        return false;
      }).finally(function () {
        correcaoBusy = false;
      });
    }

    function findCorrecaoRowForCurrentTarget() {
      if (!correcaoCurrentTarget) {
        return null;
      }

      var existing = correcaoCurrentTarget.existingCorrection;
      if (existing && Number(existing.id || 0) > 0) {
        return existing;
      }

      var alunoId = Number(correcaoCurrentTarget.alunoId || 0);
      var turmaId = Number(correcaoCurrentTarget.turmaId || 0);
      var avaliacaoId = Number(correcaoCurrentTarget.avaliacaoId || activeDashboardAvaliacaoId || 0);
      if (alunoId <= 0 || turmaId <= 0 || avaliacaoId <= 0) {
        return null;
      }

      for (var index = 0; index < correcoesRows.length; index += 1) {
        var row = correcoesRows[index];
        if (!row) {
          continue;
        }
        if (Number(row.aluno_id || 0) === alunoId && Number(row.turma_id || 0) === turmaId && Number(row.avaliacao_id || 0) === avaliacaoId) {
          return row;
        }
      }

      return null;
    }

    function retryCorrecaoForCurrentTarget() {
      if (!correcaoCurrentTarget || correcaoBusy) {
        return;
      }

      if (correcaoRetryBtn) {
        correcaoRetryBtn.setAttribute('disabled', 'disabled');
      }
      correcaoBusy = true;
      setCorrecaoScannerStep('saving', 'Excluindo a correção atual para permitir nova leitura...');

      var rowPromise = Promise.resolve(findCorrecaoRowForCurrentTarget());
      rowPromise = rowPromise.then(function (row) {
        if (row && Number(row.id || 0) > 0) {
          return row;
        }
        return loadCorrecoesList(true).then(function () {
          return findCorrecaoRowForCurrentTarget();
        });
      });

      rowPromise.then(function (row) {
        if (!row || Number(row.id || 0) <= 0) {
          throw new Error('Não foi possível localizar a correção atual para excluir.');
        }

        return deleteCorrecaoById(row.id);
      }).then(function (payload) {
        renderCorrecoesTable(payload.rows || [], payload.stats || getCorrecoesSummaryStats(payload.rows || []));
        correcaoCurrentTarget.existingCorrection = null;
        resumeVideoAfterProcess();
        proceedCorrecaoToGabarito();
      }).catch(function (error) {
        setCorrecaoScannerStep('success', error && error.message ? error.message : 'Não foi possível excluir a correção atual.');
      }).finally(function () {
        correcaoBusy = false;
        if (correcaoRetryBtn) {
          correcaoRetryBtn.removeAttribute('disabled');
        }
      });
    }

    function handleCorrecaoQrPayload(rawPayload) {
      var parsed = parseCorrecaoQrPayload(rawPayload);
      if (!parsed) {
        return Promise.resolve();
      }

      if (
        correcaoLastSuccessPayload !== ''
        && correcaoLastSuccessPayload === parsed.raw
        && (Date.now() - correcaoLastSuccessAt) < 6000
      ) {
        setCorrecaoScannerStep('scan-qr', 'Frontend: a mesma folha acabou de ser corrigida nesta câmera. Retire-a da frente da lente e aproxime a próxima.');
        return Promise.resolve();
      }

      if (parsed.avaliacaoId !== Number(activeDashboardAvaliacaoId || 0)) {
        setCorrecaoScannerStep('scan-qr', 'QR Code de outra avaliação. Leia uma folha desta avaliação.');
        return Promise.resolve();
      }

      var aluno = getAllowedCorrecaoAluno(parsed.alunoId, parsed.turmaId);
      if (!aluno) {
        setCorrecaoScannerStep('scan-qr', 'Estudante ou turma não relacionados a esta avaliação.');
        return Promise.resolve();
      }

      var printRecord = getCorrecaoPrintRecord(parsed.alunoId, parsed.turmaId);

      var targetPayload = {
        avaliacaoId: parsed.avaliacaoId,
        alunoId: parsed.alunoId,
        turmaId: parsed.turmaId,
        alunoNome: aluno.nome,
        turmaNome: aluno.turmaNome,
        numeracao: printRecord ? printRecord.numeracao : '',
        numeracaoLabel: printRecord ? printRecord.numeracaoLabel : 'Aguardando leitura do gabarito',
        qrPayload: parsed.raw,
      };

      return verifyExistingCorrecao(parsed.avaliacaoId, parsed.alunoId, parsed.turmaId).then(function (payload) {
        correcaoCurrentTarget = targetPayload;
        if (payload && payload.exists) {
          correcaoCurrentTarget.existingCorrection = payload.row || null;
          renderCorrecaoTarget();
          stopCorrecaoScanLoop();
          setCorrecaoScannerStep('scan-qr', 'Esta folha já possui correção salva. Exclua a correção existente para corrigir novamente.');
          return;
        }

        renderCorrecaoTarget();
        stopCorrecaoScanLoop();
        setCorrecaoScannerStep('confirm-target', 'QR identificado. Confira o estudante e a turma antes de continuar.');
      }).catch(function (error) {
        setCorrecaoScannerStep('scan-qr', error && error.message ? error.message : 'Não foi possível verificar esta folha agora.');
      });
    }

    function runCorrecaoQrLoop() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.runCorrecaoQrLoop === 'function') {
        cameraModule.runCorrecaoQrLoop();
      }
    }

    function runCorrecaoGabaritoLoop() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.runCorrecaoGabaritoLoop === 'function') {
        cameraModule.runCorrecaoGabaritoLoop();
      }
    }

    var correcaoFrozenCanvas = null;

    function processGabaritoManually() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.processGabaritoManually === 'function') {
        cameraModule.processGabaritoManually();
      }
    }


    function processarImagemCongelada() {
      if (!correcaoFrozenCanvas || !correcaoCurrentTarget) {
        setCorrecaoScannerStep('scan-gabarito', 'Erro: imagem não disponível. Tente novamente.');
        correcaoBusy = false;
        resumeVideoAfterProcess();
        return;
      }

      try {
        var transform = buildCorrecaoMarkerTransform(correcaoFrozenCanvas);
        if (!transform) {
          throw new Error('Não foi possível localizar os 4 marcadores do gabarito. Posicione melhor e tente novamente.');
        }

        renderCorrecaoDiagnosticsOverlay(correcaoLastDiagnostics, correcaoFrozenCanvas.width, correcaoFrozenCanvas.height);

        setCorrecaoScannerStep('processing', 'Marcadores identificados. Lendo respostas...');
        setTimeout(function () {
          correcaoBusy = false;
          correcaoScannerStep = 'scan-gabarito';
          captureAndCorrectCurrentSheet(false, correcaoFrozenCanvas);
        }, 60);

      } catch (markerError) {
        correcaoBusy = false;
        renderCorrecaoDiagnosticsOverlay(correcaoLastDiagnostics, correcaoFrozenCanvas.width, correcaoFrozenCanvas.height);
        setCorrecaoScannerStep('scan-gabarito', markerError.message || 'Falha ao processar. Tente novamente.');
        resumeVideoAfterProcess();
      }
    }

    function resumeVideoAfterProcess() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.resumeVideoAfterProcess === 'function') {
        cameraModule.resumeVideoAfterProcess();
      }
    }

    function runCorrecaoGabaritoLoopLegacy() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.runCorrecaoGabaritoLoopLegacy === 'function') {
        cameraModule.runCorrecaoGabaritoLoopLegacy();
      }
    }

    function beginCorrecaoFlow() {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.beginCorrecaoFlow === 'function') {
        cameraModule.beginCorrecaoFlow();
      }
    }

    function captureAndCorrectCurrentSheet(autoMode, providedCanvas) {
      var cameraModule = getCorrecaoCameraModule();
      if (cameraModule && typeof cameraModule.captureAndCorrectCurrentSheet === 'function') {
        cameraModule.captureAndCorrectCurrentSheet(autoMode, providedCanvas);
      }
    }

    function getGabaritoTitleBoxSize(ctx, availablePageWidth, titleText) {
      var textInsetX = 8;
      var horizontalPadding = (textInsetX * 2) + 6;
      var verticalPadding = 10;
      var fontSize = 36;
      var minWidth = 72;
      var maxWidth = Math.max(minWidth, Math.round(availablePageWidth - 52));
      var safeTitle = String(titleText || '').trim();
      var measuredWidth = minWidth;
      var measuredHeight = fontSize;

      if (ctx) {
        ctx.save();
        ctx.font = '900 30px "Arial Black", Arial, sans-serif';
        var metrics = ctx.measureText(safeTitle !== '' ? safeTitle : 'Titulo da prova');
        measuredWidth = Math.max(minWidth, Math.ceil(metrics.width) + horizontalPadding);
        measuredHeight = Math.max(
          fontSize,
          Math.ceil((metrics.actualBoundingBoxAscent || fontSize * 0.75) + (metrics.actualBoundingBoxDescent || fontSize * 0.25))
        );
        ctx.restore();
      } else {
        var referenceText = safeTitle !== '' ? safeTitle : 'Titulo da prova';
        measuredWidth = Math.max(minWidth, Math.ceil(referenceText.length * (fontSize * 0.72)) + horizontalPadding);
      }

      return {
        width: Math.min(maxWidth, measuredWidth),
        height: Math.max(34, measuredHeight + verticalPadding),
      };
    }

    function sanitizeGabaritoBackgroundLayout(rawLayout) {
      if (!rawLayout || typeof rawLayout !== 'object') {
        return {
          x: 0,
          y: 0,
          scale_x: 1,
          scale_y: 1,
        };
      }

      return {
        x: clampFloat(rawLayout.x, -2000, 2000, 0),
        y: clampFloat(rawLayout.y, -2000, 2000, 0),
        scale_x: clampFloat(rawLayout.scale_x, 0.2, 3, 1),
        scale_y: clampFloat(rawLayout.scale_y, 0.2, 3, 1),
      };
    }

    function sanitizeGabaritoBackground(rawBackground) {
      if (typeof rawBackground === 'string') {
        return {
          path: rawBackground.trim(),
          url: '',
          cache_bust: '',
        };
      }

      if (!rawBackground || typeof rawBackground !== 'object') {
        return {
          path: '',
          url: '',
          cache_bust: '',
        };
      }

      return {
        path: String(rawBackground.path || '').trim(),
        url: String(rawBackground.url || '').trim(),
        cache_bust: String(rawBackground.cache_bust || '').trim(),
      };
    }

    function sanitizeRelativeCrop(rawCrop) {
      if (!rawCrop || typeof rawCrop !== 'object') {
        return {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        };
      }

      var x = clampFloat(rawCrop.x, 0, 0.95, 0);
      var y = clampFloat(rawCrop.y, 0, 0.95, 0);
      var width = clampFloat(rawCrop.width, 0.05, 1, 1);
      var height = clampFloat(rawCrop.height, 0.05, 1, 1);

      if (x + width > 1) {
        width = Math.max(0.05, 1 - x);
      }

      if (y + height > 1) {
        height = Math.max(0.05, 1 - y);
      }

      return {
        x: x,
        y: y,
        width: width,
        height: height,
      };
    }

    function sanitizeGabaritoImages(rawImages) {
      if (!Array.isArray(rawImages)) {
        return [];
      }

      return rawImages.map(function (image, index) {
        var safeAsset = sanitizeGabaritoBackground(image);
        var normalizedPath = String(safeAsset.path || '').trim().replace(/^\/+/, '').toLowerCase();
        var isLegacyGeneratedLayoutImage = /^uploads\/gabaritos\/avaliacao-\d+-layout-[a-z0-9_-]+\.(png|jpe?g|webp)$/i.test(normalizedPath);
        // Keep current uploads that provide an explicit URL, while still discarding
        // stale legacy entries that only persisted the path.
        if (isLegacyGeneratedLayoutImage && String(safeAsset.url || '').trim() === '') {
          return null;
        }

        return {
          id: String(image && image.id ? image.id : ('gimg_' + index + '_' + Date.now())),
          path: safeAsset.path,
          url: safeAsset.url,
          cache_bust: safeAsset.cache_bust,
          x: clampFloat(image && image.x, -2000, 2000, 20),
          y: clampFloat(image && image.y, -2000, 2000, 20),
          width: clampFloat(image && image.width, 40, 2000, 180),
          height: clampFloat(image && image.height, 40, 2000, 120),
          rotation: clampFloat(image && image.rotation, -180, 180, 0),
          crop: sanitizeRelativeCrop(image && image.crop),
        };
      }).filter(function (image) {
        return image && (image.path !== '' || image.url !== '');
      });
    }

    function setGabaritoPendingChanges(isDirty) {
      gabaritoHasPendingChanges = isDirty === true;
      if (gabaritoSaveButton) {
        if (gabaritoHasPendingChanges) {
          gabaritoSaveButton.classList.remove('btn-danger');
          gabaritoSaveButton.classList.add('btn-warning');
          gabaritoSaveButton.innerHTML = '<i class="las la-save me-1"></i>Salvar Alterações *';
        } else {
          gabaritoSaveButton.classList.remove('btn-warning');
          gabaritoSaveButton.classList.add('btn-danger');
          gabaritoSaveButton.innerHTML = '<i class="las la-save me-1"></i>Salvar Alterações';
        }
      }
    }

    function markGabaritoPendingChanges(optionalMessage) {
      setGabaritoPendingChanges(true);
      syncGabaritoInput();
    }

    function hasLayoutBackgroundConfigured() {
      return String(avaliacaoLayoutConfig.background && avaliacaoLayoutConfig.background.path || '').trim() !== ''
        || String(avaliacaoLayoutConfig.background && avaliacaoLayoutConfig.background.url || '').trim() !== '';
    }

    function updateLayoutBackgroundControlsVisibility() {
      var hasBackground = hasLayoutBackgroundConfigured();
      if (layoutBackgroundSelectBtn) {
        layoutBackgroundSelectBtn.classList.toggle('d-none', !hasBackground);
      }
      if (layoutBackgroundRemoveBtn) {
        layoutBackgroundRemoveBtn.classList.toggle('d-none', !hasBackground);
      }
    }

    function resolveBackgroundSource(background) {
      var safeBackground = sanitizeGabaritoBackground(background);
      var source = '';

      if (safeBackground.url !== '') {
        source = safeBackground.url;
      } else if (safeBackground.path !== '') {
        if (/^https?:\/\//i.test(safeBackground.path)) {
          source = safeBackground.path;
        } else {
          source = '/' + safeBackground.path.replace(/^\/+/, '');
        }
      }

      if (source === '') {
        return '';
      }

      var sourceParts = source.split('?');
      var sourceBase = sourceParts[0] || '';
      var sourceQuery = sourceParts.slice(1).join('?');
      var params = sourceQuery === ''
        ? []
        : sourceQuery.split('&').map(function (entry) { return String(entry || '').trim(); }).filter(Boolean);

      params = params.filter(function (entry) {
        return !/^cb=/i.test(entry);
      });

      var cacheBust = String(safeBackground.cache_bust || '').trim();
      if (cacheBust !== '') {
        params.push('cb=' + encodeURIComponent(cacheBust));
      }

      return sourceBase + (params.length ? ('?' + params.join('&')) : '');
    }

    function setGabaritoBackground(background) {
      var safeBackground = sanitizeGabaritoBackground(background);
      gabaritoBackgroundPath = safeBackground.path;
      gabaritoBackgroundUrl = safeBackground.url;
      gabaritoBackgroundCacheBust = String(safeBackground.cache_bust || '').trim();
      var hasBackground = gabaritoBackgroundPath !== '' || gabaritoBackgroundUrl !== '';

      if (hasBackground && gabaritoBackgroundCacheBust === '') {
        gabaritoBackgroundCacheBust = String(Date.now());
      }

      if (!hasBackground) {
        gabaritoBackgroundCacheBust = '';
      }

      if (gabaritoFundoAtualLabel) {
        gabaritoFundoAtualLabel.textContent = hasBackground
          ? 'Plano de fundo configurado.'
          : 'Nenhum plano de fundo selecionado.';
      }

      if (gabaritoFundoRemoveBtn) {
        gabaritoFundoRemoveBtn.classList.toggle('d-none', !hasBackground);
      }

      if (gabaritoFundoSetDefaultBtn) {
        gabaritoFundoSetDefaultBtn.disabled = !hasBackground;
      }

      updateDefaultGabaritoPresetUi();

      var source = resolveBackgroundSource({
        path: gabaritoBackgroundPath,
        url: gabaritoBackgroundUrl,
        cache_bust: gabaritoBackgroundCacheBust,
      });
      if (source === '') {
        gabaritoBackgroundImage.removeAttribute('src');
        renderA4LayoutEditor();
        renderImpressaoPreviewIfVisible();
        return;
      }

      gabaritoBackgroundImage.onload = function () {
        renderA4LayoutEditor();
        renderImpressaoPreviewIfVisible();
      };
      gabaritoBackgroundImage.src = source;
      if (gabaritoBackgroundImage.complete) {
        renderA4LayoutEditor();
        renderImpressaoPreviewIfVisible();
      }
    }

    function hasDefaultGabaritoPreset() {
      if (!defaultGabaritoPreset || typeof defaultGabaritoPreset !== 'object') {
        return false;
      }

      var background = defaultGabaritoPreset.background;
      if (!background || typeof background !== 'object') {
        return false;
      }

      return String(background.path || '').trim() !== '' || String(background.url || '').trim() !== '';
    }

    function updateDefaultGabaritoPresetUi() {
      if (gabaritoFundoPadraoAtualLabel) {
        gabaritoFundoPadraoAtualLabel.textContent = hasDefaultGabaritoPreset()
          ? 'Plano de fundo padrão ativo para novas avaliações.'
          : 'Nenhum plano de fundo padrão definido.';
      }

      if (gabaritoFundoClearDefaultBtn) {
        gabaritoFundoClearDefaultBtn.classList.toggle('d-none', !hasDefaultGabaritoPreset());
      }
    }

    function getDefaultNewAvaliacaoGabaritoConfig() {
      if (!hasDefaultGabaritoPreset()) {
        return null;
      }

      return {
        questoes: 1,
        alternativas: 4,
        questoes_por_coluna: 10,
        respostas: {},
        itens: [createDefaultQuestaoItem(4)],
        background: sanitizeGabaritoBackground(defaultGabaritoPreset.background),
        background_layout: sanitizeGabaritoBackgroundLayout(defaultGabaritoPreset.background_layout),
      };
    }

    function getDefaultGabaritoPresetUrl() {
      var fallbackUrl = '/index.php/paineladministrativo/avaliacoes/fundo-gabarito-padrao';
      if (!form || !form.action) {
        return fallbackUrl;
      }

      if (form.action.indexOf('/avaliacoes/salvar') === -1) {
        return fallbackUrl;
      }

      return form.action.replace('/avaliacoes/salvar', '/avaliacoes/fundo-gabarito-padrao');
    }

    function getOrLoadGabaritoImageAsset(imageItem) {
      if (!imageItem) { return null; }
      var source = resolveBackgroundSource({
        path: String(imageItem.path || '').trim(),
        url: String(imageItem.url || '').trim(),
        cache_bust: String(imageItem.cache_bust || '').trim(),
      });
      if (source === '') { return null; }
      var cacheKey = String(imageItem.id || source);
      if (gabaritoImageCache[cacheKey] instanceof Image) {
        return gabaritoImageCache[cacheKey];
      }
      var img = new Image();
      gabaritoImageCache[cacheKey] = img;
      img.onload = function () {
        renderGabaritoPreview();
        renderA4LayoutEditor();
      };
      img.src = source;
      return img;
    }

    function getGabaritoImageById(imageId) {
      var safeId = String(imageId || '');
      if (safeId === '') {
        return null;
      }

      for (var index = 0; index < gabaritoImages.length; index += 1) {
        if (String(gabaritoImages[index] && gabaritoImages[index].id || '') === safeId) {
          return gabaritoImages[index];
        }
      }

      return null;
    }

    function normalizeGabaritoImageRotation(value) {
      var normalized = clampFloat(value, -3600, 3600, 0) % 360;
      if (normalized > 180) {
        normalized -= 360;
      }
      if (normalized < -180) {
        normalized += 360;
      }
      return normalized;
    }

    function getGabaritoImageObjectById(imageId) {
      var safeId = String(imageId || '');
      if (safeId === '') {
        return null;
      }

      for (var index = 0; index < gabaritoImageObjects.length; index += 1) {
        var imageObject = gabaritoImageObjects[index];
        if (String(imageObject && imageObject.id || '') === safeId) {
          return imageObject;
        }
      }

      return null;
    }

    function getGabaritoImagePointerLocal(imageObject, pointer) {
      if (!imageObject || !imageObject.renderMeta || !pointer) {
        return null;
      }

      var meta = imageObject.renderMeta;
      var deltaX = pointer.x - meta.centerX;
      var deltaY = pointer.y - meta.centerY;
      var cosValue = Math.cos(-meta.rotationRad);
      var sinValue = Math.sin(-meta.rotationRad);
      var localX = (deltaX * cosValue) - (deltaY * sinValue);
      var localY = (deltaX * sinValue) + (deltaY * cosValue);

      return {
        x: localX + (meta.width / 2),
        y: localY + (meta.height / 2),
      };
    }

    function getGabaritoImageCropRect(imageData) {
      return sanitizeRelativeCrop(imageData && imageData.crop);
    }

    function getGabaritoImageCropPixelRect(imageObject) {
      if (!imageObject || !imageObject.renderMeta) {
        return null;
      }

      var crop = getGabaritoImageCropRect(imageObject.data);
      var width = Math.max(1, clampFloat(imageObject.renderMeta.width, 1, 100000, 1));
      var height = Math.max(1, clampFloat(imageObject.renderMeta.height, 1, 100000, 1));
      var x = clampFloat(crop.x * width, 0, width - 1, 0);
      var y = clampFloat(crop.y * height, 0, height - 1, 0);
      var cropWidth = clampFloat(crop.width * width, 1, width, width);
      var cropHeight = clampFloat(crop.height * height, 1, height, height);

      if ((x + cropWidth) > width) {
        cropWidth = Math.max(1, width - x);
      }
      if ((y + cropHeight) > height) {
        cropHeight = Math.max(1, height - y);
      }

      return {
        x: x,
        y: y,
        width: cropWidth,
        height: cropHeight,
      };
    }

    function setGabaritoImageCropFromPixels(imageItem, renderMeta, cropPixels) {
      if (!imageItem || !renderMeta || !cropPixels) {
        return;
      }

      var width = Math.max(1, clampFloat(renderMeta.width, 1, 100000, 1));
      var height = Math.max(1, clampFloat(renderMeta.height, 1, 100000, 1));
      var minWidth = Math.max(1, width * 0.05);
      var minHeight = Math.max(1, height * 0.05);
      var x = clampFloat(cropPixels.x, 0, width - 1, 0);
      var y = clampFloat(cropPixels.y, 0, height - 1, 0);
      var cropWidth = clampFloat(cropPixels.width, minWidth, width, width);
      var cropHeight = clampFloat(cropPixels.height, minHeight, height, height);

      if ((x + cropWidth) > width) {
        cropWidth = Math.max(minWidth, width - x);
      }
      if ((y + cropHeight) > height) {
        cropHeight = Math.max(minHeight, height - y);
      }

      imageItem.crop = {
        x: clampFloat(x / width, 0, 0.95, 0),
        y: clampFloat(y / height, 0, 0.95, 0),
        width: clampFloat(cropWidth / width, 0.05, 1, 1),
        height: clampFloat(cropHeight / height, 0.05, 1, 1),
      };
    }

    function getGabaritoCropHandleFromLocalPoint(cropPixels, localPoint) {
      if (!cropPixels || !localPoint) {
        return '';
      }

      var handles = [
        { key: 'nw', x: cropPixels.x, y: cropPixels.y, radius: 10 },
        { key: 'ne', x: cropPixels.x + cropPixels.width, y: cropPixels.y, radius: 10 },
        { key: 'sw', x: cropPixels.x, y: cropPixels.y + cropPixels.height, radius: 10 },
        { key: 'se', x: cropPixels.x + cropPixels.width, y: cropPixels.y + cropPixels.height, radius: 10 },
        { key: 'n', x: cropPixels.x + (cropPixels.width / 2), y: cropPixels.y, radius: 13 },
        { key: 'e', x: cropPixels.x + cropPixels.width, y: cropPixels.y + (cropPixels.height / 2), radius: 13 },
        { key: 's', x: cropPixels.x + (cropPixels.width / 2), y: cropPixels.y + cropPixels.height, radius: 13 },
        { key: 'w', x: cropPixels.x, y: cropPixels.y + (cropPixels.height / 2), radius: 13 },
      ];

      for (var index = 0; index < handles.length; index += 1) {
        var handle = handles[index];
        var distance = Math.sqrt(
          Math.pow(localPoint.x - handle.x, 2)
          + Math.pow(localPoint.y - handle.y, 2)
        );
        if (distance <= handle.radius) {
          return handle.key;
        }
      }

      return '';
    }

    function isPointerInsideVisibleGabaritoImage(imageObject, pointer) {
      var localPoint = getGabaritoImagePointerLocal(imageObject, pointer);
      if (!localPoint || !imageObject || !imageObject.renderMeta) {
        return false;
      }

      var cropRect = getGabaritoImageCropRect(imageObject.data);
      var cropMinX = cropRect.x * imageObject.renderMeta.width;
      var cropMinY = cropRect.y * imageObject.renderMeta.height;
      var cropMaxX = cropMinX + (cropRect.width * imageObject.renderMeta.width);
      var cropMaxY = cropMinY + (cropRect.height * imageObject.renderMeta.height);

      return (
        localPoint.x >= cropMinX && localPoint.x <= cropMaxX &&
        localPoint.y >= cropMinY && localPoint.y <= cropMaxY
      );
    }

    // ── selector helper functions ────────────────────────────────

    function getSelectedTurmasIds() {
      var ids = [];
      turmaCheckboxes.forEach(function (cb) {
        if (cb.checked) {
          var id = Number(cb.value || 0);
          if (id > 0) {
            ids.push(id);
          }
        }
      });
      return ids;
    }

    function buildAutomaticSelectedAlunosIds() {
      var selectedTurmasIds = getSelectedTurmasIds();
      if (selectedTurmasIds.length === 0) {
        return [];
      }

      return alunosOptions.filter(function (aluno) {
        return selectedTurmasIds.indexOf(aluno.turmaId) !== -1;
      }).map(function (aluno) {
        return aluno.id;
      });
    }

    function getValidSelectedAlunosIdsForCurrentTurmas(alunosIds) {
      var selectedTurmasIds = getSelectedTurmasIds();
      var safeAlunosIds = Array.isArray(alunosIds) ? alunosIds : [];

      if (selectedTurmasIds.length === 0) {
        return [];
      }

      return safeAlunosIds.filter(function (alunoId) {
        var aluno = alunosOptions.find(function (item) {
          return item.id === alunoId;
        });

        return aluno && selectedTurmasIds.indexOf(aluno.turmaId) !== -1;
      });
    }

    function parseSelectedIds(rawValue) {
      if (String(rawValue || '').trim() === '') {
        return [];
      }

      return String(rawValue)
        .split(',')
        .map(function (value) { return Number(String(value || '').trim()) || 0; })
        .filter(function (value, index, arr) {
          return value > 0 && arr.indexOf(value) === index;
        });
    }

    function syncSelectedAlunosFromTurmas(options) {
      var safeOptions = options && typeof options === 'object' ? options : {};

      if (safeOptions.explicitSelection === true) {
        selectedAlunosRelacionadosIds = getValidSelectedAlunosIdsForCurrentTurmas(safeOptions.alunosIds);
        hasManualAlunosSelection = true;
      } else if (safeOptions.preserveExisting === true) {
        if (hasManualAlunosSelection) {
          selectedAlunosRelacionadosIds = getValidSelectedAlunosIdsForCurrentTurmas(selectedAlunosRelacionadosIds);
        } else {
          selectedAlunosRelacionadosIds = buildAutomaticSelectedAlunosIds();
        }
      } else {
        selectedAlunosRelacionadosIds = buildAutomaticSelectedAlunosIds();
        hasManualAlunosSelection = false;
      }

      syncAlunosHiddenInputs();
      updateAlunosSummary();

      if (alunosModalElement && alunosModalElement.classList.contains('show')) {
        buildAlunosTurmaFilterOptions();
        renderAlunosModalList();
      }
    }

    function updateTurmasSummary() {
      if (!turmasSummaryElement) {
        return;
      }

      var labels = [];
      turmaCheckboxes.forEach(function (cb) {
        if (cb.checked) {
          var labelEl = document.querySelector('label[for="' + cb.id + '"]');
          if (labelEl) {
            labels.push(String(labelEl.textContent || '').trim());
          }
        }
      });

      if (labels.length === 0) {
        turmasSummaryElement.innerHTML = '<div class="small text-secondary">Nenhuma turma selecionada.</div>';
        return;
      }

      turmasSummaryElement.innerHTML = '<div class="d-flex flex-wrap gap-1">'
        + labels.map(function (l) {
          return '<span class="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">'
            + l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            + '</span>';
        }).join('')
        + '</div>';
    }

    function updateAlunosModalButtonState() {
      if (!openAlunosModalButton) {
        return;
      }
      openAlunosModalButton.disabled = getSelectedTurmasIds().length === 0;
    }

    function buildAlunosTurmaFilterOptions() {
      if (!alunosTurmaFilterInput) {
        return;
      }

      var options = '<option value="all">Todas as turmas selecionadas</option>';
      turmaCheckboxes.forEach(function (cb) {
        if (!cb.checked) {
          return;
        }
        var turmaId = Number(cb.value || 0);
        if (turmaId <= 0) {
          return;
        }
        var labelEl = document.querySelector('label[for="' + cb.id + '"]');
        var turmaNome = labelEl ? String(labelEl.textContent || '').trim() : ('Turma ' + turmaId);
        options += '<option value="' + turmaId + '">'
          + turmaNome.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          + '</option>';
      });

      alunosTurmaFilterInput.innerHTML = options;
      if (alunosModalTurmaFilterValue !== 'all') {
        alunosTurmaFilterInput.value = alunosModalTurmaFilterValue;
        if (!alunosTurmaFilterInput.value) {
          alunosTurmaFilterInput.value = 'all';
          alunosModalTurmaFilterValue = 'all';
        }
      }
    }

    function renderAlunosModalList() {
      if (!alunosRelacionadosWrap) {
        return;
      }

      var searchQuery = alunosSearchInput ? normalizeSearchValue(String(alunosSearchInput.value || '')) : '';
      var turmaFilterValue = alunosTurmaFilterInput ? String(alunosTurmaFilterInput.value || 'all') : 'all';
      var selectedTurmasIds = getSelectedTurmasIds();

      var filteredAlunos = alunosOptions.filter(function (aluno) {
        if (selectedTurmasIds.indexOf(aluno.turmaId) === -1) {
          return false;
        }
        if (turmaFilterValue !== 'all' && aluno.turmaId !== Number(turmaFilterValue)) {
          return false;
        }
        if (searchQuery !== '' && normalizeSearchValue(aluno.nome).indexOf(searchQuery) === -1) {
          return false;
        }
        return true;
      });

      if (filteredAlunos.length === 0) {
        alunosRelacionadosWrap.innerHTML = '<div class="small text-secondary py-2">Nenhum estudante encontrado.</div>';
        return;
      }

      var currentTurmaId = 0;
      var html = '';
      filteredAlunos.forEach(function (aluno) {
        if (turmaFilterValue === 'all' && aluno.turmaId !== currentTurmaId) {
          currentTurmaId = aluno.turmaId;
          html += '<div class="fw-semibold small text-secondary mt-2 mb-1 px-1">'
            + aluno.turmaNome.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            + '</div>';
        }
        var isChecked = selectedAlunosRelacionadosIds.indexOf(aluno.id) !== -1;
        html += '<div class="form-check">'
          + '<input class="form-check-input js-admin-avaliacao-aluno-checkbox" type="checkbox"'
          + ' value="' + aluno.id + '"'
          + ' id="adminAvaliacaoAlunoRel_' + aluno.id + '"'
          + (isChecked ? ' checked' : '')
          + '>'
          + '<label class="form-check-label" for="adminAvaliacaoAlunoRel_' + aluno.id + '">'
          + aluno.nome.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          + '</label>'
          + '</div>';
      });

      alunosRelacionadosWrap.innerHTML = html;
    }

    function updateAlunosSummary() {
      if (!alunosSummaryElement) {
        return;
      }

      var selectedTurmasIds = getSelectedTurmasIds();
      if (selectedTurmasIds.length === 0) {
        alunosSummaryElement.innerHTML = '<div class="small text-secondary">Selecione as turmas para liberar a lista de estudantes disponíveis.</div>';
        return;
      }

      var validIds = selectedAlunosRelacionadosIds.filter(function (alunoId) {
        var aluno = alunosOptions.find(function (a) { return a.id === alunoId; });
        return aluno && selectedTurmasIds.indexOf(aluno.turmaId) !== -1;
      });
      selectedAlunosRelacionadosIds = validIds;

      if (validIds.length === 0) {
        alunosSummaryElement.innerHTML = '<div class="small text-secondary">Nenhum estudante selecionado.</div>';
        return;
      }

      var selectedAlunos = alunosOptions.filter(function (aluno) {
        return validIds.indexOf(aluno.id) !== -1;
      });

      alunosSummaryElement.innerHTML = '<div class="d-flex flex-wrap gap-1">'
        + selectedAlunos.map(function (a) {
          return '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">'
            + a.nome.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            + '</span>';
        }).join('')
        + '</div>';
    }

    function syncAlunosHiddenInputs() {
      if (!form) {
        return;
      }
      form.querySelectorAll('input.js-aluno-hidden-input').forEach(function (el) { el.remove(); });
      selectedAlunosRelacionadosIds.forEach(function (alunoId) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'alunos_relacionados[]';
        input.value = String(alunoId);
        input.className = 'js-aluno-hidden-input';
        form.appendChild(input);
      });
    }

    function getAplicadorCheckboxes() {
      return aplicadoresListElement
        ? Array.from(aplicadoresListElement.querySelectorAll('.js-admin-avaliacao-aplicador-checkbox'))
        : [];
    }

    function syncAplicadoresSelect() {
      if (!aplicadorInput) {
        return;
      }
      var checkedIds = getAplicadorCheckboxes()
        .filter(function (cb) { return cb.checked; })
        .map(function (cb) { return Number(cb.value || 0); })
        .filter(function (id) { return id > 0; });
      Array.from(aplicadorInput.options).forEach(function (opt) {
        opt.selected = checkedIds.indexOf(Number(opt.value)) !== -1;
      });
    }

    function updateAplicadoresSummary() {
      if (!aplicadoresSummaryElement) {
        return;
      }
      var selected = getAplicadorCheckboxes().filter(function (cb) { return cb.checked; });
      if (selected.length === 0) {
        aplicadoresSummaryElement.innerHTML = '<div class="small text-secondary">Nenhum aplicador selecionado.</div>';
        return;
      }
      var labels = selected.map(function (cb) {
        var labelEl = document.querySelector('label[for="' + cb.id + '"]');
        return labelEl ? String(labelEl.textContent || '').trim() : ('Aplicador ' + cb.value);
      });
      aplicadoresSummaryElement.innerHTML = '<div class="d-flex flex-wrap gap-1">'
        + labels.map(function (l) {
          return '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle">'
            + l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            + '</span>';
        }).join('')
        + '</div>';
    }

    function restoreSelectorState(turmasIds, alunosIds, aplicadoresIds, hasExplicitAlunosSelection) {
      // Turmas
      var turmaIdStrings = String(turmasIds || '').trim() === ''
        ? []
        : String(turmasIds).split(',').map(function (v) { return String(v).trim(); }).filter(Boolean);
      turmaCheckboxes.forEach(function (cb) {
        cb.checked = turmaIdStrings.indexOf(String(cb.value || '')) !== -1;
      });

      syncSelectedAlunosFromTurmas({
        explicitSelection: hasExplicitAlunosSelection === true,
        alunosIds: parseSelectedIds(alunosIds),
      });

      if (hasExplicitAlunosSelection !== true) {
        hasManualAlunosSelection = false;
      }

      // Aplicadores
      var aplicadorIdNumbers = String(aplicadoresIds || '').trim() === ''
        ? []
        : String(aplicadoresIds).split(',').map(function (v) { return Number(v.trim()) || 0; }).filter(function (id) { return id > 0; });
      getAplicadorCheckboxes().forEach(function (cb) {
        cb.checked = aplicadorIdNumbers.indexOf(Number(cb.value || 0)) !== -1;
      });
      syncAplicadoresSelect();

      updateTurmasSummary();
      updateAlunosModalButtonState();
      updateAplicadoresSummary();
    }

    // ── selector bindings ────────────────────────────────────────

    if (openTurmasModalButton) {
      openTurmasModalButton.addEventListener('click', function () {
        if (turmasModalInstance) {
          prepareModalOpen();
          turmasModalInstance.show();
        }
      });
    }

    if (clearTurmasButton) {
      clearTurmasButton.addEventListener('click', function () {
        turmaCheckboxes.forEach(function (cb) { cb.checked = false; });
        updateTurmasSummary();
        updateAlunosModalButtonState();
        syncSelectedAlunosFromTurmas({ preserveExisting: true });
      });
    }

    if (turmasSearchInput) {
      turmasSearchInput.addEventListener('input', function () {
        var query = normalizeSearchValue(String(this.value || ''));
        var turmaList = document.getElementById('adminAvaliacaoTurmasList');
        var hasVisible = false;
        if (turmaList) {
          Array.from(turmaList.querySelectorAll('.form-check')).forEach(function (item) {
            var labelEl = item.querySelector('label');
            var text = labelEl ? normalizeSearchValue(String(labelEl.textContent || '')) : '';
            var show = query === '' || text.indexOf(query) !== -1;
            item.style.display = show ? '' : 'none';
            if (show) {
              hasVisible = true;
            }
          });
        }
        if (turmasSearchEmpty) {
          turmasSearchEmpty.classList.toggle('d-none', query === '' || hasVisible);
        }
      });
    }

    turmaCheckboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        updateTurmasSummary();
        updateAlunosModalButtonState();
        syncSelectedAlunosFromTurmas({ preserveExisting: true });
      });
    });

    if (turmasModalElement) {
      turmasModalElement.addEventListener('hidden.bs.modal', function () {
        updateTurmasSummary();
        updateAlunosModalButtonState();
        syncSelectedAlunosFromTurmas({ preserveExisting: true });
        if (pendingOpenAlunosAfterTurmasClose) {
          pendingOpenAlunosAfterTurmasClose = false;
          if (alunosModalInstance && getSelectedTurmasIds().length > 0) {
            buildAlunosTurmaFilterOptions();
            renderAlunosModalList();
            setTimeout(function () {
              prepareModalOpen();
              alunosModalInstance.show();
            }, 300);
          }
        }
      });
    }

    if (openAlunosModalButton) {
      openAlunosModalButton.addEventListener('click', function () {
        if (alunosModalInstance && getSelectedTurmasIds().length > 0) {
          buildAlunosTurmaFilterOptions();
          renderAlunosModalList();
          prepareModalOpen();
          alunosModalInstance.show();
        }
      });
    }

    if (openAlunosFromTurmasButton) {
      openAlunosFromTurmasButton.addEventListener('click', function () {
        pendingOpenAlunosAfterTurmasClose = true;
        if (turmasModalInstance) {
          turmasModalInstance.hide();
        }
      });
    }

    if (clearAlunosButton) {
      clearAlunosButton.addEventListener('click', function () {
        selectedAlunosRelacionadosIds = [];
        hasManualAlunosSelection = true;
        syncAlunosHiddenInputs();
        updateAlunosSummary();
      });
    }

    if (alunosSearchInput) {
      alunosSearchInput.addEventListener('input', function () {
        alunosModalSearchQuery = String(this.value || '');
        renderAlunosModalList();
      });
    }

    if (alunosTurmaFilterInput) {
      alunosTurmaFilterInput.addEventListener('change', function () {
        alunosModalTurmaFilterValue = String(this.value || 'all');
        renderAlunosModalList();
      });
    }

    if (alunosRelacionadosWrap) {
      alunosRelacionadosWrap.addEventListener('change', function (event) {
        var checkbox = event.target;
        if (!checkbox || !checkbox.classList.contains('js-admin-avaliacao-aluno-checkbox')) {
          return;
        }
        var alunoId = Number(checkbox.value || 0);
        if (alunoId <= 0) {
          return;
        }
        if (checkbox.checked) {
          if (selectedAlunosRelacionadosIds.indexOf(alunoId) === -1) {
            selectedAlunosRelacionadosIds.push(alunoId);
          }
        } else {
          selectedAlunosRelacionadosIds = selectedAlunosRelacionadosIds.filter(function (id) { return id !== alunoId; });
        }
        hasManualAlunosSelection = true;
      });
    }

    if (alunosModalElement) {
      alunosModalElement.addEventListener('hidden.bs.modal', function () {
        syncAlunosHiddenInputs();
        updateAlunosSummary();
      });
    }

    if (openAplicadoresModalButton) {
      openAplicadoresModalButton.addEventListener('click', function () {
        if (aplicadoresModalInstance) {
          prepareModalOpen();
          aplicadoresModalInstance.show();
        }
      });
    }

    if (clearAplicadoresButton) {
      clearAplicadoresButton.addEventListener('click', function () {
        getAplicadorCheckboxes().forEach(function (cb) { cb.checked = false; });
        syncAplicadoresSelect();
        updateAplicadoresSummary();
      });
    }

    if (aplicadoresSearchInput) {
      aplicadoresSearchInput.addEventListener('input', function () {
        var query = normalizeSearchValue(String(this.value || ''));
        var hasVisible = false;
        if (aplicadoresListElement) {
          Array.from(aplicadoresListElement.querySelectorAll('.js-admin-avaliacao-aplicador-option')).forEach(function (item) {
            var text = normalizeSearchValue(String(item.getAttribute('data-search-text') || ''));
            var show = query === '' || text.indexOf(query) !== -1;
            item.style.display = show ? '' : 'none';
            if (show) {
              hasVisible = true;
            }
          });
        }
        if (aplicadoresSearchEmpty) {
          aplicadoresSearchEmpty.classList.toggle('d-none', query === '' || hasVisible);
        }
      });
    }

    if (aplicadoresSelectAllButton) {
      aplicadoresSelectAllButton.addEventListener('click', function () {
        if (aplicadoresListElement) {
          Array.from(aplicadoresListElement.querySelectorAll('.js-admin-avaliacao-aplicador-option')).forEach(function (item) {
            if (item.style.display === 'none') {
              return;
            }
            var cb = item.querySelector('.js-admin-avaliacao-aplicador-checkbox');
            if (cb) {
              cb.checked = true;
            }
          });
        }
        syncAplicadoresSelect();
        updateAplicadoresSummary();
      });
    }

    if (aplicadoresClearAllButton) {
      aplicadoresClearAllButton.addEventListener('click', function () {
        getAplicadorCheckboxes().forEach(function (cb) { cb.checked = false; });
        syncAplicadoresSelect();
        updateAplicadoresSummary();
      });
    }

    if (aplicadoresListElement) {
      aplicadoresListElement.addEventListener('change', function (event) {
        var checkbox = event.target;
        if (!checkbox || !checkbox.classList.contains('js-admin-avaliacao-aplicador-checkbox')) {
          return;
        }
        syncAplicadoresSelect();
        updateAplicadoresSummary();
      });
    }

    if (aplicadoresModalElement) {
      aplicadoresModalElement.addEventListener('hidden.bs.modal', function () {
        syncAplicadoresSelect();
        updateAplicadoresSummary();
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', function () {
        resetForm();
      });
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (submitButton) {
          submitButton.disabled = true;
        }

        persistGabaritoBackgroundIfNeeded()
          .then(function () {
            syncGabaritoInput();
            var formData = new FormData(form);

            return fetch(form.action, {
              method: 'POST',
              body: formData,
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
          })
          .then(function (response) { return response.json(); })
          .then(function (payload) {
            if (payload && payload.ok) {
              if (formModalInstance) {
                formModalInstance.hide();
              }
              refreshAvaliacoesCrudView();
            } else {
              var msg = payload && payload.message ? payload.message : 'Não foi possível salvar a avaliação.';
              alert(msg);
            }
          })
          .catch(function () {
            alert('Erro ao comunicar com o servidor. Verifique sua conexão e tente novamente.');
          })
          .finally(function () {
            if (submitButton) {
              submitButton.disabled = false;
            }
          });
      });
    }

    if (formModalElement) {
      formModalElement.addEventListener('hidden.bs.modal', function () {
        resetForm();
      });
    }

    if (newButton) {
      newButton.addEventListener('click', function () {
        openFormModal();
      });
    }

    if (tableFiltersButton && tableFiltersButton.dataset.boundClick !== '1') {
      tableFiltersButton.dataset.boundClick = '1';
      tableFiltersButton.addEventListener('click', function () {
        rebuildTableFilterControls();
        if (tableFiltersModalInstance) {
          tableFiltersModalInstance.show();
        }
      });
    }

    if (tableCycleFiltersElement && tableCycleFiltersElement.dataset.boundClick !== '1') {
      tableCycleFiltersElement.dataset.boundClick = '1';
      tableCycleFiltersElement.addEventListener('click', function (event) {
        var button = event.target.closest('[data-filter-value]');
        if (!button) {
          return;
        }

        activeTableCycleFilter = String(button.getAttribute('data-filter-value') || 'all').trim() || 'all';
        tableCurrentPage = 1;
        rebuildTableFilterControls();
        filterTable();
      });
    }

    if (tableTurmaFiltersElement && tableTurmaFiltersElement.dataset.boundClick !== '1') {
      tableTurmaFiltersElement.dataset.boundClick = '1';
      tableTurmaFiltersElement.addEventListener('click', function (event) {
        var button = event.target.closest('[data-filter-value]');
        if (!button) {
          return;
        }

        activeTableTurmaFilter = String(button.getAttribute('data-filter-value') || 'all').trim() || 'all';
        tableCurrentPage = 1;
        rebuildTableFilterControls();
        filterTable();
      });
    }

    if (tableSearchInput) {
      tableSearchInput.addEventListener('input', function () {
        tableCurrentPage = 1;
        filterTable();
      });
    }

    if (tablePageSizeSelect && tablePageSizeSelect.dataset.boundChange !== '1') {
      tablePageSizeSelect.dataset.boundChange = '1';
      tablePageSizeSelect.addEventListener('change', function () {
        tableCurrentPage = 1;
        filterTable();
      });
    }

    if (tableClearFiltersButton && tableClearFiltersButton.dataset.boundClick !== '1') {
      tableClearFiltersButton.dataset.boundClick = '1';
      tableClearFiltersButton.addEventListener('click', function () {
        activeTableCycleFilter = 'all';
        activeTableTurmaFilter = 'all';
        tableCurrentPage = 1;
        rebuildTableFilterControls();
        filterTable();
      });
    }

    if (tablePrevPageButton && tablePrevPageButton.dataset.boundClick !== '1') {
      tablePrevPageButton.dataset.boundClick = '1';
      tablePrevPageButton.addEventListener('click', function () {
        tableCurrentPage = Math.max(1, tableCurrentPage - 1);
        filterTable();
      });
    }

    if (tableNextPageButton && tableNextPageButton.dataset.boundClick !== '1') {
      tableNextPageButton.dataset.boundClick = '1';
      tableNextPageButton.addEventListener('click', function () {
        tableCurrentPage += 1;
        filterTable();
      });
    }

    if (tablePaginationPages && tablePaginationPages.dataset.boundClick !== '1') {
      tablePaginationPages.dataset.boundClick = '1';
      tablePaginationPages.addEventListener('click', function (event) {
        var button = event.target.closest('[data-page]');
        if (!button) {
          return;
        }

        tableCurrentPage = clampInt(parseInt(button.getAttribute('data-page'), 10), 1, 9999, 1);
        filterTable();
      });
    }

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', function () {
        var isChecked = this.checked;
        tableRows.forEach(function (row) {
          if (row.classList.contains('d-none')) {
            return;
          }

          var rowId = Number(row.getAttribute('data-avaliacao-id') || 0);
          var checkbox = row.querySelector('.js-admin-avaliacao-select');
          if (checkbox) {
            checkbox.checked = isChecked;
            if (rowId > 0) {
              if (isChecked) {
                if (selectedAvaliacaoIdsForDelete.indexOf(rowId) === -1) {
                  selectedAvaliacaoIdsForDelete.push(rowId);
                }
              } else {
                selectedAvaliacaoIdsForDelete = selectedAvaliacaoIdsForDelete.filter(function (id) { return id !== rowId; });
              }
            }
          }
        });
        syncBulkSelectionState();
      });
    }

    if (deleteSelectedButton) {
      deleteSelectedButton.addEventListener('click', function () {
        var selectedIds = selectedAvaliacaoIdsForDelete.slice();

        if (selectedIds.length === 0) {
          return;
        }

        openDeleteConfirmModal(selectedIds.map(function (id) {
          return { action: '/paineladministrativo/avaliacoes/excluir', method: 'POST', fields: { id: id, csrf_token: '' } };
        }), selectedIds.length > 1 ? 'as avaliações selecionadas' : 'a avaliação selecionada');
      });
    }

    function updateBulkSelectionState() {
      var selectedCount = 0;
      var totalCount = 0;

      tableRows.forEach(function (row) {
        if (row.style.display !== 'none') {
          totalCount += 1;
          var checkbox = row.querySelector('.js-admin-avaliacao-select');
          if (checkbox && checkbox.checked) {
            selectedCount += 1;
          }
        }
      });

      if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalCount;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
      }

      if (deleteSelectedButton) {
        deleteSelectedButton.disabled = selectedCount === 0;
        deleteSelectedButton.textContent = selectedCount > 0
          ? 'Excluir selecionadas (' + selectedCount + ')'
          : 'Excluir selecionadas';
      }
    }

    bindRowSelectionCheckboxes();
    rebuildTableFilterControls();
    filterTable();

    bindRowActionButtons();

    if (gabaritoPreviewImage) {
      gabaritoPreviewImage.addEventListener('click', handleGabaritoPreviewClick);
    }

    // ---- Questões editor: event delegation ----
    if (questoesListContainer) {
      questoesListContainer.addEventListener('click', function (event) {
        var target = event.target.closest('[data-question-index]');
        if (!target) { return; }
        var qi = parseInt(target.getAttribute('data-question-index'), 10);

        // Click on a bubble = toggle correct answer
        if (target.classList.contains('js-admin-gabarito-bubble')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) { return; }
          var letter = String(target.getAttribute('data-alt-letter') || '').trim().toUpperCase();
          var cur = String(gabaritoQuestoesItens[qi].correta || '').trim().toUpperCase();
          gabaritoQuestoesItens[qi].correta = (cur === letter) ? '' : letter;
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-type-cycle')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) { return; }
          var cycleItem = gabaritoQuestoesItens[qi];
          var cycleOrder = ['multipla', 'vf', 'discursiva'];
          var cycleIdx = cycleOrder.indexOf(cycleItem.tipo || 'multipla');
          var nextType = cycleOrder[(cycleIdx + 1) % cycleOrder.length];
          cycleItem.tipo = nextType;
          if (nextType === 'vf') {
            cycleItem.alternativas = ['', ''];
            if (cycleItem.correta !== 'V' && cycleItem.correta !== 'F') { cycleItem.correta = ''; }
          } else if (nextType === 'discursiva') {
            cycleItem.alternativas = [];
            // correta não é exibida em discursiva, mantém para eventual restauração
          } else if (nextType === 'multipla') {
            var altCount = clampInt(gabaritoAlternativasConfiguradas, 2, 10, 4);
            cycleItem.alternativas = Array.apply(null, Array(altCount)).map(function () { return ''; });
            // correta só permanece se for uma letra válida dentro do range
            var letterIdx = cycleItem.correta ? (cycleItem.correta.charCodeAt(0) - 65) : -1;
            if (letterIdx < 0 || letterIdx >= altCount) { cycleItem.correta = ''; }
          }
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-type-btn')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) { return; }
          var newType = target.getAttribute('data-type');
          var item = gabaritoQuestoesItens[qi];
          if (item.tipo === newType) { return; }
          item.tipo = newType;
          item.correta = '';
          if (newType === 'vf') {
            item.alternativas = ['', ''];
          } else if (newType === 'discursiva') {
            item.alternativas = [];
          } else if (newType === 'multipla' && (!Array.isArray(item.alternativas) || item.alternativas.length < 2)) {
            item.alternativas = ['', '', '', ''];
          }
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-anular-btn')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) { return; }
          gabaritoQuestoesItens[qi].anulada = !gabaritoQuestoesItens[qi].anulada;
          if (gabaritoQuestoesItens[qi].anulada) { gabaritoQuestoesItens[qi].correta = ''; }
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-move-up')) {
          if (isNaN(qi) || qi <= 0 || qi >= gabaritoQuestoesItens.length) { return; }
          var tmp = gabaritoQuestoesItens[qi];
          gabaritoQuestoesItens[qi] = gabaritoQuestoesItens[qi - 1];
          gabaritoQuestoesItens[qi - 1] = tmp;
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-move-down')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length - 1) { return; }
          var tmpDown = gabaritoQuestoesItens[qi];
          gabaritoQuestoesItens[qi] = gabaritoQuestoesItens[qi + 1];
          gabaritoQuestoesItens[qi + 1] = tmpDown;
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-remove-question')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length || gabaritoQuestoesItens.length <= 1) { return; }
          gabaritoQuestoesItens.splice(qi, 1);
          if (questoesTotalInput) { questoesTotalInput.value = String(gabaritoQuestoesItens.length); }
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-add-alt')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) { return; }
          var itemAdd = gabaritoQuestoesItens[qi];
          if (!Array.isArray(itemAdd.alternativas)) { itemAdd.alternativas = []; }
          if (itemAdd.alternativas.length >= 10) { return; }
          itemAdd.alternativas.push('');
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }

        if (target.classList.contains('js-admin-gabarito-remove-last-alt')) {
          if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) { return; }
          var itemRmL = gabaritoQuestoesItens[qi];
          if (!Array.isArray(itemRmL.alternativas) || itemRmL.alternativas.length <= 2) { return; }
          var removedLetter = getAlternativeLetter(itemRmL.alternativas.length - 1);
          itemRmL.alternativas.pop();
          if (String(itemRmL.correta || '').toUpperCase() === removedLetter) { itemRmL.correta = ''; }
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          markGabaritoPendingChanges();
          return;
        }
      });

      questoesListContainer.addEventListener('input', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.classList.contains('js-admin-gabarito-peso')) {
          return;
        }

        var qi = parseInt(target.getAttribute('data-question-index'), 10);
        if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) {
          return;
        }

        var rawValue = String(target.value || '').trim().replace(',', '.');
        if (rawValue === '') {
          return;
        }

        gabaritoQuestoesItens[qi].peso = sanitizeQuestaoPeso(rawValue, gabaritoQuestoesItens[qi].peso || 1);
        markGabaritoPendingChanges();
      });

      questoesListContainer.addEventListener('change', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.classList.contains('js-admin-gabarito-peso')) {
          return;
        }

        var qi = parseInt(target.getAttribute('data-question-index'), 10);
        if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) {
          return;
        }

        var normalizedPeso = sanitizeQuestaoPeso(String(target.value || '').replace(',', '.'), gabaritoQuestoesItens[qi].peso || 1);
        gabaritoQuestoesItens[qi].peso = normalizedPeso;
        target.value = String(normalizedPeso).replace(/\.00$/, '');
        renderDisciplinasHabilidadesEditor();
        markGabaritoPendingChanges();
      });
    }

    // ---- Control inputs: questões, alternativas, por coluna, restaurar ----
    if (questoesTotalInput) {
      questoesTotalInput.addEventListener('change', function () {
        var newCount = clampInt(parseInt(questoesTotalInput.value, 10), 1, 200, 1);
        questoesTotalInput.value = String(newCount);
        var altCount = getMaxAlternativasFromQuestoesItens(gabaritoQuestoesItens) || 4;
        while (gabaritoQuestoesItens.length < newCount) {
          gabaritoQuestoesItens.push(createDefaultQuestaoItem(altCount));
        }
        if (gabaritoQuestoesItens.length > newCount) {
          gabaritoQuestoesItens = gabaritoQuestoesItens.slice(0, newCount);
        }
        renderGabaritoQuestoesEditor();
        renderGabaritoPreview();
        renderA4LayoutEditor();
        markGabaritoPendingChanges();
      });
    }

    if (alternativasTotalInput) {
      alternativasTotalInput.addEventListener('change', function () {
        var newAlts = clampInt(parseInt(alternativasTotalInput.value, 10), 2, 10, 4);
        alternativasTotalInput.value = String(newAlts);
        gabaritoQuestoesItens.forEach(function (item) {
          if (item.tipo === 'vf' || item.tipo === 'discursiva') { return; }
          if (!Array.isArray(item.alternativas)) { item.alternativas = []; }
          while (item.alternativas.length < newAlts) { item.alternativas.push(''); }
          if (item.alternativas.length > newAlts) {
            var removed = item.alternativas.splice(newAlts).map(function (_, i) { return getAlternativeLetter(newAlts + i); });
            if (removed.indexOf(String(item.correta || '').toUpperCase()) !== -1) { item.correta = ''; }
          }
        });
        renderGabaritoQuestoesEditor();
        renderGabaritoPreview();
        renderA4LayoutEditor();
        markGabaritoPendingChanges();
      });
    }

    if (questoesPorColunaInput) {
      questoesPorColunaInput.addEventListener('change', function () {
        gabaritoQuestoesPorColuna = clampInt(parseInt(questoesPorColunaInput.value, 10), 1, 50, 10);
        questoesPorColunaInput.value = String(gabaritoQuestoesPorColuna);
        renderGabaritoQuestoesEditor();
        renderGabaritoPreview();
        renderA4LayoutEditor();
        markGabaritoPendingChanges();
      });
    }

    if (restaurarRespostasBtn) {
      restaurarRespostasBtn.addEventListener('click', function () {
        gabaritoQuestoesItens.forEach(function (item) { item.correta = ''; });
        renderGabaritoQuestoesEditor();
        renderGabaritoPreview();
        renderA4LayoutEditor();
        markGabaritoPendingChanges();
      });
    }

    // ---- Disciplinas / Habilidades list delegated events ----
    if (disciplinasHabilidadesListContainer) {
      disciplinasHabilidadesListContainer.addEventListener('change', function (event) {
        var sel = event.target.closest('.js-admin-disc-hb-disciplina');
        if (!sel) { return; }
        var qi = parseInt(sel.getAttribute('data-question-index'), 10);
        if (isNaN(qi) || qi < 0 || qi >= gabaritoQuestoesItens.length) { return; }
        gabaritoQuestoesItens[qi].disciplina = String(sel.value || '').trim();
        // ao trocar disciplina, limpa habilidade (pode ser de outra disciplina)
        gabaritoQuestoesItens[qi].habilidade = '';
        renderDisciplinasHabilidadesEditor();
        renderA4LayoutEditor();
        markGabaritoPendingChanges();
      });

      disciplinasHabilidadesListContainer.addEventListener('click', function (event) {
        var hbBtn = event.target.closest('.js-admin-disc-hb-select-habilidade');
        if (hbBtn) {
          var qi = parseInt(hbBtn.getAttribute('data-question-index'), 10);
          if (!isNaN(qi) && qi >= 0 && qi < gabaritoQuestoesItens.length) {
            openHabilidadeSelector(qi);
          }
          return;
        }

        var rmBtn = event.target.closest('.js-admin-disc-hb-remove-habilidade');
        if (rmBtn) {
          var rqi = parseInt(rmBtn.getAttribute('data-question-index'), 10);
          if (!isNaN(rqi) && rqi >= 0 && rqi < gabaritoQuestoesItens.length) {
            gabaritoQuestoesItens[rqi].habilidade = '';
            renderDisciplinasHabilidadesEditor();
            renderA4LayoutEditor();
            markGabaritoPendingChanges();
          }
          return;
        }
      });
    }

    // ---- Habilidade selector modal events ----
    if (habilidadeSelectorList) {
      habilidadeSelectorList.addEventListener('change', function (event) {
        var radio = event.target.closest('.js-admin-hb-radio');
        if (!radio) { return; }
        var val = String(radio.value || '').trim();
        habilidadeSelectorSelected = val !== '' ? [val] : [];
        updateHabilidadeSelectorCount();
      });
    }

    Array.prototype.forEach.call(habilidadeSelectorFilterButtons, function (btn) {
      btn.addEventListener('click', function () {
        habilidadeSelectorActiveFilter = btn.getAttribute('data-hb-filter') || 'todos';
        Array.prototype.forEach.call(habilidadeSelectorFilterButtons, function (b) {
          b.classList.toggle('active', b === btn);
        });
        var item = gabaritoQuestoesItens[habilidadeSelectorQuestionIndex] || {};
        var disciplinaId = String(item.disciplina || '').trim();
        var disciplinaNome = '';
        if (disciplinaId !== '') {
          var match = disciplinasOptions.filter(function (d) { return String(d.id) === disciplinaId; });
          if (match.length > 0) { disciplinaNome = match[0].nome; }
        }
        habilidadeFetchCache(function (cache) { renderHabilidadeSelectorList(cache, disciplinaNome); });
      });
    });

    if (habilidadeSelectorSearch) {
      habilidadeSelectorSearch.addEventListener('input', function () {
        var item = gabaritoQuestoesItens[habilidadeSelectorQuestionIndex] || {};
        var disciplinaId = String(item.disciplina || '').trim();
        var disciplinaNome = '';
        if (disciplinaId !== '') {
          var match = disciplinasOptions.filter(function (d) { return String(d.id) === disciplinaId; });
          if (match.length > 0) { disciplinaNome = match[0].nome; }
        }
        habilidadeFetchCache(function (cache) { renderHabilidadeSelectorList(cache, disciplinaNome); });
      });
    }

    if (habilidadeSelectorCustomAddBtn && habilidadeSelectorCustomInput) {
      function addCustomHabilidade() {
        var val = String(habilidadeSelectorCustomInput.value || '').trim();
        if (val === '') { return; }
        habilidadeSelectorSelected = [val];
        updateHabilidadeSelectorCount();
        habilidadeSelectorCustomInput.value = '';
      }
      habilidadeSelectorCustomAddBtn.addEventListener('click', addCustomHabilidade);
      habilidadeSelectorCustomInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addCustomHabilidade(); }
      });
    }

    if (habilidadeSelectorConfirmBtn) {
      habilidadeSelectorConfirmBtn.addEventListener('click', function () {
        var qi = habilidadeSelectorQuestionIndex;
        if (qi >= 0 && qi < gabaritoQuestoesItens.length) {
          gabaritoQuestoesItens[qi].habilidade = habilidadeSelectorSelected.length > 0 ? habilidadeSelectorSelected[0] : '';
          renderDisciplinasHabilidadesEditor();
          renderA4LayoutEditor();
          markGabaritoPendingChanges();
        }
        if (habilidadeSelectorBsModal) { habilidadeSelectorBsModal.hide(); }
      });
    }

    // ---- Layout tab: fundo (background) ----
    if (gabaritoFundoSelectBtn && gabaritoFundoArquivoInput) {
      gabaritoFundoSelectBtn.addEventListener('click', function () {
        gabaritoFundoArquivoInput.value = '';
        gabaritoFundoArquivoInput.click();
      });
    }

    if (gabaritoFundoArquivoInput) {
      gabaritoFundoArquivoInput.addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        if (!file) { return; }

        if (gabaritoFundoSelectBtn) {
          gabaritoFundoSelectBtn.disabled = true;
        }

        uploadLayoutAsset(file, getGabaritoBackgroundUploadUrl())
          .then(function (uploadedAsset) {
            setGabaritoBackground({
              path: String(uploadedAsset && uploadedAsset.path || '').trim(),
              url: String(uploadedAsset && uploadedAsset.url || '').trim(),
              cache_bust: String(Date.now()),
            });
            markGabaritoPendingChanges();
          })
          .catch(function (error) {
            alert(error && error.message ? error.message : 'Não foi possível enviar o plano de fundo.');
          })
          .finally(function () {
            if (gabaritoFundoSelectBtn) {
              gabaritoFundoSelectBtn.disabled = false;
            }
          });
      });
    }

    if (gabaritoFundoRemoveBtn) {
      gabaritoFundoRemoveBtn.addEventListener('click', function () {
        setGabaritoBackground({});
        markGabaritoPendingChanges();
      });
    }

    if (gabaritoFundoSetDefaultBtn) {
      gabaritoFundoSetDefaultBtn.addEventListener('click', function () {
        var csrfInput = form ? form.querySelector('input[name="csrf_token"]') : null;
        var csrfToken = csrfInput ? String(csrfInput.value || '').trim() : '';
        gabaritoFundoSetDefaultBtn.disabled = true;

        persistGabaritoBackgroundIfNeeded()
          .then(function () {
            var gabarito = {
              background: { path: gabaritoBackgroundPath, url: gabaritoBackgroundUrl, cache_bust: gabaritoBackgroundCacheBust },
              background_layout: { x: gabaritoBackgroundLayout.x, y: gabaritoBackgroundLayout.y, scale_x: gabaritoBackgroundLayout.scale_x, scale_y: gabaritoBackgroundLayout.scale_y },
            };
            var postBody = new URLSearchParams();
            postBody.set('csrf_token', csrfToken);
            postBody.set('action', 'save');
            postBody.set('gabarito', JSON.stringify(gabarito));

            return fetch(getDefaultGabaritoPresetUrl(), {
              method: 'POST',
              headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
              body: postBody.toString(),
            });
          })
          .then(function (res) { return res.json().catch(function () { return { ok: false, message: 'Resposta inválida.' }; }); })
          .then(function (payload) {
            if (payload && payload.ok && payload.preset) {
              defaultGabaritoPreset = payload.preset;
              updateDefaultGabaritoPresetUi();
            } else {
              alert(payload && payload.message ? payload.message : 'Não foi possível salvar o padrão.');
            }
          })
          .catch(function () { alert('Erro ao comunicar com o servidor.'); })
          .finally(function () { var hasBackground = gabaritoBackgroundPath !== '' || gabaritoBackgroundUrl !== ''; gabaritoFundoSetDefaultBtn.disabled = !hasBackground; });
      });
    }

    if (gabaritoFundoClearDefaultBtn) {
      gabaritoFundoClearDefaultBtn.addEventListener('click', function () {
        var csrfInput = form ? form.querySelector('input[name="csrf_token"]') : null;
        var csrfToken = csrfInput ? String(csrfInput.value || '').trim() : '';
        var postBody = new URLSearchParams();
        postBody.set('csrf_token', csrfToken);
        postBody.set('action', 'clear');
        gabaritoFundoClearDefaultBtn.disabled = true;
        fetch(getDefaultGabaritoPresetUrl(), {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: postBody.toString(),
        }).then(function (res) { return res.json().catch(function () { return { ok: false, message: 'Resposta inválida.' }; }); })
          .then(function (payload) {
            if (payload && payload.ok) {
              defaultGabaritoPreset = null;
              updateDefaultGabaritoPresetUi();
            } else {
              alert(payload && payload.message ? payload.message : 'Não foi possível remover o padrão.');
            }
          })
          .catch(function () { alert('Erro ao comunicar com o servidor.'); })
          .finally(function () { updateDefaultGabaritoPresetUi(); gabaritoFundoClearDefaultBtn.disabled = false; });
      });
    }

    // ---- Layout tab: imagens ----
    if (gabaritoImagemSelectBtn && gabaritoImagemArquivoInput) {
      gabaritoImagemSelectBtn.addEventListener('click', function () {
        gabaritoImagemArquivoInput.value = '';
        gabaritoImagemArquivoInput.click();
      });
    }

    if (gabaritoImagemArquivoInput) {
      gabaritoImagemArquivoInput.addEventListener('change', function () {
        var files = Array.prototype.slice.call(this.files || []);
        this.value = '';
        if (!files.length) { return; }
        var loaded = 0;
        files.forEach(function (file) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var url = String(e.target && e.target.result || '');
            if (url !== '') {
              var newItem = {
                id: 'gimg_' + Date.now() + '_' + String(Math.random()).slice(2, 8),
                path: '',
                url: url,
                cache_bust: '',
                x: 20,
                y: 20,
                width: 180,
                height: 120,
                rotation: 0,
                crop: { x: 0, y: 0, width: 1, height: 1 },
              };
              gabaritoImages.push(newItem);
              gabaritoSelectedImageId = newItem.id;
            }
            loaded += 1;
            if (loaded === files.length) {
              updateGabaritoImageButtons();
              renderGabaritoPreview();
              renderA4LayoutEditor();
              markGabaritoPendingChanges();
            }
          };
          reader.readAsDataURL(file);
        });
      });
    }

    if (gabaritoImagemLayerDownBtn) {
      gabaritoImagemLayerDownBtn.addEventListener('click', function () {
        var idx = -1;
        for (var i = 0; i < gabaritoImages.length; i += 1) { if (gabaritoImages[i].id === gabaritoSelectedImageId) { idx = i; break; } }
        if (idx <= 0) { return; }
        var temp = gabaritoImages[idx]; gabaritoImages[idx] = gabaritoImages[idx - 1]; gabaritoImages[idx - 1] = temp;
        renderGabaritoPreview(); renderA4LayoutEditor(); markGabaritoPendingChanges();
      });
    }

    if (gabaritoImagemLayerUpBtn) {
      gabaritoImagemLayerUpBtn.addEventListener('click', function () {
        var idx = -1;
        for (var i = 0; i < gabaritoImages.length; i += 1) { if (gabaritoImages[i].id === gabaritoSelectedImageId) { idx = i; break; } }
        if (idx < 0 || idx >= gabaritoImages.length - 1) { return; }
        var temp = gabaritoImages[idx]; gabaritoImages[idx] = gabaritoImages[idx + 1]; gabaritoImages[idx + 1] = temp;
        renderGabaritoPreview(); renderA4LayoutEditor(); markGabaritoPendingChanges();
      });
    }

    if (gabaritoImagemRotateLeftBtn) {
      gabaritoImagemRotateLeftBtn.addEventListener('click', function () {
        var img = getGabaritoImageById(gabaritoSelectedImageId);
        if (!img) { return; }
        img.rotation = normalizeGabaritoImageRotation((img.rotation || 0) - 90);
        renderGabaritoPreview(); renderA4LayoutEditor(); markGabaritoPendingChanges();
      });
    }

    if (gabaritoImagemRotateRightBtn) {
      gabaritoImagemRotateRightBtn.addEventListener('click', function () {
        var img = getGabaritoImageById(gabaritoSelectedImageId);
        if (!img) { return; }
        img.rotation = normalizeGabaritoImageRotation((img.rotation || 0) + 90);
        renderGabaritoPreview(); renderA4LayoutEditor(); markGabaritoPendingChanges();
      });
    }

    if (gabaritoImagemCropBtn) {
      gabaritoImagemCropBtn.addEventListener('click', function () {
        gabaritoCropModeImageId = (gabaritoCropModeImageId !== '' && gabaritoCropModeImageId === gabaritoSelectedImageId)
          ? '' : gabaritoSelectedImageId;
        renderA4LayoutEditor();
      });
    }

    if (gabaritoImagemCropResetBtn) {
      gabaritoImagemCropResetBtn.addEventListener('click', function () {
        var img = getGabaritoImageById(gabaritoSelectedImageId);
        if (!img) { return; }
        img.crop = { x: 0, y: 0, width: 1, height: 1 };
        renderGabaritoPreview(); renderA4LayoutEditor(); markGabaritoPendingChanges();
      });
    }

    if (gabaritoImagemDeleteBtn) {
      gabaritoImagemDeleteBtn.addEventListener('click', function () {
        var idx = -1;
        for (var i = 0; i < gabaritoImages.length; i += 1) { if (gabaritoImages[i].id === gabaritoSelectedImageId) { idx = i; break; } }
        if (idx < 0) { return; }
        gabaritoImages.splice(idx, 1);
        if (gabaritoCropModeImageId === gabaritoSelectedImageId) { gabaritoCropModeImageId = ''; }
        gabaritoSelectedImageId = '';
        updateGabaritoImageButtons();
        renderGabaritoPreview(); renderA4LayoutEditor(); markGabaritoPendingChanges();
      });
    }

    // ---- Layout tab: zoom do canvas A4 ----
    if (gabaritoZoomOutBtn) {
      gabaritoZoomOutBtn.addEventListener('click', function () {
        gabaritoCanvasZoom = clampFloat(gabaritoCanvasZoom - 0.1, 0.5, 2, 1);
        applyGabaritoCanvasZoom();
      });
    }

    if (gabaritoZoomResetBtn) {
      gabaritoZoomResetBtn.addEventListener('click', function () {
        gabaritoCanvasZoom = 1;
        applyGabaritoCanvasZoom();
      });
    }

    if (gabaritoZoomInBtn) {
      gabaritoZoomInBtn.addEventListener('click', function () {
        gabaritoCanvasZoom = clampFloat(gabaritoCanvasZoom + 0.1, 0.5, 2, 1);
        applyGabaritoCanvasZoom();
      });
    }

    // ---- Layout tab: pointer events no canvas A4 ----
    if (gabaritoA4EditorCanvas) {
      gabaritoA4EditorCanvas.addEventListener('pointerdown', handleA4EditorPointerDown);
      gabaritoA4EditorCanvas.addEventListener('pointermove', handleA4EditorPointerMove);
      gabaritoA4EditorCanvas.addEventListener('pointerup', handleA4EditorPointerUp);
      gabaritoA4EditorCanvas.addEventListener('pointercancel', handleA4EditorPointerUp);
    }

    // ---- Botão Salvar Alterações ----
    if (gabaritoSaveButton) {
      gabaritoSaveButton.addEventListener('click', function () {
        saveCurrentGabaritoToDatabase(false, 'Configurações salvas com sucesso.', false);
      });
    }

    // ---- Aba Impressão: botões e busca ----
    if (impressaoSearchInput) {
      impressaoSearchInput.addEventListener('input', function () {
        applyImpressaoPreviewFilter();
      });
    }

    if (impressaoTurmasTodasBtn) {
      impressaoTurmasTodasBtn.addEventListener('click', function () {
        var turmaOptions = getImpressaoTurmaOptions();
        selectedImpressaoTurmasIds = turmaOptions.map(function (item) { return item.id; });
        renderImpressaoTurmasSelector();
        renderImpressaoPreviewIfVisible();
      });
    }

    if (impressaoTurmasNenhumaBtn) {
      impressaoTurmasNenhumaBtn.addEventListener('click', function () {
        selectedImpressaoTurmasIds = [];
        renderImpressaoTurmasSelector();
        renderImpressaoPreviewIfVisible();
      });
    }

    if (impressaoAtualizarBtn) {
      impressaoAtualizarBtn.addEventListener('click', function () {
        renderImpressaoPreview();
      });
    }

    if (impressaoImprimirBtn) {
      impressaoImprimirBtn.addEventListener('click', function () {
        openImpressaoWindow();
      });
    }

    // ---- Visibilidade da save bar ao trocar de tab + sync entre abas ----
    var _dashboardTabsEl = document.getElementById('adminAvaliacaoDashboardTabs');
    if (_dashboardTabsEl) {
      _dashboardTabsEl.addEventListener('shown.bs.tab', function (e) {
        updateDashboardSaveButtonVisibility();
        var targetId = e.target ? String(e.target.getAttribute('data-bs-target') || '') : '';
        if (targetId === '#adminAvaliacaoDashboardPaneGabarito') {
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
          renderA4LayoutEditor();
        } else if (targetId === '#adminAvaliacaoDashboardPaneImpressao') {
          renderImpressaoTurmasSelector();
          renderImpressaoPreviewIfVisible();
        }
      });
    }
    updateDashboardSaveButtonVisibility();

    // ---- Sync ao trocar sub-aba de Configurações ----
    var _gabaritoSubtabsEl = document.getElementById('adminAvaliacaoGabaritoSubtabs');
    if (_gabaritoSubtabsEl) {
      _gabaritoSubtabsEl.addEventListener('shown.bs.tab', function (e) {
        var targetId = e.target ? String(e.target.getAttribute('data-bs-target') || '') : '';
        if (targetId === '#adminAvaliacaoGabaritoSubpaneLayout') {
          renderA4LayoutEditor();
        } else if (targetId === '#adminAvaliacaoGabaritoSubpaneDisciplinas') {
          renderDisciplinasHabilidadesEditor();
        } else if (targetId === '#adminAvaliacaoGabaritoSubpaneMarcacao') {
          renderGabaritoQuestoesEditor();
          renderGabaritoPreview();
        }
      });
    }

    window.__adminAvaliacoesCorrecaoApi = {
      beginCorrecaoFlow: beginCorrecaoFlow,
      closeCorrecaoModal: closeCorrecaoModal,
      captureAndCorrectCurrentSheet: captureAndCorrectCurrentSheet,
      proceedCorrecaoToGabarito: proceedCorrecaoToGabarito,
      goToNextCorrecaoQr: goToNextCorrecaoQr,
      retryCorrecaoForCurrentTarget: retryCorrecaoForCurrentTarget,
      saveCorrecaoStatusForCurrentTarget: saveCorrecaoStatusForCurrentTarget,
      processGabaritoManually: processGabaritoManually,
      loadCorrecoesList: loadCorrecoesList,
      startCorrecoesPolling: startCorrecoesPolling,
      stopCorrecoesPolling: stopCorrecoesPolling,
      renderCorrecoesRoster: renderCorrecoesRoster,
      getCorrecaoRowById: getCorrecaoRowById,
      openCorrecaoEdicaoModal: openCorrecaoEdicaoModal,
      deleteCorrecaoById: deleteCorrecaoById,
      submitCorrecaoDiscursivaModal: submitCorrecaoDiscursivaModal,
      cancelCorrecaoDiscursivaModal: cancelCorrecaoDiscursivaModal,
      confirmCorrecaoRevisaoModal: confirmCorrecaoRevisaoModal,
      cancelCorrecaoRevisaoModal: cancelCorrecaoRevisaoModal,
      submitCorrecaoEdicaoModal: submitCorrecaoEdicaoModal,
      submitCorrecaoEdicaoQuickStatus: submitCorrecaoEdicaoQuickStatus,
      closeCorrecaoEdicaoModal: closeCorrecaoEdicaoModal,
      getCameraDeps: getCorrecaoCameraDeps,
      getElements: function () {
        return {
          dashboardModalElement: dashboardModalElement,
          dashboardTabsElement: document.getElementById('adminAvaliacaoDashboardTabs'),
          dashboardCorrecaoTab: dashboardCorrecaoTab,
          correcaoPane: correcaoPane,
          correcaoStartBtn: correcaoStartBtn,
          correcaoStopBtn: correcaoStopBtn,
          correcaoCaptureBtn: correcaoCaptureBtn,
          correcaoConfirmBtn: correcaoConfirmBtn,
          correcaoZeroBtn: correcaoZeroBtn,
          correcaoAbsentBtn: correcaoAbsentBtn,
          correcaoNextBtn: correcaoNextBtn,
          correcaoRetryBtn: correcaoRetryBtn,
          correcaoProcessBtn: correcaoProcessBtn,
          correcaoRefreshBtn: correcaoRefreshBtn,
          correcaoTableBody: correcaoTableBody,
          correcaoRosterBody: correcaoRosterBody,
          correcaoRosterSearchInput: correcaoRosterSearchInput,
          correcaoDiscursivaModalElement: correcaoDiscursivaModalElement,
          correcaoDiscursivaSaveBtn: correcaoDiscursivaSaveBtn,
          correcaoDiscursivaCancelBtn: correcaoDiscursivaCancelBtn,
          correcaoRevisaoModalElement: correcaoRevisaoModalElement,
          correcaoRevisaoSaveBtn: correcaoRevisaoSaveBtn,
          correcaoRevisaoCancelBtn: correcaoRevisaoCancelBtn,
          correcaoEdicaoModalElement: correcaoEdicaoModalElement,
          correcaoEdicaoBlankBtn: correcaoEdicaoBlankBtn,
          correcaoEdicaoAbsentBtn: correcaoEdicaoAbsentBtn,
          correcaoEdicaoSaveBtn: correcaoEdicaoSaveBtn,
          correcaoEdicaoCancelBtn: correcaoEdicaoCancelBtn,
        };
      },
    };

    if (typeof window.__initAdminAvaliacaoCorrecaoModule === 'function') {
      window.__initAdminAvaliacaoCorrecaoModule(window.__adminAvaliacoesCorrecaoApi);
    }

  };
}());