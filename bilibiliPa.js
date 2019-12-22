// ==UserScript==
// @name        New script - bilibili.com
// @namespace   Violentmonkey Scripts
// @grant       none
// @version     1.0
// @author      -
// @description 2019/12/21 下午5:21:34
// ==/UserScript==

var logger = console;

function setStyles(target, styles) {
  Object.keys(styles).forEach(styleName => {
    target.style[styleName] = styles[styleName];
  });
}

function extend(target, obj) {
  for (key in obj) {
    target[key] = obj[key];
  }
}

function Mask(targetNode) {
  var node = null;
  var isHidden = true;
  this.targetNode = targetNode;

  this.createMask = () => {
    isHidden = false;
    if (node === null) {
      node = document.createElement("div");
      font = document.createElement("p");
      node.appendChild(font);
      font.innerText = "正在清理页面";
      setStyles(font, {
        textAlign: "center"
      });
    }
    if (!node._oldStyle) {
      node._oldStyle = node.style;
    }
    if (!this.targetNode._oldStyle) {
      this.targetNode._oldStyle = this.targetNode.style;
    }
    setStyles(node, {
      width: "100%",
      height: "100%",
      background: "#fff",
      position: "fixed",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      zIndex: "99999",
      transition: "0.3s all ease",
      top: "0",
      left: "0"
    });
    setStyles(this.targetNode, {
      height: "100%",
      width: "100%",
      position: "fixed",
      overflow: "hidden"
    });
    this.targetNode.appendChild(node);
    logger.log("[mask]:Created");
  };

  this.clearMask = () => {
    isHidden = true;
    if (this.targetNode.hasChildNodes(node)) {
      if (node._oldStyle) {
        node.style = node._oldStyle;
        setStyles(node, {
          display: "none"
        });
      }
      if (this.targetNode._oldStyle) {
        this.targetNode.style = this.targetNode._oldStyle;
      }
    }
    logger.log("[mask]:Cleared");
  };

  this.getMaskStatus = () => {
    return isHidden ? "hide" : "show";
  };
}

function DOMTools() {
  this.DOM = window ? window.document : {};
  this.recycle = [];
}

DOMTools.prototype = {
  selectIdNode: function(idName, target) {
    return target.querySelector(idName);
  },
  selectAllClassNode: function(className, target) {
    var classNames = className.split(".").filter(item => {
      if (item === ".") {
        return false;
      }
      if (item === "") {
        return false;
      }
      return true;
    });
    var elements = target.getElementsByClassName(classNames[0]);
    var targetElements = [];
    for (var element of elements) {
      var itemClassNames = element.className.split(" ");
      var isTargetElement = classNames.every(eClassName => {
        if (itemClassNames.includes(eClassName)) return true;
      });
      if (isTargetElement) {
        targetElements.push(element);
      }
    }
    return targetElements;
  },
  selectAllTagNameNode: function(tagName, target) {
    return target.getElementTagName(tagName);
  },
  $: function(selectName, target) {
    target = target || this.DOM;

    if (typeof selectName === "string") {
      selectName = selectName.trim();
    } else {
      return selectName;
    }

    if (selectName == null || selectName === "") return;

    if (selectName.indexOf(".") === 0) {
      return this.selectAllClassNode(selectName, target);
    }

    if (selectName.indexOf("#") === 0) {
      return this.selectIdNode(selectName, target);
    }

    return this.selectAllTagNameNode(selectName, target);
  },
  hasNode: function(element) {
    if (!element) return false;
    return true;
  },
  restoreNode: function(elementName) {
    this.recycle = this.recycle.filter(item => {
      if (item.elementName === elementName) {
        if (item.status === "hidden") {
          item.element.style = item.element._oldStyle;
          item.element._status = "recycled";
          return false;
        }

        if (item._status === "removed") {
          var parent = item.element.parentElement;
          item.element._oldElement._status = "recycled";
          parent.replaceChild(item.element._oldElement, item.element);
          return false;
        }
      }
      return true;
    });
  },
  hideNode: function(elementName, ele) {
    var element = this.$(ele || elementName);
    if (!this.hasNode(element)) return;
    if (Array.isArray(element)) {
      if (element.length === 0) return;
      this.handleNodes(element, node => {
        this.hideNode(elementName, node);
      });
      return;
    }
    element._status = "hidden";
    element._oldStyle = element.style;
    element.style.display = "none";
    this.recycle.push({
      element,
      elementName,
      status: "hidden"
    });
  },
  removeNode: function(elementName, ele) {
    var element = this.$(ele || elementName);
    if (!this.hasNode(element)) return;
    if (Array.isArray(element)) {
      if (element.length === 0) return;
      this.handleNodes(element, node => {
        this.removeNode(elementName, node);
      });
      return;
    }
    var newElement = this.DOM.createElement("div");
    newElement._status = "removed";
    newElement._oldElement = element;

    var parent = element.parentElement;
    if (!parent) return;
    parent.replaceChild(newElement, element);
    this.recycle.push({
      elementName,
      status: "removed",
      element: newElement
    });
  },
  handleNodes: function(elements, callback) {
    for (var element of elements) {
      if (typeof callback === "function") {
        callback(element);
      }
    }
  }
};

function Ban() {
  this.location = location;
  this.pageId = [];
  this.page = {};
  this.DOMTools = new DOMTools();
  this.mask = new Mask(this.DOMTools.DOM.body);
  this.throwErrors = this.notify("error");
}

Ban.prototype.timerExec = function(options) {
  var timeoutNum = 0;
  var condition;
  var auto = typeof options.auto === undefined ? true : options.auto;
  var interval = setInterval(function() {
    timeoutNum++;
    if (auto) {
      if (timeoutNum === options.max) {
        clearInterval(interval);
      }
    }
    condition =
      typeof options.condition === "function"
        ? options.condition(timeoutNum)
        : options.condition;
    if (condition) {
      options.mount(interval);
      if (auto) {
        clearInterval(interval);
      }
    }
  }, options.delay || 2000);
};

Ban.prototype._handleNodeCompleted = function(max, delay) {
  var maxNum = max;
  var once = false;
  var i = 0;
  var timeout = setTimeout(() => {
    if (this.mask.getMaskStatus() === "show") {
      this.mask.clearMask();
      logger.log("[ban]:Timeout");
    }
  }, delay || 3000);
  return (decrease, callback) => {
    if (decrease === true) maxNum--;
    if (i >= maxNum) {
      if (this.mask.getMaskStatus() === "show") {
        this.mask.clearMask();
      }
      if (once === false) {
        once = true;
        clearTimeout(timeout);
        logger.log("[ban]:Nodes were processed");
      }
      if (typeof callback === "function") {
        callback(i);
      }
    }
    i++;
  };
};

Ban.prototype.notify = function(type) {
  var type = Symbol(type);
  var elements = {};
  elements[type] = {};
  return {
    push: (element, msg) => {
      if (!elements[type][element]) {
        elements[type][element] = [];
      }
      elements[type][element].push(msg);
    },
    pull: (element, maxLength) => {
      if (Array.isArray(elements[type][element])) {
        var messages = elements[type][element];
        var arr = [].concat(messages);
        return arr.length < maxLength
          ? arr
          : arr.splice(arr.length - maxLength - 1, maxLength);
      }
      return null;
    }
  };
};

Ban.prototype.removeNodes = function(elements) {
  if (!Array.isArray(elements)) {
    elements = [elements];
  }
  logger.log("[ban]:Start processing nodes");
  var clearMask = this._handleNodeCompleted(elements.length - 1);
  elements.forEach((item, index) => {
    var hideType = item.hideType || "hidden";
    this.timerExec({
      auto: item.once === true ? item.once : (item.once = false),
      delay: typeof item.delay === "number" ? item.delay : (item.delay = 1000),
      max: typeof item.max === "number" ? item.max : (item.max = 100),
      mount: timer => {
        var data = {
          item,
          index,
          elements,
          timer,
          ban: this
        };
        if (hideType === "removed") {
          this.DOMTools.removeNode(item.element);
        }
        if (hideType === "hidden") {
          this.DOMTools.hideNode(item.element);
        }
        if (typeof item.callback === "function") {
          item.callback(data);
        }
        if (item.once === true) {
          clearInterval(timer);
          clearMask(false);
        } else {
          clearMask(true);
        }
      },
      condition: timeoutNum => {
        var element = this.DOMTools.$(item.element);
        if (element == null) return false;
        if (typeof element === "object") {
          var status = element._status;
          if (status) {
            if (status === "hidden" || status === "removed") return false;
            if (status === "recycled") return true;
          }
        }
        return true;
      }
    });
  });
};

Ban.prototype.matchPath = function(path) {
  var selectId = null;
  var pathExp = null;
  this.pageId.every(item => {
    pathExp = item.pathExp;
    if (typeof pathExp === "string") {
      pathExp = new RegExp(pathExp);
    }
    if (!(pathExp instanceof RegExp)) return;
    if (pathExp.test(path)) {
      selectId = item.id;
      return false;
    }
    return true;
  });
  return selectId;
};

Ban.prototype.start = function() {
  var id = this.matchPath(this.location.href);
  var page = this.page[id];
  if (page) {
    logger.log(`[ban]:There has got page parse of the id(${id})`);
    this.mask.createMask();
    this.removeNodes(page.nodes);
  }
};

Ban.prototype.pageRegister = function(options) {
  if (!this.checkId(options.id)) return;
  this.pageId.push({
    id: options.id,
    pathExp: options.pathExp
  });
  this.page[options.id] = {
    nodes: options.nodes
  };
};

Ban.prototype.checkId = function(id) {
  if (this.pageId.includes(id)) return false;
  return true;
};

document.addEventListener("DOMContentLoaded", main);

function main() {
  if (location.hostname.indexOf("bilibili.com") === -1) return;
  var ban = new Ban();
  // 个人空间
  ban.pageRegister({
    pathExp: /space.bilibili.com/,
    id: "space",
    nodes: [
      {
        name: "标题栏",
        element: "#bili-header-m",
        once: true
      },
      {
        name: "关注人数",
        element: ".n-statistics",
        once: true
      },
      {
        name: "选择主题",
        element: ".be-dropdown.h-version",
        once: true
      },
      {
        name: "主页",
        element: "#page-index",
        once: false
      },
      {
        name: "主页按钮",
        element: ".n-btn.n-index.n-fans",
        once: true
      },
      {
        name: "动态按钮",
        element: ".n-btn.n-dynamic",
        once: true
      },
      {
        name: "投稿按钮",
        element: ".n-btn.n-video",
        once: true
      },
      {
        name: "频道按钮",
        element: ".n-btn.n-channel",
        once: true
      },
      {
        name: "订阅按钮",
        element: ".n-btn.n-bangumi",
        once: true
      },
      {
        name: "设置按钮",
        element: ".n-btn.n-setting",
        once: true
      }
    ]
  });

  // 普通视频
  ban.pageRegister({
    pathExp: /www.bilibili.com\/video\/av[0-9]?/,
    id: "videoAv",
    nodes: [
      {
        name: "侧边栏",
        element: ".r-con",
        once: true
      },
      {
        name: "投币点赞收藏栏",
        element: "#arc_toolbar_report",
        once: true
      },
      {
        name: "视频简介",
        element: "#v_desc",
        once: true
      },
      {
        name: "视频标签",
        element: "#v_tag",
        once: true
      },

      {
        name: "多少人正在看和实时弹幕",
        element: ".bilibili-player-video-info",
        once: true
      },
      {
        name: "评论",
        element: "#comment",
        once: true
      },
      {
        name: "导航栏",
        element: "#bili-header-m",
        once: true
      }
    ]
  });

  // bangumi
  ban.pageRegister({
    pathExp: /www.bilibili.com\/bangumi\/play\/(ss|ep)[0-9]?/,
    id: "bangumi",
    nodes: [
      {
        name: "相关推荐",
        element: "#recom_module",
        once: true
      },
      {
        name: "导航栏",
        element: "#bili-header-m",
        once: true
      },
      {
        name: "弹幕列表",
        element: "#danmukuBox",
        once: true
      }
    ]
  });

  // 主页
  ban.pageRegister({
    pathExp: /www.bilibili.com(\/#|\?)/,
    id: "index",
    nodes: [
      {
        name: "排行榜",
        element: ".rank-header",
        once: true
      },
      {
        name: "导航栏",
        element: "#internationalHeader",
        once: true
      },
      {
        name: "推广1",
        element: "#reportFirst1",
        once: true
      },
      {
        name: "推广2",
        element: "#reportFirst2",
        once: true
      },
      {
        name: "游戏",
        element: "#bili_game",
        once: true
      },
      {
        name: "鬼畜",
        element: "#bili_kichiku",
        once: true
      },
      {
        name: "生活",
        element: "#bili_life",
        once: true
      },
      {
        name: "电影",
        element: "#bili_movie",
        once: true
      },
      {
        name: "影视",
        element: "#bili_cinephile",
        once: true
      },
      {
        name: "数码",
        element: "#bili_digital",
        once: true
      },
      {
        name: "纪录片",
        element: "#bili_documentary",
        once: true
      },
      {
        name: "电视剧",
        element: "#bili_teleplay",
        once: true
      },
      {
        name: "广告",
        element: "#bili_ad",
        once: true
      },
      {
        name: "漫画",
        element: "#bili_manga",
        once: true
      },
      {
        name: "时尚",
        element: "#bili_fashion",
        once: true
      },
      {
        name: "音乐",
        element: "#bili_music",
        once: true
      },
      {
        name: "舞蹈",
        element: "#bili_dance",
        once: true
      },
      {
        name: "娱乐",
        element: "#bili_ent",
        once: true
      },
      {
        name: "专栏",
        element: "#bili_read",
        once: true
      },
      {
        name: "直播",
        element: "#bili_live",
        once: true
      },
      {
        name: "国创",
        element: "#bili_guochuang",
        once: true
      },
      {
        name: "特别推荐",
        element: "#bili_report_spe_rec",
        once: true
      },
      {
        name: "侧边栏",
        element: "#elevator",
        once: true
      },
      {
        name: "页脚",
        element: ".international-footer",
        once: true
      }
    ]
  });

  ban.start();
}
