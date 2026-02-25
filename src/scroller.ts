// scroller.ts - defines scroll strategies for the plugin

import { Logger } from "obskit";
import { PageScrollSettings, SectionScrollSettings, AutoScrollSettings } from "./config";
import { ScrollDirection, ScrollEngine } from "./engine";

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
        this.logger.debug("Stopping scroll animation");
        this.engine.stopAnimation();
    }
}

/**
 * Wraps an existing scroller to toggle scrolling on and off.
 */
export class ScrollToggler extends ViewScroller {
    /**
     * Creates a new ScrollToggler instance.
     */
    constructor(
        engine: ScrollEngine,
        private scroller: ViewScroller
    ) {
        super(engine);

        this.logger = Logger.getLogger("ScrollToggler");
    }

    /**
     * Toggles the scrolling behavior of the wrapped scroller.
     */
    async execute(element: HTMLElement): Promise<void> {
        if (this.engine.isActive) {
            this.logger.debug("Stopping current scroll");
            await this.engine.stopAnimation();
        } else {
            this.logger.debug("Executing scroll action");
            await this.scroller.execute(element);
        }
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

        this.logger.debug(`Scrolling to ${targetTop}px`);
        await this.engine.smoothScrollTo(targetTop, this.scrollDurationMs);
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

        this.logger.debug(`Scrolling to ${targetTop}px`);
        await this.engine.smoothScrollTo(targetTop, this.scrollDurationMs);
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
     * Scrolls so the top of the target element aligns with the top of the container.
     */
    protected async scrollToElement(container: HTMLElement, target: HTMLElement): Promise<void> {
        const targetTop = this.getElementScrollPosition(container, target);
        this.logger.debug(
            `Section scroll target: ${target.tagName}.${target.className} @ ${targetTop}px`
        );
        await this.engine.smoothScrollTo(targetTop, this.scrollDurationMs);
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

    /**
     * Checks if an element is visible in the container's viewport.
     * @returns True if the element is visible, false otherwise.
     */
    protected isElementVisible(element: HTMLElement, container: HTMLElement): boolean {
        const sectionRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Check if the section is visible in the viewport
        // (its top is above the bottom of the viewport and its bottom is below the top)
        return sectionRect.top < containerRect.bottom && sectionRect.bottom > containerRect.top;
    }

    /**
     * Finds the last content element belonging to a section by walking forward
     * through siblings until the next section stop element is encountered.
     *
     * Section elements may be wrapped in container divs (e.g., Obsidian's
     * markdown block rendering), so this walks up to the first ancestor that
     * has siblings before traversing. Stops at the container boundary.
     *
     * @returns The last content element in the section.
     */
    protected findSectionEnd(
        sectionElement: HTMLElement,
        sections: HTMLElement[],
        container: HTMLElement
    ): HTMLElement {
        // Walk up to find the right DOM level — section elements may be nested
        // inside wrapper divs with no siblings at the element level.
        let block: HTMLElement = sectionElement;
        while (
            !block.nextElementSibling &&
            block.parentElement &&
            block.parentElement !== container
        ) {
            block = block.parentElement;
        }

        let lastContent = block;
        let sibling = block.nextElementSibling;

        while (sibling) {
            if (sibling instanceof HTMLElement) {
                // Stop if this sibling is or contains a section stop element
                if (sections.some((s) => sibling!.contains(s))) {
                    break;
                }
                lastContent = sibling;
            }
            sibling = sibling.nextElementSibling;
        }

        return lastContent;
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

        return null;
    }

    /**
     * Executes the scroll to next section action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const targetElement = this.findNextSection(element);

        if (targetElement) {
            this.logger.debug(`Scrolling to: ${targetElement.tagName}.${targetElement.id}`);
            await this.scrollToElement(element, targetElement);
        } else {
            this.logger.debug("Section not found");
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

        return null;
    }

    /**
     * Executes the scroll to previous section action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const targetElement = this.findPreviousSection(element);

        if (targetElement) {
            this.logger.debug(`Scrolling to: ${targetElement.tagName}.${targetElement.id}`);
            await this.scrollToElement(element, targetElement);
        } else {
            this.logger.debug("Previous section not found");
        }
    }
}

/**
 * Base class for edge scrollers that target visible section boundaries.
 */
abstract class EdgeScroller extends SectionScroller {
    /**
     * Finds the target visible section in the viewport.
     * @returns The target section HTMLElement or null.
     */
    protected abstract findTargetSection(container: HTMLElement): HTMLElement | null;

    /**
     * Executes the edge scroll action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const targetElement = this.findTargetSection(element);

        if (targetElement) {
            this.logger.debug(
                `Scrolling to: ${targetElement.tagName}.${targetElement.id || targetElement.className}`
            );
            await this.scrollToElement(element, targetElement);
        } else {
            this.logger.debug("No visible section found");
        }
    }
}

/**
 * Scrolls so the topmost visible section's content ends at the bottom of the viewport.
 *
 * Finds the first visible section element, then positions the viewport so the next
 * section element's top aligns with the viewport bottom — showing all content belonging
 * to the current section.
 */
export class EdgeScrollerUp extends EdgeScroller {
    /**
     * Creates a new EdgeScrollerUp instance.
     */
    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("EdgeScrollerUp");
    }

    /**
     * Finds the topmost visible section in the viewport.
     * @returns The topmost visible section HTMLElement or null.
     */
    protected findTargetSection(container: HTMLElement): HTMLElement | null {
        const sections = this.getSectionElements(container);

        for (const section of sections) {
            if (this.isElementVisible(section, container)) {
                return section;
            }
        }

        return null;
    }

    /**
     * Scrolls so the section owning the viewport top has its full content ending
     * at the viewport bottom.
     */
    async execute(element: HTMLElement): Promise<void> {
        const sections = this.getSectionElements(element);

        // Find the section that owns the viewport top: the last section element
        // whose heading is at or above the current scroll position.
        let targetIndex = -1;
        for (let i = 0; i < sections.length; i++) {
            const sectionTop = this.getElementScrollPosition(element, sections[i]);
            if (sectionTop <= element.scrollTop + SectionScroller.SECTION_MINIMUM_GAP) {
                targetIndex = i;
            } else {
                break;
            }
        }

        if (targetIndex < 0) {
            this.logger.debug("No section above viewport top");
            return;
        }

        const target = sections[targetIndex];
        this.logger.debug(`Scrolling to: ${target.tagName}.${target.id || target.className}`);

        // Find the last content element in this section and align its bottom
        // to the viewport bottom — immune to inter-section margins/padding.
        const sectionEnd = this.findSectionEnd(target, sections, element);
        const endRect = sectionEnd.getBoundingClientRect();
        const containerRect = element.getBoundingClientRect();
        const scrollTarget = element.scrollTop + endRect.bottom - containerRect.bottom;
        await this.engine.smoothScrollTo(scrollTarget, this.scrollDurationMs);
    }
}

/**
 * Scrolls to the bottommost visible section, positioning it at the top of the viewport.
 */
export class EdgeScrollerDown extends EdgeScroller {
    /**
     * Creates a new EdgeScrollerDown instance.
     */
    constructor(engine: ScrollEngine, options: SectionScrollSettings) {
        super(engine, options);
        this.logger = Logger.getLogger("EdgeScrollerDown");
    }

    /**
     * Finds the bottommost visible section in the viewport.
     * @returns The bottommost visible section HTMLElement or null.
     */
    protected findTargetSection(container: HTMLElement): HTMLElement | null {
        const sections = this.getSectionElements(container);

        // Iterate in reverse to find the last visible section
        for (let i = sections.length - 1; i >= 0; i--) {
            if (this.isElementVisible(sections[i], container)) {
                return sections[i];
            }
        }

        return null;
    }
}

/**
 * Base class for auto scroll strategies.
 */
abstract class AutoScroller extends ViewScroller {
    protected options: AutoScrollSettings;

    /**
     * Creates a new AutoScroller instance.
     */
    constructor(engine: ScrollEngine, options: AutoScrollSettings) {
        super(engine);

        this.options = options;
        this.logger = Logger.getLogger("AutoScroller");
    }

    /**
     * Gets the scroll speed in pixels per second.
     * @returns The scroll speed in pixels per second.
     */
    get scrollSpeed(): number {
        return this.options.scrollSpeed;
    }
}

/**
 * Continuously scrolls up at a set speed until reaching the top or stopped.
 */
export class AutoScrollerUp extends AutoScroller {
    /**
     * Creates a new AutoScrollerUp instance.
     */
    constructor(engine: ScrollEngine, options: AutoScrollSettings) {
        super(engine, options);

        this.logger = Logger.getLogger("AutoScrollerUp");
    }

    /**
     * Executes the continuous scroll up action.
     */
    async execute(_element: HTMLElement): Promise<void> {
        this.logger.debug("Starting auto scroll");
        await this.engine.continuousScroll(ScrollDirection.UP, this.scrollSpeed);
    }
}

/**
 * Continuously scrolls down at a set speed until reaching the bottom or stopped.
 */
export class AutoScrollerDown extends AutoScroller {
    /**
     * Creates a new AutoScrollerDown instance.
     */
    constructor(engine: ScrollEngine, options: AutoScrollSettings) {
        super(engine, options);

        this.logger = Logger.getLogger("AutoScrollerDown");
    }

    /**
     * Executes the continuous scroll down action.
     */
    async execute(_element: HTMLElement): Promise<void> {
        this.logger.debug("Starting auto scroll");
        await this.engine.continuousScroll(ScrollDirection.DOWN, this.scrollSpeed);
    }
}
