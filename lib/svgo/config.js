const PATH = require('path');
const defaultConfig = require('../../defaults');
const pluginsList = require('../../plugins-list');

/**
 * Read and/or extend/replace default config file,
 * prepare and optimize plugins array.
 *
 * @param {Object} [config] input config
 * @return {Object} output config
 */
module.exports = function (config) {
  let defaults;
  config = (typeof config === 'object' && config) || {};

  if (config.plugins && !Array.isArray(config.plugins)) {
    return {
      error: "Error: Invalid plugins list. Provided 'plugins' in config should be an array.",
    };
  }

  if (config.full) {
    defaults = config;

    if (Array.isArray(defaults.plugins)) {
      defaults.plugins = preparePluginsArray(config, defaults.plugins);
    }
  } else {
    defaults = { ...defaultConfig };
    defaults.plugins = preparePluginsArray(config, defaults.plugins || []);
    defaults = extendConfig(defaults, config);
  }

  if ('floatPrecision' in config && Array.isArray(defaults.plugins)) {
    defaults.plugins.forEach((plugin) => {
      if (plugin.params && 'floatPrecision' in plugin.params) {
        // Don't touch default plugin params
        plugin.params = { ...plugin.params, floatPrecision: config.floatPrecision };
      }
    });
  }

  if ('datauri' in config) {
    defaults.datauri = config.datauri;
  }

  if (Array.isArray(defaults.plugins)) {
    defaults.plugins = optimizePluginsArray(defaults.plugins);
  }

  return defaults;
};

/**
 * Require() all plugins in array.
 *
 * @param {Object} config
 * @param {Array} plugins input plugins array
 * @return {Array} input plugins array of arrays
 */
function preparePluginsArray(config, plugins) {
  let plugin;
  let key;

  return plugins.map((item) => {
    // {}
    if (typeof item === 'object') {
      key = Object.keys(item)[0];

      // custom
      if (typeof item[key] === 'object' && item[key].fn && typeof item[key].fn === 'function') {
        plugin = setupCustomPlugin(key, item[key]);
      } else {
        plugin = setPluginActiveState(loadPlugin(config, key, item[key].path), item, key);
        plugin.name = key;
      }

      // name
    } else {
      plugin = loadPlugin(config, item);
      plugin.name = item;
      if (typeof plugin.params === 'object') {
        plugin.params = { ...plugin.params };
      }
    }

    return plugin;
  });
}

/**
 * Extend plugins with the custom config object.
 *
 * @param {Array} plugins input plugins
 * @param {Object} config config
 * @return {Array} output plugins
 */
function extendConfig(defaults, config) {
  let key;

  // plugins
  if (config.plugins) {
    config.plugins.forEach((item) => {
      // {}
      if (typeof item === 'object') {
        key = Object.keys(item)[0];

        if (item[key] == null) {
          console.error(
            `Error: '${key}' plugin is misconfigured! Have you padded its content in YML properly?\n`,
          );
        }

        // custom
        if (typeof item[key] === 'object' && item[key].fn && typeof item[key].fn === 'function') {
          defaults.plugins.push(setupCustomPlugin(key, item[key]));

          // plugin defined via path
        } else {
          defaults.plugins.forEach((plugin) => {
            if (plugin && plugin.name === key) {
              plugin = setPluginActiveState(plugin, item, key);
            }
          });
        }
      }
    });
  }

  defaults.multipass = config.multipass;

  // svg2js
  if (config.svg2js) {
    defaults.svg2js = config.svg2js;
  }

  // js2svg
  if (config.js2svg) {
    defaults.js2svg = config.js2svg;
  }

  return defaults;
}

/**
 * Setup and enable a custom plugin
 *
 * @param {String} plugin name
 * @param {Object} custom plugin
 * @return {Array} enabled plugin
 */
function setupCustomPlugin(name, plugin) {
  plugin.active = true;
  plugin.params = { ...(plugin.params || {}) };
  plugin.name = name;

  return plugin;
}

/**
 * Try to group sequential elements of plugins array.
 *
 * @param {Object} plugins input plugins
 * @return {Array} output plugins
 */
function optimizePluginsArray(plugins) {
  let prev;

  return plugins.reduce((plugins, item) => {
    if (prev && item.type === prev[0].type) {
      prev.push(item);
    } else {
      plugins.push((prev = [item]));
    }
    return plugins;
  }, []);
}

/**
 * Sets plugin to active or inactive state.
 *
 * @param {Object} plugin
 * @param {Object} item
 * @param {Object} key
 * @return {Object} plugin
 */
function setPluginActiveState(plugin, item, key) {
  // name: {}
  if (typeof item[key] === 'object') {
    plugin.params = { ...(plugin.params || {}), ...item[key] };
    plugin.active = true;

    // name: false
  } else if (item[key] === false) {
    plugin.active = false;

    // name: true
  } else if (item[key] === true) {
    plugin.active = true;
  }

  return plugin;
}

/**
 * Loads default plugin using name or custom plugin defined via path in config.
 *
 * @param {Object} config
 * @param {Object} name
 * @param {Object} path
 * @return {Object} plugin
 */
function loadPlugin(config, name) {
  const plugin = pluginsList[name] || {};

  return { ...plugin };
}
