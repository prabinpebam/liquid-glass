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
        uniform sampler2D u_imageTexture;
        uniform vec2 u_imagePosition;
        uniform vec2 u_imageSize;

        // Shape specific uniforms
        uniform int u_shapeType;
        uniform float u_diskRadius;
        uniform vec2 u_rectSize;
        uniform float u_rectCornerRadius;
        uniform float u_distortingRingThickness;

        float sdRoundedBox( vec2 p, vec2 b, float r ) {
            vec2 q = abs(p) - b + r;
            return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
        }

        vec4 getBackgroundPatternColor(vec2 coord, float spacing, vec4 gridLineCol, vec4 pageBgCol) {
            vec4 color = pageBgCol;

            // Draw uploaded image if available
            if (u_hasImage) {
                vec2 imageMin = u_imagePosition;
                vec2 imageMax = u_imagePosition + u_imageSize;
                
                if (coord.x >= imageMin.x && coord.x <= imageMax.x && 
                    coord.y >= imageMin.y && coord.y <= imageMax.y) {
                    vec2 uv = (coord - imageMin) / u_imageSize;
                    uv.y = 1.0 - uv.y; // Flip Y for texture sampling
                    vec4 imageColor = texture2D(u_imageTexture, uv);
                    color = mix(color, imageColor, imageColor.a);
                }
            }

            // Overlay grid lines if enabled
            if (u_showGrid) {
                vec2 gridPos = mod(coord, spacing);
                float lineThickness = 1.0;
                if (gridPos.x < lineThickness || gridPos.y < lineThickness) {
                    color = mix(color, gridLineCol, gridLineCol.a * 0.8);
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

            if (is_outside_shape_influence) {
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
        imageTexture: gl.getUniformLocation(shaderProgram, "u_imageTexture"),
        imagePosition: gl.getUniformLocation(shaderProgram, "u_imagePosition"),
        imageSize: gl.getUniformLocation(shaderProgram, "u_imageSize")
    };

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
    let imageData = {
        texture: null,
        position: { x: 100, y: 100 },
        size: { x: 200, y: 150 },
        hasImage: false
    };

    const gridLineColorVal = [0, 0, 0, 0.08];
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
        imageUpload: document.getElementById('imageUpload')
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
        if (!file) return;

        const img = new Image();
        img.onload = function() {
            // Create texture
            if (imageData.texture) {
                gl.deleteTexture(imageData.texture);
            }
            
            imageData.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, imageData.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // Set image size maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            imageData.size.x = 300;
            imageData.size.y = 300 / aspectRatio;
            imageData.hasImage = true;
            
            requestAnimationFrame(render);
        };
        img.src = URL.createObjectURL(file);
    }

    // Interaction handling
    let isDragging = false;
    let isResizing = false;
    let dragTarget = null; // 'shape', 'image'
    let resizeHandle = null; // 'shape', 'image'
    let dragStartX, dragStartY;
    let initialShapeCenterX, initialShapeCenterY;
    let initialImagePos, initialImageSize;

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
        if (!imageData.hasImage) return false;
        return x >= imageData.position.x && x <= imageData.position.x + imageData.size.x &&
               y >= imageData.position.y && y <= imageData.position.y + imageData.size.y;
    }

    function getResizeHandle(x, y) {
        const edgeThreshold = 10;
        
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
        
        // Check image resize handles
        if (imageData.hasImage) {
            const imgRight = imageData.position.x + imageData.size.x;
            const imgTop = imageData.position.y + imageData.size.y;
            
            if (Math.abs(x - imgRight) < edgeThreshold && Math.abs(y - imgTop) < edgeThreshold) {
                return 'image';
            }
        }
        
        return null;
    }

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const mousePos = getMousePos(e);
            const dx = mousePos.x - dragStartX;
            const dy = mousePos.y - dragStartY;
            
            if (dragTarget === 'shape') {
                shapeCenterPos.x = initialShapeCenterX + dx;
                shapeCenterPos.y = initialShapeCenterY + dy;
            } else if (dragTarget === 'image') {
                imageData.position.x = initialImagePos.x + dx;
                imageData.position.y = initialImagePos.y + dy;
            }
            requestAnimationFrame(render);
        } else if (isResizing) {
            const mousePos = getMousePos(e);
            const dx = mousePos.x - dragStartX;
            const dy = mousePos.y - dragStartY;
            
            if (resizeHandle === 'shape') {
                if (params.shapeType === 0) {
                    const newRadius = Math.max(20, params.diskPhysicalRadius + dx * 0.5);
                    params.diskPhysicalRadius = newRadius;
                    ui.diskRadius.slider.value = newRadius;
                    ui.diskRadius.valueDisplay.textContent = newRadius;
                } else {
                    params.rectWidth = Math.max(50, initialImageSize.x + dx);
                    params.rectHeight = Math.max(50, initialImageSize.y + dy);
                    ui.rectWidth.slider.value = params.rectWidth;
                    ui.rectWidth.valueDisplay.textContent = params.rectWidth;
                    ui.rectHeight.slider.value = params.rectHeight;
                    ui.rectHeight.valueDisplay.textContent = params.rectHeight;
                }
            } else if (resizeHandle === 'image') {
                imageData.size.x = Math.max(50, initialImageSize.x + dx);
                imageData.size.y = Math.max(50, initialImageSize.y + dy);
            }
            requestAnimationFrame(render);
        } else {
            // Update cursor based on hover
            const mousePos = getMousePos(e);
            const resizeHandleType = getResizeHandle(mousePos.x, mousePos.y);
            
            if (resizeHandleType) {
                canvas.style.cursor = 'nw-resize';
            } else if (isPointInShape(mousePos.x, mousePos.y) || isPointInImage(mousePos.x, mousePos.y)) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const mousePos = getMousePos(e);
        const resizeHandleType = getResizeHandle(mousePos.x, mousePos.y);
        
        dragStartX = mousePos.x;
        dragStartY = mousePos.y;
        
        if (resizeHandleType) {
            isResizing = true;
            resizeHandle = resizeHandleType;
            canvas.style.cursor = 'nw-resize';
            
            if (resizeHandleType === 'shape') {
                initialImageSize = { x: params.rectWidth, y: params.rectHeight };
            } else {
                initialImageSize = { ...imageData.size };
            }
        } else if (isPointInShape(mousePos.x, mousePos.y)) {
            isDragging = true;
            dragTarget = 'shape';
            canvas.style.cursor = 'grabbing';
            initialShapeCenterX = shapeCenterPos.x;
            initialShapeCenterY = shapeCenterPos.y;
        } else if (isPointInImage(mousePos.x, mousePos.y)) {
            isDragging = true;
            dragTarget = 'image';
            canvas.style.cursor = 'grabbing';
            initialImagePos = { ...imageData.position };
        }
        
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging || isResizing) {
            isDragging = false;
            isResizing = false;
            dragTarget = null;
            resizeHandle = null;
            canvas.style.cursor = 'default';
        }
    });
    
    function resizeCanvas() {
        canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (!isDragging) { // Initialize center only if not mid-drag
             shapeCenterPos.x = canvas.width / 2; shapeCenterPos.y = canvas.height / 2;
        }
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
        gl.uniform1i(loc.hasImage, imageData.hasImage);
        
        if (imageData.hasImage && imageData.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, imageData.texture);
            gl.uniform1i(loc.imageTexture, 0);
            gl.uniform2f(loc.imagePosition, imageData.position.x, imageData.position.y);
            gl.uniform2f(loc.imageSize, imageData.size.x, imageData.size.y);
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
}
