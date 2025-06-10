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

        // Hash function for pseudo-random numbers
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        vec4 getBackgroundPatternColor(vec2 coord, float spacing, vec4 gridLineCol, vec4 pageBgCol) {
            vec4 color = pageBgCol;

            // Add text-like rectangles
            vec2 textPos1 = u_resolution * vec2(0.15, 0.8);
            for (int i = 0; i < 8; i++) {
                vec2 rectPos = textPos1 + vec2(float(i) * spacing * 0.6, 0.0);
                vec2 rectSize = vec2(spacing * 0.4, spacing * 0.15);
                if (abs(coord.x - rectPos.x) < rectSize.x && abs(coord.y - rectPos.y) < rectSize.y) {
                    color = mix(color, vec4(0.2, 0.2, 0.2, 1.0), 0.8);
                }
            }

            // Add more text lines
            for (int line = 0; line < 5; line++) {
                vec2 lineStart = u_resolution * vec2(0.1, 0.7 - float(line) * 0.08);
                for (int i = 0; i < 12; i++) {
                    vec2 rectPos = lineStart + vec2(float(i) * spacing * 0.5, 0.0);
                    vec2 rectSize = vec2(spacing * 0.3, spacing * 0.12);
                    if (abs(coord.x - rectPos.x) < rectSize.x && abs(coord.y - rectPos.y) < rectSize.y) {
                        color = mix(color, vec4(0.3, 0.3, 0.3, 1.0), 0.7);
                    }
                }
            }

            // Add colorful shapes (simulating icons/emojis)
            vec2 circle1_center = u_resolution * vec2(0.25, 0.3);
            float circle1_radius = spacing * 1.2;
            if (length(coord - circle1_center) < circle1_radius) {
                color = mix(color, vec4(1.0, 0.6, 0.2, 1.0), 0.8); // Orange circle
            }

            vec2 circle2_center = u_resolution * vec2(0.7, 0.6);
            float circle2_radius = spacing * 0.8;
            if (length(coord - circle2_center) < circle2_radius) {
                color = mix(color, vec4(0.2, 0.8, 0.4, 1.0), 0.8); // Green circle
            }

            vec2 circle3_center = u_resolution * vec2(0.8, 0.2);
            float circle3_radius = spacing * 1.0;
            if (length(coord - circle3_center) < circle3_radius) {
                color = mix(color, vec4(0.3, 0.5, 1.0, 1.0), 0.8); // Blue circle
            }

            // Add diamond shapes
            vec2 diamond1 = u_resolution * vec2(0.5, 0.25);
            vec2 dp = coord - diamond1;
            if (abs(dp.x) + abs(dp.y) < spacing * 0.7) {
                color = mix(color, vec4(0.9, 0.3, 0.7, 1.0), 0.7); // Pink diamond
            }

            // Add triangular shapes
            vec2 tri1 = u_resolution * vec2(0.4, 0.7);
            vec2 tp = coord - tri1;
            if (tp.y > 0.0 && tp.y < spacing * 0.8 && abs(tp.x) < (spacing * 0.8 - tp.y)) {
                color = mix(color, vec4(0.8, 0.8, 0.2, 1.0), 0.6); // Yellow triangle
            }

            // Overlay grid lines on top of everything
            vec2 gridPos = mod(coord, spacing);
            float lineThickness = 1.0;
            if (gridPos.x < lineThickness || gridPos.y < lineThickness) {
                color = mix(color, gridLineCol, gridLineCol.a * 0.8);
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
                    // Multi-sample blur for frosted glass effect
                    vec4 sumColor = vec4(0.0);
                    float sampleCount = 0.0;
                    
                    // Use a larger sampling pattern for better blur
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

                // Minimal edge highlight only (removed all other reflections)
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
        frostiness: gl.getUniformLocation(shaderProgram, "u_frostiness")
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
        frostiness: 0.0
    };
    
    let shapeCenterPos = { x: 0, y: 0 };
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
        frostiness: { slider: document.getElementById('frostinessSlider'), valueDisplay: document.getElementById('frostinessValue') }
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
    }

    let isDragging = false;
    let dragStartX, dragStartY;
    let initialShapeCenterX, initialShapeCenterY;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        dragStartX = e.clientX; dragStartY = e.clientY;
        initialShapeCenterX = shapeCenterPos.x; initialShapeCenterY = shapeCenterPos.y;
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        shapeCenterPos.x = initialShapeCenterX + (e.clientX - dragStartX);
        shapeCenterPos.y = initialShapeCenterY - (e.clientY - dragStartY); // Y flip
        requestAnimationFrame(render);
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) { isDragging = false; canvas.style.cursor = 'grab';}
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

        let currentDistortingRingThickness = 0;
        if (params.shapeType == 0) { // Disk
            gl.uniform1f(loc.diskRadius, params.diskPhysicalRadius);
            currentDistortingRingThickness = params.diskPhysicalRadius * (1.0 - params.innerRadiusFactor);
        } else { // Rectangle
            gl.uniform2f(loc.rectSize, params.rectWidth, params.rectHeight);
            gl.uniform1f(loc.rectCornerRadius, params.rectCornerRadius);
            // Base thickness calculation on the smaller dimension of the rectangle for consistency
            let characteristicRectDim = Math.min(params.rectWidth, params.rectHeight) * 0.5;
            currentDistortingRingThickness = characteristicRectDim * (1.0 - params.innerRadiusFactor);
        }
        gl.uniform1f(loc.distortingRingThickness, Math.max(0.0, currentDistortingRingThickness)); // Ensure non-negative

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    initializeControls();
    resizeCanvas();
}
