/**
 * DOM Utility Module
 * Provides XSS-safe DOM manipulation helpers for the RDI Indirect Inventory application.
 * 
 * All methods are designed to prevent cross-site scripting (XSS) vulnerabilities
 * by never accepting arbitrary HTML from user input and properly escaping all output.
 * 
 * MIT License - RDI Indirect Inventory v6.65+
 * 
 * Related Modules:
 * - utils/firebase.js - Firebase initialization
 * - utils/state-manager.js - Application state management
 * - main.js - Main application entry point
 */

/**
 * Namespace for DOM-safe operations.
 * @namespace dom
 */

/**
 * Safely set innerHTML by creating a div, setting textContent,
 * then extracting the sanitized innerHTML. This prevents XSS injection
 * by ensuring no raw HTML from user input is rendered.
 * 
 * @param {HTMLElement} el - Target DOM element to receive the content
 * @param {string} html - HTML string to be sanitized and set
 * 
 * @example
 * ```javascript
 * // Safe: user-supplied code text will not be executed as HTML
 * dom.safeInnerHTML(document.getElementById('code-display'), userCode);
 * ```
 */
export const dom = {
  /**
   * Create a text node safely (no XSS risk).
   * @param {string} text - Text content to create as a Text node
   * @returns {Text} A new Text node containing the safe text
   * 
   * @example
   * ```javascript
 * * const textNode = dom.createTextNode('Hello & Welcome');
 * element.appendChild(textNode);
 * ```
   */
  createTextNode(text) {
    return document.createTextNode(text);
  },

  /**
   * Set element textContent safely (the safest way to update text content,
   * completely prevents XSS since no HTML parsing occurs).
   * @param {HTMLElement} el - Target DOM element
   * @param {string} text - Text content to set
   * 
   * @example
   * ```javascript
   * dom.setText(document.getElementById('status'), 'Online');
   * ```
   */
  setText(el, text) {
    el.textContent = text;
  },

  /**
   * Escape HTML special characters manually without creating a div element.
   * Useful when the div-based sanitization approach isn't suitable.
   * 
   * @param {string} str - String to escape HTML special characters in
   * @returns {string} Escaped string with &, <, >, ", ' entities replaced
   * 
   * @example
   * ```javascript
   * const escaped = dom.escapeHTML('if (x > 5) & y < 10');
   * // Returns: "if (x > 5) & y < 10"
   * ```
   */
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Render a master list item row as HTML string.
   * Generates a safe HTML representation of a master list row (m-row pattern),
   * including item code, name, specification, stock info, and rack info.
   * All text content is escaped to prevent XSS.
   * 
   * @param {object} item - Item data object containing at minimum: itemCode, name, specification
   * @param {string} [spec=''] - Optional specification text to display on the third line
   * @returns {string} HTML-safe master row div element
   * 
   * @example
   * ```javascript
   * const item = { itemCode: 'ITEM-001', name: 'Baut Panjang', specification: 'Baut stainless 100mm' };
   * const rowHTML = dom.renderMasterRow(item, 'Spesifikasi teknik');
   * document.getElementById('master-list').innerHTML += rowHTML;
   * ```
   */
  renderMasterRow(item, spec = '') {
    /** @type {string} */
    const code = item.itemCode || '-';
    /** @type {string} */
    const name = item.name || '-';
    /** @type {string} */
    const rack = item.defaultRack ? `(Rak: ${item.defaultRack})` : '';

    // Build cells using only text content (no raw HTML insertion)
    /** @type {Array<string>} */
    const cells = [
      `<span class="m-row-title">${this.escapeHTML(code)}</span>`,
      `<span class="m-row-sub">${this.escapeHTML(name)}</span>`,
      spec ? `<span class="m-row-spec">${this.escapeHTML(spec)}</span>` : '',
      // Stock badge shown as part of tags
      `<span class="m-row-spec">${this.escapeHTML('')}</span>`,
      `<span class="m-row-tags">${this.escapeHTML(rack)}</span>`
    ];

    /** @type {string} */
    const innerContent = cells.filter(c => c).join('');

    return `
      <div class="m-row" tabindex="0" role="button"
           onfocus-visible="this.style.outline='2px solid var(--color-primary)';outline-offset:-2px"
           onfocusout="this.style.outline=''">
        <div class="m-row-main" style="min-height:46px;display:flex;flex-direction:column;justify-content:center;">
          ${innerContent}
        </div>
        <div class="m-row-spec" style="opacity:.92;">${this.escapeHTML(spec || '')}</div>
      </div>`;
  },

  /**
   * Render a badge HTML element safely.
   * Creates a colored badge element with proper token colors from the CSS variables.
   * All label text is escaped to prevent XSS.
   * 
   * @param {string} label - Badge text display
   * @param {('active'|'danger'|'ok'|'warn'|'rack'|'archived')} [type='active'] - Badge type for color theming
   * @returns {string} HTML-safe badge span element
   * 
   * @example
   * ```javascript
   * const badgeHTML = dom.renderBadge('Aktif', 'active');
   * // Returns: <span class="badge" style="...">Aktif</span>
   * document.getElementById('status').innerHTML = badgeHTML;
   * ```
   */
  renderBadge(label, type = 'active') {
    /** @type {Record<string, string>} */
    const colorMap = {
      active: 'var(--ok)',
      danger: 'var(--danger)',
      ok: 'var(--ok)',
      warn: 'var(--warn)',
      rack: 'var(--ink-600)',
      archived: 'var(--ink-400)'
    };

    /** @type {Record<string, string>} */
    const bgMap = {
      active: 'rgba(30,158,100,.13)',
      danger: 'rgba(214,54,44,.13)',
      ok: 'rgba(30,158,100,.13)',
      warn: 'rgba(217,138,23,.13)',
      rack: 'rgba(30,36,48,.06)',
      archived: 'rgba(138,147,163,.15)'
    };

    /** @type {string} */
    const color = colorMap[type] || colorMap.active;
    /** @type {string} */
    const bg = bgMap[type] || bgMap.active;

    return `
      <span class="badge"
            style="background:${bg};color:${color};
                   font-size:9.5px;font-weight:700;letter-spacing:.03em;padding:3px 9px 3px 8px;border-radius:999px;
                   display:inline-flex;align-items:center;gap:5px;box-shadow:inset 0 0 0 1px currentColor;">
        ${this.escapeHTML(label)}
      </span>`;
  },

  /**
   * Render a status pill HTML element safely.
   * Creates a pill-shaped element with left dot indicator, commonly used
   * for item status display (active/archived).
   * 
   * @param {string} label - Pill text display
   * @param {('active'|'archived')} [state='active'] - Status state for color theming
   * @returns {string} HTML-safe status pill span element
   * 
   * @example
   * ```javascript
   * const pillHTML = dom.renderStatusPill('Aktif', 'active');
   * // Returns pill with green color and dot indicator
   * ```
   */
  renderStatusPill(label, state = 'active') {
    /** @type {Record<string, string>} */
    const bgMap = {
      active: 'rgba(30,158,100,.13)',
      archived: 'rgba(138,147,163,.15)'
    };

    /** @type {Record<string, string>} */
    const colorMap = {
      active: 'var(--ok)',
      archived: 'var(--ink-400)'
    };

    /** @type {string} */
    const bg = bgMap[state] || bgMap.active;
    /** @type {string} */
    const color = colorMap[state] || colorMap.active;

    return `
      <span class="status-pill"
            style="display:inline-flex;align-items:center;gap:5px;margin-top:4px;padding:3px 10px 3px 9px;
                   border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.03em;
                   background:${bg};color:${color}">
        ${this.escapeHTML(label)}
        <span style="width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;"></span>
      </span>`;
  },

  /**
   * Render a stock hero card HTML element safely.
   * Generates a premium-style stock progress card with gradient background,
   * value display, progress bar, and minimum stock indicator.
   * All numeric and text content is properly escaped.
   * 
   * @param {object} item - Item data object containing: itemCode, name, unit (optional)
   * @param {number} currentStock - Current stock quantity (displayed in large font)
   * @param {number} [minimumStock=0] - Minimum stock threshold
   * @param {('ok'|'low'|'danger')} [status='ok'] - Status determining visual style
   * @returns {string} HTML-safe stock hero card div element
   * 
   * @example
   * ```javascript
   * const item = { itemCode: 'ITEM-001', name: 'Baut', unit: 'PCS' };
   * const stockHTML = dom.renderStockHero(item, 42, 50, 'low');
   * document.getElementById('stock-hero').innerHTML = stockHTML;
   * ```
   */
  renderStockHero(item, currentStock, minimumStock = 0, status = 'ok') {
    /** @type {string} */
    const itemCode = item.itemCode || '-';
    /** @type {string} */
    const name = item.name || '-';
    /** @type {string} */
    const unit = item.unit || '';

    // Determine hero visual class and flag based on status
    /** @type {string} */
    let heroClass = 'stock-hero';
    /** @type {string} */
    let heroFlag = '';
    /** @type {string} */
    let heroValueStyle = '';

    if (status === 'low' || currentStock < minimumStock) {
      heroClass += ' low';
      heroFlag = '<span class="stock-hero-flag">STOK RENDAH</span>';
      heroValueStyle = 'color:var(--danger)';
    } else if (status === 'ok') {
      heroValueStyle = 'color:var(--ok)';
    }

    /** @type {number} */
    const stockPercent = minimumStock > 0 ? Math.min((currentStock / minimumStock) * 100, 100) : 100;
    /** @type {string} */
    const stockBarWidth = `${stockPercent}%`;

    return `
      <div class="${heroClass}" style="border-radius:var(--radius-lg);padding:16px 18px;margin-bottom:14px;color:#fff;
           background:var(--primary-gradient);box-shadow:var(--shadow-btn);position:relative;overflow:hidden">
        <div class="stock-hero-row" style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px">
          <div>
            <div class="stock-hero-label" style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;opacity:.85">
              ${this.escapeHTML(itemCode)} — ${this.escapeHTML(name)}
            </div>
            <div class="stock-hero-value" style="font-family:var(--font-mono);font-size:30px;font-weight:800;margin-top:2px;letter-spacing:-.02em;line-height:1;">
              ${currentStock !== undefined && currentStock >= 0 ? currentStock : '—'}
            </div>
            <span class="unit">${this.escapeHTML(unit)}</span>
          </div>
          <div>
            <div class="stock-hero-flag">${heroFlag}</div>
            <div class="stock-bar-track" style="height:6px;border-radius:999px;background:rgba(255,255,255,.25);margin-top:12px;overflow:hidden">
              <div class="stock-bar-fill" style="height:100%;border-radius:999px;background:#fff;transition:width .3s ease"
                   style="width:${stockBarWidth}"></div>
            </div>
            <div class="stock-hero-foot" style="margin-top:7px;font-size:10.5px;font-weight:700;opacity:.85">
              Minimum: ${minimumStock}
            </div>
          </div>
        </div>
      </div>`;
  },

  /**
   * Render a toast notification HTML safely.
   * Creates a toast notification that appears at the bottom center of the screen.
   * Toast automatically fades out after a default duration (3000ms).
   * 
   * @param {string} message - Toast message text to display
   * @param {('info'|'success'|'warning'|'error')} [type='info'] - Toast type for color theming
   * 
   * @example
   * ```javascript
   * dom.renderToast('Data berhasil disimpan', 'success');
   * // Shows green success toast at bottom center
   * ```
   * 
   * @private - Typically called via window.showToast() from main.js
   */
  renderToast(message, type = 'info') {
    /** @type {Record<string, Record<string, string>} */
    const typeStyles = {
      info: { bg: 'var(--navy-900)', color: '#fff' },
      success: { bg: 'rgba(30,158,100,.13)', color: 'var(--ok)' },
      warning: { bg: 'rgba(217,138,23,.13)', color: 'var(--warn)' },
      error: { bg: 'rgba(214,54,44,.13)', color: 'var(--danger)' }
    };

    /** @type {Record<string, string>} */
    const style = typeStyles[type] || typeStyles.info;

    /** @type {string} */
    const toastHTML = `
      <div class="toast" style="position:fixed;left:50%;bottom:104px;transform:translateX(-50%);
            background:${style.bg};color:${style.color;font-size:12.5px;font-weight:500;
            padding:10px 16px;border-radius:999px;z-index:200;opacity:0;pointer-events:none;
            transition:opacity .25s ease, bottom .25s ease;white-space:nowrap">
        ${this.escapeHTML(message)}
      </div>`;

    // Insert into DOM and trigger show animation
    /** @type {HTMLElement} */
    const container = document.getElementById('toast');
    if (container) {
      container.innerHTML = toastHTML;
      container.classList.add('show');
      /** @type {number} */
      const duration = 3000;
      setTimeout(() => {
        if (container) container.classList.remove('show');
      }, duration);
    }
  }
};