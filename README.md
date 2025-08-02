# STOMP - Obsidian Foot Pedal Plugin

A simple Obsidian plugin that enables hands-free reading using foot pedals. STOMP receives system key events to provide smooth, customizable scrolling through your notes. I initially wrote this to integrate with my [Coda STOMP](https://www.codamusictech.com/) (hence the name), but it should work with any pedal.

## Purpose

Some uses for this plugin include:

- Using Obsidian for [chord sheets](https://github.com/jheddings/obsidian-chopro)
- Taking notes while reading books or papers
- Keeping hands free for other tasks while reviewing content
- Using accessibility devices that map to system keys

## Features

- **Smooth Scrolling**: Animated page scrolling instead of jarring jumps
- **Wide-Range Support**: Configurable key bindings used by many pedals
- **Customizable Experience**: Adjustable scroll speed and distance
- **Command Palette**: Scroll commands available via Obsidian's command palette

## Configuration

Access settings through **Settings → Community Plugins → STOMP**.

### Key Bindings

The key bindings allow a user to configure system-level key events to trigger scroll commands. Typically, these are not available as hotkeys, but it is common for foot pedals to use these keys.

This allows you to mix-and-match scroll settings for different actions. As an example, a common configuration on a foot pedal binds the "Scroll page forward" to `Page Down` and the "Quick scroll up" to `Page Up`.

### Page Scrolling

Page scrolling will scroll the viewable area by a user-defined amount at a specific speed.

There are separate configurations for the standard scroll commands, as well as quick-scroll commands.

### Section Scrolling

Section scrolling allows the user to stop at specific section elements, rather than a fixed page amount.

## Installation

Installation is supporting using [BRAT](https://tfthacker.com/BRAT).

## Known Issues

- On some mobile devices, the Page Up / Down keys are not properly captured and may not trigger the plugin.
