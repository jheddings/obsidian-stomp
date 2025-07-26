import { PageScrollSettings, SectionScrollSettings } from "./config";
import { Logger, LoggerInstance } from "./logger";
import { App, MarkdownPreviewView, MarkdownView } from "obsidian";

export abstract class ViewScroller {
    protected static readonly ANIMATION_FRAME_RATE = 60;
    protected static readonly ANIMATION_FRAME_THRESHOLD = 5;

    protected logger: LoggerInstance;
    private animationId: NodeJS.Timeout | null = null;

    constructor(protected app: App) {
        this.logger = Logger.getLogger("ViewScroller");
    }

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
            clearTimeout(this.animationId);
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
            this.performDirectScroll(scrollable, targetTop);
            return Promise.resolve();
        }

        const frameInterval = 1000 / ViewScroller.ANIMATION_FRAME_RATE;
        const clampedTop = Math.max(targetTop, 0);
        const startTime = performance.now();

        return new Promise((resolve) => {
            let currentPosition = scrollable.scrollTop;

            const finalize = (logMessage: string) => {
                const elapsedTime = performance.now() - startTime;
                this.logger.debug(`${logMessage} (${elapsedTime.toFixed(2)}ms)`);
                this.animationId = null;
                resolve();
            };

            const animate = () => {
                const nextPosition = scrollFunction(currentPosition);
                const remainingDistance = Math.abs(clampedTop - nextPosition);

                this.logger.debug(
                    `Frame [${this.animationId}] ${currentPosition} to ${nextPosition}`
                );

                if (remainingDistance <= ViewScroller.ANIMATION_FRAME_THRESHOLD) {
                    this.performDirectScroll(scrollable, clampedTop);
                    finalize(`Scroll stopped @ ${clampedTop}`);
                    return;
                }

                currentPosition = nextPosition;
                this.performDirectScroll(scrollable, currentPosition);

                if (scrollable.scrollTop === clampedTop) {
                    finalize(`Animation completed [${this.animationId}]`);
                    return;
                }

                this.animationId = setTimeout(animate, frameInterval);
            };

            this.animationId = setTimeout(animate, frameInterval);
            this.logger.debug(`Animation started [${this.animationId}]`);
        });
    }

    protected performDirectScroll(containerEl: HTMLElement, targetTop: number) {
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

    protected async performAnimatedScroll(targetTop: number, durationMs: number): Promise<void> {
        const scrollable = this.getScrollable();

        if (!scrollable) {
            this.logger.warn("No scrollable element found");
            return;
        }

        const frameInterval = 1000 / ViewScroller.ANIMATION_FRAME_RATE;
        const startTop = scrollable.scrollTop;

        this.logger.debug(`Scroll from ${startTop} to ${targetTop} in ${durationMs}ms`);

        if (durationMs <= frameInterval) {
            this.performDirectScroll(scrollable, targetTop);
            return;
        }

        const totalFrames = Math.ceil(durationMs / frameInterval);
        const pixelsPerFrame = (targetTop - startTop) / totalFrames;

        this.logger.debug(`Frame info: ${frameInterval}ms; ${pixelsPerFrame}px per frame`);

        await this.startScroll(targetTop, (current) => current + pixelsPerFrame);
    }
}

export class PageScroller extends ViewScroller {
    private options: PageScrollSettings;

    constructor(app: App, options: PageScrollSettings) {
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
        const { scrollAmount: optScrollAmount, scrollDuration: optScrollDuration } = this.options;

        const scrollAmount = (optScrollAmount / 100) * clientHeight;
        const targetTop = scrollTop + direction * scrollAmount;
        const durationMs = optScrollDuration * 1000;

        this.logger.debug(`Visible Height: ${clientHeight}px; Scroll Amount: ${scrollAmount}px`);

        await this.performAnimatedScroll(targetTop, durationMs);
    }
}

export class SectionScroller extends ViewScroller {
    private options: SectionScrollSettings;
    private stopSelectors: string[] = [];

    constructor(app: App, options: SectionScrollSettings) {
        super(app);
        this.options = options;
        this.logger = Logger.getLogger("SectionScroller");

        this.buildElementSelectors();
    }

    async scrollToNext(): Promise<void> {
        await this.performSectionScroll(1);
    }

    async scrollToPrevious(): Promise<void> {
        await this.performSectionScroll(-1);
    }

    private async performSectionScroll(direction: number): Promise<void> {
        const scrollable = this.getScrollable();

        if (!scrollable) {
            this.logger.warn("No scrollable element found");
            return;
        }

        const targetElement = this.findTargetSection(scrollable, direction);

        if (!targetElement) {
            this.logger.debug(`No ${direction > 0 ? "next" : "previous"} section found`);
            return;
        }

        const targetTop = this.getElementScrollPosition(scrollable, targetElement);
        const durationMs = this.options.scrollDuration * 1000;

        this.logger.debug(
            `Section scroll target: ${targetElement.tagName}.${targetElement.className}`
        );

        await this.performAnimatedScroll(targetTop, durationMs);
    }

    private buildElementSelectors(): void {
        this.stopSelectors = [];

        if (this.options.stopAtH1) {
            this.stopSelectors.push("h1");
        }

        if (this.options.stopAtH2) {
            this.stopSelectors.push("h2");
        }

        if (this.options.stopAtHR) {
            this.stopSelectors.push("hr");
        }

        if (this.options.stopAtCustom) {
            this.stopSelectors.push(...this.options.stopAtCustom);
        }

        this.logger.debug(`Section elements: [${this.stopSelectors.join(", ")}]`);
    }

    private findTargetSection(container: HTMLElement, direction: number): HTMLElement | null {
        const sections = this.getSectionElements(container);
        const currentTop = container.scrollTop;

        if (direction > 0) {
            for (const section of sections) {
                const sectionTop = this.getElementScrollPosition(container, section);
                if (sectionTop > currentTop + ViewScroller.ANIMATION_FRAME_THRESHOLD) {
                    return section;
                }
            }
        } else {
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const sectionTop = this.getElementScrollPosition(container, section);
                if (sectionTop < currentTop - ViewScroller.ANIMATION_FRAME_THRESHOLD) {
                    return section;
                }
            }
        }

        return null;
    }

    private getSectionElements(container: HTMLElement): HTMLElement[] {
        const elements: HTMLElement[] = [];

        for (const selector of this.stopSelectors) {
            const found = container.querySelectorAll(selector);
            found.forEach((el) => {
                if (el instanceof HTMLElement) {
                    elements.push(el);
                }
            });
        }

        // Sort by document position
        elements.sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                return -1;
            } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                return 1;
            }
            return 0;
        });

        this.logger.debug(`Found ${elements.length} section elements`);

        return elements;
    }

    private getElementScrollPosition(container: HTMLElement, element: HTMLElement): number {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Calculate the relative position within the scrollable container
        const relativeTop = elementRect.top - containerRect.top;
        return container.scrollTop + relativeTop;
    }
}
