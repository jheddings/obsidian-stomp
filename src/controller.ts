import { App, Notice, MarkdownView, MarkdownPreviewView } from "obsidian";
import { StompPluginSettings } from "./config";
import { ScrollEngine } from "./engine";
import { Logger, LoggerInstance } from "./logger";
import {
    PageScrollerDown,
    PageScrollerUp,
    ScrollStopper,
    SectionScrollerNext,
    SectionScrollerPrev,
    ViewScroller,
} from "./scroller";

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
        id: "stomp-section-scroll-prev",
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
    private scrollStrategies: Map<string, ViewScroller> = new Map();
    private engine: ScrollEngine;

    private logger: LoggerInstance;

    constructor(
        private app: App,
        settings: StompPluginSettings
    ) {
        this.logger = Logger.getLogger("ScrollController");
        this.engine = new ScrollEngine();

        this.scrollStrategies.set("stomp-stop-scroll", new ScrollStopper(this.engine));

        this.scrollStrategies.set(
            "stomp-page-scroll-up",
            new PageScrollerUp(this.engine, settings.pageScrollSettings)
        );
        this.scrollStrategies.set(
            "stomp-page-scroll-down",
            new PageScrollerDown(this.engine, settings.pageScrollSettings)
        );
        this.scrollStrategies.set(
            "stomp-quick-scroll-up",
            new PageScrollerUp(this.engine, settings.quickScrollSettings)
        );
        this.scrollStrategies.set(
            "stomp-quick-scroll-down",
            new PageScrollerDown(this.engine, settings.quickScrollSettings)
        );
        this.scrollStrategies.set(
            "stomp-section-scroll-next",
            new SectionScrollerNext(this.engine, settings.sectionScrollSettings)
        );
        this.scrollStrategies.set(
            "stomp-section-scroll-prev",
            new SectionScrollerPrev(this.engine, settings.sectionScrollSettings)
        );
    }

    /**
     * Check if a command ID is valid for this controller.
     */
    isValidCommand(commandId: string): boolean {
        return this.scrollStrategies.has(commandId);
    }

    /**
     * Stop all active scrolling.
     */
    stopAllScrolling(): void {
        this.logger.debug("Stopping all scroll animations");
        this.engine.stopAnimation();
    }

    /**
     * Execute a scroll command by ID on the active scrollable element.
     */
    async executeCommand(commandId: string): Promise<void> {
        const strategy = this.scrollStrategies.get(commandId);

        if (strategy) {
            this.logger.debug(`Executing scroll command: ${commandId}`);
            await this.executeScroll(strategy);
        } else {
            this.logger.warn(`Unknown command: ${commandId}`);
        }
    }

    /**
     * Execute a specific scroll strategy on the active scrollable element.
     */
    async executeScroll(scroll: ViewScroller): Promise<void> {
        const element = this.getScrollable();
        if (!element) throw new Error("No scrollable element found");

        try {
            await scroll.execute(element);
        } catch (error) {
            this.logger.error("Error during scroll:", error);
            new Notice("❌ STOMP: Scroll error", 2000);
        }
    }

    private getScrollable(): HTMLElement | null {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!activeView) {
            this.logger.warn("No active view found");
            return null;
        }

        const mode = activeView.currentMode;

        if (!(mode instanceof MarkdownPreviewView)) {
            this.logger.warn(`Unsupported mode: ${mode.constructor.name}`);
            return activeView.containerEl;
        }

        const containerEl = mode.containerEl;

        const candidates = [
            ".markdown-preview-view",
            ".markdown-preview-sizer",
            ".view-content",
            ".markdown-reading-view",
            ".cm-scroller",
        ];

        for (const selector of candidates) {
            const element = containerEl.querySelector(selector) as HTMLElement;
            if (element && this.isScrollable(element)) {
                return element;
            }
        }

        this.logger.warn("No scrollable found; using fallback");

        return containerEl;
    }

    private isScrollable(element: HTMLElement): boolean {
        const style = window.getComputedStyle(element);
        const hasScrollableContent = element.scrollHeight > element.clientHeight;
        const hasScrollableStyle = style.overflowY === "scroll" || style.overflowY === "auto";
        return hasScrollableContent && hasScrollableStyle;
    }
}
