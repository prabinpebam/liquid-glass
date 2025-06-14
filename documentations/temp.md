Add the following text in white color with 80% opacity in the bottom right corner of the canvas. The text should be part of the canvas.

EXPLORE LIQUID GLASS
by Prabin Pebam

- Click and drag the shape to see liquid glass effect.
- Click and drag the top right corner of the shape and images to resize them.
- Add image to the canvas with the add image button
- Right click to delete images
- Switch on/off grid to inspect distortion
- Save and load configuration (browser local storage)



# Reflections
We are going to simulate reflection in the following manner.
- We will have a border running all around the shape as the border of the shape
- This border will be overlaid on top of the shape
- We should be able to control the thickness of the border in pixels
- We should be able to control the blur of the border with blur amount upto 10px
- We should be able to define an offset value in pixel of how much the border will be inside the shape. This border can't go out of the shape.
- Here's the most critical part
    - The border will have a gradient fill running all around the length of the border
    - There should be a slider to control all the positions of the stops of the gradient. Color can't be controlled
    - Add control for overall opacity of the reflection border overlay
    - Gradient fill will have the following stops      
        1. Stop 1
            - position: 0%
            - rgba(255, 255, 255, 0)
        2. Stop 2
            - position: 10%
            - rgba(255, 255, 255, 0)
        3. Stop 3
            - position: 25%
            - rgba(255, 255, 255, 1)
        4. Stop 4
            - position: 35%
            - rgba(255, 255, 255, 1)
        5. Stop 5
            - position: 50%
            - rgba(255, 255, 255, 0)
        6. Stop 6
            - position: 60%
            - rgba(255, 255, 255, 0)
        7. Stop 7
            - position: 75%
            - rgba(255, 255, 255, 1)
        8. Stop 8
            - position: 85%
            - rgba(255, 255, 255, 1)
        9. Stop 9
            - position: 100%
            - rgba(255, 255, 255, 0)
    - The gradient stop can be explained as below
       - dark zone 1 (Stop 1 to 2 = 10%) (No reflection zone)
       - Transition 1: transition to highlight 1 (Stop 2 to 3 = 15%)
       - Highlight 1 (Stop 3 to 4 = 10%)
       - Transition 2: Transition to dark zone 2 (Stop 4 to 5 = 15%)
       - Dark zone 2 (Stop 5 to 6 = 10%)
       - Transition 3: Transition to highlight 2 (Stop 6 to 7 = 15%)
       - Highlight 2 (Stop 7 to 8 = 10%)
       - Transition 4: Transition to dark zone 1 (Stop 8 to 9 = 15%)
    - User controls for reflection gradients that will be made available
        - Highlight size % (Both highlights will have same size)
        - Transition size % (All transition size will be same)
        - Dark zone size is derived automatically from what's left (Both dark zone size will be same)
    - UI Control for reflection gradient
        - A single slider with 2 nodes creating 3 sections in the slider
           - 1st section represents highlight (2h, h to indicate highlight)
           - 2nd section represents transition (4t)
           - 3rd section represents dark zone (2d)
           - 2h % + 4t % + 2d % = 100%
           - Users should be able to slide the 2 nodes to play around with the percentage
           - Add proper labels and display current % value for each section

- Add a slider to control the offset of the start point of the gradient of the border filed.
   - Slider value ranges from 0 to 360 degrees
- Add all required sliders in the control-pane > Reflections





# Output from AI

The reflection border is painted with a closed-loop (conic) gradient that repeats one full “cycle” of brightness around the perimeter.  
That cycle is subdivided into nine colour-stops whose default positions and opacities are listed.  Reading the list sequentially (0 % → 100 %) gives four repeating visual regions:

1. Dark zone 1 (no reflection) 0 – 10 %
2. Transition 1 smooth ramp up 10 – 25 %  (15 %)
3. Highlight 1 bright, opaque 25 – 35 %  (10 %)
4. Transition 2 ramp down      35 – 50 %  (15 %)
5. Dark zone 2 (no reflection) 50 – 60 %
6. Transition 3 ramp up        60 – 75 %  (15 %)
7. Highlight 2 bright, opaque 75 – 85 %  (10 %)
8. Transition 4 ramp down      85 – 100 % (15 %)

Because the gradient is circular, Stop 9 (100 %) is the same colour as Stop 1 (0 %), so the pattern loops seamlessly.

User-adjustable parameters  
Rather than exposing nine independent sliders, only two widths are editable:

• “Highlight size %” (2h) – length of each bright segment (defaults to 10 %)  
• “Transition size %” (4t) – length of every fade segment (defaults to 15 %)

Whatever percentage remains after 2 × highlight + 4 × transition is split equally between the two dark zones (2d).  
Mathematically: 2h + 4t + 2d = 100 → d = (100 − 2h − 4t)/2

## UI concept  
A single slider with 2 nodes creating 3 sections.
One dual-thumb range slider represents the three sections in the order highlight → transition → dark-zone.  
Moving the first thumb alters “highlight %”, moving the second thumb alters “transition %”; the dark-zone portion auto-updates so that the sum stays at 100 %.
As there are
    - as there are 2 highlight areas-in-the-gradient, the highlight section-in-the-slider should represent 2 times the width of each highlight areas-in-the-gradient,
    - as there are 4 transition areas-in-the-gradient, the transition section-in-the-slider should represent 4 times the width of the transition areas-in-the-gradient
    - as there are 2 dark-zone areas-in-the-gradient, the dark-zone section-in-the-slider should represent 2 times the width of dark-zone areas-in-the-gradient
Labels beside (or inside) the slider display the current 2h %, 4t %, and 2d %.