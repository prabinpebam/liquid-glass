# Liquid Glass Effect

A WebGL-based implementation of Apple's "Liquid Glass" visual effect from iOS 26, featuring realistic glass refraction distortion applied to UI surfaces with controllable distortion, frosting, and transparency.

![Liquid Glass Effect Demo](assets/demo-screenshot.png)

## Features

- **Real-time Glass Effect**: Interactive liquid glass with refraction distortion and edge effects
- **Background Image Support**: Load and position multiple background images
- **Interactive Controls**: Drag and resize glass surfaces and images
- **Grid System**: Toggleable grid overlay with adjustable spacing
- **Glass UI Elements**: Control panels and buttons with their own glass effects
- **Touch-friendly**: Responsive design that works on desktop and touch devices

## Getting Started

### Prerequisites

- A modern web browser with WebGL support
- Local web server (for loading assets)

### Installation

1. Clone or download this repository
2. Start a local web server in the project directory:
   ```bash
   # Using Python 3
   python -m http.server 8008
   
   # Using Node.js (http-server)
   npx http-server -p 8008
   
   # Using PHP
   php -S localhost:8008
   ```
3. Open your browser and navigate to `http://localhost:8008`

## Usage

### Basic Controls

- **Drag Glass Surface**: Click and drag the liquid glass rectangle to move it
- **Resize Glass**: Drag the edges of the glass surface to resize
- **Add Images**: Click the add image button (bottom-left) to upload background images
- **Grid Toggle**: Use the grid controls (bottom) to show/hide grid and adjust spacing
- **Control Panel**: Drag the title bar to move the controls panel

### Glass Parameters

The right-side control panel allows you to adjust:

- **Width/Height**: Dimensions of the glass surface
- **Corner Radius**: Roundness of the glass corners
- **Edge Distortion Thickness**: Width of the refraction effect around edges
- **Refraction Strength**: Intensity of the glass distortion effect
- **Glass Alpha**: Transparency of the glass tint
- **Frostiness**: Amount of blur/frosting effect
- **Chromatic Aberration**:
    - **Enable**: Toggles the chromatic aberration effect on/off.
    - **Amount**: Intensity of the color fringing effect at the edges when enabled.
- **Top Shadow**:
    - **Blur**: Blur radius of the top inner shadow.
    - **X Offset**: Horizontal offset of the top inner shadow.
    - **Y Offset**: Vertical offset of the top inner shadow.
    - **Opacity**: Opacity of the top inner shadow.
- **Bottom Glow**:
    - **Blur**: Blur radius of the bottom inner glow.
    - **X Offset**: Horizontal offset of the bottom inner glow.
    - **Y Offset**: Vertical offset of the bottom inner glow.
    - **Opacity**: Opacity of the bottom inner glow.

### Image Management

- **Upload**: Click the add image button to upload new images
- **Move**: Click and drag images to reposition them
- **Resize**: Drag the bottom-right corner of images (maintains aspect ratio)
- **Remove**: Right-click on any image and select "Remove"

## Project Structure

