import { App, PluginSettingTab, Setting } from "obsidian";
import { LogLevel } from "./logger";
import ObsidianStompPlugin from "./main";

export interface StompPluginSettings {
    logLevel: LogLevel;
    pageScrollDuration: number;
    pageScrollAmount: number;
    scrollUpKey: string;
    scrollUpCommand: string;
    scrollDownKey: string;
    scrollDownCommand: string;
}

export const UP_LIKE_KEYS = [
    { value: "none", display: "None" },
    { value: "PageUp", display: "Page Up" },
    { value: "ArrowUp", display: "Up Arrow" },
    { value: "ArrowLeft", display: "Left Arrow" },
    { value: "Home", display: "Home" },
];

export const DOWN_LIKE_KEYS = [
    { value: "none", display: "None" },
    { value: "PageDown", display: "Page Down" },
    { value: "ArrowDown", display: "Down Arrow" },
    { value: "ArrowRight", display: "Right Arrow" },
    { value: "End", display: "End" },
];

export class StompSettingsTab extends PluginSettingTab {
    plugin: ObsidianStompPlugin;

    constructor(app: App, plugin: ObsidianStompPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getAvailableCommands(): {
        up: Array<{ value: string; display: string }>;
        down: Array<{ value: string; display: string }>;
    } {
        const commands = this.plugin.listCommands();
        const upCommands = [{ value: "none", display: "None" }];
        const downCommands = [{ value: "none", display: "None" }];

        commands.forEach((cmd: { id: string; name: string }) => {
            if (cmd.id.includes("-up")) {
                upCommands.push({ value: cmd.id, display: cmd.name });
            } else if (cmd.id.includes("-down")) {
                downCommands.push({ value: cmd.id, display: cmd.name });
            }
        });

        return { up: upCommands, down: downCommands };
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        const availableCommands = this.getAvailableCommands();

        new Setting(containerEl)
            .setName("Scroll Up Key")
            .setDesc("Select which key should trigger scrolling up")
            .addDropdown((dropdown) => {
                UP_LIKE_KEYS.forEach((key) => {
                    dropdown.addOption(key.value, key.display);
                });
                dropdown.setValue(this.plugin.settings.scrollUpKey);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.scrollUpKey = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Scroll Up Command")
            .setDesc("Select which command to execute when the up key is pressed")
            .addDropdown((dropdown) => {
                availableCommands.up.forEach((cmd) => {
                    dropdown.addOption(cmd.value, cmd.display);
                });
                dropdown.setValue(this.plugin.settings.scrollUpCommand);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.scrollUpCommand = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Scroll Down Key")
            .setDesc("Select which key should trigger scrolling down")
            .addDropdown((dropdown) => {
                DOWN_LIKE_KEYS.forEach((key) => {
                    dropdown.addOption(key.value, key.display);
                });
                dropdown.setValue(this.plugin.settings.scrollDownKey);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.scrollDownKey = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Scroll Down Command")
            .setDesc("Select which command to execute when the down key is pressed")
            .addDropdown((dropdown) => {
                availableCommands.down.forEach((cmd) => {
                    dropdown.addOption(cmd.value, cmd.display);
                });
                dropdown.setValue(this.plugin.settings.scrollDownCommand);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.scrollDownCommand = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl).setName("Page Scrolling").setHeading();

        new Setting(containerEl)
            .setName("Page Scroll Duration")
            .setDesc(
                "Duration of page scroll animation in seconds. Lower values = faster scrolling."
            )
            .addSlider((slider) => {
                slider.setLimits(0.1, 2.0, 0.05);
                slider.setValue(this.plugin.settings.pageScrollDuration);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this.plugin.settings.pageScrollDuration = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Page Scroll Amount")
            .setDesc("Pixels to scroll when Page Up/Down is pressed (in Page mode)")
            .addSlider((slider) => {
                slider.setLimits(10, 1200, 10);
                slider.setValue(this.plugin.settings.pageScrollAmount);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this.plugin.settings.pageScrollAmount = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl).setName("Advanced Settings").setHeading();

        new Setting(containerEl)
            .setName("Log Level")
            .setDesc("Set the logging level for debug output")
            .addDropdown((dropdown) => {
                dropdown.addOption(LogLevel.ERROR.toString(), "Error");
                dropdown.addOption(LogLevel.WARN.toString(), "Warning");
                dropdown.addOption(LogLevel.INFO.toString(), "Info");
                dropdown.addOption(LogLevel.DEBUG.toString(), "Debug");
                dropdown.setValue(this.plugin.settings.logLevel.toString());
                dropdown.onChange(async (value) => {
                    this.plugin.settings.logLevel = parseInt(value) as LogLevel;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl).setName("Key Capture Test").setHeading();

        const testArea = containerEl.createEl("div", {
            attr: {
                style: "border: 1px solid var(--background-modifier-border); padding: 10px; margin: 10px 0; border-radius: 4px;",
            },
        });

        testArea.createEl("p", {
            text: "Press any key while focused in this area to see what key codes are being sent:",
        });

        const keyDisplay = testArea.createEl("div", {
            attr: {
                style: "background: var(--background-secondary); padding: 8px; border-radius: 4px; font-family: monospace; min-height: 40px;",
            },
            text: "No keys pressed yet...",
        });

        const testInput = testArea.createEl("input", {
            type: "text",
            placeholder: "Click here and press your pedal buttons",
            attr: {
                style: "width: 100%; padding: 8px; margin-top: 8px;",
            },
        });

        testInput.addEventListener("keydown", (e) => {
            e.preventDefault();
            keyDisplay.innerHTML = `
				<strong>Last key pressed:</strong><br>
				Key: "${e.key}"<br>
				Code: "${e.code}"<br>
				Ctrl: ${e.ctrlKey}, Shift: ${e.shiftKey}, Alt: ${e.altKey}<br>
				Timestamp: ${new Date().toLocaleTimeString()}
			`;
        });
    }
}
