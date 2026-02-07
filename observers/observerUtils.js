/**
 * Utility functions for observer DOM operations
 */
const ObserverUtils = {
  /**
   * Find and click a button matching one of the selectors
   * @param {Document} doc - The document to search in
   * @param {string|string[]} selectors - CSS selector(s) to find the button
   * @param {string} label - Label for logging
   * @returns {boolean} - True if button was found and clicked
   */
  clickButton(doc, selectors, label) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
      const element = doc.querySelector(selector);
      if (element) {
        const button = element.closest('button') || element;
        console.log(`Clicking ${label} button`);
        button.click();
        return true;
      }
    }

    console.log(`Unable to find ${label} button`);
    return false;
  },

  /**
   * Click a button after a delay (for confirmation dialogs)
   * @param {Document} doc - The document to search in
   * @param {string|string[]} selectors - CSS selector(s) to find the button
   * @param {string} label - Label for logging
   * @param {number} delay - Delay in milliseconds (default: 250)
   * @returns {Promise<boolean>} - Promise resolving to true if button was clicked
   */
  clickButtonAfterDelay(doc, selectors, label, delay = 250) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.clickButton(doc, selectors, label));
      }, delay);
    });
  },

  /**
   * Check if an element exists in the document
   * @param {Document} doc - The document to search in
   * @param {string} selector - CSS selector
   * @returns {boolean} - True if element exists
   */
  elementExists(doc, selector) {
    return doc.querySelector(selector) !== null;
  },

  /**
   * Safely get an attribute value from an element
   * @param {Document} doc - The document to search in
   * @param {string} selector - CSS selector
   * @param {string} attribute - Attribute name
   * @returns {string|null} - Attribute value or null
   */
  getElementAttribute(doc, selector, attribute) {
    const element = doc.querySelector(selector);
    return element ? element.getAttribute(attribute) : null;
  },

  /**
   * Check if an element's attribute contains a value
   * @param {Document} doc - The document to search in
   * @param {string} selector - CSS selector
   * @param {string} attribute - Attribute name
   * @param {string} contains - Value to search for
   * @returns {boolean} - True if attribute contains the value
   */
  attributeContains(doc, selector, attribute, contains) {
    const value = this.getElementAttribute(doc, selector, attribute);
    return value ? value.includes(contains) : false;
  },

  /**
   * Detect boolean state from presence of selectors
   * @param {Document} doc - The document to search in
   * @param {string} trueSelector - Selector indicating true state
   * @param {string} falseSelector - Selector indicating false state
   * @returns {boolean|null} - True, false, or null if neither found
   */
  detectBooleanState(doc, trueSelector, falseSelector) {
    if (doc.querySelector(trueSelector)) {
      return true;
    }
    if (doc.querySelector(falseSelector)) {
      return false;
    }
    return null;
  },

  /**
   * Find an element by text content
   * @param {Document} doc - The document to search in
   * @param {string} selector - CSS selector for elements to search
   * @param {string} text - Text content to match
   * @returns {Element|null} - Matching element or null
   */
  findByText(doc, selector, text) {
    const elements = doc.querySelectorAll(selector);
    return Array.from(elements).find(el => el.textContent.trim() === text) || null;
  },

  /**
   * Simulate hover events on an element (for dropdown menus)
   * @param {Element} element - The element to hover
   */
  simulateHover(element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const mouseEvents = ['mouseover', 'mouseenter', 'mousemove'];

    mouseEvents.forEach(eventType => {
      element.dispatchEvent(new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + 5
      }));
    });
  },

  /**
   * Simulate pressing Enter key
   * @param {Document} doc - The document to dispatch event on
   */
  pressEnter(doc) {
    const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    doc.dispatchEvent(keyEvent);
  }
};
