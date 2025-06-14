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

        // Prevent saving over default presets (though IDs make this less likely for storage key)
        // This check is more about the user experience of "naming" a config.
        if (DEFAULT_PRESETS[name]) {
            // It's generally fine to have a user config with the same display name as a default preset,
            // as they will have different IDs.
            // However, if strict prevention is desired, this could be re-evaluated.
            // For now, we allow it, as IDs differentiate them.
        }

        const currentConfig = this.extractCurrentConfiguration();
        currentConfig.displayName = name; // Store the human-readable name
        currentConfig.id = `user_config_${Date.now()}`; // Generate unique ID

        const savedConfigs = this.getSavedConfigurations();
        
        savedConfigs[currentConfig.id] = currentConfig; // Save by ID
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(savedConfigs));
            
            // Log the saved configuration JSON
            console.log(`Saving configuration "${name}" with ID "${currentConfig.id}":`, JSON.stringify(currentConfig, null, 2));
            console.log(`Configuration "${name}" (ID: ${currentConfig.id}) saved successfully`);
            
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            return false;
        }
    }

    /**
     * Loads configuration from localStorage or default presets
     */
    loadConfiguration(nameOrId) {
        let config = null;
        let configDisplayName = nameOrId; // Default to nameOrId

        // Check if it's a default preset first (using its predefined name/key)
        if (DEFAULT_PRESETS.hasOwnProperty(nameOrId)) {
            config = DEFAULT_PRESETS[nameOrId];
            configDisplayName = config.displayName || nameOrId; // Use preset's displayName
            console.log(`Loading default preset "${configDisplayName}":`, JSON.stringify(config, null, 2));
        } else {
            // Check user saved configurations (using unique ID)
            const savedConfigs = this.getSavedConfigurations();
            config = savedConfigs[nameOrId]; // nameOrId here is the unique ID
            
            if (!config) {
                console.error(`Configuration with ID "${nameOrId}" not found`);
                return false;
            }
            configDisplayName = config.displayName || nameOrId; // Use user config's displayName
            console.log(`Loading user configuration "${configDisplayName}" (ID: "${nameOrId}"):`, JSON.stringify(config, null, 2));
        }

        this.animateToConfiguration(config);
        console.log(`Configuration "${configDisplayName}" loaded successfully`);
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
    deleteConfiguration(identifier) {
        if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
            console.error('Invalid configuration identifier provided for deletion');
            return false;
        }

        // Check if the identifier is a name/key of a default preset. Presets cannot be deleted.
        if (DEFAULT_PRESETS.hasOwnProperty(identifier)) {
            const presetDisplayName = DEFAULT_PRESETS[identifier].displayName || identifier;
            console.error(`Attempted to delete a default preset ("${presetDisplayName}"). Presets cannot be deleted.`);
            return false;
        }

        // If not a default preset name, assume 'identifier' is a unique ID for a user config
        const savedConfigs = this.getSavedConfigurations();
        
        if (!savedConfigs.hasOwnProperty(identifier)) {
            console.error(`User configuration with ID "${identifier}" not found for deletion.`);
            return false;
        }
        
        const displayName = savedConfigs[identifier].displayName || identifier; // Get displayName for logging
        delete savedConfigs[identifier];
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(savedConfigs));
            console.log(`User configuration "${displayName}" (ID: "${identifier}") deleted successfully`);
            return true;
        } catch (error) {
            console.error('Failed to delete user configuration:', error);
            return false;
        }
    }

    /**
     * Deletes all user configurations from localStorage.
     * This is a destructive operation.
     */
    deleteAllUserConfigurations() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('All user configurations have been deleted successfully.');
            // Optionally, clear the current state as well if a full reset is desired
            // localStorage.removeItem(this.currentStateKey);
            // console.log('Current auto-saved state has been cleared.');
            return true;
        } catch (error) {
            console.error('Failed to delete all user configurations:', error);
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
            // REMOVE Legacy reflection parameters
            // reflectionArcDegrees: this.liquidGlassParams.reflectionArcDegrees,
            // reflectionThickness: this.liquidGlassParams.reflectionThickness,
            // reflectionOffset: this.liquidGlassParams.reflectionOffset,
            // reflectionOpacity: this.liquidGlassParams.reflectionOpacity,
            // reflectionArcPositionOffset: this.liquidGlassParams.reflectionArcPositionOffset,

            // ADD New reflection parameters
            reflectionBorderThickness: this.liquidGlassParams.reflectionBorderThickness,
            reflectionBorderBlur: this.liquidGlassParams.reflectionBorderBlur,
            reflectionBorderOffset: this.liquidGlassParams.reflectionBorderOffset,
            reflectionStartAngle: this.liquidGlassParams.reflectionStartAngle,
            reflectionOverlayOpacity: this.liquidGlassParams.reflectionOverlayOpacity,
            reflectionHighlightSize: this.liquidGlassParams.reflectionHighlightSize,
            reflectionTransitionSize: this.liquidGlassParams.reflectionTransitionSize,
            
            // Grid
            showGrid: this.liquidGlassParams.showGrid,
            gridSpacing: this.liquidGlassParams.gridSpacing,
            
            // Metadata - 'savedAt' is fine.
            // 'id' and 'displayName' are NOT part of the core extractable parameters.
            // They are added during save for user configs, or are inherent in preset definitions.
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
            // Skip metadata properties like id, displayName, savedAt during interpolation
            if (key === 'savedAt' || key === 'id' || key === 'displayName') return; 
            
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
            // Skip metadata properties like id, displayName, savedAt when applying config
            if (key === 'savedAt' || key === 'id' || key === 'displayName') return; 
            
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
            // REMOVE Legacy reflection slider mappings
            // { param: 'reflectionArcDegrees', slider: 'reflectionArcDegreesSlider', value: 'reflectionArcDegreesValue', unit: '°' },
            // { param: 'reflectionThickness', slider: 'reflectionThicknessSlider', value: 'reflectionThicknessValue', unit: 'px' },
            // { param: 'reflectionOffset', slider: 'reflectionOffsetSlider', value: 'reflectionOffsetValue', unit: 'px' },
            // { param: 'reflectionOpacity', slider: 'reflectionOpacitySlider', value: 'reflectionOpacityValue', unit: '%' },
            // { param: 'reflectionArcPositionOffset', slider: 'reflectionArcPositionOffsetSlider', value: 'reflectionArcPositionOffsetValue', unit: '°' },
            
            // ADD New reflection slider mappings
            { param: 'reflectionBorderThickness', slider: 'reflectionBorderThicknessSlider', value: 'reflectionBorderThicknessValue', unit: 'px' },
            { param: 'reflectionBorderBlur', slider: 'reflectionBorderBlurSlider', value: 'reflectionBorderBlurValue', unit: 'px' }, // Assuming 1 decimal for blur
            { param: 'reflectionBorderOffset', slider: 'reflectionBorderOffsetSlider', value: 'reflectionBorderOffsetValue', unit: 'px' },
            { param: 'reflectionStartAngle', slider: 'reflectionStartAngleSlider', value: 'reflectionStartAngleValue', unit: '°' },
            { param: 'reflectionOverlayOpacity', slider: 'reflectionOverlayOpacitySlider', value: 'reflectionOverlayOpacityValue' }, // Assuming 2 decimals for opacity

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
                                    mapping.param.includes('Alpha') ? 2 : 
                                    mapping.param === 'reflectionBorderBlur' ? 1 : 0; // Added precision for blur
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

        // Update the noUiSlider for reflection gradient
        if (this.uiControls.gradientSlider && this.uiControls.gradientSlider.noUiSlider) {
            const hParam = currentConfig.reflectionHighlightSize; // This is h
            const tParam = currentConfig.reflectionTransitionSize; // This is t
            
            // Ensure values are consistent before setting slider
            if (hParam !== undefined && tParam !== undefined) { // Check if params exist
                let val2h = hParam * 2;
                let val4t = tParam * 4;

                if (val2h + val4t > 100) {
                    const scale = 100 / (val2h + val4t);
                    val2h *= scale;
                    val4t *= scale;
                }
                val2h = Math.min(val2h, 100);
                val4t = Math.min(val4t, 100 - val2h);

                const sliderVal1 = val2h;
                const sliderVal2 = val2h + val4t;

                this.uiControls.gradientSlider.noUiSlider.set([sliderVal1, sliderVal2]);
                
                const val2d = 100 - sliderVal2;
                if (this.uiControls.gradientHVal) this.uiControls.gradientHVal.textContent = val2h.toFixed(0);
                if (this.uiControls.gradientTVal) this.uiControls.gradientTVal.textContent = val4t.toFixed(0);
                if (this.uiControls.gradientDVal) this.uiControls.gradientDVal.textContent = val2d.toFixed(0);
            } else {
                // Handle case where highlight/transition size might be missing from an old config
                // Set slider to a default state, e.g., 0, 0 or a predefined default
                this.uiControls.gradientSlider.noUiSlider.set([0, 0]);
                if (this.uiControls.gradientHVal) this.uiControls.gradientHVal.textContent = '0';
                if (this.uiControls.gradientTVal) this.uiControls.gradientTVal.textContent = '0';
                if (this.uiControls.gradientDVal) this.uiControls.gradientDVal.textContent = '100';
            }
        }
    }

    /**
     * Original applyConfiguration method (kept for compatibility but now calls animated version)
     */
    applyConfiguration(config) {
        this.animateToConfiguration(config);
    }
}
