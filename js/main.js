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
        uniform vec2 u_shapeCenter; // Renamed from u_diskCenter
        uniform float u_refractionStrength;
        uniform vec4 u_gridLineColor;
        uniform float u_gridSpacing;
        uniform vec4 u_pageBackgroundColor;
        uniform vec4 u_glassBaseColor;

        // Shape specific uniforms
        uniform int u_shapeType; // 0 for Disk, 1 for Rounded Rectangle
        uniform float u_diskRadius;
        uniform vec2 u_rectSize;
        uniform float u_rectCornerRadius;
        uniform float u_distortingRingThickness; // Thickness of the distorting band

        // SDF for a Rounded Box from Inigo Quilez
        // p: point
        // b: half-dimensions of box
        // r: corner radius
        float sdRoundedBox( vec2 p, vec2 b, float r ) {
            vec2 q = abs(p) - b + r;
            return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
        }

        vec4 getGridColor(vec2 coord, float spacing, vec4 lineColor, vec4 bgColor) {
            vec2 gridPos = mod(coord, spacing);
            float lineThickness = 1.0;
            if (gridPos.x < lineThickness || gridPos.y < lineThickness) {
                return lineColor;
            }
            return bgColor;
        }

        void main() {
            vec2 currentPixelCoord = v_texCoord * u_resolution;
            vec2 p_relativeToCenter = currentPixelCoord - u_shapeCenter;

            float distance_metric; // For disk: distance from center. For rect SDF: distance to surface.
            bool is_outside_shape_influence = false;
            bool is_in_flat_center = false;
            bool is_in_distorting_ring = false;
            float ringT = 0.0; // Normalized position within the ring (0 at inner edge, 1 at outer edge)

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
                    if (u_distortingRingThickness > 0.001) { // Avoid division by zero
                        ringT = (distance_metric - ring_inner_boundary_dist) / u_distortingRingThickness;
                    }
                }
            } else if (u_shapeType == 1) { // Rounded Rectangle
                // Ensure corner radius is not too large for the dimensions
                float R = min(u_rectCornerRadius, min(u_rectSize.x*0.5, u_rectSize.y*0.5));
                distance_metric = sdRoundedBox(p_relativeToCenter, u_rectSize * 0.5, R);
                
                float ring_outer_boundary_sdf = 0.0; // Surface of the rectangle
                float ring_inner_boundary_sdf = -u_distortingRingThickness;

                if (distance_metric > ring_outer_boundary_sdf) { // Technically, > a small epsilon for antialiasing, but 0 is fine for this
                    is_outside_shape_influence = true;
                } else if (distance_metric <= ring_inner_boundary_sdf) {
                    is_in_flat_center = true;
                } else {
                    is_in_distorting_ring = true;
                    if (u_distortingRingThickness > 0.001) { // Avoid division by zero
                         ringT = (distance_metric - ring_inner_boundary_sdf) / u_distortingRingThickness;
                    }
                }
            }

            vec4 outputColor;

            if (is_outside_shape_influence) {
                outputColor = getGridColor(currentPixelCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
            } else {
                vec2 sampleCoord = currentPixelCoord;
                if (is_in_distorting_ring && u_refractionStrength > 0.0) {
                    float distortionExponent = 2.0; 
                    float distortionMagnitude = u_refractionStrength * pow(clamp(ringT, 0.0, 1.0), distortionExponent);
                    sampleCoord = currentPixelCoord - normalize(p_relativeToCenter) * distortionMagnitude; 
                                       // For rect, p_relativeToCenter might not be the best normal for displacement if inside.
                                       // A proper normal would be dFdx/dFdy of the SDF. For simplicity, radial is used.
                }

                vec4 refractedGridColor = getGridColor(sampleCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                outputColor = mix(refractedGridColor, u_glassBaseColor, u_glassBaseColor.a);

                // Highlights (apply to the entire shape, not just ring)
                float edge_highlight_intensity = 0.0;
                if (is_in_distorting_ring) { // Highlight stronger at the very edge of the ring
                     edge_highlight_intensity = smoothstep(0.9, 1.0, clamp(ringT,0.0,1.0));
                } else if (is_in_flat_center && u_shapeType == 0 && distance_metric > u_diskRadius - u_distortingRingThickness - 5.0) {
                     // Slight highlight near the inner edge of flat disk part if ring is thin
                } else if (is_in_flat_center && u_shapeType == 1 && distance_metric > -u_distortingRingThickness - 5.0) {
                     // Slight highlight near inner edge of flat rect part
                }


                if (u_shapeType == 0) { // Disk specific highlight logic
                    float outerEdgeFactor = smoothstep(u_diskRadius - 5.0, u_diskRadius, length(p_relativeToCenter));
                     outputColor.rgb += vec3(0.1,0.1,0.12) * outerEdgeFactor * (1.0 - u_glassBaseColor.a) * edge_highlight_intensity;
                } else if (u_shapeType == 1) { // Rect specific highlight logic
                    // For rect, use SDF to determine closeness to edge for highlight
                    float sdf_val = sdRoundedBox(p_relativeToCenter, u_rectSize * 0.5, min(u_rectCornerRadius, min(u_rectSize.x*0.5, u_rectSize.y*0.5)));
                    float outerEdgeFactor = smoothstep(-5.0, 0.0, sdf_val); // Highlight when close to surface (sdf ~ 0)
                    outputColor.rgb += vec3(0.1,0.1,0.12) * outerEdgeFactor * (1.0 - u_glassBaseColor.a) * edge_highlight_intensity;
                }


                float dotProd = dot(normalize(p_relativeToCenter), normalize(vec2(0.7,0.7)));
                float generalHighlight = pow(max(0.0, dotProd), 20.0) * 0.1;
                // Apply general highlight if not already strongly highlighted by edge effect
                if ( (u_shapeType == 0 && length(p_relativeToCenter) < u_diskRadius * 0.95) ||
                     (u_shapeType == 1 && sdRoundedBox(p_relativeToCenter, u_rectSize * 0.5, min(u_rectCornerRadius, min(u_rectSize.x*0.5, u_rectSize.y*0.5))) < -5.0) ) {
                   outputColor.rgb += generalHighlight * (1.0 - u_glassBaseColor.a);
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
        distortingRingThickness: gl.getUniformLocation(shaderProgram, "u_distortingRingThickness")
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
        innerRadiusFactor: 0.8, // Determines non-distorting part relative to size
        refractionStrength: 25.0,
        gridSpacing: 25.0,
        glassBaseColor: [250/255, 250/255, 255/255, 0.10]
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
        glassAlpha: { slider: document.getElementById('glassAlphaSlider'), valueDisplay: document.getElementById('glassAlphaValue') }
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

        ['diskRadius', 'rectWidth', 'rectHeight', 'rectCornerRadius', 'innerRadiusFactor', 'refractionStrength', 'gridSpacing'].forEach(key => {
            if (!ui[key]) return; // Skip if control doesn't exist (e.g. for common ones)
            let paramKey = key;
            if (key === 'diskRadius') paramKey = 'diskPhysicalRadius'; // mapping
            else if (key === 'rectWidth') paramKey = 'rectWidth';
            else if (key === 'rectHeight') paramKey = 'rectHeight';
            else if (key === 'rectCornerRadius') paramKey = 'rectCornerRadius';


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
