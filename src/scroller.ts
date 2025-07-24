import { Logger, LoggerInstance } from "./logger";
import { App, MarkdownPreviewView, MarkdownView } from "obsidian";

export interface PageScrollerOptions {
    pageScrollAmount: number;
    pageScrollDuration: number;
}

export abstract class ViewScroller {
    private static readonly ANIMATION_FRAME_THRESHOLD = 5;

    protected logger: LoggerInstance;
    private animationId: number | null = null;

    constructor(protected app: App) {
        this.logger = Logger.getLogger("ViewScroller");
    }

    abstract scrollUp(): Promise<void>;

    abstract scrollDown(): Promise<void>;

    protected getScrollable(): HTMLElement | null {
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

    stopScroll(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.logger.debug(`Animation stopped [${this.animationId}]`);
            this.animationId = null;
        }
    }

    protected startScroll(
        targetTop: number,
        scrollFunction: (currentPosition: number) => number
    ): Promise<void> {
        this.stopScroll();

        const scrollable = this.getScrollable();

        if (!scrollable) {
            this.logger.warn("Scrollable not found");
            return Promise.resolve();
        }

        const startingTop = scrollable.scrollTop;
        const distance = Math.abs(targetTop - startingTop);

        this.logger.debug(`Starting scroll: ${startingTop} -> ${targetTop} (${distance}px)`);

        if (distance <= ViewScroller.ANIMATION_FRAME_THRESHOLD) {
            this.directScroll(scrollable, targetTop);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const startTop = scrollable.scrollTop;
            const clampedTop = Math.max(targetTop, 0);

            this.logger.debug(
                `Starting animation [${this.animationId}] :: ${startTop} -> ${clampedTop}`
            );

            let currentPosition = startTop;

            const animate = () => {
                const nextPosition = scrollFunction(currentPosition);
                const remainingDistance = Math.abs(clampedTop - nextPosition);

                this.logger.debug(
                    `Frame [${this.animationId}] ${currentPosition} to ${nextPosition}`
                );

                if (remainingDistance <= ViewScroller.ANIMATION_FRAME_THRESHOLD) {
                    this.stopScroll();
                    this.directScroll(scrollable, clampedTop);
                    this.logger.debug(`Scroll stopped @ ${clampedTop}`);
                    this.animationId = null;
                    resolve();
                    return;
                }

                currentPosition = nextPosition;
                this.directScroll(scrollable, currentPosition);

                const actualPosition = scrollable.scrollTop;
                if (actualPosition === clampedTop) {
                    this.logger.debug(`Animation completed [${this.animationId}]`);
                    this.animationId = null;
                    resolve();
                } else {
                    this.animationId = requestAnimationFrame(animate);
                }
            };

            this.animationId = requestAnimationFrame(animate);
            this.logger.debug(`Animation started [${this.animationId}]`);
        });
    }

    protected directScroll(containerEl: HTMLElement, targetTop: number) {
        const currentTop = containerEl.scrollTop;
        const clampedTarget = Math.ceil(Math.max(targetTop, 0));

        this.logger.debug(`Scrolling from ${currentTop} to ${clampedTarget}`);

        containerEl.scrollTop = clampedTarget;

        const newTop = containerEl.scrollTop;

        if (newTop === 0) {
            this.logger.debug("Reached top of document");
        } else if (newTop === currentTop) {
            this.logger.debug("Reached end of document");
        } else {
            this.logger.debug(`Scroll successful: ${currentTop} -> ${newTop}`);
        }
    }
}

export class PageScroller extends ViewScroller {
    private options: PageScrollerOptions;

    private static readonly ANIMATION_FRAME_RATE = 60;

    constructor(app: App, options: PageScrollerOptions) {
        super(app);
        this.options = options;
        this.logger = Logger.getLogger("PageScroller");
    }

    async scrollUp(): Promise<void> {
        await this.performScroll(-1);
    }

    async scrollDown(): Promise<void> {
        await this.performScroll(1);
    }

    private async performScroll(direction: number): Promise<void> {
        const scrollable = this.getScrollable();

        if (!scrollable) {
            this.logger.warn("No scrollable element found");
            return;
        }

        const { clientHeight, scrollTop } = scrollable;
        const { pageScrollAmount, pageScrollDuration } = this.options;

        const scrollAmount = (pageScrollAmount / 100) * clientHeight;
        const targetTop = scrollTop + direction * scrollAmount;
        const durationMs = pageScrollDuration * 1000;
        const frameTime = 1000 / PageScroller.ANIMATION_FRAME_RATE;

        this.logger.debug(`Visible Height: ${clientHeight}px; Scroll Amount: ${scrollAmount}px`);
        this.logger.debug(`Scrolling from ${scrollTop} to ${targetTop} in ${durationMs}ms`);

        if (durationMs <= frameTime) {
            this.directScroll(scrollable, targetTop);
            return;
        }

        const totalFrames = Math.ceil(durationMs / frameTime);
        const pixelsPerFrame = (targetTop - scrollTop) / totalFrames;

        this.logger.debug(`Scroll Frame Info: ${frameTime}ms; ${pixelsPerFrame}px per frame`);

        await this.startScroll(targetTop, (current) => current + pixelsPerFrame);
    }
}
