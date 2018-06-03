## 高频异常列表
通过mysql统计数据当天异常的数据得出下表。

`SELECT  descriptor AS "descriptor", count(1) AS "total",count(DISTINCT(request_ip)) AS "ip_total" FROM t_logline18_05_30 WHERE (logtype = 'logline')  GROUP BY descriptor ORDER BY count(1) DESC;`

`logline`内部报错接口采用`throwError('protocol indexeddb is prevented.', event.target.error);`,因此`descriptor`为两个参数拼接而成，而部分`onerror`情况下，采用`e.message`采集异常信息为空，因此为`undefined`。
以上异常可参考`冒号`前的信息去代码中查阅是哪里报错。

异常难以复现，因此不好解决。欢迎有相关经验的同学提供帮助。

|  descriptor | total(异常总数)  | ip_total(影响ip数量) |
| ------------ | ------------ |------------ |
| protocol indexeddb is prevented.:Version change transaction was aborted in upgradeneeded event handler.                                                        | 19369 |     4953 |
| indexeddb_record_transaction:UnknownError                                                                                                                      | 18031 |     2306 |
| indexeddb_record_transaction_onabort:QuotaExceededError                                                                                                        | 14321 |     2281 |
| indexeddb_init_blocked                                                                                                                                         |  2832 |     1603 |
| protocol indexeddb is prevented.:An unknown error occurred within Indexed Database.                                                                            |  2417 |      481 |
| protocol indexeddb is prevented.:Internal error opening backing store for indexedDB.open.                                                                      |  2107 |      271 |
| indexeddb_record_transaction_onabort                                                                                                                           |  2098 |      317 |
| indexeddb_record_transaction_onabort:An attempt was made to add something to storage that exceeded the quota.                                                  |  1895 |      203 |
| indexeddb_record_transaction:The transaction was aborted, so the request cannot be fulfilled.                                                                  |  1399 |     1258 |
| indexeddb_init_success_onclose                                                                                                                                 |  1098 |      957 |
| protocol indexeddb is prevented.:An attempt was made to open a database using a lower version than the existing version.                                       |   356 |       88 |
| protocol indexeddb is prevented.:The connection was closed.                                                                                                    |   332 |      325 |
| protocol indexeddb is prevented.:Encountered full disk while opening backing store for indexedDB.open.                                                         |   273 |       79 |
| indexeddb_record_transaction_onabort:UnknownError                                                                                                              |   252 |       19 |
| protocol indexeddb is prevented.:Internal error creating database backend for indexedDB.open.                                                                  |   222 |      124 |
| clean_error:Internal error opening backing store for indexedDB.deleteDatabase.                                                                                 |   218 |       68 |
| protocol indexeddb is prevented.:Error creating or migrating Records table in database                                                                         |   209 |       52 |
| indexeddb_record_transaction:An unknown error occurred within Indexed Database.                                                                                |   186 |       64 |
| unable to locate logs earlier than 7d.:The transaction was aborted, so the request cannot be fulfilled.                                                        |   135 |       75 |
| clean_error:Internal error deleting database.                                                                                                                  |   110 |       28 |
| indexeddb_init_success_onerror                                                                                                                                 |    86 |       76 |
| indexeddb_record_transaction_onabort:Connection is closing.                                                                                                    |    63 |       63 |
| protocol indexeddb is prevented.:UnknownError                                                                                                                  |    39 |       13 |
| indexeddb_record_transaction:AbortError                                                                                                                        |    26 |       24 |
| indexeddb_record_transaction:Error finding current key generator value in database                                                                             |    21 |       11 |
| indexeddb_record_transaction:An internal error was encountered in the Indexed Database server                                                                  |    20 |       11 |
| protocol indexeddb is prevented.:Unable to establish IDB database file                                                                                         |    16 |        5 |
| onupgradeneeded_is_null                                                                                                                                        |    16 |       15 |
| unable to locate logs earlier than 7d.:UnknownError                                                                                                            |    14 |       14 |
| indexeddb_record_transaction_onabort:Transaction timed out due to inactivity.                                                                                  |    11 |       11 |
| indexeddb_record_transaction_onabort:Internal error committing transaction.                                                                                    |    10 |       10 |
| getTransaction:NotFoundError: DOM IDBDatabase Exception 8                                                                                                      |    10 |        3 |
| getTransaction is null                                                                                                                                         |    13 |        6 |
| indexeddb_record_transaction_onabort:Encountered disk full while committing transaction.                                                                       |     6 |        2 |
| indexeddb_init_success_onabort                                                                                                                                 |     3 |        3 |
| getTransaction:Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.                                                           |     3 |        3 |
| protocol indexeddb is prevented.:Error creating or migrating Index Records table in database                                                                   |     3 |        1 |
| unable to locate logs earlier than 7d.:An internal error was encountered in the Indexed Database server                                                        |     3 |        2 |
| unable to locate logs earlier than 7d.:An unknown error occurred within Indexed Database.                                                                      |     2 |        2 |
| protocol indexeddb is prevented.:The transaction was aborted, so the request cannot be fulfilled.                                                              |     2 |        2 |
| protocol indexeddb is prevented.:Unable to open database file on disk                                                                                          |     2 |        1 |
| indexeddb_record_transaction:Unable to store record in object store                                                                                            |     2 |        2 |
| clean_error:Internal error creating database backend for indexedDB.deleteDatabase.                                                                             |     1 |        1 |
| protocol indexeddb is prevented.:An internal error was encountered in the Indexed Database server                                                              |     1 |        1 |
| indexeddb_record_transaction:Error checking for existence of IDBKey in object store                                                                            |     1 |        1 |
| protocol indexeddb is prevented.:The operation was aborted.                                                                                                    |     1 |        1 |
| indexeddb_record_transaction:Indexing new object store record failed, but unable to remove the object store record itself                                      |     1 |        1 |
| getTransaction:The operation failed because the requested database object could not be found. For example, an object store did not exist but was being opened. |     1 |        1 |
| protocol indexeddb is prevented.:AbortError                                                                                                                    |     1 |        1 |
