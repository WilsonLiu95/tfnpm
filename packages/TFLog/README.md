# 打造高可靠的前端日志模块 TFLOG
------
## 背景
前端不同于后端服务的一点是运行在用户的设备中，环境不可控，用户操作难以追溯。
碰到用户来反馈问题，往往很难以复现用户的事故现场以及操作历史。

这个时候仅仅是看上报的异信息或者是后台cgi日志无法提供足够多的信息。

前端日志，则是此时最好的解决方案，分布式存储在客户的设备中，按需上报，让最了解业务场景的开发(前端er)输出最详细的日志。

------
## 特性
TFLog具有以下特性,并经过理财通线上微信与手Q客户端的每日千万级PV检验，可用于生产环境。
1. 零依赖
2. 多维度过滤（命名空间、日志等级和关键词）
3. 大容量 采用`indexedb`存储
4. 高覆盖率 99.7%
5. 高可靠 99.79%
6. 有损降级
------
## 使用
### 1.安装

```shell
npm install tflog
```
### 2.打日志

```javascript
var TFLog = require('tflog');
// 'mod/ajax'为namespace
var ajaxLog = new TFLog('mod/ajax');
// 三类日志级别
ajaxLog.log(url,{date:'2018-05-30'});
ajaxLog.error('abort ajax');
ajaxLog.warn('depreciate');
```
### 3. 读取日志

```javascript
// collect logs from 3 days before, and earlier than 1 days ago
TFLog.get('3', '1', function(logs) {});
```
### 4. 删除日志
```javascript
TFLog.keep(7); // 保留最近7天的日志，如果不传参数，则清空日志
TFLog.clean(); // 清空日志并删除数据库
```
------
## 技术选型
对于前端日志服务，我们认为有如下4个要素，必须满足

1. 高覆盖率：保证有用户出现问题，他大概率是有日志的
2. 高可靠：接口可靠，日志输出不掉包
3. 大容量：无顾虑打日志，保存更久的日志
4. 有损降级：业务的辅助类工具，不应该影响业务

出于以上考虑，以及参考一些开源的日志模块实现，我们锁定了 `indexedDB` 存储。

注：以下数据皆来自于用户访问微信客户端与手Q客户端，及在PC打开微信的webview。
### 覆盖率
按照2018-04-27(周五)的用户访问数据，支持率采用UV计算。
计算可达到支持率达到99.7%。支持率逼近3个9,基本实现用户全覆盖。

### 可靠性
通过统计`TFLog`中`try catch`与`indexeddb`三个异常异步回调接口`onerror onabort onblocked`所上报的异常日志数量来衡量本模块的可靠性

以下数据采集自2018-05-30(周三)

可靠度(注释： 分母为支持indexeddb的用户，因此乘上0.997)

- 按影响用户数统计 0.9979755857833721
- 按调用次数(单个PV调用TFLog近40次)： 0.999964323326821

通过以上统计可以发现，`TFLog`具有高可靠的特性，依赖的`indexedDB`存在一定的不可靠，但在如此高的可靠度上，亦可满足前端日志的需要。
### 大容量
前端可利用的存储api：`cookie,localstorage,sessionStorage,websql,indexedDB`。

cookie，容量较小仅有4KB左右，并且会被加入到`http header`中，影响http请求的大小。
sessionStorage则不具备持久化保存的能力，会话结束后被清除。
localstorage有5MB的大小，且可以持久化存储。但是一来广泛被业务使用，共同使用易抢占容量，影响业务。二来，set与get会反复进行JSON与字符串的转化，性能不高。
websql则是一个不错的前端存储，但websql已经被W3C标准抛弃了，明确表示不会再更新和支持，因此非不得已的情况，不要再使用这种存储。

`indexedDB`则是最完美的方案
- 大容量，存储容量上限根据草案规定是磁盘所剩空间的50%，而参考各类资料得到的数据是至少在50MB以上。持久化存储
- 不需要像`localstorage`反复在JSON与字符串直接进行转化
- 接口异步，不阻塞业务脚本

因此，在如此大容量选择这一条上，`indexedDB`似乎也是唯一选择。
### 有损降级
日志模块作为前端的一个辅助类工具，不应该影响到主流程。

因此，在设备不支持时，应该降级为只利用`console`输出而不持久化保存。
而在因为`indexedDB`不可靠而导致丢出异常时，在以本次PV过程中有损降级，拒绝掉之后调用`indexedDB`的请求，以避免频繁报错。

------
## 打磨优化
### 并行改串行
`indexeddb`为异步的协议，一开始的过程中，我们采用并行的方式记录日志。
但是当一个事务过程中出现问题时，经常是并行事务全部报异常。
因此，为了降低异常率，同时也是为了数据入库的顺序，我们将此处改为了串行。

前端日志的场景下，不会存在短时间内大量调用的情况，因此串行带来的性能损耗并不会影响到日志模块。
## 满容处理
`indexeddb`是前端数据库，容量上相比于其他传统缓存`localstorage,sessinStorage,cookie`更具有优势，但是再大的容量也得考虑满的情况。
因此我们有如下2种操作避免满容，以及对满容进行处理

### 保存近7天日志
考虑到日志的时效性，太早的日志往往对我们没有什么价值。我们会清理7天之前的日志，来避免日志的数量不至于无限增长。
### 满容删库
在保存近7天日志的策略下，仍然有部分用户会报出溢出无法写入的异常。
因此，当用户满容时，我们直接进行删库的操作。

而满容有2种情况，一类是打开`indexedDb`服务，即报满容的错误，第二类是事务过程中，碰到满容。以下为监测满容并进行处理的代码。

```javascript
    // 监听onerror
    var request = window.indexedDB.open(varStorage.database,1);
    request.onerror = function (event) {
        if (event.target.error && event.target.error.name == 'QuotaExceededError') {
            // 每天100+条
            // Encountered full disk while opening backing store for indexedDB.open.
            clean();
        }
    };
    // 监听事务的 onabort事件，此处
    var transaction = varStorage.db.transaction(['logs'], IDBTransaction.READ_WRITE || 'readwrite');
    transaction.onabort = function (event) {
        // 当事务是因为abort被取消时，transaction.onerror也会收到冒泡，此处屏蔽单独在onabort中进行处理
        event.stopPropagation();
        if (event.target.error && event.target.error.name == 'QuotaExceededError') {
            // 存储满了，则全部清除 每日3K条
            // Encountered disk full while committing transaction.
            // An attempt was made to add something to storage that exceeded the quota
            clean();
        }
    }
    // 满容的情况下进行删库处理，删库代码如下
    function clean(){
        varStorage.db && varStorage.db.close(); // 可能在打开的时候就失败 此时db尚未赋值
        var request = window.indexedDB.deleteDatabase(varStorage.database);
        request.onerror = function (event) {
            // 1. Internal error opening backing store for indexedDB.deleteDatabase.
            // 2. Internal error deleting database.
            return throwError('clean_error', event.target.error); // 每天200+
        };
        request.onsuccess = function (event) {};
    }
```

通过监控异常，我们得到`clear_error`的情况每天仍然有200+异常上报。为此，我们再对这里的成功与失败的比例进行了统计。一下为统计结果。

|  回调事件 |释义| pv  | uv |
| ------------ | ------------|------------ |------------ |
|transaction.onabort |事务中因此满容被取消的|7160 | 1142 |
|indexedDB.open.onerror|打开数据库时就因为满容被取消的|266|41 |
|deleteDatabase.success |删除成功的|6,931 | 1,076 |
|deleteDatabase.error |删除失败的|340 | 66 |
### 重写console
在既有的业务中，已经存在部分关键节点利用`console`的方式进行输出，我们通过重写`console`的方式来达到丰富日志信息的目的。

在重写`console`的过中也碰到了如下异常，需要避免。
`console.log.apply(this,[11])`在部分机型下会报出异常`TypeError: Illegal invocation`，必须写为`console.log.apply(console,[11])`。

重写console代码与TFLog可分别加载，理财通的实践中，将重写`console`的部分写在`head`中，以保证所以脚本的`console`输出都被记录下，而`TFLog`则在基础模块中进行加载。以此尽可能减少对性能的影响。
### 加强代码健壮性

- 各个接口包裹住 `try catch`，避免因为未知的异常抛出而影响主流程逻辑
- 保持不信任的原则，取深层次属性时，每一步验证当前对象不为空。例如`cursor.value.time`按照我们的代码，则不会为空，可是实际上每天出现很多异常由此未加判断导致

### indexedDB在iframe使用报错
理财通的跨域方案采用iframe加载中间页，中间页通过`postMessage`传输所需要的信息，而`indexeddb`在iframe中使用会异常，此处之前忘记处理导致丢出异常，整个脚本停止运行，造成无法跨域传输信息。

查阅资料后，在是否支持`indexeddb`中加入如下判断，如果在`iframe`中则表示不支持`indexeddb`
```javascript
    if (self != top){ // indexedb 不支持 iframe
        return false;
    }
```
### 避免close后再读取事件属性
IOS: `InvalidStateError: DOM IDBDatabase Exception 11: An operation was called on an object on which it is not allowed or at a time when it is not allowed.`
Android: `Uncaught InvalidStateError: Failed to read the 'error' property from 'IDBRequest': The request has not finished.`

indexeddb操作结束后，不可在读取error属性
```javascript
    request.onblocked = function (event) {
        // "Error: Failed to read the 'error' property from 'IDBRequest': The request has not finished.
        // 这里无法读取 event.target.error属性，因为请求已经结束。因此会报错
        return throwError('indexeddb_init_blocked');
    }
```
------
## 异常分析

### window pc 微信webview
user-agent为`Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36 MicroMessenger/6.5.2.501 NetType/WIFI WindowsWechat QBCore/3.43.884.400 QQBrowser/9.0.2524.400`,即在window系统的pc 微信webview上打开我们理财通，报错集中如下表。

|  descriptor | total(异常总数)  | ip_total(影响ip数量) |
| ------------ | ------------ |------------ |
| protocol indexeddb is prevented.:Version change transaction was aborted in upgradeneeded event handler. |    19257 |                        4863 |
| indexeddb_record_transaction_onabort:QuotaExceededError                                                 |     2479 |                        1253 |
| indexeddb_init_success_onclose                                                                          |        1 |                           1 |
### ios9.3以下系统
IOS系统版本9.3及以下报错集中，且报错信息为`UnknownError`，无法获取到具体的信息。目前IOS系统版本已经更新到11.3以上，相信这部分问题会随着系统版本的不断升级换代，会逐步减少以至于消失。

|  descriptor | total(异常总数)  | ip_total(影响ip数量) |
| ------------ | ------------ |------------ |
| indexeddb_record_transaction:UnknownError | 18031 |     2306 |
| indexeddb_record_transaction_onabort:UnknownError |   252 |       19 |
| protocol indexeddb is prevented.:UnknownError|    39 |       13 |
| unable to locate logs earlier than 7d.:UnknownError|    14 |       14 |
### 异常分析小结
异常操作系统分布统计如下

| count(1) | os_type |
| ------------ | ------------ |
|    19704 | android |
|    26799 | ios     |
|    21737 | window pc|

背景：业务主要集中于手Q与微信客户端内。
- PC打开微信webview的场景很少，此部分异常对于我们来说可以忽略。
- IOS系统报的异常集中于低版本系统，随着系统版本不断的更新换代，这部分异常也会逐渐消失。
- Android系统的异常分布则更为分散，暂未观察到无机型or系统版本的集中表现
------
## 参考资料
1. [indexeddb.js](http://olingo.apache.org/doc/javascript/apidoc/indexeddb.js.html#line282)
2. [w3c Indexed Database API 2.0](https://www.w3.org/TR/IndexedDB/#introduction)
3. [logline](https://github.com/latel/logline)
