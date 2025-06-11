Add a save button on the top right of the control pane.
- This will save all current parameters of what's configured in the control-pane. It should be exhaustive and include everything.
- There should be a load button also just beside the save button.
- Use this icon for save with no label
    - assets\save.svg
- No icon for load, just use label "Load"
- Both of this button should be small and should use the frosted look.
- Saving this will save the configuration as json in local storage.
- Saving will trigger a modal dialog asking user to enter the name of the liquid glass configuration.
- Create a separate js for local storage management
- Load will bring over a dropdown menu listing all the saved configurations
    - Use frosted glass look for this too
    - Hover increase opacity, active/select is done with the same blue color used for the tab pills.
    - On hover, there should be a delete icon on the right side, red color circle with frosted glass finish.
        - Deleting removes the preset from the local storage save.

"DO NOT BREAK EXISTING STYLE AND FUCNTIONALITIES""