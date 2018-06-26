/**
 * 事件系统抛出事件:init,throwError,beforeReport,afterReport,markPageLife,extendPageLife
 * **/
(function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else {
        if (typeof define === 'function' && define.amd) {
            define(factory);
        } else {
            global.TFSpeed = factory();
        }
    }
})(this, (function () {
    var utils = {
        extend: function (target, obj) {
            var key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    target[key] = obj[key];
                }
            }
        }
    };

    function Speed(config) {
        this._events = {};
        if (!config || !config.pageStartTime) {
            return this._throwError('new Speed error need pageStartTime');
        }

        this.performance = window.performance || window.mozPerformance || window.msPerformance || window.webkitPerformance;
        this.startTimeMap = {};

        this._getSupportType();

        this.pageLife = {
            logType: 1,
            cgi: 0, // cgi count before report
            resource: 0, // resource include css img script count
            codeExec: 0 // startMark endMark times without cgi
        };
        this.otherTypeList = []; // cgi and codeExec
        this.resourceList = [];

        this.clearResourceIndex = 0; // 当不支持 clearResourceTimings 时，自行标记删除
        // what resource you want to watch
        this.resourceRegMap = config.resourceRegMap || {
            img: /\.(png|jpg|jpeg|gif|svg)$/,
            css: /\.css$/,
            script: /\.js$/
        };

        this.isSendPageLife = false;
        this.isSendOtherType = false;

        this.utils.extend(this, config);
        // 未传入浏览器开始时间
        if (!this.naviStartTime) {
            this.naviStartTime = this.pageStartTime; // 默认值为meta头部时间
            this.perfType > 1 && (this.naviStartTime = this.performance.timing.navigationStart);
        }
        this.init && this.init();
    }

    // please not use function just like start with '__' like _init
    Speed.prototype = {
        version: '1.0.0',
        _throwError: function (errorMsg, e) {
            this.emit('throwError', errorMsg, e);
            console.__warn && console.__warn('#Speed#', errorMsg, e);
        },
        utils: utils,
        on: function (type, fn) {
            if (!this._events[type]) {
                this._events[type] = [];
            }

            this._events[type].push(fn);
        },

        off: function (type, fn) {
            var index;
            if (!this._events[type]) {
                return;
            }
            if (!fn) {
                delete this._events[type];
            } else {
                index = this._events[type].indexOf(fn);

                if (index > -1) {
                    this._events[type].splice(index, 1);
                }
            }
        },

        emit: function (type) {
            if (!this._events[type]) {
                return;
            }

            var i = 0,
                l = this._events[type].length;

            if (!l) {
                return;
            }

            for (; i < l; i++) {
                this._events[type][i].apply(this, [].slice.call(arguments, 1));
            }
        },
        _getSupportType: function () {
            /**
             * 1 为不支持
             * 2 支持performance与performance.timing
             * 3 额外支持getEntries
             * 4 支持clearResourceTimings
             **/
            this.perfType = 1;
            if (!!this.performance && !!this.performance.timing) {
                this.perfType = 2;
                !this.performance.getEntries && (this.perfType = 3);
                !this.performance.clearResourceTimings && (this.perfType = 4);
            }
        },
        startMark: function (keyName) {
            try {
                if (!keyName) {
                    return this._throwError('startMark need keyName');
                }
                if (this.startTimeMap[keyName]) {
                    this._throwError('startMark has the same keyName ' + keyName);
                }
                // 优先以传入的keyName为键
                this.startTimeMap[keyName] = Date.now();
            } catch (e) {
                this._throwError('startMark throw error', e);
            }

        },
        endMark: function (keyName, data) {
            if (!keyName) {
                return this._throwError('endMark need keyName');
            }
            // 结束时间
            var endTime = Date.now();
            var markItem = {
                keyName: keyName
            };
            var entriesList, timing, i;
            var url = data.url;
            delete data.url;
            try {
                this.utils.extend(markItem, data);
                if (data.duration) { // 用户有直接传入则直接取直接传入的时间
                    if (data.startTime === undefined) { // 开始时间也可以主动传入
                        // 计算该事件相对于__naviStartTime开始渲染的时间差
                        markItem.startTime = endTime - this.naviStartTime - data.duration;
                    }
                } else {
                    // 开始时间不存在，则直接return。针对重复请求的情况
                    if (!this.startTimeMap[keyName]) {
                        return this._throwError('endMark need startTime with ' + keyName);
                    }
                    // 计算该事件相对于__naviStartTime开始渲染的时间差
                    markItem.duration = endTime - this.startTimeMap[keyName];
                    markItem.startTime = this.startTimeMap[keyName] - this.naviStartTime;
                    delete this.startTimeMap[keyName]; // 使用后即删除
                }
                // 如果是监测http请求，可以根据取performance.getEntries的时间进行补全数据
                if (url) {
                    markItem.logType = 2; // ajax请求的时间
                    this.pageLife.cgi++;
                } else {
                    markItem.logType = 3; // 3为正常的监测一段代码运行的时间
                    this.pageLife.codeExec++;
                }
                // ajax请求的 如果支持getEntries，则采用getEntries的时间
                if (url && this.perfType >= 3) {
                    entriesList = this.performance.getEntries();
                    for (i = 0; i < entriesList.length; i++) {
                        timing = entriesList[i];
                        // 标记删除
                        if (!timing || (timing && timing.hasDelete)) {
                            continue;
                        }
                        // timing.name为全链接，url大部分时候为路径加部分参数
                        if (timing && timing.name && timing.name.indexOf(url) !== -1) {
                            markItem.initiatorType = timing.initiatorType;
                            markItem.transferSize = timing.transferSize;
                            markItem.encodedBodySize = timing.encodedBodySize;
                            markItem.decodedBodySize = timing.decodedBodySize;

                            markItem.startTime = Math.floor(timing.startTime || timing.fetchStart);
                            markItem.responseEnd = Math.floor(timing.responseEnd);
                            markItem.duration = Math.floor(timing.duration);
                        }
                    }
                }
                // 根据计算出的采样率做一次拦截
                this.otherTypeList.push(markItem);
            } catch (e) {
                this._throwError('endMark throw error', e);
            }
        },
        // mark resource type perfomance
        markResource: function () {
            var entriesList, i, key, timing, pathname, fileType, markItem, linkUrl;
            try {
                if (this.perfType < 3) {
                    return this._throwError('markResourcePerf need support performance.getEntries');
                }

                entriesList = this.performance.getEntries();
                this.resourceList = []; // set it null array when mark resource
                for (i = 0; i < entriesList.length; i++) {
                    timing = entriesList[i];
                    if (!timing || (timing && timing.hasDelete)) {
                        continue; // 对应为空
                    }
                    pathname = timing.name && timing.name.split('?') && timing.name.split('?')[0];
                    fileType = null;
                    // 遍历资源正则表
                    for (key in this.resourceRegMap) {
                        if (this.resourceRegMap[key].test(pathname)) {
                            fileType = key;
                        }
                    }
                    if (!fileType) {
                        continue; // 没有匹配的资源类型
                    }

                    linkUrl = timing.name.split('?')[0]; // 去除search参数
                    markItem = {
                        logType: 4, // 4为资源的加载
                        keyName: linkUrl,
                        initiatorType: timing.initiatorType, // 初始化的地方
                        type: fileType, // 文件类型
                        transferSize: timing.transferSize, // content-length
                        encodedBodySize: timing.encodedBodySize, // 压缩后的体积,例如gzip压缩
                        decodedBodySize: timing.decodedBodySize // 解压后的体积
                    };
                    markItem.startTime = Math.floor(timing.startTime || timing.fetchStart);
                    markItem.responseEnd = Math.floor(timing.responseEnd);
                    markItem.duration = Math.floor(timing.duration);

                    this.pageLife.resource++;
                    this.resourceList.push(markItem);
                }
            } catch (e) {
                return this._throwError('markResource throw error', e);
            }
        },
        clearResource: function () {
            var i, perfList;
            // 如果不支持 clearResourceTimings 接口 那么则直接标记该对象
            try {
                if (this.perfType === 3) {
                    perfList = this.performance.getEntries();
                    for (i = 0; i < perfList.length; i++) {
                        perfList[i].hasDelete = true;
                    }
                } else if (this.perfType === 4) {
                    this.performance.clearResourceTimings();
                }
            } catch (e) {}

        },
        markPageLife: function (title) {
            try {
                if (title) {
                    this.title = this.pageLife.title = title;
                }
                this.pageLife.render = Date.now() - this.pageStartTime;
                this.pageLife.startTime = this.pageStartTime - this.naviStartTime;
                // 推荐监听 markPageLife 来决定是否调用 getPageLifeTime
                // this.getPageLifeTime();
                this.emit('markPageLife', this.pageLife);
            } catch (e) {
                this._throwError('markPageLife error', e);
            }
        },
        getPageLifeTime: function () {
            // not support performance
            if (this.perfType === 1) {
                return false;
            }
            var timing, i, key, duration;
            var whiteKey = ['domainLookupStart', 'domainLookupEnd', 'connectStart', 'connectEnd', 'requestStart', 'responseStart', 'responseEnd', 'domInteractive', 'domComplete', 'domContentLoadedEventEnd', 'loadEventEnd', 'duration'];
            if (this.perfType >= 3) {
                timing = performance.getEntries()[0]; // 直接将数据上报
                this.pageLife.type = timing.type;
                this.pageLife.transferSize = timing.transferSize; // content-length
                this.pageLife.encodedBodySize = timing.encodedBodySize; // 压缩后的体积,例如gzip压缩
                this.pageLife.decodedBodySize = timing.decodedBodySize; // 解压后的体积
            } else if (this.perfType === 2) {
                timing = performance.timing;
            }

            for (i = 0; i < whiteKey.length; i++) {
                key = whiteKey[i];
                duration = timing[key];
                if (this.perfType === 2) {
                    duration = timing[key] - this.naviStartTime;
                }
                this.pageLife[key] = Math.floor(duration);
            }
        },
        // 添加属性到页面生命周期中去
        extendPageLife: function (attr) {
            try {
                if (!attr) {
                    return this._throwError('extendPageLife attr is null');
                }
                this.emit('extendPageLife', attr);
                this.utils.extend(this.pageLife, attr);
            } catch (e) {
                this._throwError('report throw error', e);
            }
        },

        // 上报页面测速数据
        report: function () {
            var passLogList = [];
            try {
                this.emit('beforeReport');

                this.isSendPageLife && passLogList.push(this.pageLife);
                this.isSendOtherType && (passLogList = passLogList.concat(this.otherTypeList, this.resourceList));
                this.emit('afterSample', passLogList);
                return passLogList;
            } catch (e) {
                this._throwError('report throw error', e);
            }
        }
    };
    return Speed;
}));
