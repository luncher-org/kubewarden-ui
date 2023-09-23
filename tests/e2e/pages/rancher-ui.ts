import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import jsyaml from 'js-yaml';
import merge from 'lodash.merge';
import { TableRow } from '../components/table-row';

/**
 * aria-label is not always filled - we have to use filters to find elements reliably
 */
export class RancherUI {

    readonly createBtn: Locator

    constructor(public readonly page: Page) {
        this.createBtn = page.getByRole('link', {name: 'Create', exact: true} )
    }

    // ==================================================================================================
    // https://vuetifyjs.com/en/components/checkboxes/#checkboxes

    // button shortcut
    button(name: string) {
        return this.page.getByRole('button', {name: name, exact: true})
    }

    // Labeled Input
    input(label: string) {
        return this.page.locator('div.labeled-input').filter({hasText: label}).getByRole('textbox')
    }

    // Labeled Checkbox
    checkbox(label: string) {
        return this.page.locator('label.checkbox-container')
            .filter({hasText: label})
            .locator('span.checkbox-custom')
    }

    // Radio group
    radio(label: string, name: string) {
        // Exact name with optional "i" tooltip
        const groupLabel = new RegExp(`^${label} .?$`)
        return this.page.locator('.radio-group')
            .filter({has: this.page.getByRole('heading', {name: groupLabel})})
            .locator('xpath=./following-sibling::div')
            .getByRole('radio', {name: name})
    }

    /**
     * Execute commands in kubectl shell
     * @param commands execute, have to finish with 0 exit code
     */
    async shell(...commands: string[]) {
        const win = this.page.locator('#windowmanager')
        const prompt = win.locator('.xterm-rows>div:has(span)').filter({hasText: ">"}).last()

        // Open terminal
        await this.page.locator('#btn-kubectl').click()
        await expect(win.locator('.status').getByText('Connected', {exact: true})).toBeVisible({timeout: 30_000})
        // Run command
        // await win.locator('.xterm-cursor').click()
        for (const cmd of commands) {
            await this.page.keyboard.type(cmd + ' || echo ERREXIT-$?')
            await this.page.keyboard.press('Enter')
            // Wait - command finished when prompt (>) has blinking cursor
            await expect(prompt.locator('span.xterm-cursor')).toBeVisible({timeout: 60_000})
            // Verify that it passed
            await expect(win.getByText(/ERREXIT-[0-9]+/), {message: 'Shell command finished with an error'}).not.toBeVisible({timeout: 1})
        }
        // Close terminal
        await win.locator('.tab').filter({hasText: 'Kubectl: local'}).locator('i.closer').click()
    }

    // Labeled Select
    async select(label: string, option: string) {
        await this.page.locator('div.labeled-select')
            .filter({hasText: label})
            .getByRole('combobox', { name: 'Search for option' }).click()
        await this.page.getByRole('option', { name: option, exact: true }).click()
    }

    // ==================================================================================================
    // Table Handler

    getRow(name: string, options?: {group?: string}) {
        return new TableRow(this, name, {group: options?.group})
    }

    // ==================================================================================================
    // Helper functions

    /**
     * Build regex matching successfull chart installation
     */
    helmPassRegex(name: string) {
        const re = new RegExp(`SUCCESS: helm .* ${name} \/home`)
        return this.page.locator('.logs-container').getByText(re)
    }

    /**
     * Usage:
     * await editYaml(page, d => d.telemetry.enabled = true )
     * await editYaml(page, '{"policyServer": {"telemetry": { "enabled": false }}}')
     */
    async editYaml(page: Page, source: Function|string) {
        // Load yaml from code editor
        const lines = await page.locator('.CodeMirror-code > div > pre.CodeMirror-line').allTextContents();
        let cmYaml = jsyaml.load(lines.join('\n')
            .replace(/\u00a0/g, " ")  // replace &nbsp; with space
            .replace(/\u200b/g, "")   // remove ZERO WIDTH SPACE last line
        );

        // Edit yaml
        if (source instanceof Function) {
            source(cmYaml)
        } else {
            merge(cmYaml, jsyaml.load(source))
        }
        // Paste edited yaml
        await page.locator('.CodeMirror-code').click()
        await page.keyboard.press('Control+A');
        await page.keyboard.insertText(jsyaml.dump(cmYaml))
    }


    /**
     * Call ui.withReload(async()=> { <code> }, 'Reason')
     */
    async withReload(code: () => Promise<void>, message?: string): Promise<void> {
        try {
            await code();
        } catch (e) {
            if (message) console.log(`Reload: ${message}`)
            await this.page.reload();
            await code();
        }
    }

}
