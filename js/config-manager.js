/**
 * Configuration Save/Load Manager
 */

export class ConfigManager {
    constructor(liquidGlassParams, uiControls, backgroundImagesData) {
        this.liquidGlassParams = liquidGlassParams;
        this.uiControls = uiControls;
        this.backgroundImagesData = backgroundImagesData;
        this.storageKey = 'liquidGlassConfigs';
        this.isAnimating = false;
        this.animationFrameId = null;
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
     * Loads configuration from localStorage with smooth animation
     */
    loadConfiguration(name) {
        const savedConfigs = this.getSavedConfigurations();
        const config = savedConfigs[name];
        
        if (!config) {
            console.error(`Configuration "${name}" not found`);
            return false;
        }

        this.animateToConfiguration(config);
        console.log(`Configuration "${name}" loaded successfully`);
        return true;
    }

    /**
     * Animates from current values to target configuration values
     */
    animateToConfiguration(targetConfig) {
        if (this.isAnimating) {
            // Cancel any existing animation
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
        }

        this.isAnimating = true;
        const startTime = performance.now();
        const duration = 1000; // 1 second

        // Capture current values as starting points
        const startValues = this.extractCurrentConfiguration();

        // Define easing function (ease-in-out cubic)
        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);

            // Interpolate all values
            this.interpolateValues(startValues, targetConfig, easedProgress);

            // Update UI controls to reflect current animated values
            this.updateUIControlsImmediate();

            // Trigger render
            if (this.uiControls.renderCallback) {
                this.uiControls.renderCallback();
            }

            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                // Animation complete
                this.isAnimating = false;
                this.animationFrameId = null;
                
                // Ensure final values are exactly the target values
                this.applyConfigurationImmediate(targetConfig);
                this.updateUIControlsImmediate();
                
                if (this.uiControls.renderCallback) {
                    this.uiControls.renderCallback();
                }
            }
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Interpolates between start and target values based on progress
     */
    interpolateValues(startValues, targetValues, progress) {
        Object.keys(targetValues).forEach(key => {
            if (key === 'savedAt') return; // Skip metadata
            
            const startValue = startValues[key];
            const targetValue = targetValues[key];

            if (key === 'glassBaseColor') {
                // Handle array interpolation
                for (let i = 0; i < startValue.length; i++) {
                    this.liquidGlassParams[key][i] = startValue[i] + (targetValue[i] - startValue[i]) * progress;
                }
            } else if (typeof startValue === 'number' && typeof targetValue === 'number') {
                // Interpolate numeric values
                this.liquidGlassParams[key] = startValue + (targetValue - startValue) * progress;
            } else if (typeof startValue === 'boolean' && typeof targetValue === 'boolean') {
                // For boolean values, switch at 50% progress
                this.liquidGlassParams[key] = progress < 0.5 ? startValue : targetValue;
            } else {
                // For other types, just set the target value
                this.liquidGlassParams[key] = targetValue;
            }
        });
    }

    /**
     * Applies configuration immediately without animation (for final step)
     */
    applyConfigurationImmediate(config) {
        Object.keys(config).forEach(key => {
            if (key === 'savedAt') return; // Skip metadata
            
            if (key === 'glassBaseColor') {
                this.liquidGlassParams[key] = [...config[key]];
            } else {
                this.liquidGlassParams[key] = config[key];
            }
        });
    }

    /**
     * Updates UI controls immediately without the standard delay/transition
     */
    updateUIControlsImmediate() {
        const currentConfig = this.extractCurrentConfiguration();
        
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
            const value = currentConfig[mapping.param];

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
        if (currentConfig.glassBaseColor && this.uiControls.glassAlphaSlider) {
            this.uiControls.glassAlphaSlider.value = currentConfig.glassBaseColor[3];
            if (this.uiControls.glassAlphaValue) {
                this.uiControls.glassAlphaValue.textContent = parseFloat(currentConfig.glassBaseColor[3]).toFixed(2);
            }
        }

        // Update toggles (these should change immediately, not animate)
        if (this.uiControls.chromaticAberrationToggle) {
            this.uiControls.chromaticAberrationToggle.checked = currentConfig.enableChromaticAberration;
            this.uiControls.updateChromaticAberrationAmountVisibility();
        }

        if (this.uiControls.reflectionToggle) {
            this.uiControls.reflectionToggle.checked = currentConfig.enableReflection;
            this.uiControls.updateReflectionControlsVisibility();
        }

        if (this.uiControls.gridToggle) {
            this.uiControls.gridToggle.checked = currentConfig.showGrid;
        }
    }

    /**
     * Original applyConfiguration method (kept for compatibility but now calls animated version)
     */
    applyConfiguration(config) {
        this.animateToConfiguration(config);
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
