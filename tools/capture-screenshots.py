#!/usr/bin/env python3
"""Regenerate documentation screenshots from the authored standalone app.

Requires the optional Playwright Python package and Chromium. No external page
or model endpoint is used. Screenshots show the synthetic bundled workspace.
"""
import asyncio
import os
import shutil
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'images'

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser'),
            headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1720, 'height': 1040}, device_scale_factor=1)
        await page.set_content((ROOT / 'stratum-intelligence.html').read_text(), wait_until='load')
        await page.wait_for_function('window.stratum !== undefined')
        await page.evaluate('document.querySelector("#toasts").replaceChildren()')
        async def shot(name):
            await page.wait_for_timeout(300)
            await page.screenshot(path=str(OUT / name))
        await shot('pid-light.png')
        for route in ['overview', 'ontology', 'pipelines', 'agents']:
            await page.locator(f'.nav-item[data-route="{route}"]').click()
            await page.wait_for_function('(r) => stratum.app.ui.route === r', arg=route)
            await shot(route + '.png')
        await page.locator('.nav-item[data-route="pid"]').click()
        await page.locator('[data-action=theme]').click()
        await shot('pid-dark.png')
        await page.set_viewport_size({'width': 390, 'height': 844})
        await shot('pid-mobile.png')
        await page.locator('[data-action=mobile-inspector]').click()
        await page.locator('#inspector').wait_for(state='visible')
        await shot('pid-mobile-inspector.png')
        await browser.close()
    print('Regenerated 8 documentation screenshots from the bundled application.')

if __name__ == '__main__':
    asyncio.run(main())
