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

    // Inner Shadow & Glow Uniforms for Main Shape
    uniform float u_topShadowBlur;
    uniform float u_topShadowOffsetX;
    uniform float u_topShadowOffsetY;
    uniform float u_topShadowOpacity;

    uniform float u_bottomGlowBlur;
    uniform float u_bottomGlowOffsetX;
    uniform float u_bottomGlowOffsetY;
    uniform float u_bottomGlowOpacity;

    // Chromatic Aberration
    uniform bool u_enableChromaticAberration; // Changed from float to bool for the toggle
    uniform float u_chromaticAberrationAmount;

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

    // Remove Legacy Reflection Uniforms
    // uniform float u_reflectionArcDegrees;
    // uniform float u_reflectionThickness;
    // uniform float u_reflectionOffset;
    // uniform float u_reflectionOpacity;
    // uniform float u_reflectionArcPositionOffset;

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

    // Drop Shadow
    uniform float u_dropShadowBlur;
    uniform float u_dropShadowOffsetX;
    uniform float u_dropShadowOffsetY;
    uniform float u_dropShadowOpacity;

    /**
     * Signed Distance Function for rounded rectangles
     * Used for all liquid glass shapes
     */
    float sdRoundedBox( vec2 p, vec2 b, float r ) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
    }

    /**
     * Calculates inner shadow or glow intensity using SDF.
     * p: current pixel's coordinates relative to the shape's center.
     * shapeSize: half-extents of the shape (width/2, height/2).
     * shapeCornerRadius: corner radius of the shape.
     * offsetX, offsetY: desired offset of the shadow/glow.
     * blur: blurriness factor for the shadow/glow edge.
     * Returns an intensity value (0.0 to 1.0), where 1.0 is full shadow/glow.
     */
    float getInnerShadowIntensity(vec2 p, vec2 shapeSize, float shapeCornerRadius, float offsetX, float offsetY, float blur) {
        // To create an inner shadow, we shift the query point *against* the shadow offset.
        // Imagine the light source is offset; the shadow is cast on the inside of the shape
        // opposite to this offset light.
        vec2 queryPoint = p + vec2(offsetX, offsetY);

        // Calculate the signed distance from this queryPoint to the original shape's boundary.
        // If queryPoint is outside the shape, sdfVal will be positive.
        // This positive distance indicates that the original point 'p' is in an area
        // that would be "shadowed" by the shape's edge from the offset light source.
        float sdfVal = sdRoundedBox(queryPoint, shapeSize, shapeCornerRadius);

        // Use smoothstep to create a soft transition for the shadow based on the distance.
        // The shadow intensity increases as queryPoint moves further outside the shape (sdfVal increases).
        // 'blur' controls the width of this transition.
        return smoothstep(0.0, blur, sdfVal);
    }


    /**
     * Calculates outer (drop) shadow intensity.
     * Entire silhouette is dark; blur soft-edges outward.
     */
    float getOuterShadowIntensity(vec2 p, vec2 shapeSize, float shapeCornerRadius,
                                  float offsetX, float offsetY, float blur) {
        /* offset direction = slider direction (positive → move that way) */
        vec2 queryPoint = p - vec2(offsetX, offsetY);

        float sdfVal = sdRoundedBox(queryPoint, shapeSize, shapeCornerRadius);

        /* inside silhouette → full shadow */
        if (sdfVal <= 0.0) return 1.0;

        /* fade to 0 over <blur> pixels */
        return 1.0 - smoothstep(0.0, blur, sdfVal);
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
            vec2 normDirToCenter = normalize(relativeToLiquidGlassCenter);

            if (length(relativeToLiquidGlassCenter) < 0.001) { // Avoid NaN at exact center
                normDirToCenter = vec2(0.707, 0.707); // Default direction
            }

            vec4 refractedBackground;
            // Determine if CA should be active for this specific pixel:
            // only if globally enabled AND in the distorting edge AND amount is significant.
            bool caActiveForCurrentPixel = u_enableChromaticAberration && isInDistortingEdge && u_chromaticAberrationAmount > 0.001;

            // Calculate base distortion magnitude (primarily for Green channel or non-CA rendering)
            // This will be 0.0 if inNonDistortingCenter because isInDistortingEdge will be false.
            float baseDistortionMagnitude = 0.0;
            if (isInDistortingEdge) {
                float distortionCurve = 2.0; // Exponential falloff curve
                baseDistortionMagnitude = u_refractionStrength * pow(clamp(edgeDistortionAmount, 0.0, 1.0), distortionCurve);
            }
            // Note: If isInNonDistortingCenter, baseDistortionMagnitude remains 0.0, ensuring no refraction.

            if (u_frostiness > 0.1) {
                vec4 totalColor = vec4(0.0);
                float sampleCount = 0.0;
                
                for (int x = -2; x <= 2; x++) {
                    for (int y = -2; y <= 2; y++) {
                        vec2 frostOffset = vec2(float(x), float(y)) * u_frostiness * 0.5;
                        // The base coordinate for this frosted sample, before any refraction
                        vec2 baseFrostedPixelCoord = currentPixelCoord + frostOffset;

                        if (caActiveForCurrentPixel) {
                            // Calculate separate distortion magnitudes for R, G, B
                            float rDistortion = max(0.0, baseDistortionMagnitude - u_chromaticAberrationAmount * 0.5);
                            float gDistortion = baseDistortionMagnitude;
                            float bDistortion = baseDistortionMagnitude + u_chromaticAberrationAmount * 0.5;

                            vec2 rCoord = baseFrostedPixelCoord - normDirToCenter * rDistortion;
                            vec2 gCoord = baseFrostedPixelCoord - normDirToCenter * gDistortion;
                            vec2 bCoord = baseFrostedPixelCoord - normDirToCenter * bDistortion;
                            
                            vec4 gSampleColor = renderBackground(gCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                            totalColor.r += renderBackground(rCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor).r;
                            totalColor.g += gSampleColor.g;
                            totalColor.b += renderBackground(bCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor).b;
                            totalColor.a += gSampleColor.a; // Alpha from green channel's path
                        } else {
                            // No CA for this pixel (globally off, or in center, or edge with CA off)
                            // Use baseDistortionMagnitude (which is 0 if in center)
                            vec2 samplingCoord = baseFrostedPixelCoord - normDirToCenter * baseDistortionMagnitude;
                            totalColor += renderBackground(samplingCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                        }
                        sampleCount += 1.0;
                    }
                }
                refractedBackground = totalColor / sampleCount;
            } else { // No frostiness
                if (caActiveForCurrentPixel) {
                    // Calculate separate distortion magnitudes for R, G, B
                    float rDistortion = max(0.0, baseDistortionMagnitude - u_chromaticAberrationAmount * 0.5);
                    float gDistortion = baseDistortionMagnitude;
                    float bDistortion = baseDistortionMagnitude + u_chromaticAberrationAmount * 0.5;

                    vec2 rCoord = currentPixelCoord - normDirToCenter * rDistortion;
                    vec2 gCoord = currentPixelCoord - normDirToCenter * gDistortion;
                    vec2 bCoord = currentPixelCoord - normDirToCenter * bDistortion;

                    refractedBackground.r = renderBackground(rCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor).r;
                    refractedBackground.g = renderBackground(gCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor).g;
                    refractedBackground.b = renderBackground(bCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor).b;
                    refractedBackground.a = renderBackground(gCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor).a; // Alpha from green
                } else {
                    // No CA for this pixel (globally off, or in center, or edge with CA off)
                    // Use baseDistortionMagnitude (which is 0 if in center)
                    vec2 samplingCoord = currentPixelCoord - normDirToCenter * baseDistortionMagnitude;
                    refractedBackground = renderBackground(samplingCoord, u_gridSpacing, u_gridLineColor, u_pageBackgroundColor);
                }
            }

            // Mix with glass material properties
            finalColor = mix(refractedBackground, u_glassBaseColor, u_glassBaseColor.a);

            // Add subtle edge glow for main liquid glass
            if (isInDistortingEdge) {
                float edgeGlow = smoothstep(0.85, 1.0, edgeDistortionAmount) * 0.15; // Original edge glow
                finalColor.rgb += vec3(edgeGlow);
            }

            // Apply Inner Shadows / Glows only to main liquid glass
            if (u_topShadowOpacity > 0.0 && u_topShadowBlur > 0.0) {
                float topShadowIntensity = getInnerShadowIntensity(
                    relativeToLiquidGlassCenter, 
                    u_rectangleSize * 0.5, 
                    cornerRadius, 
                    u_topShadowOffsetX, 
                    u_topShadowOffsetY, 
                    u_topShadowBlur
                );
                // Shadow darkens, so subtract. Color is black (0,0,0).
                finalColor.rgb -= topShadowIntensity * u_topShadowOpacity * finalColor.a; // Modulate by glass alpha
            }

            if (u_bottomGlowOpacity > 0.0 && u_bottomGlowBlur > 0.0) {
                float bottomGlowIntensity = getInnerShadowIntensity(
                    relativeToLiquidGlassCenter, 
                    u_rectangleSize * 0.5, 
                    cornerRadius, 
                    u_bottomGlowOffsetX, 
                    u_bottomGlowOffsetY, 
                    u_bottomGlowBlur
                );
                // Glow lightens, so add. Color is white (1,1,1).
                finalColor.rgb += vec3(1.0) * bottomGlowIntensity * u_bottomGlowOpacity * finalColor.a; // Modulate by glass alpha
            }

            finalColor.rgb = clamp(finalColor.rgb, 0.0, 1.0);
        }

        /* ---------- drop shadow – plain black silhouette with mask ---------- */
        if (u_dropShadowOpacity > 0.0 && u_dropShadowBlur > 0.0) {
            float dropShadow = getOuterShadowIntensity(
                relativeToLiquidGlassCenter,
                u_rectangleSize * 0.5,
                cornerRadius,
                u_dropShadowOffsetX,
                u_dropShadowOffsetY,
                u_dropShadowBlur
            );

            /*  Mask: suppress shadow that falls inside the *current* main shape  */
            if (distanceMetric <= 0.0) {          // inside original glass
                dropShadow = 0.0;
            }

            finalColor.rgb = mix(finalColor.rgb, vec3(0.0), dropShadow * u_dropShadowOpacity);
        }

        gl_FragColor = finalColor;
    }
`;
