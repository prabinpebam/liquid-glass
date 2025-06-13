/*  ReflectionBorder
    -----------------
    Draws a blurred gradient stroke that stays INSIDE a rounded-rectangle shape.

    Required setup (example):
        const refl = new ReflectionBorder(overlayCanvas);
        refl.draw({
            center: { x: 400, y: 300 },
            size:   { w: 600, h: 400 },
            cornerRadius: 30,
            thickness: 8,
            blur: 4,
            offset: 6,
            rotationOffsetDeg: 0,          // 0-360, slides the gradient
            stopPositions: [0,0.1,0.4,0.5,0.6,0.9,1] // 0-1, UI sliders
        });
*/

export default class ReflectionBorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx     = canvas.getContext('2d');
        this._defaultStops = [
            0.00, 0.10, 0.40, 0.50, 0.60, 0.90, 1.00
        ];
    }

    /**
     * Draw the reflection border.
     * @param {Object} p - parameters (see above)
     */
    draw(p) {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;

        // Resize backing store to keep things crisp
        if (this.canvas.width  !== this.canvas.clientWidth  * dpr ||
            this.canvas.height !== this.canvas.clientHeight * dpr) {
            this.canvas.width  = this.canvas.clientWidth  * dpr;
            this.canvas.height = this.canvas.clientHeight * dpr;
        }
        ctx.save();
        ctx.scale(dpr, dpr);

        // ---------- NEW : global alpha ---------------------------------
        ctx.globalAlpha = ('opacity' in p) ? p.opacity : 1.0;
        // ---------------------------------------------------------------

        // Clear previous frame
        ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

        // Build gradient running along the perimeter (conic)
        const rotRad = (p.rotationOffsetDeg || 0) * Math.PI / 180;
        const grad = ctx.createConicGradient(
            rotRad,
            p.center.x,
            p.center.y
        );

        const stops = (p.stopPositions || this._defaultStops);
        const colors = [
            'rgba(255,255,255,0)', // 0  (dark)
            'rgba(255,255,255,0)', // 1  (dark end)
            'rgba(255,255,255,1)', // 2  highlight start
            'rgba(255,255,255,1)', // 3  highlight end
            'rgba(255,255,255,0)', // 4  transition-down end
            'rgba(255,255,255,0)', // 5  dark2 end
            'rgba(255,255,255,1)', // 6  highlight2 start
            'rgba(255,255,255,1)', // 7  highlight2 end
            'rgba(255,255,255,0)'  // 8  loops back – transparent
        ];
        for (let i = 0; i < colors.length; i++) {
            grad.addColorStop(stops[i], colors[i]);
        }

        // Shrink the geometry so the *outer* edge of the stroke stays inside.
        const shrink = (p.offset || 0) + (p.thickness || 1) / 2;
        const w = p.size.w - 2 * shrink;
        const h = p.size.h - 2 * shrink;

        // Corner radius (subtract only offset, clamp to ½ shorter side of shrunk rect)
        const maxCorner = Math.min(w, h) * 0.5;
        const r = Math.min(
            Math.max(0, (p.cornerRadius || 0) - (p.offset || 0)),
            maxCorner
        );

        // Decide if we should render a *perfect* circle.
        // Use ORIGINAL shape dimensions so the promotion happens only
        // when the *shape* itself is a circle, not just the shrunken border.
        const originalIsCircle =
            (p.cornerRadius || 0) >= Math.min(p.size.w, p.size.h) * 0.5 - 0.001;

        // Path helper
        function roundedRectPath(x, y, w, h, r) {
            ctx.beginPath();
            if (originalIsCircle) {
                const radius = Math.min(w, h) * 0.5;
                ctx.arc(x + w * 0.5, y + h * 0.5, radius, 0, Math.PI * 2);
            } else {
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.arcTo(x + w, y, x + w, y + r, r);

                ctx.lineTo(x + w, y + h - r);
                ctx.arcTo(x + w, y + h, x + w - r, y + h, r);

                ctx.lineTo(x + r, y + h);
                ctx.arcTo(x, y + h, x, y + h - r, r);

                ctx.lineTo(x, y + r);
                ctx.arcTo(x, y, x + r, y, r);
            }
            ctx.closePath();
        }

        ctx.filter = `blur(${Math.min(p.blur || 0, 10)}px)`;
        ctx.strokeStyle = grad;
        ctx.lineWidth   = p.thickness || 1;
        ctx.lineCap     = 'butt';   // keeps ends sharp
        ctx.lineJoin    = 'round';

        roundedRectPath(
            p.center.x - w / 2,
            p.center.y - h / 2,
            w,
            h,
            r
        );
        ctx.stroke();
        ctx.restore();
    }
}
