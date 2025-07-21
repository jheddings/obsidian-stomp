import { Logger, LoggerInstance } from "./logger";
import { App, Editor, MarkdownView } from "obsidian";

export interface ScrollerOptions {
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

    stopScroll(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.logger.debug(`Animation stopped [${this.animationId}]`);
            this.animationId = null;
        }
    }

    protected startScroll(
        editor: Editor,
        targetTop: number,
        scrollFunction: (currentPosition: number) => number
    ): Promise<void> {
        this.stopScroll();

        const startingTop = editor.getScrollInfo().top;
        const distance = Math.abs(targetTop - startingTop);

        if (distance <= ViewScroller.ANIMATION_FRAME_THRESHOLD) {
            this.directScroll(editor, targetTop);
            return;
        }

        return new Promise((resolve) => {
            const startTop = editor.getScrollInfo().top;
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
                    this.directScroll(editor, clampedTop);
                    resolve();
                    return;
                }

                currentPosition = nextPosition;
                this.directScroll(editor, currentPosition);

                const actualPosition = editor.getScrollInfo().top;
                if (actualPosition === clampedTop) {
                    this.logger.debug(`Animation completed [${this.animationId}]`);
                    this.animationId = null;
                    resolve();
                } else {
                    this.animationId = requestAnimationFrame(animate);
                    this.logger.debug(`Preparing next frame -- ${this.animationId}`);
                }
            };

            this.animationId = requestAnimationFrame(animate);
            this.logger.debug(`Animation started [${this.animationId}]`);
        });
    }

    protected directScroll(editor: Editor, targetTop: number) {
        const { top, left } = editor.getScrollInfo();
        const clampedTarget = Math.max(targetTop, 0);

        this.logger.debug(`Scrolling from ${top} to ${clampedTarget}`);

        editor.scrollTo(left, clampedTarget);

        const { top: newTop } = editor.getScrollInfo();

        if (newTop === 0) {
            this.logger.debug("Reached top of document");
        } else if (newTop === top) {
            this.logger.debug("Reached end of document");
        }
    }
}

export class PageScroller extends ViewScroller {
    private options: ScrollerOptions;

    private static readonly ANIMATION_FRAME_RATE = 60;

    constructor(app: App, options: ScrollerOptions) {
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
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!activeView) {
            this.logger.warn("No active markdown view found");
            return;
        }

        const editor = activeView.editor;
        const currentTop = editor.getScrollInfo().top;
        const targetTop = currentTop + direction * this.options.pageScrollAmount;
        const distance = Math.abs(targetTop - currentTop);

        this.logger.debug(`Scrolling ${distance}px from ${currentTop} to ${targetTop}`);

        const frameTime = 1000 / PageScroller.ANIMATION_FRAME_RATE;
        const pixelsPerFrame =
            (direction * distance) /
            Math.ceil((this.options.pageScrollDuration * 1000) / frameTime);

        this.logger.debug(`Frame Info: ${frameTime}ms; ${pixelsPerFrame}px`);

        await this.startScroll(editor, targetTop, (currentPosition: number) => {
            return currentPosition + pixelsPerFrame;
        });
    }
}
