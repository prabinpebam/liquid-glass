/**
 * Interaction Handler for Canvas and UI Elements
 */

export class InteractionHandler {
    constructor(canvas, liquidGlassParams, positions, uiElements, renderCallback, backgroundImagesData) {
        this.canvas = canvas;
        this.liquidGlassParams = liquidGlassParams;
        this.positions = positions;
        this.uiElements = uiElements; // e.g., { controlPanel, addImageIcon, gridIcon, imageUpload, /* ...sliders... */ }
        this.render = renderCallback;
        this.backgroundImagesData = backgroundImagesData;
        this.gl = null;

        // Interaction state
        this.isElementDragging = false;
        this.isElementResizing = false;
        this.isControlPanelDragging = false;
        this.dragTarget = null;
        this.resizeHandle = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.initialLiquidGlassCenterX = 0;
        this.initialLiquidGlassCenterY = 0;
        this.initialBackgroundImagePos = null;
        this.initialElementSize = null;
        this.initialControlPanelPosition = null;

        this.canvasRect = null;
        this.lastRectUpdate = 0;
        this.RECT_UPDATE_INTERVAL = 100;
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        // Control panel drag
        if (this.uiElements.controlPanelTitle) {
            this.uiElements.controlPanelTitle.addEventListener('mousedown', (e) => this.handleControlPanelDragStart(e));
        }
        
        document.addEventListener('mousemove', (e) => this.handleDocumentMouseMove(e));
        document.addEventListener('click', (e) => this.hideContextMenu(e));
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
        if (this.isControlPanelDragging) return;
        
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

    handleControlPanelDragStart(e) {
        this.isControlPanelDragging = true;
        this.uiElements.controlPanelTitle.style.cursor = 'grabbing';
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.initialControlPanelPosition = { ...this.positions.controlPanelPosition };
        
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.lastRectUpdate = Date.now();
        
        e.preventDefault();
        e.stopPropagation();
    }

    handleDocumentMouseMove(e) {
        if (this.isControlPanelDragging) {
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            
            this.positions.controlPanelPosition.x = this.initialControlPanelPosition.x + dx;
            this.positions.controlPanelPosition.y = this.initialControlPanelPosition.y - dy;
            
            this.syncHTMLPanePosition();
            
            if (Date.now() - this.lastRectUpdate > 16) {
                this.render();
            }
        }
    }

    syncHTMLPanePosition() {
        const now = Date.now();
        if (!this.canvasRect || now - this.lastRectUpdate > this.RECT_UPDATE_INTERVAL) {
            this.canvasRect = this.canvas.getBoundingClientRect();
            this.lastRectUpdate = now;
        }
        
        const htmlLeft = this.positions.controlPanelPosition.x - this.positions.controlPanelSize.x * 0.5;
        const htmlTop = this.canvas.height - this.positions.controlPanelPosition.y - this.positions.controlPanelSize.y * 0.5;
        
        this.uiElements.controlPanel.style.transform = `translate(${htmlLeft}px, ${htmlTop}px)`;
        this.uiElements.controlPanel.style.left = '0px';
        this.uiElements.controlPanel.style.top = '0px';
        this.uiElements.controlPanel.style.right = 'auto';
    }

    handleMouseUp() {
        if (this.isControlPanelDragging) {
            this.isControlPanelDragging = false;
            this.uiElements.controlPanelTitle.style.cursor = 'grab';
        }
        if (this.isElementDragging || this.isElementResizing) {
            this.isElementDragging = false;
            this.isElementResizing = false;
            this.dragTarget = null;
            this.resizeHandle = null;
            this.canvas.style.cursor = 'default';
        }
    }

    handleMouseDown(e) {
        // Only handle canvas interactions if not dragging control panel
        if (this.isControlPanelDragging) return;
        
        const mousePos = this.getCanvasMousePosition(e);
        
        // Check if clicking on add image button
        if (this.isPointInsideAddImageButton(mousePos.x, mousePos.y)) {
            if (this.uiElements.backgroundImageUpload) {
                this.uiElements.backgroundImageUpload.click();
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
}
