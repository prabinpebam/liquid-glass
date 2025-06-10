/**
 * Interaction Handler for Canvas and UI Elements
 */

export class InteractionHandler {
    constructor(canvas, liquidGlassParams, positions, uiElements, renderCallback) {
        this.canvas = canvas;
        this.liquidGlassParams = liquidGlassParams;
        this.positions = positions;
        this.uiElements = uiElements;
        this.renderCallback = renderCallback;
        
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
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        // Control panel drag
        if (this.uiElements.controlPanelTitle) {
            this.uiElements.controlPanelTitle.addEventListener('mousedown', (e) => this.handleControlPanelDragStart(e));
        }
        
        document.addEventListener('mousemove', (e) => this.handleDocumentMouseMove(e));
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

    handleMouseMove(e) {
        if (this.isControlPanelDragging) return;
        
        if (this.isElementDragging) {
            const mousePos = this.getCanvasMousePosition(e);
            const dx = mousePos.x - this.dragStartX;
            const dy = mousePos.y - this.dragStartY;
            
            if (this.dragTarget === 'liquidGlass') {
                this.positions.liquidGlassCenterPosition.x = this.initialLiquidGlassCenterX + dx;
                this.positions.liquidGlassCenterPosition.y = this.initialLiquidGlassCenterY + dy;
            }
            this.renderCallback();
        } else if (this.isElementResizing) {
            const mousePos = this.getCanvasMousePosition(e);
            const dx = mousePos.x - this.dragStartX;
            const dy = mousePos.y - this.dragStartY;
            
            if (this.resizeHandle === 'liquidGlass') {
                this.liquidGlassParams.rectangleWidth = Math.max(50, this.initialElementSize.x + dx);
                this.liquidGlassParams.rectangleHeight = Math.max(50, this.initialElementSize.y + dy);
                
                // Update UI controls
                this.uiElements.rectangleWidthControl.slider.value = this.liquidGlassParams.rectangleWidth;
                this.uiElements.rectangleWidthControl.valueDisplay.textContent = Math.round(this.liquidGlassParams.rectangleWidth);
                this.uiElements.rectangleHeightControl.slider.value = this.liquidGlassParams.rectangleHeight;
                this.uiElements.rectangleHeightControl.valueDisplay.textContent = Math.round(this.liquidGlassParams.rectangleHeight);
            }
            this.renderCallback();
        } else {
            this.updateCursor(e);
        }
    }

    updateCursor(e) {
        const mousePos = this.getCanvasMousePosition(e);
        const resizeHandleType = this.getActiveResizeHandle(mousePos.x, mousePos.y);
        
        if (resizeHandleType !== null) {
            this.canvas.style.cursor = 'nw-resize';
        } else if (this.isPointInsideLiquidGlass(mousePos.x, mousePos.y)) {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'default';
        }
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
        
        return null;
    }

    handleMouseDown(e) {
        if (this.isControlPanelDragging) return;
        
        const mousePos = this.getCanvasMousePosition(e);
        
        // Check button clicks
        if (this.isPointInsideAddImageButton(mousePos.x, mousePos.y)) {
            this.uiElements.backgroundImageUpload?.click();
            return;
        }

        if (this.isPointInsideGridToggleButton(mousePos.x, mousePos.y)) {
            this.liquidGlassParams.showGrid = !this.liquidGlassParams.showGrid;
            if (this.uiElements.gridToggle) {
                this.uiElements.gridToggle.checked = this.liquidGlassParams.showGrid;
            }
            this.renderCallback();
            return;
        }

        if (this.isPointInsideGridSpacingSlider(mousePos.x, mousePos.y)) {
            const sliderAreaWidth = 150;
            const sliderStartX = this.positions.gridControlsPosition.x + this.positions.gridControlsSize.x * 0.5 - sliderAreaWidth;
            const relativeX = mousePos.x - sliderStartX;
            const normalizedX = relativeX / sliderAreaWidth;
            const newSpacing = 10 + (normalizedX * 90);
            this.liquidGlassParams.gridSpacing = Math.max(10, Math.min(100, newSpacing));
            
            if (this.uiElements.gridSpacingSlider) {
                this.uiElements.gridSpacingSlider.value = this.liquidGlassParams.gridSpacing;
            }
            this.renderCallback();
            return;
        }

        // Handle dragging and resizing
        this.startDragOrResize(mousePos);
        e.preventDefault();
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
            }
        } else if (this.isPointInsideLiquidGlass(mousePos.x, mousePos.y)) {
            this.isElementDragging = true;
            this.dragTarget = 'liquidGlass';
            this.canvas.style.cursor = 'grabbing';
            this.initialLiquidGlassCenterX = this.positions.liquidGlassCenterPosition.x;
            this.initialLiquidGlassCenterY = this.positions.liquidGlassCenterPosition.y;
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
                this.renderCallback();
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
}
