import { PageScrollSettings, SectionScrollSettings } from "./config";
import { ScrollEngine } from "./engine";
import { Logger, LoggerInstance } from "./logger";

export abstract class ViewScroller {
    protected logger: LoggerInstance;

    constructor(protected engine: ScrollEngine) {
        this.logger = Logger.getLogger("ViewScroller");
    }

    abstract execute(element: HTMLElement): Promise<void>;
}

export class ScrollStopper extends ViewScroller {
    constructor(engine: ScrollEngine) {
        super(engine);
        this.logger = Logger.getLogger("ScrollStopper");
    }

    async execute(_element: HTMLElement): Promise<void> {
        this.engine.stopAnimation();
    }
}

abstract class PageScroller extends ViewScroller {
    protected options: PageScrollSettings;

    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine);

        this.options = options;
        this.logger = Logger.getLogger("PageScroller");
    }

    get scrollDurationMs(): number {
        return this.options.scrollDuration * 1000;
    }

    protected getScrollSizePx(element: HTMLElement): number {
        return (this.options.scrollAmount / 100) * element.clientHeight;
    }
}

export class PageScrollerUp extends PageScroller {
    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("PageScrollerUp");
    }

    async execute(element: HTMLElement): Promise<void> {
        const scrollAmount = this.getScrollSizePx(element);
        const targetTop = element.scrollTop - scrollAmount;
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);
    }
}

export class PageScrollerDown extends PageScroller {
    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("PageScrollerDown");
    }

    async execute(element: HTMLElement): Promise<void> {
        const scrollAmount = this.getScrollSizePx(element);
        const targetTop = element.scrollTop + scrollAmount;
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);
    }
}

abstract class SectionScroller extends ViewScroller {
    static readonly SECTION_MINIMUM_GAP = 5;

    private options: SectionScrollSettings;
    private stopSelectors: string[] = [];

    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine);

        this.options = options;
        this.logger = Logger.getLogger("SectionScroller");

        this.buildElementSelectors(options);
    }

    get scrollDurationMs(): number {
        return this.options.scrollDuration * 1000;
    }

    protected async scrollToElement(container: HTMLElement, target: HTMLElement): Promise<void> {
        this.logger.debug(`Section scroll target: ${target.tagName}.${target.className}`);

        const targetTop = this.getElementScrollPosition(container, target);
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);
    }

    private buildElementSelectors(options: SectionScrollSettings): void {
        this.stopSelectors = [];

        if (options.stopAtH1) {
            this.stopSelectors.push("h1");
        }

        if (options.stopAtH2) {
            this.stopSelectors.push("h2");
        }

        if (options.stopAtHR) {
            this.stopSelectors.push("hr");
        }

        if (options.stopAtCustom) {
            this.stopSelectors.push(...options.stopAtCustom);
        }

        this.logger.debug(`Section elements: [${this.stopSelectors.join(", ")}]`);
    }

    protected getSectionElements(container: HTMLElement): HTMLElement[] {
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

        return elements;
    }

    protected getElementScrollPosition(container: HTMLElement, element: HTMLElement): number {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // calculate the relative position to an element within the container
        const relativeTop = elementRect.top - containerRect.top;
        return container.scrollTop + relativeTop;
    }
}

export class SectionScrollerNext extends SectionScroller {
    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("SectionScrollerNext");
    }

    private findNextSection(container: HTMLElement): HTMLElement | null {
        const sections = this.getSectionElements(container);
        const currentTop = container.scrollTop;

        for (const section of sections) {
            const sectionTop = this.getElementScrollPosition(container, section);

            // find the next section beyond the current position (with a minimum gap)
            if (sectionTop > currentTop + SectionScroller.SECTION_MINIMUM_GAP) {
                return section;
            }
        }

        this.logger.debug("Next section not found");

        return null;
    }

    async execute(element: HTMLElement): Promise<void> {
        const targetElement = this.findNextSection(element);

        if (targetElement) {
            await this.scrollToElement(element, targetElement);
        }
    }
}

export class SectionScrollerPrev extends SectionScroller {
    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("SectionScrollerPrevious");
    }

    private findPreviousSection(container: HTMLElement): HTMLElement | null {
        const sections = this.getSectionElements(container);
        const currentTop = container.scrollTop;

        for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            const sectionTop = this.getElementScrollPosition(container, section);

            // find the previous section before the current position (with a minimum gap)
            if (sectionTop < currentTop - SectionScroller.SECTION_MINIMUM_GAP) {
                return section;
            }
        }

        this.logger.debug("Previous section not found");

        return null;
    }

    async execute(element: HTMLElement): Promise<void> {
        const targetElement = this.findPreviousSection(element);

        if (targetElement) {
            await this.scrollToElement(element, targetElement);
        }
    }
}
