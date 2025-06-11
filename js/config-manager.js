/**
 * Configuration Save/Load Manager
 */

export class ConfigManager {
    constructor(liquidGlassParams, uiControls, backgroundImagesData) {
        this.liquidGlassParams = liquidGlassParams;
        this.uiControls = uiControls;
        this.backgroundImagesData = backgroundImagesData;
        this.storageKey = 'liquidGlassConfigs';
    }

    /**
     * Saves current configuration to localStorage
     */
    saveConfiguration(name) {
        const config = this.extractCurrentConfiguration();
        const savedConfigs = this.getSavedConfigurations();
        
        savedConfigs[name] = {
            ...config,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(savedConfigs));
        console.log(`Configuration "${name}" saved successfully`);
    }

    /**
     * Loads configuration from localStorage
     */
    loadConfiguration(name) {
        const savedConfigs = this.getSavedConfigurations();
        const config = savedConfigs[name];
        
        if (!config) {
            console.error(`Configuration "${name}" not found`);
            return false;
        }

        this.applyConfiguration(config);
        console.log(`Configuration "${name}" loaded successfully`);
        return true;
    }

    /**
     * Deletes a saved configuration
     */
    deleteConfiguration(name) {
        const savedConfigs = this.getSavedConfigurations();
        
        if (savedConfigs[name]) {
            delete savedConfigs[name];
            localStorage.setItem(this.storageKey, JSON.stringify(savedConfigs));
            console.log(`Configuration "${name}" deleted successfully`);
            return true;
        }
        
        return false;
    }

    /**
     * Gets all saved configurations
     */
    getSavedConfigurations() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error reading saved configurations:', error);
            return {};
        }
    }

    /**
     * Extracts current configuration from liquidGlassParams
     */
    extractCurrentConfiguration() {
        return {
            // Shape parameters
            rectangleWidth: this.liquidGlassParams.rectangleWidth,
            rectangleHeight: this.liquidGlassParams.rectangleHeight,
            rectangleCornerRadius: this.liquidGlassParams.rectangleCornerRadius,
            
            // Refraction parameters
            edgeDistortionThickness: this.liquidGlassParams.edgeDistortionThickness,
            refractionStrength: this.liquidGlassParams.refractionStrength,
            glassBaseColor: [...this.liquidGlassParams.glassBaseColor],
            frostiness: this.liquidGlassParams.frostiness,
            
            // Chromatic aberration
            enableChromaticAberration: this.liquidGlassParams.enableChromaticAberration,
            chromaticAberrationAmount: this.liquidGlassParams.chromaticAberrationAmount,
            
            // Effects
            topShadowBlur: this.liquidGlassParams.topShadowBlur,
            topShadowOffsetX: this.liquidGlassParams.topShadowOffsetX,
            topShadowOffsetY: this.liquidGlassParams.topShadowOffsetY,
            topShadowOpacity: this.liquidGlassParams.topShadowOpacity,
            
            bottomGlowBlur: this.liquidGlassParams.bottomGlowBlur,
            bottomGlowOffsetX: this.liquidGlassParams.bottomGlowOffsetX,
            bottomGlowOffsetY: this.liquidGlassParams.bottomGlowOffsetY,
            bottomGlowOpacity: this.liquidGlassParams.bottomGlowOpacity,
            
            // Reflections
            enableReflection: this.liquidGlassParams.enableReflection,
            reflectionArcDegrees: this.liquidGlassParams.reflectionArcDegrees,
            reflectionThickness: this.liquidGlassParams.reflectionThickness,
            reflectionOffset: this.liquidGlassParams.reflectionOffset,
            reflectionOpacity: this.liquidGlassParams.reflectionOpacity,
            reflectionArcPositionOffset: this.liquidGlassParams.reflectionArcPositionOffset,
            
            // Grid
            showGrid: this.liquidGlassParams.showGrid,
            gridSpacing: this.liquidGlassParams.gridSpacing
        };
    }

    /**
     * Applies configuration to liquidGlassParams and updates UI
     */
    applyConfiguration(config) {
        // Apply to liquidGlassParams
        Object.keys(config).forEach(key => {
            if (key === 'savedAt') return; // Skip metadata
            
            if (key === 'glassBaseColor') {
                this.liquidGlassParams[key] = [...config[key]];
            } else {
                this.liquidGlassParams[key] = config[key];
            }
        });

        // Update UI controls to reflect new values
        this.updateUIControls(config);
        
        // Trigger render
        if (this.uiControls.renderCallback) {
            this.uiControls.renderCallback();
        }
    }

    /**
     * Updates UI control elements to reflect loaded configuration
     */
    updateUIControls(config) {
        // Update sliders and their value displays
        const controlMappings = [
            { param: 'rectangleWidth', slider: 'rectWidthSlider', value: 'rectWidthValue', unit: 'px' },
            { param: 'rectangleHeight', slider: 'rectHeightSlider', value: 'rectHeightValue', unit: 'px' },
            { param: 'rectangleCornerRadius', slider: 'rectCornerRadiusSlider', value: 'rectCornerRadiusValue', unit: 'px' },
            { param: 'edgeDistortionThickness', slider: 'innerRadiusFactorSlider', value: 'innerRadiusFactorValue', unit: 'px' },
            { param: 'refractionStrength', slider: 'refractionStrengthSlider', value: 'refractionStrengthValue' },
            { param: 'frostiness', slider: 'frostinessSlider', value: 'frostinessValue' },
            { param: 'chromaticAberrationAmount', slider: 'chromaticAberrationSlider', value: 'chromaticAberrationValue' },
            { param: 'topShadowBlur', slider: 'topShadowBlurSlider', value: 'topShadowBlurValue', unit: 'px' },
            { param: 'topShadowOffsetX', slider: 'topShadowOffsetXSlider', value: 'topShadowOffsetXValue', unit: 'px' },
            { param: 'topShadowOffsetY', slider: 'topShadowOffsetYSlider', value: 'topShadowOffsetYValue', unit: 'px' },
            { param: 'topShadowOpacity', slider: 'topShadowOpacitySlider', value: 'topShadowOpacityValue' },
            { param: 'bottomGlowBlur', slider: 'bottomGlowBlurSlider', value: 'bottomGlowBlurValue', unit: 'px' },
            { param: 'bottomGlowOffsetX', slider: 'bottomGlowOffsetXSlider', value: 'bottomGlowOffsetXValue', unit: 'px' },
            { param: 'bottomGlowOffsetY', slider: 'bottomGlowOffsetYSlider', value: 'bottomGlowOffsetYValue', unit: 'px' },
            { param: 'bottomGlowOpacity', slider: 'bottomGlowOpacitySlider', value: 'bottomGlowOpacityValue' },
            { param: 'reflectionArcDegrees', slider: 'reflectionArcDegreesSlider', value: 'reflectionArcDegreesValue', unit: '°' },
            { param: 'reflectionThickness', slider: 'reflectionThicknessSlider', value: 'reflectionThicknessValue', unit: 'px' },
            { param: 'reflectionOffset', slider: 'reflectionOffsetSlider', value: 'reflectionOffsetValue', unit: 'px' },
            { param: 'reflectionOpacity', slider: 'reflectionOpacitySlider', value: 'reflectionOpacityValue', unit: '%' },
            { param: 'reflectionArcPositionOffset', slider: 'reflectionArcPositionOffsetSlider', value: 'reflectionArcPositionOffsetValue', unit: '°' },
            { param: 'gridSpacing', slider: 'gridSpacingSlider', value: null }
        ];

        controlMappings.forEach(mapping => {
            const sliderElement = this.uiControls[mapping.slider];
            const valueElement = this.uiControls[mapping.value];
            const value = config[mapping.param];

            if (sliderElement && value !== undefined) {
                sliderElement.value = value;
                
                if (valueElement) {
                    const precision = mapping.param.includes('Opacity') || mapping.param === 'frostiness' ? 2 : 
                                    mapping.param.includes('Alpha') ? 2 : 0;
                    valueElement.textContent = parseFloat(value).toFixed(precision) + (mapping.unit || '');
                }
            }
        });

        // Update glass alpha slider (special case)
        if (config.glassBaseColor && this.uiControls.glassAlphaSlider) {
            this.uiControls.glassAlphaSlider.value = config.glassBaseColor[3];
            if (this.uiControls.glassAlphaValue) {
                this.uiControls.glassAlphaValue.textContent = parseFloat(config.glassBaseColor[3]).toFixed(2);
            }
        }

        // Update toggles
        if (this.uiControls.chromaticAberrationToggle) {
            this.uiControls.chromaticAberrationToggle.checked = config.enableChromaticAberration;
            this.uiControls.updateChromaticAberrationAmountVisibility();
        }

        if (this.uiControls.reflectionToggle) {
            this.uiControls.reflectionToggle.checked = config.enableReflection;
            this.uiControls.updateReflectionControlsVisibility();
        }

        if (this.uiControls.gridToggle) {
            this.uiControls.gridToggle.checked = config.showGrid;
        }
    }
}
