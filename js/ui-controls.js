import { ConfigManager } from './config-manager.js';

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

        // Gradient stops (seven sliders)
        this.reflectionStopSliders = [];
        this.reflectionStopValues  = [];
        for (let i = 1; i <= 7; i++) {
            this.reflectionStopSliders[i] = document.getElementById(`reflectionStop${i}Slider`);
            this.reflectionStopValues[i]  = document.getElementById(`reflectionStop${i}Value`);
        }

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
    }

    setGL(gl) {
        this.gl = gl;
    }

    initialize() {
        console.log("UIControls initializing...");

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

        // Gradient stop sliders (Stop1-Stop7)
        for (let i = 1; i <= 7; i++) {
            this.setupSlider(
                this.reflectionStopSliders[i],
                this.reflectionStopValues[i],
                `reflectionStop${i}`,
                0,
                '%'
            );
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
        const presetNames = Object.keys(allConfigs.presets);
        const userConfigNames = Object.keys(allConfigs.userConfigs);

        let html = '';

        // Add default presets first
        if (presetNames.length > 0) {
            presetNames.forEach(name => {
                html += `
                    <div class="config-item preset-item" data-config-name="${name}">
                        <div class="config-item-content">
                            <div class="config-name">${name}</div>
                            <div class="config-date">Built-in preset</div>
                        </div>
                    </div>
                `;
            });
        }

        // Add separator if there are user configs
        if (userConfigNames.length > 0) {
            html += '<div class="config-separator">Your Configurations</div>';
            
            userConfigNames.forEach(name => {
                const config = allConfigs.userConfigs[name];
                const date = new Date(config.savedAt).toLocaleString();
                
                html += `
                    <div class="config-item user-config-item" data-config-name="${name}">
                        <div class="config-item-content">
                            <div class="config-name">${name}</div>
                            <div class="config-date">${date}</div>
                        </div>
                        <div class="delete-config" data-config-name="${name}">×</div>
                    </div>
                `;
            });
        }

        if (presetNames.length === 0 && userConfigNames.length === 0) {
            html = '<div class="no-configs">No saved configurations</div>';
        }

        this.configList.innerHTML = html;

        // Add event listeners
        this.configList.querySelectorAll('.config-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-config')) {
                    const configName = item.dataset.configName;
                    this.loadConfiguration(configName);
                }
            });
        });

        // Only add delete listeners to user configs
        this.configList.querySelectorAll('.user-config-item .delete-config').forEach(deleteBtn => {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const configName = deleteBtn.dataset.configName;
                this.deleteConfiguration(configName);
            });
        });
    }

    loadConfiguration(name) {
        if (this.configManager.loadConfiguration(name)) {
            this.hideLoadDropdown();
            this.showToast(`Configuration "${name}" loaded successfully!`);
        } else {
            alert(`Failed to load configuration "${name}"`);
        }
    }

    deleteConfiguration(name) {
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            if (this.configManager.deleteConfiguration(name)) {
                this.populateConfigList(); // Refresh the list
                this.showToast(`Configuration "${name}" deleted.`);
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
}
