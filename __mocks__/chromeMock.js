global.chrome = {
  browserAction: {
    onClicked: {
      addListener: function () {},
    },
  },
  contextMenus: {
    create: function () {},
    onClicked: {
      addListener: function () {},
    },
    onCommand: {
      addListener: function () {},
    },
  },
  i18n: {
    getMessage: function (msg) {
      if (msg === "Title") {
        return "титул";
      } else {
        throw "Error, translation for input does not exist";
      }
    },
  },
  runtime: {
    id: "ldhahppapilmnhocniaifnlieiofgnii",
    setUninstallURL: function () {},
    onMessage: {
      addListener: function () {},
    },
  },
  storage: {
    local: {
      get: function (key, cb) {
        if (key) {
          const item = JSON.parse(localStorage.getItem(key));
          cb({ [key]: item });
        } else {
          cb({ ...localStorage });
        }
      },
      remove: function (keys, cb) {
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            localStorage.removeItem(key);
          });
        } else {
          localStorage.removeItem(keys);
        }

        cb();
      },
      set: function (obj, cb) {
        const key = Object.keys(obj)[0];
        localStorage.setItem(key, JSON.stringify(obj[key]));
        cb();
      },
    },
    sync: {
      get: function (key, cb) {
        if (key) {
          const item = JSON.parse(sessionStorage.getItem(key));
          cb({ [key]: item });
        } else {
          cb({ ...sessionStorage });
        }
      },
      remove: function (keys, cb) {
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            sessionStorage.removeItem(key);
          });
        } else {
          sessionStorage.removeItem(keys);
        }

        cb();
      },
      set: function (obj, cb) {
        const key = Object.keys(obj)[0];
        sessionStorage.setItem(key, JSON.stringify(obj[key]));
        cb();
      },
    },
    onChanged: {
      addListener: function () {},
      removeListener: function () {},
    },
  },
  tabs: {
    create: function () {},
    move: function () {},
    query: function () {},
    remove: function () {},
    update: function () {},
    onUpdated: {
      addListener: function () {},
      removeListener: function () {},
    },
  },
};