import { App, PluginSettingTab, Setting } from "obsidian";
import { LogLevel } from "./logger";
import ObsidianStompPlugin from "./main";

export interface StompPluginSettings {
    logLevel: LogLevel;
    pageScrollDuration: number;
    pageScrollAmount: number;
}

export class StompSettingsTab extends PluginSettingTab {
    plugin: ObsidianStompPlugin;

    constructor(app: App, plugin: ObsidianStompPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

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
