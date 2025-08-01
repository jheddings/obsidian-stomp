import { PageScrollSettings, SectionScrollSettings } from "./config";
import { ScrollEngine } from "./engine";
import { Logger } from "./logger";

/**
 * Base class for scroll strategies.
 */
export abstract class ViewScroller {
    protected logger: Logger = Logger.getLogger("ViewScroller");

    /**
     * Creates a new ViewScroller instance.
     */
    constructor(protected engine: ScrollEngine) {}

    /**
     * Executes the scroll strategy.
     */
    abstract execute(element: HTMLElement): Promise<void>;
}

/**
 * Stops any active scroll animation.
 */
export class ScrollStopper extends ViewScroller {
    /**
     * Creates a new ScrollStopper instance.
     */
    constructor(engine: ScrollEngine) {
        super(engine);
        this.logger = Logger.getLogger("ScrollStopper");
    }

    /**
     * Executes the stop scroll action.
     */
    async execute(_element: HTMLElement): Promise<void> {
        this.engine.stopAnimation();
    }
}

/**
 * Base class for page scroll strategies.
 */
abstract class PageScroller extends ViewScroller {
    protected options: PageScrollSettings;

    /**
     * Creates a new PageScroller instance.
     */
    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine);

        this.options = options;
        this.logger = Logger.getLogger("PageScroller");
    }

    /**
     * Gets the scroll duration in milliseconds.
     * @returns The scroll duration in ms.
     */
    get scrollDurationMs(): number {
        return this.options.scrollDuration * 1000;
    }

    /**
     * Gets the scroll size in pixels.
     * @returns The scroll size in pixels.
     */
    protected getScrollSizePx(element: HTMLElement): number {
        return (this.options.scrollAmount / 100) * element.clientHeight;
    }
}

/**
 * Scrolls the page up by a set amount.
 */
export class PageScrollerUp extends PageScroller {
    /**
     * Creates a new PageScrollerUp instance.
     */
    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("PageScrollerUp");
    }

    /**
     * Executes the scroll up action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const scrollAmount = this.getScrollSizePx(element);
        const targetTop = element.scrollTop - scrollAmount;
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);
    }
}

/**
 * Scrolls the page down by a set amount.
 */
export class PageScrollerDown extends PageScroller {
    /**
     * Creates a new PageScrollerDown instance.
     */
    constructor(engine: ScrollEngine, options: PageScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("PageScrollerDown");
    }

    /**
     * Executes the scroll down action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const scrollAmount = this.getScrollSizePx(element);
        const targetTop = element.scrollTop + scrollAmount;
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);
    }
}

/**
 * Base class for section scroll strategies.
 */
abstract class SectionScroller extends ViewScroller {
    static readonly SECTION_MINIMUM_GAP = 5;

    private options: SectionScrollSettings;
    private stopSelectors: string[] = [];

    /**
     * Creates a new SectionScroller instance.
     */
    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine);

        this.options = options;
        this.logger = Logger.getLogger("SectionScroller");

        this.buildElementSelectors(options);
    }

    /**
     * Gets the scroll duration in milliseconds.
     * @returns The scroll duration in ms.
     */
    get scrollDurationMs(): number {
        return this.options.scrollDuration * 1000;
    }

    /**
     * Scrolls to the specified element in the container.
     */
    protected async scrollToElement(container: HTMLElement, target: HTMLElement): Promise<void> {
        this.logger.debug(`Section scroll target: ${target.tagName}.${target.className}`);

        const targetTop = this.getElementScrollPosition(container, target);
        await this.engine.animatedScroll(targetTop, this.scrollDurationMs);
    }

    /**
     * Builds the list of element selectors for section stops.
     */
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

    /**
     * Gets all section elements in the container.
     * @returns An array of section HTMLElements.
     */
    protected getSectionElements(container: HTMLElement): HTMLElement[] {
        const elements: HTMLElement[] = [];

        // find all elements matching the stop selectors
        for (const selector of this.stopSelectors) {
            const found = container.querySelectorAll(selector);
            found.forEach((el) => {
                if (el instanceof HTMLElement) {
                    elements.push(el);
                }
            });
        }

        this.logger.debug(`Found ${elements.length} stop elements in container`);

        // sort by document position
        return elements.sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                return -1;
            } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                return 1;
            }
            return 0;
        });
    }

    /**
     * Gets the scroll position for an element within the container.
     * @returns The scroll position in pixels.
     */
    protected getElementScrollPosition(container: HTMLElement, element: HTMLElement): number {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // calculate the relative position to an element within the container
        const relativeTop = elementRect.top - containerRect.top;
        return container.scrollTop + relativeTop;
    }
}

/**
 * Scrolls to the next section element.
 */
export class SectionScrollerNext extends SectionScroller {
    /**
     * Creates a new SectionScrollerNext instance.
     */
    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("SectionScrollerNext");
    }

    /**
     * Finds the next section element after the current scroll position.
     * @returns The next section HTMLElement or null.
     */
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

    /**
     * Executes the scroll to next section action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const targetElement = this.findNextSection(element);

        if (targetElement) {
            await this.scrollToElement(element, targetElement);
        }
    }
}

/**
 * Scrolls to the previous section element.
 */
export class SectionScrollerPrev extends SectionScroller {
    /**
     * Creates a new SectionScrollerPrev instance.
     */
    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("SectionScrollerPrev");
    }

    /**
     * Finds the previous section element before the current scroll position.
     * @returns The previous section HTMLElement or null.
     */
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

    /**
     * Executes the scroll to previous section action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const targetElement = this.findPreviousSection(element);

        if (targetElement) {
            await this.scrollToElement(element, targetElement);
        }
    }
}
