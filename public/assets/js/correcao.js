;(function () {
	function bindPressOnce(element, marker, handler) {
		if (!(element instanceof HTMLElement) || typeof handler !== 'function') {
			return;
		}

		var key = 'correcaoPressBound' + marker;
		if (element.dataset[key] === '1') {
			return;
		}

		var lastPointerUpAt = 0;
		var lastTouchEndAt = 0;
		element.dataset[key] = '1';
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

			event.preventDefault();
			event.stopPropagation();
			handler(event);
		});
	}

	function bindOnce(element, eventName, marker, handler) {
		if (!(element instanceof HTMLElement) || typeof handler !== 'function') {
			return;
		}

		var key = 'correcaoBound' + marker;
		if (element.dataset[key] === '1') {
			return;
		}

		element.dataset[key] = '1';
		element.addEventListener(eventName, handler);
	}

	function buildManualRowFromButton(button) {
		if (!(button instanceof HTMLElement)) {
			return null;
		}

		return {
			id: 0,
			avaliacao_id: Number(button.getAttribute('data-avaliacao-id') || 0),
			aluno_id: Number(button.getAttribute('data-aluno-id') || 0),
			turma_id: Number(button.getAttribute('data-turma-id') || 0),
			aluno_nome: String(button.getAttribute('data-aluno-nome') || '').trim(),
			turma_nome: String(button.getAttribute('data-turma-nome') || '').trim(),
			numeracao: String(button.getAttribute('data-numeracao') || '').trim(),
			qr_payload: String(button.getAttribute('data-qr-payload') || '').trim(),
			respostas: {},
			correcoes: [],
		};
	}

	function wireCorrectionModule(api) {
		if (!api || typeof api !== 'object' || api.__externalBound === true) {
			return;
		}

		api.__externalBound = true;

		var elements = typeof api.getElements === 'function' ? api.getElements() : {};
		var dashboardModalElement = elements.dashboardModalElement;
		var dashboardTabsElement = elements.dashboardTabsElement;
		var correcaoPane = elements.correcaoPane;
		var correcaoStartBtn = elements.correcaoStartBtn;
		var correcaoStopBtn = elements.correcaoStopBtn;
		var correcaoConfirmBtn = elements.correcaoConfirmBtn;
		var correcaoNextBtn = elements.correcaoNextBtn;
		var correcaoRetryBtn = elements.correcaoRetryBtn;
		var correcaoProcessBtn = elements.correcaoProcessBtn;
		var correcaoRefreshBtn = elements.correcaoRefreshBtn;
		var correcaoTableBody = elements.correcaoTableBody;
		var correcaoRosterBody = elements.correcaoRosterBody;
		var correcaoRosterSearchInput = elements.correcaoRosterSearchInput;
		var correcaoDiscursivaModalElement = elements.correcaoDiscursivaModalElement;
		var correcaoDiscursivaSaveBtn = elements.correcaoDiscursivaSaveBtn;
		var correcaoDiscursivaCancelBtn = elements.correcaoDiscursivaCancelBtn;
		var correcaoRevisaoModalElement = elements.correcaoRevisaoModalElement;
		var correcaoRevisaoSaveBtn = elements.correcaoRevisaoSaveBtn;
		var correcaoRevisaoCancelBtn = elements.correcaoRevisaoCancelBtn;
		var correcaoEdicaoModalElement = elements.correcaoEdicaoModalElement;
		var correcaoEdicaoSaveBtn = elements.correcaoEdicaoSaveBtn;
		var correcaoEdicaoCancelBtn = elements.correcaoEdicaoCancelBtn;

		bindOnce(correcaoStartBtn, 'click', 'Start', function () {
			api.beginCorrecaoFlow();
		});
		bindPressOnce(correcaoStopBtn, 'Stop', function () {
			api.closeCorrecaoModal();
		});
		bindOnce(correcaoConfirmBtn, 'click', 'Confirm', function () {
			api.proceedCorrecaoToGabarito();
		});
		bindOnce(correcaoNextBtn, 'click', 'Next', function () {
			api.goToNextCorrecaoQr();
		});
		bindOnce(correcaoRetryBtn, 'click', 'Retry', function () {
			if (typeof api.retryCorrecaoForCurrentTarget === 'function') {
				api.retryCorrecaoForCurrentTarget();
			}
		});
		bindOnce(correcaoProcessBtn, 'click', 'Process', function () {
			api.processGabaritoManually();
		});
		bindOnce(correcaoRefreshBtn, 'click', 'Refresh', function () {
			api.loadCorrecoesList(false);
		});

		bindOnce(correcaoRosterSearchInput, 'input', 'RosterSearch', function () {
			api.renderCorrecoesRoster();
		});

		bindOnce(correcaoTableBody, 'click', 'TableActions', function (event) {
			var target = event.target instanceof HTMLElement ? event.target : null;
			if (!target) {
				return;
			}

			var editBtn = target.closest('.js-admin-correcao-edit');
			if (editBtn) {
				var row = api.getCorrecaoRowById(editBtn.getAttribute('data-id'));
				if (row) {
					api.openCorrecaoEdicaoModal(row);
				}
				return;
			}

			var deleteBtn = target.closest('.js-admin-correcao-delete');
			if (deleteBtn) {
				api.deleteCorrecaoById(deleteBtn.getAttribute('data-id')).then(function () {
					api.loadCorrecoesList(true);
				}).catch(function () {
				});
			}
		});

		bindOnce(correcaoRosterBody, 'click', 'RosterActions', function (event) {
			var target = event.target instanceof HTMLElement ? event.target : null;
			if (!target) {
				return;
			}

			var editBtn = target.closest('.js-admin-correcao-edit');
			if (editBtn) {
				var existingRow = api.getCorrecaoRowById(editBtn.getAttribute('data-id'));
				if (existingRow) {
					api.openCorrecaoEdicaoModal(existingRow);
				}
				return;
			}

			var deleteBtn = target.closest('.js-admin-correcao-delete');
			if (deleteBtn) {
				api.deleteCorrecaoById(deleteBtn.getAttribute('data-id')).then(function () {
					api.loadCorrecoesList(true);
				}).catch(function () {
				});
				return;
			}

			var manualBtn = target.closest('.js-admin-correcao-create-manual');
			if (manualBtn) {
				var manualRow = buildManualRowFromButton(manualBtn);
				if (manualRow) {
					api.openCorrecaoEdicaoModal(manualRow);
				}
			}
		});

		bindOnce(correcaoDiscursivaSaveBtn, 'click', 'DiscSave', function () {
			api.submitCorrecaoDiscursivaModal();
		});
		bindOnce(correcaoDiscursivaCancelBtn, 'click', 'DiscCancel', function () {
			api.cancelCorrecaoDiscursivaModal();
		});
		bindOnce(correcaoRevisaoSaveBtn, 'click', 'ReviewSave', function () {
			api.confirmCorrecaoRevisaoModal();
		});
		bindOnce(correcaoRevisaoCancelBtn, 'click', 'ReviewCancel', function () {
			api.cancelCorrecaoRevisaoModal();
		});
		bindOnce(correcaoEdicaoSaveBtn, 'click', 'EditSave', function () {
			api.submitCorrecaoEdicaoModal();
		});
		bindOnce(correcaoEdicaoCancelBtn, 'click', 'EditCancel', function () {
			api.closeCorrecaoEdicaoModal();
		});

		bindOnce(correcaoDiscursivaModalElement, 'hidden.bs.modal', 'DiscHidden', function () {
			api.cancelCorrecaoDiscursivaModal();
		});
		bindOnce(correcaoRevisaoModalElement, 'hidden.bs.modal', 'ReviewHidden', function () {
			api.cancelCorrecaoRevisaoModal();
		});

		bindOnce(dashboardModalElement, 'hidden.bs.modal', 'DashboardHidden', function () {
			api.stopCorrecoesPolling();
		});

		bindOnce(dashboardTabsElement, 'shown.bs.tab', 'TabsShown', function (event) {
			var targetId = event && event.target ? String(event.target.getAttribute('data-bs-target') || '') : '';
			if (targetId === '#adminAvaliacaoDashboardPaneCorrecao') {
				api.loadCorrecoesList(false);
				api.startCorrecoesPolling();
				return;
			}

			api.stopCorrecoesPolling();
		});

		if (correcaoPane instanceof HTMLElement && correcaoPane.classList.contains('show')) {
			api.loadCorrecoesList(false);
			api.startCorrecoesPolling();
		}
	}

	window.__initAdminAvaliacaoCorrecaoModule = function (api) {
		wireCorrectionModule(api);
	};

	if (window.__adminAvaliacoesCorrecaoApi) {
		wireCorrectionModule(window.__adminAvaliacoesCorrecaoApi);
	}
}());
