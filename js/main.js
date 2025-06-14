/**
 * Liquid Glass Effect Implementation - Main Entry Point
 */

import { vertexShaderSource, fragmentShaderSource } from './shaders.js';
import { compileShader, createProgram, getUniformLocations, initializeBackgroundImageTextures } from './webgl-utils.js';
import { UIControls } from './ui-controls.js';
import { InteractionHandler } from './interaction-handler.js';
import ReflectionBorder from './reflections.js';     // ← NEW

const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

class LiquidGlassApp {
    constructor() {
        this.gl = gl;
        this.canvas = canvas;
        
        // Initialize parameters with "Thick oval" preset values
        this.liquidGlassParams = {
            rectangleWidth: 333,
            rectangleHeight: 195,
            rectangleCornerRadius: 144,
            edgeDistortionThickness: 29,
            refractionStrength: 47.0,
            gridSpacing: 25.0,
            glassBaseColor: [0.9803921568627451, 0.9803921568627451, 1, 0.1],
            frostiness: 1.0,
            showGrid: false,
            
            // Top Shadow
            topShadowBlur: 60.0,
            topShadowOffsetX: -14.0,
            topShadowOffsetY: 21.0,
            topShadowOpacity: 0.5,

            // Bottom Glow
            bottomGlowBlur: 30.0,
            bottomGlowOffsetX: 31.0,
            bottomGlowOffsetY: -15.0,
            bottomGlowOpacity: 0.3,

            // Chromatic Aberration
            enableChromaticAberration: true,
            chromaticAberrationAmount: 9.1,

            // Reflection
            enableReflection: false,
            // Removed legacy arc-based reflection params
            // reflectionArcDegrees: 120.0,
            // reflectionThickness: 20.0,
            // reflectionOpacity: 40.0,
            // reflectionArcPositionOffset: 0.0,
            // reflectionOffset: 5.0


            // ─── NEW BORDER-REFLECTION PARAMETERS ───
            reflectionBorderThickness: 8,   // px
            reflectionBorderBlur:       4,  // px (0-10)
            reflectionBorderOffset:     6,  // px   inside shape
            reflectionStartAngle:       0,  // deg (0-360)

            // Removed individual reflectionStop1-7, as they are derived
            // gradient stop positions (percent 0-100)
            // reflectionStop1: 0, // Removed
            // reflectionStop2: 10, // Removed
            // reflectionStop3: 40, // Removed
            // reflectionStop4: 50, // Removed
            // reflectionStop5: 60, // Removed
            // reflectionStop6: 90, // Removed
            // reflectionStop7: 100, // Removed

            // NEW PARAMETERS FOR REFLECTION OVERLAY
            reflectionOverlayOpacity: 0.8,
            reflectionHighlightSize:  10, // This is 'h'
            reflectionTransitionSize: 15  // This is 't'
        };
        
        this.backgroundImagesData = [];
        this.positions = this.initializePositions();
        this.constants = this.initializeConstants();
        
        this.program = null;
        this.uniformLocations = null;
        this.positionBuffer = null;
        this.uiControls = null;
        this.interactionHandler = null;
        this.controlPanelResizeObserver = null; // Add a property to hold the observer

        this.reflectionOverlay = null;          // ← NEW
        this.reflectionRenderer = null;         // ← NEW
    }

    initializePositions() {
        return {
            liquidGlassCenterPosition: { x: 0, y: 0 },
            controlPanelPosition: { x: 0, y: 0 }, // Will be updated from HTML position
            controlPanelSize: { x: 320, y: 500 }, // Will be updated from HTML size
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
            pageBackgroundColorVal: [51/255, 51/255, 51/255, 1.0] // Changed to #333
        };
    }

    initialize() {
        this.createReflectionOverlay();         // ← NEW
        this.setupWebGL();
        this.setupUI();
        this.setupEventHandlers();
        this.resizeCanvas();
    }

    /* ---------- NEW ---------- */
    createReflectionOverlay() {
        const scene = document.querySelector('.scene');
        this.reflectionOverlay = document.createElement('canvas');
        this.reflectionOverlay.id = 'reflectionCanvas';
        Object.assign(this.reflectionOverlay.style, {
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
        });
        scene.appendChild(this.reflectionOverlay);
        this.reflectionRenderer = new ReflectionBorder(this.reflectionOverlay);
    }
    /* ------------------------- */

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
        
        // Load default images
        this.loadDefaultImages();
    }

    loadDefaultImages() {
        const imagesToLoad = ['assets/iphone.PNG', 'assets/lingjel.png'];
        let loadedCount = 0;
        const totalImages = imagesToLoad.length;
        const imageData = [];

        imagesToLoad.forEach((src, index) => {
            const img = new Image();
            img.onload = () => {
                // Create WebGL texture
                const texture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

                const aspectRatio = img.width / img.height;
                // Calculate size based on 80% of current canvas height
                const targetHeight = this.canvas.height * 0.8;
                const targetWidth = targetHeight * aspectRatio;

                imageData[index] = {
                    texture: texture,
                    aspectRatio: aspectRatio,
                    size: { x: targetWidth, y: targetHeight },
                    isDefault: true // Mark as a default image
                };

                loadedCount++;
                if (loadedCount === totalImages) {
                    this.positionDefaultImages(imageData);
                }
            };
            img.src = src;
        });
    }

    positionDefaultImages(imageData) {
        const spacing = 50; // 50px space between images
        const totalWidth = imageData.reduce((sum, img) => sum + img.size.x, 0) + spacing * (imageData.length - 1);
        
        // Center the group horizontally
        let currentX = (this.canvas.width - totalWidth) / 2;
        
        imageData.forEach((imgData) => {
            // Center each image vertically
            const y = (this.canvas.height - imgData.size.y) / 2;
            
            const backgroundImageData = {
                texture: imgData.texture,
                aspectRatio: imgData.aspectRatio,
                position: { x: currentX, y: y },
                size: { x: imgData.size.x, y: imgData.size.y },
                isDefault: true // Ensure this flag is carried over
            };
            
            this.backgroundImagesData.push(backgroundImageData);
            
            // Move to next position
            currentX += imgData.size.x + spacing;
        });
        
        this.render();
    }

    setupUI() {
        this.uiControls = new UIControls(
            this.liquidGlassParams,
            this.backgroundImagesData,
            () => this.render()
        );
        this.uiControls.setGL(this.gl);
        this.uiControls.initialize();

        // Add ResizeObserver for the control panel to update GL position when size changes
        const controlPanelElement = this.uiControls.getUIElements().controlPanel;
        if (controlPanelElement) {
            this.controlPanelResizeObserver = new ResizeObserver(entries => {
                // Update GL coordinates when panel size changes
                if (this.interactionHandler) {
                    this.interactionHandler.updateControlPanelGLPosition();
                }
            });
            this.controlPanelResizeObserver.observe(controlPanelElement);
        }
    }

    setupEventHandlers() {
        this.interactionHandler = new InteractionHandler(
            this.canvas,
            this.liquidGlassParams,
            this.positions,
            this.uiControls.getUIElements(),
            () => this.render(),
            this.backgroundImagesData
        );
        this.interactionHandler.setGL(this.gl);
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
        
        // Re-calculate size and position for default images
        const defaultImages = this.backgroundImagesData.filter(img => img.isDefault);
        if (defaultImages.length > 0) {
            const spacing = 50;
            let totalWidth = 0;

            defaultImages.forEach(img => {
                img.size.y = this.canvas.height * 0.8;
                img.size.x = img.size.y * img.aspectRatio;
                totalWidth += img.size.x;
            });
            
            if (defaultImages.length > 1) {
                totalWidth += spacing * (defaultImages.length - 1);
            }

            let currentX = (this.canvas.width - totalWidth) / 2;
            
            defaultImages.forEach((img) => {
                img.position.x = currentX;
                img.position.y = (this.canvas.height - img.size.y) / 2;
                currentX += img.size.x + spacing;
            });
        }
        
        this.updateIconPositions();
        
        // Update control panel GL position after canvas resize
        if (this.interactionHandler) {
            this.interactionHandler.updateControlPanelGLPosition();
        }
        
        // keep overlay same size
        if (this.reflectionOverlay) {
            this.reflectionOverlay.width  = this.canvas.clientWidth;
            this.reflectionOverlay.height = this.canvas.clientHeight;
        }
        
        this.render();
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
        this.drawReflectionBorder();            // ← NEW
    }

    /* ---------- NEW ---------- */
    drawReflectionBorder() {
        if (!this.reflectionRenderer) return;

        /* ---------- effective corner radius (unchanged) ---------- */
        const halfShortSide   = 0.5 * Math.min(this.liquidGlassParams.rectangleWidth,
                                               this.liquidGlassParams.rectangleHeight);
        const circleGuard     = 1.0;
        const effectiveRadius = Math.min(
            this.liquidGlassParams.rectangleCornerRadius,
            Math.max(0, halfShortSide - circleGuard)
        );

        /* ---------- derive gradient stops from 2h / 4t ----------- */
        let h = this.liquidGlassParams.reflectionHighlightSize;   // each highlight
        let t = this.liquidGlassParams.reflectionTransitionSize;  // each transition

        /* keep percentages legal: 2h + 4t <= 100  */
        const maxAllowed = 100;
        const used       = 2 * h + 4 * t;
        if (used > maxAllowed) {
            const scale = maxAllowed / used;
            h *= scale;
            t *= scale;
        }
        const d = (maxAllowed - 2 * h - 4 * t) / 2;               // each dark zone

        const stopsPct = [
            0,
            d,
            d + t,
            d + t + h,
            d + t + h + t,
            d + t + h + t + d,
            d + t + h + t + d + t,
            d + t + h + t + d + t + h,
            100
        ];
        const stops = stopsPct.map(v => v / 100);

        /* ---------- debug print ---------------------------------- */
        const borderR = Math.max(0, effectiveRadius - this.liquidGlassParams.reflectionBorderOffset);
        if (effectiveRadius !== this._lastShapeR || borderR !== this._lastBorderR) {
            console.log(`[CornerRadius] shape=${effectiveRadius.toFixed(2)}  border=${borderR.toFixed(2)}`);
            this._lastShapeR  = effectiveRadius;
            this._lastBorderR = borderR;
        }
        /* ---------------------------------------------------------- */

        if (!this.liquidGlassParams.enableReflection) {
            this.reflectionRenderer.ctx.clearRect(0, 0,
                this.reflectionOverlay.width, this.reflectionOverlay.height);
            return;
        }

        this.reflectionRenderer.draw({
            center: {
                x: this.positions.liquidGlassCenterPosition.x,
                y: this.canvas.height - this.positions.liquidGlassCenterPosition.y
            },
            size: {
                w: this.liquidGlassParams.rectangleWidth,
                h: this.liquidGlassParams.rectangleHeight
            },
            cornerRadius: effectiveRadius,
            thickness:    this.liquidGlassParams.reflectionBorderThickness,
            blur:         this.liquidGlassParams.reflectionBorderBlur,
            offset:       this.liquidGlassParams.reflectionBorderOffset,
            rotationOffsetDeg: this.liquidGlassParams.reflectionStartAngle,
            stopPositions: stops,                    // ← derived stops
            opacity: this.liquidGlassParams.reflectionOverlayOpacity
        });
    }
    /* ------------------------- */

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

        // Set up background image textures
        for (let i = 0; i < 8; i++) {
            if (i < this.backgroundImagesData.length) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, this.backgroundImagesData[i].texture);
                gl.uniform1i(u.backgroundImageTextures[i], i);
            }
        }
        
        // Set background image positions and sizes
        if (this.backgroundImagesData.length > 0) {
            const positions = [];
            const sizes = [];
            for (let i = 0; i < 8; i++) {
                if (i < this.backgroundImagesData.length) {
                    positions.push(this.backgroundImagesData[i].position.x, this.backgroundImagesData[i].position.y);
                    sizes.push(this.backgroundImagesData[i].size.x, this.backgroundImagesData[i].size.y);
                } else {
                    positions.push(0, 0);
                    sizes.push(0, 0);
                }
            }
            gl.uniform2fv(u.backgroundImagePositions, positions);
            gl.uniform2fv(u.backgroundImageSizes, sizes);
        }

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

        // Inner Shadow & Glow Uniforms
        gl.uniform1f(u.topShadowBlur, this.liquidGlassParams.topShadowBlur);
        gl.uniform1f(u.topShadowOffsetX, this.liquidGlassParams.topShadowOffsetX);
        gl.uniform1f(u.topShadowOffsetY, this.liquidGlassParams.topShadowOffsetY);
        gl.uniform1f(u.topShadowOpacity, this.liquidGlassParams.topShadowOpacity);

        gl.uniform1f(u.bottomGlowBlur, this.liquidGlassParams.bottomGlowBlur);
        gl.uniform1f(u.bottomGlowOffsetX, this.liquidGlassParams.bottomGlowOffsetX);
        gl.uniform1f(u.bottomGlowOffsetY, this.liquidGlassParams.bottomGlowOffsetY);
        gl.uniform1f(u.bottomGlowOpacity, this.liquidGlassParams.bottomGlowOpacity);

        // Chromatic Aberration
        gl.uniform1i(u.enableChromaticAberration, this.liquidGlassParams.enableChromaticAberration);
        gl.uniform1f(u.chromaticAberrationAmount, this.liquidGlassParams.chromaticAberrationAmount);

        // Reflection
        gl.uniform1i(u.enableReflection, this.liquidGlassParams.enableReflection);
        // Remove legacy reflection uniform settings
        // gl.uniform1f(u.reflectionArcDegrees, this.liquidGlassParams.reflectionArcDegrees);
        // gl.uniform1f(u.reflectionThickness, this.liquidGlassParams.reflectionThickness);
        // gl.uniform1f(u.reflectionOffset, this.liquidGlassParams.reflectionOffset);
        // gl.uniform1f(u.reflectionOpacity, this.liquidGlassParams.reflectionOpacity);
        // gl.uniform1f(u.reflectionArcPositionOffset, this.liquidGlassParams.reflectionArcPositionOffset);

        // Border Reflection
        gl.uniform1f(u.reflectionBorderThickness, this.liquidGlassParams.reflectionBorderThickness);
        gl.uniform1f(u.reflectionBorderBlur, this.liquidGlassParams.reflectionBorderBlur);
        gl.uniform1f(u.reflectionBorderOffset, this.liquidGlassParams.reflectionBorderOffset);
        gl.uniform1f(u.reflectionStartAngle, this.liquidGlassParams.reflectionStartAngle);
        // Removed u.reflectionStop1 to u.reflectionStop7 uniform settings
        // gl.uniform1f(u.reflectionStop1, this.liquidGlassParams.reflectionStop1); // Removed
        // gl.uniform1f(u.reflectionStop2, this.liquidGlassParams.reflectionStop2); // Removed
        // gl.uniform1f(u.reflectionStop3, this.liquidGlassParams.reflectionStop3); // Removed
        // gl.uniform1f(u.reflectionStop4, this.liquidGlassParams.reflectionStop4); // Removed
        // gl.uniform1f(u.reflectionStop5, this.liquidGlassParams.reflectionStop5); // Removed
        // gl.uniform1f(u.reflectionStop6, this.liquidGlassParams.reflectionStop6); // Removed
        // gl.uniform1f(u.reflectionStop7, this.liquidGlassParams.reflectionStop7); // Removed
    }
}

if (!gl) {
    alert('WebGL not supported. Please use a browser that supports WebGL.');
} else {
    const app = new LiquidGlassApp();
    app.initialize();
}

function main() {
    // Initialize WebGL context and shaders
    // ...existing initialization code...

    // Initialize UI controls
    uiControls.initialize();
    
    // Initialize configuration system (loads saved state or default preset)
    uiControls.configManager.initialize();

    // ...existing code...
}
