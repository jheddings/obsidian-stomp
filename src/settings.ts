import { App, PluginSettingTab, Setting } from "obsidian";
import { LogLevel } from "./logger";
import ObsidianStompPlugin from "./main";

export interface StompPluginSettings {
    logLevel: LogLevel;
    scrollSpeed: number;
    pageScrollAmount: number;
    showScrollLimitNotices: boolean;
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

        containerEl.createEl("h2", { text: "STOMP Pedal Settings" });

        new Setting(containerEl)
            .setName("Scroll Speed")
            .setDesc("Speed of page scrolling animation (pixels per millisecond)")
            .addSlider((slider) => {
                slider.setLimits(0.1, 5.0, 0.1);
                slider.setValue(this.plugin.settings.scrollSpeed);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this.plugin.settings.scrollSpeed = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Scroll Limit Notices")
            .setDesc("Display notices when reaching the beginning or end of content")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.showScrollLimitNotices);
                toggle.onChange(async (value) => {
                    this.plugin.settings.showScrollLimitNotices = value;
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

        containerEl.createEl("h3", { text: "Advanced Settings" });

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

        containerEl.createEl("h3", { text: "Key Capture Test" });

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
            placeholder: "Click here and press your STOMP pedal buttons",
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
