/**
 * ==============================================================================
 * Archivo: utils-vector.js
 * Propósito: Suite unificada de gráficos e imágenes Stormk90 (stormk90.com/utils)
 * Funcionalidades: Vectorización por capas (SVG/EPS/PDF), Conversión de Formatos,
 *                  Compresión de peso, Rotación angular, Redimensión y Recorte.
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Estado Global de la Suite
    const state = {
        activeTool: 'vector',
        taskId: null,
        currentFile: null,
        originalImgUrl: null,
        processedImgUrl: null,
        svgContent: null,
        originalWidth: 0,
        originalHeight: 0,
        originalSizeBytes: 0,
        aspectRatioLocked: true,
        selectedCropRatio: 'free',
        selectedFormat: 'webp',
        rotationAngle: 0,
        isFlippedH: false,
        isFlippedV: false,
        zoom: 1,
        panX: 0,
        panY: 0,
        isPanning: false,
        startX: 0,
        startY: 0,
        splitPercent: 50,
        isDraggingSplit: false,
        viewMode: 'split',
        isWireframe: false,
        isProcessing: false,
        layers: [],
        hiddenLayers: new Set()
    };

    // 2. Referencias del DOM
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const emptyState = document.getElementById('empty-state');
    const viewerWrapper = document.getElementById('viewer-wrapper');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const rasterLayer = document.getElementById('raster-layer');
    const processedLayer = document.getElementById('processed-layer');
    const vectorLayer = document.getElementById('vector-layer');
    const imgOriginal = document.getElementById('img-original');
    const imgProcessed = document.getElementById('img-processed');
    const svgContainer = document.getElementById('svg-container');
    const splitLine = document.getElementById('split-line');
    const canvasContainer = document.getElementById('canvas-container');
    const downloadBar = document.getElementById('download-bar');
    const btnReprocess = document.getElementById('btn-reprocess');
    const toast = document.getElementById('toast');
    const btnWireframe = document.getElementById('btn-wireframe');
    const badgeLeft = document.getElementById('badge-left');
    const badgeRight = document.getElementById('badge-right');
    const layersCard = document.getElementById('layers-card');
    const layersList = document.getElementById('layers-list');
    const layersCount = document.getElementById('layers-count');
    const btnShowAllLayers = document.getElementById('btn-show-all-layers');
    const btnHideAllLayers = document.getElementById('btn-hide-all-layers');
    const vectorExportActions = document.getElementById('vector-export-actions');
    const rasterExportActions = document.getElementById('raster-export-actions');
    const btnDownloadRaster = document.getElementById('btn-download-raster');
    const metricSavings = document.getElementById('metric-savings');
    const metricBoxSavings = document.getElementById('metric-box-savings');

    // 3. Animación de Fondo: Matrix Rain Canvas
    /**
     * Función: initMatrixBackground
     * Descripción: Genera lluvia de caracteres estilo Matrix en el canvas de fondo.
     */
    function initMatrixBackground() {
        const canvas = document.getElementById('matrix-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const chars = '0123456789ABCDEFアイウエオカキクケコサシスセソタチツテト';
        const fontSize = 14;
        let columns = Math.floor(window.innerWidth / fontSize);
        let drops = Array(columns).fill(1);

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            columns = Math.floor(canvas.width / fontSize);
            drops = Array(columns).fill(1);
        }
        resize();
        window.addEventListener('resize', resize);

        setInterval(() => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff41';
            ctx.font = fontSize + 'px monospace';
            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }, 40);
    }
    initMatrixBackground();

    // 4. Notificaciones Toast Terminal
    /**
     * Función: showToast
     * Descripción: Muestra notificación flotante en la consola inferior derecha.
     */
    function showToast(message, isError = false) {
        if (!toast) return;
        toast.textContent = `> ${message}`;
        toast.className = 'terminal-toast show' + (isError ? ' toast-error' : '');
        clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => { toast.className = 'terminal-toast'; }, 4000);
    }

    // 5. Selector de Modo: Vectorial vs Formato & Edición
    const toolButtons = document.querySelectorAll('.tool-tab-btn');
    const toolPanels = {
        vector: document.getElementById('panel-vector'),
        convert: document.getElementById('panel-convert')
    };

    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchTool(btn.dataset.tool);
        });
    });

    /**
     * Función: switchTool
     * Descripción: Conmuta entre el motor vectorial y la suite unificada de formato y edición.
     */
    function switchTool(toolKey) {
        state.activeTool = toolKey;
        const badgeTool = document.getElementById('badge-active-tool');
        if (badgeTool) {
            const label = (toolKey === 'vector') ? 'MODO: ⚡ VECTORIAL' : 'MODO: 🔄 FORMATO & EDICIÓN';
            badgeTool.innerHTML = `<span class="pulse-dot"></span> ${label}`;
        }
        if (toolPanels.vector) toolPanels.vector.style.display = (toolKey === 'vector') ? 'block' : 'none';
        if (toolPanels.convert) toolPanels.convert.style.display = (toolKey === 'convert') ? 'block' : 'none';

        if (toolKey === 'vector') {
            if (btnWireframe) btnWireframe.style.display = 'block';
            if (vectorLayer && state.svgContent) vectorLayer.style.display = 'flex';
            if (processedLayer) processedLayer.style.display = 'none';
            if (vectorExportActions) vectorExportActions.style.display = 'flex';
            if (rasterExportActions) rasterExportActions.style.display = 'none';
            if (metricBoxSavings) metricBoxSavings.style.display = 'none';
            document.getElementById('m-label-1').textContent = 'CURVAS:';
            document.getElementById('m-label-2').textContent = 'TIEMPO:';
            document.getElementById('m-label-3').textContent = 'TAMAÑO SVG:';
            badgeRight.textContent = 'VECTORIAL (SVG) >';
        } else {
            if (btnWireframe) btnWireframe.style.display = 'none';
            if (vectorLayer) vectorLayer.style.display = 'none';
            if (processedLayer && state.processedImgUrl) processedLayer.style.display = 'flex';
            if (vectorExportActions) vectorExportActions.style.display = 'none';
            if (rasterExportActions) rasterExportActions.style.display = 'flex';
            badgeRight.textContent = 'PROCESADA (' + state.selectedFormat.toUpperCase() + ') >';
        }
        updateViewMode(state.viewMode);
        showToast(toolKey === 'vector' ? 'Modo: Motor Vectorial' : 'Modo: Formato & Edición');
    }

    // 6. Carga de Archivos Ráster (Drag & Drop, Explorador y Ctrl+V)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evtName => {
        window.addEventListener(evtName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    const dropTargetBox = dropZone ? dropZone.querySelector('.drop-target') : null;
    function setDragHighlight(active) {
        if (dropTargetBox) dropTargetBox.classList.toggle('drag-over', active);
        if (canvasContainer) canvasContainer.classList.toggle('drag-over', active);
    }

    [dropZone, canvasContainer].filter(Boolean).forEach(area => {
        ['dragenter', 'dragover'].forEach(name => area.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); setDragHighlight(true); }));
        ['dragleave', 'dragend'].forEach(name => area.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); setDragHighlight(false); }));
        area.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation(); setDragHighlight(false);
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
        });
    });

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) handleFileSelection(e.target.files[0]);
        });
    }

    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData).items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.indexOf('image') !== -1) {
                const pastedFile = items[i].getAsFile();
                if (pastedFile) { showToast('Imagen capturada desde portapapeles'); handleFileSelection(pastedFile); break; }
            }
        }
    });

    /**
     * Función: handleFileSelection
     * Descripción: Valida y procesa la imagen seleccionada cargándola en memoria.
     */
    function handleFileSelection(file) {
        if (!file) return;
        const validExtensions = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'];
        const fileName = file.name || 'imagen_subida.png';
        const fileExt = fileName.split('.').pop().toLowerCase();
        const validMimes = ['image/png', 'image/jpeg', 'image/pjpeg', 'image/jpg', 'image/webp', 'image/bmp', 'image/x-ms-bmp', 'image/x-png', 'image/tiff'];
        if (!validMimes.includes((file.type || '').toLowerCase()) && !validExtensions.includes(fileExt)) {
            showToast('Formato no soportado. Usa PNG, JPG, WEBP o BMP.', true);
            return;
        }
        if (file.size > 16 * 1024 * 1024) {
            showToast('El archivo supera el límite de seguridad de 16MB.', true);
            return;
        }

        state.currentFile = file;
        state.taskId = null;
        state.layers = [];
        state.hiddenLayers.clear();
        state.processedImgUrl = null;
        resetOrientationState();

        const reader = new FileReader();
        reader.onload = (e) => {
            state.originalImgUrl = e.target.result;
            if (imgOriginal) {
                imgOriginal.src = state.originalImgUrl;
                imgOriginal.onload = () => {
                    state.originalWidth = imgOriginal.naturalWidth;
                    state.originalHeight = imgOriginal.naturalHeight;
                    state.originalSizeBytes = file.size;
                    initDimensionInputs(state.originalWidth, state.originalHeight);
                };
            }
        };
        reader.readAsDataURL(file);

        showToast(`Cargado: ${fileName} (${Math.round(file.size / 1024)} KB)`);
        if (state.activeTool === 'vector') processVectorization(true);
        else processUnifiedRaster(true);
    }

    /**
     * Función: initDimensionInputs
     * Descripción: Asigna las dimensiones originales a los campos de redimensión y recorte.
     */
    function initDimensionInputs(w, h) {
        const resizeDimsEl = document.getElementById('resize-orig-dims');
        if (resizeDimsEl) resizeDimsEl.textContent = `${w} x ${h} px`;
        const rW = document.getElementById('resize-width');
        const rH = document.getElementById('resize-height');
        if (rW && rH) { rW.value = w; rH.value = h; }
        const cX = document.getElementById('crop-x');
        const cY = document.getElementById('crop-y');
        const cW = document.getElementById('crop-w');
        const cH = document.getElementById('crop-h');
        if (cX && cY && cW && cH) { cX.value = 0; cY.value = 0; cW.value = w; cH.value = h; }
    }

    // 7. Controles de Rotación y Orientación
    const rotateSlider = document.getElementById('rotate-angle-slider');
    const valRotateAngle = document.getElementById('val-rotate-angle');
    const btnFlipH = document.getElementById('btn-flip-h');
    const btnFlipV = document.getElementById('btn-flip-v');

    /**
     * Función: applyOrientationTransformPreview
     * Descripción: Actualiza en vivo la rotación y volteo sobre la imagen del visor.
     */
    function applyOrientationTransformPreview() {
        if (valRotateAngle) valRotateAngle.textContent = `${state.rotationAngle}°`;
        if (rotateSlider) rotateSlider.value = state.rotationAngle;
        const scaleX = state.isFlippedH ? -1 : 1;
        const scaleY = state.isFlippedV ? -1 : 1;
        const orientCss = `rotate(${state.rotationAngle}deg) scale(${scaleX}, ${scaleY})`;
        if (imgProcessed) imgProcessed.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom}) ${orientCss}`;
    }

    /**
     * Función: resetOrientationState
     * Descripción: Restaura rotación y volteos a valores iniciales de 0°.
     */
    function resetOrientationState() {
        state.rotationAngle = 0;
        state.isFlippedH = false;
        state.isFlippedV = false;
        if (btnFlipH) btnFlipH.classList.remove('active');
        if (btnFlipV) btnFlipV.classList.remove('active');
        applyOrientationTransformPreview();
    }

    function rotateByDegrees(deg) {
        state.rotationAngle = (state.rotationAngle + deg) % 360;
        if (state.rotationAngle > 180) state.rotationAngle -= 360;
        if (state.rotationAngle < -180) state.rotationAngle += 360;
        applyOrientationTransformPreview();
        showToast(`Rotación: ${state.rotationAngle}°`);
    }

    if (rotateSlider) {
        rotateSlider.addEventListener('input', () => {
            state.rotationAngle = parseInt(rotateSlider.value, 10) || 0;
            applyOrientationTransformPreview();
        });
    }

    const btnCcw = document.getElementById('btn-rotate-ccw');
    if (btnCcw) btnCcw.addEventListener('click', () => rotateByDegrees(-90));
    const btnCw = document.getElementById('btn-rotate-cw');
    if (btnCw) btnCw.addEventListener('click', () => rotateByDegrees(90));
    const btn180 = document.getElementById('btn-rotate-180');
    if (btn180) btn180.addEventListener('click', () => rotateByDegrees(180));

    if (btnFlipH) {
        btnFlipH.addEventListener('click', () => {
            state.isFlippedH = !state.isFlippedH;
            btnFlipH.classList.toggle('active', state.isFlippedH);
            applyOrientationTransformPreview();
            showToast(state.isFlippedH ? 'Espejo Horizontal: Activo' : 'Espejo Horizontal: Inactivo');
        });
    }

    if (btnFlipV) {
        btnFlipV.addEventListener('click', () => {
            state.isFlippedV = !state.isFlippedV;
            btnFlipV.classList.toggle('active', state.isFlippedV);
            applyOrientationTransformPreview();
            showToast(state.isFlippedV ? 'Espejo Vertical: Activo' : 'Espejo Vertical: Inactivo');
        });
    }

    const btnResetRot = document.getElementById('btn-reset-rotation');
    if (btnResetRot) {
        btnResetRot.addEventListener('click', () => {
            resetOrientationState();
            showToast('Orientación restablecida a 0°');
        });
    }

    // 8. Controles de Formato, Redimensión y Recorte
    const convertQuality = document.getElementById('convert-quality');
    const valConvertQuality = document.getElementById('val-convert-quality');
    if (convertQuality && valConvertQuality) {
        convertQuality.addEventListener('input', () => { valConvertQuality.textContent = `${convertQuality.value}%`; });
    }

    document.querySelectorAll('.fmt-card-btn').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.fmt-card-btn').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.selectedFormat = card.dataset.format;
            showToast(`Formato seleccionado: ${state.selectedFormat.toUpperCase()}`);
        });
    });

    const enableResizeCheck = document.getElementById('enable-resize-check');
    const resizeOptionsBody = document.getElementById('resize-options-body');
    if (enableResizeCheck && resizeOptionsBody) {
        enableResizeCheck.addEventListener('change', () => {
            const enabled = enableResizeCheck.checked;
            resizeOptionsBody.style.opacity = enabled ? '1' : '0.45';
            resizeOptionsBody.style.pointerEvents = enabled ? 'auto' : 'none';
            showToast(enabled ? 'Redimensión activada' : 'Redimensión desactivada');
        });
    }

    const btnToggleAspect = document.getElementById('btn-toggle-aspect');
    const resizeWidthInput = document.getElementById('resize-width');
    const resizeHeightInput = document.getElementById('resize-height');

    if (btnToggleAspect) {
        btnToggleAspect.addEventListener('click', () => {
            state.aspectRatioLocked = !state.aspectRatioLocked;
            btnToggleAspect.classList.toggle('active', state.aspectRatioLocked);
            btnToggleAspect.textContent = state.aspectRatioLocked ? '🔒' : '🔓';
            showToast(state.aspectRatioLocked ? 'Proporción bloqueada' : 'Proporción libre');
        });
    }

    if (resizeWidthInput && resizeHeightInput) {
        resizeWidthInput.addEventListener('input', () => {
            if (state.aspectRatioLocked && state.originalWidth > 0) {
                resizeHeightInput.value = Math.round(Number(resizeWidthInput.value) * (state.originalHeight / state.originalWidth));
            }
        });
        resizeHeightInput.addEventListener('input', () => {
            if (state.aspectRatioLocked && state.originalHeight > 0) {
                resizeWidthInput.value = Math.round(Number(resizeHeightInput.value) * (state.originalWidth / state.originalHeight));
            }
        });
    }

    document.querySelectorAll('.scale-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const scale = parseFloat(chip.dataset.scale);
            if (state.originalWidth > 0 && resizeWidthInput && resizeHeightInput) {
                if (enableResizeCheck) enableResizeCheck.checked = true;
                if (resizeOptionsBody) { resizeOptionsBody.style.opacity = '1'; resizeOptionsBody.style.pointerEvents = 'auto'; }
                resizeWidthInput.value = Math.round(state.originalWidth * scale);
                resizeHeightInput.value = Math.round(state.originalHeight * scale);
                showToast(`Escala establecida a ${Math.round(scale * 100)}%`);
            }
        });
    });

    const resizePresetSelect = document.getElementById('resize-preset-select');
    if (resizePresetSelect) {
        resizePresetSelect.addEventListener('change', () => {
            const val = resizePresetSelect.value;
            if (val && resizeWidthInput && resizeHeightInput) {
                if (enableResizeCheck) enableResizeCheck.checked = true;
                if (resizeOptionsBody) { resizeOptionsBody.style.opacity = '1'; resizeOptionsBody.style.pointerEvents = 'auto'; }
                const [w, h] = val.split('x').map(Number);
                resizeWidthInput.value = w;
                resizeHeightInput.value = h;
            }
        });
    }

    const enableCropCheck = document.getElementById('enable-crop-check');
    const cropOptionsBody = document.getElementById('crop-options-body');
    if (enableCropCheck && cropOptionsBody) {
        enableCropCheck.addEventListener('change', () => {
            const enabled = enableCropCheck.checked;
            cropOptionsBody.style.opacity = enabled ? '1' : '0.45';
            cropOptionsBody.style.pointerEvents = enabled ? 'auto' : 'none';
            showToast(enabled ? 'Recorte activado' : 'Recorte desactivado');
        });
    }

    document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyCropRatioPreset(btn.dataset.ratio);
        });
    });

    /**
     * Función: applyCropRatioPreset
     * Descripción: Ajusta las dimensiones de recorte a proporciones estándares.
     */
    function applyCropRatioPreset(ratioKey) {
        state.selectedCropRatio = ratioKey;
        if (enableCropCheck) enableCropCheck.checked = true;
        if (cropOptionsBody) { cropOptionsBody.style.opacity = '1'; cropOptionsBody.style.pointerEvents = 'auto'; }
        const w = state.originalWidth || 800;
        const h = state.originalHeight || 600;
        let cropW = w, cropH = h;

        if (ratioKey === '1:1') { cropW = cropH = Math.min(w, h); }
        else if (ratioKey === '16:9') {
            if (w / h > 16 / 9) { cropW = Math.round(h * (16 / 9)); cropH = h; }
            else { cropW = w; cropH = Math.round(w * (9 / 16)); }
        } else if (ratioKey === '4:3') {
            if (w / h > 4 / 3) { cropW = Math.round(h * (4 / 3)); cropH = h; }
            else { cropW = w; cropH = Math.round(w * (3 / 4)); }
        } else if (ratioKey === '9:16') { cropW = Math.round(h * (9 / 16)); cropH = h; }

        document.getElementById('crop-x').value = Math.max(0, Math.round((w - cropW) / 2));
        document.getElementById('crop-y').value = Math.max(0, Math.round((h - cropH) / 2));
        document.getElementById('crop-w').value = cropW;
        document.getElementById('crop-h').value = cropH;
        showToast(`Ratio aplicado: ${ratioKey}`);
    }

    const btnResetCrop = document.getElementById('btn-reset-crop');
    if (btnResetCrop) {
        btnResetCrop.addEventListener('click', () => {
            initDimensionInputs(state.originalWidth, state.originalHeight);
            document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
            const freeBtn = document.querySelector('.ratio-btn[data-ratio="free"]');
            if (freeBtn) freeBtn.classList.add('active');
            showToast('Recorte restablecido a imagen completa.');
        });
    }

    const btnApplyConvert = document.getElementById('btn-apply-convert');
    if (btnApplyConvert) {
        btnApplyConvert.addEventListener('click', () => processUnifiedRaster(false));
    }

    // 9. API de Procesamiento Ráster Unificado (Formato, Rotación, Escala, Crop)
    /**
     * Función: processUnifiedRaster
     * Descripción: Ejecuta la cadena de transformaciones ráster solicitadas en el servidor.
     */
    async function processUnifiedRaster(isNewUpload = false) {
        if (state.isProcessing) return;
        state.isProcessing = true;
        if (emptyState) emptyState.style.display = 'none';
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (loadingText) loadingText.textContent = `> PROCESANDO FORMATO [${state.selectedFormat.toUpperCase()}] & EDICIÓN...`;

        const formData = new FormData();
        if (isNewUpload && state.currentFile) formData.append('image', state.currentFile);
        else if (state.taskId) formData.append('task_id', state.taskId);
        else { showToast('No hay imagen para procesar.', true); cleanupProcessingState(); return; }

        formData.append('format', state.selectedFormat);
        formData.append('quality', document.getElementById('convert-quality').value || '80');
        const lossless = document.getElementById('convert-lossless');
        formData.append('lossless', (lossless && lossless.checked) ? 'true' : 'false');

        if (Math.abs(state.rotationAngle) > 0.01 || state.isFlippedH || state.isFlippedV) {
            formData.append('do_rotate', 'true');
            formData.append('rotate_angle', state.rotationAngle.toString());
            formData.append('flip_h', state.isFlippedH ? 'true' : 'false');
            formData.append('flip_v', state.isFlippedV ? 'true' : 'false');
        }

        if (enableResizeCheck && enableResizeCheck.checked) {
            formData.append('do_resize', 'true');
            formData.append('resize_w', document.getElementById('resize-width').value);
            formData.append('resize_h', document.getElementById('resize-height').value);
            formData.append('keep_aspect', state.aspectRatioLocked ? 'true' : 'false');
            formData.append('resize_algo', document.getElementById('resize-algorithm').value);
        }

        if (enableCropCheck && enableCropCheck.checked) {
            formData.append('do_crop', 'true');
            formData.append('crop_x', document.getElementById('crop-x').value);
            formData.append('crop_y', document.getElementById('crop-y').value);
            formData.append('crop_w', document.getElementById('crop-w').value);
            formData.append('crop_h', document.getElementById('crop-h').value);
        }

        try {
            const response = await fetch('/api/raster/process', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Error al procesar');

            state.taskId = data.task_id;
            state.processedImgUrl = data.preview_url;

            if (imgProcessed) {
                imgProcessed.src = data.preview_url;
                imgProcessed.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
            }
            if (processedLayer) processedLayer.style.display = 'flex';
            if (vectorLayer) vectorLayer.style.display = 'none';
            if (viewerWrapper) viewerWrapper.style.display = 'block';
            if (downloadBar) downloadBar.style.display = 'flex';

            document.getElementById('m-label-1').textContent = 'DIMENSIONES:';
            document.getElementById('metric-paths').textContent = `${data.final_width}x${data.final_height}px`;
            document.getElementById('m-label-2').textContent = 'TIEMPO:';
            document.getElementById('metric-time').textContent = `${data.elapsed_seconds}s`;
            document.getElementById('m-label-3').textContent = 'PESO FINAL:';
            document.getElementById('metric-size').textContent = `${Math.round(data.final_size_bytes / 1024)} KB`;

            if (metricBoxSavings && metricSavings) {
                metricBoxSavings.style.display = 'block';
                const sign = data.percent_saved >= 0 ? '-' : '+';
                metricSavings.textContent = `${sign}${Math.abs(data.percent_saved)}%`;
            }

            if (btnDownloadRaster) {
                btnDownloadRaster.href = data.download_url;
                btnDownloadRaster.setAttribute('download', data.filename);
                btnDownloadRaster.innerHTML = `<span class="badge-pro">${data.format.toUpperCase()}</span> [ 💾 DESCARGAR ${data.filename.toUpperCase()} ]`;
            }

            updateViewMode(state.viewMode);
            showToast(`Listo: ${data.filename} (${Math.round(data.final_size_bytes / 1024)} KB)`);
        } catch (err) {
            showToast(err.message, true);
        } finally {
            cleanupProcessingState();
        }
    }

    // 10. Motor Vectorial (Vector AI)
    const presetsConfig = {
        logo: { colormode: 'color', hierarchical: 'stacked', mode: 'spline', filter_speckle: 4, color_precision: 4, layer_difference: 32, corner_threshold: 60, upscale: 2, anti_halo: 'true' },
        illustration: { colormode: 'color', hierarchical: 'stacked', mode: 'spline', filter_speckle: 2, color_precision: 6, layer_difference: 20, corner_threshold: 45, upscale: 2, anti_halo: 'true' },
        photo: { colormode: 'color', hierarchical: 'stacked', mode: 'spline', filter_speckle: 1, color_precision: 7, layer_difference: 12, corner_threshold: 30, upscale: 1, anti_halo: 'false' },
        silhouette: { colormode: 'binary', hierarchical: 'stacked', mode: 'spline', filter_speckle: 8, color_precision: 2, layer_difference: 32, corner_threshold: 75, upscale: 2, anti_halo: 'true' },
        pixel: { colormode: 'color', hierarchical: 'cutout', mode: 'polygon', filter_speckle: 0, color_precision: 8, layer_difference: 8, corner_threshold: 150, upscale: 1, anti_halo: 'false' }
    };

    /**
     * Función: applyPresetValues
     * Descripción: Aplica los valores de vectorización preestablecidos al formulario.
     */
    function applyPresetValues(presetKey) {
        const p = presetsConfig[presetKey];
        if (!p) return;
        ['colormode', 'hierarchical', 'mode', 'upscale', 'anti_halo'].forEach(k => {
            const el = document.getElementById(`param-${k}`);
            if (el && p[k] !== undefined) el.value = p[k];
        });
        document.getElementById('param-filter-speckle').value = p.filter_speckle;
        document.getElementById('val-filter-speckle').textContent = p.filter_speckle + ' px';
        document.getElementById('param-color-precision').value = p.color_precision;
        document.getElementById('val-color-precision').textContent = p.color_precision;
        document.getElementById('param-layer-difference').value = p.layer_difference;
        document.getElementById('val-layer-difference').textContent = p.layer_difference;
        document.getElementById('param-corner-threshold').value = p.corner_threshold;
        document.getElementById('val-corner-threshold').textContent = p.corner_threshold + '°';
    }

    /**
     * Función: getActiveVectorParams
     * Descripción: Obtiene el diccionario de parámetros vectoriales activos del panel.
     */
    function getActiveVectorParams() {
        return {
            colormode: document.getElementById('param-colormode').value,
            hierarchical: document.getElementById('param-hierarchical').value,
            mode: document.getElementById('param-mode').value,
            filter_speckle: document.getElementById('param-filter-speckle').value,
            color_precision: document.getElementById('param-color-precision').value,
            layer_difference: document.getElementById('param-layer-difference').value,
            corner_threshold: document.getElementById('param-corner-threshold').value,
            upscale: document.getElementById('param-upscale').value,
            anti_halo: document.getElementById('param-anti-halo').value
        };
    }

    [
        { id: 'param-filter-speckle', valId: 'val-filter-speckle', unit: ' px' },
        { id: 'param-color-precision', valId: 'val-color-precision', unit: '' },
        { id: 'param-layer-difference', valId: 'val-layer-difference', unit: '' },
        { id: 'param-corner-threshold', valId: 'val-corner-threshold', unit: '°' }
    ].forEach(r => {
        const el = document.getElementById(r.id);
        const valEl = document.getElementById(r.valId);
        if (el && valEl) el.addEventListener('input', () => { valEl.textContent = el.value + r.unit; });
    });

    const accordionToggle = document.getElementById('accordion-toggle');
    const accordionBody = document.getElementById('accordion-body');
    const accordionArrow = document.getElementById('accordion-arrow');
    if (accordionToggle && accordionBody) {
        accordionToggle.addEventListener('click', () => {
            accordionBody.classList.toggle('open');
            accordionArrow.textContent = accordionBody.classList.contains('open') ? '[-]' : '[+]';
        });
    }

    document.querySelectorAll('.preset-matrix-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-matrix-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPresetValues(btn.dataset.preset);
            if (state.taskId && !state.isProcessing) processVectorization(false);
        });
    });

    /**
     * Función: processVectorization
     * Descripción: Envía la imagen al backend para vectorización por capas matemáticas.
     */
    async function processVectorization(isNewFile = false) {
        if (state.isProcessing) return;
        state.isProcessing = true;
        if (btnReprocess) btnReprocess.disabled = true;
        if (emptyState) emptyState.style.display = 'none';
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (loadingText) loadingText.textContent = isNewFile ? '> VECTORIZANDO MATRIZ DE PÍXELES...' : '> RE-TRAZANDO CURVAS BÉZIER...';

        const formData = new FormData();
        const params = getActiveVectorParams();
        for (const [key, val] of Object.entries(params)) formData.append(key, val);

        if (isNewFile && state.currentFile) formData.append('image', state.currentFile);
        else if (state.taskId) formData.append('task_id', state.taskId);
        else { cleanupProcessingState(); return; }

        try {
            const response = await fetch('/api/vectorize', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Error al vectorizar');

            state.taskId = data.task_id;
            state.svgContent = data.svg_content;
            state.layers = data.layers || [];
            state.hiddenLayers.clear();

            renderSvgToViewport(data.svg_content);
            renderLayersPanel(state.layers);

            if (vectorLayer) vectorLayer.style.display = 'flex';
            if (processedLayer) processedLayer.style.display = 'none';
            if (viewerWrapper) viewerWrapper.style.display = 'block';
            if (downloadBar) downloadBar.style.display = 'flex';
            if (btnReprocess) btnReprocess.disabled = false;

            document.getElementById('m-label-1').textContent = 'CURVAS:';
            document.getElementById('metric-paths').textContent = data.path_count;
            document.getElementById('m-label-2').textContent = 'TIEMPO:';
            document.getElementById('metric-time').textContent = `${data.elapsed_seconds}s`;
            document.getElementById('m-label-3').textContent = 'TAMAÑO SVG:';
            document.getElementById('metric-size').textContent = `${Math.round(data.svg_size_bytes / 1024)} KB`;
            if (metricBoxSavings) metricBoxSavings.style.display = 'none';

            updateViewMode(state.viewMode);
            showToast(`Vectorizado en ${data.elapsed_seconds}s con ${data.path_count} curvas`);
        } catch (err) {
            showToast(err.message, true);
        } finally {
            cleanupProcessingState();
        }
    }

    /**
     * Función: cleanupProcessingState
     * Descripción: Restablece botones y oculta el spinner de carga al terminar la petición.
     */
    function cleanupProcessingState() {
        state.isProcessing = false;
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (btnReprocess && state.taskId) btnReprocess.disabled = false;
    }

    if (btnReprocess) {
        btnReprocess.addEventListener('click', () => {
            if (state.taskId && !state.isProcessing) processVectorization(false);
        });
    }

    /**
     * Función: renderSvgToViewport
     * Descripción: Inserta el trazado SVG dentro del lienzo interactivo.
     */
    function renderSvgToViewport(svgString) {
        if (!svgContainer) return;
        svgContainer.innerHTML = svgString;
        const svgEl = svgContainer.querySelector('svg');
        if (svgEl) { svgEl.style.width = '100%'; svgEl.style.height = '100%'; }
    }

    /**
     * Función: renderLayersPanel
     * Descripción: Genera los controles de visualización, color y aislamiento por cada capa.
     */
    function renderLayersPanel(layers) {
        if (!layersCard || !layersList) return;
        if (!layers || layers.length === 0) { layersCard.style.display = 'none'; return; }

        layersCard.style.display = 'block';
        layersCount.textContent = layers.length;
        layersList.innerHTML = '';

        layers.forEach((layer) => {
            const row = document.createElement('div');
            row.className = 'layer-item-row';
            row.id = `layer-row-${layer.id}`;
            row.dataset.layerId = layer.id;

            const swatch = document.createElement('span');
            swatch.className = 'layer-swatch';
            swatch.style.backgroundColor = layer.color;

            const name = document.createElement('span');
            name.className = 'layer-name';
            const countVal = layer.path_count || layer.paths_count || 0;
            name.textContent = `${layer.name} (${countVal}c)`;

            const btnEye = document.createElement('button');
            btnEye.type = 'button';
            btnEye.className = 'layer-btn-icon btn-toggle-eye';
            btnEye.textContent = '👁️';

            const btnIsolate = document.createElement('button');
            btnIsolate.type = 'button';
            btnIsolate.className = 'layer-btn-icon btn-isolate';
            btnIsolate.textContent = '🎯';

            row.appendChild(swatch);
            row.appendChild(name);
            row.appendChild(btnEye);
            row.appendChild(btnIsolate);
            layersList.appendChild(row);

            row.addEventListener('mouseenter', () => highlightSvgLayer(layer.id, true));
            row.addEventListener('mouseleave', () => highlightSvgLayer(layer.id, false));
            btnEye.addEventListener('click', (e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); });
            btnIsolate.addEventListener('click', (e) => { e.stopPropagation(); isolateSingleLayer(layer.id); });
        });
    }

    function toggleLayerVisibility(layerId) {
        if (state.hiddenLayers.has(layerId)) state.hiddenLayers.delete(layerId);
        else state.hiddenLayers.add(layerId);
        applyLayersVisibility();
    }

    function isolateSingleLayer(targetId) {
        state.layers.forEach(l => {
            if (l.id === targetId) state.hiddenLayers.delete(l.id);
            else state.hiddenLayers.add(l.id);
        });
        applyLayersVisibility();
    }

    function applyLayersVisibility() {
        state.layers.forEach(l => {
            const isHidden = state.hiddenLayers.has(l.id);
            const row = document.getElementById(`layer-row-${l.id}`);
            if (row) {
                const btnEye = row.querySelector('.btn-toggle-eye');
                row.classList.toggle('hidden-layer', isHidden);
                if (btnEye) btnEye.textContent = isHidden ? '🚫' : '👁️';
            }
            const el = svgContainer.querySelector(`#${l.id}`);
            if (el) el.style.display = isHidden ? 'none' : '';
        });
    }

    function highlightSvgLayer(layerId, isHighlight) {
        const el = svgContainer.querySelector(`#${layerId}`);
        if (el) el.style.filter = isHighlight ? 'drop-shadow(0 0 6px #00ff41)' : '';
    }

    if (btnShowAllLayers) {
        btnShowAllLayers.addEventListener('click', () => { state.hiddenLayers.clear(); applyLayersVisibility(); });
    }
    if (btnHideAllLayers) {
        btnHideAllLayers.addEventListener('click', () => { state.layers.forEach(l => state.hiddenLayers.add(l.id)); applyLayersVisibility(); });
    }

    // 11. Modos de Vista y Deslizador Comparador Láser
    document.querySelectorAll('.vmode-btn[data-view]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.vmode-btn[data-view]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateViewMode(tab.dataset.view);
        });
    });

    /**
     * Función: updateViewMode
     * Descripción: Conmuta la presentación del visor entre split, resultado y original.
     */
    function updateViewMode(mode) {
        state.viewMode = mode;
        const targetActiveLayer = (state.activeTool === 'vector') ? vectorLayer : processedLayer;

        if (mode === 'split') {
            splitLine.style.display = 'block';
            rasterLayer.style.display = 'flex';
            if (targetActiveLayer) targetActiveLayer.style.display = 'flex';
            badgeLeft.style.display = 'block';
            badgeRight.style.display = 'block';
            applySplitPosition(state.splitPercent);
        } else if (mode === 'result') {
            splitLine.style.display = 'none';
            rasterLayer.style.display = 'none';
            if (targetActiveLayer) {
                targetActiveLayer.style.display = 'flex';
                targetActiveLayer.style.clipPath = 'none';
            }
            badgeLeft.style.display = 'none';
            badgeRight.style.display = 'block';
        } else if (mode === 'original') {
            splitLine.style.display = 'none';
            rasterLayer.style.display = 'flex';
            if (targetActiveLayer) targetActiveLayer.style.display = 'none';
            badgeLeft.style.display = 'block';
            badgeRight.style.display = 'none';
        }
    }

    function applySplitPosition(percent) {
        state.splitPercent = Math.max(0, Math.min(100, percent));
        splitLine.style.left = `${state.splitPercent}%`;
        const clipVal = `polygon(${state.splitPercent}% 0, 100% 0, 100% 100%, ${state.splitPercent}% 100%)`;
        if (vectorLayer) vectorLayer.style.clipPath = clipVal;
        if (processedLayer) processedLayer.style.clipPath = clipVal;
    }

    splitLine.addEventListener('mousedown', (e) => { state.isDraggingSplit = true; e.preventDefault(); });
    splitLine.addEventListener('touchstart', (e) => { state.isDraggingSplit = true; }, { passive: true });
    window.addEventListener('mouseup', () => { state.isDraggingSplit = false; state.isPanning = false; });
    window.addEventListener('touchend', () => { state.isDraggingSplit = false; state.isPanning = false; });

    window.addEventListener('mousemove', (e) => {
        if (state.isDraggingSplit) {
            const rect = canvasContainer.getBoundingClientRect();
            applySplitPosition(((e.clientX - rect.left) / rect.width) * 100);
        } else if (state.isPanning) {
            state.panX += e.clientX - state.startX;
            state.panY += e.clientY - state.startY;
            state.startX = e.clientX;
            state.startY = e.clientY;
            applyTransform();
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (state.isDraggingSplit && e.touches.length > 0) {
            const rect = canvasContainer.getBoundingClientRect();
            applySplitPosition(((e.touches[0].clientX - rect.left) / rect.width) * 100);
        }
    }, { passive: true });

    if (btnWireframe) {
        btnWireframe.addEventListener('click', () => {
            state.isWireframe = !state.isWireframe;
            btnWireframe.classList.toggle('active', state.isWireframe);
            canvasContainer.classList.toggle('wireframe-mode', state.isWireframe);
            showToast(state.isWireframe ? 'Modo malla Bézier activo' : 'Render estándar activo');
        });
    }

    // 12. Zoom y Paneo
    /**
     * Función: applyTransform
     * Descripción: Aplica transformaciones de zoom, posición y orientación sobre el lienzo.
     */
    function applyTransform() {
        const transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
        if (imgOriginal) imgOriginal.style.transform = transform;
        if (imgProcessed) {
            const scaleX = state.isFlippedH ? -1 : 1;
            const scaleY = state.isFlippedV ? -1 : 1;
            const orientCss = `rotate(${state.rotationAngle}deg) scale(${scaleX}, ${scaleY})`;
            imgProcessed.style.transform = `${transform} ${orientCss}`;
        }
        if (svgContainer) svgContainer.style.transform = transform;
        document.getElementById('zoom-indicator').textContent = `${Math.round(state.zoom * 100)}%`;
    }

    canvasContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('#split-line') || e.target.closest('.laser-slider')) return;
        state.isPanning = true;
        state.startX = e.clientX;
        state.startY = e.clientY;
    });

    canvasContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        state.zoom = Math.max(0.2, Math.min(8, state.zoom + delta));
        applyTransform();
    }, { passive: false });

    document.getElementById('btn-zoom-in').addEventListener('click', () => { state.zoom = Math.min(8, state.zoom + 0.25); applyTransform(); });
    document.getElementById('btn-zoom-out').addEventListener('click', () => { state.zoom = Math.max(0.2, state.zoom - 0.25); applyTransform(); });
    document.getElementById('btn-zoom-reset').addEventListener('click', () => { state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform(); });

    // 13. Descargas Vectoriales (EPS, SVG, PDF, ZIP)
    /**
     * Función: triggerVectorDownload
     * Descripción: Descarga el archivo vectorial generado bajo demanda desde la API.
     */
    function triggerVectorDownload(format) {
        if (!state.taskId) {
            showToast('No hay archivo vectorial generado.', true);
            return;
        }
        let hiddenParam = '';
        if (state.hiddenLayers.size > 0) {
            hiddenParam = `?hidden=${Array.from(state.hiddenLayers).join(',')}`;
        }
        const downloadUrl = `/api/download/${state.taskId}/${format}${hiddenParam}`;
        showToast(`Descargando formato ${format.toUpperCase()}...`);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    document.getElementById('btn-download-eps').addEventListener('click', () => triggerVectorDownload('eps'));
    document.getElementById('btn-download-svg').addEventListener('click', () => triggerVectorDownload('svg'));
    document.getElementById('btn-download-pdf').addEventListener('click', () => triggerVectorDownload('pdf'));
    document.getElementById('btn-download-zip').addEventListener('click', () => triggerVectorDownload('zip'));
});
