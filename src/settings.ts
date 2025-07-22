import { App, PluginSettingTab, Setting } from "obsidian";
import { LogLevel } from "./logger";
import ObsidianStompPlugin from "./main";

export interface KeyBinding {
    commandId: string;
    key: string | null;
}

export interface StompPluginSettings {
    logLevel: LogLevel;
    pageScrollDuration: number;
    pageScrollAmount: number;
    commandBindings: KeyBinding[];
}

// Available keys for binding commands
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

export type AvailableKey = keyof typeof AVAILABLE_KEYS;

export function getCommandBinding(
    settings: StompPluginSettings,
    commandId: string
): KeyBinding | undefined {
    return settings.commandBindings.find((binding) => binding.commandId === commandId);
}

export function setCommandBinding(
    settings: StompPluginSettings,
    commandId: string,
    key: string | null
): void {
    const existingBinding = settings.commandBindings.find(
        (binding) => binding.commandId === commandId
    );
    if (existingBinding) {
        existingBinding.key = key;
    } else {
        settings.commandBindings.push({ commandId, key });
    }
}

export function findBindingByKey(
    settings: StompPluginSettings,
    key: string
): KeyBinding | undefined {
    return settings.commandBindings.find((binding) => binding.key === key);
}

export class StompSettingsTab extends PluginSettingTab {
    plugin: ObsidianStompPlugin;
    private activeTab: string = "keybindings";

    constructor(app: App, plugin: ObsidianStompPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const tabContainer = containerEl.createEl("div", {
            attr: {
                style: "display: flex; border-bottom: 1px solid var(--background-modifier-border); margin-bottom: 20px;",
            },
        });

        const tabs = [
            { id: "keybindings", name: "Key Bindings" },
            { id: "scrolling", name: "Page Scrolling" },
            { id: "advanced", name: "Advanced" },
        ];

        tabs.forEach((tab) => {
            const tabEl = tabContainer.createEl("button", {
                text: tab.name,
                attr: {
                    style: `
                        padding: 10px 20px;
                        border: none;
                        background: ${this.activeTab === tab.id ? "var(--background-modifier-hover)" : "transparent"};
                        color: var(--text-normal);
                        cursor: pointer;
                        border-bottom: ${this.activeTab === tab.id ? "2px solid var(--interactive-accent)" : "2px solid transparent"};
                    `,
                },
            });

            tabEl.addEventListener("click", () => {
                this.activeTab = tab.id;
                this.display();
            });
        });

        // Display content based on active tab
        const contentEl = containerEl.createEl("div");

        switch (this.activeTab) {
            case "keybindings":
                this.displayKeyBindingsTab(contentEl);
                break;
            case "scrolling":
                this.displayScrollingTab(contentEl);
                break;
            case "advanced":
                this.displayAdvancedTab(contentEl);
                break;
        }
    }

    private displayKeyBindingsTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName("Key Bindings").setHeading();

        new Setting(containerEl).setDesc(
            "Configure key bindings for plugin commands. Choose from the available keys to assign to each command."
        );

        // Display all available commands with their key bindings
        this.plugin.listCommands().forEach((command) => {
            this.createCommandBindingSetting(containerEl, command.id, command.name);
        });
    }

    private createCommandBindingSetting(
        containerEl: HTMLElement,
        commandId: string,
        commandName: string
    ): void {
        const currentBinding = getCommandBinding(this.plugin.settings, commandId);
        const currentKey = currentBinding?.key || "";

        const setting = new Setting(containerEl)
            .setName(commandName)
            .setDesc(`Command: ${commandId}`);

        // Key selection dropdown
        setting.addDropdown((dropdown) => {
            // Add "None" option
            dropdown.addOption("", "None");

            // Add all available keys
            Object.entries(AVAILABLE_KEYS).forEach(([key, displayName]) => {
                dropdown.addOption(key, displayName);
            });

            dropdown.setValue(currentKey);
            dropdown.onChange(async (value) => {
                const newKey = value || null;
                setCommandBinding(this.plugin.settings, commandId, newKey);
                await this.plugin.saveSettings();
                this.display(); // Refresh to show/hide conflicts
            });
        });

        // Show conflict warning if this key is used by another command
        if (currentKey) {
            const conflictingBinding = this.plugin.settings.commandBindings.find(
                (binding) => binding.key === currentKey && binding.commandId !== commandId
            );
            if (conflictingBinding) {
                const conflictCommand = this.plugin
                    .listCommands()
                    .find((cmd) => cmd.id === conflictingBinding.commandId);
                const keyDisplayName = AVAILABLE_KEYS[currentKey as AvailableKey] || currentKey;
                setting.setDesc(
                    `⚠️ Key "${keyDisplayName}" is also assigned to: ${conflictCommand?.name || conflictingBinding.commandId}`
                );
            }
        }
    }

    private displayScrollingTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName("Page Scrolling").setHeading();

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
            .setDesc("Pixels to scroll when Page Up/Down commands are executed")
            .addSlider((slider) => {
                slider.setLimits(10, 1200, 10);
                slider.setValue(this.plugin.settings.pageScrollAmount);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this.plugin.settings.pageScrollAmount = value;
                    await this.plugin.saveSettings();
                });
            });
    }

    private displayAdvancedTab(containerEl: HTMLElement): void {
        new Setting(containerEl).setName("Advanced Settings").setHeading();

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

        // Key capture test area
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
