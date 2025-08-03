import { MarkdownPreviewView, MarkdownView, Plugin } from "obsidian";
import { StompSettingsTab } from "./settings";
import { Logger, LogLevel } from "./logger";
import { SCROLL_COMMANDS, ScrollController } from "./controller";
import { findBindingByKey, StompPluginSettings } from "./config";

const DEFAULT_SETTINGS: StompPluginSettings = {
    logLevel: LogLevel.ERROR,
    commandBindings: [],

    pageScrollSettings: {
        scrollDuration: 0.25,
        scrollAmount: 50,
    },

    quickScrollSettings: {
        scrollDuration: 0.1,
        scrollAmount: 95,
    },

    sectionScrollSettings: {
        scrollDuration: 0.5,
        stopAtH1: true,
        stopAtH2: true,
        stopAtHR: true,
        stopAtCustom: [],
    },

    autoScrollSettings: {
        scrollSpeed: 100, // pixels per second
    },

    engineSettings: {
        easeInFactor: 1,
        easeOutFactor: 1,
    },
};

export default class StompPlugin extends Plugin {
    settings: StompPluginSettings;

    private controller: ScrollController;

    private logger: Logger = Logger.getLogger("main");

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new StompSettingsTab(this.app, this));

        SCROLL_COMMANDS.forEach((command) => {
            this.addCommand({
                id: command.id,
                name: command.name,
                callback: () => this.controller.executeCommand(command.id),
            });
        });

        this.registerDomEvent(document, "keydown", this.handleKeyDown, { capture: true });

        this.logger.info("Plugin loaded");
    }

    async onunload() {
        document.removeEventListener("keydown", this.handleKeyDown, { capture: true });

        this.logger.info("Plugin unloaded");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        this.applySettings();
    }

    async saveSettings() {
        await this.saveData(this.settings);

        this.applySettings();
    }

    private applySettings() {
        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.controller = new ScrollController(this.app, this.settings);

        // Update easing settings if controller already exists
        if (this.controller) {
            this.controller.updateEasingSettings(this.settings);
        }
    }

    private handleKeyDown = (evt: KeyboardEvent) => {
        if (!this.hasActiveView()) {
            return true;
        }

        this.logger.debug(`Received key event: ${evt.key}`);

        const binding = findBindingByKey(this.settings, evt.key);

        if (!binding) {
            return true;
        }

        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();

        this.logger.debug(`Processing key binding [${evt.key}] : ${binding.commandId}`);
        this.controller.executeCommand(binding.commandId);

        return false;
    };

    hasActiveView(): boolean {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        return activeView && activeView.currentMode instanceof MarkdownPreviewView;
    }
}
