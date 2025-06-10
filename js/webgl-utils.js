/**
 * WebGL utility functions
 */

export function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader compilation error (${type === gl.VERTEX_SHADER ? 'VS' : 'FS'}):`, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function createProgram(gl, vs, fs) {
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

export function getUniformLocations(gl, program) {
    return {
        position: gl.getAttribLocation(program, "a_position"),
        resolution: gl.getUniformLocation(program, "u_resolution"),
        
        // Main liquid glass shape uniforms (rectangle only)
        liquidGlassCenter: gl.getUniformLocation(program, "u_liquidGlassCenter"),
        rectangleSize: gl.getUniformLocation(program, "u_rectangleSize"),
        rectangleCornerRadius: gl.getUniformLocation(program, "u_rectangleCornerRadius"),
        edgeDistortionThickness: gl.getUniformLocation(program, "u_edgeDistortionThickness"),
        
        // Glass material properties
        refractionStrength: gl.getUniformLocation(program, "u_refractionStrength"),
        glassBaseColor: gl.getUniformLocation(program, "u_glassBaseColor"),
        frostiness: gl.getUniformLocation(program, "u_frostiness"),
        
        // Background rendering
        gridLineColor: gl.getUniformLocation(program, "u_gridLineColor"),
        gridSpacing: gl.getUniformLocation(program, "u_gridSpacing"),
        pageBackgroundColor: gl.getUniformLocation(program, "u_pageBackgroundColor"),
        showGrid: gl.getUniformLocation(program, "u_showGrid"),
        
        // Background image system
        hasBackgroundImages: gl.getUniformLocation(program, "u_hasBackgroundImages"),
        backgroundImageTextures: [],
        backgroundImagePositions: gl.getUniformLocation(program, "u_backgroundImagePositions"),
        backgroundImageSizes: gl.getUniformLocation(program, "u_backgroundImageSizes"),
        backgroundImageCount: gl.getUniformLocation(program, "u_backgroundImageCount"),
        
        // Control panel
        controlPanelCenter: gl.getUniformLocation(program, "u_controlPanelCenter"),
        controlPanelSize: gl.getUniformLocation(program, "u_controlPanelSize"),
        controlPanelCornerRadius: gl.getUniformLocation(program, "u_controlPanelCornerRadius"),
        controlPanelDistortionThickness: gl.getUniformLocation(program, "u_controlPanelDistortionThickness"),

        // Add Image Button
        addImageButtonCenter: gl.getUniformLocation(program, "u_addImageButtonCenter"),
        addImageButtonSize: gl.getUniformLocation(program, "u_addImageButtonSize"),
        addImageButtonCornerRadius: gl.getUniformLocation(program, "u_addImageButtonCornerRadius"),
        addImageButtonDistortionThickness: gl.getUniformLocation(program, "u_addImageButtonDistortionThickness"),

        // Grid Controls Panel
        gridControlsCenter: gl.getUniformLocation(program, "u_gridControlsCenter"),
        gridControlsSize: gl.getUniformLocation(program, "u_gridControlsSize"),
        gridControlsCornerRadius: gl.getUniformLocation(program, "u_gridControlsCornerRadius"),
        gridControlsDistortionThickness: gl.getUniformLocation(program, "u_gridControlsDistortionThickness")
    };
}

export function initializeBackgroundImageTextures(gl, uniformLocations, program) {
    for (let i = 0; i < 8; i++) {
        uniformLocations.backgroundImageTextures[i] = gl.getUniformLocation(program, `u_backgroundImageTextures[${i}]`);
    }
}
