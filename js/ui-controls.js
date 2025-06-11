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
        // Note: gridSpacingSlider from index.html doesn't have a separate value display span in the provided HTML

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

        // Reflection Controls
        this.reflectionToggle = document.getElementById('reflectionToggle');
        this.reflectionArcDegreesSlider = document.getElementById('reflectionArcDegreesSlider');
        this.reflectionArcDegreesValue = document.getElementById('reflectionArcDegreesValue');
        this.reflectionArcDegreesControlGroup = document.getElementById('reflectionArcDegreesControlGroup');
        this.reflectionThicknessSlider = document.getElementById('reflectionThicknessSlider');
        this.reflectionThicknessValue = document.getElementById('reflectionThicknessValue');
        this.reflectionThicknessControlGroup = document.getElementById('reflectionThicknessControlGroup');
        this.reflectionOffsetSlider = document.getElementById('reflectionOffsetSlider');
        this.reflectionOffsetValue = document.getElementById('reflectionOffsetValue');
        this.reflectionOffsetControlGroup = document.getElementById('reflectionOffsetControlGroup');
        this.reflectionOpacitySlider = document.getElementById('reflectionOpacitySlider');
        this.reflectionOpacityValue = document.getElementById('reflectionOpacityValue');
        this.reflectionOpacityControlGroup = document.getElementById('reflectionOpacityControlGroup');
        this.reflectionArcPositionOffsetSlider = document.getElementById('reflectionArcPositionOffsetSlider');
        this.reflectionArcPositionOffsetValue = document.getElementById('reflectionArcPositionOffsetValue');
        this.reflectionArcPositionOffsetControlGroup = document.getElementById('reflectionArcPositionOffsetControlGroup');

        // UI Elements for interaction handler / other functionalities
        this.controlPanel = document.getElementById('controls-pane');
        this.addImageIcon = document.getElementById('add-image-icon');
        this.gridIcon = document.getElementById('grid-icon');
        this.imageUpload = document.getElementById('imageUpload');

        // Tab related elements
        this.tabPills = document.querySelectorAll('.tab-pill');
        this.tabPanels = document.querySelectorAll('.tab-panel');
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
                // No dedicated value span for grid spacing in HTML, so no update here
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

        // Reflection Controls
        if (this.reflectionToggle) {
            this.reflectionToggle.checked = this.liquidGlassParams.enableReflection;
            this.updateReflectionControlsVisibility(); // Initial visibility state
            this.reflectionToggle.addEventListener('change', (e) => {
                this.liquidGlassParams.enableReflection = e.target.checked;
                console.log(`Checkbox changed: enableReflection, New value: ${this.liquidGlassParams.enableReflection}`);
                this.updateReflectionControlsVisibility();
                this.renderCallback();
            });
        } else {
            console.warn("reflectionToggle element not found.");
        }
        this.setupSlider(this.reflectionArcDegreesSlider, this.reflectionArcDegreesValue, 'reflectionArcDegrees', 0, '°');
        this.setupSlider(this.reflectionThicknessSlider, this.reflectionThicknessValue, 'reflectionThickness', 0, 'px');
        this.setupSlider(this.reflectionOffsetSlider, this.reflectionOffsetValue, 'reflectionOffset', 0, 'px');
        this.setupSlider(this.reflectionOpacitySlider, this.reflectionOpacityValue, 'reflectionOpacity', 0, '%');
        this.setupSlider(this.reflectionArcPositionOffsetSlider, this.reflectionArcPositionOffsetValue, 'reflectionArcPositionOffset', 0, '°');
        
        // Image upload listener
        if (this.imageUpload) {
            if (!this.imageUpload.listenerAdded) { // Prevent multiple listeners if initialize is called more than once
                this.imageUpload.addEventListener('change', (event) => this.handleImageUpload(event));
                this.imageUpload.listenerAdded = true;
            }
        } else {
            console.warn("imageUpload element not found.");
        }
        console.log("UIControls initialization complete.");
        this.initializeTabs(); // Call tab initialization
    }

    updateChromaticAberrationAmountVisibility() {
        if (this.chromaticAberrationAmountControlGroup) {
            if (this.liquidGlassParams.enableChromaticAberration) {
                this.chromaticAberrationAmountControlGroup.style.maxHeight = '100px'; // Or enough to show content
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
        const controlGroups = [
            this.reflectionArcDegreesControlGroup,
            this.reflectionThicknessControlGroup,
            this.reflectionOffsetControlGroup,
            this.reflectionOpacityControlGroup,
            this.reflectionArcPositionOffsetControlGroup
        ];
        
        const sliders = [
            this.reflectionArcDegreesSlider,
            this.reflectionThicknessSlider,
            this.reflectionOffsetSlider,
            this.reflectionOpacitySlider,
            this.reflectionArcPositionOffsetSlider
        ];
        
        controlGroups.forEach((group, index) => {
            if (group && sliders[index]) {
                if (this.liquidGlassParams.enableReflection) {
                    group.style.maxHeight = '100px';
                    group.style.opacity = '1';
                    group.style.pointerEvents = 'auto';
                    sliders[index].disabled = false;
                } else {
                    group.style.maxHeight = '0';
                    group.style.opacity = '0';
                    group.style.pointerEvents = 'none';
                    sliders[index].disabled = true;
                }
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

        // Ensure the default active tab is shown (if not already handled by CSS)
        // This is redundant if CSS already sets the first tab-panel to display: block via .active
        // but good for robustness if CSS might change.
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
        } else {
            // Not all sliders have a dedicated value display (e.g., gridSpacingSlider)
            // console.warn(`Value display element for '${paramNameOrKey}' not found.`);
        }

        sliderElement.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            let actualValue;

            if (customSetter) {
                customSetter(value);
                actualValue = customGetter ? customGetter() : value; // Re-fetch if getter exists
            } else {
                this.liquidGlassParams[paramNameOrKey] = value;
                actualValue = value;
            }
            
            console.log(`Slider changed: ${paramNameOrKey}, New value: ${actualValue}`);

            if (valueElement) {
                valueElement.textContent = parseFloat(actualValue).toFixed(precision) + (unit || '');
            }
            this.renderCallback();
        });
    }

    getUIElements() {
        return {
            controlPanel: this.controlPanel,
            addImageIcon: this.addImageIcon,
            gridIcon: this.gridIcon,
            imageUpload: this.imageUpload
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
            if (event.target) { // Ensure event.target exists before trying to set its value
                event.target.value = null; 
            }
        }
    }
}
