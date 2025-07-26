import { App, PluginSettingTab, Setting } from "obsidian";
import { LogLevel } from "./logger";
import ObsidianStompPlugin, { PLUGIN_COMMANDS } from "./main";
import { getCommandBinding, setCommandBinding } from "./config";

export const AVAILABLE_KEYS = {
    PageUp: "Page Up",
    PageDown: "Page Down",
    ArrowUp: "Arrow Up",
    ArrowDown: "Arrow Down",
    ArrowLeft: "Arrow Left",
    ArrowRight: "Arrow Right",
    " ": "Space",
    Enter: "Enter",
    Home: "Home",
    End: "End",
    Escape: "Escape",
} as const;

abstract class SettingsTabPage {
    public isActive: boolean = false;

    protected _plugin: ObsidianStompPlugin;
    protected _name: string;

    constructor(plugin: ObsidianStompPlugin, name: string) {
        this._plugin = plugin;
        this._name = name;
    }

    get id(): string {
        return this._name.toLowerCase().replace(/\s+/g, "-");
    }

    get name(): string {
        return this._name;
    }

    abstract display(containerEl: HTMLElement): void;
}

class KeyBindingSettings extends SettingsTabPage {
    constructor(plugin: ObsidianStompPlugin) {
        super(plugin, "Key Bindings");
    }

    display(containerEl: HTMLElement): void {
        new Setting(containerEl).setDesc("Configure key bindings for plugin commands.");

        PLUGIN_COMMANDS.forEach((command) => {
            const currentBinding = getCommandBinding(this._plugin.settings, command.id);
            const currentKey = currentBinding?.key || "";

            const setting = new Setting(containerEl)
                .setName(command.name)
                .setDesc(`Command: ${command.id}`);

            setting.addDropdown((dropdown) => {
                dropdown.addOption("", "None");

                Object.entries(AVAILABLE_KEYS).forEach(([key, displayName]) => {
                    dropdown.addOption(key, displayName);
                });

                dropdown.setValue(currentKey);
                dropdown.onChange(async (value) => {
                    const newKey = value || null;
                    setCommandBinding(this._plugin.settings, command.id, newKey);
                    await this._plugin.saveSettings();
                });
            });
        });
    }
}

class PageScrollSettings extends SettingsTabPage {
    constructor(plugin: ObsidianStompPlugin) {
        super(plugin, "Page Scrolling");
    }

    display(containerEl: HTMLElement): void {
        const pageSettings = this._plugin.settings.pageScrollSettings;
        const quickSettings = this._plugin.settings.quickScrollSettings;

        new Setting(containerEl)
            .setName("Page Scroll Duration")
            .setDesc("Duration of page scroll animation in seconds.")
            .addSlider((slider) => {
                slider.setLimits(0, 2.0, 0.05);
                slider.setValue(pageSettings.scrollDuration);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    pageSettings.scrollDuration = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Page Scroll Amount")
            .setDesc("Percentage of view to scroll when commands are executed.")
            .addSlider((slider) => {
                slider.setLimits(5, 100, 1);
                slider.setValue(pageSettings.scrollAmount);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    pageSettings.scrollAmount = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Quick Scroll Duration")
            .setDesc("Duration of quick scroll animation in seconds.")
            .addSlider((slider) => {
                slider.setLimits(0, 0.5, 0.05);
                slider.setValue(quickSettings.scrollDuration);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    quickSettings.scrollDuration = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Quick Scroll Amount")
            .setDesc("Percentage of view to scroll when quick commands are executed.")
            .addSlider((slider) => {
                slider.setLimits(5, 100, 1);
                slider.setValue(quickSettings.scrollAmount);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    quickSettings.scrollAmount = value;
                    await this._plugin.saveSettings();
                });
            });
    }
}

class SectionScrollSettings extends SettingsTabPage {
    constructor(plugin: ObsidianStompPlugin) {
        super(plugin, "Section Scrolling");
    }

    display(containerEl: HTMLElement): void {
        const settings = this._plugin.settings.sectionScrollSettings;

        new Setting(containerEl)
            .setName("Section Scroll Duration")
            .setDesc("Duration of section scroll animation in seconds.")
            .addSlider((slider) => {
                slider.setLimits(0, 2.0, 0.05);
                slider.setValue(settings.scrollDuration);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    settings.scrollDuration = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Stop at Heading level 1 sections")
            .setDesc("Include `<h1>` elements when scrolling to sections.")
            .addToggle((toggle) => {
                toggle.setValue(settings.stopAtH1);
                toggle.onChange(async (value) => {
                    settings.stopAtH1 = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Stop at Heading level 2 sections")
            .setDesc("Include `<h2>` elements when scrolling to sections.")
            .addToggle((toggle) => {
                toggle.setValue(settings.stopAtH2);
                toggle.onChange(async (value) => {
                    settings.stopAtH2 = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Stop at Horizontal Rules")
            .setDesc("Include `<hr>` elements when scrolling to sections.")
            .addToggle((toggle) => {
                toggle.setValue(settings.stopAtHR);
                toggle.onChange(async (value) => {
                    settings.stopAtHR = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Custom Elements")
            .setDesc("CSS selectors for additional custom elements (one per line).")
            .addTextArea((textArea) => {
                textArea.setValue(settings.stopAtCustom.join("\n"));
                textArea.setPlaceholder("h3\nh4\n.custom-section\n[data-section]");
                textArea.onChange(async (value) => {
                    const elements = value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0);

                    settings.stopAtCustom = elements;
                    await this._plugin.saveSettings();
                });
            });
    }
}

class AdvancedSettings extends SettingsTabPage {
    constructor(plugin: ObsidianStompPlugin) {
        super(plugin, "Advanced");
    }

    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Log Level")
            .setDesc("Set the logging level for debug output")
            .addDropdown((dropdown) => {
                dropdown.addOption(LogLevel.ERROR.toString(), "Error");
                dropdown.addOption(LogLevel.WARN.toString(), "Warning");
                dropdown.addOption(LogLevel.INFO.toString(), "Info");
                dropdown.addOption(LogLevel.DEBUG.toString(), "Debug");
                dropdown.setValue(this._plugin.settings.logLevel.toString());
                dropdown.onChange(async (value) => {
                    this._plugin.settings.logLevel = parseInt(value) as LogLevel;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl).setName("Key Capture Test").setHeading();

        const testArea = containerEl.createEl("div", {
            cls: "stomp-key-test-area",
        });

        testArea.createEl("p", {
            text: "Press any key while focused in this area to see what key codes are being sent:",
        });

        const keyDisplay = testArea.createEl("div", {
            cls: "stomp-key-display",
            text: "No keys pressed yet...",
        });

        const testInput = testArea.createEl("input", {
            type: "text",
            placeholder: "Click here and press your pedal buttons or keys",
            cls: "stomp-key-test-input",
        });

        testInput.addEventListener("keydown", (e) => {
            e.preventDefault();
            keyDisplay.innerHTML = `
                <strong>Key detected:</strong><br>
                Key: "${e.key}"<br>
                Code: "${e.code}"<br>
                Timestamp: ${new Date().toLocaleTimeString()}
            `;
        });
    }
}

export class StompSettingsTab extends PluginSettingTab {
    private tabs: SettingsTabPage[];

    constructor(app: App, plugin: ObsidianStompPlugin) {
        super(app, plugin);

        this.tabs = [
            new KeyBindingSettings(plugin),
            new PageScrollSettings(plugin),
            new SectionScrollSettings(plugin),
            new AdvancedSettings(plugin),
        ];
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const tabContainer = containerEl.createEl("div", {
            cls: "stomp-settings-tab-container",
        });

        const tabContentDiv = containerEl.createEl("div");

        this.tabs.forEach((tab) => {
            const tabEl = tabContainer.createEl("button", {
                text: tab.name,
                cls: "stomp-settings-tab-button",
            });

            tabEl.addEventListener("click", () => {
                tabContentDiv.empty();

                this.tabs.forEach((jtab) => {
                    jtab.isActive = jtab.id === tab.id;
                });

                this.updateTabButtonStyles(tabContainer);

                tab.display(tabContentDiv);
            });
        });

        // show the first tab to start off
        this.tabs[0].isActive = true;
        this.tabs[0].display(tabContentDiv);

        this.updateTabButtonStyles(tabContainer);
    }

    private updateTabButtonStyles(tabContainer: HTMLElement): void {
        const tabButtons = tabContainer.querySelectorAll(".stomp-settings-tab-button");

        tabButtons.forEach((button, index) => {
            const tab = this.tabs[index];
            if (tab && tab.isActive) {
                button.addClass("stomp-settings-tab-button-active");
            } else {
                button.removeClass("stomp-settings-tab-button-active");
            }
        });
    }
}
