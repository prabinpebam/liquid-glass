import { ConfigManager } from './config-manager.js';
import { ShadowControls } from './shadow-controls.js';   // keep
// IMPORTANT: You need to include the noUiSlider library in your project for this to work.
// e.g., <script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.0/nouislider.min.js"></script>
// and its CSS: <link href="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.0/nouislider.min.css" rel="stylesheet">


/**
 * UI Controls and Event Handling
 */

export class UIControls {
    constructor(liquidGlassParams, backgroundImagesData, renderCallback) {
        this.liquidGlassParams = liquidGlassParams;
        this.backgroundImagesData = backgroundImagesData;
        this.renderCallback = renderCallback;
        this.gl = null; // To be set by setGL

        // Main Glass Shape Controls
        this.rectWidthSlider = document.getElementById('rectWidthSlider');
        this.rectWidthValue = document.getElementById('rectWidthValue');
        this.rectHeightSlider = document.getElementById('rectHeightSlider');
        this.rectHeightValue = document.getElementById('rectHeightValue');
        this.rectCornerRadiusSlider = document.getElementById('rectCornerRadiusSlider');
        this.rectCornerRadiusValue = document.getElementById('rectCornerRadiusValue');
        this.innerRadiusFactorSlider = document.getElementById('innerRadiusFactorSlider');
        this.innerRadiusFactorValue = document.getElementById('innerRadiusFactorValue');
        this.refractionStrengthSlider = document.getElementById('refractionStrengthSlider');
        this.refractionStrengthValue = document.getElementById('refractionStrengthValue');
        this.glassAlphaSlider = document.getElementById('glassAlphaSlider');
        this.glassAlphaValue = document.getElementById('glassAlphaValue');
        this.frostinessSlider = document.getElementById('frostinessSlider');
        this.frostinessValue = document.getElementById('frostinessValue');
        
        // Chromatic Aberration Controls
        this.chromaticAberrationToggle = document.getElementById('chromaticAberrationToggle');
        this.chromaticAberrationSlider = document.getElementById('chromaticAberrationSlider');
        this.chromaticAberrationValue = document.getElementById('chromaticAberrationValue');
        this.chromaticAberrationAmountControlGroup = document.getElementById('chromaticAberrationAmountControlGroup');

        // Grid Controls
        this.gridToggle = document.getElementById('gridToggle');
        this.gridSpacingSlider = document.getElementById('gridSpacingSlider');

        // Top Shadow Controls
        this.topShadowBlurSlider = document.getElementById('topShadowBlurSlider');
        this.topShadowBlurValue = document.getElementById('topShadowBlurValue');
        this.topShadowOffsetXSlider = document.getElementById('topShadowOffsetXSlider');
        this.topShadowOffsetXValue = document.getElementById('topShadowOffsetXValue');
        this.topShadowOffsetYSlider = document.getElementById('topShadowOffsetYSlider');
        this.topShadowOffsetYValue = document.getElementById('topShadowOffsetYValue');
        this.topShadowOpacitySlider = document.getElementById('topShadowOpacitySlider');
        this.topShadowOpacityValue = document.getElementById('topShadowOpacityValue');

        // Bottom Glow Controls
        this.bottomGlowBlurSlider = document.getElementById('bottomGlowBlurSlider');
        this.bottomGlowBlurValue = document.getElementById('bottomGlowBlurValue');
        this.bottomGlowOffsetXSlider = document.getElementById('bottomGlowOffsetXSlider');
        this.bottomGlowOffsetXValue = document.getElementById('bottomGlowOffsetXValue');
        this.bottomGlowOffsetYSlider = document.getElementById('bottomGlowOffsetYSlider');
        this.bottomGlowOffsetYValue = document.getElementById('bottomGlowOffsetYValue');
        this.bottomGlowOpacitySlider = document.getElementById('bottomGlowOpacitySlider');
        this.bottomGlowOpacityValue = document.getElementById('bottomGlowOpacityValue');

        // Reflection Controls (new implementation)
        this.reflectionToggle = document.getElementById('reflectionToggle');

        // Border parameters
        this.reflectionBorderThicknessSlider = document.getElementById('reflectionBorderThicknessSlider');
        this.reflectionBorderThicknessValue  = document.getElementById('reflectionBorderThicknessValue');
        this.reflectionBorderBlurSlider      = document.getElementById('reflectionBorderBlurSlider');
        this.reflectionBorderBlurValue       = document.getElementById('reflectionBorderBlurValue');
        this.reflectionBorderOffsetSlider    = document.getElementById('reflectionBorderOffsetSlider');
        this.reflectionBorderOffsetValue     = document.getElementById('reflectionBorderOffsetValue');
        this.reflectionStartAngleSlider      = document.getElementById('reflectionStartAngleSlider');
        this.reflectionStartAngleValue       = document.getElementById('reflectionStartAngleValue');

        // NEW sliders
        this.reflectionOverlayOpacitySlider  = document.getElementById('reflectionOverlayOpacitySlider');
        this.reflectionOverlayOpacityValue   = document.getElementById('reflectionOverlayOpacityValue');
        
        // NEW dual-thumb slider refs
        this.gradientSlider = document.getElementById('reflectionGradientSlider'); // This is the noUiSlider target
        this.gradientHVal   = document.getElementById('gradientHVal'); // For 2h %
        this.gradientTVal   = document.getElementById('gradientTVal'); // For 4t %
        this.gradientDVal   = document.getElementById('gradientDVal'); // For 2d %

        // UI Elements for interaction handler / other functionalities
        this.controlPanel = document.getElementById('controls-pane');
        this.addImageIcon = document.getElementById('add-image-icon');
        this.gridIcon = document.getElementById('grid-icon');
        this.imageUpload = document.getElementById('imageUpload');

        // Tab related elements
        this.tabPills = document.querySelectorAll('.tab-pill');
        this.tabPanels = document.querySelectorAll('.tab-panel');

        // Config management
        this.configManager = new ConfigManager(liquidGlassParams, this, backgroundImagesData);
        
        // Save/Load elements
        this.saveConfigBtn = document.getElementById('save-config-btn');
        this.loadConfigBtn = document.getElementById('load-config-btn');
        this.saveModal = document.getElementById('save-modal');
        this.configNameInput = document.getElementById('config-name-input');
        this.saveConfirmBtn = document.getElementById('save-confirm-btn');
        this.saveCancelBtn = document.getElementById('save-cancel-btn');
        this.loadDropdown = document.getElementById('load-dropdown');
        this.configList = document.getElementById('config-list');
        this.clearAllUserConfigsBtn = null; // Will be created if not in HTML

        // REMOVED old sliders for gradient layout
        // this.highlightPctSlider  = document.getElementById('highlightPctSlider'); // Removed
        // this.highlightPctVal     = document.getElementById('highlightPctVal'); // Removed
        // this.transitionPctSlider = document.getElementById('transitionPctSlider'); // Removed
        // this.transitionPctVal    = document.getElementById('transitionPctVal'); // Removed
    }

    setGL(gl) {
        this.gl = gl;
    }

    initialize() {
        console.log("UIControls initializing...");
        const p = this.liquidGlassParams;   // ← single, authoritative alias

        // ─── NEW: create modular shadow controls ───
        this.shadowControls = new ShadowControls(
            this.liquidGlassParams,
            this.configManager,
            this.renderCallback
        );
        this.shadowControls.initialize();
        // ───────────────────────────────────────────

        // Main Glass Shape Sliders
        this.setupSlider(this.rectWidthSlider, this.rectWidthValue, 'rectangleWidth', 0, 'px');
        this.setupSlider(this.rectHeightSlider, this.rectHeightValue, 'rectangleHeight', 0, 'px');
        this.setupSlider(this.rectCornerRadiusSlider, this.rectCornerRadiusValue, 'rectangleCornerRadius', 0, 'px');
        this.setupSlider(this.innerRadiusFactorSlider, this.innerRadiusFactorValue, 'edgeDistortionThickness', 0, 'px');
        this.setupSlider(this.refractionStrengthSlider, this.refractionStrengthValue, 'refractionStrength', 1);
        // Special handler for glassAlphaSlider as it updates an array element
        this.setupSlider(this.glassAlphaSlider, this.glassAlphaValue, 'glassBaseColorAlpha', 2, '', 
            (value) => { this.liquidGlassParams.glassBaseColor[3] = parseFloat(value); },
            () => this.liquidGlassParams.glassBaseColor[3]
        );
        this.setupSlider(this.frostinessSlider, this.frostinessValue, 'frostiness', 1);
        
        // Chromatic Aberration Controls
        if (this.chromaticAberrationToggle) {
            this.chromaticAberrationToggle.checked = this.liquidGlassParams.enableChromaticAberration;
            this.updateChromaticAberrationAmountVisibility(); // Initial visibility state
            this.chromaticAberrationToggle.addEventListener('change', (e) => {
                this.liquidGlassParams.enableChromaticAberration = e.target.checked;
                console.log(`Checkbox changed: enableChromaticAberration, New value: ${this.liquidGlassParams.enableChromaticAberration}`);
                this.updateChromaticAberrationAmountVisibility();
                this.renderCallback();
            });
        } else {
            console.warn("chromaticAberrationToggle element not found.");
        }
        this.setupSlider(this.chromaticAberrationSlider, this.chromaticAberrationValue, 'chromaticAberrationAmount', 1);


        // Grid Controls
        if (this.gridToggle) {
            this.gridToggle.checked = this.liquidGlassParams.showGrid;
            this.gridToggle.addEventListener('change', (e) => {
                this.liquidGlassParams.showGrid = e.target.checked;
                console.log(`Checkbox changed: showGrid, New value: ${this.liquidGlassParams.showGrid}`);
                this.renderCallback();
            });
        } else {
            console.warn("gridToggle element not found.");
        }

        if (this.gridSpacingSlider) {
            this.gridSpacingSlider.value = this.liquidGlassParams.gridSpacing;
            this.gridSpacingSlider.addEventListener('input', (e) => {
                this.liquidGlassParams.gridSpacing = parseFloat(e.target.value);
                console.log(`Slider changed: gridSpacing, New value: ${this.liquidGlassParams.gridSpacing}`);
                this.renderCallback();
            });
        } else {
            console.warn("gridSpacingSlider element not found.");
        }

        // Top Shadow Sliders
        this.setupSlider(this.topShadowBlurSlider, this.topShadowBlurValue, 'topShadowBlur', 0, 'px');
        this.setupSlider(this.topShadowOffsetXSlider, this.topShadowOffsetXValue, 'topShadowOffsetX', 0, 'px');
        this.setupSlider(this.topShadowOffsetYSlider, this.topShadowOffsetYValue, 'topShadowOffsetY', 0, 'px');
        this.setupSlider(this.topShadowOpacitySlider, this.topShadowOpacityValue, 'topShadowOpacity', 2);

        // Bottom Glow Sliders
        this.setupSlider(this.bottomGlowBlurSlider, this.bottomGlowBlurValue, 'bottomGlowBlur', 0, 'px');
        this.setupSlider(this.bottomGlowOffsetXSlider, this.bottomGlowOffsetXValue, 'bottomGlowOffsetX', 0, 'px');
        this.setupSlider(this.bottomGlowOffsetYSlider, this.bottomGlowOffsetYValue, 'bottomGlowOffsetY', 0, 'px');
        this.setupSlider(this.bottomGlowOpacitySlider, this.bottomGlowOpacityValue, 'bottomGlowOpacity', 2);

        // Reflection Controls (new implementation)
        if (this.reflectionToggle) {
            this.reflectionToggle.checked = this.liquidGlassParams.enableReflection;
            this.updateReflectionControlsVisibility();
            this.reflectionToggle.addEventListener('change', (e) => {
                this.liquidGlassParams.enableReflection = e.target.checked;
                console.log(`Checkbox changed: enableReflection, New value: ${this.liquidGlassParams.enableReflection}`);
                this.updateReflectionControlsVisibility();
                this.renderCallback();
            });
        }

        // New reflection sliders
        this.setupSlider(this.reflectionBorderThicknessSlider, this.reflectionBorderThicknessValue, 'reflectionBorderThickness', 0, 'px');
        this.setupSlider(this.reflectionBorderBlurSlider,      this.reflectionBorderBlurValue,      'reflectionBorderBlur',      1, 'px');
        this.setupSlider(this.reflectionBorderOffsetSlider,    this.reflectionBorderOffsetValue,    'reflectionBorderOffset',    0, 'px');
        this.setupSlider(this.reflectionStartAngleSlider,      this.reflectionStartAngleValue,      'reflectionStartAngle',      0, '°');
        this.setupSlider(
            this.reflectionOverlayOpacitySlider,
            this.reflectionOverlayOpacityValue,
            'reflectionOverlayOpacity',
            2                    // show two decimals
        );

        // REMOVE old gradient slider logic
        /*
        // ========== Gradient layout (%) sliders ========== 

        // ----- helper to refresh labels & slider thumbs -----
        const syncGradientUI = () => { ... }; // Removed

        // helper calculators --------------------------------------------------
        function solveTD(hNew) { ... } // Removed
        function solveHD(tNew, hOld, dOld) { ... } // Removed
        function solveHT(dNew, hOld, tOld) { ... } // Removed
        // ---------------------------------------------------------------------

        // slider listeners ----------------------------------------------------
        if (this.highlightPctSlider) { // Check added for safety, but elements are removed
            this.highlightPctSlider.addEventListener('input', e => { ... }); // Removed
        }


        if (this.transitionPctSlider) { // Check added for safety
            this.transitionPctSlider.addEventListener('input', e => { ... }); // Removed
        }


        // dark percent is display-only; the slider element was removed,
        // so add a listener only if it is present (e.g. older HTML)
        if (this.darkPctSlider) { // This was already commented out or removed
            // ...
        }

        // syncGradientUI();   // initial paint // Removed
        /* ================================================== */

        // Initialize NEW dual-thumb gradient slider (noUiSlider)
        if (this.gradientSlider && typeof noUiSlider !== 'undefined') {
            const initialH = p.reflectionHighlightSize; // This is h
            const initialT = p.reflectionTransitionSize; // This is t

            let initial2h = initialH * 2;
            let initial4t = initialT * 4;

            // Ensure initial values are within valid sum (<= 100)
            if (initial2h + initial4t > 100) {
                const scale = 100 / (initial2h + initial4t);
                initial2h *= scale;
                initial4t *= scale;
            }
            
            // Ensure individual components are not too large if the other is zero
            initial2h = Math.min(initial2h, 100);
            initial4t = Math.min(initial4t, 100 - initial2h);


            noUiSlider.create(this.gradientSlider, {
                start: [initial2h, initial2h + initial4t], // Positions of the two thumbs
                connect: [true, true, true], // Connects segments: left, middle, right
                range: {
                    'min': 0,
                    'max': 100
                },
                step: 1,
                tooltips: false, // We use separate labels
                behaviour: 'drag'
            });

            this.gradientSlider.noUiSlider.on('update', (values, handle) => {
                const v1 = parseFloat(values[0]);
                const v2 = parseFloat(values[1]);

                const val2h = v1;
                const val4t = v2 - v1;
                const val2d = 100 - v2;

                // Update liquidGlassParams
                p.reflectionHighlightSize = Math.max(0, val2h / 2.0);
                p.reflectionTransitionSize = Math.max(0, val4t / 4.0);

                // Update readout labels
                if (this.gradientHVal) this.gradientHVal.textContent = val2h.toFixed(0);
                if (this.gradientTVal) this.gradientTVal.textContent = val4t.toFixed(0);
                if (this.gradientDVal) this.gradientDVal.textContent = val2d.toFixed(0);
                
                this.configManager.saveCurrentState();
                this.renderCallback();
            });
            
            // Initial update of labels from params
            const current2h = p.reflectionHighlightSize * 2;
            const current4t = p.reflectionTransitionSize * 4;
            const current2d = 100 - (current2h + current4t);
            if (this.gradientHVal) this.gradientHVal.textContent = current2h.toFixed(0);
            if (this.gradientTVal) this.gradientTVal.textContent = current4t.toFixed(0);
            if (this.gradientDVal) this.gradientDVal.textContent = current2d.toFixed(0);

        } else if (!this.gradientSlider) {
            console.warn("reflectionGradientSlider element not found.");
        } else if (typeof noUiSlider === 'undefined') {
            console.warn("noUiSlider library is not loaded. Gradient slider will not work.");
        }


        // Image upload listener
        if (this.imageUpload) {
            if (!this.imageUpload.listenerAdded) { // Prevent multiple listeners if initialize is called more than once
                this.imageUpload.addEventListener('change', (event) => this.handleImageUpload(event));
                this.imageUpload.listenerAdded = true;
            }
        } else {
            console.warn("imageUpload element not found.");
        }
        
        this.setupSaveLoadHandlers();
        this.initializeTabs();
        console.log("UIControls initialization complete.");

        // INITIAL call to update all three % labels
        // first paint already done by updateReadout() above

        /* ---------- gradient layout sliders --------------------- */
        // REMOVE duplicate helper calculators (DELETE)
        /* ---------- duplicate helper calculators (DELETE) ----------
        const solveTD = (hNew, tOld, dOld) => { ... }; // Removed
        const solveHD = (tNew, hOld, dOld) => { ... }; // Removed
        const solveHT = (dNew, hOld, tOld) => { ... }; // Removed
        //------------------------------------------------------------*/
        
        // REMOVE event listeners for old sliders
        /*
        if (this.highlightPctSlider) {
             this.highlightPctSlider.addEventListener('input', e => { ... }); // Removed
        }
        if (this.transitionPctSlider) {
            this.transitionPctSlider.addEventListener('input', e => { ... }); // Removed
        }
        */


        // (dark percent is display-only now, no slider listener)
        // ---------------------------------------------------------------------

        // Gradient labels already synchronised by syncGradientUI() // Removed
        /* --------------------------------------------------------- */
    }

    setupSaveLoadHandlers() {
        // Save button
        if (this.saveConfigBtn) {
            this.saveConfigBtn.addEventListener('click', () => {
                this.showSaveModal();
            });
        }

        // Load button
        if (this.loadConfigBtn) {
            this.loadConfigBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLoadDropdown();
            });
        }

        // Save modal handlers
        if (this.saveConfirmBtn) {
            this.saveConfirmBtn.addEventListener('click', () => {
                this.handleSaveConfig();
            });
        }

        if (this.saveCancelBtn) {
            this.saveCancelBtn.addEventListener('click', () => {
                this.hideSaveModal();
            });
        }

        // Modal background click
        if (this.saveModal) {
            this.saveModal.addEventListener('click', (e) => {
                if (e.target === this.saveModal) {
                    this.hideSaveModal();
                }
            });
        }

        // Config name input enter key
        if (this.configNameInput) {
            this.configNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSaveConfig();
                }
            });
        }

        // Click outside dropdown to close
        document.addEventListener('click', (e) => {
            if (this.loadDropdown && this.loadDropdown.style.display === 'block') {
                // Check if click is outside both the dropdown and the load button
                if (!this.loadDropdown.contains(e.target) && 
                    !this.loadConfigBtn.contains(e.target)) {
                    this.hideLoadDropdown();
                }
            }
        });
    }

    showSaveModal() {
        if (this.saveModal) {
            this.saveModal.style.display = 'block';
            this.configNameInput.value = '';
            this.configNameInput.focus();
        }
    }

    hideSaveModal() {
        if (this.saveModal) {
            this.saveModal.style.display = 'none';
        }
    }

    handleSaveConfig() {
        const name = this.configNameInput.value.trim();
        if (!name) {
            alert('Please enter a configuration name.');
            return;
        }

        this.configManager.saveConfiguration(name);
        this.hideSaveModal();
        
        // Show success message briefly
        this.showToast(`Configuration "${name}" saved successfully!`);
    }

    toggleLoadDropdown() {
        if (this.loadDropdown.style.display === 'block') {
            this.hideLoadDropdown();
        } else {
            this.showLoadDropdown();
        }
    }

    showLoadDropdown() {
        this.populateConfigList();
        
        // Position the dropdown relative to the load button
        if (this.loadConfigBtn && this.loadDropdown) {
            const buttonRect = this.loadConfigBtn.getBoundingClientRect();
            const dropdownWidth = 250; // Match CSS width
            
            // Position below the button with some spacing
            let left = buttonRect.right - dropdownWidth; // Align right edge with button
            let top = buttonRect.bottom + 5; // 5px gap below button
            
            // Ensure dropdown doesn't go off-screen horizontally
            const viewportWidth = window.innerWidth;
            if (left < 10) {
                left = 10; // Minimum 10px from left edge
            } else if (left + dropdownWidth > viewportWidth - 10) {
                left = viewportWidth - dropdownWidth - 10; // 10px from right edge
            }
            
            // Ensure dropdown doesn't go off-screen vertically
            const viewportHeight = window.innerHeight;
            const maxDropdownHeight = 400; // Match CSS max-height
            if (top + maxDropdownHeight > viewportHeight - 10) {
                // Position above the button instead
                top = buttonRect.top - maxDropdownHeight - 5;
                // If still doesn't fit, position at top of viewport
                if (top < 10) {
                    top = 10;
                }
            }
            
            this.loadDropdown.style.left = `${left}px`;
            this.loadDropdown.style.top = `${top}px`;
        }
        
        this.loadDropdown.style.display = 'block';
    }

    hideLoadDropdown() {
        this.loadDropdown.style.display = 'none';
    }

    populateConfigList() {
        const allConfigs = this.configManager.getAllConfigurations();
        const presetKeys = Object.keys(allConfigs.presets);
        const userConfigIds = Object.keys(allConfigs.userConfigs);

        let html = '';

        // Add default presets first
        if (presetKeys.length > 0) {
            presetKeys.forEach(name => { // 'name' is the key for default presets
                const preset = allConfigs.presets[name];
                const displayName = preset.displayName || name; // Use displayName from preset object
                const dateStr = typeof preset.savedAt === 'number' && preset.savedAt !== 0 ? new Date(preset.savedAt).toLocaleString() : "Built-in preset";
                html += `
                    <div class="config-item preset-item" data-config-name="${name}">
                        <div class="config-item-content">
                            <div class="config-name">${displayName}</div>
                            <div class="config-date">${dateStr}</div>
                        </div>
                    </div>
                `;
            });
        }

        // Add separator if there are user configs and presets
        if (presetKeys.length > 0 && userConfigIds.length > 0) {
            html += '<div class="config-separator">Your Configurations</div>';
        } else if (userConfigIds.length > 0 && presetKeys.length === 0) {
            // If only user configs, add a header
             html += '<div class="config-separator">Your Configurations</div>';
        }

        // Add user configurations
        if (userConfigIds.length > 0) {
            userConfigIds.forEach(id => {
                const config = allConfigs.userConfigs[id];
                const displayName = config.displayName || id; // Use displayName, fallback to ID
                const date = new Date(config.savedAt).toLocaleString();
                html += `
                    <div class="config-item user-config-item" data-config-name="${id}">
                        <div class="config-item-content">
                            <div class="config-name">${displayName}</div>
                            <div class="config-date">${date}</div>
                        </div>
                        <div class="delete-config" data-config-name="${id}">×</div>
                    </div>
                `;
            });
        }

        if (presetKeys.length === 0 && userConfigIds.length === 0) {
            html = '<div class="no-configs">No saved configurations</div>';
        }

        this.configList.innerHTML = html;

        // Add event listeners for config items
        this.configList.querySelectorAll('.config-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-config')) {
                    const configNameOrId = item.dataset.configName; // This is preset key or user config ID
                    this.loadConfiguration(configNameOrId);
                }
            });
        });

        // Only add delete listeners to user configs
        this.configList.querySelectorAll('.user-config-item .delete-config').forEach(deleteBtn => {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const configId = deleteBtn.dataset.configName; // This is the user config ID
                this.deleteConfiguration(configId);
            });
        });

        // Manage "Clear All User Presets" button
        if (!this.clearAllUserConfigsBtn) {
            this.clearAllUserConfigsBtn = document.createElement('button');
            this.clearAllUserConfigsBtn.id = 'clear-all-user-configs-btn';
            this.clearAllUserConfigsBtn.className = 'frosted-button danger'; // Not full-width
            this.clearAllUserConfigsBtn.textContent = 'Clear All My Presets';
            // Styles for centering and margin
            this.clearAllUserConfigsBtn.style.display = 'block'; // Or 'inline-block' if preferred with text-align on parent
            this.clearAllUserConfigsBtn.style.margin = '20px auto 10px auto'; // Top, LR auto (center), Bottom
            this.clearAllUserConfigsBtn.style.padding = '8px 16px'; // Ensure some padding if not full-width

            this.clearAllUserConfigsBtn._handler = () => this.handleDeleteAllUserConfigs();
            this.clearAllUserConfigsBtn.addEventListener('click', this.clearAllUserConfigsBtn._handler);
        }

        // Remove if already present to avoid duplicates and ensure it's appended correctly
        if (this.clearAllUserConfigsBtn.parentElement) {
            this.clearAllUserConfigsBtn.parentElement.removeChild(this.clearAllUserConfigsBtn);
        }

        // Append to configList to be part of scrollable content, only if user configs exist
        if (userConfigIds.length > 0) {
            this.configList.appendChild(this.clearAllUserConfigsBtn); // Append to the list itself
            this.clearAllUserConfigsBtn.style.display = 'block'; // Or 'inline-block'
        } else {
            this.clearAllUserConfigsBtn.style.display = 'none';
        }
    }

    loadConfiguration(nameOrId) { // nameOrId can be preset key or user config ID
        let displayName = nameOrId;
        const allConfigs = this.configManager.getAllConfigurations();
        if (allConfigs.presets.hasOwnProperty(nameOrId)) {
            displayName = allConfigs.presets[nameOrId].displayName || nameOrId;
        } else if (allConfigs.userConfigs.hasOwnProperty(nameOrId)) {
            displayName = allConfigs.userConfigs[nameOrId].displayName || nameOrId;
        }

        if (this.configManager.loadConfiguration(nameOrId)) {
            this.hideLoadDropdown();
            this.showToast(`Configuration "${displayName}" loaded successfully!`);
        } else {
            alert(`Failed to load configuration "${displayName}"`);
        }
    }

    deleteConfiguration(id) { // 'id' is the user config ID
        const configToDelete = this.configManager.getSavedConfigurations()[id];
        const displayName = configToDelete ? configToDelete.displayName : id;

        if (confirm(`Are you sure you want to delete "${displayName}"?`)) {
            if (this.configManager.deleteConfiguration(id)) {
                this.populateConfigList(); // Refresh the list
                this.showToast(`Configuration "${displayName}" deleted.`);
            } else {
                // ConfigManager already logs error, an alert might be redundant
                // alert(`Failed to delete configuration "${displayName}".`);
            }
        }
    }

    handleDeleteAllUserConfigs() {
        if (confirm('Are you sure you want to delete ALL your saved presets? This action cannot be undone.')) {
            if (this.configManager.deleteAllUserConfigurations()) {
                this.populateConfigList(); // Refresh the list
                this.showToast('All user presets have been deleted.');
                this.hideLoadDropdown(); // Close dropdown after clearing
                // Optionally, load a default preset
                // this.configManager.loadDefaultPreset(DEFAULT_PRESET_NAME); 
            } else {
                alert('Failed to delete all user presets.');
            }
        }
    }

    showToast(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 122, 255, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 2000;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    updateChromaticAberrationAmountVisibility() {
        if (this.chromaticAberrationAmountControlGroup) {
            if (this.liquidGlassParams.enableChromaticAberration) {
                this.chromaticAberrationAmountControlGroup.style.maxHeight = '100px';
                this.chromaticAberrationAmountControlGroup.style.opacity = '1';
                this.chromaticAberrationAmountControlGroup.style.pointerEvents = 'auto';
                this.chromaticAberrationSlider.disabled = false;
            } else {
                this.chromaticAberrationAmountControlGroup.style.maxHeight = '0';
                this.chromaticAberrationAmountControlGroup.style.opacity = '0';
                this.chromaticAberrationAmountControlGroup.style.pointerEvents = 'none';
                this.chromaticAberrationSlider.disabled = true;
            }
        }
    }

    updateReflectionControlsVisibility() {
        // Toggle visibility of all control-groups inside the reflections tab
        document.querySelectorAll('#tab-reflections .control-group').forEach(group => {
            if (this.liquidGlassParams.enableReflection) {
                group.style.maxHeight     = '100px';
                group.style.opacity       = '1';
                group.style.pointerEvents = 'auto';
            } else {
                group.style.maxHeight     = '0';
                group.style.opacity       = '0';
                group.style.pointerEvents = 'none';
            }
        });
    }

    initializeTabs() {
        this.tabPills.forEach(pill => {
            pill.addEventListener('click', () => {
                // Deactivate all pills and panels
                this.tabPills.forEach(p => p.classList.remove('active'));
                this.tabPanels.forEach(panel => panel.classList.remove('active'));

                // Activate clicked pill
                pill.classList.add('active');

                // Activate corresponding panel
                const targetPanelId = pill.getAttribute('data-tab-target');
                const targetPanel = document.querySelector(targetPanelId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                } else {
                    console.warn(`Tab panel with selector ${targetPanelId} not found.`);
                }
            });
        });

        // Ensure the default active tab is shown
        const activePill = document.querySelector('.tab-pill.active');
        if (activePill) {
            const activePanelId = activePill.getAttribute('data-tab-target');
            const activePanel = document.querySelector(activePanelId);
            if (activePanel) {
                activePanel.classList.add('active');
            }
        }
    }

    setupSlider(sliderElement, valueElement, paramNameOrKey, precision, unit = '', customSetter, customGetter) {
        if (!sliderElement) {
            console.warn(`Slider element for '${paramNameOrKey}' not found.`);
            return;
        }

        // Use customGetter if provided, otherwise access liquidGlassParams directly
        const initialValue = customGetter ? customGetter() : this.liquidGlassParams[paramNameOrKey];
        
        if (initialValue === undefined && !customGetter) {
            console.warn(`Parameter '${paramNameOrKey}' not found in liquidGlassParams and no customGetter provided.`);
            return;
        }
        sliderElement.value = initialValue;

        if (valueElement) {
            valueElement.textContent = parseFloat(initialValue).toFixed(precision) + (unit || '');
        }

        sliderElement.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            let actualValue;

            if (customSetter) {
                customSetter(value);
                actualValue = customGetter ? customGetter() : value;
            } else {
                this.liquidGlassParams[paramNameOrKey] = value;
                actualValue = value;
            }
            
            console.log(`Slider changed: ${paramNameOrKey}, New value: ${actualValue}`);

            if (valueElement) {
                valueElement.textContent = parseFloat(actualValue).toFixed(precision) + (unit || '');
            }
            
            // Save current state on every change
            this.configManager.saveCurrentState();
            this.renderCallback();
        });
    }

    getUIElements() {
        return {
            controlPanel: this.controlPanel,
            addImageIcon: this.addImageIcon,
            gridIcon: this.gridIcon,
            imageUpload: this.imageUpload,
            backgroundImageUpload: this.imageUpload,
            gridToggle: this.gridToggle,
            gridSpacingSlider: this.gridSpacingSlider
        };
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && this.gl) {
            const reader = new FileReader();
            reader.onload = (e_reader) => {
                const img = new Image();
                img.onload = () => {
                    if (!this.gl) {
                        console.error("GL context not available for texture creation.");
                        return;
                    }
                    const texture = this.gl.createTexture();
                    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

                    const aspectRatio = img.width / img.height;
                    const defaultWidth = 200; 
                    
                    if (this.backgroundImagesData.length < 8) { 
                        this.backgroundImagesData.push({
                            texture: texture,
                            aspectRatio: aspectRatio,
                            position: { x: 50, y: (this.gl.canvas.height - defaultWidth / aspectRatio) / 2 },
                            size: { x: defaultWidth, y: defaultWidth / aspectRatio }
                        });
                        this.renderCallback();
                    } else {
                        alert("Maximum number of images (8) reached.");
                    }
                };
                img.src = e_reader.target.result;
            };
            reader.readAsDataURL(file);
            if (event.target) {
                event.target.value = null; 
            }
        }
    }

    updateReflectionDerived(labelElem, params) {
        // This function might be obsolete now or can be removed if not used elsewhere.
        // The new gradient slider updates its labels directly.
        // If you still need it for some other purpose:
        if (!labelElem) { return; }

        const h = params.reflectionHighlightSize;
        const t = params.reflectionTransitionSize;
        const val2h = h * 2;
        const val4t = t * 4;
        const d = Math.max(0, (100 - (val2h + val4t)) / 2.0); // d for one dark zone
        // The labelElem here would correspond to one of the new labels if adapted.
        // For example, if labelElem is gradientDVal, it should show 2*d.
        // However, direct update in slider event is preferred.
        // labelElem.textContent = (d * 2).toFixed(0); // Example if it were for 2d
    }
}

/* ------- Shadow controls (modular) ------- */