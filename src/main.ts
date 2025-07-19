import { Plugin, Notice } from "obsidian";
import { StompSettingsTab } from "./settings";
import { Logger, LogLevel } from "./logger";

interface StompPluginSettings {
    enableStompCapture: boolean;
    pageUpEnabled: boolean;
    pageDownEnabled: boolean;
    logLevel: LogLevel;
}

const DEFAULT_SETTINGS: StompPluginSettings = {
    enableStompCapture: true,
    pageUpEnabled: true,
    pageDownEnabled: true,
    logLevel: LogLevel.ERROR,
};

export default class ObsidianStompPlugin extends Plugin {
    settings: StompPluginSettings;
    private logger = Logger.getLogger("StompPlugin");

    async onload() {
        await this.loadSettings();

        // Set the global log level based on settings
        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.addSettingTab(new StompSettingsTab(this.app, this));

        this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
            this.handleKeyDown(evt);
        });

        this.logger.info("STOMP Pedal Plugin loaded");
    }

    onunload() {
        this.logger.info("STOMP Pedal Plugin unloaded");
    }

    handleKeyDown(evt: KeyboardEvent) {
        if (!this.settings.enableStompCapture) {
            return;
        }

        this.logger.debug(
            `received event - Key: ${evt.key}, Code: ${evt.code}, Ctrl: ${evt.ctrlKey}, Alt: ${evt.altKey}, Shift: ${evt.shiftKey}`
        );

        if (evt.key === "PageUp" && this.settings.pageUpEnabled) {
            evt.preventDefault();
            evt.stopPropagation();
            this.handlePageUp();
            return;
        }

        if (evt.key === "PageDown" && this.settings.pageDownEnabled) {
            evt.preventDefault();
            evt.stopPropagation();
            this.handlePageDown();
            return;
        }
    }

    handlePageUp() {
        new Notice("🔺 STOMP: Page Up detected!", 2000);
        this.logger.info("Page Up command received");
    }

    handlePageDown() {
        new Notice("🔻 STOMP: Page Down detected!", 2000);
        this.logger.info("Page Down command received");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Update log level when settings are saved
        Logger.setGlobalLogLevel(this.settings.logLevel);
    }
}
