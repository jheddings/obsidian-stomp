import { PageScrollSettings } from "./config";
import { ScrollEngine } from "./engine";
import { Logger, LoggerInstance } from "./logger";

export abstract class ScrollStrategy {
    protected logger: LoggerInstance;

    constructor(protected engine: ScrollEngine) {
        this.logger = Logger.getLogger("ViewScroller");
    }

    abstract execute(element: HTMLElement): Promise<void>;
}

export abstract class PageScroller extends ScrollStrategy {
    constructor(
        engine: ScrollEngine,
        protected options: PageScrollSettings
    ) {
        super(engine);

        this.logger = Logger.getLogger("PageScroller");
    }

    get scrollDurationMs(): number {
        return this.options.scrollDuration * 1000;
    }
}

export class PageScrollerUp extends PageScroller {
    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("PageScrollerUp");
    }

    async execute(element: HTMLElement): Promise<void> {
        this.engine.activate(element);

        const scrollAmount = (this.options.scrollAmount / 100) * element.clientHeight;
        const targetTop = element.scrollTop - scrollAmount;
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);

        this.engine.deactivate();
    }
}

export class PageScrollerDown extends PageScroller {
    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("PageScrollerDown");
    }

    async execute(element: HTMLElement): Promise<void> {
        this.engine.activate(element);

        const scrollAmount = (this.options.scrollAmount / 100) * element.clientHeight;
        const targetTop = element.scrollTop + scrollAmount;
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);

        this.engine.deactivate();
    }
}

/*
export class SectionScroller extends ScrollStrategy {
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
                if (sectionTop > currentTop + ScrollStrategy.ANIMATION_FRAME_THRESHOLD) {
                    return section;
                }
            }
        } else {
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const sectionTop = this.getElementScrollPosition(container, section);
                if (sectionTop < currentTop - ScrollStrategy.ANIMATION_FRAME_THRESHOLD) {
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
*/
