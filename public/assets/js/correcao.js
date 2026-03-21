; (function () {
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

	function bindImmediatePressOnce(element, marker, handler) {
		if (!(element instanceof HTMLElement) || typeof handler !== 'function') {
			return;
		}

		var key = 'correcaoImmediateBound' + marker;
		if (element.dataset[key] === '1') {
			return;
		}

		var lastImmediateAt = 0;
		element.dataset[key] = '1';
		element.style.pointerEvents = 'auto';
		element.style.touchAction = 'manipulation';

		function handleImmediate(event) {
			if (event && typeof event.button === 'number' && event.button !== 0) {
				return;
			}

			lastImmediateAt = Date.now();
			event.preventDefault();
			event.stopPropagation();
			handler(event);
		}

		element.addEventListener('pointerdown', handleImmediate);
		element.addEventListener('touchstart', handleImmediate, { passive: false });
		element.addEventListener('click', function (event) {
			if ((Date.now() - lastImmediateAt) < 400) {
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

	window.__createAdminAvaliacaoCorrecaoCameraModule = function (api) {
		if (!api || typeof api !== 'object' || typeof api.getCameraDeps !== 'function') {
			return null;
		}

		var deps = api.getCameraDeps();
		if (!deps || typeof deps !== 'object') {
			return null;
		}

		var elements = deps.elements || {};
		var helpers = deps.helpers || {};

		function getState() {
			return typeof deps.getState === 'function' ? (deps.getState() || {}) : {};
		}

		function setState(patch) {
			if (typeof deps.setState === 'function') {
				deps.setState(patch || {});
			}
		}

		function getQuestoesItens() {
			return typeof deps.getGabaritoQuestoesItens === 'function'
				? (deps.getGabaritoQuestoesItens() || [])
				: [];
		}

		function getActiveAvaliacaoId() {
			if (typeof deps.getActiveDashboardAvaliacaoId === 'function') {
				return Number(deps.getActiveDashboardAvaliacaoId() || 0);
			}
			return 0;
		}

		function stopCorrecaoScanLoop() {
			var state = getState();
			if (state.correcaoScanFrameId) {
				window.cancelAnimationFrame(state.correcaoScanFrameId);
			}

			setState({
				correcaoScanFrameId: 0,
				correcaoLastAutoCaptureAt: 0,
				correcaoQrValidatedAt: 0,
				correcaoGabaritoStableFrames: 0,
				correcaoQrReferenceSignature: null,
			});
		}

		function stopCorrecaoCamera() {
			var state = getState();
			stopCorrecaoScanLoop();
			if (typeof helpers.clearCorrecaoDiagnosticsOverlay === 'function') {
				helpers.clearCorrecaoDiagnosticsOverlay();
			}

			if (state.correcaoCameraStream) {
				state.correcaoCameraStream.getTracks().forEach(function (track) {
					track.stop();
				});
			}

			setState({
				correcaoCameraStream: null,
				correcaoCurrentTarget: null,
			});

			if (elements.correcaoVideo instanceof HTMLVideoElement) {
				elements.correcaoVideo.pause();
				elements.correcaoVideo.srcObject = null;
				elements.correcaoVideo.classList.add('d-none');
			}

			if (elements.correcaoVideoPlaceholder) {
				elements.correcaoVideoPlaceholder.classList.remove('d-none');
			}

			if (typeof helpers.renderCorrecaoTarget === 'function') {
				helpers.renderCorrecaoTarget();
			}
			if (typeof helpers.setCorrecaoScannerStep === 'function') {
				helpers.setCorrecaoScannerStep('idle', 'Nenhuma correção em andamento.');
			}
		}

		function startCorrecaoCamera() {
			var state = getState();
			if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
				return Promise.reject(new Error('A câmera não é suportada neste navegador.'));
			}

			if (state.correcaoCameraStream && elements.correcaoVideo instanceof HTMLVideoElement) {
				return Promise.resolve(elements.correcaoVideo);
			}

			return navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: { ideal: 'environment' },
					width: { ideal: 1280, min: 640 },
					height: { ideal: 720, min: 480 },
					frameRate: { ideal: 30, max: 30 },
				},
				audio: false,
			}).then(function (stream) {
				setState({ correcaoCameraStream: stream });
				if (!(elements.correcaoVideo instanceof HTMLVideoElement)) {
					throw new Error('Elemento de vídeo da correção não encontrado.');
				}

				var videoTrack = stream.getVideoTracks()[0];
				if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
					var capabilities = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
					var advancedConstraints = {};
					if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
						advancedConstraints.focusMode = 'continuous';
					}
					if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
						advancedConstraints.exposureMode = 'continuous';
					}
					if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
						advancedConstraints.whiteBalanceMode = 'continuous';
					}
					if (Object.keys(advancedConstraints).length > 0) {
						videoTrack.applyConstraints({ advanced: [advancedConstraints] }).catch(function () {
						});
					}
				}

				elements.correcaoVideo.srcObject = stream;
				elements.correcaoVideo.classList.remove('d-none');
				if (elements.correcaoVideoPlaceholder) {
					elements.correcaoVideoPlaceholder.classList.add('d-none');
				}

				return elements.correcaoVideo.play().then(function () {
					return elements.correcaoVideo;
				});
			});
		}

		function openCorrecaoModal() {
			if (!elements.correcaoModalInstance) {
				return;
			}

			if (typeof helpers.prepareModalOpen === 'function') {
				helpers.prepareModalOpen();
			}
			if (elements.dashboardModalElement) {
				elements.dashboardModalElement.classList.add('admin-avaliacao-dashboard-modal-underlay');
			}
			elements.correcaoModalInstance.show();
			window.setTimeout(function () {
				if (typeof helpers.setCorrecaoBackdropIsolation === 'function') {
					helpers.setCorrecaoBackdropIsolation(true);
				}
			}, 0);
		}

		function closeCorrecaoModal() {
			if (!elements.correcaoModalInstance) {
				stopCorrecaoCamera();
				if (elements.dashboardModalElement) {
					elements.dashboardModalElement.classList.remove('admin-avaliacao-dashboard-modal-underlay');
				}
				if (typeof helpers.setCorrecaoBackdropIsolation === 'function') {
					helpers.setCorrecaoBackdropIsolation(false);
				}
				return;
			}

			stopCorrecaoScanLoop();
			stopCorrecaoCamera();
			elements.correcaoModalInstance.hide();
		}

		function resumeVideoAfterProcess() {
			var state = getState();
			setState({ correcaoFrozenCanvas: null });
			if (elements.correcaoVideo instanceof HTMLVideoElement) {
				elements.correcaoVideo.style.backgroundImage = '';
				elements.correcaoVideo.style.backgroundSize = '';
				elements.correcaoVideo.style.backgroundPosition = '';
				if (elements.correcaoVideo.paused && state.correcaoCameraStream) {
					elements.correcaoVideo.play().catch(function () { });
				}
			}
			if (getState().correcaoScannerStep === 'scan-gabarito') {
				runCorrecaoGabaritoLoop();
			}
		}

		function goToNextCorrecaoQr() {
			setState({ correcaoCurrentTarget: null });
			if (typeof helpers.closeCorrecaoRevisaoModal === 'function') {
				helpers.closeCorrecaoRevisaoModal();
			}
			if (typeof helpers.closeCorrecaoDiscursivaModal === 'function') {
				helpers.closeCorrecaoDiscursivaModal();
			}
			if (typeof helpers.resetCorrecaoAutoReadStability === 'function') {
				helpers.resetCorrecaoAutoReadStability();
			}
			resumeVideoAfterProcess();
			if (typeof helpers.renderCorrecaoTarget === 'function') {
				helpers.renderCorrecaoTarget();
			}
			if (typeof helpers.setCorrecaoScannerStep === 'function') {
				helpers.setCorrecaoScannerStep('scan-qr', 'Aponte a câmera para o QR Code da próxima folha.');
			}
			runCorrecaoQrLoop();
		}

		function proceedCorrecaoToGabarito() {
			var state = getState();
			if (!state.correcaoCurrentTarget) {
				return;
			}

			stopCorrecaoScanLoop();
			setState({
				correcaoQrValidatedAt: Date.now(),
				correcaoGabaritoStableFrames: 0,
				correcaoQrReferenceSignature: typeof helpers.buildCorrecaoFrameSignature === 'function'
					? helpers.buildCorrecaoFrameSignature(typeof helpers.captureCorrecaoFrame === 'function' ? helpers.captureCorrecaoFrame() : null)
					: null,
			});
			if (typeof helpers.resetCorrecaoAutoReadStability === 'function') {
				helpers.resetCorrecaoAutoReadStability();
			}
			if (typeof helpers.setCorrecaoScannerStep === 'function') {
				helpers.setCorrecaoScannerStep('scan-gabarito', 'QR confirmado. Enquadre o gabarito com os 4 marcadores. A leitura começa automaticamente; use PROCESSAR se quiser forçar a captura.');
			}

			window.setTimeout(function () {
				var currentState = getState();
				if (currentState.correcaoScannerStep !== 'scan-gabarito' || !currentState.correcaoCurrentTarget) {
					return;
				}

				if (typeof helpers.setCorrecaoScannerStep === 'function') {
					helpers.setCorrecaoScannerStep('scan-gabarito', 'Enquadre o gabarito na tela. Quando os 4 marcadores estabilizarem, a leitura será feita automaticamente; PROCESSAR continua disponível como fallback.');
				}
				runCorrecaoGabaritoLoop();
			}, 500);
		}

		function runCorrecaoQrLoop() {
			stopCorrecaoScanLoop();
			if (getState().correcaoScannerStep !== 'scan-qr') {
				return;
			}

			var frameId = window.requestAnimationFrame(function processFrame() {
				var state = getState();
				if (state.correcaoScannerStep !== 'scan-qr' || state.correcaoBusy) {
					setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
					return;
				}

				setState({ correcaoBusy: true });
				Promise.resolve(typeof helpers.decodeQrFromCurrentFrame === 'function' ? helpers.decodeQrFromCurrentFrame() : null)
					.then(function (rawPayload) {
						if (rawPayload && typeof helpers.handleCorrecaoQrPayload === 'function') {
							return helpers.handleCorrecaoQrPayload(rawPayload);
						}
						return null;
					})
					.finally(function () {
						setState({ correcaoBusy: false });
						if (getState().correcaoScannerStep === 'scan-qr') {
							setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
						}
					});
			});
			setState({ correcaoScanFrameId: frameId });
		}

		function runCorrecaoGabaritoLoop() {
			runCorrecaoGabaritoLoopLegacy();
		}

		function processGabaritoManually() {
			var state = getState();
			if (state.correcaoScannerStep !== 'scan-gabarito' || !state.correcaoCurrentTarget || state.correcaoBusy) {
				return;
			}

			var captureCanvas = typeof helpers.captureCorrecaoFrame === 'function' ? helpers.captureCorrecaoFrame() : null;
			if (!(captureCanvas instanceof HTMLCanvasElement)) {
				if (typeof helpers.setCorrecaoScannerStep === 'function') {
					helpers.setCorrecaoScannerStep('scan-gabarito', 'A imagem da câmera ainda não está pronta. Tente novamente.');
				}
				return;
			}

			var cropCanvas = captureCanvas;
			var guideBoxEl = document.querySelector('.admin-avaliacao-correcao-align-guide-box');
			if (guideBoxEl && elements.correcaoVideo instanceof HTMLVideoElement) {
				var videoRect = elements.correcaoVideo.getBoundingClientRect();
				var guideRect = guideBoxEl.getBoundingClientRect();
				if (videoRect.width > 0 && videoRect.height > 0) {
					var vidAspect = captureCanvas.width / captureCanvas.height;
					var elAspect = videoRect.width / videoRect.height;
					var scaleToVideo;
					var offX;
					var offY;
					if (elAspect > vidAspect) {
						scaleToVideo = captureCanvas.width / videoRect.width;
						offX = 0;
						offY = (captureCanvas.height - videoRect.height * scaleToVideo) / 2;
					} else {
						scaleToVideo = captureCanvas.height / videoRect.height;
						offX = (captureCanvas.width - videoRect.width * scaleToVideo) / 2;
						offY = 0;
					}
					var gx = (guideRect.left - videoRect.left) * scaleToVideo + offX;
					var gy = (guideRect.top - videoRect.top) * scaleToVideo + offY;
					var gw = guideRect.width * scaleToVideo;
					var gh = guideRect.height * scaleToVideo;
					var cx = Math.max(0, Math.round(gx));
					var cy = Math.max(0, Math.round(gy));
					var cw = Math.min(captureCanvas.width - cx, Math.round(gw));
					var ch = Math.min(captureCanvas.height - cy, Math.round(gh));
					if (cw > 50 && ch > 50) {
						cropCanvas = document.createElement('canvas');
						cropCanvas.width = cw;
						cropCanvas.height = ch;
						cropCanvas.getContext('2d').drawImage(captureCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
					}
				}
			}

			var frozenCanvas = document.createElement('canvas');
			frozenCanvas.width = cropCanvas.width;
			frozenCanvas.height = cropCanvas.height;
			var frozenCtx = frozenCanvas.getContext('2d');
			if (frozenCtx) {
				frozenCtx.drawImage(cropCanvas, 0, 0);
			}
			setState({ correcaoFrozenCanvas: frozenCanvas });

			if (elements.correcaoVideo instanceof HTMLVideoElement) {
				try {
					elements.correcaoVideo.pause();
					var posterUrl = frozenCanvas.toDataURL('image/jpeg', 0.92);
					elements.correcaoVideo.style.backgroundImage = 'url(' + posterUrl + ')';
					elements.correcaoVideo.style.backgroundSize = 'contain';
					elements.correcaoVideo.style.backgroundPosition = 'center';
				} catch (_freezeError) {
				}
			}

			setState({ correcaoBusy: true });
			if (typeof helpers.setCorrecaoScannerStep === 'function') {
				helpers.setCorrecaoScannerStep('processing', 'Detectando os 4 marcadores automaticamente...');
			}

			window.setTimeout(function () {
				var latestState = getState();
				var latestFrozenCanvas = latestState.correcaoFrozenCanvas;
				try {
					var autoTransform = typeof helpers.buildCorrecaoMarkerTransform === 'function'
						? helpers.buildCorrecaoMarkerTransform(latestFrozenCanvas)
						: null;
					if (autoTransform && latestFrozenCanvas) {
						latestFrozenCanvas._userTransform = autoTransform;
						if (typeof helpers.renderCorrecaoDiagnosticsOverlay === 'function') {
							helpers.renderCorrecaoDiagnosticsOverlay(getState().correcaoLastDiagnostics, latestFrozenCanvas.width, latestFrozenCanvas.height);
						}
						if (typeof helpers.setCorrecaoScannerStep === 'function') {
							helpers.setCorrecaoScannerStep('processing', 'Marcadores detectados. Lendo respostas...');
						}
						window.setTimeout(function () {
							setState({ correcaoBusy: false, correcaoScannerStep: 'scan-gabarito' });
							captureAndCorrectCurrentSheet(false, latestFrozenCanvas);
						}, 60);
						return;
					}
				} catch (_autoErr) {
				}

				setState({ correcaoBusy: false });
				if (typeof helpers.setCorrecaoScannerStep === 'function') {
					helpers.setCorrecaoScannerStep('scan-gabarito', 'Não foi possível reconhecer os 4 pontos. Ajuste o enquadramento e clique em PROCESSAR novamente.');
				}
				resumeVideoAfterProcess();
			}, 80);
		}

		function runCorrecaoGabaritoLoopLegacy() {
			stopCorrecaoScanLoop();
			var state = getState();
			if (state.correcaoScannerStep !== 'scan-gabarito' || !state.correcaoCurrentTarget) {
				return;
			}

			var frameId = window.requestAnimationFrame(function processFrame() {
				var currentState = getState();
				if (currentState.correcaoScannerStep !== 'scan-gabarito' || !currentState.correcaoCurrentTarget) {
					return;
				}

				if (currentState.correcaoBusy) {
					setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
					return;
				}

				var now = Date.now();
				if ((now - currentState.correcaoQrValidatedAt) < 1200 || (now - currentState.correcaoLastAutoCaptureAt) < 650) {
					setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
					return;
				}

				var captureCanvas = typeof helpers.captureCorrecaoFrame === 'function' ? helpers.captureCorrecaoFrame() : null;
				if (!(captureCanvas instanceof HTMLCanvasElement)) {
					setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
					return;
				}

				setState({ correcaoBusy: true });
				Promise.resolve(typeof helpers.validateCorrecaoFrameForReading === 'function' ? helpers.validateCorrecaoFrameForReading(captureCanvas) : null)
					.then(function (validatedCanvas) {
						setState({ correcaoBusy: false });
						if (typeof helpers.renderCorrecaoDiagnosticsOverlay === 'function') {
							helpers.renderCorrecaoDiagnosticsOverlay(getState().correcaoLastDiagnostics, captureCanvas.width, captureCanvas.height);
						}

						var latestState = getState();
						if (latestState.correcaoScannerStep !== 'scan-gabarito' || !latestState.correcaoCurrentTarget) {
							return;
						}

						var stableFrames = Number(latestState.correcaoGabaritoStableFrames || 0) + 1;
						setState({ correcaoGabaritoStableFrames: stableFrames });
						if (stableFrames < 2) {
							if (typeof helpers.setCorrecaoScannerStep === 'function') {
								helpers.setCorrecaoScannerStep('scan-gabarito', 'Gabarito identificado. Mantenha a câmera estável para concluir a leitura.');
							}
							setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
							return;
						}

						setState({ correcaoLastAutoCaptureAt: now });
						captureAndCorrectCurrentSheet(true, validatedCanvas);

						if (getState().correcaoScannerStep === 'scan-gabarito') {
							setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
						}
					})
					.catch(function (error) {
						setState({ correcaoBusy: false, correcaoGabaritoStableFrames: 0 });
						if (typeof helpers.renderCorrecaoDiagnosticsOverlay === 'function') {
							helpers.renderCorrecaoDiagnosticsOverlay(getState().correcaoLastDiagnostics, captureCanvas.width, captureCanvas.height);
						}

						var latestState = getState();
						if (latestState.correcaoScannerStep !== 'scan-gabarito') {
							return;
						}

						if (error && error.message && typeof helpers.setCorrecaoScannerStep === 'function') {
							helpers.setCorrecaoScannerStep('scan-gabarito', error.message);
						}

						setState({ correcaoScanFrameId: window.requestAnimationFrame(processFrame) });
					});
			});
			setState({ correcaoScanFrameId: frameId });
		}

		function beginCorrecaoFlow() {
			var avaliacaoId = getActiveAvaliacaoId() || Number(elements.idInput ? elements.idInput.value : 0) || 0;
			if (avaliacaoId <= 0) {
				if (typeof helpers.showGlobalStatus === 'function') {
					helpers.showGlobalStatus('Selecione uma avaliação válida antes de corrigir.', true);
				}
				return;
			}

			var questoes = getQuestoesItens();
			var questoesSemResposta = questoes.filter(function (item) {
				var tipo = typeof helpers.normalizeQuestaoTipo === 'function' ? helpers.normalizeQuestaoTipo(item && item.tipo) : '';
				if (tipo === 'discursiva') {
					return false;
				}
				var correta = String(item && item.correta || '').trim();
				return correta === '' && !(item && item.anulada === true);
			});

			if (questoesSemResposta.length > 0) {
				var numeros = questoesSemResposta.map(function (_item) {
					return String(questoes.indexOf(_item) + 1);
				}).join(', ');
				if (typeof helpers.showGlobalStatus === 'function') {
					helpers.showGlobalStatus('Não é possível iniciar a correção: ' + questoesSemResposta.length + ' questão(ões) sem resposta correta marcada (nº ' + numeros + '). Acesse Configurações → Questões e Respostas e marque a alternativa correta de cada questão.', true);
				}
				return;
			}

			if (typeof helpers.closeCorrecaoRevisaoModal === 'function') {
				helpers.closeCorrecaoRevisaoModal();
			}
			if (typeof helpers.closeCorrecaoDiscursivaModal === 'function') {
				helpers.closeCorrecaoDiscursivaModal();
			}
			stopCorrecaoScanLoop();
			if (typeof helpers.resetCorrecaoAutoReadStability === 'function') {
				helpers.resetCorrecaoAutoReadStability();
			}
			if (typeof helpers.clearCorrecaoDiagnosticsOverlay === 'function') {
				helpers.clearCorrecaoDiagnosticsOverlay();
			}
			setState({ correcaoCurrentTarget: null });
			if (typeof helpers.renderCorrecaoTarget === 'function') {
				helpers.renderCorrecaoTarget();
			}
			if (typeof helpers.setCorrecaoScannerStep === 'function') {
				helpers.setCorrecaoScannerStep('idle', 'Abrindo câmera...');
			}
			openCorrecaoModal();
			startCorrecaoCamera().then(function () {
				if (typeof helpers.setCorrecaoScannerStep === 'function') {
					helpers.setCorrecaoScannerStep('scan-qr', 'Aponte a câmera para o QR Code da folha.');
				}
				setState({ correcaoScannerStep: 'scan-qr' });
				runCorrecaoQrLoop();
			}).catch(function (error) {
				if (typeof helpers.setCorrecaoScannerStep === 'function') {
					helpers.setCorrecaoScannerStep('idle', error && error.message ? error.message : 'Não foi possível abrir a câmera.');
				}
			});
		}

		function captureAndCorrectCurrentSheet(autoMode, providedCanvas) {
			var state = getState();
			if (state.correcaoScannerStep !== 'scan-gabarito' || !state.correcaoCurrentTarget) {
				return;
			}

			var isAutoMode = autoMode === true;
			var objectiveReading = {
				answers: {},
				diagnosticsByQuestion: {},
				acceptedAnswerDiagnostics: [],
				confidenceStats: {
					low: 0,
					medium: 0,
					high: 0,
				},
			};

			if (state.correcaoBusy) {
				return;
			}

			var captureCanvas = providedCanvas instanceof HTMLCanvasElement
				? providedCanvas
				: (typeof helpers.captureCorrecaoFrame === 'function' ? helpers.captureCorrecaoFrame() : null);
			if (!(captureCanvas instanceof HTMLCanvasElement)) {
				if (!isAutoMode && typeof helpers.setCorrecaoScannerStep === 'function') {
					helpers.setCorrecaoScannerStep('scan-gabarito', 'A imagem da câmera ainda não está pronta. Tente novamente.');
				}
				return;
			}

			setState({ correcaoBusy: true });
			Promise.resolve(typeof helpers.validateCorrecaoFrameForReading === 'function' ? helpers.validateCorrecaoFrameForReading(captureCanvas) : captureCanvas)
				.then(function (validatedCanvas) {
					if (typeof helpers.setCorrecaoScannerStep === 'function') {
						helpers.setCorrecaoScannerStep('saving', 'Lendo gabarito e calculando correção...');
					}
					var questoes = getQuestoesItens();
					var hasObjectiveQuestions = questoes.some(function (item) {
						return typeof helpers.isQuestaoObjetiva === 'function' ? helpers.isQuestaoObjetiva(item && item.tipo) : false;
					});
					objectiveReading = hasObjectiveQuestions && typeof helpers.detectAnswersFromCorrecaoCanvas === 'function'
						? helpers.detectAnswersFromCorrecaoCanvas(validatedCanvas)
						: objectiveReading;

					var studentAnswers = objectiveReading.answers || {};
					var latestState = getState();
					if (isAutoMode && hasObjectiveQuestions) {
						var readingFingerprint = typeof helpers.buildCorrecaoAnswersFingerprint === 'function'
							? helpers.buildCorrecaoAnswersFingerprint(objectiveReading)
							: '';
						var stableReads = latestState.correcaoAutoReadStableReads || 0;
						if (readingFingerprint === latestState.correcaoAutoReadFingerprint) {
							stableReads += 1;
						} else {
							stableReads = 1;
						}
						setState({
							correcaoAutoReadFingerprint: readingFingerprint,
							correcaoAutoReadStableReads: stableReads,
						});

						if (stableReads < 2 && typeof helpers.buildCorrecaoFlowError === 'function') {
							throw helpers.buildCorrecaoFlowError('correcao-stability-pending', 'Leitura preliminar pronta. Mantenha a folha estável para confirmar a mesma leitura.');
						}
					} else if (!isAutoMode && typeof helpers.resetCorrecaoAutoReadStability === 'function') {
						helpers.resetCorrecaoAutoReadStability();
					}

					var currentTarget = getState().correcaoCurrentTarget;
					var numeracaoText = typeof helpers.getCurrentGabaritoNumeracaoLabel === 'function' ? helpers.getCurrentGabaritoNumeracaoLabel() : '';
					var numeracaoValue = currentTarget.numeracao || numeracaoText;
					if (!numeracaoValue || numeracaoValue === 'Numeracao por aluno/turma') {
						numeracaoValue = String(currentTarget.numeracaoLabel || '').replace(/^Nº\s*/i, '').trim();
					}

					var discursivas = typeof helpers.getCorrecaoDiscursivaQuestoes === 'function'
						? helpers.getCorrecaoDiscursivaQuestoes()
						: [];
					var scorePromise = discursivas.length && typeof helpers.openCorrecaoDiscursivaModal === 'function'
						? (function () {
							stopCorrecaoScanLoop();
							if (typeof helpers.setCorrecaoScannerStep === 'function') {
								helpers.setCorrecaoScannerStep('discursiva', 'Informe as notas das questões discursivas para concluir a correção.');
							}
							return helpers.openCorrecaoDiscursivaModal(discursivas);
						})()
						: Promise.resolve({});

					return scorePromise.then(function (discursiveScores) {
						var comparison = typeof helpers.buildCorrecaoCorrections === 'function'
							? helpers.buildCorrecaoCorrections(studentAnswers, discursiveScores, objectiveReading.diagnosticsByQuestion || {})
							: { corrections: [], score: 0, total: 0, earnedPoints: 0, totalPoints: 0 };
						var percentual = comparison.totalPoints > 0 ? ((comparison.earnedPoints / comparison.totalPoints) * 100) : 0;
						var resultPayload = {
							avaliacao_id: currentTarget.avaliacaoId,
							aluno_id: currentTarget.alunoId,
							turma_id: currentTarget.turmaId,
							numeracao: numeracaoValue,
							qr_payload: currentTarget.qrPayload,
							respostas: studentAnswers,
							correcoes: comparison.corrections,
							acertos: comparison.score,
							total_questoes: comparison.total,
							pontuacao: comparison.earnedPoints.toFixed(2),
							pontuacao_total: comparison.totalPoints.toFixed(2),
							percentual: percentual.toFixed(2),
						};

						if (typeof helpers.shouldOpenCorrecaoReviewModal === 'function' && helpers.shouldOpenCorrecaoReviewModal(isAutoMode, comparison)) {
							if (typeof helpers.setCorrecaoScannerStep === 'function') {
								helpers.setCorrecaoScannerStep('review', 'Revise os itens destacados antes do salvamento final.');
							}
							return helpers.openCorrecaoRevisaoModal({
								comparison: comparison,
								alunoNome: currentTarget && currentTarget.alunoNome ? currentTarget.alunoNome : '',
							}).then(function () {
								return helpers.saveCorrecaoResult(resultPayload);
							});
						}

						return helpers.saveCorrecaoResult(resultPayload);
					});
				})
				.then(function (payload) {
					if (typeof helpers.resetCorrecaoAutoReadStability === 'function') {
						helpers.resetCorrecaoAutoReadStability();
					}
					var currentTarget = getState().correcaoCurrentTarget;
					setState({
						correcaoLastSuccessPayload: String(currentTarget && currentTarget.qrPayload || ''),
						correcaoLastSuccessAt: Date.now(),
					});

					if (typeof helpers.renderCorrecoesTable === 'function') {
						helpers.renderCorrecoesTable(payload.rows || [], {
							total: Array.isArray(payload.rows) ? payload.rows.length : 0,
							media_percentual: Array.isArray(payload.rows) && payload.rows.length
								? (payload.rows.reduce(function (sum, item) { return sum + Number(item.percentual || 0); }, 0) / payload.rows.length)
								: 0,
						});
					}

					if (currentTarget && Array.isArray(payload.rows)) {
						var match = null;
						for (var rowIndex = 0; rowIndex < payload.rows.length; rowIndex += 1) {
							var row = payload.rows[rowIndex];
							if (row && Number(row.aluno_id || 0) === Number(currentTarget.alunoId || 0)
								&& Number(row.turma_id || 0) === Number(currentTarget.turmaId || 0)
								&& Number(row.avaliacao_id || 0) === Number(currentTarget.avaliacaoId || 0)) {
								match = row;
								break;
							}
						}
						currentTarget.existingCorrection = match;
						setState({ correcaoCurrentTarget: currentTarget });
					}

					if (typeof helpers.resumeCorrecaoForNextSheet === 'function') {
						helpers.resumeCorrecaoForNextSheet();
					}
				})
				.catch(function (error) {
					if (error && error.code === 'correcao-review-cancelled' && typeof helpers.resetCorrecaoAutoReadStability === 'function') {
						helpers.resetCorrecaoAutoReadStability();
					}

					if (!(elements.correcaoModalElement instanceof HTMLElement) || !elements.correcaoModalElement.classList.contains('show')) {
						return;
					}

					var errorMessage = error && error.message
						? error.message
						: (isAutoMode
							? 'QR identificado. Posicione a câmera sobre o gabarito para leitura automática.'
							: 'Falha ao ler o gabarito. Tente novamente com a câmera mais alinhada.');

					if (typeof helpers.setCorrecaoScannerStep === 'function') {
						helpers.setCorrecaoScannerStep('scan-gabarito', errorMessage);
					}
					var latestState = getState();
					if (latestState.correcaoScannerStep === 'scan-gabarito' && latestState.correcaoCurrentTarget) {
						runCorrecaoGabaritoLoop();
					}
				})
				.finally(function () {
					setState({ correcaoBusy: false });
				});
		}

		return {
			openCorrecaoModal: openCorrecaoModal,
			closeCorrecaoModal: closeCorrecaoModal,
			goToNextCorrecaoQr: goToNextCorrecaoQr,
			proceedCorrecaoToGabarito: proceedCorrecaoToGabarito,
			stopCorrecaoScanLoop: stopCorrecaoScanLoop,
			stopCorrecaoCamera: stopCorrecaoCamera,
			startCorrecaoCamera: startCorrecaoCamera,
			runCorrecaoQrLoop: runCorrecaoQrLoop,
			runCorrecaoGabaritoLoop: runCorrecaoGabaritoLoop,
			processGabaritoManually: processGabaritoManually,
			resumeVideoAfterProcess: resumeVideoAfterProcess,
			beginCorrecaoFlow: beginCorrecaoFlow,
			captureAndCorrectCurrentSheet: captureAndCorrectCurrentSheet,
		};
	};

	function ensureCameraModule(api) {
		if (!api || typeof api !== 'object') {
			return null;
		}

		if (api.__cameraModule) {
			return api.__cameraModule;
		}

		if (typeof window.__createAdminAvaliacaoCorrecaoCameraModule !== 'function') {
			return null;
		}

		api.__cameraModule = window.__createAdminAvaliacaoCorrecaoCameraModule(api);
		return api.__cameraModule;
	}

	function wireCorrectionModule(api) {
		if (!api || typeof api !== 'object' || api.__externalBound === true) {
			return;
		}

		api.__externalBound = true;
		ensureCameraModule(api);

		var elements = typeof api.getElements === 'function' ? api.getElements() : {};
		var dashboardModalElement = elements.dashboardModalElement;
		var dashboardTabsElement = elements.dashboardTabsElement;
		var correcaoPane = elements.correcaoPane;
		var correcaoStartBtn = elements.correcaoStartBtn;
		var correcaoStopBtn = elements.correcaoStopBtn;
		var correcaoCaptureBtn = elements.correcaoCaptureBtn;
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
		bindImmediatePressOnce(correcaoStopBtn, 'Stop', function () {
			api.closeCorrecaoModal();
		});
		bindPressOnce(correcaoCaptureBtn, 'Capture', function () {
			if (typeof api.captureAndCorrectCurrentSheet === 'function') {
				api.captureAndCorrectCurrentSheet();
			}
		});
		bindPressOnce(correcaoConfirmBtn, 'Confirm', function () {
			api.proceedCorrecaoToGabarito();
		});
		bindPressOnce(correcaoNextBtn, 'Next', function () {
			api.goToNextCorrecaoQr();
		});
		bindPressOnce(correcaoRetryBtn, 'Retry', function () {
			if (typeof api.retryCorrecaoForCurrentTarget === 'function') {
				api.retryCorrecaoForCurrentTarget();
			}
		});
		bindPressOnce(correcaoProcessBtn, 'Process', function () {
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
