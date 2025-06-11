import { DEFAULT_PRESETS, DEFAULT_PRESET_NAME } from './presets.js';

/**
 * Configuration Save/Load Manager
 */

export class ConfigManager {
    constructor(liquidGlassParams, uiControls, backgroundImagesData) {
        this.liquidGlassParams = liquidGlassParams;
        this.uiControls = uiControls;
        this.backgroundImagesData = backgroundImagesData;
        this.storageKey = 'liquidGlassConfigs';
        this.currentStateKey = 'liquidGlassCurrentState';
        this.isAnimating = false;
        this.animationFrameId = null;
    }

    /**
     * Initializes configuration system and loads saved state or default preset
     */
    initialize() {
        const savedState = this.getCurrentState();
        if (savedState) {
            console.log('Loading saved current state:', JSON.stringify(savedState, null, 2));
            this.animateToConfiguration(savedState);
        } else {
            console.log('No saved state found, loading default preset:', DEFAULT_PRESET_NAME);
            this.loadDefaultPreset(DEFAULT_PRESET_NAME);
        }
    }

    /**
     * Saves current configuration to localStorage
     */
    saveConfiguration(name) {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.error('Invalid configuration name provided');
            return false;
        }

        // Prevent saving over default presets
        if (DEFAULT_PRESETS[name]) {
            alert('Cannot overwrite built-in presets. Please choose a different name.');
            return false;
        }

        const currentConfig = this.extractCurrentConfiguration();
        const savedConfigs = this.getSavedConfigurations();
        
        savedConfigs[name] = currentConfig;
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(savedConfigs));
            
            // Log the saved configuration JSON
            console.log(`Saving configuration "${name}":`, JSON.stringify(currentConfig, null, 2));
            console.log(`Configuration "${name}" saved successfully`);
            
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            return false;
        }
    }

    /**
     * Loads configuration from localStorage or default presets
     */
    loadConfiguration(name) {
        let config = null;

        // Check if it's a default preset first
        if (DEFAULT_PRESETS[name]) {
            config = DEFAULT_PRESETS[name];
            console.log(`Loading default preset "${name}":`, JSON.stringify(config, null, 2));
        } else {
            // Check user saved configurations
            const savedConfigs = this.getSavedConfigurations();
            config = savedConfigs[name];
            
            if (!config) {
                console.error(`Configuration "${name}" not found`);
                return false;
            }
            console.log(`Loading user configuration "${name}":`, JSON.stringify(config, null, 2));
        }

        this.animateToConfiguration(config);
        console.log(`Configuration "${name}" loaded successfully`);
        return true;
    }

    /**
     * Loads a default preset
     */
    loadDefaultPreset(presetName) {
        if (!DEFAULT_PRESETS[presetName]) {
            console.error(`Default preset "${presetName}" not found`);
            return false;
        }

        const config = DEFAULT_PRESETS[presetName];
        console.log(`Loading default preset "${presetName}":`, JSON.stringify(config, null, 2));
        this.animateToConfiguration(config);
        return true;
    }

    /**
     * Saves current state automatically (called on parameter changes)
     */
    saveCurrentState() {
        const currentConfig = this.extractCurrentConfiguration();
        try {
            localStorage.setItem(this.currentStateKey, JSON.stringify(currentConfig));
        } catch (error) {
            console.error('Failed to save current state:', error);
        }
    }

    /**
     * Gets the current saved state
     */
    getCurrentState() {
        try {
            const saved = localStorage.getItem(this.currentStateKey);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Failed to load current state:', error);
            return null;
        }
    }

    /**
     * Deletes a user configuration from localStorage (cannot delete presets)
     */
    deleteConfiguration(name) {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.error('Invalid configuration name provided');
            return false;
        }

        // Prevent deleting default presets
        if (DEFAULT_PRESETS[name]) {
            console.error('Cannot delete built-in presets');
            return false;
        }

        const savedConfigs = this.getSavedConfigurations();
        
        if (!(name in savedConfigs)) {
            console.error(`Configuration "${name}" not found`);
            return false;
        }

        delete savedConfigs[name];
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(savedConfigs));
            console.log(`Configuration "${name}" deleted successfully`);
            return true;
        } catch (error) {
            console.error('Failed to delete configuration:', error);
            return false;
        }
    }

    /**
     * Gets all configurations (default presets + user saved)
     */
    getAllConfigurations() {
        const userConfigs = this.getSavedConfigurations();
        return {
            presets: DEFAULT_PRESETS,
            userConfigs: userConfigs
        };
    }

    /**
     * Gets only user saved configurations from localStorage
     */
    getSavedConfigurations() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load saved configurations:', error);
            return {};
        }
    }

    /**
     * Extracts current configuration from liquidGlassParams
     */
    extractCurrentConfiguration() {
        return {
            // Main shape properties
            rectangleWidth: this.liquidGlassParams.rectangleWidth,
            rectangleHeight: this.liquidGlassParams.rectangleHeight,
            rectangleCornerRadius: this.liquidGlassParams.rectangleCornerRadius,
            edgeDistortionThickness: this.liquidGlassParams.edgeDistortionThickness,
            
            // Glass material properties
            refractionStrength: this.liquidGlassParams.refractionStrength,
            glassBaseColor: [...this.liquidGlassParams.glassBaseColor], // Copy array
            frostiness: this.liquidGlassParams.frostiness,
            
            // Chromatic aberration
            enableChromaticAberration: this.liquidGlassParams.enableChromaticAberration,
            chromaticAberrationAmount: this.liquidGlassParams.chromaticAberrationAmount,
            
            // Inner shadows and glows
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
            gridSpacing: this.liquidGlassParams.gridSpacing,
            
            // Metadata
            savedAt: Date.now()
        };
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
}
