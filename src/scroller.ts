import { Logger, LoggerInstance } from "./logger";
import { App, Editor, MarkdownView } from "obsidian";

export interface ScrollerOptions {
    pageScrollAmount: number;
    scrollSpeed: number;
}

export abstract class ViewScroller {
    constructor(protected app: App) {}

    abstract scrollUp(): Promise<boolean>;

    abstract scrollDown(): Promise<boolean>;

    protected async scrollTo(
        editor: Editor,
        targetTop: number,
        scrollSpeed: number
    ): Promise<void> {
        return new Promise((resolve) => {
            const { top: currentTop, left } = editor.getScrollInfo();
            const distance = targetTop - currentTop;

            if (Math.abs(distance) < 10) {
                editor.scrollTo(left, targetTop);
                resolve();
                return;
            }

            const startTime = performance.now();
            const duration = Math.min(500, Math.abs(distance) / scrollSpeed);

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);

                const currentPosition = currentTop + distance * easeOutCubic;
                editor.scrollTo(left, currentPosition);

                // Check if we've reached the target or if scrolling has stopped
                const newScrollInfo = editor.getScrollInfo();
                const reachedTarget = progress >= 1;
                const scrollStopped = Math.abs(newScrollInfo.top - currentPosition) > 5; // Tolerance for boundary hit

                if (reachedTarget || scrollStopped) {
                    resolve();
                } else {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        });
    }
}

export class PageScroller extends ViewScroller {
    private logger: LoggerInstance;
    private options: ScrollerOptions;

    constructor(app: App, options: ScrollerOptions) {
        super(app);
        this.options = options;
        this.logger = Logger.getLogger("PageScroller");
    }

    async scrollUp(): Promise<boolean> {
        return await this.performScroll(-1);
    }

    async scrollDown(): Promise<boolean> {
        return await this.performScroll(1);
    }

    private async performScroll(direction: number): Promise<boolean> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        this.logger.debug(`Scrolling ${direction > 0 ? "down" : "up"} on: ${activeView}`);

        if (activeView) {
            const editor = activeView.editor;
            return await this.scrollEditor(editor, direction);
        } else {
            this.logger.warn(
                "No active markdown view found - page scroll only works in markdown views"
            );
            return false;
        }
    }

    private async scrollEditor(editor: Editor, direction: number): Promise<boolean> {
        const { top, left } = editor.getScrollInfo();
        this.logger.debug(`Current scroll position: top=${top}, left=${left}`);

        const targetTop = top + direction * this.options.pageScrollAmount;
        this.logger.debug(`Target scroll position: top=${targetTop}`);

        await this.scrollTo(editor, targetTop, this.options.scrollSpeed);

        // check if we actually scrolled or hit a limit
        const newScrollInfo = editor.getScrollInfo();
        const actuallyScrolled = Math.abs(newScrollInfo.top - top) > 5;

        if (!actuallyScrolled) {
            this.logger.debug("No movement detected");
            return false;
        }

        return true;
    }
}
