import { Plugin, MarkdownView, MarkdownPreviewView } from "obsidian";
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
    sectionScrollSettings: {
        scrollElements: ["h1", "h2", "hr"],
        scrollDuration: 0.5,
    },
};

export default class StompPlugin extends Plugin {
    settings: StompPluginSettings;

    private logger = Logger.getLogger("main");
    private controller: ScrollController;

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

        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.controller = new ScrollController(this.app, this.settings);
    }

    async saveSettings() {
        await this.saveData(this.settings);

        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.controller = new ScrollController(this.app, this.settings);
    }

    private handleKeyDown = (evt: KeyboardEvent) => {
        this.logger.debug(`Received key event: ${evt.key}`);

        const binding = findBindingByKey(this.settings, evt.key);

        if (binding && this.isReadingView()) {
            this.logger.debug(`Processing key binding [${evt.key}] : ${binding.commandId}`);

            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            this.controller.executeCommand(binding.commandId);

            return false;
        }

        return true;
    };

    private isReadingView(): boolean {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        return activeView && activeView.currentMode instanceof MarkdownPreviewView;
    }
}
