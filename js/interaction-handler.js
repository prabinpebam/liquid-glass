/**
 * Interaction Handler for Canvas and UI Elements
 */

export class InteractionHandler {
    constructor(canvas, liquidGlassParams, positions, uiElements, renderCallback, backgroundImagesData) {
        this.canvas = canvas;
        this.liquidGlassParams = liquidGlassParams;
        this.positions = positions;
        this.uiElements = uiElements;
        this.render = renderCallback;
        this.backgroundImagesData = backgroundImagesData;
        this.gl = null;

        // Interaction state
        this.isElementDragging = false;
        this.isElementResizing = false;
        this.dragTarget = null;
        this.resizeHandle = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.initialLiquidGlassCenterX = 0;
        this.initialLiquidGlassCenterY = 0;
        this.initialBackgroundImagePos = null;
        this.initialElementSize = null;
    }

    initialize() {
        this.setupEventListeners();
        // Update GL coordinates from HTML panel position on initialization
        this.updateControlPanelGLPosition();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        document.addEventListener('click', (e) => this.hideContextMenu(e));
        
        // Listen for window resize to update control panel GL position
        window.addEventListener('resize', () => {
            setTimeout(() => this.updateControlPanelGLPosition(), 0);
        });
    }

    /**
     * Updates GL coordinates based on current HTML control panel position and size
     * This is the one-way sync from HTML to GL for the liquid glass background
     */
    updateControlPanelGLPosition() {
        if (!this.uiElements.controlPanel || !this.canvas) return;

        const panelRect = this.uiElements.controlPanel.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Update stored panel size with actual dimensions
        this.positions.controlPanelSize.x = panelRect.width;
        this.positions.controlPanelSize.y = panelRect.height;
        
        // Convert HTML viewport position to GL center coordinates
        const htmlLeftRelativeToCanvas = panelRect.left - canvasRect.left;
        const htmlTopRelativeToCanvas = panelRect.top - canvasRect.top;
        
        // Calculate GL center coordinates (Y is inverted in GL)
        this.positions.controlPanelPosition.x = htmlLeftRelativeToCanvas + panelRect.width * 0.5;
        this.positions.controlPanelPosition.y = this.canvas.height - (htmlTopRelativeToCanvas + panelRect.height * 0.5);
        
        // Trigger render to update the liquid glass background
        this.render();
    }

    getCanvasMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: this.canvas.height - (e.clientY - rect.top)
        };
    }

    isPointInsideLiquidGlass(x, y) {
        const dx = x - this.positions.liquidGlassCenterPosition.x;
        const dy = y - this.positions.liquidGlassCenterPosition.y;
        
        const halfW = this.liquidGlassParams.rectangleWidth * 0.5;
        const halfH = this.liquidGlassParams.rectangleHeight * 0.5;
        return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
    }

    isPointInsideAddImageButton(x, y) {
        const dx = x - this.positions.addImageButtonPosition.x;
        const dy = y - this.positions.addImageButtonPosition.y;
        const halfW = this.positions.addImageButtonSize.x * 0.5;
        const halfH = this.positions.addImageButtonSize.y * 0.5;
        return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
    }

    isPointInsideGridToggleButton(x, y) {
        const toggleAreaWidth = 70;
        const dx = x - (this.positions.gridControlsPosition.x - this.positions.gridControlsSize.x * 0.5 + toggleAreaWidth * 0.5);
        const dy = y - this.positions.gridControlsPosition.y;
        const halfW = toggleAreaWidth * 0.5;
        const halfH = this.positions.gridControlsSize.y * 0.5;
        return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
    }

    isPointInsideGridSpacingSlider(x, y) {
        if (!this.liquidGlassParams.showGrid) return false;
        const sliderAreaWidth = 150;
        const dx = x - (this.positions.gridControlsPosition.x + this.positions.gridControlsSize.x * 0.5 - sliderAreaWidth * 0.5);
        const dy = y - this.positions.gridControlsPosition.y;
        const halfW = sliderAreaWidth * 0.5;
        const halfH = this.positions.gridControlsSize.y * 0.5;
        return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
    }

    findBackgroundImageAtPoint(x, y) {
        for (let i = this.backgroundImagesData.length - 1; i >= 0; i--) { // Check from top to bottom
            const img = this.backgroundImagesData[i];
            if (x >= img.position.x && x <= img.position.x + img.size.x &&
                y >= img.position.y && y <= img.position.y + img.size.y) {
                return i;
            }
        }
        return -1;
    }

    getActiveResizeHandle(x, y) {
        const edgeThreshold = 15;
        
        if (this.isPointInsideLiquidGlass(x, y)) {
            const dx = x - this.positions.liquidGlassCenterPosition.x;
            const dy = y - this.positions.liquidGlassCenterPosition.y;
            
            const halfW = this.liquidGlassParams.rectangleWidth * 0.5;
            const halfH = this.liquidGlassParams.rectangleHeight * 0.5;
            if (Math.abs(Math.abs(dx) - halfW) < edgeThreshold || Math.abs(Math.abs(dy) - halfH) < edgeThreshold) {
                return 'liquidGlass';
            }
        }
        
        // Check background image resize handles (bottom-right corner)
        for (let i = this.backgroundImagesData.length - 1; i >= 0; i--) {
            const img = this.backgroundImagesData[i];
            const imgRight = img.position.x + img.size.x;
            const imgTop = img.position.y + img.size.y;
            
            if (Math.abs(x - imgRight) < edgeThreshold && Math.abs(y - imgTop) < edgeThreshold) {
                return i;
            }
        }
        
        return null;
    }

    handleMouseMove(e) {
        if (this.isElementDragging) {
            const mousePos = this.getCanvasMousePosition(e);
            const dx = mousePos.x - this.dragStartX;
            const dy = mousePos.y - this.dragStartY;
            
            if (this.dragTarget === 'liquidGlass') {
                this.positions.liquidGlassCenterPosition.x = this.initialLiquidGlassCenterX + dx;
                this.positions.liquidGlassCenterPosition.y = this.initialLiquidGlassCenterY + dy;
            } else if (typeof this.dragTarget === 'number') {
                this.backgroundImagesData[this.dragTarget].position.x = this.initialBackgroundImagePos.x + dx;
                this.backgroundImagesData[this.dragTarget].position.y = this.initialBackgroundImagePos.y + dy;
            }
            this.render();
        } else if (this.isElementResizing) {
            const mousePos = this.getCanvasMousePosition(e);
            const dx = mousePos.x - this.dragStartX;
            const dy = mousePos.y - this.dragStartY;
            
            if (this.resizeHandle === 'liquidGlass') {
                this.liquidGlassParams.rectangleWidth = Math.max(50, this.initialElementSize.x + dx);
                this.liquidGlassParams.rectangleHeight = Math.max(50, this.initialElementSize.y + dy);
                
                // Update UI controls
                if (this.uiElements.rectangleWidthControl && this.uiElements.rectangleWidthControl.slider) {
                    this.uiElements.rectangleWidthControl.slider.value = this.liquidGlassParams.rectangleWidth;
                    this.uiElements.rectangleWidthControl.valueDisplay.textContent = Math.round(this.liquidGlassParams.rectangleWidth);
                }
                if (this.uiElements.rectangleHeightControl && this.uiElements.rectangleHeightControl.slider) {
                    this.uiElements.rectangleHeightControl.slider.value = this.liquidGlassParams.rectangleHeight;
                    this.uiElements.rectangleHeightControl.valueDisplay.textContent = Math.round(this.liquidGlassParams.rectangleHeight);
                }
            } else if (typeof this.resizeHandle === 'number') {
                // Background image resize with aspect ratio constraint
                const img = this.backgroundImagesData[this.resizeHandle];
                const newWidth = Math.max(50, this.initialElementSize.x + dx);
                const newHeight = newWidth / img.aspectRatio; // Maintain aspect ratio
                
                img.size.x = newWidth;
                img.size.y = newHeight;
            }
            this.render();
        } else {
            this.updateCursor(e);
        }
    }

    updateCursor(e) {
        const mousePos = this.getCanvasMousePosition(e);
        const resizeHandleType = this.getActiveResizeHandle(mousePos.x, mousePos.y);
        
        if (resizeHandleType !== null) {
            this.canvas.style.cursor = 'nw-resize';
        } else if (this.isPointInsideLiquidGlass(mousePos.x, mousePos.y) || this.findBackgroundImageAtPoint(mousePos.x, mousePos.y) !== -1) {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    startDragOrResize(mousePos) {
        const resizeHandleType = this.getActiveResizeHandle(mousePos.x, mousePos.y);
        
        this.dragStartX = mousePos.x;
        this.dragStartY = mousePos.y;

        if (resizeHandleType !== null) {
            this.isElementResizing = true;
            this.resizeHandle = resizeHandleType;
            this.canvas.style.cursor = 'nw-resize';
            
            if (resizeHandleType === 'liquidGlass') {
                this.initialElementSize = { x: this.liquidGlassParams.rectangleWidth, y: this.liquidGlassParams.rectangleHeight };
            } else {
                this.initialElementSize = { ...this.backgroundImagesData[resizeHandleType].size };
            }
        } else if (this.isPointInsideLiquidGlass(mousePos.x, mousePos.y)) {
            this.isElementDragging = true;
            this.dragTarget = 'liquidGlass';
            this.canvas.style.cursor = 'grabbing';
            this.initialLiquidGlassCenterX = this.positions.liquidGlassCenterPosition.x;
            this.initialLiquidGlassCenterY = this.positions.liquidGlassCenterPosition.y;
        } else {
            const imageIndex = this.findBackgroundImageAtPoint(mousePos.x, mousePos.y);
            if (imageIndex !== -1) {
                this.isElementDragging = true;
                this.dragTarget = imageIndex;
                this.canvas.style.cursor = 'grabbing';
                this.initialBackgroundImagePos = { ...this.backgroundImagesData[imageIndex].position };
            }
        }
    }

    handleMouseUp() {
        if (this.isElementDragging || this.isElementResizing) {
            this.isElementDragging = false;
            this.isElementResizing = false;
            this.dragTarget = null;
            this.resizeHandle = null;
            this.canvas.style.cursor = 'default';
        }
    }

    handleMouseDown(e) {
        const mousePos = this.getCanvasMousePosition(e);
        
        // Check if clicking on add image button
        if (this.isPointInsideAddImageButton(mousePos.x, mousePos.y)) {
            if (this.uiElements.imageUpload || this.uiElements.backgroundImageUpload) {
                const imageUpload = this.uiElements.imageUpload || this.uiElements.backgroundImageUpload;
                imageUpload.click();
            }
            return;
        }

        // Check if clicking on grid toggle button
        if (this.isPointInsideGridToggleButton(mousePos.x, mousePos.y)) {
            this.liquidGlassParams.showGrid = !this.liquidGlassParams.showGrid;
            if (this.uiElements.gridToggle) {
                this.uiElements.gridToggle.checked = this.liquidGlassParams.showGrid;
            }
            this.render();
            return;
        }

        // Check if clicking on grid spacing slider
        if (this.isPointInsideGridSpacingSlider(mousePos.x, mousePos.y)) {
            // Handle grid spacing adjustment based on click position within the slider area
            const sliderAreaWidth = 150;
            const sliderStartX = this.positions.gridControlsPosition.x + this.positions.gridControlsSize.x * 0.5 - sliderAreaWidth;
            const relativeX = mousePos.x - sliderStartX;
            const normalizedX = relativeX / sliderAreaWidth;
            const newSpacing = 10 + (normalizedX * 90); // Range: 10-100
            this.liquidGlassParams.gridSpacing = Math.max(10, Math.min(100, newSpacing));
            
            if (this.uiElements.gridSpacingSlider) {
                this.uiElements.gridSpacingSlider.value = this.liquidGlassParams.gridSpacing;
            }
            this.render();
            return;
        }

        // Handle dragging and resizing
        this.startDragOrResize(mousePos);
        e.preventDefault();
    }

    handleContextMenu(e) {
        e.preventDefault();
        
        const mousePos = this.getCanvasMousePosition(e);
        const imageIndex = this.findBackgroundImageAtPoint(mousePos.x, mousePos.y);
        
        if (imageIndex !== -1) {
            this.showContextMenu(e.clientX, e.clientY, imageIndex);
        } else {
            this.hideContextMenu();
        }
    }

    showContextMenu(x, y, imageIndex) {
        this.hideContextMenu(); // Remove any existing context menu
        
        const contextMenu = document.createElement('div');
        contextMenu.id = 'image-context-menu';
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.backgroundColor = 'white';
        contextMenu.style.border = '1px solid #ccc';
        contextMenu.style.borderRadius = '6px';
        contextMenu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        contextMenu.style.padding = '8px 0';
        contextMenu.style.zIndex = '1000';
        contextMenu.style.minWidth = '120px';
        contextMenu.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        contextMenu.style.fontSize = '14px';
        
        const removeOption = document.createElement('div');
        removeOption.textContent = 'Remove';
        removeOption.style.padding = '8px 16px';
        removeOption.style.cursor = 'pointer';
        removeOption.style.color = '#dc3545';
        removeOption.style.transition = 'background-color 0.15s ease';
        
        removeOption.addEventListener('mouseenter', () => {
            removeOption.style.backgroundColor = '#f8f9fa';
        });
        
        removeOption.addEventListener('mouseleave', () => {
            removeOption.style.backgroundColor = 'transparent';
        });
        
        removeOption.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImage(imageIndex);
            this.hideContextMenu();
        });
        
        contextMenu.appendChild(removeOption);
        document.body.appendChild(contextMenu);
    }

    hideContextMenu() {
        const existingMenu = document.getElementById('image-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    removeImage(imageIndex) {
        if (imageIndex >= 0 && imageIndex < this.backgroundImagesData.length) {
            // Clean up WebGL texture
            if (this.backgroundImagesData[imageIndex].texture) {
                const gl = this.getGL();
                if (gl) {
                    gl.deleteTexture(this.backgroundImagesData[imageIndex].texture);
                }
            }
            
            // Remove from array
            this.backgroundImagesData.splice(imageIndex, 1);
            
            // Re-render the scene
            this.render();
        }
    }

    // Method to get GL context (needs to be set from main app)
    setGL(gl) {
        this.gl = gl;
    }

    getGL() {
        return this.gl;
    }

    setSaveControlPanelPositionCallback(callback) {
        // No-op: Control panel positioning is now handled purely by CSS
        // This method is kept for compatibility with existing code
    }
}
