from playwright.sync_api import sync_playwright
import time
import os

results = []
screenshots_dir = 'qa-screenshots'
os.makedirs(screenshots_dir, exist_ok=True)

def log(severity, title, steps, expected, actual, screenshot=None):
    results.append({
        'severity': severity,
        'title': title,
        'steps': steps,
        'expected': expected,
        'actual': actual,
        'screenshot': screenshot
    })
    print(f'[{severity}] {title}')
    print(f'  Steps: {steps}')
    print(f'  Expected: {expected}')
    print(f'  Actual: {actual}')
    if screenshot:
        print(f'  Screenshot: {screenshot}')
    print()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()
    
    console_msgs = []
    page.on('console', lambda msg: console_msgs.append(f'{msg.type}: {msg.text}'))
    page.on('pageerror', lambda err: console_msgs.append(f'pageerror: {err}'))
    
    # Track JS dialogs
    js_dialogs = []
    def on_dialog(dialog):
        js_dialogs.append({'type': dialog.type, 'message': dialog.message})
        print(f'JS dialog: {dialog.type} - {dialog.message}')
        if dialog.type == 'prompt':
            dialog.accept('https://example.com')
        else:
            dialog.accept()
    page.on('dialog', on_dialog)
    
    # 1. LANDING PAGE
    print('=== TESTING LANDING PAGE ===')
    page.goto('http://localhost:3000/')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.screenshot(path=f'{screenshots_dir}/landing.png')
    
    title = page.title()
    print(f'Page title: {title}')
    if 'wordhtml' not in title.lower():
        log('High', 'Landing page title missing brand name', 'Navigate to /', 'Title contains wordhtml', f'Title: {title}')
    
    if page.locator('text=404').count() > 0 or page.locator('text=Not Found').count() > 0:
        log('Critical', 'Landing page returns 404', 'Navigate to /', 'Landing page loads', '404 Not Found', f'{screenshots_dir}/landing.png')
    
    links = page.locator('a').all()
    print(f'Found {len(links)} links')
    
    # Check for broken images
    images = page.locator('img').all()
    for img in images:
        src = img.get_attribute('src')
        if src:
            box = img.bounding_box()
            if box and (box['width'] == 0 or box['height'] == 0):
                log('Medium', f'Image has zero size: {src}', 'Check image dimensions', 'Image visible', 'Image has 0 width or height')
    
    # 2. EDITOR PAGE
    print('=== TESTING EDITOR PAGE ===')
    page.goto('http://localhost:3000/app')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    page.screenshot(path=f'{screenshots_dir}/editor_initial.png')
    
    editor = page.locator('.ProseMirror, [contenteditable=true], .tiptap').first
    if editor.count() == 0:
        log('Critical', 'Editor not found', 'Navigate to /app', 'Rich text editor visible', 'No editor element found', f'{screenshots_dir}/editor_initial.png')
    else:
        print('Editor found')
        editor.click()
        time.sleep(0.5)
        
        page.keyboard.type('Hello World Test')
        time.sleep(0.5)
        page.keyboard.press('Control+a')
        time.sleep(0.3)
        
        # Test Bold
        page.keyboard.press('Control+b')
        time.sleep(0.3)
        bold_html = editor.inner_html()
        if '<strong>' not in bold_html:
            log('High', 'Bold formatting not applied with Ctrl+B', 'Select text and press Ctrl+B', 'Text becomes bold', f'HTML: {bold_html[:200]}')
        else:
            print('Bold works')
        
        # Test Italic
        page.keyboard.press('Control+i')
        time.sleep(0.3)
        italic_html = editor.inner_html()
        if '<em>' not in italic_html:
            log('High', 'Italic formatting not applied with Ctrl+I', 'Select text and press Ctrl+I', 'Text becomes italic', f'HTML: {italic_html[:200]}')
        else:
            print('Italic works')
        
        # Test Underline
        page.keyboard.press('Control+u')
        time.sleep(0.3)
        underline_html = editor.inner_html()
        if '<u>' not in underline_html:
            log('High', 'Underline formatting not applied with Ctrl+U', 'Select text and press Ctrl+U', 'Text becomes underlined', f'HTML: {underline_html[:200]}')
        else:
            print('Underline works')
        
        # Test Link (Ctrl+K)
        js_dialogs.clear()
        page.keyboard.press('Control+k')
        time.sleep(0.5)
        if len(js_dialogs) == 0:
            log('High', 'Link prompt dialog not shown after Ctrl+K', 'Press Ctrl+K', 'Browser prompt appears', 'No prompt dialog')
        else:
            print(f'Link dialog shown and accepted')
            time.sleep(0.5)
            link_html = editor.inner_html()
            if '<a ' not in link_html:
                log('Medium', 'Link not applied after Ctrl+K prompt', 'Enter URL in prompt', 'Link applied to text', f'HTML: {link_html[:200]}')
            else:
                print('Link applied')
        
        # Test paste cleanup
        print('Testing paste cleanup...')
        editor.click()
        page.evaluate("(() => { const e = document.querySelector('.ProseMirror, [contenteditable=true], .tiptap'); if(e) { e.innerHTML = '<p style=font-family:Arial;color:red;background:yellow><b>Bold</b> <i>Italic</i> text with <span style=font-size:24px>styles</span></p>'; } })()")
        time.sleep(0.5)
        paste_html = editor.inner_html()
        print(f'Paste HTML: {paste_html[:300]}')
        if 'font-family:Arial' in paste_html or 'color:red' in paste_html:
            log('Medium', 'Paste cleanup did not strip inline styles', 'Paste rich HTML', 'Inline styles cleaned', f'HTML: {paste_html[:300]}')
        else:
            print('Paste cleanup works correctly')
        
        # Test table insertion via direct editor command
        print('Testing table insertion...')
        page.evaluate("(() => { const ed = document.querySelector('[data-tiptap-editor]'); if(ed && ed.editor) { ed.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); } })()")
        time.sleep(0.5)
        page.screenshot(path=f'{screenshots_dir}/editor_table.png')
        table_html = editor.inner_html()
        if '<table' not in table_html:
            # Try another approach - use tiptap API via React
            page.evaluate("window.dispatchEvent(new CustomEvent('wordhtml:insert-table', { detail: {rows:3, cols:3} }));")
            time.sleep(0.3)
            table_html = editor.inner_html()
            if '<table' not in table_html:
                log('Medium', 'Table not inserted', 'Trigger table insert', 'Table in editor', f'HTML: {table_html[:200]}')
            else:
                print('Table inserted via custom event')
        else:
            print('Table inserted')
        
        # Test image insertion availability
        print('Testing image insertion UI...')
        insert_menu_btn = page.locator('button:has-text(\"แทรก (Insert)\")').first
        if insert_menu_btn.count() > 0:
            print('Insert menu found (contains image options)')
        else:
            log('Low', 'Insert menu not found', 'Look for Insert menu', 'Insert menu visible', 'No Insert menu')
        
        # Test search/replace (Ctrl+F)
        print('Testing search...')
        page.keyboard.press('Control+f')
        time.sleep(0.5)
        search_panel = page.locator('text=ค้นหาและแทนที่').first
        if search_panel.count() == 0:
            log('High', 'Search panel not shown after Ctrl+F', 'Press Ctrl+F', 'Search panel appears', 'No search panel found')
        else:
            print('Search panel shown')
            page.keyboard.press('Escape')
            time.sleep(0.3)
        
        # Test source pane toggle via custom event
        print('Testing source pane...')
        page.evaluate("window.dispatchEvent(new CustomEvent('wordhtml:toggle-source'));")
        time.sleep(0.5)
        page.screenshot(path=f'{screenshots_dir}/editor_source.png')
        source_pane = page.locator('textarea[aria-label*=\"ซอร์ส\"]').first
        if source_pane.count() == 0:
            # Check if grid changed to 2 columns
            grid = page.locator('div.grid-cols-2').first
            if grid.count() == 0:
                log('Medium', 'Source pane not visible after toggle', 'Toggle source pane', 'Source pane visible', 'No source pane detected')
        else:
            print('Source pane shown')
        # Toggle back
        page.evaluate("window.dispatchEvent(new CustomEvent('wordhtml:toggle-source'));")
        time.sleep(0.3)
        
        # Test page setup via custom event
        print('Testing page setup...')
        page.evaluate("window.dispatchEvent(new CustomEvent('wordhtml:open-page-setup'));")
        time.sleep(0.5)
        page.screenshot(path=f'{screenshots_dir}/editor_pagesetup.png')
        page_setup_dialog = page.locator('text=ตั้งค่าหน้ากระดาษ (Page Setup)').first
        if page_setup_dialog.count() == 0:
            log('Medium', 'Page Setup dialog not visible', 'Dispatch open-page-setup event', 'Page Setup dialog opens', 'Dialog not found')
        else:
            print('Page Setup dialog shown')
        page.keyboard.press('Escape')
        time.sleep(0.3)
        
        # Test export via TopBar
        print('Testing export...')
        export_btn = page.locator('text=ส่งออก HTML').first
        if export_btn.count() > 0:
            export_btn.click(force=True, timeout=5000)
            time.sleep(0.5)
            page.screenshot(path=f'{screenshots_dir}/editor_export.png')
            export_dialog = page.locator('text=ส่งออก HTML').first
            if export_dialog.count() == 0:
                log('Medium', 'Export dialog not visible after button click', 'Click Export button', 'Export dialog opens', 'Dialog not found')
            else:
                print('Export dialog shown')
            page.keyboard.press('Escape')
            time.sleep(0.3)
        else:
            log('Low', 'Export button not found', 'Look for Export button', 'Export button visible', 'No export button')
        
        # Test history via clock icon
        print('Testing history...')
        history_btn = page.locator('button[aria-label*=\"ประวัติ\"]').first
        if history_btn.count() > 0:
            history_btn.click(force=True, timeout=5000)
            time.sleep(0.5)
            page.screenshot(path=f'{screenshots_dir}/editor_history.png')
            history_dialog = page.locator('text=ประวัติเอกสาร').first
            if history_dialog.count() == 0:
                log('Medium', 'History panel not visible after button click', 'Click History button', 'History panel opens', 'Panel not found')
            else:
                print('History panel shown')
            page.keyboard.press('Escape')
            time.sleep(0.3)
        else:
            log('Low', 'History button not found', 'Look for History button', 'History button visible', 'No history button')
        
        # Test fullscreen (F11)
        print('Testing fullscreen...')
        page.keyboard.press('F11')
        time.sleep(0.5)
        is_fs = page.locator('div.fixed.inset-0.z-50').count() > 0
        if not is_fs:
            log('Low', 'Fullscreen CSS class not applied after F11', 'Press F11', 'Editor enters fullscreen mode', 'No fullscreen class detected')
        else:
            print('Fullscreen mode active')
            page.keyboard.press('F11')
            time.sleep(0.3)
        
        # Test template panel via custom event
        print('Testing template panel...')
        page.evaluate("window.dispatchEvent(new CustomEvent('wordhtml:open-templates'));")
        time.sleep(0.5)
        page.screenshot(path=f'{screenshots_dir}/editor_template.png')
        template_dialog = page.locator('text=Template ของฉัน').first
        if template_dialog.count() == 0:
            log('Medium', 'Template panel not visible', 'Dispatch open-templates event', 'Template panel opens', 'Panel not found')
        else:
            print('Template panel shown')
        page.keyboard.press('Escape')
        time.sleep(0.3)
        
        # Test upload button exists
        print('Testing upload button...')
        upload_btn = page.locator('button[aria-label*=\"อัปโหลด\"]').first
        if upload_btn.count() > 0:
            print('Upload button found')
        else:
            log('Low', 'Upload button not found', 'Look for upload button', 'Upload button visible', 'No upload button')
    
    # 3. HELP PAGE
    print('=== TESTING HELP PAGE ===')
    page.goto('http://localhost:3000/help')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.screenshot(path=f'{screenshots_dir}/help.png')
    
    if page.locator('text=404').count() > 0 or page.locator('text=Not Found').count() > 0:
        log('Critical', 'Help page returns 404', 'Navigate to /help', 'Help page loads', '404 Not Found', f'{screenshots_dir}/help.png')
    
    help_content = page.locator('body').inner_text()
    print(f'Help content length: {len(help_content)}')
    if len(help_content) < 100:
        log('Medium', 'Help page has very little content', 'Navigate to /help', 'Helpful documentation content', f'Content length: {len(help_content)} chars')
    
    # 4. MOBILE VIEW
    print('=== TESTING MOBILE VIEW ===')
    page.set_viewport_size({'width': 375, 'height': 667})
    page.goto('http://localhost:3000/app')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.screenshot(path=f'{screenshots_dir}/mobile.png')
    
    # Check if mobile block is visible
    mobile_block = page.locator('text=wordhtml works best on desktop').first
    if mobile_block.count() > 0:
        print('MobileBlock shown correctly')
    else:
        # Fallback: check if editor is hidden
        editor_mobile = page.locator('.ProseMirror, [contenteditable=true], .tiptap').first
        if editor_mobile.count() > 0:
            # Check if it's actually visible (not overlaid by mobile block)
            is_visible = editor_mobile.is_visible()
            if is_visible:
                log('Medium', 'Mobile view allows editor access without MobileBlock warning', 'Resize to <768px', 'MobileBlock should show on mobile', 'Editor accessible on mobile', f'{screenshots_dir}/mobile.png')
            else:
                print('Editor present but likely hidden by mobile block overlay')
        else:
            print('No editor found on mobile (possibly blocked)')
    
    # Also test landing on mobile
    page.goto('http://localhost:3000/')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.screenshot(path=f'{screenshots_dir}/mobile_landing.png')
    
    # CONSOLE LOGS
    print('=== CONSOLE MESSAGES ===')
    errors = [m for m in console_msgs if 'error' in m.lower() or 'pageerror' in m.lower()]
    warnings = [m for m in console_msgs if 'warn' in m.lower()]
    
    print(f'Total console messages: {len(console_msgs)}')
    print(f'Errors: {len(errors)}')
    print(f'Warnings: {len(warnings)}')
    
    for e in errors[:30]:
        print(f'  ERR: {e}')
    for w in warnings[:30]:
        print(f'  WARN: {w}')
    
    with open(f'{screenshots_dir}/console_logs.txt', 'w') as f:
        for m in console_msgs:
            f.write(m + '\n')
    
    browser.close()
    
    print(f'\n=== SUMMARY ===')
    print(f'Issues found: {len(results)}')
    for r in results:
        print(f'  [{r["severity"]}] {r["title"]}')
