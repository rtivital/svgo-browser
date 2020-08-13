exports.type = 'perItem';

exports.active = true;

exports.description = 'cleanups attributes from newlines, trailing and repeating spaces';

exports.params = {
  newlines: true,
  trim: true,
  spaces: true,
};

const regNewlinesNeedSpace = /(\S)\r?\n(\S)/g;
const regNewlines = /\r?\n/g;
const regSpaces = /\s{2,}/g;

/**
 * Cleanup attributes values from newlines, trailing and repeating spaces.
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item, params) {
  if (item.isElem()) {
    item.eachAttr((attr) => {
      if (params.newlines) {
        // new line which requires a space instead of themselve
        attr.value = attr.value.replace(regNewlinesNeedSpace, (match, p1, p2) => `${p1} ${p2}`);

        // simple new line
        attr.value = attr.value.replace(regNewlines, '');
      }

      if (params.trim) {
        attr.value = attr.value.trim();
      }

      if (params.spaces) {
        attr.value = attr.value.replace(regSpaces, ' ');
      }
    });
  }
};
