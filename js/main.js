/**
 * Liquid Glass Effect Implementation - Main Entry Point
 */

import { vertexShaderSource, fragmentShaderSource } from './shaders.js';
import { compileShader, createProgram, getUniformLocations, initializeBackgroundImageTextures } from './webgl-utils.js';
import { UIControls } from './ui-controls.js';
import { InteractionHandler } from './interaction-handler.js';

const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

class LiquidGlassApp {
    constructor() {
        this.gl = gl;
        this.canvas = canvas;
        
        // Initialize parameters
        this.liquidGlassParams = {
            rectangleWidth: 300,
            rectangleHeight: 200,
            rectangleCornerRadius: 30,
            edgeDistortionThickness: 30,
            refractionStrength: 25.0,
            gridSpacing: 25.0,
            glassBaseColor: [250/255, 250/255, 255/255, 0.1],
            frostiness: 1.0,
            showGrid: true
        };
        
        this.backgroundImagesData = [];
        this.positions = this.initializePositions();
        this.constants = this.initializeConstants();
        
        this.program = null;
        this.uniformLocations = null;
        this.positionBuffer = null;
        this.uiControls = null;
        this.interactionHandler = null;
    }

    initializePositions() {
        return {
            liquidGlassCenterPosition: { x: 0, y: 0 },
            controlPanelPosition: { x: 0, y: 0 },
            controlPanelSize: { x: 340, y: 500 },
            addImageButtonPosition: { x: 100, y: 100 },
            addImageButtonSize: { x: 50, y: 50 },
            gridControlsPosition: { x: 200, y: 100 },
            gridControlsSize: { x: 280, y: 50 }
        };
    }

    initializeConstants() {
        return {
            controlPanelCornerRadius: 20,
            controlPanelDistortionThickness: 15,
            addImageButtonCornerRadius: 25,
            addImageButtonDistortionThickness: 8,
            gridControlsCornerRadius: 25,
            gridControlsDistortionThickness: 8,
            gridLineColorVal: [0, 0, 0, 0.15],
            pageBackgroundColorVal: [221/255, 225/255, 231/255, 1.0]
        };
    }

    initialize() {
        this.setupWebGL();
        this.setupUI();
        this.setupEventHandlers();
        this.resizeCanvas();
    }

    setupWebGL() {
        // Compile shaders and create program
        const vertexShader = compileShader(this.gl, vertexShaderSource, this.gl.VERTEX_SHADER);
        const fragmentShader = compileShader(this.gl, fragmentShaderSource, this.gl.FRAGMENT_SHADER);
        this.program = createProgram(this.gl, vertexShader, fragmentShader);
        
        // Get uniform locations
        this.uniformLocations = getUniformLocations(this.gl, this.program);
        initializeBackgroundImageTextures(this.gl, this.uniformLocations, this.program);
        
        // Create position buffer
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), this.gl.STATIC_DRAW);
    }

    setupUI() {
        this.uiControls = new UIControls(
            this.liquidGlassParams,
            this.backgroundImagesData,
            () => this.render()
        );
        this.uiControls.initialize();
    }

    setupEventHandlers() {
        this.interactionHandler = new InteractionHandler(
            this.canvas,
            this.liquidGlassParams,
            this.positions,
            this.uiControls.getUIElements(),
            () => this.render()
        );
        this.interactionHandler.initialize();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Update positions
        this.positions.liquidGlassCenterPosition.x = this.canvas.width / 2;
        this.positions.liquidGlassCenterPosition.y = this.canvas.height / 2;
        
        this.positions.addImageButtonPosition.x = 50 + this.positions.addImageButtonSize.x * 0.5;
        this.positions.addImageButtonPosition.y = 50 + this.positions.addImageButtonSize.y * 0.5;
        
        const gapBetweenElements = 20;
        this.positions.gridControlsPosition.x = this.positions.addImageButtonPosition.x + this.positions.addImageButtonSize.x * 0.5 + gapBetweenElements + this.positions.gridControlsSize.x * 0.5;
        this.positions.gridControlsPosition.y = this.positions.addImageButtonPosition.y;
        
        this.updateElementPositions();
        this.render();
    }

    updateElementPositions() {
        // Update control panel position from HTML
        const htmlPaneRect = this.uiControls.getUIElements().controlPanel.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.positions.controlPanelSize.x = htmlPaneRect.width;
        this.positions.controlPanelSize.y = htmlPaneRect.height;
        this.positions.controlPanelPosition.x = (htmlPaneRect.left - canvasRect.left) + this.positions.controlPanelSize.x * 0.5;
        this.positions.controlPanelPosition.y = this.canvas.height - (htmlPaneRect.top - canvasRect.top) - this.positions.controlPanelSize.y * 0.5;
        
        // Update icon positions
        this.updateIconPositions();
    }

    updateIconPositions() {
        const uiElements = this.uiControls.getUIElements();
        
        // Add image icon
        const iconLeft = this.positions.addImageButtonPosition.x - 12;
        const iconTop = this.canvas.height - this.positions.addImageButtonPosition.y - 12;
        if (uiElements.addImageIcon) {
            uiElements.addImageIcon.style.left = `${iconLeft}px`;
            uiElements.addImageIcon.style.top = `${iconTop}px`;
        }
        
        // Grid icon
        const gridIconLeft = this.positions.gridControlsPosition.x - this.positions.gridControlsSize.x * 0.5 + 20;
        const gridIconTop = this.canvas.height - this.positions.gridControlsPosition.y - 10;
        if (uiElements.gridIcon) {
            uiElements.gridIcon.style.left = `${gridIconLeft}px`;
            uiElements.gridIcon.style.top = `${gridIconTop}px`;
        }
    }

    render() {
        if (!this.gl || !this.program) return;

        this.gl.clearColor(...this.constants.pageBackgroundColorVal);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(this.uniformLocations.position);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(this.uniformLocations.position, 2, this.gl.FLOAT, false, 0, 0);

        this.setUniforms();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    setUniforms() {
        const gl = this.gl;
        const u = this.uniformLocations;
        
        // Basic scene uniforms
        gl.uniform2f(u.resolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(u.liquidGlassCenter, this.positions.liquidGlassCenterPosition.x, this.positions.liquidGlassCenterPosition.y);
        gl.uniform1f(u.refractionStrength, this.liquidGlassParams.refractionStrength);
        gl.uniform4fv(u.gridLineColor, this.constants.gridLineColorVal);
        gl.uniform1f(u.gridSpacing, this.liquidGlassParams.gridSpacing);
        gl.uniform4fv(u.pageBackgroundColor, this.constants.pageBackgroundColorVal);
        gl.uniform4fv(u.glassBaseColor, this.liquidGlassParams.glassBaseColor);
        gl.uniform1f(u.frostiness, this.liquidGlassParams.frostiness);
        gl.uniform1i(u.showGrid, this.liquidGlassParams.showGrid);
        gl.uniform1i(u.hasBackgroundImages, this.backgroundImagesData.length > 0);
        gl.uniform1i(u.backgroundImageCount, this.backgroundImagesData.length);

        // Control panel uniforms
        gl.uniform2f(u.controlPanelCenter, this.positions.controlPanelPosition.x, this.positions.controlPanelPosition.y);
        gl.uniform2f(u.controlPanelSize, this.positions.controlPanelSize.x, this.positions.controlPanelSize.y);
        gl.uniform1f(u.controlPanelCornerRadius, this.constants.controlPanelCornerRadius);
        gl.uniform1f(u.controlPanelDistortionThickness, this.constants.controlPanelDistortionThickness);

        // Add image button uniforms
        gl.uniform2f(u.addImageButtonCenter, this.positions.addImageButtonPosition.x, this.positions.addImageButtonPosition.y);
        gl.uniform2f(u.addImageButtonSize, this.positions.addImageButtonSize.x, this.positions.addImageButtonSize.y);
        gl.uniform1f(u.addImageButtonCornerRadius, this.constants.addImageButtonCornerRadius);
        gl.uniform1f(u.addImageButtonDistortionThickness, this.constants.addImageButtonDistortionThickness);

        // Grid controls panel uniforms
        gl.uniform2f(u.gridControlsCenter, this.positions.gridControlsPosition.x, this.positions.gridControlsPosition.y);
        gl.uniform2f(u.gridControlsSize, this.positions.gridControlsSize.x, this.positions.gridControlsSize.y);
        gl.uniform1f(u.gridControlsCornerRadius, this.constants.gridControlsCornerRadius);
        gl.uniform1f(u.gridControlsDistortionThickness, this.constants.gridControlsDistortionThickness);

        // Main liquid glass shape uniforms
        gl.uniform2f(u.rectangleSize, this.liquidGlassParams.rectangleWidth, this.liquidGlassParams.rectangleHeight);
        gl.uniform1f(u.rectangleCornerRadius, this.liquidGlassParams.rectangleCornerRadius);
        
        const characteristicDimension = Math.min(this.liquidGlassParams.rectangleWidth, this.liquidGlassParams.rectangleHeight) * 0.5;
        const maxThickness = characteristicDimension - 5;
        const validatedThickness = Math.min(this.liquidGlassParams.edgeDistortionThickness, Math.max(0, maxThickness));
        gl.uniform1f(u.edgeDistortionThickness, validatedThickness);
    }
}

if (!gl) {
    alert('WebGL not supported. Please use a browser that supports WebGL.');
} else {
    const app = new LiquidGlassApp();
    app.initialize();
}
