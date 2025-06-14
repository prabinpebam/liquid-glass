export class ShadowControls {
    constructor(params, configManager, renderCallback) {
        this.p               = params;
        this.cfg             = configManager;
        this.renderCallback  = renderCallback;

        // Element references
        this.blurSlider      = document.getElementById('dropShadowBlurSlider');
        this.blurValue       = document.getElementById('dropShadowBlurValue');
        this.offsetXSlider   = document.getElementById('dropShadowOffsetXSlider');
        this.offsetXValue    = document.getElementById('dropShadowOffsetXValue');
        this.offsetYSlider   = document.getElementById('dropShadowOffsetYSlider');
        this.offsetYValue    = document.getElementById('dropShadowOffsetYValue');
        this.opacitySlider   = document.getElementById('dropShadowOpacitySlider');
        this.opacityValue    = document.getElementById('dropShadowOpacityValue');
    }

    initialize() {
        this.setup('dropShadowBlur',    this.blurSlider,  this.blurValue, 0, 'px');
        this.setup('dropShadowOffsetX', this.offsetXSlider, this.offsetXValue, 0, 'px');
        this.setup('dropShadowOffsetY', this.offsetYSlider, this.offsetYValue, 0, 'px');
        this.setup('dropShadowOpacity', this.opacitySlider, this.opacityValue, 2);
    }

    // helper ----------------------------------------------------
    setup(key, slider, label, precision, unit='') {
        if (!slider) { console.warn(`Shadow slider '${key}' missing.`); return; }
        slider.value = this.p[key];
        if (label) label.textContent = this.p[key].toFixed(precision) + unit;

        slider.addEventListener('input', e => {
            const v = parseFloat(e.target.value);
            this.p[key] = v;
            if (label) label.textContent = v.toFixed(precision) + unit;
            this.cfg.saveCurrentState();
            this.renderCallback();
        });
    }
}
