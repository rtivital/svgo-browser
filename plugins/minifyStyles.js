exports.type = 'full';

exports.active = true;

exports.description = 'minifies styles and removes unused styles based on usage data';

exports.params = {
  // ... CSSO options goes here

  // additional
  usage: {
    force: false, // force to use usage data even if it unsafe (document contains <script> or on* attributes)
    ids: true,
    classes: true,
    tags: true,
  },
};

const csso = require('csso');

/**
 * Minifies styles (<style> element + style attribute) using CSSO
 *
 * @author strarsis <strarsis@gmail.com>
 */
exports.fn = function (ast, options) {
  options = options || {};

  const minifyOptionsForStylesheet = cloneObject(options);
  const minifyOptionsForAttribute = cloneObject(options);
  const elems = findStyleElems(ast);

  minifyOptionsForStylesheet.usage = collectUsageData(ast, options);
  minifyOptionsForAttribute.usage = null;

  elems.forEach((elem) => {
    if (elem.isElem('style')) {
      // <style> element
      const styleCss = elem.content[0].text || elem.content[0].cdata || [];
      const DATA = styleCss.indexOf('>') >= 0 || styleCss.indexOf('<') >= 0 ? 'cdata' : 'text';

      elem.content[0][DATA] = csso.minify(styleCss, minifyOptionsForStylesheet).css;
    } else {
      // style attribute
      const elemStyle = elem.attr('style').value;

      elem.attr('style').value = csso.minifyBlock(elemStyle, minifyOptionsForAttribute).css;
    }
  });

  return ast;
};

function cloneObject(obj) {
  const result = {};

  for (const key in obj) {
    result[key] = obj[key];
  }

  return result;
}

function findStyleElems(ast) {
  function walk(items, styles) {
    for (let i = 0; i < items.content.length; i++) {
      const item = items.content[i];

      // go deeper
      if (item.content) {
        walk(item, styles);
      }

      if (item.isElem('style') && !item.isEmpty()) {
        styles.push(item);
      } else if (item.isElem() && item.hasAttr('style')) {
        styles.push(item);
      }
    }

    return styles;
  }

  return walk(ast, []);
}

function shouldFilter(options, name) {
  if ('usage' in options === false) {
    return true;
  }

  if (options.usage && name in options.usage === false) {
    return true;
  }

  return Boolean(options.usage && options.usage[name]);
}

function collectUsageData(ast, options) {
  function walk(items, usageData) {
    for (let i = 0; i < items.content.length; i++) {
      const item = items.content[i];

      // go deeper
      if (item.content) {
        walk(item, usageData);
      }

      if (item.isElem('script')) {
        safe = false;
      }

      if (item.isElem()) {
        usageData.tags[item.elem] = true;

        if (item.hasAttr('id')) {
          usageData.ids[item.attr('id').value] = true;
        }

        if (item.hasAttr('class')) {
          item
            .attr('class')
            .value.replace(/^\s+|\s+$/g, '')
            .split(/\s+/)
            .forEach((className) => {
              usageData.classes[className] = true;
            });
        }

        if (
          item.attrs
          && Object.keys(item.attrs).some((name) => /^on/i.test(name))
        ) {
          safe = false;
        }
      }
    }

    return usageData;
  }

  var safe = true;
  const usageData = {};
  let hasData = false;
  const rawData = walk(ast, {
    ids: Object.create(null),
    classes: Object.create(null),
    tags: Object.create(null),
  });

  if (!safe && options.usage && options.usage.force) {
    safe = true;
  }

  for (const key in rawData) {
    if (shouldFilter(options, key)) {
      usageData[key] = Object.keys(rawData[key]);
      hasData = true;
    }
  }

  return safe && hasData ? usageData : null;
}
