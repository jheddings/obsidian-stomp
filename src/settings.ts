import { App, Setting } from "obsidian";
import {
    LogLevel,
    DropdownSetting,
    SliderSetting,
    TextAreaSetting,
    ToggleSetting,
    SettingsTabPage,
    PluginSettingsTab,
} from "obskit";

import { getCommandBinding, setCommandBinding } from "./config";
import { SCROLL_COMMANDS } from "./controller";
import StompPlugin from "./main";

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

/**
 * Setting for the page scroll duration.
 */
class PageScrollDuration extends SliderSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Page scroll duration",
            description: "Duration of page scroll animation in seconds.",
        });
    }

    get value(): number {
        return this.plugin.settings.pageScrollSettings.scrollDuration ?? this.default;
    }

    set value(val: number) {
        this.plugin.settings.pageScrollSettings.scrollDuration = val;
        this.plugin.saveSettings();
    }

    get default(): number {
        return 0.25;
    }

    get minimum(): number {
        return 0;
    }

    get maximum(): number {
        return 2.0;
    }

    get step(): number {
        return 0.05;
    }
}

/**
 * Setting for the page scroll amount.
 */
class PageScrollAmount extends SliderSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Page scroll amount",
            description: "Percentage of view to scroll when commands are executed.",
        });
    }

    get value(): number {
        return this.plugin.settings.pageScrollSettings.scrollAmount ?? this.default;
    }

    set value(val: number) {
        this.plugin.settings.pageScrollSettings.scrollAmount = val;
        this.plugin.saveSettings();
    }

    get default(): number {
        return 50;
    }

    get minimum(): number {
        return 5;
    }

    get maximum(): number {
        return 100;
    }

    get step(): number {
        return 1;
    }
}

/**
 * Setting for the quick-scroll duration.
 */
class QuickScrollDuration extends SliderSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Quick scroll duration",
            description: "Duration of quick scroll animation in seconds.",
        });
    }

    get value(): number {
        return this.plugin.settings.quickScrollSettings.scrollDuration ?? this.default;
    }

    set value(val: number) {
        this.plugin.settings.quickScrollSettings.scrollDuration = val;
        this.plugin.saveSettings();
    }

    get default(): number {
        return 0.1;
    }

    get minimum(): number {
        return 0;
    }

    get maximum(): number {
        return 0.5;
    }

    get step(): number {
        return 0.05;
    }
}

/**
 * Setting for the quick-scroll amount.
 */
class QuickScrollAmount extends SliderSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Quick scroll amount",
            description: "Percentage of view to scroll when quick scroll is triggered.",
        });
    }

    get value(): number {
        return this.plugin.settings.quickScrollSettings.scrollAmount ?? this.default;
    }

    set value(val: number) {
        this.plugin.settings.quickScrollSettings.scrollAmount = val;
        this.plugin.saveSettings();
    }

    get default(): number {
        return 95;
    }

    get minimum(): number {
        return 5;
    }

    get maximum(): number {
        return 100;
    }

    get step(): number {
        return 1;
    }
}

/**
 * Setting for the section-scroll duration.
 */
class SectionScrollDuration extends SliderSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Section scroll duration",
            description: "Duration of section scroll animation in seconds.",
        });
    }

    get value(): number {
        return this.plugin.settings.sectionScrollSettings.scrollDuration ?? this.default;
    }

    set value(val: number) {
        this.plugin.settings.sectionScrollSettings.scrollDuration = val;
        this.plugin.saveSettings();
    }

    get default(): number {
        return 0.25;
    }

    get minimum(): number {
        return 0;
    }

    get maximum(): number {
        return 2.0;
    }

    get step(): number {
        return 0.05;
    }
}

/**
 * Setting for stop-on-heading-1 behavior.
 */
class StopAtHeading1 extends ToggleSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Stop at heading level 1 sections",
            description: "Include `<h1>` elements when scrolling to sections.",
        });
    }

    get value(): boolean {
        return this.plugin.settings.sectionScrollSettings.stopAtH1 ?? this.default;
    }

    set value(val: boolean) {
        this.plugin.settings.sectionScrollSettings.stopAtH1 = val;
        this.plugin.saveSettings();
    }

    get default(): boolean {
        return true;
    }
}

/**
 * Setting for stop-on-heading-2 behavior.
 */
class StopAtHeading2 extends ToggleSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Stop at heading level 2 sections",
            description: "Include `<h2>` elements when scrolling to sections.",
        });
    }

    get value(): boolean {
        return this.plugin.settings.sectionScrollSettings.stopAtH2 ?? this.default;
    }

    set value(val: boolean) {
        this.plugin.settings.sectionScrollSettings.stopAtH2 = val;
        this.plugin.saveSettings();
    }

    get default(): boolean {
        return true;
    }
}

/**
 * Setting for stop-at-horizontal-rule behavior.
 */
class StopAtHorizontalRule extends ToggleSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Stop at horizontal rule sections",
            description: "Include `<hr>` elements when scrolling to sections.",
        });
    }

    get value(): boolean {
        return this.plugin.settings.sectionScrollSettings.stopAtHR ?? this.default;
    }

    set value(val: boolean) {
        this.plugin.settings.sectionScrollSettings.stopAtHR = val;
        this.plugin.saveSettings();
    }

    get default(): boolean {
        return true;
    }
}

/**
 * User setting for custom section elements.
 */
class CustomSectionElements extends TextAreaSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Custom section elements",
            description: "CSS selectors for additional custom elements (one per line).",
        });
    }

    get value(): string {
        return this.plugin.settings.sectionScrollSettings.stopAtCustom.join("\n") ?? this.default;
    }

    set value(val: string) {
        const elements = val
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        this.plugin.settings.sectionScrollSettings.stopAtCustom = elements;
        this.plugin.saveSettings();
    }

    get default(): string {
        return "<h2>, <h3>";
    }

    get placeholder(): string {
        return "h3\nh4\n.custom-section\n[data-section]";
    }
}

/**
 * Setting for the auto-scroll speed.
 */
class AutoScrollSpeed extends SliderSetting {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Auto scroll speed",
            description: "Set the speed of auto-scrolling.",
        });
    }

    get value(): number {
        return this.plugin.settings.autoScrollSettings.scrollSpeed ?? this.default;
    }

    set value(val: number) {
        this.plugin.settings.autoScrollSettings.scrollSpeed = val;
        this.plugin.saveSettings();
    }

    get default(): number {
        return 100;
    }

    get minimum(): number {
        return 10;
    }

    get maximum(): number {
        return 500;
    }

    get step(): number {
        return 5;
    }
}

/**
 * Control the log level user setting.
 */
class LogLevelSetting extends DropdownSetting<LogLevel> {
    constructor(private plugin: StompPlugin) {
        super({
            name: "Log level",
            description: "Set the logging level for console output.",
        });
    }

    get value(): LogLevel {
        return this.plugin.settings.logLevel ?? this.default;
    }

    set value(val: LogLevel) {
        this.plugin.settings.logLevel = val;
        this.plugin.saveSettings();
    }

    get default(): LogLevel {
        return LogLevel.INFO;
    }

    get options(): { key: string; label: string; value: LogLevel }[] {
        return [
            { key: "debug", label: "Debug", value: LogLevel.DEBUG },
            { key: "info", label: "Info", value: LogLevel.INFO },
            { key: "warn", label: "Warn", value: LogLevel.WARN },
            { key: "error", label: "Error", value: LogLevel.ERROR },
            { key: "silent", label: "Silent", value: LogLevel.SILENT },
        ];
    }
}

/**
 * Settings page for key bindings.
 */
class KeyBindingSettings extends SettingsTabPage {
    /**
     * Creates a new KeyBindingSettings instance.
     */
    constructor(private plugin: StompPlugin) {
        super("Key Bindings");
    }

    /**
     * Displays the key binding settings UI.
     */
    display(containerEl: HTMLElement): void {
        new Setting(containerEl).setDesc("Configure key bindings for plugin commands.");

        SCROLL_COMMANDS.forEach((command) => {
            const currentBinding = getCommandBinding(this.plugin.settings, command.id);
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
                    setCommandBinding(this.plugin.settings, command.id, newKey);
                    await this.plugin.saveSettings();
                });
            });
        });
    }
}

/**
 * Settings page for page scrolling options.
 */
class PageScrollSettings extends SettingsTabPage {
    /**
     * Creates a new PageScrollSettings instance.
     */
    constructor(private plugin: StompPlugin) {
        super("Page Scrolling");
    }

    /**
     * Displays the page scroll settings UI.
     */
    display(containerEl: HTMLElement): void {
        new PageScrollDuration(this.plugin).display(containerEl);
        new PageScrollAmount(this.plugin).display(containerEl);
        new QuickScrollDuration(this.plugin).display(containerEl);
        new QuickScrollAmount(this.plugin).display(containerEl);
    }
}

/**
 * Settings page for section scrolling options.
 */
class SectionScrollSettings extends SettingsTabPage {
    /**
     * Creates a new SectionScrollSettings instance.
     */
    constructor(private plugin: StompPlugin) {
        super("Section Scrolling");
    }

    /**
     * Displays the section scroll settings UI.
     */
    display(containerEl: HTMLElement): void {
        new SectionScrollDuration(this.plugin).display(containerEl);
        new StopAtHeading1(this.plugin).display(containerEl);
        new StopAtHeading2(this.plugin).display(containerEl);
        new StopAtHorizontalRule(this.plugin).display(containerEl);
        new CustomSectionElements(this.plugin).display(containerEl);
    }
}

/**
 * Settings page for auto scroll behavior.
 */
class AutoScrollSettingsTab extends SettingsTabPage {
    /**
     * Creates a new AutoScrollSettings instance.
     */
    constructor(private plugin: StompPlugin) {
        super("Auto Scrolling");
    }

    /**
     * Displays the auto scroll settings UI.
     */
    display(containerEl: HTMLElement): void {
        containerEl.createEl("p", {
            text: "Auto scroll will continuously scroll at the specified speed until it reaches the top/bottom of the document or is stopped by another command.",
            cls: "setting-item-description",
        });

        new AutoScrollSpeed(this.plugin).display(containerEl);
    }
}

/**
 * Settings page for advanced options.
 */
class AdvancedSettingsTab extends SettingsTabPage {
    /**
     * Creates a new AdvancedSettings instance.
     */
    constructor(private plugin: StompPlugin) {
        super("Advanced");
    }

    /**
     * Displays the advanced settings UI.
     */
    display(containerEl: HTMLElement): void {
        new LogLevelSetting(this.plugin).display(containerEl);

        new Setting(containerEl).setName("Key capture test").setHeading();

        const testArea = containerEl.createEl("div", {
            cls: "stomp-key-test-area",
        });

        testArea.createEl("p", {
            text: "Press any key while focused in this area to see what key codes are being sent:",
        });

        const keyDisplay = testArea.createEl("div", {
            cls: "stomp-key-display",
        });

        const keyEl = keyDisplay.createEl("span", {
            text: "Key: <waiting for key press>",
        });

        keyDisplay.createEl("br");

        const codeEl = keyDisplay.createEl("span", {
            text: "Code: <waiting for key press>",
        });

        keyDisplay.createEl("br");

        const timestampEl = keyDisplay.createEl("span", {
            text: "Timestamp: <waiting for key press>",
        });

        const testInput = testArea.createEl("input", {
            type: "text",
            placeholder: "Click here and press your pedal buttons or keys",
            cls: "stomp-key-test-input",
        });

        testInput.addEventListener("keydown", (e) => {
            e.preventDefault();

            // Update the content of existing elements
            keyEl.textContent = `Key: "${e.key}"`;
            codeEl.textContent = `Code: "${e.code}"`;
            timestampEl.textContent = `Timestamp: ${new Date().toLocaleTimeString()}`;
        });
    }
}

/**
 * Main settings tab for the plugin.
 */
export class StompSettingsTab extends PluginSettingsTab {
    /**
     * Creates a new StompSettingsTab instance.
     */
    constructor(app: App, plugin: StompPlugin) {
        super(app, plugin);

        this.addTabs([
            new KeyBindingSettings(plugin),
            new PageScrollSettings(plugin),
            new SectionScrollSettings(plugin),
            new AutoScrollSettingsTab(plugin),
            new AdvancedSettingsTab(plugin),
        ]);
    }
}
