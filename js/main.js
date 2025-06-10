const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
    alert('WebGL not supported. Please use a browser that supports WebGL.');
} else {
    const vsSource = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_position * 0.5 + 0.5;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec2 v_texCoord;

        uniform vec2 u_resolution;
        uniform vec2 u_shapeCenter;
        uniform float u_refractionStrength;
        uniform vec4 u_gridLineColor;
        uniform float u_gridSpacing;
        uniform vec4 u_pageBackgroundColor;
        uniform vec4 u_glassBaseColor;
        uniform float u_frostiness;
        uniform bool u_showGrid;
        uniform bool u_hasImage;
        uniform sampler2D u_imageTextures[8];
        uniform vec2 u_imagePositions[8];
        uniform vec2 u_imageSizes[8];
        uniform int u_imageCount;

        // Shape specific uniforms
        uniform int u_shapeType;
        uniform float u_diskRadius;
        uniform vec2 u_rectSize;
        uniform float u_rectCornerRadius;
        uniform float u_distortingRingThickness;

        // Control pane uniforms
        uniform vec2 u_controlPaneCenter;
        uniform vec2 u_controlPaneSize;
        uniform float u_controlPaneCornerRadius;
        uniform float u_controlPaneDistortingRingThickness;

        float sdRoundedBox( vec2 p, vec2 b, float r ) {
            vec2 q = abs(p) - b + r;
            return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
        }

        vec4 getBackgroundPatternColor(vec2 coord, float spacing, vec4 gridLineCol, vec4 pageBgCol) {
            vec4 color = pageBgCol;

            // Draw uploaded images if available
            for (int i = 0; i < 8; i++) {
                if (i >= u_imageCount) break;
                
                vec2 imageMin = u_imagePositions[i];
                vec2 imageMax = u_imagePositions[i] + u_imageSizes[i];
                
                if (coord.x >= imageMin.x && coord.x <= imageMax.x && 
                    coord.y >= imageMin.y && coord.y <= imageMax.y) {
                    vec2 uv = (coord - imageMin) / u_imageSizes[i];
                    uv.y = 1.0 - uv.y; // Flip Y for texture sampling
                    
                    vec4 imageColor;
                    if (i == 0) imageColor = texture2D(u_imageTextures[0], uv);
                    else if (i == 1) imageColor = texture2D(u_imageTextures[1], uv);
                    else if (i == 2) imageColor = texture2D(u_imageTextures[2], uv);
                    else if (i == 3) imageColor = texture2D(u_imageTextures[3], uv);
                    else if (i == 4) imageColor = texture2D(u_imageTextures[4], uv);
                    else if (i == 5) imageColor = texture2D(u_imageTextures[5], uv);
                    else if (i == 6) imageColor = texture2D(u_imageTextures[6], uv);
                    else if (i == 7) imageColor = texture2D(u_imageTextures[7], uv);
                    
                    color = mix(color, imageColor, imageColor.a);
                }
            }

            // Overlay grid lines if enabled
            if (u_showGrid) {
                vec2 gridPos = mod(coord, spacing);
                float lineThickness = 1.0;
                if (gridPos.x < lineThickness || gridPos.y < lineThickness) {
                    color = mix(color, gridLineCol, 1.0); // Make grid more visible
                }
            }

            return color;
        }

        void main() {
            vec2 currentPixelCoord = v_texCoord * u_resolution;
            vec2 p_relativeToCenter = currentPixelCoord - u_shapeCenter;

            float distance_metric;
            bool is_outside_shape_influence = false;
            bool is_in_flat_center = false;
            bool is_in_distorting_ring = false;
            float ringT = 0.0;

            // Check if we're in the control pane first
            vec2 p_relativeToControlPane = currentPixelCoord - u_controlPaneCenter;
            float controlPaneSDF = sdRoundedBox(p_relativeToControlPane, u_controlPaneSize * 0.5, u_controlPaneCornerRadius);
            
            bool is_in_control_pane = false;
            bool is_in_control_pane_ring = false;
            float controlPaneRingT = 0.0;
            
            if (controlPaneSDF <= 0.0) {
                is_in_control_pane = true;
                if (controlPaneSDF > -u_controlPaneDistortingRingThickness) {
                    is_in_control_pane_ring = true;
                    if (u_controlPaneDistortingRingThickness > 0.001) {
                        controlPaneRingT = (controlPaneSDF + u_controlPaneDistortingRingThickness) / u_controlPaneDistortingRingThickness;
                    }
                }
            }

            // Main shape calculations
            if (u_shapeType == 0) { // Disk
                distance_metric = length(p_relativeToCenter);
                float ring_outer_boundary_dist = u_diskRadius;
                float ring_inner_boundary_dist = u_diskRadius - u_distortingRingThickness;

                if (distance_metric > ring_outer_boundary_dist) {
                    is_outside_shape_influence = true;
                } else if (distance_metric <= ring_inner_boundary_dist) {
                    is_in_flat_center = true;
                } else {
                    is_in_distorting_ring = true;
                    if (u_distortingRingThickness > 0.001) {
                        ringT = (distance_metric - ring_inner_boundary_dist) / u_distortingRingThickness;
                    }
                }
            } else if (u_shapeType == 1) { // Rounded Rectangle
                float R = min(u_rectCornerRadius, min(u_rectSize.x*0.5, u_rectSize.y*0.5));
                distance_metric = sdRoundedBox(p_relativeToCenter, u_rectSize * 0.5, R);
                
                float ring_outer_boundary_sdf = 0.0;
                float ring_inner_boundary_sdf = -u_distortingRingThickness;

                if (distance_metric > ring_outer_boundary_sdf) {
                    is_outside_shape_influence = true;
                } else if (distance_metric <= ring_inner_boundary_sdf) {
                    is_in_flat_center = true;
                } else {
                    is_in_distorting_ring = true;
                    if (u_distortingRingThickness > 0.001) {
                         ringT = (distance_metric - ring_inner_boundary_sdf) / u_distortingRingThickness;
                    }
                }
            }

            vec4 outputColor;

            if (is_in_control_pane) {
                // Render control pane glass effect
                vec2 sampleCoord = currentPixelCoord;
                if (is_in_control_pane_ring) {
                    float distortionExponent = 2.0;
                    float distortionMagnitude = 25.0 * pow(clamp(controlPaneRingT, 0.0, 1.0), distortionExponent);
                    sampleCoord = currentPixelCoord - normalize(p_relativeToControlPane) * distortionMagnitude;
                }

                vec4 refractedBgColor;
                if (1.0 > 0.1) { // Frostiness for control pane
                    vec4 sumColor = vec4(0.0);
                    float sampleCount = 0.0;
                    
                    for (int x = -2; x <= 2; x++) {
                        for (int y = -2; y <= 2; y++) {
                            vec2 offset = vec2(float(x), float(y)) * 1.0 * 0.5;
                            vec2 samplePos = sampleCoord + offset;
                            sumColor += getBackgroundPatternColor(samplePos, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                            sampleCount += 1.0;
                        }
                    }
                    refractedBgColor = sumColor / sampleCount;
                } else {
                    refractedBgColor = getBackgroundPatternColor(sampleCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                }

                vec4 controlPaneGlassColor = vec4(250.0/255.0, 250.0/255.0, 255.0/255.0, 0.01);
                outputColor = mix(refractedBgColor, controlPaneGlassColor, controlPaneGlassColor.a);

                if (is_in_control_pane_ring) {
                    float edgeGlow = smoothstep(0.85, 1.0, controlPaneRingT) * 0.15;
                    outputColor.rgb += vec3(edgeGlow);
                }
            } else if (is_outside_shape_influence) {
                outputColor = getBackgroundPatternColor(currentPixelCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
            } else {
                vec2 sampleCoord = currentPixelCoord;
                if (is_in_distorting_ring && u_refractionStrength > 0.0) {
                    float distortionExponent = 2.0;
                    float distortionMagnitude = u_refractionStrength * pow(clamp(ringT, 0.0, 1.0), distortionExponent);
                    sampleCoord = currentPixelCoord - normalize(p_relativeToCenter) * distortionMagnitude;
                }

                vec4 refractedBgColor;
                if (u_frostiness > 0.1) {
                    vec4 sumColor = vec4(0.0);
                    float sampleCount = 0.0;
                    
                    for (int x = -2; x <= 2; x++) {
                        for (int y = -2; y <= 2; y++) {
                            vec2 offset = vec2(float(x), float(y)) * u_frostiness * 0.5;
                            vec2 samplePos = sampleCoord + offset;
                            sumColor += getBackgroundPatternColor(samplePos, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                            sampleCount += 1.0;
                        }
                    }
                    refractedBgColor = sumColor / sampleCount;
                } else {
                    refractedBgColor = getBackgroundPatternColor(sampleCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                }

                outputColor = mix(refractedBgColor, u_glassBaseColor, u_glassBaseColor.a);

                if (is_in_distorting_ring) {
                    float edgeGlow = smoothstep(0.85, 1.0, ringT) * 0.15;
                    outputColor.rgb += vec3(edgeGlow);
                }
            }
            gl_FragColor = outputColor;
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

    const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(vertexShader, fragmentShader);

    const loc = {
        position: gl.getAttribLocation(shaderProgram, "a_position"),
        resolution: gl.getUniformLocation(shaderProgram, "u_resolution"),
        shapeCenter: gl.getUniformLocation(shaderProgram, "u_shapeCenter"),
        refractionStrength: gl.getUniformLocation(shaderProgram, "u_refractionStrength"),
        gridLineColor: gl.getUniformLocation(shaderProgram, "u_gridLineColor"),
        gridSpacing: gl.getUniformLocation(shaderProgram, "u_gridSpacing"),
        pageBackgroundColor: gl.getUniformLocation(shaderProgram, "u_pageBackgroundColor"),
        glassBaseColor: gl.getUniformLocation(shaderProgram, "u_glassBaseColor"),
        shapeType: gl.getUniformLocation(shaderProgram, "u_shapeType"),
        diskRadius: gl.getUniformLocation(shaderProgram, "u_diskRadius"),
        rectSize: gl.getUniformLocation(shaderProgram, "u_rectSize"),
        rectCornerRadius: gl.getUniformLocation(shaderProgram, "u_rectCornerRadius"),
        distortingRingThickness: gl.getUniformLocation(shaderProgram, "u_distortingRingThickness"),
        frostiness: gl.getUniformLocation(shaderProgram, "u_frostiness"),
        showGrid: gl.getUniformLocation(shaderProgram, "u_showGrid"),
        hasImage: gl.getUniformLocation(shaderProgram, "u_hasImage"),
        imageTextures: [],
        imagePositions: gl.getUniformLocation(shaderProgram, "u_imagePositions"),
        imageSizes: gl.getUniformLocation(shaderProgram, "u_imageSizes"),
        imageCount: gl.getUniformLocation(shaderProgram, "u_imageCount"),
        controlPaneCenter: gl.getUniformLocation(shaderProgram, "u_controlPaneCenter"),
        controlPaneSize: gl.getUniformLocation(shaderProgram, "u_controlPaneSize"),
        controlPaneCornerRadius: gl.getUniformLocation(shaderProgram, "u_controlPaneCornerRadius"),
        controlPaneDistortingRingThickness: gl.getUniformLocation(shaderProgram, "u_controlPaneDistortingRingThickness")
    };

    // Initialize texture uniform locations
    for (let i = 0; i < 8; i++) {
        loc.imageTextures[i] = gl.getUniformLocation(shaderProgram, `u_imageTextures[${i}]`);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    let params = {
        shapeType: 0, // 0: Disk, 1: Rounded Rectangle
        diskPhysicalRadius: 150,
        rectWidth: 300,
        rectHeight: 200,
        rectCornerRadius: 30,
        innerRadiusFactor: 0.8, 
        refractionStrength: 25.0,
        gridSpacing: 25.0,
        glassBaseColor: [250/255, 250/255, 255/255, 0.10],
        frostiness: 0.0,
        showGrid: true
    };
    
    let shapeCenterPos = { x: 0, y: 0 };
    let imagesData = [];
    
    // Control pane properties
    let controlPanePos = { x: 0, y: 0 };
    let controlPaneSize = { x: 340, y: 500 }; // Make this dynamic
    const controlPaneCornerRadius = 20;
    const controlPaneInnerFactor = 0.82;
    
    // Cache for performance optimization
    let canvasRect = null;
    let lastRectUpdate = 0;
    const RECT_UPDATE_INTERVAL = 100; // Update canvas rect every 100ms max

    // Interaction handling variables
    let isDragging = false;
    let isResizing = false;
    let isDraggingControlPane = false;
    let dragTarget = null; // 'shape', or image index
    let resizeHandle = null; // 'shape', or image index
    let dragStartX, dragStartY;
    let initialShapeCenterX, initialShapeCenterY;
    let initialImagePos, initialImageSize;
    let initialControlPanePos;

    const gridLineColorVal = [0, 0, 0, 0.15]; // Make grid more visible
    const pageBackgroundColorVal = [221/255, 225/255, 231/255, 1.0];

    const ui = {
        shapeType: document.getElementById('shapeTypeSelector'),
        diskControlsDiv: document.getElementById('diskControls'),
        rectControlsDiv: document.getElementById('rectControls'),
        diskRadius: { slider: document.getElementById('diskRadiusSlider'), valueDisplay: document.getElementById('diskRadiusValue') },
        rectWidth: { slider: document.getElementById('rectWidthSlider'), valueDisplay: document.getElementById('rectWidthValue') },
        rectHeight: { slider: document.getElementById('rectHeightSlider'), valueDisplay: document.getElementById('rectHeightValue') },
        rectCornerRadius: { slider: document.getElementById('rectCornerRadiusSlider'), valueDisplay: document.getElementById('rectCornerRadiusValue') },
        innerRadiusFactor: { slider: document.getElementById('innerRadiusFactorSlider'), valueDisplay: document.getElementById('innerRadiusFactorValue') },
        refractionStrength: { slider: document.getElementById('refractionStrengthSlider'), valueDisplay: document.getElementById('refractionStrengthValue') },
        gridSpacing: { slider: document.getElementById('gridSpacingSlider'), valueDisplay: document.getElementById('gridSpacingValue') },
        glassAlpha: { slider: document.getElementById('glassAlphaSlider'), valueDisplay: document.getElementById('glassAlphaValue') },
        frostiness: { slider: document.getElementById('frostinessSlider'), valueDisplay: document.getElementById('frostinessValue') },
        gridToggle: document.getElementById('gridToggle'),
        imageUpload: document.getElementById('imageUpload'),
        controlsPane: document.getElementById('controls-pane'),
        controlsTitle: document.getElementById('controls-title')
    };

    function updateControlsVisibility() {
        if (params.shapeType == 0) { // Disk
            ui.diskControlsDiv.style.display = 'block';
            ui.rectControlsDiv.style.display = 'none';
        } else { // Rectangle
            ui.diskControlsDiv.style.display = 'none';
            ui.rectControlsDiv.style.display = 'block';
        }
    }

    function initializeControls() {
        ui.shapeType.value = params.shapeType;
        updateControlsVisibility();
        ui.shapeType.addEventListener('change', (e) => {
            params.shapeType = parseInt(e.target.value);
            updateControlsVisibility();
            requestAnimationFrame(render);
        });

        ['diskRadius', 'rectWidth', 'rectHeight', 'rectCornerRadius', 'innerRadiusFactor', 'refractionStrength', 'gridSpacing', 'frostiness'].forEach(key => {
            if (!ui[key] || !ui[key].slider) return; 
            let paramKey = key;
            if (key === 'diskRadius') paramKey = 'diskPhysicalRadius'; // mapping
            else if (key === 'rectWidth') paramKey = 'rectWidth';
            else if (key === 'rectHeight') paramKey = 'rectHeight';
            else if (key === 'rectCornerRadius') paramKey = 'rectCornerRadius';
            // frostiness maps directly to params.frostiness, no special paramKey needed


            ui[key].slider.value = params[paramKey];
            ui[key].valueDisplay.textContent = params[paramKey];
            ui[key].slider.addEventListener('input', (e) => {
                params[paramKey] = parseFloat(e.target.value);
                ui[key].valueDisplay.textContent = params[paramKey];
                requestAnimationFrame(render);
            });
        });
        
        ui.glassAlpha.slider.value = params.glassBaseColor[3];
        ui.glassAlpha.valueDisplay.textContent = params.glassBaseColor[3].toFixed(2);
        ui.glassAlpha.slider.addEventListener('input', (e) => {
            params.glassBaseColor[3] = parseFloat(e.target.value);
            ui.glassAlpha.valueDisplay.textContent = params.glassBaseColor[3].toFixed(2);
            requestAnimationFrame(render);
        });

        // Grid toggle
        ui.gridToggle.checked = params.showGrid;
        ui.gridToggle.addEventListener('change', (e) => {
            params.showGrid = e.target.checked;
            requestAnimationFrame(render);
        });

        // Image upload
        ui.imageUpload.addEventListener('change', handleImageUpload);
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file || imagesData.length >= 8) return; // Limit to 8 images

        const img = new Image();
        img.onload = function() {
            // Create texture
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // Set image size maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            const imageData = {
                texture: texture,
                position: { x: 100 + imagesData.length * 50, y: 100 + imagesData.length * 50 },
                size: { x: 300, y: 300 / aspectRatio }
            };
            
            imagesData.push(imageData);
            requestAnimationFrame(render);
        };
        img.src = URL.createObjectURL(file);
        
        // Clear the input so the same file can be uploaded again
        event.target.value = '';
    }

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: canvas.height - (e.clientY - rect.top) // Flip Y coordinate
        };
    }

    function isPointInShape(x, y) {
        const dx = x - shapeCenterPos.x;
        const dy = y - shapeCenterPos.y;
        
        if (params.shapeType === 0) { // Disk
            return Math.sqrt(dx * dx + dy * dy) <= params.diskPhysicalRadius;
        } else { // Rectangle
            const halfW = params.rectWidth * 0.5;
            const halfH = params.rectHeight * 0.5;
            return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
        }
    }

    function isPointInImage(x, y) {
        for (let i = imagesData.length - 1; i >= 0; i--) { // Check from top to bottom
            const img = imagesData[i];
            if (x >= img.position.x && x <= img.position.x + img.size.x &&
                y >= img.position.y && y <= img.position.y + img.size.y) {
                return i;
            }
        }
        return -1;
    }

    function getResizeHandle(x, y) {
        const edgeThreshold = 15;
        
        // Check shape resize handles
        if (isPointInShape(x, y)) {
            const dx = x - shapeCenterPos.x;
            const dy = y - shapeCenterPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (params.shapeType === 0 && Math.abs(dist - params.diskPhysicalRadius) < edgeThreshold) {
                return 'shape';
            } else if (params.shapeType === 1) {
                const halfW = params.rectWidth * 0.5;
                const halfH = params.rectHeight * 0.5;
                if (Math.abs(Math.abs(dx) - halfW) < edgeThreshold || Math.abs(Math.abs(dy) - halfH) < edgeThreshold) {
                    return 'shape';
                }
            }
        }
        
        // Check image resize handles (bottom-right corner)
        for (let i = imagesData.length - 1; i >= 0; i--) {
            const img = imagesData[i];
            const imgRight = img.position.x + img.size.x;
            const imgTop = img.position.y + img.size.y;
            
            if (Math.abs(x - imgRight) < edgeThreshold && Math.abs(y - imgTop) < edgeThreshold) {
                return i;
            }
        }
        
        return null;
    }

    function updateControlPanePosition() {
        const now = Date.now();
        if (!canvasRect || now - lastRectUpdate > RECT_UPDATE_INTERVAL) {
            canvasRect = canvas.getBoundingClientRect();
            lastRectUpdate = now;
        }
        
        const htmlPaneRect = ui.controlsPane.getBoundingClientRect();
        
        // Update control pane size to match actual HTML pane dimensions
        controlPaneSize.x = htmlPaneRect.width;
        controlPaneSize.y = htmlPaneRect.height;
        
        // Convert HTML pane position to canvas coordinates
        controlPanePos.x = (htmlPaneRect.left - canvasRect.left) + controlPaneSize.x * 0.5;
        controlPanePos.y = canvas.height - (htmlPaneRect.top - canvasRect.top) - controlPaneSize.y * 0.5;
    }

    function syncHTMLPanePosition() {
        // Use cached canvas rect if available and recent
        const now = Date.now();
        if (!canvasRect || now - lastRectUpdate > RECT_UPDATE_INTERVAL) {
            canvasRect = canvas.getBoundingClientRect();
            lastRectUpdate = now;
        }
        
        const htmlLeft = controlPanePos.x - controlPaneSize.x * 0.5;
        const htmlTop = canvas.height - controlPanePos.y - controlPaneSize.y * 0.5;
        
        // Use transform instead of changing left/top for better performance
        ui.controlsPane.style.transform = `translate(${htmlLeft}px, ${htmlTop}px)`;
        ui.controlsPane.style.left = '0px';
        ui.controlsPane.style.top = '0px';
        ui.controlsPane.style.right = 'auto';
    }

    // Control pane drag functionality
    ui.controlsTitle.addEventListener('mousedown', (e) => {
        isDraggingControlPane = true;
        ui.controlsTitle.style.cursor = 'grabbing';
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialControlPanePos = { ...controlPanePos };
        
        // Cache canvas rect at start of drag for consistent calculations
        canvasRect = canvas.getBoundingClientRect();
        lastRectUpdate = Date.now();
        
        e.preventDefault();
        e.stopPropagation();
    });

    // Document-level mouse move handler for control pane dragging
    document.addEventListener('mousemove', (e) => {
        if (isDraggingControlPane) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            
            controlPanePos.x = initialControlPanePos.x + dx;
            controlPanePos.y = initialControlPanePos.y - dy; // Flip Y
            
            // Only sync HTML position, don't re-render canvas every frame
            syncHTMLPanePosition();
            
            // Throttle canvas rendering during drag
            if (Date.now() - lastRectUpdate > 16) { // ~60fps max
                requestAnimationFrame(render);
            }
            return;
        }
    });

    // Canvas-specific mouse move handler for shapes and images
    canvas.addEventListener('mousemove', (e) => {
        if (isDraggingControlPane) return;
        
        if (isDragging) {
            const mousePos = getMousePos(e);
            const dx = mousePos.x - dragStartX;
            const dy = mousePos.y - dragStartY;
            
            if (dragTarget === 'shape') {
                shapeCenterPos.x = initialShapeCenterX + dx;
                shapeCenterPos.y = initialShapeCenterY + dy;
            } else if (typeof dragTarget === 'number') {
                imagesData[dragTarget].position.x = initialImagePos.x + dx;
                imagesData[dragTarget].position.y = initialImagePos.y + dy;
            }
            requestAnimationFrame(render);
        } else if (isResizing) {
            const mousePos = getMousePos(e);
            const dx = mousePos.x - dragStartX;
            const dy = mousePos.y - dragStartY;
            
            if (resizeHandle === 'shape') {
                if (params.shapeType === 0) {
                    // Reduce sensitivity by using smaller multiplier
                    const newRadius = Math.max(20, params.diskPhysicalRadius + dx * 0.2);
                    params.diskPhysicalRadius = newRadius;
                    ui.diskRadius.slider.value = newRadius;
                    ui.diskRadius.valueDisplay.textContent = Math.round(newRadius);
                } else {
                    params.rectWidth = Math.max(50, initialImageSize.x + dx);
                    params.rectHeight = Math.max(50, initialImageSize.y + dy);
                    ui.rectWidth.slider.value = params.rectWidth;
                    ui.rectWidth.valueDisplay.textContent = Math.round(params.rectWidth);
                    ui.rectHeight.slider.value = params.rectHeight;
                    ui.rectHeight.valueDisplay.textContent = Math.round(params.rectHeight);
                }
            } else if (typeof resizeHandle === 'number') {
                imagesData[resizeHandle].size.x = Math.max(50, initialImageSize.x + dx);
                imagesData[resizeHandle].size.y = Math.max(50, initialImageSize.y + dy);
            }
            requestAnimationFrame(render);
        } else {
            // Update cursor based on hover
            const mousePos = getMousePos(e);
            const resizeHandleType = getResizeHandle(mousePos.x, mousePos.y);
            
            if (resizeHandleType !== null) {
                canvas.style.cursor = 'nw-resize';
            } else if (isPointInShape(mousePos.x, mousePos.y) || isPointInImage(mousePos.x, mousePos.y) !== -1) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        // Only handle canvas interactions if not dragging control pane
        if (isDraggingControlPane) return;
        
        const mousePos = getMousePos(e);
        const resizeHandleType = getResizeHandle(mousePos.x, mousePos.y);
        
        dragStartX = mousePos.x;
        dragStartY = mousePos.y;
        
        if (resizeHandleType !== null) {
            isResizing = true;
            resizeHandle = resizeHandleType;
            canvas.style.cursor = 'nw-resize';
            
            if (resizeHandleType === 'shape') {
                initialImageSize = { x: params.rectWidth, y: params.rectHeight };
            } else {
                initialImageSize = { ...imagesData[resizeHandleType].size };
            }
        } else if (isPointInShape(mousePos.x, mousePos.y)) {
            isDragging = true;
            dragTarget = 'shape';
            canvas.style.cursor = 'grabbing';
            initialShapeCenterX = shapeCenterPos.x;
            initialShapeCenterY = shapeCenterPos.y;
        } else {
            const imageIndex = isPointInImage(mousePos.x, mousePos.y);
            if (imageIndex !== -1) {
                isDragging = true;
                dragTarget = imageIndex;
                canvas.style.cursor = 'grabbing';
                initialImagePos = { ...imagesData[imageIndex].position };
            }
        }
        
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingControlPane) {
            isDraggingControlPane = false;
            ui.controlsTitle.style.cursor = 'grab';
        }
        if (isDragging || isResizing) {
            isDragging = false;
            isResizing = false;
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
        
        if (!isDragging) {
            shapeCenterPos.x = canvas.width / 2; 
            shapeCenterPos.y = canvas.height / 2;
        }
        
        updateControlPanePosition();
        requestAnimationFrame(render);
    }
    window.addEventListener('resize', resizeCanvas);
    
    function render() {
        if (!gl || !shaderProgram) return;

        gl.clearColor(pageBackgroundColorVal[0], pageBackgroundColorVal[1], pageBackgroundColorVal[2], pageBackgroundColorVal[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(shaderProgram);
        gl.enableVertexAttribArray(loc.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(loc.position, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(loc.resolution, canvas.width, canvas.height);
        gl.uniform2f(loc.shapeCenter, shapeCenterPos.x, shapeCenterPos.y);
        gl.uniform1f(loc.refractionStrength, params.refractionStrength);
        gl.uniform4fv(loc.gridLineColor, gridLineColorVal);
        gl.uniform1f(loc.gridSpacing, params.gridSpacing);
        gl.uniform4fv(loc.pageBackgroundColor, pageBackgroundColorVal);
        gl.uniform4fv(loc.glassBaseColor, params.glassBaseColor);
        
        gl.uniform1i(loc.shapeType, params.shapeType);
        gl.uniform1f(loc.frostiness, params.frostiness);
        gl.uniform1i(loc.showGrid, params.showGrid);
        gl.uniform1i(loc.hasImage, imagesData.length > 0);
        gl.uniform1i(loc.imageCount, imagesData.length);

        // Control pane uniforms
        gl.uniform2f(loc.controlPaneCenter, controlPanePos.x, controlPanePos.y);
        gl.uniform2f(loc.controlPaneSize, controlPaneSize.x, controlPaneSize.y);
        gl.uniform1f(loc.controlPaneCornerRadius, controlPaneCornerRadius);
        
        const controlPaneRingThickness = Math.min(controlPaneSize.x, controlPaneSize.y) * 0.5 * (1.0 - controlPaneInnerFactor);
        gl.uniform1f(loc.controlPaneDistortingRingThickness, controlPaneRingThickness);
        
        // Set up image textures and data
        for (let i = 0; i < 8; i++) {
            if (i < imagesData.length) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, imagesData[i].texture);
                gl.uniform1i(loc.imageTextures[i], i);
            }
        }
        
        // Set image positions and sizes
        if (imagesData.length > 0) {
            const positions = [];
            const sizes = [];
            for (let i = 0; i < 8; i++) {
                if (i < imagesData.length) {
                    positions.push(imagesData[i].position.x, imagesData[i].position.y);
                    sizes.push(imagesData[i].size.x, imagesData[i].size.y);
                } else {
                    positions.push(0, 0);
                    sizes.push(0, 0);
                }
            }
            gl.uniform2fv(loc.imagePositions, positions);
            gl.uniform2fv(loc.imageSizes, sizes);
        }

        let currentDistortingRingThickness = 0;
        if (params.shapeType == 0) {
            gl.uniform1f(loc.diskRadius, params.diskPhysicalRadius);
            currentDistortingRingThickness = params.diskPhysicalRadius * (1.0 - params.innerRadiusFactor);
        } else {
            gl.uniform2f(loc.rectSize, params.rectWidth, params.rectHeight);
            gl.uniform1f(loc.rectCornerRadius, params.rectCornerRadius);
            let characteristicRectDim = Math.min(params.rectWidth, params.rectHeight) * 0.5;
            currentDistortingRingThickness = characteristicRectDim * (1.0 - params.innerRadiusFactor);
        }
        gl.uniform1f(loc.distortingRingThickness, Math.max(0.0, currentDistortingRingThickness));

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    initializeControls();
    resizeCanvas();
    updateControlPanePosition(); // Initialize control pane position
}
