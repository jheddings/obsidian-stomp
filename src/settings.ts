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
} as const;

abstract class SettingsGroup {
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

class KeyBindingsGroup extends SettingsGroup {
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

class ScrollingGroup extends SettingsGroup {
    constructor(plugin: ObsidianStompPlugin) {
        super(plugin, "Page Scrolling");
    }

    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Page Scroll Duration")
            .setDesc("Duration of page scroll animation in seconds. Lower values = faster.")
            .addSlider((slider) => {
                slider.setLimits(0.1, 2.0, 0.05);
                slider.setValue(this._plugin.settings.pageScrollDuration);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this._plugin.settings.pageScrollDuration = value;
                    await this._plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Page Scroll Amount")
            .setDesc("Pixels to scroll when page commands are executed.")
            .addSlider((slider) => {
                slider.setLimits(10, 1200, 10);
                slider.setValue(this._plugin.settings.pageScrollAmount);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this._plugin.settings.pageScrollAmount = value;
                    await this._plugin.saveSettings();
                });
            });
    }
}

class AdvancedGroup extends SettingsGroup {
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
            placeholder: "Click here and press your pedal buttons or keys",
            attr: {
                style: "width: 100%; padding: 8px; margin-top: 8px;",
            },
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
    private _tabs: SettingsGroup[];

    constructor(app: App, plugin: ObsidianStompPlugin) {
        super(app, plugin);

        this._tabs = [
            new KeyBindingsGroup(plugin),
            new ScrollingGroup(plugin),
            new AdvancedGroup(plugin),
        ];
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const tabContainer = containerEl.createEl("div", {
            attr: {
                style: "display: flex; border-bottom: 1px solid var(--background-modifier-border); margin-bottom: 20px;",
            },
        });

        const tabContentDiv = containerEl.createEl("div");

        this._tabs.forEach((tab) => {
            const tabEl = tabContainer.createEl("button", {
                text: tab.name,
                attr: {
                    style: `
                        padding: 10px 20px;
                        border: none;
                        background: transparent;
                        color: var(--text-normal);
                        cursor: pointer;
                        border-bottom: 2px solid transparent;
                    `,
                },
            });

            tabEl.addEventListener("click", () => {
                tabContentDiv.empty();

                this._tabs.forEach((jtab) => {
                    jtab.isActive = jtab.id === tab.id;
                });

                tab.display(tabContentDiv);
            });
        });

        // show the first tab to start off
        this._tabs[0].display(tabContentDiv);
    }
}
