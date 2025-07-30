const DOMUtils = {
    createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    },

    query(selector) {
        return document.querySelector(selector);
    },

    queryAll(selector) {
        return document.querySelectorAll(selector);
    },

    setHTML(id, html) {
        const element = document.getElementById(id);
        if (element) element.innerHTML = html;
    },

    setText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    },

    setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    },

    getValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : null;
    },

    toggleVisibility(id, show = null) {
        const element = document.getElementById(id);
        if (element) {
            const isVisible = element.style.display !== 'none';
            if (show === null) {
                element.style.display = isVisible ? 'none' : 'block';
                return !isVisible;
            }
            element.style.display = show ? 'block' : 'none';
            return show;
        }
        return false;
    },

    setStyle(id, property, value) {
        const element = document.getElementById(id);
        if (element) element.style[property] = value;
    },

    addEventListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) element.addEventListener(event, handler);
    }
};

export default DOMUtils;