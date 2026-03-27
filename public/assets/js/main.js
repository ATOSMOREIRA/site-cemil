document.addEventListener('DOMContentLoaded', function () {
  (function suppressInstagramConsoleNoise() {
    var patterns = [
      /Permissions policy violation:\s*unload/i,
      /X-Frame-Options/i,
    ];

    ['warn', 'error'].forEach(function (method) {
      var original = console[method];

      if (typeof original !== 'function') {
        return;
      }

      console[method] = function () {
        var args = Array.prototype.slice.call(arguments);
        var message = args
          .map(function (value) {
            return typeof value === 'string' ? value : '';
          })
          .join(' ');

        if (patterns.some(function (pattern) { return pattern.test(message); })) {
          return;
        }

        return original.apply(console, args);
      };
    });
  })();

  var yearElement = document.getElementById('currentYear');
  var sidebarToggleButton = document.getElementById('sidebarMenuToggle');
  var mobileMenuElement = document.getElementById('mobileMenu');
  var instagramManageModalElement = document.getElementById('instagramManageModal');
  var instagramManageValidCountElement = document.getElementById('instagramManageValidCount');
  var instagramManageLinkInputs = document.querySelectorAll('.js-instagram-manage-link');
  var instagramPostsWrapperElement = document.getElementById('instagramPostsWrapper');
  var instagramPostsContainerElement = document.getElementById('instagramPostsContainer');
  var instagramPostsEmptyElement = document.getElementById('instagramPostsEmpty');
  var instagramPostsSkeletonElement = document.getElementById('instagramPostsSkeleton');
  var instagramPreviewModalElement = document.getElementById('instagramPreviewModal');
  var instagramPreviewTitleElement = document.getElementById('instagramPreviewTitle');
  var instagramPreviewFrameElement = document.getElementById('instagramPreviewFrame');
  var instagramPreviewLinkElement = document.getElementById('instagramPreviewLink');
  var instagramPostsRenderDelayMs = 180;
  var instagramPostsRenderToken = 0;
  var institutionalServiceSearchInput = document.getElementById('institutionalServiceSearch');
  var institutionalServiceItems = document.querySelectorAll('.js-institutional-service-item');
  var institutionalServiceSearchEmpty = document.getElementById('institutionalServiceSearchEmpty');
  var adminPanelSearchInput = document.getElementById('adminPanelSearch');
  var adminPanelItems = document.querySelectorAll('.js-admin-panel-item');
  var adminPanelSearchEmpty = document.getElementById('adminPanelSearchEmpty');
  var adminPanelModalElement = document.getElementById('adminPanelModal');
  var adminPanelModalTitleElement = document.getElementById('adminPanelModalLabel');
  var adminPanelModalBodyElement = document.getElementById('adminPanelModalBody');
  var adminPanelModalTriggerButtons = document.querySelectorAll('.js-admin-modal-trigger');
  var myProfileModalElement = document.getElementById('myProfileModal');
  var myProfileFormElement = document.getElementById('myProfileForm');
  var myProfileNomeInput = document.getElementById('myProfileNome');
  var myProfileEmailInput = document.getElementById('myProfileEmail');
  var myProfileCpfInput = document.getElementById('myProfileCpf');
  var myProfileUsuarioInput = document.getElementById('myProfileUsuario');
  var myProfileSenhaInput = document.getElementById('myProfileSenha');
  var myProfileSubmitButton = document.getElementById('myProfileSubmitButton');
  var myProfileTriggerButtons = document.querySelectorAll('.js-open-profile-modal');
  var informacoesSearchInput = document.getElementById('informacoesBuscaTempoReal');
  var informacoesFiltersForm = document.getElementById('informacoesFiltrosForm');
  var informacoesFilterMonthSelect = document.getElementById('informacoesFiltroMes');
  var informacoesFilterYearSelect = document.getElementById('informacoesFiltroAno');
  var informacoesPostItems = document.querySelectorAll('.js-informacoes-post-item');
  var informacoesSearchEmpty = document.getElementById('informacoesBuscaSemResultados');
  var informacoesPublicPostsContainer = document.getElementById('informacoesPublicPostsContainer');
  var informacoesTotalEncontrado = document.getElementById('informacoesTotalEncontrado');
  var informacoesPaginacao = document.getElementById('informacoesPaginacao');
  var informacoesAdminModalBody = document.getElementById('informacoesAdminModalBody');
  var iframeModalGlobalBackdrop = null;
  var iframeModalOpenCount = 0;
  var iframeModalMonitorTimer = null;
  var adminPanelActiveView = '';
  var globalStatusBannerElement = document.getElementById('globalStatusBanner');
  var globalStatusTimer = null;
  var mobileMenuInstance = null;
  var instagramPreviewModalInstance = null;
  var myProfileModalInstance = null;
  var sidebarStateKey = 'sidebarCollapsedDesktop';
  var institutionalExpandedStateKey = 'institutionalExpandedCollapseId:' + String(window.location.pathname || '/');

  function resolveBasePathForEndpointBuilder() {
    var pathname = String(window.location.pathname || '');
    var indexPhpPos = pathname.indexOf('/index.php/');

    if (indexPhpPos >= 0) {
      return pathname.slice(0, indexPhpPos);
    }

    return '';
  }

  function buildEndpointPath(path) {
    var base = resolveBasePathForEndpointBuilder();
    var normalizedPath = String(path || '');
    var pathname = String(window.location.pathname || '');

    if (pathname.indexOf('/index.php/') >= 0) {
      return base + '/index.php' + normalizedPath;
    }

    return base + normalizedPath;
  }

  window.appResolveBasePath = resolveBasePathForEndpointBuilder;
  window.appBuildEndpoint = buildEndpointPath;

  function ensureIframeModalGlobalBackdrop() {
    if (iframeModalGlobalBackdrop && iframeModalGlobalBackdrop.isConnected) {
      return iframeModalGlobalBackdrop;
    }

    var existing = document.getElementById('globalIframeModalBackdrop');
    if (existing) {
      iframeModalGlobalBackdrop = existing;
      return iframeModalGlobalBackdrop;
    }

    var backdrop = document.createElement('div');
    backdrop.id = 'globalIframeModalBackdrop';
    backdrop.className = 'global-iframe-modal-backdrop';
    document.body.appendChild(backdrop);
    iframeModalGlobalBackdrop = backdrop;
    return iframeModalGlobalBackdrop;
  }

  function findIframeByContentWindow(targetWindow) {
    if (!targetWindow) {
      return null;
    }

    var iframes = document.querySelectorAll('iframe');
    for (var index = 0; index < iframes.length; index += 1) {
      var iframe = iframes[index];
      if (iframe && iframe.contentWindow === targetWindow) {
        return iframe;
      }
    }

    return null;
  }

  function findIframeModalHost(frame) {
    if (!frame || typeof frame.closest !== 'function') {
      return null;
    }

    return frame.closest('.admin-embedded-frame-wrap, .institucional-corretor-frame-wrap, .border.rounded.overflow-hidden');
  }

  function getEmbeddedFrameContentHeight(frame) {
    if (!frame) {
      return 0;
    }

    try {
      var frameDocument = frame.contentDocument;
      if (!frameDocument) {
        return 0;
      }

      var body = frameDocument.body;
      var documentElement = frameDocument.documentElement;

      return Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        documentElement ? documentElement.scrollHeight : 0,
        documentElement ? documentElement.offsetHeight : 0
      );
    } catch (error) {
      return 0;
    }
  }

  function syncEmbeddedFrameHeight(frame, explicitHeight) {
    if (!frame) {
      return;
    }

    var nextHeight = Number(explicitHeight || 0);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
      nextHeight = getEmbeddedFrameContentHeight(frame);
    }

    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
      return;
    }

    frame.style.height = Math.max(120, Math.ceil(nextHeight)) + 'px';
  }

  function scheduleEmbeddedFrameHeightSync(frame) {
    if (!frame) {
      return;
    }

    [0, 120, 320, 700].forEach(function (delay) {
      window.setTimeout(function () {
        syncEmbeddedFrameHeight(frame);
      }, delay);
    });
  }

  function updateIframeModalGlobalBackdropVisibility() {
    var backdrop = ensureIframeModalGlobalBackdrop();
    backdrop.classList.toggle('is-visible', iframeModalOpenCount > 0);
  }

  function isIframeModalOpen(frame) {
    if (!frame) {
      return false;
    }

    try {
      var frameDocument = frame.contentDocument;
      if (!frameDocument) {
        return false;
      }

      return frameDocument.querySelector('.modal.show') !== null;
    } catch (error) {
      return false;
    }
  }

  function syncIframeModalOverlayState() {
    var frames = document.querySelectorAll('iframe');
    var openCount = 0;

    frames.forEach(function (frame) {
      var hasOpenModal = isIframeModalOpen(frame);
      var host = findIframeModalHost(frame);

      if (hasOpenModal) {
        openCount += 1;
        frame.classList.add('iframe-modal-active');
        if (host) {
          host.classList.add('iframe-modal-host-active');
        }
      } else {
        frame.classList.remove('iframe-modal-active');
        if (host) {
          host.classList.remove('iframe-modal-host-active');
        }
      }
    });

    iframeModalOpenCount = openCount;
    updateIframeModalGlobalBackdropVisibility();
  }

  function startIframeModalMonitor() {
    if (iframeModalMonitorTimer) {
      return;
    }

    iframeModalMonitorTimer = window.setInterval(syncIframeModalOverlayState, 200);
  }

  function setIframeModalState(frame, isOpen) {
    if (!frame) {
      return;
    }

    var frameCount = Number(frame.getAttribute('data-modal-open-count') || 0);
    var host = findIframeModalHost(frame);

    if (isOpen) {
      frameCount += 1;
      iframeModalOpenCount += 1;
      frame.setAttribute('data-modal-open-count', String(frameCount));
      frame.classList.add('iframe-modal-active');
      if (host) {
        host.classList.add('iframe-modal-host-active');
      }
      updateIframeModalGlobalBackdropVisibility();
      return;
    }

    if (frameCount <= 0) {
      return;
    }

    frameCount -= 1;
    iframeModalOpenCount = Math.max(0, iframeModalOpenCount - 1);

    if (frameCount > 0) {
      frame.setAttribute('data-modal-open-count', String(frameCount));
    } else {
      frame.removeAttribute('data-modal-open-count');
      frame.classList.remove('iframe-modal-active');
      if (host) {
        host.classList.remove('iframe-modal-host-active');
      }
    }

    updateIframeModalGlobalBackdropVisibility();
  }

  window.addEventListener('message', function (event) {
    var data = event && event.data ? event.data : null;
    if (!data || !data.type) {
      return;
    }

    var iframe = findIframeByContentWindow(event.source);
    if (!iframe) {
      return;
    }

    if (data.type === 'cemil:iframe-content-height') {
      syncEmbeddedFrameHeight(iframe, Number(data.height || 0));
      return;
    }

    if (data.type === 'cemil:print-blob') {
      /* Abrir o tab de impressão a partir da janela de nível superior evita que
         o window.print() do novo tab bloqueie o processo do iframe. */
      var htmlStr = typeof data.html === 'string' ? data.html : '';
      if (htmlStr !== '') {
        try {
          var printBlob = new Blob([htmlStr], { type: 'text/html; charset=utf-8' });
          var printUrl = URL.createObjectURL(printBlob);
          var printTab = window.open(printUrl, '_blank');
          if (printTab) {
            printTab.addEventListener('unload', function () { URL.revokeObjectURL(printUrl); });
          } else {
            URL.revokeObjectURL(printUrl);
          }
        } catch (err) {}
      }
      return;
    }

    if (data.type === 'cemil:iframe-cam-active') {
      var camHost = findIframeModalHost(iframe);
      if (Boolean(data.isActive)) {
        iframe.classList.add('iframe-cam-fullscreen');
        if (camHost) { camHost.classList.add('iframe-cam-fullscreen-host'); }
      } else {
        iframe.classList.remove('iframe-cam-fullscreen');
        if (camHost) { camHost.classList.remove('iframe-cam-fullscreen-host'); }
      }
      return;
    }

    if (data.type !== 'cemil:iframe-modal-state') {
      return;
    }

    setIframeModalState(iframe, Boolean(data.isOpen));
  });

  ensureIframeModalGlobalBackdrop();
  startIframeModalMonitor();

  function normalizeSearchValue(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function collapseInstitutionalItem(item) {
    var collapseElement = item.querySelector('.institutional-service-collapse');
    if (!collapseElement) {
      return;
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
      bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false }).hide();
      return;
    }

    collapseElement.classList.remove('show');
  }

  function saveInstitutionalExpandedCollapseId(collapseId) {
    try {
      var value = String(collapseId || '').trim();
      if (value === '') {
        sessionStorage.removeItem(institutionalExpandedStateKey);
        return;
      }

      sessionStorage.setItem(institutionalExpandedStateKey, value);
    } catch (error) {
    }
  }

  function getInstitutionalExpandedCollapseId() {
    try {
      return String(sessionStorage.getItem(institutionalExpandedStateKey) || '').trim();
    } catch (error) {
      return '';
    }
  }

  function bindInstitutionalAccordionPersistence() {
    if (!institutionalServiceItems.length) {
      return;
    }

    var collapseElements = document.querySelectorAll('.institutional-service-collapse');
    if (!collapseElements.length) {
      return;
    }

    collapseElements.forEach(function (collapseElement) {
      collapseElement.addEventListener('shown.bs.collapse', function () {
        saveInstitutionalExpandedCollapseId(collapseElement.id || '');
      });

      collapseElement.addEventListener('hidden.bs.collapse', function () {
        var current = getInstitutionalExpandedCollapseId();
        if (current !== '' && current === String(collapseElement.id || '')) {
          saveInstitutionalExpandedCollapseId('');
        }
      });
    });
  }

  function restoreInstitutionalAccordionState() {
    if (!institutionalServiceItems.length) {
      return;
    }

    var collapseId = getInstitutionalExpandedCollapseId();
    if (collapseId === '') {
      return;
    }

    var collapseElement = document.getElementById(collapseId);
    if (!collapseElement || !collapseElement.classList.contains('institutional-service-collapse')) {
      saveInstitutionalExpandedCollapseId('');
      return;
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
      bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false }).show();
      return;
    }

    collapseElement.classList.add('show');
  }

  function filterInstitutionalServices() {
    if (!institutionalServiceSearchInput || !institutionalServiceItems.length) {
      return;
    }

    var term = normalizeSearchValue(institutionalServiceSearchInput.value);
    var visibleCount = 0;

    institutionalServiceItems.forEach(function (item) {
      var text = normalizeSearchValue(item.getAttribute('data-search-text'));
      var isMatch = term === '' || text.indexOf(term) !== -1;

      item.classList.toggle('d-none', !isMatch);

      if (isMatch) {
        visibleCount += 1;
      }

      if (!isMatch) {
        collapseInstitutionalItem(item);
      }
    });

    if (institutionalServiceSearchEmpty) {
      var shouldShowEmpty = term !== '' && visibleCount === 0;
      institutionalServiceSearchEmpty.classList.toggle('d-none', !shouldShowEmpty);
    }
  }

  function filterAdminPanelItems() {
    if (!adminPanelSearchInput || !adminPanelItems.length) {
      return;
    }

    var term = normalizeSearchValue(adminPanelSearchInput.value);
    var visibleCount = 0;

    adminPanelItems.forEach(function (item) {
      var text = normalizeSearchValue(item.getAttribute('data-search-text'));
      var isMatch = term === '' || text.indexOf(term) !== -1;

      item.classList.toggle('d-none', !isMatch);

      if (isMatch) {
        visibleCount += 1;
      }
    });

    if (adminPanelSearchEmpty) {
      var shouldShowEmpty = term !== '' && visibleCount === 0;
      adminPanelSearchEmpty.classList.toggle('d-none', !shouldShowEmpty);
    }
  }

  function filterInformacoesPosts() {
    if (!informacoesSearchInput) {
      return;
    }

    var term = normalizeSearchValue(informacoesSearchInput.value);
    var selectedMonth = informacoesFilterMonthSelect ? String(informacoesFilterMonthSelect.value || '').trim() : '';
    var selectedYear = informacoesFilterYearSelect ? String(informacoesFilterYearSelect.value || '').trim() : '';
    var visibleCount = 0;

    informacoesPostItems.forEach(function (item) {
      var text = normalizeSearchValue(item.getAttribute('data-search-text'));
      var itemMonth = String(item.getAttribute('data-post-month') || '').trim();
      var itemYear = String(item.getAttribute('data-post-year') || '').trim();
      var matchesSearch = term === '' || text.indexOf(term) !== -1;
      var matchesMonth = selectedMonth === '' || itemMonth === selectedMonth;
      var matchesYear = selectedYear === '' || itemYear === selectedYear;
      var isMatch = matchesSearch && matchesMonth && matchesYear;

      item.classList.toggle('d-none', !isMatch);

      if (isMatch) {
        visibleCount += 1;
      }
    });

    if (informacoesTotalEncontrado) {
      informacoesTotalEncontrado.textContent = 'Total encontrado: ' + visibleCount + ' publica' + (visibleCount === 1 ? 'cao.' : 'coes.');
    }

    if (informacoesSearchEmpty) {
      var hasActiveFilters = term !== '' || selectedMonth !== '' || selectedYear !== '';
      var shouldShowEmpty = hasActiveFilters && visibleCount === 0;
      informacoesSearchEmpty.classList.toggle('d-none', !shouldShowEmpty);
    }

    if (informacoesPaginacao) {
      var hasClientFilter = term !== '' || selectedMonth !== '' || selectedYear !== '';
      informacoesPaginacao.classList.toggle('d-none', hasClientFilter);
    }
  }

  function refreshInformacoesSearchRefs() {
    informacoesSearchInput = document.getElementById('informacoesBuscaTempoReal');
    informacoesFiltersForm = document.getElementById('informacoesFiltrosForm');
    informacoesFilterMonthSelect = document.getElementById('informacoesFiltroMes');
    informacoesFilterYearSelect = document.getElementById('informacoesFiltroAno');
    informacoesPostItems = document.querySelectorAll('.js-informacoes-post-item');
    informacoesSearchEmpty = document.getElementById('informacoesBuscaSemResultados');
    informacoesPublicPostsContainer = document.getElementById('informacoesPublicPostsContainer');
    informacoesTotalEncontrado = document.getElementById('informacoesTotalEncontrado');
    informacoesPaginacao = document.getElementById('informacoesPaginacao');
    informacoesAdminModalBody = document.getElementById('informacoesAdminModalBody');
  }

  function showGlobalStatus(message, isError) {
    if (!globalStatusBannerElement) {
      return;
    }

    var text = String(message || '').trim();
    if (text === '') {
      return;
    }

    if (globalStatusTimer) {
      window.clearTimeout(globalStatusTimer);
      globalStatusTimer = null;
    }

    globalStatusBannerElement.textContent = text;
    globalStatusBannerElement.classList.remove('d-none', 'is-success', 'is-error');
    globalStatusBannerElement.classList.add(isError ? 'is-error' : 'is-success');

    globalStatusTimer = window.setTimeout(function () {
      globalStatusBannerElement.classList.add('d-none');
      globalStatusBannerElement.classList.remove('is-success', 'is-error');
      globalStatusBannerElement.textContent = '';
    }, 2000);
  }

  function loadAdminPanelModalContent(view, title) {
    var endpoint = adminPanelModalElement ? (adminPanelModalElement.getAttribute('data-content-endpoint') || '').trim() : '';

    if (!adminPanelModalElement || !adminPanelModalBodyElement || endpoint === '' || String(view || '').trim() === '') {
      return Promise.resolve(false);
    }

    adminPanelActiveView = String(view || '').trim();

    if (adminPanelModalTitleElement && String(title || '').trim() !== '') {
      adminPanelModalTitleElement.textContent = String(title);
    }

    adminPanelModalBodyElement.innerHTML = '<p class="text-secondary mb-0">Carregando...</p>';

    return fetch(endpoint + '?view=' + encodeURIComponent(adminPanelActiveView), {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Falha ao carregar conteúdo.');
        }

        return response.text();
      })
      .then(function (html) {
        adminPanelModalBodyElement.innerHTML = html;
        bindAdminUsersModalContent();
        bindAdminServicesSubservicesModalContent();
        bindAdminFerramentasAdministrativasModalContent();
        bindAdminInformacoesModalContent();
        bindAdminAvaliacoesModalContent();
        bindAdminInstitutionalFramesModalContent();
        return true;
      })
      .catch(function () {
        adminPanelModalBodyElement.innerHTML = '<div class="alert alert-danger mb-0" role="alert">Erro ao carregar conteúdo do modal.</div>';
        return false;
      });
  }

  function bindAdminInstitutionalFramesModalContent() {
    var frameBindings = [
      { id: 'adminGerenciamentoTurmasFrame', key: 'cadastro_de_turmas' },
      { id: 'adminGerenciamentoEstudantesFrame', key: 'cadastro_de_estudantes' },
    ];

    var buildEndpoint = typeof window.appBuildEndpoint === 'function'
      ? window.appBuildEndpoint
      : function (path) { return String(path || ''); };

    frameBindings.forEach(function (binding) {
      var frame = document.getElementById(binding.id);
      if (!frame) {
        return;
      }

      if (frame.dataset.heightSyncBound !== '1') {
        frame.dataset.heightSyncBound = '1';
        frame.addEventListener('load', function () {
          scheduleEmbeddedFrameHeightSync(frame);
        });
      }

      var currentSrc = String(frame.getAttribute('src') || '').trim();
      if (currentSrc !== '') {
        scheduleEmbeddedFrameHeightSync(frame);
        return;
      }

      var key = String(frame.getAttribute('data-subservice-key') || binding.key || '').trim();
      if (key === '') {
        return;
      }

      frame.src = buildEndpoint('/institucional/subservico/conteudo?key=' + encodeURIComponent(key) + '&standalone=1');
    });
  }

  function runAdminModalPostLoadAction(triggerButton, view) {
    if (!triggerButton || String(view || '') !== 'gerenciamento_avaliacoes') {
      return;
    }

    var action = String(triggerButton.getAttribute('data-modal-action') || '').trim().toLowerCase();
    if (action === '') {
      return;
    }

    function closeAdminPanelModal() {
      if (!adminPanelModalElement || typeof bootstrap === 'undefined' || !bootstrap.Modal) {
        return;
      }

      var panelInstance = bootstrap.Modal.getInstance(adminPanelModalElement)
        || bootstrap.Modal.getOrCreateInstance(adminPanelModalElement);

      if (panelInstance) {
        panelInstance.hide();
      }
    }

    if (action === 'new') {
      var newButton = document.querySelector('.js-admin-avaliacao-new');
      if (newButton) {
        newButton.click();
        window.setTimeout(closeAdminPanelModal, 0);
      }
      return;
    }

    var avaliacaoId = Number(triggerButton.getAttribute('data-modal-avaliacao-id') || 0);
    if (avaliacaoId <= 0) {
      return;
    }

    if (action === 'edit') {
      var editButton = document.querySelector('.js-admin-avaliacao-edit[data-id="' + avaliacaoId + '"]');
      if (editButton) {
        editButton.click();
        window.setTimeout(closeAdminPanelModal, 0);
      }
      return;
    }

    if (action === 'copy') {
      var copyButton = document.querySelector('.js-admin-avaliacao-copy[data-id="' + avaliacaoId + '"]');
      if (copyButton) {
        copyButton.click();
        window.setTimeout(closeAdminPanelModal, 0);
      }
      return;
    }

    if (action === 'delete') {
      var idInput = document.querySelector('.js-admin-avaliacao-delete-form input[name="id"][value="' + avaliacaoId + '"]');
      if (!idInput) {
        return;
      }

      var deleteForm = idInput.closest('.js-admin-avaliacao-delete-form');
      if (!deleteForm) {
        return;
      }

      var deleteTrigger = deleteForm.querySelector('.js-admin-avaliacao-delete-trigger');
      if (deleteTrigger) {
        deleteTrigger.click();
      }
    }
  }

  function bindAdminUsersModalContent() {
    var form = document.getElementById('adminUsersForm');
    if (!form) {
      return;
    }

    var idInput = document.getElementById('adminUserId');
    var nomeInput = document.getElementById('adminUserNome');
    var usuarioInput = document.getElementById('adminUserUsuario');
    var emailInput = document.getElementById('adminUserEmail');
    var cpfInput = document.getElementById('adminUserCpf');
    var senhaInput = document.getElementById('adminUserSenha');
    var cargaHorariaInput = document.getElementById('adminUserCargaHoraria');
    var tipoInput = document.getElementById('adminUserTipo');
    var departamentoInput = document.getElementById('adminUserDepartamento');
    var funcaoInput = document.getElementById('adminUserFuncao');
    var servicosInput = document.getElementById('adminUserServicos');
    var submitButton = document.getElementById('adminUsersSubmitButton');
    var resetButton = document.getElementById('adminUsersResetButton');
    var formModalElement = document.getElementById('adminUserFormModal');
    var formModalTitle = document.getElementById('adminUserFormModalLabel');
    var servicesButton = document.getElementById('adminUserServicesButton');
    var servicesSummary = document.getElementById('adminUserServicesSummary');
    var servicesModalElement = document.getElementById('adminUserServicesModal');
    var servicesApplyButton = document.getElementById('adminUserServicesApplyButton');
    var serviceCheckboxes = document.querySelectorAll('.js-user-service-checkbox');
    var subserviceCheckboxes = document.querySelectorAll('.js-user-subservice-checkbox');
    var newButton = document.querySelector('.js-admin-user-new');
    var tableSearchInput = document.getElementById('adminUsersTableSearch');
    var tableRows = document.querySelectorAll('.js-admin-users-row');
    var tableEmpty = document.getElementById('adminUsersTableEmpty');
    var deleteConfirmModalElement = document.getElementById('adminUserDeleteConfirmModal');
    var deleteConfirmTextElement = document.getElementById('adminUserDeleteConfirmText');
    var deleteConfirmButton = document.getElementById('adminUserDeleteConfirmButton');
    var formModalInstance = null;
    var servicesModalInstance = null;
    var deleteConfirmModalInstance = null;
    var pendingDeleteForm = null;

    if (formModalElement && formModalElement.parentElement !== document.body) {
      var existingFormModal = document.body.querySelector('#adminUserFormModal');
      if (existingFormModal && existingFormModal !== formModalElement) {
        existingFormModal.remove();
      }

      document.body.appendChild(formModalElement);
    }

    if (deleteConfirmModalElement && deleteConfirmModalElement.parentElement !== document.body) {
      var existingDeleteConfirmModal = document.body.querySelector('#adminUserDeleteConfirmModal');
      if (existingDeleteConfirmModal && existingDeleteConfirmModal !== deleteConfirmModalElement) {
        existingDeleteConfirmModal.remove();
      }

      document.body.appendChild(deleteConfirmModalElement);
    }

    if (servicesModalElement && servicesModalElement.parentElement !== document.body) {
      var existingServicesModal = document.body.querySelector('#adminUserServicesModal');
      if (existingServicesModal && existingServicesModal !== servicesModalElement) {
        existingServicesModal.remove();
      }

      document.body.appendChild(servicesModalElement);
    }

    if (formModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      formModalInstance = bootstrap.Modal.getOrCreateInstance(formModalElement, {
        backdrop: 'static',
      });
    }

    if (deleteConfirmModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      deleteConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(deleteConfirmModalElement, {
        backdrop: 'static',
      });
    }

    if (servicesModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      servicesModalInstance = bootstrap.Modal.getOrCreateInstance(servicesModalElement, {
        backdrop: 'static',
      });
    }

    function markUserModalBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      var latestBackdrop = backdrops[backdrops.length - 1];
      latestBackdrop.classList.add('admin-user-form-backdrop');
    }

    function markDeleteConfirmBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      var latestBackdrop = backdrops[backdrops.length - 1];
      latestBackdrop.classList.add('admin-user-confirm-backdrop');
    }

    function markServicesBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      var latestBackdrop = backdrops[backdrops.length - 1];
      latestBackdrop.classList.add('admin-user-services-backdrop');
    }

    function openUserFormModal() {
      if (!formModalInstance) {
        return;
      }

      formModalInstance.show();
      setTimeout(markUserModalBackdrop, 0);
    }

    function openDeleteConfirmModal(deleteForm, userName) {
      if (!deleteConfirmModalInstance || !deleteForm) {
        return;
      }

      pendingDeleteForm = deleteForm;

      if (deleteConfirmTextElement) {
        var safeName = String(userName || '').trim();
        deleteConfirmTextElement.textContent = safeName !== ''
          ? ('Deseja realmente excluir o usuário "' + safeName + '"?')
          : 'Deseja realmente excluir este usuário?';
      }

      deleteConfirmModalInstance.show();
      setTimeout(markDeleteConfirmBackdrop, 0);
    }

    function normalizePermissionToken(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase()
        .trim();
    }

    function parseUserServicesRaw(rawValue) {
      var raw = String(rawValue || '').trim();
      if (!raw) {
        return {};
      }

      function decodeHtmlEntities(value) {
        var parser = document.createElement('textarea');
        parser.innerHTML = String(value || '');
        return parser.value;
      }

      var parsed = {};
      var candidates = [raw, decodeHtmlEntities(raw)];

      try {
        candidates.push(decodeURIComponent(raw));
      } catch (error) {
      }

      for (var index = 0; index < candidates.length; index += 1) {
        var candidate = String(candidates[index] || '').trim();
        if (!candidate) {
          continue;
        }

        try {
          var decoded = JSON.parse(candidate);

          if (typeof decoded === 'string' && decoded.trim() !== '') {
            try {
              decoded = JSON.parse(decoded);
            } catch (error) {
            }
          }

          if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
            Object.keys(decoded).forEach(function (serviceKey) {
              var normalizedService = normalizePermissionToken(serviceKey);
              if (!normalizedService) {
                return;
              }

              var subservices = Array.isArray(decoded[serviceKey]) ? decoded[serviceKey] : [];
              parsed[normalizedService] = subservices
                .map(function (value) { return normalizePermissionToken(value); })
                .filter(function (value, position, array) { return value !== '' && array.indexOf(value) === position; });
            });

            return parsed;
          }
        } catch (error) {
        }
      }

      var regex = /([^;\[\]]+)\[([^\]]*)\]/g;
      var match = null;

      while ((match = regex.exec(raw)) !== null) {
        var serviceToken = normalizePermissionToken(match[1]);
        if (!serviceToken) {
          continue;
        }

        var subservicesRaw = String(match[2] || '').trim();
        if (!subservicesRaw) {
          parsed[serviceToken] = [];
          continue;
        }

        parsed[serviceToken] = subservicesRaw
          .split(',')
          .map(function (part) { return normalizePermissionToken(part); })
          .filter(function (value, index, array) { return value !== '' && array.indexOf(value) === index; });
      }

      return parsed;
    }

    function clearServiceSelections() {
      serviceCheckboxes.forEach(function (checkbox) {
        checkbox.checked = false;
      });

      subserviceCheckboxes.forEach(function (checkbox) {
        checkbox.checked = false;
      });
    }

    function getServiceCheckboxByKey(serviceKey) {
      var normalizedKey = normalizePermissionToken(serviceKey);
      var found = null;

      serviceCheckboxes.forEach(function (checkbox) {
        if (found) {
          return;
        }

        if (normalizePermissionToken(checkbox.value) === normalizedKey) {
          found = checkbox;
        }
      });

      return found;
    }

    function getSubserviceCheckboxesByServiceKey(serviceKey) {
      var normalizedServiceKey = normalizePermissionToken(serviceKey);
      var matches = [];

      subserviceCheckboxes.forEach(function (checkbox) {
        var checkboxServiceKey = normalizePermissionToken(checkbox.getAttribute('data-service-id'));
        if (checkboxServiceKey === normalizedServiceKey) {
          matches.push(checkbox);
        }
      });

      return matches;
    }

    function getSubserviceCheckboxByKeys(serviceKey, subserviceKey) {
      var normalizedSubserviceKey = normalizePermissionToken(subserviceKey);
      var related = getSubserviceCheckboxesByServiceKey(serviceKey);

      for (var index = 0; index < related.length; index += 1) {
        if (normalizePermissionToken(related[index].value) === normalizedSubserviceKey) {
          return related[index];
        }
      }

      return null;
    }

    function applyParsedServicesToSelectors(parsedServices) {
      clearServiceSelections();

      Object.keys(parsedServices || {}).forEach(function (serviceKey) {
        var serviceCheckbox = getServiceCheckboxByKey(serviceKey);
        if (!serviceCheckbox) {
          return;
        }

        serviceCheckbox.checked = true;
        var subservices = Array.isArray(parsedServices[serviceKey]) ? parsedServices[serviceKey] : [];

        subservices.forEach(function (subserviceKey) {
          var subserviceCheckbox = getSubserviceCheckboxByKeys(serviceKey, subserviceKey);
          if (subserviceCheckbox) {
            subserviceCheckbox.checked = true;
          }
        });
      });
    }

    function buildServicesPayloadFromSelectors() {
      var payload = {};

      serviceCheckboxes.forEach(function (serviceCheckbox) {
        var serviceKey = normalizePermissionToken(serviceCheckbox.value);
        if (!serviceKey) {
          return;
        }

        var selectedSubservices = [];
        getSubserviceCheckboxesByServiceKey(serviceKey).forEach(function (subserviceCheckbox) {
          if (!subserviceCheckbox.checked) {
            return;
          }

          var subserviceKey = normalizePermissionToken(subserviceCheckbox.value);
          if (subserviceKey && selectedSubservices.indexOf(subserviceKey) === -1) {
            selectedSubservices.push(subserviceKey);
          }
        });

        if (serviceCheckbox.checked || selectedSubservices.length > 0) {
          payload[serviceKey] = selectedSubservices;
        }
      });

      return payload;
    }

    function updateServicesSummaryFromSelectors() {
      if (!servicesSummary) {
        return;
      }

      var payload = buildServicesPayloadFromSelectors();
      var selectedServices = Object.keys(payload).length;
      var selectedSubservices = 0;

      Object.keys(payload).forEach(function (serviceKey) {
        var subservices = Array.isArray(payload[serviceKey]) ? payload[serviceKey] : [];
        selectedSubservices += subservices.length;
      });

      if (selectedServices === 0) {
        servicesSummary.textContent = 'Nenhuma permissão selecionada.';
        return;
      }

      servicesSummary.textContent = selectedServices + ' serviço(s) e ' + selectedSubservices + ' subserviço(s) selecionado(s).';
    }

    function syncServicosInputFromSelectors() {
      if (!servicosInput) {
        return;
      }

      var payload = buildServicesPayloadFromSelectors();
      var keys = Object.keys(payload);

      if (!keys.length) {
        servicosInput.value = '';
      } else {
        servicosInput.value = JSON.stringify(payload);
      }

      updateServicesSummaryFromSelectors();
    }

    function hydrateServicesSelectorsFromInput() {
      applyParsedServicesToSelectors(parseUserServicesRaw(servicosInput ? servicosInput.value : ''));

      serviceCheckboxes.forEach(function (serviceCheckbox) {
        var serviceKey = normalizePermissionToken(serviceCheckbox.value);
        var relatedSubservices = getSubserviceCheckboxesByServiceKey(serviceKey);

        if (!relatedSubservices.length) {
          return;
        }

        var anyChecked = false;
        relatedSubservices.forEach(function (subserviceCheckbox) {
          if (subserviceCheckbox.checked) {
            anyChecked = true;
          }
        });

        serviceCheckbox.checked = anyChecked;
      });

      updateServicesSummaryFromSelectors();
    }

    function filterAdminUsersTable() {
      if (!tableSearchInput || !tableRows.length) {
        return;
      }

      var term = normalizeSearchValue(tableSearchInput.value);
      var visibleCount = 0;

      tableRows.forEach(function (row) {
        var text = normalizeSearchValue(row.getAttribute('data-search-text'));
        var isMatch = term === '' || text.indexOf(term) !== -1;
        row.classList.toggle('d-none', !isMatch);
        if (isMatch) {
          visibleCount += 1;
        }
      });

      if (tableEmpty) {
        tableEmpty.classList.toggle('d-none', !(term !== '' && visibleCount === 0));
      }
    }

    function resetForm() {
      if (!idInput || !nomeInput || !usuarioInput || !emailInput || !cpfInput || !senhaInput || !tipoInput || !departamentoInput || !funcaoInput || !servicosInput) {
        return;
      }

      idInput.value = '0';
      nomeInput.value = '';
      usuarioInput.value = '';
      emailInput.value = '';
      cpfInput.value = '';
      senhaInput.value = '';
      if (cargaHorariaInput) {
        cargaHorariaInput.value = '40';
      }
      tipoInput.value = 'aluno';
      departamentoInput.value = '';
      funcaoInput.value = '';
      servicosInput.value = '';
      clearServiceSelections();
      updateServicesSummaryFromSelectors();

      if (submitButton) {
        submitButton.innerHTML = '<i class="las la-save me-1"></i>Salvar usuário';
      }

      if (formModalTitle) {
        formModalTitle.textContent = 'Novo usuário';
      }

    }

    if (newButton) {
      newButton.addEventListener('click', function () {
        resetForm();
        openUserFormModal();
      });
    }

    document.querySelectorAll('.js-admin-user-edit').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!idInput || !nomeInput || !usuarioInput || !emailInput || !cpfInput || !senhaInput || !tipoInput || !departamentoInput || !funcaoInput || !servicosInput) {
          return;
        }

        idInput.value = button.getAttribute('data-id') || '0';
        nomeInput.value = button.getAttribute('data-nome') || '';
        usuarioInput.value = button.getAttribute('data-usuario') || '';
        emailInput.value = button.getAttribute('data-email') || '';
        cpfInput.value = '';
        senhaInput.value = '';
        if (cargaHorariaInput) {
          cargaHorariaInput.value = button.getAttribute('data-cargahoraria') || '40';
        }
        tipoInput.value = button.getAttribute('data-tipo') || 'aluno';
        departamentoInput.value = button.getAttribute('data-departamento') || '';
        funcaoInput.value = button.getAttribute('data-funcao') || '';

        var userServicesRaw = '';
        var userServicesBase64 = button.getAttribute('data-servicos-b64') || '';

        if (userServicesBase64) {
          try {
            userServicesRaw = window.atob(userServicesBase64);
          } catch (error) {
            userServicesRaw = '';
          }
        }

        if (!userServicesRaw) {
          userServicesRaw = button.getAttribute('data-servicos') || '';
        }

        servicosInput.value = userServicesRaw;
        hydrateServicesSelectorsFromInput();

        if (submitButton) {
          submitButton.innerHTML = '<i class="las la-save me-1"></i>Atualizar usuário';
        }

        if (formModalTitle) {
          formModalTitle.textContent = 'Editar usuário';
        }

        openUserFormModal();
      });
    });

    if (resetButton) {
      resetButton.addEventListener('click', resetForm);
    }

    if (servicesButton) {
      servicesButton.addEventListener('click', function () {
        hydrateServicesSelectorsFromInput();

        if (servicesModalInstance) {
          servicesModalInstance.show();
          setTimeout(markServicesBackdrop, 0);
        }
      });
    }

    if (servicesApplyButton) {
      servicesApplyButton.addEventListener('click', function () {
        syncServicosInputFromSelectors();

        if (servicesModalInstance) {
          servicesModalInstance.hide();
        }
      });
    }

    serviceCheckboxes.forEach(function (serviceCheckbox) {
      serviceCheckbox.addEventListener('change', function () {
        var serviceKey = normalizePermissionToken(serviceCheckbox.value);
        var relatedSubservices = getSubserviceCheckboxesByServiceKey(serviceKey);

        if (serviceCheckbox.checked) {
          relatedSubservices.forEach(function (subserviceCheckbox) {
            subserviceCheckbox.checked = true;
          });
        } else {
          relatedSubservices.forEach(function (subserviceCheckbox) {
            subserviceCheckbox.checked = false;
          });
        }

        updateServicesSummaryFromSelectors();
      });
    });

    subserviceCheckboxes.forEach(function (subserviceCheckbox) {
      subserviceCheckbox.addEventListener('change', function () {
        var serviceKey = normalizePermissionToken(subserviceCheckbox.getAttribute('data-service-id'));
        var serviceCheckbox = getServiceCheckboxByKey(serviceKey);
        var relatedSubservices = getSubserviceCheckboxesByServiceKey(serviceKey);

        if (serviceCheckbox && relatedSubservices.length) {
          var anyChecked = false;

          relatedSubservices.forEach(function (relatedCheckbox) {
            if (relatedCheckbox.checked) {
              anyChecked = true;
            }
          });

          serviceCheckbox.checked = anyChecked;
        }

        updateServicesSummaryFromSelectors();
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      syncServicosInputFromSelectors();

      var submitBtn = submitButton;
      if (submitBtn) {
        submitBtn.disabled = true;
      }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao salvar usuário.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Usuário salvo com sucesso.', false);

          if (formModalInstance) {
            formModalInstance.hide();
          }

          return loadAdminPanelModalContent('gerenciamento_usuarios', 'Gerenciamento de Usuarios');
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao salvar usuário.', true);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
          }
        });
    });

    function executeDelete(deleteForm) {
      if (!deleteForm) {
        return;
      }

      fetch(deleteForm.action, {
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
                throw new Error(payload.message || 'Falha ao excluir usuário.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Usuário excluído com sucesso.', false);
          return loadAdminPanelModalContent('gerenciamento_usuarios', 'Gerenciamento de Usuarios');
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao excluir usuário.', true);
        });
    }

    document.querySelectorAll('.js-admin-user-delete-trigger').forEach(function (button) {
      button.addEventListener('click', function () {
        var deleteForm = button.closest('.js-admin-user-delete-form');
        var userName = button.getAttribute('data-user-name') || '';
        openDeleteConfirmModal(deleteForm, userName);
      });
    });

    if (deleteConfirmButton) {
      deleteConfirmButton.addEventListener('click', function () {
        var formToDelete = pendingDeleteForm;
        pendingDeleteForm = null;

        if (deleteConfirmModalInstance) {
          deleteConfirmModalInstance.hide();
        }

        executeDelete(formToDelete);
      });
    }

    if (deleteConfirmModalElement) {
      deleteConfirmModalElement.addEventListener('hidden.bs.modal', function () {
        pendingDeleteForm = null;
        if (deleteConfirmTextElement) {
          deleteConfirmTextElement.textContent = 'Deseja realmente excluir este usuário?';
        }
      });
    }
    if (tableSearchInput) {
      tableSearchInput.addEventListener('input', filterAdminUsersTable);
      filterAdminUsersTable();
    }

    if (formModalElement) {
      formModalElement.addEventListener('hidden.bs.modal', function () {
        resetForm();
      });
    }

    if (servicesModalElement) {
      servicesModalElement.addEventListener('shown.bs.modal', function () {
        hydrateServicesSelectorsFromInput();
      });

      servicesModalElement.addEventListener('hidden.bs.modal', function () {
        hydrateServicesSelectorsFromInput();
      });
    }
  }

  function bindAdminFerramentasAdministrativasModalContent() {
    var root = document.getElementById('adminCatalogManagerRoot');
    if (!root) {
      return;
    }

    var configs = {
      tipo_usuario: {
        form: document.getElementById('adminCatalogUserTypeForm'),
        idInput: document.getElementById('adminCatalogUserTypeId'),
        nameInput: document.getElementById('adminCatalogUserTypeNome'),
        keyInput: document.getElementById('adminCatalogUserTypeChave'),
        submitButton: document.getElementById('adminCatalogUserTypeSubmitButton'),
        resetButton: document.getElementById('adminCatalogUserTypeResetButton'),
        createLabel: '<i class="las la-save me-1"></i>Salvar tipo',
        updateLabel: '<i class="las la-save me-1"></i>Salvar alterações',
      },
      departamento: {
        form: document.getElementById('adminCatalogDepartmentForm'),
        idInput: document.getElementById('adminCatalogDepartmentId'),
        nameInput: document.getElementById('adminCatalogDepartmentNome'),
        submitButton: document.getElementById('adminCatalogDepartmentSubmitButton'),
        resetButton: document.getElementById('adminCatalogDepartmentResetButton'),
        createLabel: '<i class="las la-save me-1"></i>Salvar departamento',
        updateLabel: '<i class="las la-save me-1"></i>Salvar alterações',
      },
      funcao: {
        form: document.getElementById('adminCatalogFunctionForm'),
        idInput: document.getElementById('adminCatalogFunctionId'),
        nameInput: document.getElementById('adminCatalogFunctionNome'),
        submitButton: document.getElementById('adminCatalogFunctionSubmitButton'),
        resetButton: document.getElementById('adminCatalogFunctionResetButton'),
        createLabel: '<i class="las la-save me-1"></i>Salvar função',
        updateLabel: '<i class="las la-save me-1"></i>Salvar alterações',
      },
    };

    function normalizeCatalogKey(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    function getConfig(entity) {
      return Object.prototype.hasOwnProperty.call(configs, entity) ? configs[entity] : null;
    }

    function resetForm(entity) {
      var config = getConfig(entity);
      if (!config || !config.form || !config.idInput || !config.nameInput) {
        return;
      }

      config.form.reset();
      config.idInput.value = '0';
      config.nameInput.value = '';

      if (config.keyInput) {
        config.keyInput.value = '';
        config.keyInput.disabled = false;
        config.keyInput.dataset.manual = '0';
      }

      if (config.submitButton) {
        config.submitButton.innerHTML = config.createLabel;
        config.submitButton.disabled = false;
      }
    }

    function focusForm(config) {
      if (!config || !config.nameInput) {
        return;
      }

      config.nameInput.focus();
      if (typeof config.nameInput.scrollIntoView === 'function') {
        config.nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function fillFormFromButton(button) {
      var entity = String(button.getAttribute('data-entity') || '').trim();
      var config = getConfig(entity);
      if (!config || !config.form || !config.idInput || !config.nameInput) {
        return;
      }

      var id = String(button.getAttribute('data-id') || '0').trim();
      var name = String(button.getAttribute('data-nome') || '').trim();
      var key = String(button.getAttribute('data-chave') || '').trim();
      var isProtected = String(button.getAttribute('data-protegido') || '') === '1';

      config.idInput.value = id !== '' ? id : '0';
      config.nameInput.value = name;

      if (config.keyInput) {
        config.keyInput.value = key;
        config.keyInput.disabled = isProtected;
        config.keyInput.dataset.manual = key !== '' ? '1' : '0';
      }

      if (config.submitButton) {
        config.submitButton.innerHTML = config.updateLabel;
      }

      focusForm(config);
    }

    function submitForm(entity) {
      var config = getConfig(entity);
      if (!config || !config.form) {
        return;
      }

      var submitButton = config.submitButton;
      if (submitButton) {
        submitButton.disabled = true;
      }

      fetch(config.form.action, {
        method: 'POST',
        body: new FormData(config.form),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao salvar registro.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Registro salvo com sucesso.', false);
          return loadAdminPanelModalContent('ferramentas_administrativas', 'Ferramentas Administrativas');
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao salvar registro.', true);
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
          }
        });
    }

    function executeDelete(form) {
      if (!form) {
        return;
      }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao excluir registro.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Registro excluído com sucesso.', false);
          return loadAdminPanelModalContent('ferramentas_administrativas', 'Ferramentas Administrativas');
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao excluir registro.', true);
        });
    }

    Object.keys(configs).forEach(function (entity) {
      var config = configs[entity];
      if (!config || !config.form) {
        return;
      }

      if (config.keyInput) {
        config.nameInput.addEventListener('input', function () {
          var isManual = config.keyInput.dataset.manual === '1';
          var currentId = String(config.idInput.value || '0');
          if (isManual || currentId !== '0') {
            return;
          }

          config.keyInput.value = normalizeCatalogKey(config.nameInput.value);
        });

        config.keyInput.addEventListener('input', function () {
          config.keyInput.dataset.manual = String(config.keyInput.value || '').trim() !== '' ? '1' : '0';
        });
      }

      config.form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitForm(entity);
      });

      if (config.resetButton) {
        config.resetButton.addEventListener('click', function () {
          resetForm(entity);
        });
      }

      resetForm(entity);
    });

    root.querySelectorAll('.js-admin-catalog-edit').forEach(function (button) {
      button.addEventListener('click', function () {
        fillFormFromButton(button);
      });
    });

    root.querySelectorAll('.js-admin-catalog-delete-trigger').forEach(function (button) {
      button.addEventListener('click', function () {
        var form = button.closest('.js-admin-catalog-delete-form');
        if (!form) {
          return;
        }

        var label = String(button.getAttribute('data-label') || 'este registro').trim();
        if (!window.confirm('Deseja realmente excluir ' + label + '?')) {
          return;
        }

        executeDelete(form);
      });
    });
  }

  function bindAdminServicesSubservicesModalContent() {
    var serviceForm = document.getElementById('adminServiceForm');
    var subserviceForm = document.getElementById('adminSubserviceForm');

    if (!serviceForm || !subserviceForm) {
      return;
    }

    var serviceIdInput = document.getElementById('adminServiceId');
    var serviceNomeInput = document.getElementById('adminServiceNome');
    var serviceSubmitButton = document.getElementById('adminServiceSubmitButton');
    var serviceResetButton = document.getElementById('adminServiceResetButton');
    var serviceFormModalElement = document.getElementById('adminServiceFormModal');
    var serviceFormModalTitle = document.getElementById('adminServiceFormModalLabel');
    var newServiceButton = document.querySelector('.js-admin-service-new');

    var subserviceTableInput = document.getElementById('adminSubserviceTable');
    var subserviceNomeInput = document.getElementById('adminSubserviceNome');
    var subserviceServicoInput = document.getElementById('adminSubserviceServico');
    var subserviceSubmitButton = document.getElementById('adminSubserviceSubmitButton');
    var subserviceResetButton = document.getElementById('adminSubserviceResetButton');
    var subserviceFormModalElement = document.getElementById('adminSubserviceFormModal');
    var subserviceFormModalTitle = document.getElementById('adminSubserviceFormModalLabel');
    var newSubserviceButton = document.querySelector('.js-admin-subservice-new');
    var tableSearchInput = document.getElementById('adminServicesTableSearch');
    var serviceRows = document.querySelectorAll('.js-admin-services-row');
    var subserviceRows = document.querySelectorAll('.js-admin-subservices-row');
    var servicesEmpty = document.getElementById('adminServicesTableEmpty');
    var subservicesEmpty = document.getElementById('adminSubservicesTableEmpty');

    var deleteConfirmModalElement = document.getElementById('adminServiceSubserviceDeleteConfirmModal');
    var deleteConfirmTextElement = document.getElementById('adminServiceSubserviceDeleteConfirmText');
    var deleteConfirmButton = document.getElementById('adminServiceSubserviceDeleteConfirmButton');

    var serviceFormModalInstance = null;
    var subserviceFormModalInstance = null;
    var deleteConfirmModalInstance = null;
    var pendingDeleteForm = null;

    if (serviceFormModalElement && serviceFormModalElement.parentElement !== document.body) {
      var existingServiceModal = document.body.querySelector('#adminServiceFormModal');
      if (existingServiceModal && existingServiceModal !== serviceFormModalElement) {
        existingServiceModal.remove();
      }

      document.body.appendChild(serviceFormModalElement);
    }

    if (subserviceFormModalElement && subserviceFormModalElement.parentElement !== document.body) {
      var existingSubserviceModal = document.body.querySelector('#adminSubserviceFormModal');
      if (existingSubserviceModal && existingSubserviceModal !== subserviceFormModalElement) {
        existingSubserviceModal.remove();
      }

      document.body.appendChild(subserviceFormModalElement);
    }

    if (deleteConfirmModalElement && deleteConfirmModalElement.parentElement !== document.body) {
      var existingDeleteModal = document.body.querySelector('#adminServiceSubserviceDeleteConfirmModal');
      if (existingDeleteModal && existingDeleteModal !== deleteConfirmModalElement) {
        existingDeleteModal.remove();
      }

      document.body.appendChild(deleteConfirmModalElement);
    }

    if (serviceFormModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      serviceFormModalInstance = bootstrap.Modal.getOrCreateInstance(serviceFormModalElement, {
        backdrop: 'static',
      });
    }

    if (subserviceFormModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      subserviceFormModalInstance = bootstrap.Modal.getOrCreateInstance(subserviceFormModalElement, {
        backdrop: 'static',
      });
    }

    if (deleteConfirmModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      deleteConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(deleteConfirmModalElement, {
        backdrop: 'static',
      });
    }

    function markFormBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      backdrops[backdrops.length - 1].classList.add('admin-user-form-backdrop');
    }

    function markConfirmBackdrop() {
      var backdrops = document.querySelectorAll('.modal-backdrop');
      if (!backdrops.length) {
        return;
      }

      backdrops[backdrops.length - 1].classList.add('admin-user-confirm-backdrop');
    }

    function openServiceFormModal() {
      if (!serviceFormModalInstance) {
        return;
      }

      serviceFormModalInstance.show();
      setTimeout(markFormBackdrop, 0);
    }

    function openSubserviceFormModal() {
      if (!subserviceFormModalInstance) {
        return;
      }

      subserviceFormModalInstance.show();
      setTimeout(markFormBackdrop, 0);
    }

    function openDeleteConfirmModal(deleteForm, label) {
      if (!deleteConfirmModalInstance || !deleteForm) {
        return;
      }

      pendingDeleteForm = deleteForm;

      if (deleteConfirmTextElement) {
        var text = String(label || '').trim();
        deleteConfirmTextElement.textContent = text !== ''
          ? ('Deseja realmente excluir ' + text + '?')
          : 'Deseja realmente excluir este registro?';
      }

      deleteConfirmModalInstance.show();
      setTimeout(markConfirmBackdrop, 0);
    }

    function resetServiceForm() {
      if (!serviceIdInput || !serviceNomeInput) {
        return;
      }

      serviceIdInput.value = '0';
      serviceNomeInput.value = '';

      if (serviceSubmitButton) {
        serviceSubmitButton.innerHTML = '<i class="las la-save me-1"></i>Salvar serviço';
      }

      if (serviceFormModalTitle) {
        serviceFormModalTitle.textContent = 'Novo serviço';
      }
    }

    function resetSubserviceForm() {
      if (!subserviceTableInput || !subserviceNomeInput || !subserviceServicoInput) {
        return;
      }

      subserviceTableInput.value = '';
      subserviceNomeInput.value = '';
      subserviceServicoInput.value = '';

      if (subserviceSubmitButton) {
        subserviceSubmitButton.innerHTML = '<i class="las la-save me-1"></i>Salvar subserviço';
      }

      if (subserviceFormModalTitle) {
        subserviceFormModalTitle.textContent = 'Novo subserviço';
      }
    }

    function filterAdminServicesTables() {
      if (!tableSearchInput) {
        return;
      }

      var term = normalizeSearchValue(tableSearchInput.value);
      var visibleServices = 0;
      var visibleSubservices = 0;

      serviceRows.forEach(function (row) {
        var text = normalizeSearchValue(row.getAttribute('data-search-text'));
        var isMatch = term === '' || text.indexOf(term) !== -1;
        row.classList.toggle('d-none', !isMatch);
        if (isMatch) {
          visibleServices += 1;
        }
      });

      subserviceRows.forEach(function (row) {
        var text = normalizeSearchValue(row.getAttribute('data-search-text'));
        var isMatch = term === '' || text.indexOf(term) !== -1;
        row.classList.toggle('d-none', !isMatch);
        if (isMatch) {
          visibleSubservices += 1;
        }
      });

      if (servicesEmpty) {
        servicesEmpty.classList.toggle('d-none', !(term !== '' && visibleServices === 0));
      }

      if (subservicesEmpty) {
        subservicesEmpty.classList.toggle('d-none', !(term !== '' && visibleSubservices === 0));
      }
    }

    function handleSave(form, submitButton, closeModal) {
      if (!form) {
        return;
      }

      var submitBtn = submitButton;
      if (submitBtn) {
        submitBtn.disabled = true;
      }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao salvar registro.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Registro salvo com sucesso.', false);

          if (typeof closeModal === 'function') {
            closeModal();
          }

          return loadAdminPanelModalContent('gerenciamento_servicos_subservicos', 'Gerenciamento de Serviços e Sub-serviços');
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao salvar registro.', true);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
          }
        });
    }

    function executeDelete(deleteForm) {
      if (!deleteForm) {
        return;
      }

      fetch(deleteForm.action, {
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
                throw new Error(payload.message || 'Falha ao excluir registro.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Registro excluído com sucesso.', false);
          return loadAdminPanelModalContent('gerenciamento_servicos_subservicos', 'Gerenciamento de Serviços e Sub-serviços');
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao excluir registro.', true);
        });
    }

    if (newServiceButton) {
      newServiceButton.addEventListener('click', function () {
        resetServiceForm();
        openServiceFormModal();
      });
    }

    if (newSubserviceButton) {
      newSubserviceButton.addEventListener('click', function () {
        resetSubserviceForm();
        openSubserviceFormModal();
      });
    }

    document.querySelectorAll('.js-admin-service-edit').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!serviceIdInput || !serviceNomeInput) {
          return;
        }

        serviceIdInput.value = button.getAttribute('data-id') || '0';
        serviceNomeInput.value = button.getAttribute('data-nome') || '';

        if (serviceSubmitButton) {
          serviceSubmitButton.innerHTML = '<i class="las la-save me-1"></i>Atualizar serviço';
        }

        if (serviceFormModalTitle) {
          serviceFormModalTitle.textContent = 'Editar serviço';
        }

        openServiceFormModal();
      });
    });

    document.querySelectorAll('.js-admin-subservice-edit').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!subserviceTableInput || !subserviceNomeInput || !subserviceServicoInput) {
          return;
        }

        subserviceTableInput.value = button.getAttribute('data-table') || '';
        subserviceNomeInput.value = button.getAttribute('data-nome') || '';
        subserviceServicoInput.value = button.getAttribute('data-servico') || '';

        if (subserviceSubmitButton) {
          subserviceSubmitButton.innerHTML = '<i class="las la-save me-1"></i>Atualizar subserviço';
        }

        if (subserviceFormModalTitle) {
          subserviceFormModalTitle.textContent = 'Editar subserviço';
        }

        openSubserviceFormModal();
      });
    });

    document.querySelectorAll('.js-admin-services-delete-trigger').forEach(function (button) {
      button.addEventListener('click', function () {
        var deleteForm = button.closest('.js-admin-services-delete-form');
        var itemName = button.getAttribute('data-item-name') || '';
        var itemType = button.getAttribute('data-item-type') || 'registro';
        var label = itemName !== '' ? ('o ' + itemType + ' "' + itemName + '"') : ('este ' + itemType);
        openDeleteConfirmModal(deleteForm, label);
      });
    });

    if (serviceResetButton) {
      serviceResetButton.addEventListener('click', resetServiceForm);
    }

    if (subserviceResetButton) {
      subserviceResetButton.addEventListener('click', resetSubserviceForm);
    }

    if (tableSearchInput) {
      tableSearchInput.addEventListener('input', filterAdminServicesTables);
      filterAdminServicesTables();
    }

    serviceForm.addEventListener('submit', function (event) {
      event.preventDefault();

      handleSave(serviceForm, serviceSubmitButton, function () {
        if (serviceFormModalInstance) {
          serviceFormModalInstance.hide();
        }
      });
    });

    subserviceForm.addEventListener('submit', function (event) {
      event.preventDefault();

      handleSave(subserviceForm, subserviceSubmitButton, function () {
        if (subserviceFormModalInstance) {
          subserviceFormModalInstance.hide();
        }
      });
    });

    if (deleteConfirmButton) {
      deleteConfirmButton.addEventListener('click', function () {
        var formToDelete = pendingDeleteForm;
        pendingDeleteForm = null;

        if (deleteConfirmModalInstance) {
          deleteConfirmModalInstance.hide();
        }

        executeDelete(formToDelete);
      });
    }

    if (deleteConfirmModalElement) {
      deleteConfirmModalElement.addEventListener('hidden.bs.modal', function () {
        pendingDeleteForm = null;
        if (deleteConfirmTextElement) {
          deleteConfirmTextElement.textContent = 'Deseja realmente excluir este registro?';
        }
      });
    }

    if (serviceFormModalElement) {
      serviceFormModalElement.addEventListener('hidden.bs.modal', function () {
        resetServiceForm();
      });
    }

    if (subserviceFormModalElement) {
      subserviceFormModalElement.addEventListener('hidden.bs.modal', function () {
        resetSubserviceForm();
      });
    }
  }

  function bindAdminInformacoesModalContent() {
    var form = document.getElementById('adminInformacaoForm');
    if (!form) {
      return;
    }

    var idInput = document.getElementById('adminInformacaoId');
    var tituloInput = document.getElementById('adminInformacaoTitulo');
    var conteudoInput = document.getElementById('adminInformacaoConteudoHtml');
    var editorElement = document.getElementById('adminInformacaoEditor');
    var imagemInput = document.getElementById('adminInformacaoImagem');
    var videoInput = document.getElementById('adminInformacaoVideo');
    var removerImagemInput = document.getElementById('adminInformacaoRemoverImagem');
    var removerVideoInput = document.getElementById('adminInformacaoRemoverVideo');
    var visualizarImagemButton = document.getElementById('adminInformacaoVisualizarImagemBtn');
    var visualizarVideoButton = document.getElementById('adminInformacaoVisualizarVideoBtn');
    var removerImagemButton = document.getElementById('adminInformacaoRemoverImagemBtn');
    var removerVideoButton = document.getElementById('adminInformacaoRemoverVideoBtn');
    var substituirImagemButton = document.getElementById('adminInformacaoSubstituirImagemBtn');
    var substituirVideoButton = document.getElementById('adminInformacaoSubstituirVideoBtn');
    var imagemAtualElement = document.getElementById('adminInformacaoImagemAtual');
    var videoAtualElement = document.getElementById('adminInformacaoVideoAtual');
    var submitButton = document.getElementById('adminInformacaoSubmitButton');
    var resetButton = document.getElementById('adminInformacaoResetButton');
    var newButton = document.querySelector('.js-admin-informacao-new');
    var formModalElement = document.getElementById('adminInformacaoFormModal');
    var formModalTitle = document.getElementById('adminInformacaoFormModalLabel');
    var deleteConfirmModalElement = document.getElementById('adminInformacaoDeleteConfirmModal');
    var deleteConfirmTextElement = document.getElementById('adminInformacaoDeleteConfirmText');
    var deleteConfirmButton = document.getElementById('adminInformacaoDeleteConfirmButton');
    var tableSearchInput = document.getElementById('adminInformacoesTableSearch');
    var tableRows = document.querySelectorAll('.js-admin-informacoes-row');
    var tableEmpty = document.getElementById('adminInformacoesTableEmpty');

    var formModalInstance = null;
    var deleteConfirmModalInstance = null;
    var pendingDeleteForm = null;
    var currentImagemPath = '';
    var currentVideoPath = '';
    var selectedImagemPreviewUrl = '';
    var selectedVideoPreviewUrl = '';

    if (formModalElement && formModalElement.parentElement !== document.body) {
      var existingFormModal = document.body.querySelector('#adminInformacaoFormModal');
      if (existingFormModal && existingFormModal !== formModalElement) {
        existingFormModal.remove();
      }

      document.body.appendChild(formModalElement);
    }

    if (deleteConfirmModalElement && deleteConfirmModalElement.parentElement !== document.body) {
      var existingDeleteModal = document.body.querySelector('#adminInformacaoDeleteConfirmModal');
      if (existingDeleteModal && existingDeleteModal !== deleteConfirmModalElement) {
        existingDeleteModal.remove();
      }

      document.body.appendChild(deleteConfirmModalElement);
    }

    if (formModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      formModalInstance = bootstrap.Modal.getOrCreateInstance(formModalElement, {
        backdrop: 'static',
      });
    }

    if (deleteConfirmModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      deleteConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(deleteConfirmModalElement, {
        backdrop: 'static',
      });
    }

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

    function openFormModal() {
      if (!formModalInstance) {
        return;
      }

      formModalInstance.show();
      setTimeout(markFormBackdrop, 0);
    }

    function openDeleteConfirmModal(deleteForm, itemName) {
      if (!deleteConfirmModalInstance || !deleteForm) {
        return;
      }

      pendingDeleteForm = deleteForm;
      if (deleteConfirmTextElement) {
        var label = String(itemName || '').trim();
        deleteConfirmTextElement.textContent = label !== ''
          ? ('Deseja realmente excluir "' + label + '"?')
          : 'Deseja realmente excluir esta publicação?';
      }

      deleteConfirmModalInstance.show();
      setTimeout(markConfirmBackdrop, 0);
    }

    function resolveAppBaseUrl(actionUrl) {
      var absoluteUrl = String(actionUrl || '').trim();
      if (absoluteUrl === '') {
        return '';
      }

      var indexPhpPos = absoluteUrl.indexOf('/index.php');
      if (indexPhpPos >= 0) {
        return absoluteUrl.substring(0, indexPhpPos);
      }

      return absoluteUrl;
    }

    function buildCurrentFileUrl(filePath) {
      var path = String(filePath || '').trim().replace(/\\/g, '/');
      if (path === '') {
        return '';
      }

      if (/^https?:\/\//i.test(path)) {
        return path;
      }

      var base = resolveAppBaseUrl(form.action);
      if (base === '') {
        return '';
      }

      return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
    }

    function revokePreviewUrl(url) {
      if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
        return;
      }

      try {
        URL.revokeObjectURL(url);
      } catch (error) {
      }
    }

    function updateMediaLabels() {
      if (imagemAtualElement) {
        imagemAtualElement.textContent = currentImagemPath !== '' ? ('Imagem atual: ' + currentImagemPath) : 'Sem imagem cadastrada.';
      }

      if (videoAtualElement) {
        videoAtualElement.textContent = currentVideoPath !== '' ? ('Vídeo atual: ' + currentVideoPath) : 'Sem vídeo cadastrado.';
      }

      var imagemUrl = selectedImagemPreviewUrl !== '' ? selectedImagemPreviewUrl : buildCurrentFileUrl(currentImagemPath);
      if (visualizarImagemButton) {
        var hasImagem = imagemUrl !== '';
        visualizarImagemButton.classList.toggle('disabled', !hasImagem);
        visualizarImagemButton.setAttribute('aria-disabled', hasImagem ? 'false' : 'true');
        visualizarImagemButton.setAttribute('href', hasImagem ? imagemUrl : '#');
      }

      if (removerImagemButton) {
        removerImagemButton.disabled = currentImagemPath === '';
      }

      if (substituirImagemButton) {
        substituirImagemButton.disabled = currentImagemPath === '';
      }

      var videoUrl = selectedVideoPreviewUrl !== '' ? selectedVideoPreviewUrl : buildCurrentFileUrl(currentVideoPath);
      if (visualizarVideoButton) {
        var hasVideo = videoUrl !== '';
        visualizarVideoButton.classList.toggle('disabled', !hasVideo);
        visualizarVideoButton.setAttribute('aria-disabled', hasVideo ? 'false' : 'true');
        visualizarVideoButton.setAttribute('href', hasVideo ? videoUrl : '#');
      }

      if (removerVideoButton) {
        removerVideoButton.disabled = currentVideoPath === '';
      }

      if (substituirVideoButton) {
        substituirVideoButton.disabled = currentVideoPath === '';
      }
    }

    function decodeBase64(base64Text) {
      var raw = String(base64Text || '').trim();
      if (raw === '') {
        return '';
      }

      try {
        var binary = window.atob(raw);

        if (typeof TextDecoder !== 'undefined') {
          var bytes = new Uint8Array(binary.length);
          for (var index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
          }

          return new TextDecoder('utf-8').decode(bytes);
        }

        return decodeURIComponent(escape(binary));
      } catch (error) {
        return '';
      }
    }

    function refreshInformacoesCrudView() {
      if (adminPanelModalBodyElement) {
        return loadAdminPanelModalContent('gerenciamento_informacoes', 'Gerenciamento de Informações');
      }

      refreshInformacoesSearchRefs();

      if (!informacoesPublicPostsContainer) {
        return Promise.resolve(true);
      }

      return fetch(window.location.href, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Falha ao atualizar publicações.');
          }

          return response.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');

          var newPublicContainer = doc.getElementById('informacoesPublicPostsContainer');
          var newTotalEncontrado = doc.getElementById('informacoesTotalEncontrado');
          var newPaginacao = doc.getElementById('informacoesPaginacao');
          var newAdminModalBody = doc.getElementById('informacoesAdminModalBody');

          if (newPublicContainer && informacoesPublicPostsContainer) {
            informacoesPublicPostsContainer.innerHTML = newPublicContainer.innerHTML;
          }

          if (newTotalEncontrado && informacoesTotalEncontrado) {
            informacoesTotalEncontrado.textContent = newTotalEncontrado.textContent;
          }

          if (informacoesPaginacao) {
            if (newPaginacao) {
              informacoesPaginacao.innerHTML = newPaginacao.innerHTML;
              informacoesPaginacao.classList.remove('d-none');
            } else {
              informacoesPaginacao.classList.add('d-none');
            }
          }

          if (newAdminModalBody && informacoesAdminModalBody) {
            informacoesAdminModalBody.innerHTML = newAdminModalBody.innerHTML;
          }

          refreshInformacoesSearchRefs();
          filterInformacoesPosts();
          bindAdminInformacoesModalContent();

          return true;
        })
        .catch(function () {
          return true;
        });
    }

    function syncEditorToHidden() {
      if (!conteudoInput || !editorElement) {
        return;
      }

      conteudoInput.value = String(editorElement.innerHTML || '').trim();
    }

    function resetForm() {
      if (!idInput || !tituloInput || !editorElement || !conteudoInput) {
        return;
      }

      idInput.value = '0';
      tituloInput.value = '';
      editorElement.innerHTML = '';
      conteudoInput.value = '';

      if (imagemInput) {
        imagemInput.value = '';
      }

      if (videoInput) {
        videoInput.value = '';
      }

      if (removerImagemInput) {
        removerImagemInput.value = '0';
      }

      if (removerVideoInput) {
        removerVideoInput.value = '0';
      }

      revokePreviewUrl(selectedImagemPreviewUrl);
      revokePreviewUrl(selectedVideoPreviewUrl);
      selectedImagemPreviewUrl = '';
      selectedVideoPreviewUrl = '';

      currentImagemPath = '';
      currentVideoPath = '';
      updateMediaLabels();

      if (submitButton) {
        submitButton.innerHTML = '<i class="las la-save me-1"></i>Publicar informação';
      }

      if (formModalTitle) {
        formModalTitle.textContent = 'Nova informação';
      }
    }

    function filterTable() {
      if (!tableSearchInput || !tableRows.length) {
        return;
      }

      var term = normalizeSearchValue(tableSearchInput.value);
      var visibleCount = 0;

      tableRows.forEach(function (row) {
        var text = normalizeSearchValue(row.getAttribute('data-search-text'));
        var isMatch = term === '' || text.indexOf(term) !== -1;
        row.classList.toggle('d-none', !isMatch);
        if (isMatch) {
          visibleCount += 1;
        }
      });

      if (tableEmpty) {
        tableEmpty.classList.toggle('d-none', !(term !== '' && visibleCount === 0));
      }
    }

    function executeDelete(deleteForm) {
      if (!deleteForm) {
        return;
      }

      fetch(deleteForm.action, {
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
                throw new Error(payload.message || 'Falha ao excluir informação.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Informação excluída com sucesso.', false);
          return refreshInformacoesCrudView();
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao excluir informação.', true);
        });
    }

    if (newButton) {
      newButton.addEventListener('click', function () {
        resetForm();
        openFormModal();
      });
    }

    document.querySelectorAll('.js-admin-informacao-edit').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!idInput || !tituloInput || !editorElement) {
          return;
        }

        idInput.value = button.getAttribute('data-id') || '0';
        tituloInput.value = button.getAttribute('data-titulo') || '';
        editorElement.innerHTML = decodeBase64(button.getAttribute('data-conteudo-b64') || '');
        currentImagemPath = button.getAttribute('data-imagem') || '';
        currentVideoPath = button.getAttribute('data-video') || '';

        if (imagemInput) {
          imagemInput.value = '';
        }

        if (videoInput) {
          videoInput.value = '';
        }

        if (removerImagemInput) {
          removerImagemInput.value = '0';
        }

        if (removerVideoInput) {
          removerVideoInput.value = '0';
        }

        revokePreviewUrl(selectedImagemPreviewUrl);
        revokePreviewUrl(selectedVideoPreviewUrl);
        selectedImagemPreviewUrl = '';
        selectedVideoPreviewUrl = '';

        updateMediaLabels();
        syncEditorToHidden();

        if (submitButton) {
          submitButton.innerHTML = '<i class="las la-save me-1"></i>Atualizar informação';
        }

        if (formModalTitle) {
          formModalTitle.textContent = 'Editar informação';
        }

        openFormModal();
      });
    });

    document.querySelectorAll('.js-admin-informacao-delete-trigger').forEach(function (button) {
      button.addEventListener('click', function () {
        var deleteForm = button.closest('.js-admin-informacao-delete-form');
        var itemName = button.getAttribute('data-item-name') || '';
        openDeleteConfirmModal(deleteForm, itemName);
      });
    });

    document.querySelectorAll('.js-admin-info-cmd').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!editorElement) {
          return;
        }

        editorElement.focus();
        var cmd = button.getAttribute('data-cmd') || '';
        if (cmd !== '') {
          document.execCommand(cmd, false, null);
        }

        syncEditorToHidden();
      });
    });

    document.querySelectorAll('.js-admin-info-emoji').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!editorElement) {
          return;
        }

        var emoji = button.getAttribute('data-emoji') || '';
        editorElement.focus();
        if (emoji !== '') {
          document.execCommand('insertText', false, emoji);
        }

        syncEditorToHidden();
      });
    });

    document.querySelectorAll('.js-admin-info-link').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!editorElement) {
          return;
        }

        var url = window.prompt('Digite a URL do link (https://...)', 'https://');
        if (!url) {
          return;
        }

        editorElement.focus();
        document.execCommand('createLink', false, String(url).trim());
        syncEditorToHidden();
      });
    });

    if (editorElement) {
      editorElement.addEventListener('input', syncEditorToHidden);
      editorElement.addEventListener('blur', syncEditorToHidden);
    }

    if (resetButton) {
      resetButton.addEventListener('click', resetForm);
    }

    if (substituirImagemButton && imagemInput) {
      substituirImagemButton.addEventListener('click', function () {
        if (removerImagemInput) {
          removerImagemInput.value = '0';
        }
        imagemInput.click();
      });
    }

    if (substituirVideoButton && videoInput) {
      substituirVideoButton.addEventListener('click', function () {
        if (removerVideoInput) {
          removerVideoInput.value = '0';
        }
        videoInput.click();
      });
    }

    if (imagemInput) {
      imagemInput.addEventListener('change', function () {
        var hasFile = Boolean(imagemInput.files && imagemInput.files.length > 0);
        if (hasFile && removerImagemInput) {
          removerImagemInput.value = '0';
        }

        revokePreviewUrl(selectedImagemPreviewUrl);
        selectedImagemPreviewUrl = '';

        if (hasFile && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          selectedImagemPreviewUrl = URL.createObjectURL(imagemInput.files[0]);
        }

        updateMediaLabels();
      });
    }

    if (videoInput) {
      videoInput.addEventListener('change', function () {
        var hasFile = Boolean(videoInput.files && videoInput.files.length > 0);
        if (hasFile && removerVideoInput) {
          removerVideoInput.value = '0';
        }

        revokePreviewUrl(selectedVideoPreviewUrl);
        selectedVideoPreviewUrl = '';

        if (hasFile && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          selectedVideoPreviewUrl = URL.createObjectURL(videoInput.files[0]);
        }

        updateMediaLabels();
      });
    }

    if (removerImagemButton) {
      removerImagemButton.addEventListener('click', function () {
        if (currentImagemPath === '') {
          return;
        }

        if (imagemInput) {
          imagemInput.value = '';
        }

        if (removerImagemInput) {
          removerImagemInput.value = '1';
        }

        revokePreviewUrl(selectedImagemPreviewUrl);
        selectedImagemPreviewUrl = '';

        currentImagemPath = '';
        updateMediaLabels();
      });
    }

    if (removerVideoButton) {
      removerVideoButton.addEventListener('click', function () {
        if (currentVideoPath === '') {
          return;
        }

        if (videoInput) {
          videoInput.value = '';
        }

        if (removerVideoInput) {
          removerVideoInput.value = '1';
        }

        revokePreviewUrl(selectedVideoPreviewUrl);
        selectedVideoPreviewUrl = '';

        currentVideoPath = '';
        updateMediaLabels();
      });
    }

    if (visualizarImagemButton) {
      visualizarImagemButton.addEventListener('click', function (event) {
        if (currentImagemPath === '' && selectedImagemPreviewUrl === '') {
          event.preventDefault();
        }
      });
    }

    if (visualizarVideoButton) {
      visualizarVideoButton.addEventListener('click', function (event) {
        if (currentVideoPath === '' && selectedVideoPreviewUrl === '') {
          event.preventDefault();
        }
      });
    }

    if (tableSearchInput) {
      tableSearchInput.addEventListener('input', filterTable);
      filterTable();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      syncEditorToHidden();

      if (submitButton) {
        submitButton.disabled = true;
      }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao salvar informação.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Informação salva com sucesso.', false);

          if (formModalInstance) {
            formModalInstance.hide();
          }

          return refreshInformacoesCrudView();
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao salvar informação.', true);
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
          }
        });
    });

    if (deleteConfirmButton) {
      deleteConfirmButton.addEventListener('click', function () {
        var formToDelete = pendingDeleteForm;
        pendingDeleteForm = null;

        if (deleteConfirmModalInstance) {
          deleteConfirmModalInstance.hide();
        }

        executeDelete(formToDelete);
      });
    }

    if (deleteConfirmModalElement) {
      deleteConfirmModalElement.addEventListener('hidden.bs.modal', function () {
        pendingDeleteForm = null;
        if (deleteConfirmTextElement) {
          deleteConfirmTextElement.textContent = 'Deseja realmente excluir esta publicação?';
        }
      });
    }

    if (formModalElement) {
      formModalElement.addEventListener('hidden.bs.modal', function () {
        resetForm();
      });
    }

    resetForm();
  }

  function bindAdminAvaliacoesModalContent() {
    if (typeof window.__bindAdminAvaliacoesStandalone !== 'function') {
      return;
    }

    window.__bindAdminAvaliacoesStandalone({
      normalizeSearchValue: normalizeSearchValue,
      showGlobalStatus: showGlobalStatus,
      loadAdminPanelModalContent: loadAdminPanelModalContent,
      getAdminPanelModalBodyElement: function () {
        return adminPanelModalBodyElement;
      },
    });
  }

  function buildInstagramEmbedUrl(postUrl) {
    var cleanUrl = String(postUrl || '').trim();

    if (cleanUrl === '') {
      return 'about:blank';
    }

    cleanUrl = cleanUrl.replace(/[?#].*$/, '');

    var match = cleanUrl.match(/instagram\.com\/(?:[^/]+\/)?(p|reel|tv)\/([^/]+)/i);
    if (!match) {
      return 'about:blank';
    }

    return 'https://www.instagram.com/' + match[1].toLowerCase() + '/' + match[2] + '/embed/';
  }

  function isDesktopViewport() {
    return window.matchMedia('(min-width: 992px)').matches;
  }

  function setInstagramLoadingState(isLoading) {
    if (!instagramPostsSkeletonElement) {
      return;
    }

    if (isLoading) {
      if (instagramPostsContainerElement) {
        instagramPostsContainerElement.innerHTML = '';
      }
      if (instagramPostsEmptyElement) {
        instagramPostsEmptyElement.classList.add('d-none');
      }
    }

    instagramPostsSkeletonElement.classList.toggle('is-hidden', !isLoading);
    instagramPostsSkeletonElement.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }

  function buildInstagramPostCard(post) {
    var title = String((post && post.title) || 'Postagem do Instagram');
    var permalink = String((post && post.permalink) || '').trim();
    var coverUrl = String((post && post.coverUrl) || '').trim();

    if (permalink === '') {
      return null;
    }

    var col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-lg-auto';

    var article = document.createElement('article');
    article.className = 'card border-0 shadow-sm instagram-post-card h-100 js-instagram-preview-card';
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.setAttribute('data-post-title', title);
    article.setAttribute('data-post-url', permalink);
    article.setAttribute('data-post-cover', coverUrl);

    if (coverUrl !== '') {
      var image = document.createElement('img');
      image.src = coverUrl;
      image.alt = 'Capa da postagem do Instagram';
      image.className = 'instagram-image card-img-top';
      image.referrerPolicy = 'no-referrer';
      article.appendChild(image);
    } else {
      var fallback = document.createElement('div');
      fallback.className = 'instagram-image-fallback d-flex align-items-center justify-content-center';
      var fallbackLabel = document.createElement('span');
      fallbackLabel.className = 'fw-bold text-white';
      fallbackLabel.textContent = 'Instagram';
      fallback.appendChild(fallbackLabel);
      article.appendChild(fallback);
    }

    var cardBody = document.createElement('div');
    cardBody.className = 'card-body d-flex flex-column justify-content-end text-center';

    var text = document.createElement('p');
    text.className = 'small text-secondary mb-3';
    text.textContent = title;

    var link = document.createElement('a');
    link.href = permalink;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'btn btn-outline-danger btn-sm js-instagram-open-link btn-micro';
    link.innerHTML = '<i class="lab la-instagram me-1"></i>Ver no Instagram';

    cardBody.appendChild(text);
    cardBody.appendChild(link);
    article.appendChild(cardBody);
    col.appendChild(article);

    return col;
  }

  function attachPreviewCardListeners(card) {
    if (!card || card.getAttribute('data-preview-bound') === 'true') {
      return;
    }

    function openPreviewModal() {
      if (!instagramPreviewModalInstance) {
        return;
      }

      var title = card.getAttribute('data-post-title') || 'Postagem do Instagram';
      var postUrl = card.getAttribute('data-post-url') || '#';
      if (instagramPreviewTitleElement) {
        instagramPreviewTitleElement.textContent = title;
      }

      if (instagramPreviewFrameElement) {
        instagramPreviewFrameElement.src = buildInstagramEmbedUrl(postUrl);
      }

      if (instagramPreviewLinkElement) {
        instagramPreviewLinkElement.setAttribute('href', postUrl);
      }

      instagramPreviewModalInstance.show();
    }

    card.addEventListener('click', function (event) {
      if (event.target && event.target.closest('.js-instagram-open-link')) {
        return;
      }

      openPreviewModal();
    });

    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPreviewModal();
      }
    });

    card.setAttribute('data-preview-bound', 'true');
  }

  function renderInstagramPosts(posts) {
    if (!instagramPostsContainerElement) {
      return Promise.resolve();
    }

    instagramPostsRenderToken += 1;
    var currentRenderToken = instagramPostsRenderToken;

    instagramPostsContainerElement.innerHTML = '';

    if (!Array.isArray(posts) || posts.length === 0) {
      if (instagramPostsEmptyElement) {
        instagramPostsEmptyElement.classList.add('d-none');
      }
      return Promise.resolve();
    }

    if (instagramPostsEmptyElement) {
      instagramPostsEmptyElement.classList.add('d-none');
    }

    var cards = posts
      .map(buildInstagramPostCard)
      .filter(function (cardElement) { return Boolean(cardElement); });

    if (!cards.length) {
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      var index = 0;

      function appendNextCard() {
        if (currentRenderToken !== instagramPostsRenderToken) {
          resolve();
          return;
        }

        if (index >= cards.length) {
          resolve();
          return;
        }

        var cardElement = cards[index];
        index += 1;

        if (index === 1) {
          setInstagramLoadingState(false);
        }

        instagramPostsContainerElement.appendChild(cardElement);
        var enteringCard = cardElement.querySelector('.js-instagram-preview-card');
        if (enteringCard) {
          enteringCard.classList.add('is-entering');
          enteringCard.addEventListener('animationend', function onAnimationEnd() {
            enteringCard.classList.remove('is-entering');
            enteringCard.removeEventListener('animationend', onAnimationEnd);
          });
        }

        var card = cardElement.querySelector('.js-instagram-preview-card');
        attachPreviewCardListeners(card);

        window.setTimeout(function () {
          window.requestAnimationFrame(appendNextCard);
        }, instagramPostsRenderDelayMs);
      }

      appendNextCard();
    });
  }

  function loadInstagramPostsAsync() {
    if (!instagramPostsWrapperElement) {
      return;
    }

    var hasConfiguredLinks = (instagramPostsWrapperElement.getAttribute('data-has-links') || '').trim() === '1';
    if (!hasConfiguredLinks) {
      renderInstagramPosts([]);
      setInstagramLoadingState(false);
      return;
    }

    var endpoint = (instagramPostsWrapperElement.getAttribute('data-endpoint') || '').trim();
    if (endpoint === '') {
      setInstagramLoadingState(false);
      return;
    }

    setInstagramLoadingState(true);
    instagramPostsRenderToken += 1;

    fetch(endpoint, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Falha ao carregar posts.');
        }

        return response.json();
      })
      .then(function (payload) {
        if (payload && payload.hasConfiguredLinks === false) {
          return renderInstagramPosts([]);
        }

        return renderInstagramPosts(payload && payload.posts);
      })
      .catch(function () {
        return renderInstagramPosts([]);
      })
      .finally(function () {
        setInstagramLoadingState(false);
      });
  }

  function isValidInstagramPostUrl(url) {
    var cleanUrl = String(url || '').trim();

    if (cleanUrl === '') {
      return false;
    }

    return /^https?:\/\/(?:www\.)?instagram\.com\/(?:[^/]+\/)?(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/i.test(cleanUrl);
  }

  function updateInstagramManageValidation() {
    if (!instagramManageLinkInputs.length || !instagramManageValidCountElement) {
      return;
    }

    var validCount = 0;

    instagramManageLinkInputs.forEach(function (input) {
      var value = (input.value || '').trim();
      var isValid = isValidInstagramPostUrl(value);

      input.classList.remove('is-valid', 'is-invalid');
      if (value !== '') {
        input.classList.add(isValid ? 'is-valid' : 'is-invalid');
      }

      if (isValid) {
        validCount += 1;
      }

      var openLinkId = input.getAttribute('data-open-link-id');
      if (!openLinkId) {
        return;
      }

      var openLinkButton = document.getElementById(openLinkId);
      if (!openLinkButton) {
        return;
      }

      if (isValid) {
        openLinkButton.classList.remove('disabled');
        openLinkButton.removeAttribute('aria-disabled');
        openLinkButton.removeAttribute('tabindex');
        openLinkButton.setAttribute('href', value);
      } else {
        openLinkButton.classList.add('disabled');
        openLinkButton.setAttribute('aria-disabled', 'true');
        openLinkButton.setAttribute('tabindex', '-1');
        openLinkButton.setAttribute('href', '#');
      }
    });

    instagramManageValidCountElement.textContent = validCount + '/3 links válidos';
    instagramManageValidCountElement.classList.remove('text-bg-secondary', 'text-bg-warning', 'text-bg-success');

    if (validCount === 3) {
      instagramManageValidCountElement.classList.add('text-bg-success');
      return;
    }

    if (validCount > 0) {
      instagramManageValidCountElement.classList.add('text-bg-warning');
      return;
    }

    instagramManageValidCountElement.classList.add('text-bg-secondary');
  }

  function resetInstagramManageFormState() {
    if (!instagramManageLinkInputs.length) {
      return;
    }

    instagramManageLinkInputs.forEach(function (input) {
      input.value = input.defaultValue || '';
      input.classList.remove('is-valid', 'is-invalid');
    });

    updateInstagramManageValidation();
  }

  function bindMyProfileModal() {
    if (!myProfileModalElement || !myProfileFormElement) {
      return;
    }

    var loadEndpoint = String(myProfileFormElement.getAttribute('data-load-endpoint') || '').trim();
    var submitEndpoint = String(myProfileFormElement.getAttribute('action') || '').trim();
    var submitDefaultHtml = myProfileSubmitButton ? myProfileSubmitButton.innerHTML : '';

    function setLoadingState(isLoading) {
      if (myProfileSubmitButton) {
        myProfileSubmitButton.disabled = isLoading;
        myProfileSubmitButton.innerHTML = isLoading
          ? '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Salvando...'
          : submitDefaultHtml;
      }

      if (myProfileNomeInput) {
        myProfileNomeInput.disabled = isLoading;
      }

      if (myProfileEmailInput) {
        myProfileEmailInput.disabled = isLoading;
      }

      if (myProfileSenhaInput) {
        myProfileSenhaInput.disabled = isLoading;
      }
    }

    function loadMyProfileData() {
      if (loadEndpoint === '') {
        return;
      }

      if (myProfileNomeInput) {
        myProfileNomeInput.value = '';
      }

      if (myProfileEmailInput) {
        myProfileEmailInput.value = '';
      }

      if (myProfileCpfInput) {
        myProfileCpfInput.value = '';
      }

      if (myProfileUsuarioInput) {
        myProfileUsuarioInput.value = '';
      }

      if (myProfileSenhaInput) {
        myProfileSenhaInput.value = '';
      }

      fetch(loadEndpoint, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao carregar dados do perfil.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          var data = payload && payload.data ? payload.data : {};

          if (myProfileNomeInput) {
            myProfileNomeInput.value = String(data.nome || '');
          }

          if (myProfileEmailInput) {
            myProfileEmailInput.value = String(data.email || '');
          }

          if (myProfileCpfInput) {
            myProfileCpfInput.value = String(data.cpf || '');
          }

          if (myProfileUsuarioInput) {
            myProfileUsuarioInput.value = String(data.usuario || '');
          }

          if (myProfileSenhaInput) {
            myProfileSenhaInput.value = '';
          }
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao carregar seus dados.', true);
        });
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      myProfileModalInstance = bootstrap.Modal.getOrCreateInstance(myProfileModalElement, {
        backdrop: 'static',
      });
    }

    myProfileTriggerButtons.forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
      });
    });

    myProfileModalElement.addEventListener('shown.bs.modal', function () {
      loadMyProfileData();
    });

    myProfileModalElement.addEventListener('hidden.bs.modal', function () {
      if (myProfileSenhaInput) {
        myProfileSenhaInput.value = '';
      }

      setLoadingState(false);
    });

    myProfileFormElement.addEventListener('submit', function (event) {
      event.preventDefault();

      if (submitEndpoint === '') {
        showGlobalStatus('Rota de salvamento não configurada.', true);
        return;
      }

      setLoadingState(true);

      fetch(submitEndpoint, {
        method: 'POST',
        body: new FormData(myProfileFormElement),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return { ok: false, message: 'Resposta inválida do servidor.' }; })
            .then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.message || 'Falha ao atualizar dados.');
              }

              return payload;
            });
        })
        .then(function (payload) {
          showGlobalStatus(payload.message || 'Dados atualizados com sucesso.', false);

          if (myProfileSenhaInput) {
            myProfileSenhaInput.value = '';
          }

          if (myProfileModalInstance) {
            myProfileModalInstance.hide();
          }
        })
        .catch(function (error) {
          showGlobalStatus(error && error.message ? error.message : 'Erro ao atualizar seus dados.', true);
        })
        .finally(function () {
          setLoadingState(false);
        });
    });
  }

  function applySidebarState(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed && isDesktopViewport());

    if (sidebarToggleButton && isDesktopViewport()) {
      sidebarToggleButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      sidebarToggleButton.setAttribute('aria-label', collapsed ? 'Mostrar menu lateral' : 'Ocultar menu lateral');
    }
  }

  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }

  if (sidebarToggleButton) {
    var isCollapsed = localStorage.getItem(sidebarStateKey) === 'true';
    applySidebarState(isCollapsed);

    sidebarToggleButton.addEventListener('click', function () {
      if (isDesktopViewport()) {
        isCollapsed = !isCollapsed;
        localStorage.setItem(sidebarStateKey, String(isCollapsed));
        applySidebarState(isCollapsed);
        return;
      }

      if (mobileMenuElement && typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
        if (!mobileMenuInstance) {
          mobileMenuInstance = bootstrap.Offcanvas.getOrCreateInstance(mobileMenuElement);
        }

        mobileMenuInstance.toggle();
      }
    });

    window.addEventListener('resize', function () {
      applySidebarState(isCollapsed);
    });
  }

  if (instagramManageModalElement && instagramManageModalElement.querySelector('.alert-danger')) {
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      var instagramManageModal = bootstrap.Modal.getOrCreateInstance(instagramManageModalElement);
      instagramManageModal.show();
    }
  }

  if (instagramManageLinkInputs.length) {
    updateInstagramManageValidation();

    instagramManageLinkInputs.forEach(function (input) {
      input.addEventListener('input', updateInstagramManageValidation);
      input.addEventListener('blur', updateInstagramManageValidation);
    });
  }

  if (instagramManageModalElement) {
    instagramManageModalElement.addEventListener('hidden.bs.modal', function () {
      resetInstagramManageFormState();
    });
  }

  if (instagramPreviewModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    instagramPreviewModalInstance = bootstrap.Modal.getOrCreateInstance(instagramPreviewModalElement);
  }

  document.querySelectorAll('.js-instagram-preview-card').forEach(function (card) {
    attachPreviewCardListeners(card);
  });

  if (instagramPostsWrapperElement) {
    if (document.readyState === 'complete') {
      setTimeout(loadInstagramPostsAsync, 0);
    } else {
      window.addEventListener('load', loadInstagramPostsAsync, { once: true });
    }
  }

  if (instagramPreviewModalElement && instagramPreviewFrameElement) {
    instagramPreviewModalElement.addEventListener('hidden.bs.modal', function () {
      instagramPreviewFrameElement.src = 'about:blank';
    });
  }

  if (institutionalServiceSearchInput && institutionalServiceItems.length) {
    bindInstitutionalAccordionPersistence();
    restoreInstitutionalAccordionState();
    institutionalServiceSearchInput.addEventListener('input', filterInstitutionalServices);
    filterInstitutionalServices();
  }

  if (adminPanelSearchInput && adminPanelItems.length) {
    adminPanelSearchInput.addEventListener('input', filterAdminPanelItems);
    filterAdminPanelItems();
  }

  if (informacoesSearchInput) {
    informacoesSearchInput.addEventListener('input', filterInformacoesPosts);
    if (informacoesFiltersForm) {
      informacoesFiltersForm.addEventListener('submit', function (event) {
        event.preventDefault();
        filterInformacoesPosts();
      });
    }
    filterInformacoesPosts();
  }

  if (informacoesFilterMonthSelect) {
    informacoesFilterMonthSelect.addEventListener('change', filterInformacoesPosts);
  }

  if (informacoesFilterYearSelect) {
    informacoesFilterYearSelect.addEventListener('change', filterInformacoesPosts);
  }

  if (adminPanelModalElement && adminPanelModalTitleElement && adminPanelModalTriggerButtons.length) {
    adminPanelModalTriggerButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var title = button.getAttribute('data-modal-title') || 'Painel Administrativo';
        var view = button.getAttribute('data-modal-view') || '';

        loadAdminPanelModalContent(view, title)
          .then(function (loaded) {
            if (!loaded) {
              return;
            }

            runAdminModalPostLoadAction(button, view);
          });
      });
    });
  }

  window.__bindAdminAvaliacoesFromMain = bindAdminAvaliacoesModalContent;

  bindMyProfileModal();
  bindAdminInformacoesModalContent();
  bindAdminAvaliacoesModalContent();
});
