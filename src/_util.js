'use strict'

/**
 * Inherit the prototype methods from one constructor into another.
 * Source: https://github.com/kaelzhang/node-util-inherits
 * @param {function} ctor Constructor function which needs to inherit the prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 * @private
 */
export function inherits(ctor, superCtor) {
  if (ctor === undefined || ctor === null) {
    throw new TypeError(
      'The constructor to "inherits" must not be null or undefined'
    )
  }

  if (superCtor === undefined || superCtor === null) {
    throw new TypeError(
      'The super constructor to "inherits" must not be null or undefined'
    )
  }

  if (superCtor.prototype === undefined) {
    throw new TypeError(
      'The super constructor to "inherits" must have a prototype'
    )
  }

  ctor.super_ = superCtor
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  })
}

/**
 * Determines if the current environment is a NodeJS environment.
 * @private
 */
export function isNodeEnv() {
  return (
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  )
}

/**
 * Resolves environment variable if available.
 *
 * @param {string} envKey A name of env variable.
 * @return {void|string} Returns requested env variable or void.
 * @private
 */
export function getEnvVariable(envKey) {
  var areEnvVarsAvailable = !!(
    typeof process !== 'undefined' &&
    process &&
    process.env
  )

  if (areEnvVarsAvailable && process.env[envKey] != null) {
    return process.env[envKey]
  }
}

/**
 * JavaScript Client Detection
 * @private
 */
export function getBrowserDetails() {
  var browser = navigator.appName
  var browserVersion = '' + parseFloat(navigator.appVersion)
  var nameOffset, verOffset, ix

  // Opera
  if ((verOffset = navigator.userAgent.indexOf('Opera')) != -1) {
    browser = 'Opera'
    browserVersion = navigator.userAgent.substring(verOffset + 6)
    if ((verOffset = navigator.userAgent.indexOf('Version')) != -1) {
      browserVersion = navigator.userAgent.substring(verOffset + 8)
    }
  }
  // MSIE
  else if ((verOffset = navigator.userAgent.indexOf('MSIE')) != -1) {
    browser = 'Microsoft Internet Explorer'
    browserVersion = navigator.userAgent.substring(verOffset + 5)
  }

  //IE 11 no longer identifies itself as MS IE, so trap it
  //http://stackoverflow.com/questions/17907445/how-to-detect-ie11
  else if (
    browser == 'Netscape' &&
    navigator.userAgent.indexOf('Trident/') != -1
  ) {
    browser = 'Microsoft Internet Explorer'
    browserVersion = navigator.userAgent.substring(verOffset + 5)
    if ((verOffset = navigator.userAgent.indexOf('rv:')) != -1) {
      browserVersion = navigator.userAgent.substring(verOffset + 3)
    }
  }

  // Chrome
  else if ((verOffset = navigator.userAgent.indexOf('Chrome')) != -1) {
    browser = 'Chrome'
    browserVersion = navigator.userAgent.substring(verOffset + 7)
  }
  // Safari
  else if ((verOffset = navigator.userAgent.indexOf('Safari')) != -1) {
    browser = 'Safari'
    browserVersion = navigator.userAgent.substring(verOffset + 7)
    if ((verOffset = navigator.userAgent.indexOf('Version')) != -1) {
      browserVersion = navigator.userAgent.substring(verOffset + 8)
    }

    // Chrome on iPad identifies itself as Safari. Actual results do not match what Google claims
    //  at: https://developers.google.com/chrome/mobile/docs/user-agent?hl=ja
    //  No mention of chrome in the user agent string. However it does mention CriOS, which presumably
    //  can be keyed on to detect it.
    if (navigator.userAgent.indexOf('CriOS') != -1) {
      //Chrome on iPad spoofing Safari...correct it.
      browser = 'Chrome'
      //Don't believe there is a way to grab the accurate version number, so leaving that for now.
    }
  }
  // Firefox
  else if ((verOffset = navigator.userAgent.indexOf('Firefox')) != -1) {
    browser = 'Firefox'
    browserVersion = navigator.userAgent.substring(verOffset + 8)
  }
  // Other browsers
  else if (
    (nameOffset = navigator.userAgent.lastIndexOf(' ') + 1) <
    (verOffset = navigator.userAgent.lastIndexOf('/'))
  ) {
    browser = navigator.userAgent.substring(nameOffset, verOffset)
    browserVersion = navigator.userAgent.substring(verOffset + 1)
    if (browser.toLowerCase() == browser.toUpperCase()) {
      browser = navigator.appName
    }
  }
  // trim the browser version string
  if ((ix = browserVersion.indexOf(';')) != -1)
    browserVersion = browserVersion.substring(0, ix)
  if ((ix = browserVersion.indexOf(' ')) != -1)
    browserVersion = browserVersion.substring(0, ix)
  if ((ix = browserVersion.indexOf(')')) != -1)
    browserVersion = browserVersion.substring(0, ix)

  return [browser, browserVersion].join('-')
}

export function getBrowserOsDetails() {
  var os = 'unknown'
  var clientStrings = [
    { s: 'Windows 10', r: /(Windows 10.0|Windows NT 10.0)/ },
    { s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/ },
    { s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/ },
    { s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/ },
    { s: 'Windows Vista', r: /Windows NT 6.0/ },
    { s: 'Windows Server 2003', r: /Windows NT 5.2/ },
    { s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/ },
    { s: 'Windows 2000', r: /(Windows NT 5.0|Windows 2000)/ },
    { s: 'Windows ME', r: /(Win 9x 4.90|Windows ME)/ },
    { s: 'Windows 98', r: /(Windows 98|Win98)/ },
    { s: 'Windows 95', r: /(Windows 95|Win95|Windows_95)/ },
    { s: 'Windows NT 4.0', r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/ },
    { s: 'Windows CE', r: /Windows CE/ },
    { s: 'Windows 3.11', r: /Win16/ },
    { s: 'Android', r: /Android/ },
    { s: 'Open BSD', r: /OpenBSD/ },
    { s: 'Sun OS', r: /SunOS/ },
    { s: 'Chrome OS', r: /CrOS/ },
    { s: 'Linux', r: /(Linux|X11(?!.*CrOS))/ },
    { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
    { s: 'Mac OS X', r: /Mac OS X/ },
    { s: 'Mac OS', r: /(Mac OS|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: 'QNX', r: /QNX/ },
    { s: 'UNIX', r: /UNIX/ },
    { s: 'BeOS', r: /BeOS/ },
    { s: 'OS/2', r: /OS\/2/ },
    {
      s: 'Search Bot',
      r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/,
    },
  ]
  for (var id in clientStrings) {
    var cs = clientStrings[id]
    if (cs.r.test(navigator.userAgent)) {
      os = cs.s
      break
    }
  }

  var osVersion = 'unknown'

  if (/Windows/.test(os)) {
    osVersion = /Windows (.*)/.exec(os)[1]
    os = 'Windows'
  }

  switch (os) {
    case 'Mac OS':
    case 'Mac OS X':
    case 'Android':
      osVersion = /(?:Android|Mac OS|Mac OS X|MacPPC|MacIntel|Mac_PowerPC|Macintosh) ([\.\_\d]+)/.exec(
        navigator.userAgent
      )[1]
      break

    case 'iOS':
      osVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(navigator.appVersion)
      osVersion = osVersion[1] + '.' + osVersion[2] + '.' + (osVersion[3] | 0)
      break
  }
  return [os, osVersion].join('-')
}

/**
 * For checking process.env always use `hasOwnProperty`
 * Some providers could throw an error when trying to access env variables that does not exists
 * @private */
export function getNodeRuntimeEnv() {
  var runtimeEnvs = [
    {
      name: 'Netlify',
      check: () => process.env.hasOwnProperty('NETLIFY_IMAGES_CDN_DOMAIN'),
    },
    {
      name: 'Vercel',
      check: () => process.env.hasOwnProperty('VERCEL'),
    },
    {
      name: 'Heroku',
      check: () =>
        process.env.hasOwnProperty('PATH') &&
        process.env.PATH.indexOf('.heroku') !== -1,
    },
    {
      name: 'AWS Lambda',
      check: () => process.env.hasOwnProperty('AWS_LAMBDA_FUNCTION_VERSION'),
    },
    {
      name: 'GCP Cloud Functions',
      check: () =>
        process.env.hasOwnProperty('_') &&
        process.env._.indexOf('google') !== -1,
    },
    {
      name: 'GCP Compute Instances',
      check: () => process.env.hasOwnProperty('GOOGLE_CLOUD_PROJECT'),
    },
    {
      name: 'Azure Cloud Functions',
      check: () =>
        process.env.hasOwnProperty('WEBSITE_FUNCTIONS_AZUREMONITOR_CATEGORIES'),
    },
    {
      name: 'Azure Compute',
      check: () =>
        process.env.hasOwnProperty('ORYX_ENV_TYPE') &&
        process.env.hasOwnProperty('WEBSITE_INSTANCE_ID') &&
        process.env.ORYX_ENV_TYPE === 'AppService',
    },
    {
      name: 'Mongo Stitch',
      check: () => typeof global.StitchError === 'function',
    },
    {
      name: 'Render',
      check: () => process.env.hasOwnProperty('RENDER_SERVICE_ID'),
    },
    {
      name: 'Begin',
      check: () => process.env.hasOwnProperty('BEGIN_DATA_SCOPE_ID'),
    },
  ]
  var detectedEnv = runtimeEnvs.find(env => env.check())

  return detectedEnv ? detectedEnv.name : 'unknown'
}

/**
 * If defined, returns the given value. Otherwise, returns the default value.
 * @param {any} obj The given value.
 * @param {any} def The default value.
 * @private
 */
export function defaults(obj, def) {
  if (obj === undefined) {
    return def
  } else {
    return obj
  }
}

/**
 * Used for functions that take an options objects.
 * Fills in defaults for options not provided.
 * Throws errors for provided options that aren't recognized.
 * A default value of `undefined` is used to indicate that the option must be provided.
 * @private
 */
export function applyDefaults(provided, defaults) {
  var out = {}

  for (var providedKey in provided) {
    if (!(providedKey in defaults)) {
      throw new Error('No such option ' + providedKey)
    }
    out[providedKey] = provided[providedKey]
  }

  for (var defaultsKey in defaults) {
    if (!(defaultsKey in out)) {
      out[defaultsKey] = defaults[defaultsKey]
    }
  }

  return out
}

/**
 * Returns a new object without any keys where the value would be null or undefined.
 * @private
 * */
export function removeNullAndUndefinedValues(object) {
  var res = {}
  for (var key in object) {
    var val = object[key]
    if (val !== null && val !== undefined) {
      res[key] = val
    }
  }
  return res
}

/**
 * Returns a new object without any keys where the value would be undefined.
 * @private
 * */
export function removeUndefinedValues(object) {
  var res = {}
  for (var key in object) {
    var val = object[key]
    if (val !== undefined) {
      res[key] = val
    }
  }
  return res
}

/**
 * Returns a boolean stating if the given object has a given property
 * @private
 * */
export function checkInstanceHasProperty(obj, prop) {
  return typeof obj === 'object' && obj !== null && Boolean(obj[prop])
}

export function formatUrl(base, path, query) {
  query = typeof query === 'object' ? querystringify(query) : query
  return [
    base,
    path ? (path.charAt(0) === '/' ? '' : '/' + path) : '',
    query ? (query.charAt(0) === '?' ? '' : '?' + query) : '',
  ].join('')
}

/**
 * Transform a query string to an object.
 *
 * @param {Object} obj Object that should be transformed.
 * @param {String} prefix Optional prefix.
 * @returns {String}
 * @api public
 */
export function querystringify(obj, prefix) {
  prefix = prefix || ''

  var pairs = [],
    value,
    key

  //
  // Optionally prefix with a '?' if needed
  //
  if ('string' !== typeof prefix) prefix = '?'

  for (key in obj) {
    if (checkInstanceHasProperty(obj, key)) {
      value = obj[key]

      //
      // Edge cases where we actually want to encode the value to an empty
      // string instead of the stringified value.
      //
      if (!value && (value === null || value === undefined || isNaN(value))) {
        value = ''
      }

      key = encode(key)
      value = encode(value)

      //
      // If we failed to encode the strings, we should bail out as we don't
      // want to add invalid strings to the query.
      //
      if (key === null || value === null) continue
      pairs.push(key + '=' + value)
    }
  }

  return pairs.length ? prefix + pairs.join('&') : ''
}

/**
 * Attempts to encode a given input.
 *
 * @param {String} input The string that needs to be encoded.
 * @returns {String|Null} The encoded string.
 * @api private
 */
export function encode(input) {
  try {
    return encodeURIComponent(input)
  } catch (e) {
    return null
  }
}

/**
 * Merge two objects into one
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
export function mergeObjects(obj1, obj2) {
  var obj3 = {}
  for (var attrname in obj1) {
    obj3[attrname] = obj1[attrname]
  }
  for (var attrname in obj2) {
    obj3[attrname] = obj2[attrname]
  }
  return obj3
}
