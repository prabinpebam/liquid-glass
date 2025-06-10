/**
 * Liquid Glass Effect Implementation
 * 
 * This project implements Apple's "Liquid Glass" visual effect from iOS 26,
 * featuring glass refraction distortion applied to UI surfaces.
 * The effect creates a realistic glass-like appearance with controllable
 * distortion, frosting, and transparency.
 */

const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
    alert('WebGL not supported. Please use a browser that supports WebGL.');
} else {
    // Vertex shader - handles geometry positioning
    const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_position * 0.5 + 0.5;
        }
    `;

    // Fragment shader - implements the liquid glass effect
    const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_texCoord;

        // Canvas and background uniforms
        uniform vec2 u_resolution;
        uniform vec4 u_gridLineColor;
        uniform float u_gridSpacing;
        uniform vec4 u_pageBackgroundColor;
        uniform bool u_showGrid;

        // Liquid glass shape uniforms
        uniform vec2 u_liquidGlassCenter;
        uniform int u_liquidGlassType;           // 0: Circle, 1: Rounded Rectangle
        uniform float u_circleRadius;
        uniform vec2 u_rectangleSize;
        uniform float u_rectangleCornerRadius;
        uniform float u_edgeDistortionThickness;
        
        // Glass material properties
        uniform float u_refractionStrength;
        uniform vec4 u_glassBaseColor;
        uniform float u_frostiness;

        // Background image system
        uniform bool u_hasBackgroundImages;
        uniform sampler2D u_backgroundImageTextures[8];
        uniform vec2 u_backgroundImagePositions[8];
        uniform vec2 u_backgroundImageSizes[8];
        uniform int u_backgroundImageCount;

        // Control panel (also uses liquid glass effect)
        uniform vec2 u_controlPanelCenter;
        uniform vec2 u_controlPanelSize;
        uniform float u_controlPanelCornerRadius;
        uniform float u_controlPanelDistortionThickness;

        // Add Image Button (also uses liquid glass effect)
        uniform vec2 u_addImageButtonCenter;
        uniform vec2 u_addImageButtonSize;
        uniform float u_addImageButtonCornerRadius;
        uniform float u_addImageButtonDistortionThickness;

        /**
         * Signed Distance Function for rounded rectangles
         * Used for both main shapes and control panel
         */
        float sdRoundedBox( vec2 p, vec2 b, float r ) {
            vec2 q = abs(p) - b + r;
            return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
        }

        /**
         * Renders the background with grid, images, and base color
         * This is what appears "behind" the liquid glass surfaces
         */
        vec4 renderBackground(vec2 coord, float spacing, vec4 gridLineCol, vec4 pageBgCol) {
            vec4 backgroundColor = pageBgCol;

            // Render background images
            for (int i = 0; i < 8; i++) {
                if (i >= u_backgroundImageCount) break;
                
                vec2 imageMin = u_backgroundImagePositions[i];
                vec2 imageMax = u_backgroundImagePositions[i] + u_backgroundImageSizes[i];
                
                if (coord.x >= imageMin.x && coord.x <= imageMax.x && 
                    coord.y >= imageMin.y && coord.y <= imageMax.y) {
                    vec2 uv = (coord - imageMin) / u_backgroundImageSizes[i];
                    uv.y = 1.0 - uv.y; // Flip Y for texture sampling
                    
                    vec4 imageColor;
                    if (i == 0) imageColor = texture2D(u_backgroundImageTextures[0], uv);
                    else if (i == 1) imageColor = texture2D(u_backgroundImageTextures[1], uv);
                    else if (i == 2) imageColor = texture2D(u_backgroundImageTextures[2], uv);
                    else if (i == 3) imageColor = texture2D(u_backgroundImageTextures[3], uv);
                    else if (i == 4) imageColor = texture2D(u_backgroundImageTextures[4], uv);
                    else if (i == 5) imageColor = texture2D(u_backgroundImageTextures[5], uv);
                    else if (i == 6) imageColor = texture2D(u_backgroundImageTextures[6], uv);
                    else if (i == 7) imageColor = texture2D(u_backgroundImageTextures[7], uv);
                    
                    backgroundColor = mix(backgroundColor, imageColor, imageColor.a);
                }
            }

            // Overlay grid lines if enabled
            if (u_showGrid) {
                vec2 gridPos = mod(coord, spacing);
                float lineThickness = 1.0;
                if (gridPos.x < lineThickness || gridPos.y < lineThickness) {
                    backgroundColor = mix(backgroundColor, gridLineCol, 1.0);
                }
            }

            return backgroundColor;
        }

        void main() {
            vec2 currentPixelCoord = v_texCoord * u_resolution;
            vec2 relativeToLiquidGlassCenter = currentPixelCoord - u_liquidGlassCenter;

            // Liquid glass shape analysis
            float distanceMetric;
            bool isOutsideLiquidGlass = false;
            bool isInNonDistortingCenter = false;
            bool isInDistortingEdge = false;
            float edgeDistortionAmount = 0.0; // 0 = inner edge, 1 = outer edge

            // Control panel liquid glass analysis
            vec2 relativeToControlPanel = currentPixelCoord - u_controlPanelCenter;
            float controlPanelSDF = sdRoundedBox(relativeToControlPanel, u_controlPanelSize * 0.5, u_controlPanelCornerRadius);
            
            bool isInControlPanel = false;
            bool isInControlPanelDistortingEdge = false;
            float controlPanelEdgeAmount = 0.0;
            
            // Add Image Button liquid glass analysis
            vec2 relativeToAddImageButton = currentPixelCoord - u_addImageButtonCenter;
            float addImageButtonSDF = sdRoundedBox(relativeToAddImageButton, u_addImageButtonSize * 0.5, u_addImageButtonCornerRadius);
            
            bool isInAddImageButton = false;
            bool isInAddImageButtonDistortingEdge = false;
            float addImageButtonEdgeAmount = 0.0;
            
            // Check control panel first (has priority)
            if (controlPanelSDF <= 0.0) {
                isInControlPanel = true;
                if (controlPanelSDF > -u_controlPanelDistortionThickness) {
                    isInControlPanelDistortingEdge = true;
                    if (u_controlPanelDistortionThickness > 0.001) {
                        controlPanelEdgeAmount = (controlPanelSDF + u_controlPanelDistortionThickness) / u_controlPanelDistortionThickness;
                    }
                }
            } else if (addImageButtonSDF <= 0.0) {
                // Check add image button (has priority over main shape but lower than control panel)
                isInAddImageButton = true;
                if (addImageButtonSDF > -u_addImageButtonDistortionThickness) {
                    isInAddImageButtonDistortingEdge = true;
                    if (u_addImageButtonDistortionThickness > 0.001) {
                        addImageButtonEdgeAmount = (addImageButtonSDF + u_addImageButtonDistortionThickness) / u_addImageButtonDistortionThickness;
                    }
                }
            }

            // Analyze main liquid glass shape
            if (u_liquidGlassType == 0) { // Circle
                distanceMetric = length(relativeToLiquidGlassCenter);
                float outerRadius = u_circleRadius;
                float innerRadius = u_circleRadius - u_edgeDistortionThickness;

                if (distanceMetric > outerRadius) {
                    isOutsideLiquidGlass = true;
                } else if (distanceMetric <= innerRadius) {
                    isInNonDistortingCenter = true;
                } else {
                    isInDistortingEdge = true;
                    if (u_edgeDistortionThickness > 0.001) {
                        edgeDistortionAmount = (distanceMetric - innerRadius) / u_edgeDistortionThickness;
                    }
                }
            } else if (u_liquidGlassType == 1) { // Rounded Rectangle
                float cornerRadius = min(u_rectangleCornerRadius, min(u_rectangleSize.x*0.5, u_rectangleSize.y*0.5));
                distanceMetric = sdRoundedBox(relativeToLiquidGlassCenter, u_rectangleSize * 0.5, cornerRadius);
                
                float outerBoundary = 0.0;
                float innerBoundary = -u_edgeDistortionThickness;

                if (distanceMetric > outerBoundary) {
                    isOutsideLiquidGlass = true;
                } else if (distanceMetric <= innerBoundary) {
                    isInNonDistortingCenter = true;
                } else {
                    isInDistortingEdge = true;
                    if (u_edgeDistortionThickness > 0.001) {
                         edgeDistortionAmount = (distanceMetric - innerBoundary) / u_edgeDistortionThickness;
                    }
                }
            }

            vec4 finalColor;

            if (isInControlPanel) {
                // Render control panel with liquid glass effect
                vec2 samplingCoord = currentPixelCoord;
                
                // Apply refraction distortion for control panel edge
                if (isInControlPanelDistortingEdge) {
                    float distortionCurve = 2.0;
                    float distortionMagnitude = 25.0 * pow(clamp(controlPanelEdgeAmount, 0.0, 1.0), distortionCurve);
                    samplingCoord = currentPixelCoord - normalize(relativeToControlPanel) * distortionMagnitude;
                }

                // Apply frosting effect (always on for control panel)
                vec4 refractedBackground;
                vec4 totalColor = vec4(0.0);
                float sampleCount = 0.0;
                
                // Multi-sample blur for frosted glass effect
                for (int x = -2; x <= 2; x++) {
                    for (int y = -2; y <= 2; y++) {
                        vec2 frostOffset = vec2(float(x), float(y)) * 1.0 * 0.5;
                        vec2 frostSamplePos = samplingCoord + frostOffset;
                        totalColor += renderBackground(frostSamplePos, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                        sampleCount += 1.0;
                    }
                }
                refractedBackground = totalColor / sampleCount;

                // Mix with control panel glass tint
                vec4 controlPanelGlassTint = vec4(250.0/255.0, 250.0/255.0, 255.0/255.0, 0.01);
                finalColor = mix(refractedBackground, controlPanelGlassTint, controlPanelGlassTint.a);

                // Add subtle edge glow for control panel
                if (isInControlPanelDistortingEdge) {
                    float edgeGlow = smoothstep(0.85, 1.0, controlPanelEdgeAmount) * 0.15;
                    finalColor.rgb += vec3(edgeGlow);
                }
            } else if (isInAddImageButton) {
                // Render add image button with liquid glass effect
                vec2 samplingCoord = currentPixelCoord;
                
                // Apply refraction distortion for button edge
                if (isInAddImageButtonDistortingEdge) {
                    float distortionCurve = 2.0;
                    float distortionMagnitude = 15.0 * pow(clamp(addImageButtonEdgeAmount, 0.0, 1.0), distortionCurve);
                    samplingCoord = currentPixelCoord - normalize(relativeToAddImageButton) * distortionMagnitude;
                }

                // Apply light frosting effect for button
                vec4 refractedBackground;
                vec4 totalColor = vec4(0.0);
                float sampleCount = 0.0;
                
                // Light blur for subtle frosted effect
                for (int x = -1; x <= 1; x++) {
                    for (int y = -1; y <= 1; y++) {
                        vec2 frostOffset = vec2(float(x), float(y)) * 0.8;
                        vec2 frostSamplePos = samplingCoord + frostOffset;
                        totalColor += renderBackground(frostSamplePos, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                        sampleCount += 1.0;
                    }
                }
                refractedBackground = totalColor / sampleCount;

                // Mix with button glass tint (slightly more opaque than control panel)
                vec4 buttonGlassTint = vec4(250.0/255.0, 250.0/255.0, 255.0/255.0, 0.15);
                finalColor = mix(refractedBackground, buttonGlassTint, buttonGlassTint.a);

                // Add button edge glow
                if (isInAddImageButtonDistortingEdge) {
                    float edgeGlow = smoothstep(0.7, 1.0, addImageButtonEdgeAmount) * 0.2;
                    finalColor.rgb += vec3(edgeGlow);
                }
            } else if (isOutsideLiquidGlass) {
                // Render normal background outside liquid glass areas
                finalColor = renderBackground(currentPixelCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
            } else {
                // Render main liquid glass effect
                vec2 samplingCoord = currentPixelCoord;
                
                // Apply refraction distortion based on distance from edge
                if (isInDistortingEdge && u_refractionStrength > 0.0) {
                    float distortionCurve = 2.0; // Exponential falloff curve
                    float distortionMagnitude = u_refractionStrength * pow(clamp(edgeDistortionAmount, 0.0, 1.0), distortionCurve);
                    samplingCoord = currentPixelCoord - normalize(relativeToLiquidGlassCenter) * distortionMagnitude;
                }

                // Apply frosting effect if enabled
                vec4 refractedBackground;
                if (u_frostiness > 0.1) {
                    vec4 totalColor = vec4(0.0);
                    float sampleCount = 0.0;
                    
                    // Multi-sample blur for frosted glass effect
                    for (int x = -2; x <= 2; x++) {
                        for (int y = -2; y <= 2; y++) {
                            vec2 frostOffset = vec2(float(x), float(y)) * u_frostiness * 0.5;
                            vec2 frostSamplePos = samplingCoord + frostOffset;
                            totalColor += renderBackground(frostSamplePos, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                            sampleCount += 1.0;
                        }
                    }
                    refractedBackground = totalColor / sampleCount;
                } else {
                    refractedBackground = renderBackground(samplingCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                }

                // Mix with glass material properties
                finalColor = mix(refractedBackground, u_glassBaseColor, u_glassBaseColor.a);

                // Add subtle edge glow for main liquid glass
                if (isInDistortingEdge) {
                    float edgeGlow = smoothstep(0.85, 1.0, edgeDistortionAmount) * 0.15;
                    finalColor.rgb += vec3(edgeGlow);
                }
            }
            gl_FragColor = finalColor;
        }
    `;

    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Shader compilation error (${type === gl.VERTEX_SHADER ? 'VS' : 'FS'}):`, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader); return null;
        }
        return shader;
    }

    function createProgram(vs, fs) {
        const program = gl.createProgram();
        gl.attachShader(program, vs); gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program); return null;
        }
        return program;
    }

    // Compile and link shaders
    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    const liquidGlassProgram = createProgram(vertexShader, fragmentShader);

    // Get uniform locations with semantic names
    const uniformLocations = {
        position: gl.getAttribLocation(liquidGlassProgram, "a_position"),
        resolution: gl.getUniformLocation(liquidGlassProgram, "u_resolution"),
        
        // Main liquid glass shape uniforms
        liquidGlassCenter: gl.getUniformLocation(liquidGlassProgram, "u_liquidGlassCenter"),
        liquidGlassType: gl.getUniformLocation(liquidGlassProgram, "u_liquidGlassType"),
        circleRadius: gl.getUniformLocation(liquidGlassProgram, "u_circleRadius"),
        rectangleSize: gl.getUniformLocation(liquidGlassProgram, "u_rectangleSize"),
        rectangleCornerRadius: gl.getUniformLocation(liquidGlassProgram, "u_rectangleCornerRadius"),
        edgeDistortionThickness: gl.getUniformLocation(liquidGlassProgram, "u_edgeDistortionThickness"),
        
        // Glass material properties
        refractionStrength: gl.getUniformLocation(liquidGlassProgram, "u_refractionStrength"),
        glassBaseColor: gl.getUniformLocation(liquidGlassProgram, "u_glassBaseColor"),
        frostiness: gl.getUniformLocation(liquidGlassProgram, "u_frostiness"),
        
        // Background rendering
        gridLineColor: gl.getUniformLocation(liquidGlassProgram, "u_gridLineColor"),
        gridSpacing: gl.getUniformLocation(liquidGlassProgram, "u_gridSpacing"),
        pageBackgroundColor: gl.getUniformLocation(liquidGlassProgram, "u_pageBackgroundColor"),
        showGrid: gl.getUniformLocation(liquidGlassProgram, "u_showGrid"),
        
        // Background image system
        hasBackgroundImages: gl.getUniformLocation(liquidGlassProgram, "u_hasBackgroundImages"),
        backgroundImageTextures: [],
        backgroundImagePositions: gl.getUniformLocation(liquidGlassProgram, "u_backgroundImagePositions"),
        backgroundImageSizes: gl.getUniformLocation(liquidGlassProgram, "u_backgroundImageSizes"),
        backgroundImageCount: gl.getUniformLocation(liquidGlassProgram, "u_backgroundImageCount"),
        
        // Control panel (also uses liquid glass effect)
        controlPanelCenter: gl.getUniformLocation(liquidGlassProgram, "u_controlPanelCenter"),
        controlPanelSize: gl.getUniformLocation(liquidGlassProgram, "u_controlPanelSize"),
        controlPanelCornerRadius: gl.getUniformLocation(liquidGlassProgram, "u_controlPanelCornerRadius"),
        controlPanelDistortionThickness: gl.getUniformLocation(liquidGlassProgram, "u_controlPanelDistortionThickness"),

        // Add Image Button
        addImageButtonCenter: gl.getUniformLocation(liquidGlassProgram, "u_addImageButtonCenter"),
        addImageButtonSize: gl.getUniformLocation(liquidGlassProgram, "u_addImageButtonSize"),
        addImageButtonCornerRadius: gl.getUniformLocation(liquidGlassProgram, "u_addImageButtonCornerRadius"),
        addImageButtonDistortionThickness: gl.getUniformLocation(liquidGlassProgram, "u_addImageButtonDistortionThickness")
    };

    // Initialize background image texture uniform locations
    for (let i = 0; i < 8; i++) {
        uniformLocations.backgroundImageTextures[i] = gl.getUniformLocation(liquidGlassProgram, `u_backgroundImageTextures[${i}]`);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    // Liquid glass parameters with semantic names
    let liquidGlassParams = {
        shapeType: 0, // 0: Circle, 1: Rounded Rectangle
        circleRadius: 150,
        rectangleWidth: 300,
        rectangleHeight: 200,
        rectangleCornerRadius: 30,
        edgeDistortionThickness: 30, // Absolute pixels for distortion ring
        refractionStrength: 25.0,
        gridSpacing: 25.0,
        glassBaseColor: [250/255, 250/255, 255/255, 0.1],
        frostiness: 1.0,
        showGrid: true
    };
    
    // Position and state tracking
    let liquidGlassCenterPosition = { x: 0, y: 0 };
    let backgroundImagesData = [];
    
    // Control panel configuration (uses liquid glass effect)
    let controlPanelPosition = { x: 0, y: 0 };
    let controlPanelSize = { x: 340, y: 500 };
    const controlPanelCornerRadius = 20;
    const controlPanelDistortionThickness = 15;

    // Add Image Button configuration (also uses liquid glass effect)
    let addImageButtonPosition = { x: 100, y: 100 }; // Bottom-left area with 50px virtual margin
    let addImageButtonSize = { x: 120, y: 40 };
    const addImageButtonCornerRadius = 20;
    const addImageButtonDistortionThickness = 8;

    // Cache for performance optimization
    let canvasRect = null;
    let lastRectUpdate = 0;
    const RECT_UPDATE_INTERVAL = 100; // Update canvas rect every 100ms max

    // Interaction handling variables
    let isElementDragging = false;
    let isElementResizing = false;
    let isControlPanelDragging = false;
    let dragTarget = null; // 'liquidGlass', or image index
    let resizeHandle = null; // 'liquidGlass', or image index
    let dragStartX, dragStartY;
    let initialLiquidGlassCenterX, initialLiquidGlassCenterY;
    let initialBackgroundImagePos, initialElementSize;
    let initialControlPanelPosition;

    const gridLineColorVal = [0, 0, 0, 0.15]; // Make grid more visible
    const pageBackgroundColorVal = [221/255, 225/255, 231/255, 1.0];

    // UI element references with semantic names
    const uiElements = {
        liquidGlassTypeSelector: document.getElementById('shapeTypeSelector'),
        circleControlsGroup: document.getElementById('diskControls'),
        rectangleControlsGroup: document.getElementById('rectControls'),
        circleRadiusControl: { slider: document.getElementById('diskRadiusSlider'), valueDisplay: document.getElementById('diskRadiusValue') },
        rectangleWidthControl: { slider: document.getElementById('rectWidthSlider'), valueDisplay: document.getElementById('rectWidthValue') },
        rectangleHeightControl: { slider: document.getElementById('rectHeightSlider'), valueDisplay: document.getElementById('rectHeightValue') },
        rectangleCornerRadiusControl: { slider: document.getElementById('rectCornerRadiusSlider'), valueDisplay: document.getElementById('rectCornerRadiusValue') },
        edgeDistortionThicknessControl: { slider: document.getElementById('innerRadiusFactorSlider'), valueDisplay: document.getElementById('innerRadiusFactorValue') },
        refractionStrengthControl: { slider: document.getElementById('refractionStrengthSlider'), valueDisplay: document.getElementById('refractionStrengthValue') },
        gridSpacingControl: { slider: document.getElementById('gridSpacingSlider'), valueDisplay: document.getElementById('gridSpacingValue') },
        glassAlphaControl: { slider: document.getElementById('glassAlphaSlider'), valueDisplay: document.getElementById('glassAlphaValue') },
        frostinessControl: { slider: document.getElementById('frostinessSlider'), valueDisplay: document.getElementById('frostinessValue') },
        gridToggle: document.getElementById('gridToggle'),
        backgroundImageUpload: document.getElementById('imageUpload'),
        controlPanel: document.getElementById('controls-pane'),
        controlPanelTitle: document.getElementById('controls-title')
    };

    /**
     * Updates visibility of shape-specific controls based on selected liquid glass type
     */
    function updateLiquidGlassControlsVisibility() {
        if (liquidGlassParams.shapeType == 0) { // Circle
            uiElements.circleControlsGroup.style.display = 'block';
            uiElements.rectangleControlsGroup.style.display = 'none';
        } else { // Rectangle
            uiElements.circleControlsGroup.style.display = 'none';
            uiElements.rectangleControlsGroup.style.display = 'block';
        }
    }

    /**
     * Get mouse position relative to canvas with Y-axis flipped
     */
    function getCanvasMousePosition(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: canvas.height - (e.clientY - rect.top) // Flip Y coordinate
        };
    }

    /**
     * Initialize all UI controls and event listeners
     */
    function initializeLiquidGlassControls() {
        // Shape type selector
        if (uiElements.liquidGlassTypeSelector) {
            uiElements.liquidGlassTypeSelector.value = liquidGlassParams.shapeType;
            updateLiquidGlassControlsVisibility();
            uiElements.liquidGlassTypeSelector.addEventListener('change', (e) => {
                liquidGlassParams.shapeType = parseInt(e.target.value);
                updateLiquidGlassControlsVisibility();
                requestAnimationFrame(renderLiquidGlassScene);
            });
        }

        // Parameter controls with semantic mapping
        const parameterMappings = [
            { key: 'circleRadius', paramName: 'circleRadius' },
            { key: 'rectangleWidth', paramName: 'rectangleWidth' },
            { key: 'rectangleHeight', paramName: 'rectangleHeight' },
            { key: 'rectangleCornerRadius', paramName: 'rectangleCornerRadius' },
            { key: 'edgeDistortionThickness', paramName: 'edgeDistortionThickness' },
            { key: 'refractionStrength', paramName: 'refractionStrength' },
            { key: 'gridSpacing', paramName: 'gridSpacing' },
            { key: 'frostiness', paramName: 'frostiness' }
        ];

        parameterMappings.forEach(mapping => {
            const controlKey = mapping.key + 'Control';
            if (!uiElements[controlKey] || !uiElements[controlKey].slider) {
                console.warn(`Control not found: ${controlKey}`);
                return;
            }

            uiElements[controlKey].slider.value = liquidGlassParams[mapping.paramName];
            uiElements[controlKey].valueDisplay.textContent = liquidGlassParams[mapping.paramName];
            uiElements[controlKey].slider.addEventListener('input', (e) => {
                liquidGlassParams[mapping.paramName] = parseFloat(e.target.value);
                uiElements[controlKey].valueDisplay.textContent = liquidGlassParams[mapping.paramName];
                requestAnimationFrame(renderLiquidGlassScene);
            });
        });
        
        // Glass alpha control (special handling for array property)
        if (uiElements.glassAlphaControl && uiElements.glassAlphaControl.slider) {
            uiElements.glassAlphaControl.slider.value = liquidGlassParams.glassBaseColor[3];
            uiElements.glassAlphaControl.valueDisplay.textContent = liquidGlassParams.glassBaseColor[3].toFixed(2);
            uiElements.glassAlphaControl.slider.addEventListener('input', (e) => {
                liquidGlassParams.glassBaseColor[3] = parseFloat(e.target.value);
                uiElements.glassAlphaControl.valueDisplay.textContent = liquidGlassParams.glassBaseColor[3].toFixed(2);
                requestAnimationFrame(renderLiquidGlassScene);
            });
        }

        // Grid toggle
        if (uiElements.gridToggle) {
            uiElements.gridToggle.checked = liquidGlassParams.showGrid;
            uiElements.gridToggle.addEventListener('change', (e) => {
                liquidGlassParams.showGrid = e.target.checked;
                requestAnimationFrame(renderLiquidGlassScene);
            });
        }

        // Background image upload
        if (uiElements.backgroundImageUpload) {
            uiElements.backgroundImageUpload.addEventListener('change', handleBackgroundImageUpload);
        }
    }

    /**
     * Handles background image upload and texture creation
     */
    function handleBackgroundImageUpload(event) {
        const file = event.target.files[0];
        if (!file || backgroundImagesData.length >= 8) return; // Limit to 8 images

        const img = new Image();
        img.onload = function() {
            // Create WebGL texture
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // Maintain aspect ratio and position images in a staggered layout
            const aspectRatio = img.width / img.height;
            const backgroundImageData = {
                texture: texture,
                position: { x: 100 + backgroundImagesData.length * 50, y: 100 + backgroundImagesData.length * 50 },
                size: { x: 300, y: 300 / aspectRatio }
            };
            
            backgroundImagesData.push(backgroundImageData);
            requestAnimationFrame(renderLiquidGlassScene);
        };
        img.src = URL.createObjectURL(file);
        
        // Clear input for potential re-upload of same file
        event.target.value = '';
    }

    /**
     * Checks if a point is inside the current liquid glass shape
     */
    function isPointInsideLiquidGlass(x, y) {
        const dx = x - liquidGlassCenterPosition.x;
        const dy = y - liquidGlassCenterPosition.y;
        
        if (liquidGlassParams.shapeType === 0) { // Circle
            return Math.sqrt(dx * dx + dy * dy) <= liquidGlassParams.circleRadius;
        } else { // Rectangle
            const halfW = liquidGlassParams.rectangleWidth * 0.5;
            const halfH = liquidGlassParams.rectangleHeight * 0.5;
            return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
        }
    }

    /**
     * Finds which background image (if any) contains the given point
     */
    function findBackgroundImageAtPoint(x, y) {
        for (let i = backgroundImagesData.length - 1; i >= 0; i--) { // Check from top to bottom
            const img = backgroundImagesData[i];
            if (x >= img.position.x && x <= img.position.x + img.size.x &&
                y >= img.position.y && y <= img.position.y + img.size.y) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Checks if a point is inside the add image button
     */
    function isPointInsideAddImageButton(x, y) {
        const dx = x - addImageButtonPosition.x;
        const dy = y - addImageButtonPosition.y;
        const halfW = addImageButtonSize.x * 0.5;
        const halfH = addImageButtonSize.y * 0.5;
        return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
    }

    /**
     * Determines if the mouse is over a resize handle for shapes or images
     */
    function getActiveResizeHandle(x, y) {
        const edgeThreshold = 15;
        
        // Check liquid glass shape resize handles
        if (isPointInsideLiquidGlass(x, y)) {
            const dx = x - liquidGlassCenterPosition.x;
            const dy = y - liquidGlassCenterPosition.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (liquidGlassParams.shapeType === 0 && Math.abs(dist - liquidGlassParams.circleRadius) < edgeThreshold) {
                return 'liquidGlass';
            } else if (liquidGlassParams.shapeType === 1) {
                const halfW = liquidGlassParams.rectangleWidth * 0.5;
                const halfH = liquidGlassParams.rectangleHeight * 0.5;
                if (Math.abs(Math.abs(dx) - halfW) < edgeThreshold || Math.abs(Math.abs(dy) - halfH) < edgeThreshold) {
                    return 'liquidGlass';
                }
            }
        }
        
        // Check background image resize handles (bottom-right corner)
        for (let i = backgroundImagesData.length - 1; i >= 0; i--) {
            const img = backgroundImagesData[i];
            const imgRight = img.position.x + img.size.x;
            const imgTop = img.position.y + img.size.y;
            
            if (Math.abs(x - imgRight) < edgeThreshold && Math.abs(y - imgTop) < edgeThreshold) {
                return i;
            }
        }
        
        return null;
    }

    function updateControlPanelPosition() {
        const now = Date.now();
        if (!canvasRect || now - lastRectUpdate > RECT_UPDATE_INTERVAL) {
            canvasRect = canvas.getBoundingClientRect();
            lastRectUpdate = now;
        }
        
        const htmlPaneRect = uiElements.controlPanel.getBoundingClientRect();
        
        // Update control pane size to match actual HTML pane dimensions
        controlPanelSize.x = htmlPaneRect.width;
        controlPanelSize.y = htmlPaneRect.height;
        
        // Convert HTML pane position to canvas coordinates
        controlPanelPosition.x = (htmlPaneRect.left - canvasRect.left) + controlPanelSize.x * 0.5;
        controlPanelPosition.y = canvas.height - (htmlPaneRect.top - canvasRect.top) - controlPanelSize.y * 0.5;
    }

    function syncHTMLPanePosition() {
        // Use cached canvas rect if available and recent
        const now = Date.now();
        if (!canvasRect || now - lastRectUpdate > RECT_UPDATE_INTERVAL) {
            canvasRect = canvas.getBoundingClientRect();
            lastRectUpdate = now;
        }
        
        const htmlLeft = controlPanelPosition.x - controlPanelSize.x * 0.5;
        const htmlTop = canvas.height - controlPanelPosition.y - controlPanelSize.y * 0.5;
        
        // Use transform instead of changing left/top for better performance
        uiElements.controlPanel.style.transform = `translate(${htmlLeft}px, ${htmlTop}px)`;
        uiElements.controlPanel.style.left = '0px';
        uiElements.controlPanel.style.top = '0px';
        uiElements.controlPanel.style.right = 'auto';
    }

    // Control panel drag functionality
    if (uiElements.controlPanelTitle) {
        uiElements.controlPanelTitle.addEventListener('mousedown', (e) => {
            isControlPanelDragging = true;
            uiElements.controlPanelTitle.style.cursor = 'grabbing';
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialControlPanelPosition = { ...controlPanelPosition };
            
            // Cache canvas rect for consistent calculations during drag
            canvasRect = canvas.getBoundingClientRect();
            lastRectUpdate = Date.now();
            
            e.preventDefault();
            e.stopPropagation();
        });
    }

    // Document-level mouse move handler for control panel dragging
    document.addEventListener('mousemove', (e) => {
        if (isControlPanelDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            
            controlPanelPosition.x = initialControlPanelPosition.x + dx;
            controlPanelPosition.y = initialControlPanelPosition.y - dy; // Flip Y
            
            // Only sync HTML position, don't re-render canvas every frame
            syncHTMLPanePosition();
            
            // Throttle canvas rendering during drag
            if (Date.now() - lastRectUpdate > 16) { // ~60fps max
                requestAnimationFrame(renderLiquidGlassScene);
            }
            return;
        }
    });

    /**
     * Canvas interaction handlers for liquid glass shapes and background images
     */
    canvas.addEventListener('mousemove', (e) => {
        if (isControlPanelDragging) return;
        
        if (isElementDragging) {
            const mousePos = getCanvasMousePosition(e);
            const dx = mousePos.x - dragStartX;
            const dy = mousePos.y - dragStartY;
            
            if (dragTarget === 'liquidGlass') {
                liquidGlassCenterPosition.x = initialLiquidGlassCenterX + dx;
                liquidGlassCenterPosition.y = initialLiquidGlassCenterY + dy;
            } else if (typeof dragTarget === 'number') {
                backgroundImagesData[dragTarget].position.x = initialBackgroundImagePos.x + dx;
                backgroundImagesData[dragTarget].position.y = initialBackgroundImagePos.y + dy;
            }
            requestAnimationFrame(renderLiquidGlassScene);
        } else if (isElementResizing) {
            const mousePos = getCanvasMousePosition(e);
            const dx = mousePos.x - dragStartX;
            const dy = mousePos.y - dragStartY;
            
            if (resizeHandle === 'liquidGlass') {
                if (liquidGlassParams.shapeType === 0) {
                    // Circle resize with reduced sensitivity
                    const newRadius = Math.max(20, liquidGlassParams.circleRadius + dx * 0.2);
                    liquidGlassParams.circleRadius = newRadius;
                    uiElements.circleRadiusControl.slider.value = newRadius;
                    uiElements.circleRadiusControl.valueDisplay.textContent = Math.round(newRadius);
                } else {
                    // Rectangle resize
                    liquidGlassParams.rectangleWidth = Math.max(50, initialElementSize.x + dx);
                    liquidGlassParams.rectangleHeight = Math.max(50, initialElementSize.y + dy);
                    uiElements.rectangleWidthControl.slider.value = liquidGlassParams.rectangleWidth;
                    uiElements.rectangleWidthControl.valueDisplay.textContent = Math.round(liquidGlassParams.rectangleWidth);
                    uiElements.rectangleHeightControl.slider.value = liquidGlassParams.rectangleHeight;
                    uiElements.rectangleHeightControl.valueDisplay.textContent = Math.round(liquidGlassParams.rectangleHeight);
                }
            } else if (typeof resizeHandle === 'number') {
                // Background image resize
                backgroundImagesData[resizeHandle].size.x = Math.max(50, initialElementSize.x + dx);
                backgroundImagesData[resizeHandle].size.y = Math.max(50, initialElementSize.y + dy);
            }
            requestAnimationFrame(renderLiquidGlassScene);
        } else {
            // Update cursor based on hover state
            const mousePos = getCanvasMousePosition(e);
            const resizeHandleType = getActiveResizeHandle(mousePos.x, mousePos.y);
            
            if (resizeHandleType !== null) {
                canvas.style.cursor = 'nw-resize';
            } else if (isPointInsideLiquidGlass(mousePos.x, mousePos.y) || findBackgroundImageAtPoint(mousePos.x, mousePos.y) !== -1) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        // Only handle canvas interactions if not dragging control panel
        if (isControlPanelDragging) return;
        
        const mousePos = getCanvasMousePosition(e);
        
        // Check if clicking on add image button
        if (isPointInsideAddImageButton(mousePos.x, mousePos.y)) {
            // Trigger file input
            if (uiElements.backgroundImageUpload) {
                uiElements.backgroundImageUpload.click();
            }
            return;
        }
        
        const resizeHandleType = getActiveResizeHandle(mousePos.x, mousePos.y);
        
        dragStartX = mousePos.x;
        dragStartY = mousePos.y;

        if (resizeHandleType !== null) {
            isElementResizing = true;
            resizeHandle = resizeHandleType;
            canvas.style.cursor = 'nw-resize';
            
            if (resizeHandleType === 'liquidGlass') {
                initialElementSize = { x: liquidGlassParams.rectangleWidth, y: liquidGlassParams.rectangleHeight };
            } else {
                initialElementSize = { ...backgroundImagesData[resizeHandleType].size };
            }
        } else if (isPointInsideLiquidGlass(mousePos.x, mousePos.y)) {
            isElementDragging = true;
            dragTarget = 'liquidGlass';
            canvas.style.cursor = 'grabbing';
            initialLiquidGlassCenterX = liquidGlassCenterPosition.x;
            initialLiquidGlassCenterY = liquidGlassCenterPosition.y;
        } else {
            const imageIndex = findBackgroundImageAtPoint(mousePos.x, mousePos.y);
            if (imageIndex !== -1) {
                isElementDragging = true;
                dragTarget = imageIndex;
                canvas.style.cursor = 'grabbing';
                initialBackgroundImagePos = { ...backgroundImagesData[imageIndex].position };
            }
        }
        
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isControlPanelDragging) {
            isControlPanelDragging = false;
            uiElements.controlPanelTitle.style.cursor = 'grab';
        }
        if (isElementDragging || isElementResizing) {
            isElementDragging = false;
            isElementResizing = false;
            dragTarget = null;
            resizeHandle = null;
            canvas.style.cursor = 'default';
        }
    });
    
    function resizeCanvas() {
        canvas.width = canvas.clientWidth; 
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // Invalidate cached rect on resize
        canvasRect = null;
        
        if (!isElementDragging) {
            liquidGlassCenterPosition.x = canvas.width / 2; 
            liquidGlassCenterPosition.y = canvas.height / 2;
            
            // Position add image button in bottom-left with 50px virtual margin
            addImageButtonPosition.x = 50 + addImageButtonSize.x * 0.5;
            addImageButtonPosition.y = 50 + addImageButtonSize.y * 0.5;
        }
        
        updateControlPanelPosition();
        requestAnimationFrame(renderLiquidGlassScene);
    }
    window.addEventListener('resize', resizeCanvas);
    
    /**
     * Main render function for the liquid glass scene
     */
    function renderLiquidGlassScene() {
        if (!gl || !liquidGlassProgram) return;

        gl.clearColor(pageBackgroundColorVal[0], pageBackgroundColorVal[1], pageBackgroundColorVal[2], pageBackgroundColorVal[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(liquidGlassProgram);
        gl.enableVertexAttribArray(uniformLocations.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(uniformLocations.position, 2, gl.FLOAT, false, 0, 0);

        // Set basic scene uniforms
        gl.uniform2f(uniformLocations.resolution, canvas.width, canvas.height);
        gl.uniform2f(uniformLocations.liquidGlassCenter, liquidGlassCenterPosition.x, liquidGlassCenterPosition.y);
        gl.uniform1f(uniformLocations.refractionStrength, liquidGlassParams.refractionStrength);
        gl.uniform4fv(uniformLocations.gridLineColor, gridLineColorVal);
        gl.uniform1f(uniformLocations.gridSpacing, liquidGlassParams.gridSpacing);
        gl.uniform4fv(uniformLocations.pageBackgroundColor, pageBackgroundColorVal);
        gl.uniform4fv(uniformLocations.glassBaseColor, liquidGlassParams.glassBaseColor);
        
        gl.uniform1i(uniformLocations.liquidGlassType, liquidGlassParams.shapeType);
        gl.uniform1f(uniformLocations.frostiness, liquidGlassParams.frostiness);
        gl.uniform1i(uniformLocations.showGrid, liquidGlassParams.showGrid);
        gl.uniform1i(uniformLocations.hasBackgroundImages, backgroundImagesData.length > 0);
        gl.uniform1i(uniformLocations.backgroundImageCount, backgroundImagesData.length);

        // Set control panel uniforms
        gl.uniform2f(uniformLocations.controlPanelCenter, controlPanelPosition.x, controlPanelPosition.y);
        gl.uniform2f(uniformLocations.controlPanelSize, controlPanelSize.x, controlPanelSize.y);
        gl.uniform1f(uniformLocations.controlPanelCornerRadius, controlPanelCornerRadius);
        gl.uniform1f(uniformLocations.controlPanelDistortionThickness, controlPanelDistortionThickness);

        // Set add image button uniforms
        gl.uniform2f(uniformLocations.addImageButtonCenter, addImageButtonPosition.x, addImageButtonPosition.y);
        gl.uniform2f(uniformLocations.addImageButtonSize, addImageButtonSize.x, addImageButtonSize.y);
        gl.uniform1f(uniformLocations.addImageButtonCornerRadius, addImageButtonCornerRadius);
        gl.uniform1f(uniformLocations.addImageButtonDistortionThickness, addImageButtonDistortionThickness);

        // Set up background image textures
        for (let i = 0; i < 8; i++) {
            if (i < backgroundImagesData.length) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, backgroundImagesData[i].texture);
                gl.uniform1i(uniformLocations.backgroundImageTextures[i], i);
            }
        }
        
        // Set background image positions and sizes
        if (backgroundImagesData.length > 0) {
            const positions = [];
            const sizes = [];
            for (let i = 0; i < 8; i++) {
                if (i < backgroundImagesData.length) {
                    positions.push(backgroundImagesData[i].position.x, backgroundImagesData[i].position.y);
                    sizes.push(backgroundImagesData[i].size.x, backgroundImagesData[i].size.y);
                } else {
                    positions.push(0, 0);
                    sizes.push(0, 0);
                }
            }
            gl.uniform2fv(uniformLocations.backgroundImagePositions, positions);
            gl.uniform2fv(uniformLocations.backgroundImageSizes, sizes);
        }

        // Set liquid glass shape-specific uniforms with edge distortion thickness validation
        if (liquidGlassParams.shapeType == 0) { // Circle
            gl.uniform1f(uniformLocations.circleRadius, liquidGlassParams.circleRadius);
            // Ensure edge distortion doesn't exceed shape size
            const maxThickness = liquidGlassParams.circleRadius - 5; // Leave 5px minimum for center
            const validatedThickness = Math.min(liquidGlassParams.edgeDistortionThickness, Math.max(0, maxThickness));
            gl.uniform1f(uniformLocations.edgeDistortionThickness, validatedThickness);
        } else { // Rectangle
            gl.uniform2f(uniformLocations.rectangleSize, liquidGlassParams.rectangleWidth, liquidGlassParams.rectangleHeight);
            gl.uniform1f(uniformLocations.rectangleCornerRadius, liquidGlassParams.rectangleCornerRadius);
            // For rectangle, ensure edge distortion doesn't exceed half the smaller dimension
            const characteristicDimension = Math.min(liquidGlassParams.rectangleWidth, liquidGlassParams.rectangleHeight) * 0.5;
            const maxThickness = characteristicDimension - 5; // Leave 5px minimum for center
            const validatedThickness = Math.min(liquidGlassParams.edgeDistortionThickness, Math.max(0, maxThickness));
            gl.uniform1f(uniformLocations.edgeDistortionThickness, validatedThickness);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Initialize the liquid glass application
    initializeLiquidGlassControls();
    resizeCanvas();
    updateControlPanelPosition();
}
