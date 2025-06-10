/**
 * UI Controls and Event Handling
 */

export class UIControls {
    constructor(liquidGlassParams, backgroundImagesData, renderCallback) {
        this.liquidGlassParams = liquidGlassParams;
        this.backgroundImagesData = backgroundImagesData;
        this.renderCallback = renderCallback;
        
        this.uiElements = {
            rectangleWidthControl: { slider: document.getElementById('rectWidthSlider'), valueDisplay: document.getElementById('rectWidthValue') },
            rectangleHeightControl: { slider: document.getElementById('rectHeightSlider'), valueDisplay: document.getElementById('rectHeightValue') },
            rectangleCornerRadiusControl: { slider: document.getElementById('rectCornerRadiusSlider'), valueDisplay: document.getElementById('rectCornerRadiusValue') },
            edgeDistortionThicknessControl: { slider: document.getElementById('innerRadiusFactorSlider'), valueDisplay: document.getElementById('innerRadiusFactorValue') },
            refractionStrengthControl: { slider: document.getElementById('refractionStrengthSlider'), valueDisplay: document.getElementById('refractionStrengthValue') },
            glassAlphaControl: { slider: document.getElementById('glassAlphaSlider'), valueDisplay: document.getElementById('glassAlphaValue') },
            frostinessControl: { slider: document.getElementById('frostinessSlider'), valueDisplay: document.getElementById('frostinessValue') },
            gridToggle: document.getElementById('gridToggle'),
            gridSpacingSlider: document.getElementById('gridSpacingSlider'),
            backgroundImageUpload: document.getElementById('imageUpload'),
            controlPanel: document.getElementById('controls-pane'),
            controlPanelTitle: document.getElementById('controls-title'),
            gridControlsPanel: document.getElementById('grid-controls-panel'),
            addImageIcon: document.getElementById('add-image-icon'),
            gridIcon: document.getElementById('grid-icon')
        };
    }

    initialize() {
        this.initializeParameterControls();
        this.initializeSpecialControls();
        this.initializeImageUpload();
    }

    initializeParameterControls() {
        const parameterMappings = [
            { key: 'rectangleWidth', paramName: 'rectangleWidth' },
            { key: 'rectangleHeight', paramName: 'rectangleHeight' },
            { key: 'rectangleCornerRadius', paramName: 'rectangleCornerRadius' },
            { key: 'edgeDistortionThickness', paramName: 'edgeDistortionThickness' },
            { key: 'refractionStrength', paramName: 'refractionStrength' },
            { key: 'frostiness', paramName: 'frostiness' }
        ];

        parameterMappings.forEach(mapping => {
            const controlKey = mapping.key + 'Control';
            if (!this.uiElements[controlKey] || !this.uiElements[controlKey].slider) {
                console.warn(`Control not found: ${controlKey}`);
                return;
            }

            this.uiElements[controlKey].slider.value = this.liquidGlassParams[mapping.paramName];
            this.uiElements[controlKey].valueDisplay.textContent = this.liquidGlassParams[mapping.paramName];
            this.uiElements[controlKey].slider.addEventListener('input', (e) => {
                this.liquidGlassParams[mapping.paramName] = parseFloat(e.target.value);
                this.uiElements[controlKey].valueDisplay.textContent = this.liquidGlassParams[mapping.paramName];
                this.renderCallback();
            });
        });
    }

    initializeSpecialControls() {
        // Glass alpha control
        if (this.uiElements.glassAlphaControl && this.uiElements.glassAlphaControl.slider) {
            this.uiElements.glassAlphaControl.slider.value = this.liquidGlassParams.glassBaseColor[3];
            this.uiElements.glassAlphaControl.valueDisplay.textContent = this.liquidGlassParams.glassBaseColor[3].toFixed(2);
            this.uiElements.glassAlphaControl.slider.addEventListener('input', (e) => {
                this.liquidGlassParams.glassBaseColor[3] = parseFloat(e.target.value);
                this.uiElements.glassAlphaControl.valueDisplay.textContent = this.liquidGlassParams.glassBaseColor[3].toFixed(2);
                this.renderCallback();
            });
        }

        // Grid toggle
        if (this.uiElements.gridToggle) {
            this.uiElements.gridToggle.checked = this.liquidGlassParams.showGrid;
            this.uiElements.gridToggle.addEventListener('change', (e) => {
                this.liquidGlassParams.showGrid = e.target.checked;
                this.renderCallback();
            });
        }

        // Grid spacing slider
        if (this.uiElements.gridSpacingSlider) {
            this.uiElements.gridSpacingSlider.value = this.liquidGlassParams.gridSpacing;
            this.uiElements.gridSpacingSlider.addEventListener('input', (e) => {
                this.liquidGlassParams.gridSpacing = parseFloat(e.target.value);
                this.renderCallback();
            });
        }
    }

    initializeImageUpload() {
        if (this.uiElements.backgroundImageUpload) {
            this.uiElements.backgroundImageUpload.addEventListener('change', (event) => {
                this.handleBackgroundImageUpload(event);
            });
        }
    }

    handleBackgroundImageUpload(event) {
        const file = event.target.files[0];
        if (!file || this.backgroundImagesData.length >= 8) return;

        const img = new Image();
        img.onload = () => {
            // Create WebGL texture - this will need to be handled by the main app
            const aspectRatio = img.width / img.height;
            const backgroundImageData = {
                image: img, // Store image for texture creation
                position: { x: 100 + this.backgroundImagesData.length * 50, y: 100 + this.backgroundImagesData.length * 50 },
                size: { x: 300, y: 300 / aspectRatio }
            };
            
            this.backgroundImagesData.push(backgroundImageData);
            this.renderCallback();
        };
        img.src = URL.createObjectURL(file);
        
        event.target.value = '';
    }

    getUIElements() {
        return this.uiElements;
    }
}
