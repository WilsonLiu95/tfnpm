/**
 *  author: wilsonsliu
 *  descriptor: 重写console模块
 * **/
console.__log = console.log;
console.__error = console.error;
console.__warn = console.warn;

// 日志重写
window.__TFLog = (function (){
    var waitLogList = [];
    var consoleHandle;
    return function(args,level){
        try{
            if(window.TFLog){
                // 初始化TFLog
                !consoleHandle && (consoleHandle = new TFLog('console'));
                
                while(item = waitLogList.shift()){
                    var __level = item[1] || 'log';
                    var __args = item[0] || [];
                    consoleHandle[__level](__args[0],__args.slice(1));
                }
            }else{ // 没有初始化好则先压入数组
                waitLogList.push([args,level]);
            }
        }catch(e){
            console.__error && console.__error(e);
        }
    }
})();
console.log = function () {
    console.__log.apply(console,args);
    window.__TFLog && window.__TFLog(args,level);
};
console.error = function () {
    console.__error.apply(console,args);
    window.__TFLog && window.__TFLog(args,level);
};
console.warn = function () {
    console.__warn.apply(console,args);
    window.__TFLog && window.__TFLog(args,level);
};