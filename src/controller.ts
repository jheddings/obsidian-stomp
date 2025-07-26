import { App, Notice } from "obsidian";
import { Logger, LoggerInstance } from "./logger";
import { PageScroller, SectionScroller } from "./scroller";
import { StompPluginSettings } from "./config";

export interface ScrollCommand {
    id: string;
    name: string;
    description?: string;
}

export const SCROLL_COMMANDS: ScrollCommand[] = [
    {
        id: "stomp-page-scroll-up",
        name: "Scroll page up",
        description: "Scroll up by a percentage of the viewport height",
    },
    {
        id: "stomp-page-scroll-down",
        name: "Scroll page down",
        description: "Scroll down by a percentage of the viewport height",
    },
    {
        id: "stomp-section-scroll-next",
        name: "Scroll to next section",
        description: "Scroll to the next heading or section element",
    },
    {
        id: "stomp-section-scroll-previous",
        name: "Scroll to previous section",
        description: "Scroll to the previous heading or section element",
    },
    {
        id: "stomp-quick-scroll-up",
        name: "Quick scroll up",
        description: "Fast scroll up with full viewport height",
    },
    {
        id: "stomp-quick-scroll-down",
        name: "Quick scroll down",
        description: "Fast scroll down with full viewport height",
    },
    {
        id: "stomp-stop-scroll",
        name: "Stop scrolling",
        description: "Stop any active scroll animation",
    },
];

export class ScrollController {
    private pageScroller: PageScroller;
    private quickPageScroller: PageScroller;
    private sectionScroller: SectionScroller;

    private logger: LoggerInstance;

    constructor(app: App, settings: StompPluginSettings) {
        this.logger = Logger.getLogger("ScrollController");

        this.quickPageScroller = new PageScroller(app, {
            scrollAmount: 100,
            scrollDuration: 0.25,
        });

        this.pageScroller = new PageScroller(app, {
            scrollAmount: settings.pageScrollSettings.scrollAmount,
            scrollDuration: settings.pageScrollSettings.scrollDuration,
        });

        this.sectionScroller = new SectionScroller(app, {
            scrollElements: settings.sectionScrollSettings.scrollElements,
            scrollDuration: settings.sectionScrollSettings.scrollDuration,
        });
    }

    /**
     * Check if a command ID is valid
     */
    isValidCommand(commandId: string): boolean {
        return SCROLL_COMMANDS.some((cmd) => cmd.id === commandId);
    }

    /**
     * Execute a scroll command by ID
     */
    async executeCommand(commandId: string): Promise<void> {
        if (!this.isValidCommand(commandId)) {
            this.logger.warn(`Unknown command: ${commandId}`);
            return;
        }

        this.logger.debug(`Executing scroll command: ${commandId}`);

        switch (commandId) {
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
            case "stomp-section-scroll-next":
                this.executeProtectedScroll(async () => {
                    await this.sectionScroller.scrollToNext();
                });
                break;
            case "stomp-section-scroll-previous":
                this.executeProtectedScroll(async () => {
                    await this.sectionScroller.scrollToPrevious();
                });
                break;
            case "stomp-stop-scroll":
                this.stopAllScrolling();
                break;
            default:
                this.logger.warn(`Unhandled command: ${commandId}`);
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

    /**
     * Stop all active scrolling
     */
    stopAllScrolling(): void {
        this.logger.debug("Stopping all scroll animations");
        this.pageScroller.stopScroll();
        this.quickPageScroller.stopScroll();
        this.sectionScroller.stopScroll();
    }
}
