import { App, Notice, MarkdownView, MarkdownPreviewView } from "obsidian";
import { StompPluginSettings } from "./config";
import { ScrollEngine } from "./engine";
import { Logger } from "./logger";
import {
    PageScrollerDown,
    PageScrollerUp,
    ScrollStopper,
    SectionScrollerNext,
    SectionScrollerPrev,
    AutoScrollerUp,
    AutoScrollerDown,
    ViewScroller,
    ScrollToggler,
} from "./scroller";

/**
 * Represents a scroll command definition.
 */
export interface ScrollCommand {
    id: string;
    name: string;
    description?: string;
}

/**
 * List of available scroll commands.
 */
export const SCROLL_COMMANDS: ScrollCommand[] = [
    {
        id: "stomp-stop-scroll",
        name: "Stop scrolling",
        description: "Stop any active scroll animation",
    },
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
        id: "stomp-auto-scroll-up",
        name: "Auto scroll up",
        description: "Continuously scroll up at a set speed",
    },
    {
        id: "stomp-auto-scroll-down",
        name: "Auto scroll down",
        description: "Continuously scroll down at a set speed",
    },
    {
        id: "stomp-toggle-auto-scroll-up",
        name: "Toggle auto scroll up",
        description: "Toggles auto scrolling up",
    },
    {
        id: "stomp-toggle-auto-scroll-down",
        name: "Toggle auto scroll down",
        description: "Toggles auto scrolling down",
    },
];

/**
 * Controls scroll actions and strategies for the plugin.
 */
export class ScrollController {
    private scrollStrategies: Map<string, ViewScroller> = new Map();

    private engine: ScrollEngine = new ScrollEngine();
    private logger: Logger = Logger.getLogger("ScrollController");

    /**
     * Create a new ScrollController instance.
     */
    constructor(
        private app: App,
        settings: StompPluginSettings
    ) {
        // Update engine with easing settings
        this.engine.updateSettings(settings.engineSettings);

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

        const autoScrollUp = new AutoScrollerUp(this.engine, settings.autoScrollSettings);
        this.scrollStrategies.set("stomp-auto-scroll-up", autoScrollUp);
        this.scrollStrategies.set(
            "stomp-toggle-auto-scroll-up",
            new ScrollToggler(this.engine, autoScrollUp)
        );

        const autoScrollDown = new AutoScrollerDown(this.engine, settings.autoScrollSettings);
        this.scrollStrategies.set("stomp-auto-scroll-down", autoScrollDown);
        this.scrollStrategies.set(
            "stomp-toggle-auto-scroll-down",
            new ScrollToggler(this.engine, autoScrollDown)
        );
    }

    /**
     * Updates the easing settings for the scroll engine.
     */
    updateEasingSettings(settings: StompPluginSettings): void {
        this.engine.updateSettings(settings.engineSettings);
    }

    /**
     * Checks if a command ID is valid.
     */
    isValidCommand(commandId: string): boolean {
        return this.scrollStrategies.has(commandId);
    }

    /**
     * Executes a scroll command by ID on the active scrollable element.
     */
    async executeCommand(commandId: string): Promise<void> {
        const strategy = this.scrollStrategies.get(commandId);

        if (strategy) {
            this.logger.info(`Executing command: ${commandId}`);
            await this.executeScroll(strategy);
        } else {
            this.logger.warn(`Unknown command: ${commandId}`);
        }
    }

    /**
     * Executes a specific scroll strategy on the active scrollable element.
     */
    async executeScroll(scroll: ViewScroller): Promise<void> {
        const element = this.getScrollable();
        if (!element) throw new Error("No scrollable element found");

        this.engine.activate(element);

        try {
            await scroll.execute(element);
        } catch (error) {
            this.logger.error("Error during scroll:", error);
            new Notice("❌ STOMP: Scroll error", 2000);
        }

        this.engine.deactivate();
    }

    /**
     * Gets the active scrollable element, or null if none found.
     * @returns The scrollable HTMLElement or null.
     */
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

    /**
     * Determines if an element is scrollable.
     */
    private isScrollable(element: HTMLElement): boolean {
        const style = window.getComputedStyle(element);
        const hasScrollableContent = element.scrollHeight > element.clientHeight;
        const hasScrollableStyle = style.overflowY === "scroll" || style.overflowY === "auto";
        return hasScrollableContent && hasScrollableStyle;
    }
}
