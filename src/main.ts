import { Plugin, Notice } from "obsidian";
import { StompPluginSettings, StompSettingsTab, findBindingByKey } from "./settings";
import { Logger, LogLevel } from "./logger";
import { PageScroller } from "./scroller";

const DEFAULT_SETTINGS: StompPluginSettings = {
    pageScrollDuration: 0.25,
    pageScrollAmount: 500,
    logLevel: LogLevel.ERROR,
    commandBindings: [],
};

export default class StompPlugin extends Plugin {
    settings: StompPluginSettings;

    private logger = Logger.getLogger("main");
    private scroller: PageScroller;

    listCommands(): Array<{ id: string; name: string }> {
        return [
            { id: "stomp-page-scroll-up", name: "Scroll page up" },
            { id: "stomp-page-scroll-down", name: "Scroll page down" },
        ];
    }

    executeCommand(commandId: string): void {
        this.logger.debug(`Executing command: ${commandId}`);

        switch (commandId) {
            case "stomp-page-scroll-up":
                this.scrollPageUp();
                break;
            case "stomp-page-scroll-down":
                this.scrollPageDown();
                break;
            default:
                this.logger.warn(`Unknown command: ${commandId}`);
        }
    }

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new StompSettingsTab(this.app, this));

        this.addCommand({
            id: "stomp-page-scroll-up",
            name: "Scroll page up",
            callback: () => this.scrollPageUp(),
        });

        this.addCommand({
            id: "stomp-page-scroll-down",
            name: "Scroll page down",
            callback: () => this.scrollPageDown(),
        });

        this.registerDomEvent(document, "keydown", this.handleKeyDown, { capture: true });

        this.logger.info("Plugin loaded");
    }

    onunload() {
        document.removeEventListener("keydown", this.handleKeyDown, { capture: true });

        this.logger.info("Plugin unloaded");
    }

    handleKeyDown = (evt: KeyboardEvent) => {
        this.logger.debug(`Received key event: ${evt.key}`);

        const binding = findBindingByKey(this.settings, evt.key);

        if (binding && binding.commandId) {
            this.logger.debug(`Processing key binding for ${evt.key}: ${binding.commandId}`);
            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            this.executeCommand(binding.commandId);
            return false;
        }

        return true;
    };

    async scrollPageUp() {
        this.logger.info("scrollPageUp");
        try {
            await this.scroller.scrollUp();
        } catch (error) {
            this.logger.error("Error during page scroll up:", error);
            new Notice("❌ STOMP: Scroll error", 2000);
        }
    }

    async scrollPageDown() {
        this.logger.info("scrollPageDown");
        try {
            await this.scroller.scrollDown();
        } catch (error) {
            this.logger.error("Error during page scroll down:", error);
            new Notice("❌ STOMP: Scroll error", 2000);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.scroller = new PageScroller(this.app, {
            pageScrollAmount: this.settings.pageScrollAmount,
            pageScrollDuration: this.settings.pageScrollDuration,
        });
    }

    async saveSettings() {
        await this.saveData(this.settings);

        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.scroller = new PageScroller(this.app, {
            pageScrollAmount: this.settings.pageScrollAmount,
            pageScrollDuration: this.settings.pageScrollDuration,
        });
    }
}
