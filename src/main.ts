import { Plugin, Notice, MarkdownView, MarkdownPreviewView } from "obsidian";
import { StompSettingsTab } from "./settings";
import { Logger, LogLevel } from "./logger";
import { PageScroller } from "./scroller";
import { findBindingByKey, StompPluginSettings } from "./config";

const DEFAULT_SETTINGS: StompPluginSettings = {
    logLevel: LogLevel.ERROR,
    commandBindings: [],
    pageScrollSettings: {
        scrollDuration: 0.25,
        scrollAmount: 50,
    },
};

export const PLUGIN_COMMANDS = [
    { id: "stomp-page-scroll-up", name: "Scroll page up" },
    { id: "stomp-page-scroll-down", name: "Scroll page down" },
    { id: "stomp-quick-scroll-up", name: "Quick scroll up" },
    { id: "stomp-quick-scroll-down", name: "Quick scroll down" },
];

export default class StompPlugin extends Plugin {
    settings: StompPluginSettings;

    private logger = Logger.getLogger("main");
    private pageScroller: PageScroller;
    private quickPageScroller: PageScroller;

    async onload() {
        await this.loadSettings();

        this.quickPageScroller = new PageScroller(this.app, {
            scrollAmount: 100,
            scrollDuration: 0.25,
        });

        this.addSettingTab(new StompSettingsTab(this.app, this));

        PLUGIN_COMMANDS.forEach((command) => {
            this.addCommand({
                id: command.id,
                name: command.name,
                callback: () => this.executeCommand(command.id),
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

        this.pageScroller = new PageScroller(this.app, {
            scrollAmount: this.settings.pageScrollSettings.scrollAmount,
            scrollDuration: this.settings.pageScrollSettings.scrollDuration,
        });
    }

    async saveSettings() {
        await this.saveData(this.settings);

        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.pageScroller = new PageScroller(this.app, {
            scrollAmount: this.settings.pageScrollSettings.scrollAmount,
            scrollDuration: this.settings.pageScrollSettings.scrollDuration,
        });
    }

    private handleKeyDown = (evt: KeyboardEvent) => {
        this.logger.debug(`Received key event: ${evt.key}`);

        const binding = findBindingByKey(this.settings, evt.key);

        if (binding && this.isReadingView()) {
            this.logger.debug(`Processing key binding [${evt.key}] : ${binding.commandId}`);

            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            this.executeCommand(binding.commandId);

            return false;
        }

        return true;
    };

    private executeCommand(commandId: string): void {
        this.logger.debug(`Executing command: ${commandId}`);

        switch (commandId) {
            case "stomp-page-scroll-up":
                this.executeProtectedScroll(async () => {
                    await this.pageScroller.scrollUp();
                });
                break;
            case "stomp-page-scroll-down":
                this.executeProtectedScroll(async () => {
                    await this.pageScroller.scrollDown();
                });
                break;
            case "stomp-quick-scroll-up":
                this.executeProtectedScroll(async () => {
                    await this.quickPageScroller.scrollUp();
                });
                break;
            case "stomp-quick-scroll-down":
                this.executeProtectedScroll(async () => {
                    await this.quickPageScroller.scrollDown();
                });
                break;
            default:
                this.logger.warn(`Unknown command: ${commandId}`);
        }
    }

    private async executeProtectedScroll(scrollFunc: () => Promise<void>): Promise<void> {
        try {
            await scrollFunc();
        } catch (error) {
            this.logger.error("Error during scroll:", error);
            new Notice("❌ STOMP: Scroll error", 2000);
        }
    }

    private isReadingView(): boolean {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        return activeView && activeView.currentMode instanceof MarkdownPreviewView;
    }
}
