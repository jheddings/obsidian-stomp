import { Plugin, Notice } from "obsidian";
import { StompPluginSettings, StompSettingsTab } from "./settings";
import { Logger, LogLevel } from "./logger";
import { PageScroller } from "./scroller";

const DEFAULT_SETTINGS: StompPluginSettings = {
    pageScrollDuration: 0.25,
    pageScrollAmount: 500,
    logLevel: LogLevel.ERROR,
};

export default class StompPlugin extends Plugin {
    settings: StompPluginSettings;
    private logger = Logger.getLogger("main");
    private scroller: PageScroller;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new StompSettingsTab(this.app, this));

        this.registerDomEvent(
            document,
            "keydown",
            (evt: KeyboardEvent) => {
                this.handleKeyDown(evt);
            },
            { capture: true }
        );

        this.addCommand({
            id: "stomp-scroll-up",
            name: "Perform scroll up action",
            callback: () => this.handlePageUp(),
        });

        this.addCommand({
            id: "stomp-scroll-down",
            name: "Perform scroll down action",
            callback: () => this.handlePageDown(),
        });

        this.logger.info("Plugin loaded");
    }

    onunload() {
        this.logger.info("Plugin unloaded");
    }

    handleKeyDown(evt: KeyboardEvent) {
        if (evt.key === "PageUp") {
            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            this.handlePageUp();
            return false;
        }

        if (evt.key === "PageDown") {
            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            this.handlePageDown();
            return false;
        }
    }

    async handlePageUp() {
        this.logger.info("Page Up pressed - scroll up");
        try {
            await this.scroller.scrollUp();
        } catch (error) {
            this.logger.error("Error during page scroll up:", error);
            new Notice("❌ STOMP: Scroll error", 2000);
        }
    }

    async handlePageDown() {
        this.logger.info("Page Down pressed - scroll down");

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
