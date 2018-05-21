/**
 * * author: wilsonsliu@tencent.com
 * 相关链接参考： https://juejin.im/entry/58c4b768ac502e0062f608ab
 *  参考kevinwang的logline模块编写而成，只采用了logline
    坑1：indexedDB与websql协议监测是否支持中，尝试open。在iframe引用下会throw异常
                if (self != top){ // indexedb 不支持 iframe
                    return false;
                }
    坑2: Logline各个接口包裹住 try catch，防止影响主流程逻辑
    坑3: onsuccess里的各处对value进行判断，很多时候value.time报错 value为null
    坑4: indexedb协议内 任意一个onerror事件回调内将varStorage.status设置为failed。并将在每个接口函数处检查状态，failed直接return。即若用户某次logline报错，则不再使用。

    注意！！！ 重写了console。将console的信息也输出到了logline，因此，在内部不建议再直接使用被重写过的console.log，而是使用console.__log
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global.iLogline = factory());
})(this, (function () {
    var STATUS_MAP = {
        'INITING': 1,
        'INITED': 2,
        'FAILED': 3,
    };
    var varStorage = {
        isSupportIndexedDB: getSupport(),
        status: STATUS_MAP.INITING,
        database: 'logline',
        pool: [],
        recordPool: [],
        recordLock: false,
    };

    function filterFunction(obj) {
        try {
            var newObj = {}, i;

            // 函数则转为字符串
            if (typeof obj == 'function') {
                return obj.toString();
            }

            if (typeof obj !== 'object') {
                return obj;
            }

            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (typeof obj[i] !== 'function') {
                        newObj[i] = filterFunction(obj[i]);
                    }
                }
            }
            return newObj;
        } catch (e) {
            return { error: 'filterFunction error' };
            throwError('filterFunction error', e)
        }
    }

    function transTimeFormat(time, relative) {
        // if falsy value or timestamp already, pass it through directly,
        time = String(time);
        if (!time || /^\d{13}$/.test(time)) {
            return +time;
        }
        // incase relative time isn't unix timestamp format,
        // neither a falsy value which will turned out to be Date.now()
        if (relative && !/^\d{13}$/.test(relative)) {
            throw new TypeError('relative time should be standard unix timestamp');
        }

        return (relative || Date.now()) - time.replace(/d$/, '') * 24 * 3600 * 1000;
    }

    function consumePool(pool) {
        try {
            pool = pool || [];
            while (handler = pool.shift()) {
                handler();
            }
        } catch (e) { }

    }
    function getSupport() {
        try {
            // indexedb 不支持 iframe
            if (self != top) {
                return false;
            }
            window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
            window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
            window.IDBTransaction.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;;
            var support = !!(window.indexedDB && window.IDBTransaction && window.IDBKeyRange);
            if (support) {
                window.IDBTransaction.READ_WRITE = 'readwrite';
                window.IDBTransaction.READ_ONLY = 'readonly';
            }
            return support;
        } catch (e) {
            return false;
        }
    };

    function throwError(errorMsg, error) {
        // 异常，则置为FAILED 拒绝之后的操作
        varStorage.status = STATUS_MAP.FAILED;
        var errorStr = '';
        try {
            if (error) {
                errorMsg = errorMsg + ':' + (error.message || error.stack || error.name);
                errorStr = error.toString();
            }
        } catch (e) { errorStr = 'try-catch'; }
        var data = {
            logtype: 'logline',
            logurl: location.href,
            errorStr: errorStr
        };
        console.__error && console.__error('#logline throwError#', arguments);
        window.__sendError && window.__sendError('mod/logline', errorMsg, data);
    }
    function initIndexedDB() {
        try {
            if (!varStorage.isSupportIndexedDB || (varStorage.status !== STATUS_MAP.INITING)) return false;

            var request = window.indexedDB.open(varStorage.database, 1);
            request.onerror = function (event) {
                throwError('protocol indexeddb is prevented.', event.target.error);
                if (event.target.error && event.target.error.name == 'QuotaExceededError') {
                    // 存储满了，则全部清除 每日100+用户  Encountered full disk while opening backing store for indexedDB.open.
                    clean();
                    $.Stat.clickStat('WX.FUND.LOGLINE.INIT.QuotaExceededError');
                }
            };
            request.onsuccess = function (event) {
                varStorage.db = event.target.result;
                varStorage.status = STATUS_MAP.INITED;
                varStorage.db.onclose = function (_event) {

                    return throwError('indexeddb_init_success_onclose', _event.target.error);
                };
                varStorage.db.onabort = function (_event) {

                    return throwError('indexeddb_init_success_onabort', _event.target.error);
                };
                // globally handle db request errors
                varStorage.db.onerror = function (_event) {

                    return throwError('indexeddb_init_success_onerror', _event.target.error);
                };

                consumePool(varStorage.pool);
            };
            // This event is triggered when the upgradeneeded should be triggered because of a version change but the database is still in use (that is, not closed) somewhere, even after the versionchange event was sent.
            request.onblocked = function (event) {
                // "Error: Failed to read the 'error' property from 'IDBRequest': The request has not finished.
                // 这里无法读取 event.target.error属性，因为请求已经结束。因此会报错
                return throwError('indexeddb_init_blocked');
            }

            request.onupgradeneeded = function (event) {
                // init dabasebase
                try {
                    varStorage.db = event.target.result;
                    if (!varStorage.db.objectStoreNames.contains('logs')) {
                        store = varStorage.db.createObjectStore('logs', { autoIncrement: true });
                        store.createIndex('namespace', 'namespace', { unique: false });
                        store.createIndex('level', 'level', { unique: false });
                        store.createIndex('descriptor', 'descriptor', { unique: false });
                        store.createIndex('data', 'data', { unique: false });
                    }
                } catch (e) {
                    // throw Error: 
                    // Uncaught TransactionInactiveError: Failed to execute 'createObjectStore' on 'IDBDatabase': The transaction is not active. 
                    // Uncaught TransactionInactiveError: Failed to execute 'createObjectStore' on 'IDBDatabase': The transaction has finished.
                    // Uncaught InvalidStateError: Failed to execute 'createObjectStore' on 'IDBDatabase': The database is not running a version change transaction.

                    throwError('indexeddb_init_onupgradeneeded', e);
                }
            };
        } catch (e) {

            throwError('indexeddb_init', e);
        }

    }

    function Logline(namespace) {
        this.namespace = namespace;
    }

    Logline.prototype = {
        varStorage: varStorage,
        info: function (descriptor, data) {
            record(this.namespace, 'info', descriptor, data);
        },
        warn: function (descriptor, data) {
            record(this.namespace, 'warn', descriptor, data);
        },
        error: function (descriptor, data) {
            record(this.namespace, 'error', descriptor, data);
        },

    }

    function record(namespace, level, descriptor, data) {
        try {

            if (varStorage.status == STATUS_MAP.FAILED) {
                varStorage.pool = [];
                varStorage.recordPool = [];
                return false;
            }
            if (varStorage.status == STATUS_MAP.INITING) {
                return varStorage.pool.push(function () {
                    return record(namespace, level, descriptor, data);
                });
            }
            // 如果上一条record函数尚未onsuccess则压入record待执行队列。将record串行执行
            if (varStorage.recordLock) {
                return varStorage.recordPool.push(function () {
                    return record(namespace, level, descriptor, data);
                });
            }
            varStorage.recordLock = true;

            var transaction = getTransaction();
            var store = transaction.objectStore('logs');
            // should not contains any function in data
            // otherwise 'DOMException: Failed to execute 'add' on 'IDBObjectStore': An object could not be cloned.' will be thrown

            var request = store.add({
                time: Date.now(),
                level: level,
                namespace: namespace,
                descriptor: filterFunction(descriptor),
                data: filterFunction(data)
            });
            // 这里的异常和transaction的异常会同时上报，不存在冒泡关系
            // request.onerror = function (event) {
            //     event.stopPropagation();
            //     throwError('indexeddb_record_request', event.target.error);
            // };

            request.onsuccess = function () {
                // 标记为false
                varStorage.recordLock = false;
                // 将record函数压入栈串行压入，即onsucces好后再执行下一条。如果失败则之后的直接拒绝
                try {
                    varStorage.recordPool = varStorage.recordPool || [];
                    handler = varStorage.recordPool.shift();
                    handler && handler();
                } catch (e) { }
            }
        } catch (e) {

            throwError('indexeddb_record', e);
        }
    }
    function getTransaction() {
        try {
            var transaction = varStorage.db.transaction(['logs'], IDBTransaction.READ_WRITE || 'readwrite');
            // 当触发异常时：可以调用event.preventDefault()避免事务被取消，因此此处会上报2次
            // Could call event.preventDefault() to prevent the transaction from aborting.
            // Otherwise the transaction will automatically abort due the failed request.

            // 通过标识是否是通过error报出的异常导致的abort，来决定是否上报abort异常
            var isErrorToAbort = false;

            transaction.onerror = function (event) {
                event.stopPropagation();
                isErrorToAbort = ture;
                return throwError('indexeddb_record_transaction', event.target.error);
            };
            transaction.onabort = function (event) {
                // TimeoutError:Transaction timed out due to inactivity. 
                // Connection is closing.
                // An unknown error occurred within Indexed Database.
                // An internal error was encountered in the Indexed Database server
                // Internal error committing transaction.
                // Error finding current key generator value in database
                // Error checking for existence of IDBKey in object store
                // Unable to store record in object store

                event.stopPropagation();

                !isErrorToAbort && throwError('indexeddb_record_transaction_onabort', event.target.error);
                if (event.target.error && event.target.error.name == 'QuotaExceededError') {
                    // 存储满了，则全部清除 每日3K条
                    // Encountered disk full while committing transaction.
                    // An attempt was made to add something to storage that exceeded the quota
                    clean();
                    // clean 内有将状态置为FAILED的 clean 和 stat 位置勿换 避免stat内再次调用console等导致循环调用logline
                    $.Stat.clickStat('WX.FUND.LOGLINE.QuotaExceededError.TRAN');
                }

            }
            // 事务成功回调
            // transaction.oncomplete = function(event){

            // }
            return transaction;
        } catch (e) {
            throwError('getTransaction', e);
        }

    }
    function clean() {
        try {
            // database can be removed only after all connections are closed
            varStorage.status = STATUS_MAP.FAILED;
            // 可能在打开的时候就失败 此时db尚未赋值
            varStorage.db && varStorage.db.close();
            var request = window.indexedDB.deleteDatabase(varStorage.database);
            request.onerror = function (event) {
                // 1. Internal error opening backing store for indexedDB.deleteDatabase.
                // 2. Internal error deleting database.
                $.Stat.clickStat('WX.FUND.LOGLINE.CLEAN.ERROR');
                return throwError('clean_error', event.target.error);
            };
            request.onsuccess = function (event) {
                $.Stat.clickStat('WX.FUND.LOGLINE.CLEAN.SUCCESS');
            };
        } catch (e) {
            throwError('indexeddb_clean', e);
        }

    }
    function get(from, to, readyFn) {
        try {
            if (varStorage.status == STATUS_MAP.FAILED) {
                varStorage.pool = [];
                return false;
            }

            if (arguments.length == 1) {
                readyFn = from;
                from = undefined;
            } else if (arguments.length == 2) {
                readyFn = to;
                to = undefined;
            }
            if (varStorage.status == STATUS_MAP.INITING) {
                return varStorage.pool.push(function () {
                    return get(from, to, readyFn);
                });
            }
            from = transTimeFormat(from);
            to = transTimeFormat(to);

            var transaction = getTransaction();
            var store = transaction.objectStore('logs');

            // IDBObjectStore.getAll is a non-standard API
            if (store.getAll) {
                var result,
                    logs = [];
                store.getAll().onsuccess = function (event) {
                    result = event.target.result;
                    if (result) {
                        for (var i = 0; i < result.length; i++) {
                            if (!result[i] || (from && result[i].time < from) || (to && result[i].time > to)) {
                                continue;
                            }
                            logs.push(result[i]);
                        }
                    }
                    readyFn(logs);
                };
            } else {
                var request = store.openCursor(),
                    _logs = [];
                request.onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        if (!cursor.value || (from && cursor.value.time < from) || (to && cursor.value.time > to)) {
                            return cursor.continue();
                        }

                        _logs.push({
                            time: cursor.value.time,
                            level: cursor.value.level,
                            namespace: cursor.value.namespace,
                            descriptor: cursor.value.descriptor,
                            data: cursor.value.data
                        });
                        cursor.continue();
                    } else {
                        readyFn(_logs);
                    }
                };
            }
        } catch (e) {
            throwError('indexeddb_get', e);
        }
    }

    function keep(daysToMaintain) {
        try {
            if (varStorage.status == STATUS_MAP.FAILED) {
                varStorage.pool = [];
                return false;
            }

            if (varStorage.status == STATUS_MAP.INITING) {
                return varStorage.pool.push(function () {
                    return keep(daysToMaintain);
                });
            }
            var transaction = getTransaction();
            var store = transaction.objectStore('logs');

            if (!daysToMaintain) {
                var request = store.clear().onerror = function (event) {
                    return throwError('indexedb_keep_clear', event.target.error);
                };
            } else {
                var range = Date.now() - daysToMaintain * 24 * 3600 * 1000;
                var _request = store.openCursor();
                _request.onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor && cursor.value && cursor.value.time < range) {
                        store.delete(cursor.primaryKey);
                        cursor.continue();
                    }
                };
                _request.onerror = function (event) {
                    return throwError('unable to locate logs earlier than ' + daysToMaintain + 'd.', event.target.error);
                };
            }
        } catch (e) {
            throwError('indexeddb_keep', e);
        }
    }
    // 初始化
    initIndexedDB();
    Logline.keep = keep;
    Logline.clean = clean;
    Logline.get = get;
    Logline.record = record;

    return Logline;
}))