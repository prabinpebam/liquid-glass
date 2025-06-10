const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
    alert('WebGL not supported. Please use a browser that supports WebGL.');
    // Fallback or error message
} else {
    // Shader sources
    const vsSource = `
        attribute vec2 a_position; // Vertices of a quad (-1 to 1)
        varying vec2 v_texCoord;   // Tex Coords (0 to 1) for fragment shader

        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            // Convert from clip space (-1 to 1) to texture space (0 to 1)
            v_texCoord = a_position * 0.5 + 0.5;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec2 v_texCoord; // Normalized 0-1 coordinates for the canvas

        uniform vec2 u_resolution;          // Canvas dimensions in pixels
        uniform vec2 u_diskCenter;          // Disk center in pixel coordinates
        uniform float u_diskRadius;         // Outer radius of the disk in pixels
        uniform float u_innerRadius;        // Radius of the non-distorting inner part
        uniform float u_refractionStrength; // Controls the amount of distortion
        
        uniform vec4 u_gridLineColor;       // Color of the grid lines
        uniform float u_gridSpacing;        // Spacing of grid lines in pixels
        uniform vec4 u_pageBackgroundColor; // The general page background color
        uniform vec4 u_glassBaseColor;      // A subtle tint for the glass itself

        // Function to draw a procedural grid
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
            // Flip Y for typical screen coordinates (optional, depends on setup)
            // currentPixelCoord.y = u_resolution.y - currentPixelCoord.y;


            vec2 vectorFromDiskCenter = currentPixelCoord - u_diskCenter;
            float distanceToCenter = length(vectorFromDiskCenter);

            vec4 outputColor;

            if (distanceToCenter > u_diskRadius) {
                // Outside the disk: draw normal grid
                outputColor = getGridColor(currentPixelCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
            } else {
                // Inside the disk
                vec2 sampleCoord = currentPixelCoord; // Coordinate to sample the background grid from

                if (distanceToCenter > u_innerRadius) {
                    // This is the distorting edge part of the disk
                    float ringT = (distanceToCenter - u_innerRadius) / (u_diskRadius - u_innerRadius); // Normalized 0 to 1 within the ring
                    
                    // Distortion magnitude: sine curve for a bulge, max in middle of ring
                    float distortionMagnitude = sin(ringT * 3.1415926535) * u_refractionStrength;
                    
                    // To simulate a convex lens (magnifying), background appears shifted away from lens center.
                    // So, we sample the background from a point effectively "more inward" relative to the lens geometry.
                    // The vector vectorFromDiskCenter points from disk center to current pixel.
                    // We shift sampling point opposite to this direction.
                    sampleCoord = currentPixelCoord - normalize(vectorFromDiskCenter) * distortionMagnitude; // Minor reformatting/spacing
                }
                // else: central flat part, sampleCoord remains currentPixelCoord (no distortion)

                vec4 refractedGridColor = getGridColor(sampleCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                
                // Apply a base glass color (slightly transparent)
                outputColor = mix(refractedGridColor, u_glassBaseColor, u_glassBaseColor.a);

                // Add subtle highlight/shadow for fillet/edge form
                if (distanceToCenter > u_innerRadius) {
                    float edgeFactor = smoothstep(u_diskRadius - 5.0, u_diskRadius, distanceToCenter); // 0 to 1 at the very edge
                    outputColor.rgb += vec3(0.1,0.1,0.12) * edgeFactor * (1.0 - u_glassBaseColor.a); // Highlight (stronger if glass is clearer)

                    float innerRimFactor = 1.0 - smoothstep(u_innerRadius, u_innerRadius + 5.0, distanceToCenter); // 0 to 1 at inner edge, fading out
                    outputColor.rgb *= (1.0 - innerRimFactor * 0.03); // Slight darkening just outside inner rim
                }
                 // A very subtle overall highlight based on angle (fake fresnel/specular)
                float dotProd = dot(normalize(vectorFromDiskCenter), normalize(vec2(0.7,0.7))); // Light from top-leftish
                float highlight = pow(max(0.0, dotProd), 20.0) * 0.1;
                if (distanceToCenter < u_diskRadius * 0.95) { // Avoid highlight at very edge if edgeFactor is already strong
                   outputColor.rgb += highlight * (1.0 - u_glassBaseColor.a);
                }
            }
            gl_FragColor = outputColor;
        }
    `;

    // Helper to compile shader
    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // Helper to create program
    function createProgram(vs, fs) {
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        return program;
    }

    const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(vertexShader, fragmentShader);

    // Get attribute and uniform locations
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "a_position");
    const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
    const diskCenterUniformLocation = gl.getUniformLocation(shaderProgram, "u_diskCenter");
    const diskRadiusUniformLocation = gl.getUniformLocation(shaderProgram, "u_diskRadius");
    const innerRadiusUniformLocation = gl.getUniformLocation(shaderProgram, "u_innerRadius");
    const refractionStrengthUniformLocation = gl.getUniformLocation(shaderProgram, "u_refractionStrength");
    const gridLineColorUniformLocation = gl.getUniformLocation(shaderProgram, "u_gridLineColor");
    const gridSpacingUniformLocation = gl.getUniformLocation(shaderProgram, "u_gridSpacing");
    const pageBgColorUniformLocation = gl.getUniformLocation(shaderProgram, "u_pageBackgroundColor");
    const glassBaseColorUniformLocation = gl.getUniformLocation(shaderProgram, "u_glassBaseColor");


    // Create buffer for a quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]; // Two triangles for a quad
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // --- Disk and Scene Parameters ---
    let params = {
        diskPhysicalRadius: 150,
        diskInnerRadiusFactor: 0.8,
        refractionStrength: 25.0,
        gridSpacing: 25.0,
        glassBaseColor: [250/255, 250/255, 255/255, 0.10] // RGB + Alpha
    };
    
    let diskCenter = { x: 0, y: 0 }; // Initialized in resize
    
    const gridLineColor = [0, 0, 0, 0.08];
    const pageBackgroundColor = [221/255, 225/255, 231/255, 1.0]; // #dde1e7
    // const glassBaseColor is now in params

    // --- Controls Setup ---
    const controls = {
        diskRadius: { slider: document.getElementById('diskRadiusSlider'), valueDisplay: document.getElementById('diskRadiusValue') },
        innerRadiusFactor: { slider: document.getElementById('innerRadiusFactorSlider'), valueDisplay: document.getElementById('innerRadiusFactorValue') },
        refractionStrength: { slider: document.getElementById('refractionStrengthSlider'), valueDisplay: document.getElementById('refractionStrengthValue') },
        gridSpacing: { slider: document.getElementById('gridSpacingSlider'), valueDisplay: document.getElementById('gridSpacingValue') },
        glassAlpha: { slider: document.getElementById('glassAlphaSlider'), valueDisplay: document.getElementById('glassAlphaValue') }
    };

    function initializeControls() {
        controls.diskRadius.slider.value = params.diskPhysicalRadius;
        controls.diskRadius.valueDisplay.textContent = params.diskPhysicalRadius;
        controls.diskRadius.slider.addEventListener('input', (e) => {
            params.diskPhysicalRadius = parseFloat(e.target.value);
            controls.diskRadius.valueDisplay.textContent = params.diskPhysicalRadius;
            requestAnimationFrame(render);
        });

        controls.innerRadiusFactor.slider.value = params.diskInnerRadiusFactor;
        controls.innerRadiusFactor.valueDisplay.textContent = params.diskInnerRadiusFactor;
        controls.innerRadiusFactor.slider.addEventListener('input', (e) => {
            params.diskInnerRadiusFactor = parseFloat(e.target.value);
            controls.innerRadiusFactor.valueDisplay.textContent = params.diskInnerRadiusFactor;
            requestAnimationFrame(render);
        });

        controls.refractionStrength.slider.value = params.refractionStrength;
        controls.refractionStrength.valueDisplay.textContent = params.refractionStrength;
        controls.refractionStrength.slider.addEventListener('input', (e) => {
            params.refractionStrength = parseFloat(e.target.value);
            controls.refractionStrength.valueDisplay.textContent = params.refractionStrength;
            requestAnimationFrame(render);
        });

        controls.gridSpacing.slider.value = params.gridSpacing;
        controls.gridSpacing.valueDisplay.textContent = params.gridSpacing;
        controls.gridSpacing.slider.addEventListener('input', (e) => {
            params.gridSpacing = parseFloat(e.target.value);
            controls.gridSpacing.valueDisplay.textContent = params.gridSpacing;
            requestAnimationFrame(render);
        });

        controls.glassAlpha.slider.value = params.glassBaseColor[3];
        controls.glassAlpha.valueDisplay.textContent = params.glassBaseColor[3].toFixed(2);
        controls.glassAlpha.slider.addEventListener('input', (e) => {
            params.glassBaseColor[3] = parseFloat(e.target.value);
            controls.glassAlpha.valueDisplay.textContent = params.glassBaseColor[3].toFixed(2);
            requestAnimationFrame(render);
        });
    }


    // --- Dragging Logic ---
    let isDragging = false;
    let dragStartX, dragStartY;
    let initialDiskCenterX, initialDiskCenterY;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialDiskCenterX = diskCenter.x;
        initialDiskCenterY = diskCenter.y;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        diskCenter.x = initialDiskCenterX + dx;
        diskCenter.y = initialDiskCenterY - dy; // Y is often inverted in screen vs GL coords
        requestAnimationFrame(render); // Re-render on drag
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'grab';
        }
    });
    
    // Resize handling
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        // Set initial disk center if not already set by dragging
        if (!isDragging) { // Or some other flag to indicate first time
            diskCenter.x = canvas.width / 2;
            diskCenter.y = canvas.height / 2;
        }
         requestAnimationFrame(render);
    }
    window.addEventListener('resize', resizeCanvas);
    

    // Render function
    function render() {
        if (!gl || !shaderProgram) return;

        gl.clearColor(pageBackgroundColor[0], pageBackgroundColor[1], pageBackgroundColor[2], pageBackgroundColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(shaderProgram);

        // Set attributes
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        // Set uniforms
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        gl.uniform2f(diskCenterUniformLocation, diskCenter.x, diskCenter.y);
        gl.uniform1f(diskRadiusUniformLocation, params.diskPhysicalRadius);
        gl.uniform1f(innerRadiusUniformLocation, params.diskPhysicalRadius * params.diskInnerRadiusFactor);
        gl.uniform1f(refractionStrengthUniformLocation, params.refractionStrength);
        gl.uniform4fv(gridLineColorUniformLocation, gridLineColor);
        gl.uniform1f(gridSpacingUniformLocation, params.gridSpacing);
        gl.uniform4fv(pageBgColorUniformLocation, pageBackgroundColor);
        gl.uniform4fv(glassBaseColorUniformLocation, params.glassBaseColor);

        gl.drawArrays(gl.TRIANGLES, 0, 6); // Draw the quad (6 vertices)
    }

    // Initial setup
    initializeControls(); // Initialize sliders and their displays
    resizeCanvas(); // Call once to set up initial size and render
}
