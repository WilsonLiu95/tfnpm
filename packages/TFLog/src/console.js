/**
 *  author: wilsonsliu@tencent.com
 *  descriptor: 重写console模块
 * **/
console.__log = console.log;
console.__error = console.error;
console.__warn = console.warn;

// 日志重写
window.__TFLog = (function () {
    var waitLogList = [];
    var consoleHandle;
    return function (args, level) {
        var item, __level, __args;
        try {
            if (window.TFLog) {
                // 初始化TFLog
                !consoleHandle && (consoleHandle = new window.TFLog('console'));
                item = waitLogList.shift();
                while (item) {
                    __level = item[1] || 'log';
                    __args = item[0] || [];
                    consoleHandle[__level](__args[0], __args.slice(1));
                    item = waitLogList.shift();
                }
            } else { // 没有初始化好则先压入数组
                waitLogList.push([args, level]);
            }
        } catch (e) {
            console.__error && console.__error(e);
        }
    };
})();
console.log = function () {
    console.__log.apply(console, arguments);
    window.__TFLog && window.__TFLog(arguments, 'log');
};
console.error = function () {
    console.__error.apply(console, arguments);
    window.__TFLog && window.__TFLog(arguments, 'error');
};
console.warn = function () {
    console.__warn.apply(console, arguments);
    window.__TFLog && window.__TFLog(arguments, 'warn');
};
