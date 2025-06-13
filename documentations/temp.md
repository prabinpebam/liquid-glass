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
    - Gradient fill will have the following stops
        1. Stop 1
            - position: 0%
            - rgba(255, 255, 255, 0)
        2. Stop 2
            - position: 12%
            - rgba(255, 255, 255, 0)
        3. Stop 3
            - position: 24%
            - rgba(255, 255, 255, 1)
        4. Stop 4
            - position: 34%
            - rgba(255, 255, 255, 1)
        5. Stop 5
            - position: 46%
            - rgba(255, 255, 255, 0)
        6. Stop 6
            - position: 56%
            - rgba(255, 255, 255, 0)
        7. Stop 7
            - position: 68%
            - rgba(255, 255, 255, 1)
        8. Stop 8
            - position: 78%
            - rgba(255, 255, 255, 1)
        9. Stop 9
            - position: 100%
            - rgba(255, 255, 255, 0)

- Add a slider to control the offset of the start point of the gradient of the border filed.
   - Slider value ranges from 0 to 360 degrees
- Add all required sliders in the control-pane > Reflections