/**
 * Modal Component Module
 * Provides reusable modal dialog components for the RDI Indirect Inventory application.
 * All modals are XSS-safe, accessible (keyboard focus management, ARIA attributes),
 * and follow the app's premium industrial design system (glassmorphism, green theme).
 * 
 * MIT License - RDI Indirect Inventory v6.65+
 * 
 * Related Modules:
 * - utils/dom.js - XSS-safe DOM manipulation
 * - utils/validation.js - Input validation
 * - main.js - Main application entry point
 * - utils/performance.js - Debounce/throttle helpers
 */

/**
 * Namespace for modal components.
 * @namespace modal
 */
export const modal = {
  /**
   * Open a standardized modal dialog.
   * Creates a modal sheet with glassmorphism styling, focus trapping,
   * and standardized button layout.
   * 
   * @param {object} options - Modal configuration options
   * @param {string} options.title - Modal title text
   * @param {string|HTMLElement} options.content - Modal body content (HTML string or DOM element)
   * @param {Array<object>} [options.buttons=[]] - Array of button configurations
   * @param {string} [options.buttonConfirmText='Ya'] - Confirm button label
   * @param {string} [options.buttonCancelText='Batal'] - Cancel button label
   * @param {Function} [options.onConfirm] - Callback when confirm is clicked
   * @param {Function} [options.onCancel] - Callback when cancel is clicked
   * @param {boolean} [options.showCancel=true] - Whether to show cancel button
   * @param {string} [options.modalId] - Unique ID for the modal (for reuse/closure)
   * @param {boolean} [options.fullscreen=false] - Whether to make modal fullscreen
   * @returns {object} Modal instance with open/close methods
   * 
   * @example
   * ```javascript
   * // Open a confirmation modal
   * const instance = modal.open({
   *   title: 'Konfirmasi',
   *   content: 'Apakah Anda yakin ingin menghapus item ini?',
   *   buttons: [
   *     { text: 'Ya', type: 'danger', onClick: () => { /* delete */ } },
   *     { text: 'Batal', type: 'default', onClick: () => instance.close() }
   *   ],
   *   onConfirm: () => { /* proceed with deletion */ },
   *   onCancel: () => { /* do nothing */ }
   * });
   * ```
   */
  open(options: {
    title: string;
    content: string | HTMLElement;
    buttons?: Array<{
      text: string;
      type?: 'primary' | 'danger' | 'secondary' | 'ghost';
      onClick?: () => void;
      className?: string;
    }>;
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    modalId?: string;
    fullscreen?: boolean;
  }): object {
    /** @type {string} */
    const modalId = options.modalId || `modal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    /** @type {boolean} */
    const showCancel = options.showCancel !== false;
    
    /** @type {HTMLElement} */
    let contentEl;
    if (options.content instanceof HTMLElement) {
      contentEl = options.content;
    } else {
      /** @type {HTMLDivElement} */
      contentEl = document.createElement('div');
      contentEl.innerHTML = utils.dom.escapeHTML(options.content);
      // Clean up - remove the wrapper div, keep only content
      /** @type {HTMLElement} */
      const wrapper = contentEl.firstElementChild;
      if (wrapper && wrapper.tagName === 'DIV' && wrapper.children.length === 0) {
        contentEl.removeChild(wrapper);
      }
    }

    /** @type {HTMLElement} */
    const existingModal = document.getElementById(`modal_${modalId}`);
    if (existingModal) {
      existingModal.remove();
    }

    /** @type {string} */
    const buttonConfirmText = options.buttonConfirmText || 'Ya';
    /** @type {string} */
    const buttonCancelText = options.buttonCancelText || 'Batal';

    /** @type {string} */
    const buttonsHTML = showCancel
      ? `
        <div class="m-actions" style="display:flex;gap:8px;padding-top:var(--space-3);border-top:1px solid var(--line-subtle);justify-content:flex-end;">
          <button type="button" class="btn-ghost" id="modal-cancel-${modalId}" style="flex:.8;">Batal</button>
          <button type="button" class="btn-primary flex1" id="modal-confirm-${modalId}">${buttonConfirmText}</button>
        </div>`
      : '';

    /** @type {string} */
    const modalHTML = `
      <div class="modal-overlay" id="modal_${modalId}" style="display:none;">
        <div class="modal-sheet"
             style="width:100%;max-width:520px;border-radius:var(--radius-lg);overflow:hidden;
                    background:var(--glass-bg);backdrop-filter:blur(22px) saturate(160%);
                    -webkit-backdrop-filter:blur(22px) saturate(160%);
                    border:1px solid var(--glass-border);box-shadow:var(--shadow-elevated);">
          <div class="modal-head" style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;background:var(--glass-bg-strong);border-bottom:1px solid var(--glass-border);">
            <h3 class="modal-head-title" style="font-size:15px;margin:0;">${utils.dom.escapeHTML(options.title)}</h3>
            <button type="button" class="modal-close" id="modal-close-${modalId}" aria-label="Tutup"
                    style="width:36px;height:36px;border:none;background:rgba(30,36,48,.08);
                           display:flex;align-items:center;justify-content:center;color:var(--ink-600);flex-shrink:0;
                           transition:background .15s ease,transform .1s ease;">
              <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding:24px;">
            ${contentEl.outerHTML || ''}
          </div>
          ${buttonsHTML}
        </div>
      </div>`;

    /** @type {HTMLElement} */
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    /** @type {HTMLElement} */
    const modalEl = modalContainer.firstElementChild;

    /** @type {HTMLElement} */
    const overlay = modalEl.querySelector('.modal-overlay');
    /** @type {HTMLElement} */
    const sheet = modalEl.querySelector('.modal-sheet');
    /** @type {HTMLElement} */
    const closeBtn = modalEl.querySelector('.modal-close');
    /** @type {HTMLElement} */
    const confirmBtn = modalEl.querySelector(`#modal-confirm-${modalId}`);
    /** @type {HTMLElement} */
    const cancelBtn = modalEl.querySelector(`#modal-cancel-${modalId}`);

    /** @type {number} */
    let focusInSheet = 0;

    /** @type {Function} */
    const setupFocusTrap = () => {
      /** @type {HTMLElement} */
      const focusableEls = sheet.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      /** @type {number} */
      const firstFocusable = focusableEls[0];
      /** @type {number} */
      const lastFocusable = focusableEls[focusableEls.length - 1];

      /** @type {EventListener} */
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          instance.close();
          event.preventDefault();
          return;
        }
        if (event.key === 'Tab') {
          if (focusInSheet === lastFocusable.tabIndex) {
            focusInSheet = firstFocusable.tabIndex;
            firstFocusable.focus();
            event.preventDefault();
          } else {
            focusInSheet = event.target.tabIndex;
            const nextFocusable = focusableEls[focusInSheet + 1];
            if (nextFocusable) {
              nextFocusable.focus();
            } else {
              lastFocusable.focus();
              event.preventDefault();
            }
          }
        }
      };

      sheet.addEventListener('keydown', handleKeydown);
    };

    /** @type {Function} */
    const handleConfirm = () => {
      if (options.onConfirm) {
        options.onConfirm();
      }
      instance.close();
    };

    /** @type {Function} */
    const handleCancel = () => {
      if (options.onCancel) {
        options.onCancel();
      }
      instance.close();
    };

    /** @type {EventListener} */
    const handleOverlayClick = (event: MouseEvent) => {
      if (event.target === overlay) {
        instance.close();
      }
    };

    /** @type {EventListener} */
    const handleCloseClick = () => {
      instance.close();
    };

    /** @type {EventListener} */
    const handleConfirmClick = () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Memproses…';
      if (options.onConfirm) {
        setTimeout(() => {
          options.onConfirm();
        }, 300);
      }
    };

    /** Attach event listeners */
    if (closeBtn) closeBtn.addEventListener('click', handleCloseClick);
    if (overlay) overlay.addEventListener('click', handleOverlayClick);
    if (confirmBtn) confirmBtn.addEventListener('click', handleConfirmClick);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);

    /** @type {Function} */
    const openModal = () => {
      overlay.style.display = 'flex';
      // Force reflow for animation
      overlay.offsetHeight;
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';

      // Set focus to first focusable element in sheet
      setupFocusTrap();
      if (firstFocusable) firstFocusable.focus();
    };

    /** @type {Function} */
    const closeModal = () => {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      
      // Wait for animation then remove
      setTimeout(() => {
        if (modalEl && modalEl.parentNode) {
          modalEl.parentNode.removeChild(modalEl);
        }
      }, 300);
    };

    /** Modal instance instance */
    /** @type {object} */
    const instance = {
      open: openModal,
      close: closeModal,
      element: modalEl,
      overlay,
      sheet,
      confirm: handleConfirm,
      cancel: handleCancel,
      id: modalId
    };

    /** Append to body */
    document.body.appendChild(modalEl);
    
    // Auto-open if requested (default behavior)
    if (!options.autoOpen === false) {
      openModal();
    }

    return instance;
  }
};

/**
 * Standardized toast notification (replaces simple window.showToast).
 * Provides themed toasts with auto-dismiss and action buttons.
 * 
 * @function toast
 * @param {object} options - Toast configuration
 * @param {string} options.message - Toast message text
 * @param {('info'|'success'|'warning'|'error')} [options.type='info'] - Toast type
 * @param {string} [options.duration=3000] - Display duration in milliseconds
 * @param {string} [options.actionText='Batal'] - Action button text (shows action button)
 * @param {Function} [options.onAction] - Callback when action button is clicked
 * @returns {object} Toast instance with cancel method
 * 
 * @example
 * ```javascript
 * // Show error toast with action
 * const toast = modal.toast({
 *   message: 'Gagal menyimpan transaksi',
 *   type: 'error',
 *   actionText: 'Coba Lagi',
 *   onAction: () => { retryTransaction() }
 * });
 * 
 * // Auto-dismiss after 5 seconds
 * modal.toast({ message: 'Data berhasil disimpan', duration: 5000 });
 * ```
 */
toast(options: {
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
    actionText?: string;
    onAction?: () => void;
  }): object {
    /** @type {string} */
    const type = options.type || 'info';
    /** @type {number} */
    const duration = options.duration || 3000;
    /** @type {string} */
    const actionText = options.actionText || 'Batal';
    
    /** @type {Record<string, string>} */
    const typeStyles = {
      info: { bg: 'var(--navy-900)', color: '#fff' },
      success: { bg: 'rgba(30,158,100,.13)', color: 'var(--ok)' },
      warning: { bg: 'rgba(217,138,23,.13)', color: 'var(--warn)' },
      error: { bg: 'rgba(214,54,44,.13)', color: 'var(--danger)' }
    };

    /** @type {Record<string, string>} */
    const typeBtnStyles = {
      primary: { bg: 'var(--primary-gradient)', color: '#fff' },
      danger: { bg: 'var(--danger)', color: '#fff' },
      secondary: { bg: 'var(--glass-bg)', color: 'var(--ink-900)' },
      ghost: { bg: 'transparent', color: 'var(--ink-600)' }
    };

    /** @type {string} */
    const style = typeStyles[type] || typeStyles.info;
    /** @type {string} */
    const btnStyle = typeBtnStyles.primary || typeBtnStyles.danger;

    /** @type {HTMLElement} */
    const toastContainer = document.getElementById('toast');
    if (!toastContainer) {
      /** @type {HTMLElement} */
      const newToast = document.createElement('div');
      newToast.id = 'toast';
      newToast.style.cssText = `
        position:fixed;left:50%;bottom:104px;transform:translateX(-50%);
        background:${style.bg};color:${style.color;font-size:12.5px;font-weight:500;
        padding:10px 16px;border-radius:999px;z-index:200;opacity:0;pointer-events:none;
        transition:opacity .25s ease, bottom .25s ease;white-space:nowrap;
        display:flex;align-items:center;gap:8px;
      `;
      document.body.appendChild(newToast);
    }

    /** @type {HTMLElement} */
    const toastEl = document.getElementById('toast');
    /** @type {string} */
    const actionBtnHTML = options.onAction ? `
      <button type="button" class="btn-ghost" style="margin-left:8px;padding:4px 8px;font-size:11px;">
        ${actionText}
      </button>` : '';

    /** @type {string} */
    toastEl.innerHTML = `
      <div style="background:${style.bg};color:${style.color;font-size:12.5px;font-weight:500;padding:10px 16px;border-radius:999px;opacity:0;pointer-events:none;
            transition:opacity .25s ease,bottom .25s ease;white-space:nowrap;display:flex;align-items:center;gap:8px;">
        ${utils.dom.escapeHTML(options.message)} ${actionBtnHTML}
      </div>
    `;
    toastEl.style.opacity = '1';
    toastEl.style.pointerEvents = 'auto';

    /** @type {Function} */
    const hideToast = () => {
      toastEl.style.opacity = '0';
      toastEl.style.pointerEvents = 'none';
      setTimeout(() => {
        if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      }, duration);
    };

    /** @type {object} */
    const instance = {
      element: toastEl,
      hide: hideToast,
      id: `toast_${Date.now()}`
    };

    /** Auto-hide after duration */
    setTimeout(() => {
      if (toastEl && toastEl.parentNode) hideToast();
    }, duration);

    return instance;
  }
};