/**
 * Shader definitions for the Liquid Glass Effect
 */

export const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_position * 0.5 + 0.5;
    }
`;

export const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;

    // Canvas and background uniforms
    uniform vec2 u_resolution;
    uniform vec4 u_gridLineColor;
    uniform float u_gridSpacing;
    uniform vec4 u_pageBackgroundColor;
    uniform bool u_showGrid;

    // Liquid glass shape uniforms (rectangle only)
    uniform vec2 u_liquidGlassCenter;
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

    // Grid Controls Panel (also uses liquid glass effect)
    uniform vec2 u_gridControlsCenter;
    uniform vec2 u_gridControlsSize;
    uniform float u_gridControlsCornerRadius;
    uniform float u_gridControlsDistortionThickness;

    /**
     * Signed Distance Function for rounded rectangles
     * Used for all liquid glass shapes
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

        // First overlay grid lines if enabled (behind images)
        if (u_showGrid) {
            vec2 gridPos = mod(coord, spacing);
            float lineThickness = 1.0;
            if (gridPos.x < lineThickness || gridPos.y < lineThickness) {
                backgroundColor = mix(backgroundColor, gridLineCol, 1.0);
            }
        }

        // Then render background images on top of grid
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

        return backgroundColor;
    }

    void main() {
        vec2 currentPixelCoord = v_texCoord * u_resolution;
        vec2 relativeToLiquidGlassCenter = currentPixelCoord - u_liquidGlassCenter;

        // Liquid glass shape analysis (rectangle only)
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
        
        // Grid Controls Panel liquid glass analysis
        vec2 relativeToGridControls = currentPixelCoord - u_gridControlsCenter;
        float gridControlsSDF = sdRoundedBox(relativeToGridControls, u_gridControlsSize * 0.5, u_gridControlsCornerRadius);
        
        bool isInGridControls = false;
        bool isInGridControlsDistortingEdge = false;
        float gridControlsEdgeAmount = 0.0;

        // Update priority order: control panel > add image button > grid controls
        if (controlPanelSDF <= 0.0) {
            isInControlPanel = true;
            if (controlPanelSDF > -u_controlPanelDistortionThickness) {
                isInControlPanelDistortingEdge = true;
                if (u_controlPanelDistortionThickness > 0.001) {
                    controlPanelEdgeAmount = (controlPanelSDF + u_controlPanelDistortionThickness) / u_controlPanelDistortionThickness;
                }
            }
        } else if (addImageButtonSDF <= 0.0) {
            isInAddImageButton = true;
            if (addImageButtonSDF > -u_addImageButtonDistortionThickness) {
                isInAddImageButtonDistortingEdge = true;
                if (u_addImageButtonDistortionThickness > 0.001) {
                    addImageButtonEdgeAmount = (addImageButtonSDF + u_addImageButtonDistortionThickness) / u_addImageButtonDistortionThickness;
                }
            }
        } else if (gridControlsSDF <= 0.0) {
            isInGridControls = true;
            if (gridControlsSDF > -u_gridControlsDistortionThickness) {
                isInGridControlsDistortingEdge = true;
                if (u_gridControlsDistortionThickness > 0.001) {
                    gridControlsEdgeAmount = (gridControlsSDF + u_gridControlsDistortionThickness) / u_gridControlsDistortionThickness;
                }
            }
        }

        // Analyze main liquid glass shape (rounded rectangle)
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
            vec4 controlPanelGlassTint = vec4(250.0/255.0, 250.0/255.0, 255.0/255.0, 0.1);
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
        } else if (isInGridControls) {
            // Render grid controls panel with liquid glass effect
            vec2 samplingCoord = currentPixelCoord;
            
            // Apply refraction distortion for grid controls edge
            if (isInGridControlsDistortingEdge) {
                float distortionCurve = 2.0;
                float distortionMagnitude = 15.0 * pow(clamp(gridControlsEdgeAmount, 0.0, 1.0), distortionCurve);
                samplingCoord = currentPixelCoord - normalize(relativeToGridControls) * distortionMagnitude;
            }

            // Apply light frosting effect for grid controls
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

            // Mix with grid controls glass tint
            vec4 gridControlsGlassTint = vec4(250.0/255.0, 250.0/255.0, 255.0/255.0, 0.12);
            finalColor = mix(refractedBackground, gridControlsGlassTint, gridControlsGlassTint.a);

            // Add edge glow
            if (isInGridControlsDistortingEdge) {
                float edgeGlow = smoothstep(0.7, 1.0, gridControlsEdgeAmount) * 0.18;
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
