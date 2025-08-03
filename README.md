# STOMP - Obsidian Foot Pedal Plugin

A simple Obsidian plugin that enables hands-free reading using foot pedals. STOMP receives system key events to provide smooth, customizable scrolling through your notes. I initially wrote this to integrate with my [Coda STOMP](https://www.codamusictech.com/) (hence the name), but it should work with any pedal.

## Purpose

Some uses for this plugin include:

- Using Obsidian for [chord sheets](https://github.com/jheddings/obsidian-chopro)
- Taking notes while reading books or papers
- Keeping hands free for other tasks while reviewing content
- Using accessibility devices that map to system keys

## Features

- **Multiple Scroll Modes**: Page scrolling, section scrolling, quick scrolling, and auto scrolling
- **Configurable Key Bindings**: Map system keys to scroll commands for foot pedal compatibility
- **Smooth Scrolling**: Animated scrolling with configurable duration
- **Section Navigation**: Jump between headings (H1, H2) and horizontal rules with custom selectors
- **Auto Scrolling**: Continuous scrolling at configurable speeds with toggle controls
- **Command Palette**: All scroll commands available via Obsidian's command palette

## Configuration

Access settings through **Settings → Community Plugins → STOMP**.

### Key Bindings

Configure system-level key events to trigger scroll commands. These keys are typically not available as hotkeys, but are commonly used by foot pedals.

Available commands include:

- **Stop scrolling** - Stop any active scroll animation
- **Scroll page up/down** - Scroll by a percentage of the viewport height
- **Quick scroll up/down** - Fast scroll with full viewport height
- **Scroll to next/previous section** - Jump between headings or section elements
- **Auto scroll up/down** - Continuously scroll at a set speed
- **Toggle auto scroll up/down** - Toggle continuous scrolling

This allows you to mix-and-match scroll settings for different actions. As an example, a common configuration on a foot pedal binds the "Scroll page down" to `Page Down` and the "Quick scroll up" to `Page Up`.

### Page Scrolling

Page scrolling moves the viewable area by a user-defined percentage at a specific speed. There are separate configurations for standard scroll commands and quick-scroll commands, allowing different scroll amounts and durations.

### Section Scrolling

Section scrolling allows jumping to specific section elements rather than fixed page amounts. You can configure which elements to stop at:

- Heading level 1 (`<h1>`) elements
- Heading level 2 (`<h2>`) elements
- Horizontal rules (`<hr>`) elements
- Custom CSS selectors for additional elements

### Auto Scrolling

Auto scrolling provides continuous movement at a configurable speed until reaching the top/bottom of the document or stopped by another command. Toggle commands allow starting and stopping auto scroll with the same key binding.

### Advanced Settings

- **Debug Logging**: Configurable log levels for troubleshooting
- **Key Capture Test**: Interactive area to test which keys your pedal sends

## Installation

### From Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "STOMP"
4. Install the plugin and enable it

### Manual Installation

1. Download the latest release from the [GitHub releases page](https://github.com/jheddings/obsidian-stomp/releases)
2. Extract the files to your vault's `.obsidian/plugins/stomp/` directory
3. Reload Obsidian and enable the plugin in Community Plugins settings

### Development Installation

Installation is supported using [BRAT](https://tfthacker.com/BRAT) for testing development versions.

## Support

If you encounter issues or have feature requests, please:

1. Check the [GitHub Issues](https://github.com/jheddings/obsidian-stomp/issues) page
2. Create a new issue with detailed information about the problem
3. Include your Obsidian version and operating system

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Known Issues

- On some mobile devices, the Page Up / Down keys are not properly captured and may not trigger the plugin.
- Key bindings may conflict with system shortcuts on some operating systems.
