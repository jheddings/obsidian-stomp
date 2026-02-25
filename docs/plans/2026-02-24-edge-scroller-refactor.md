# Edge Scroller Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor EdgeScroller into a two-method template (find + compute) so both EdgeScrollerUp and EdgeScrollerDown participate equally, eliminating dead code and bounding the DOM parent-walk.

**Architecture:** Replace EdgeScroller's single `findTargetSection` abstract with two abstracts: `findTargetSection(container, sections)` and `computeScrollTarget(container, target, sections)`. The base `execute` calls both in sequence. Fix `findSectionEnd` to accept a container boundary.

**Tech Stack:** TypeScript, esbuild, Obsidian API

---

### Task 1: Add container parameter to findSectionEnd and remove redundant Set

**Files:**

- Modify: `src/scroller.ts:279-314` (SectionScroller.findSectionEnd)

**Step 1: Update the findSectionEnd signature and body**

Change the method signature to accept the scroll container, add the boundary
check to the parent-walk loop, and remove the redundant `sectionSet`:

```typescript
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
    while (!block.nextElementSibling && block.parentElement && block.parentElement !== container) {
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
```

**Step 2: Update the call site in EdgeScrollerUp.execute**

At `src/scroller.ts:500`, the current call is:

```typescript
const sectionEnd = this.findSectionEnd(target, sections);
```

Update to pass `element` as the container:

```typescript
const sectionEnd = this.findSectionEnd(target, sections, element);
```

**Step 3: Verify the build passes**

Run: `npm run build`
Expected: Clean build, no type errors.

**Step 4: Commit**

```
refactor: bound findSectionEnd parent-walk to container element
```

---

### Task 2: Refactor EdgeScroller base class template

**Files:**

- Modify: `src/scroller.ts:412-437` (EdgeScroller class)

**Step 1: Replace the EdgeScroller class with the new template**

Replace lines 412-437 with:

```typescript
/**
 * Base class for edge scrollers that target visible section boundaries.
 *
 * Subclasses implement two methods:
 * - findTargetSection: which section to target
 * - computeScrollTarget: where to scroll relative to that section
 */
abstract class EdgeScroller extends SectionScroller {
    /**
     * Finds the target section in or near the viewport.
     * @returns The target section HTMLElement or null.
     */
    protected abstract findTargetSection(
        container: HTMLElement,
        sections: HTMLElement[]
    ): HTMLElement | null;

    /**
     * Computes the scroll position for the given target section.
     * @returns The target scrollTop value in pixels.
     */
    protected abstract computeScrollTarget(
        container: HTMLElement,
        target: HTMLElement,
        sections: HTMLElement[]
    ): number;

    /**
     * Executes the edge scroll action.
     */
    async execute(element: HTMLElement): Promise<void> {
        const sections = this.getSectionElements(element);
        const target = this.findTargetSection(element, sections);

        if (!target) {
            this.logger.debug("No target section found");
            return;
        }

        this.logger.debug(`Scrolling to: ${target.tagName}.${target.id || target.className}`);
        const scrollTarget = this.computeScrollTarget(element, target, sections);
        await this.engine.smoothScrollTo(scrollTarget, this.scrollDurationMs);
    }
}
```

**Step 2: Verify the build fails**

Run: `npm run build`
Expected: Type errors in EdgeScrollerUp and EdgeScrollerDown — their
`findTargetSection` signatures no longer match the abstract, and they are
missing `computeScrollTarget`. This confirms the template change is detected.

---

### Task 3: Migrate EdgeScrollerDown to the new template

**Files:**

- Modify: `src/scroller.ts` (EdgeScrollerDown class, currently lines 511-536)

**Step 1: Replace EdgeScrollerDown with the new implementation**

Replace the entire EdgeScrollerDown class with:

```typescript
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
    protected findTargetSection(
        container: HTMLElement,
        sections: HTMLElement[]
    ): HTMLElement | null {
        // Iterate in reverse to find the last visible section
        for (let i = sections.length - 1; i >= 0; i--) {
            if (this.isElementVisible(sections[i], container)) {
                return sections[i];
            }
        }
        return null;
    }

    /**
     * Computes scroll position to align the target's top with the viewport top.
     */
    protected computeScrollTarget(
        container: HTMLElement,
        target: HTMLElement,
        _sections: HTMLElement[]
    ): number {
        return this.getElementScrollPosition(container, target);
    }
}
```

**Step 2: Verify the build still has errors only for EdgeScrollerUp**

Run: `npm run build`
Expected: EdgeScrollerDown compiles. EdgeScrollerUp still fails (next task).

---

### Task 4: Migrate EdgeScrollerUp to the new template

**Files:**

- Modify: `src/scroller.ts` (EdgeScrollerUp class, currently lines 446-506)

**Step 1: Replace EdgeScrollerUp with the new implementation**

Replace the entire EdgeScrollerUp class with:

```typescript
/**
 * Scrolls so the topmost visible section's content ends at the bottom of the viewport.
 *
 * Finds the section element whose heading owns the viewport top, then positions
 * the viewport so the section's last content element aligns with the viewport
 * bottom — showing all content belonging to the current section.
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
     * Finds the section that owns the viewport top: the last section element
     * whose heading is at or above the current scroll position.
     */
    protected findTargetSection(
        container: HTMLElement,
        sections: HTMLElement[]
    ): HTMLElement | null {
        let target: HTMLElement | null = null;
        for (const section of sections) {
            const sectionTop = this.getElementScrollPosition(container, section);
            if (sectionTop <= container.scrollTop + SectionScroller.SECTION_MINIMUM_GAP) {
                target = section;
            } else {
                break;
            }
        }
        return target;
    }

    /**
     * Computes scroll position to align the section's content end with the
     * viewport bottom.
     */
    protected computeScrollTarget(
        container: HTMLElement,
        target: HTMLElement,
        sections: HTMLElement[]
    ): number {
        const sectionEnd = this.findSectionEnd(target, sections, container);
        const endRect = sectionEnd.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        return container.scrollTop + endRect.bottom - containerRect.bottom;
    }
}
```

**Step 2: Verify the build passes**

Run: `npm run build`
Expected: Clean build, no type errors.

**Step 3: Commit**

```
refactor: split EdgeScroller template into find + compute methods
```

---

### Task 5: Run preflight and verify

**Step 1: Run the full preflight check**

Run: `just preflight`
Expected: Build + format check + lint all pass.

**Step 2: Fix any formatting or lint issues**

If preflight fails on formatting or lint:

Run: `just tidy`

Then re-run: `just preflight`

**Step 3: Commit any tidy fixes if needed**

```
style: format edge scroller refactoring
```

---

### Task 6: Manual smoke test

Test the edge scroll behavior in Obsidian reading mode to confirm no regressions.

**Step 1: Open a long document with multiple headings in reading mode**

**Step 2: Test Edge Scroll Down**

Trigger "Edge Scroll Bottom" repeatedly. Each press should page forward: the
partially-visible section at the bottom should have its heading scroll to the
top of the viewport.

**Step 3: Test Edge Scroll Up**

Trigger "Edge Scroll Top" repeatedly. Each press should page backward: the
section owning the viewport top should have its content end aligned to the
viewport bottom.

**Step 4: Test round-trip**

Alternate between up and down. A round-trip should return to approximately the
same position.

**Step 5: Test boundary conditions**

- Scroll to the very top of the document, press Edge Scroll Up — should be a no-op
- Scroll to the very bottom, press Edge Scroll Down — should be a no-op or minimal movement
