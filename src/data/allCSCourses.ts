export interface KBEntry {
  t: string
  c: string
  g: string[]
}

export const csEntries: KBEntry[] = [
  // ===== 数据结构与算法 =====
  { t:'数组 vs 链表', c:'数组连续内存O(1)随机访问，插入删除O(n)。链表节点分散O(n)随机访问，插入删除O(1)。双向链表比单向多prev指针，但支持反向遍历。ArrayList末尾插入均摊O(1)。', g:['数据结构','数组','链表','CS基础'] },
  { t:'栈与队列', c:'栈LIFO后进先出，push/pop均为O(1)。队列FIFO先进先出，enqueue/dequeue均为O(1)。双端队列两端均可操作。单调栈求下一个更大元素。循环队列避免数组搬移。', g:['数据结构','栈','队列','CS基础'] },
  { t:'二叉树与BST', c:'二叉搜索树左<根<右，平均查询O(log n)最坏O(n)。平衡树(AVL红黑)旋转保持平衡。完全二叉树用数组存储：左子=2i+1右子=2i+2父=(i-1)/2。', g:['数据结构','二叉树','BST','CS基础'] },
  { t:'堆与优先队列', c:'大顶堆/小顶堆用完全二叉树实现。插入上浮O(log n)删除下沉O(log n)。建堆Floyd算法O(n)。Top-K问题用小顶堆维护K个最大。Dijkstra中用优先队列选最短路径。', g:['数据结构','堆','优先队列','CS基础'] },
  { t:'哈希表', c:'键→哈希函数→桶下标。拉链法链表解决冲突，开放地址法线性探查。负载因子>0.75触发rehash扩容一倍。Java HashMap红黑树化链表转树阈值8。一致性哈希解决分布式扩容。', g:['数据结构','哈希表','CS基础'] },
  { t:'B树与B+树', c:'多路平衡查找树，节点存多个键。B+树非叶节点只存索引，叶节点链表串联。数据库索引底层结构，深度3-4层存储千万数据。插入分裂/删除合并保持平衡。', g:['数据结构','B树','B+树','数据库','CS基础'] },
  { t:'图论基础', c:'G=(V,E)，有向/无向/加权图。邻接矩阵O(V^2)、邻接表O(V+E)。度=相连边数，入度/出度。连通分量、强连通分量(Tarjan/Kosaraju)。二分图染色判断。', g:['数据结构','图论','CS基础'] },
  { t:'图的遍历BFS/DFS', c:'BFS队列层序遍历最短路径，O(V+E)。DFS栈(递归)深度优先拓扑排序/连通分量/环检测。邻接表DFS递归到最深回溯。迭代DFS用显式栈代替递归防爆栈。', g:['算法','BFS','DFS','CS基础'] },
  { t:'最短路径算法', c:'Dijkstra贪心非负权O((V+E)log V)二叉堆优化。Bellman-Ford处理负权O(VE)检测负环。Floyd-Warshall全源O(V^3)DP。A*启发式搜索f=g+h估值函数。', g:['算法','最短路径','Dijkstra','CS基础'] },
  { t:'最小生成树MST', c:'Prim算法点扩张O(E log V)，Kruskal并查集边排序O(E log E)。割边必选定理。网络设计/电路布线/聚类最小化连接成本。次小生成树替换一条边。', g:['算法','MST','Prim','Kruskal','CS基础'] },
  { t:'十大排序算法', c:'O(n^2)：冒泡/插入(近乎有序快)/选择。O(n log n)：快排(递归+分区)/归并(分治+合并)/堆排。O(n+k)：计数/桶/基数。稳定排序：冒泡/插入/归并/计数。三路快排处理大量重复元素。', g:['算法','排序','快排','归并','CS基础'] },
  { t:'分治算法', c:'Divide拆分子问题→Conquer递归解→Combine合并。经典：归并排序/快排/二分查找/大整数乘法Karatsuba/Strassen矩阵乘。Master定理分析递归复杂度T(n)=aT(n/b)+O(n^d)。', g:['算法','分治','递归','CS基础'] },
  { t:'动态规划DP', c:'最优子结构+重叠子问题。自顶向下记忆化搜索vs自底向上填表。经典：背包/最长公共子序列LCS/编辑距离/硬币最少。状态转移方程：dp[i]=f(dp[i-1],...)。滚动数组降维。', g:['算法','动态规划','DP','CS基础'] },
  { t:'贪心算法', c:'每步局部最优希望全局最优。需贪心选择性质+最优子结构。经典：活动选择/哈夫曼编码/最小生成树/区间调度。贪心正确性需交换论证或归纳证明。不保证全局最优。', g:['算法','贪心','CS基础'] },
  { t:'字符串匹配', c:'KMP前缀函数O(n+m)跳过失效前缀。Boyer-Moore坏字符+好后缀从右向左。Rabin-Karp滚动哈希O(n+m)期望。Trie前缀树存储字符串集。AC自动机多模式匹配。', g:['算法','字符串','KMP','CS基础'] },
  { t:'递归与回溯', c:'递归三要素：终止条件+缩小规模+组合结果。回溯=枚举所有解空间树，剪枝提前排除分支。经典：八皇后/N皇后/数独/全排列/子集/组合求和。递归深度过大用尾递归优化或改迭代。', g:['算法','递归','回溯','CS基础'] },
  { t:'复杂度分析', c:'大O上界、大Ω下界、大Θ紧确界。主定理：T(n)=aT(n/b)+f(n)分三种情况。均摊分析：聚合/记账/势能法。NP完全问题：SAT/3-SAT/旅行商/子集和/团问题。', g:['算法','复杂度','NP','CS基础'] },
  { t:'跳表SkipList', c:'多层索引链表，每层随机晋升概率0.5。查询/插入/删除平均O(log n)。Redis Sorted Set底层实现。比平衡树简单无需旋转。空间复杂度O(n)。层高期望log n。', g:['数据结构','跳表','Redis','CS基础'] },
  { t:'LRU缓存', c:'Least Recently Used淘汰最久未用。哈希表+双向链表实现O(1)get/put。访问时移到链表头，淘汰时删链表尾。Redis内存淘汰8种策略。LFU记录访问频次更精确。', g:['数据结构','LRU','缓存','CS基础'] },
  { t:'布隆过滤器', c:'k个哈希函数映射到m位数组。O(k)判不存在100%准确，判存在有误判率p≈(1-e^(-kn/m))^k。最优k=m/n*ln2。Redis提供Bloom/Cuckoo过滤器。节省空间防止缓存穿透。', g:['数据结构','布隆过滤器','CS基础'] },
  { t:'并查集UnionFind', c:'QuickFind/QuickUnion+路径压缩+按秩合并。find近乎O(α(n))反阿克曼函数≈常数。连通分量/Kruskal算法/动态连通性/等价类划分。加权QuickUnion树高log n。', g:['数据结构','并查集','CS基础'] },
  { t:'红黑树', c:'自平衡二叉搜索树，五条性质保证树高≤2log(n+1)。插入旋转+变色O(log n)。Java TreeMap/TreeSet C++ std::map底层实现。与AVL比旋转更少写操作更优。', g:['数据结构','红黑树','平衡树','CS基础'] },

  // ===== 操作系统 =====
  { t:'进程与线程', c:'进程是资源分配单位有独立地址空间，线程是CPU调度单位共享进程内存。创建开销进程>线程，通信开销进程>线程。内核级线程由OS调度，用户级线程由库调度。协程更轻量由程序员控制切换。', g:['操作系统','进程','线程','CS基础'] },
  { t:'进程间通信IPC', c:'管道pipe半双工父子进程，命名管道FIFO无亲缘。消息队列异步。共享内存mmap最快需同步。信号量PV操作互斥同步。Socket网络IPC。信号Signal异步通知。', g:['操作系统','IPC','进程','CS基础'] },
  { t:'死锁', c:'四必要条件：互斥/持有等待/不可剥夺/循环等待。预防破坏任一条件。有序资源分配破坏循环等待。银行家算法死锁避免。检测→资源分配图化简。鸵鸟策略忽略重启。', g:['操作系统','死锁','CS基础'] },
  { t:'CPU调度算法', c:'FCFS先来先服务(非抢占)。SJF最短作业优先(最优平均等待)。RR时间片轮转(time quantum)。优先级调度(饥饿问题+老化)。多级反馈队列MLFQ实际系统首选。CFS Linux2.6+完全公平调度。', g:['操作系统','CPU','调度','CS基础'] },
  { t:'虚拟内存', c:'每个进程独立地址空间。分页固定大小(4KB)，页表映射虚页→实页。请求调页惰性加载。页面置换：OPT理想/FIFO/LRU/Clock。缺页率受工作集大小影响。', g:['操作系统','虚拟内存','分页','CS基础'] },
  { t:'页面置换算法', c:'OPT最佳置换未来最远(理论)。FIFO先进先出有Belady异常。LRU最近最久未用链表实现。Clock(第二次机会)环形扫描访问位置0。Linux使用LRU近似算法。', g:['操作系统','页面置换','LRU','CS基础'] },
  { t:'内存管理', c:'连续分配：首次适应/最佳适应/最差适应外部碎片。分页消除外部碎片有内部碎片。分段逻辑单位共享保护。段页式组合。Buddy System伙伴系统Linux内核。Slab分配器缓存固定大小对象。', g:['操作系统','内存管理','CS基础'] },
  { t:'文件系统', c:'inode存文件元数据(权限/大小/数据块指针)。目录=文件名→inode映射。软链接存路径硬链接共享inode。VFS虚拟文件系统统一接口。日志文件系统ext4/XFS/NTFS。写时复制CoW Btrfs/ZFS。', g:['操作系统','文件系统','inode','CS基础'] },
  { t:'I/O模型', c:'阻塞I/O等待数据就绪。非阻塞I/O轮询返回EWOULDBLOCK。I/O多路复用select/poll/epoll(event-driven)。信号驱动SIGIO通知。异步I/O aio_read内核完成通知。epoll ET边沿触发vs LT水平触发。', g:['操作系统','I/O','epoll','CS基础'] },
  { t:'同步互斥', c:'竞态条件两个线程同时访问共享数据。临界区代码一次一个线程执行。互斥锁mutex lock/unlock。自旋锁spinlock忙等适用于短临界区。信号量semaphore计数型PV操作。读写锁多读单写。条件变量等待通知。', g:['操作系统','同步','互斥','CS基础'] },
  { t:'锁的实现', c:'Test-and-Set原子指令硬件支持自旋锁。Compare-and-Swap(CAS)无锁编程基础。Linux futex用户态自旋+内核态休眠。mutex基于futex实现。RCU读无锁写拷贝Linux内核广泛使用。', g:['操作系统','锁','CAS','CS基础'] },
  { t:'虚拟化技术', c:'Hypervisor类型1裸机型(ESXi/KVM)类型2宿主机型(VirtualBox)。CPU虚拟化Intel VT-x/AMD-V。内存虚拟化EPT/NPT扩展页表。容器Docker OS级虚拟化共享内核。', g:['操作系统','虚拟化','KVM','CS基础'] },

  // ===== 计算机网络 =====
  { t:'TCP三次握手', c:'SYN→SYN-ACK→ACK三次握手建立连接。初始序列号随机防历史连接。半连接队列SYN queue+全连接队列Accept queue。SYN Flood攻击占用半连接队列防范SYN Cookie。', g:['网络','TCP','握手','CS基础'] },
  { t:'TCP四次挥手', c:'FIN→ACK+FIN→ACK四次挥手断开。主动方CLOSE_WAIT→被动方LAST_ACK→主动方TIME_WAIT等2MSL(120s)。保证最后一个ACK到达+让旧连接包消失。大量TIME_WAIT调net.ipv4.tcp_tw_reuse。', g:['网络','TCP','挥手','CS基础'] },
  { t:'TCP拥塞控制', c:'慢启动cwnd指数增长(每RTT翻倍)到ssthresh→拥塞避免线性增长→超时快重传→快恢复。Reno/Tahoe/NewReno/Cubic/LEDBAT/BBR(Bottleneck Bandwidth and RTT)。Linux4.9+默认Cubic。', g:['网络','TCP','拥塞控制','CS基础'] },
  { t:'TCP可靠传输', c:'确认应答ACK+超时重传RTO+Karn算法+RTT估算。滑动窗口流量控制rwnd防止接收方缓冲区溢出。累计确认+选择确认SACK。Nagle算法合并小包延迟ACK合并确认。', g:['网络','TCP','可靠传输','CS基础'] },
  { t:'UDP vs TCP', c:'UDP无连接+不可靠+无拥塞控制+头部8字节(源/目的端口+长度+校验和)。DNS/DHCP/QUIC/视频流/游戏实时性>可靠性。TCP可靠+有序+面向连接+头部20-60字节。QUIC基于UDP0-RTT握手。', g:['网络','UDP','TCP','CS基础'] },
  { t:'HTTP 1.0/1.1/2/3', c:'HTTP1.0每请求一连接。1.1持久连接+管线化(队头阻塞)。2多路复用二进制帧+头部压缩HPACK+服务器推送。3基于QUIC/UDP消除TCP队头阻塞0-RTT连接迁移。常见状态码2xx成功3xx重定向4xx客户端错5xx服务端错。', g:['网络','HTTP','CS基础'] },
  { t:'HTTPS与TLS', c:'TLS1.3一次RTT握手比1.2少一轮。ECDHE密钥交换前向安全性。证书链CA根→中间→服务器。SNI一个IP多证书。HSTS强制HTTPS禁止降级。ALPN协商HTTP版本。', g:['网络','HTTPS','TLS','安全','CS基础'] },
  { t:'DNS域名系统', c:'递归查询根→顶级域→权威服务器。迭代查询客户端逐步问。A记录IPv4 AAAA记录IPv6 CNAME别名 MX邮件 NS指定服务器。TTL缓存时间。CDN基于DNS智能解析。DoH/DoT DNS加密。', g:['网络','DNS','CS基础'] },
  { t:'IP地址与子网', c:'32位IPv4 A类/8 B类/16 C类/24。CIDR无类域间路由掩码表示。私有地址10.x/172.16-31/192.168。NAT网络地址转换。IPv6 128位组播任播无广播。子网划分借主机位。', g:['网络','IP','子网','CS基础'] },
  { t:'路由算法', c:'距离向量Bellman-Ford(RIP)。链路状态Dijkstra(OSPF)。路径向量BGP自治系统间路由AS_PATH防环。内部网关IGP(OSPF/RIP/IS-IS)+外部网关EGP(BGP)。CIDR路由聚合减少表项。', g:['网络','路由','BGP','OSPF','CS基础'] },
  { t:'CDN内容分发网络', c:'边缘节点就近服务。DNS解析→最优边缘节点IP。回源策略拉取源站内容缓存。缓存键+TTL控制更新。预热主动推送到边缘。HTTP/3+QUIC加速最后一公里。', g:['网络','CDN','缓存','CS基础'] },
  { t:'WebSocket', c:'HTTP升级→全双工长连接。101 Switching Protocols升级握手。帧格式fin/opcode/mask/payload。心跳ping/pong保活。比轮询节省带宽。聊天/游戏/实时推送典型场景。Socket.IO兜底兼容。', g:['网络','WebSocket','实时','CS基础'] },

  // ===== 数据库系统 =====
  { t:'ACID事务', c:'原子性事务全部或全不执行。一致性事务前后数据满足约束。隔离性并发事务互不干扰。持久性提交后数据永久保存。undo日志实现原子性+redo日志实现持久性。两阶段封锁+MVCC实现隔离。', g:['数据库','事务','ACID','CS基础'] },
  { t:'事务隔离级别', c:'读未提交脏读。读已提交不可重复读。可重复读幻读(InnoDB Next-Key Lock防)。串行化完全隔离性能最差。默认：MySQL可重复读PostgreSQL读已提交。SET TRANSACTION ISOLATION LEVEL。', g:['数据库','隔离级别','MVCC','CS基础'] },
  { t:'MVCC多版本并发控制', c:'每行多版本通过事务ID实现。快照读读历史版本无锁。当前读加锁。InnoDB版本链回滚段undo log。ReadView可见性判断活跃事务列表。PostgreSQL元组新旧版本。版本清理vacuum防止膨胀。', g:['数据库','MVCC','并发','CS基础'] },
  { t:'SQL索引优化', c:'B+树主索引聚簇索引数据与索引在一起。二级索引存主键回表查询。联合索引最左前缀匹配。覆盖索引不回表。前缀索引字符串前N字符。索引下推ICP引擎层过滤。force index/use index提示。', g:['数据库','索引','SQL','CS基础'] },
  { t:'SQL连接类型', c:'INNER JOIN取交集。LEFT JOIN左表全保留右表无匹配NULL。RIGHT JOIN右表全保留。FULL OUTER JOIN全保留(MySQL不支持用LEFT JOIN UNION RIGHT JOIN)。CROSS JOIN笛卡尔积。自连接同一表关联。', g:['数据库','SQL','JOIN','CS基础'] },
  { t:'范式化与反范式', c:'1NF属性原子不可分。2NF非主属性完全依赖主键消除部分依赖。3NF消除传递依赖。BCNF主键决定所有属性。反范式化冗余字段减少JOIN提高读性能。实际生产3NF+选择性反范式。', g:['数据库','范式','设计','CS基础'] },
  { t:'SQL注入防御', c:'ORM参数化查询占位符?预编译Statement。输入白名单校验+最小权限原则+存储过程。WAF Web应用防火墙拦截恶意SQL。错误信息不要暴露数据库结构。', g:['数据库','安全','SQL注入','CS基础'] },
  { t:'分库分表', c:'垂直拆分按业务模块不同表不同库。水平拆分按某字段hash/range分散到N张表。ShardingSphere/MyCat中间件。全局ID雪花算法Snowflake。跨分片JOIN禁止需应用层聚合。读写分离主从复制。', g:['数据库','分库分表','分布式','CS基础'] },
  { t:'Redis数据结构', c:'String简单键值原子增减。Hash字段级操作存储对象。List双向链表消息队列。Set无序集合交并差。Sorted Set score排序延迟队列。Bitmap位操作签到。HyperLogLog基数统计。Geo位置距离。Stream 5.0+消息队列。', g:['数据库','Redis','NoSQL','CS基础'] },
  { t:'NoSQL vs SQL', c:'SQL关系型(MySQL/PG)强一致ACID复杂查询。NoSQL键值(Redis)文档(MongoDB)列族(Cassandra)图(Neo4j)。CAP理论C强一致/A高可用/P分区容错三选二。Base Basically Available soft state eventually consistent。', g:['数据库','NoSQL','CAP','CS基础'] },
  { t:'慢查询优化', c:'EXPLAIN查看执行计划type/rows/Extra。慢查询日志long_query_time阈值。pt-query-digest分析工具。优化：加索引/改写SQL/减少回表/分页用游标/limit大偏移用子查询/避免select */合理分表。', g:['数据库','慢查询','优化','CS基础'] },

  // ===== 编译原理 =====
  { t:'编译器流程', c:'词法分析token流→语法分析AST→语义分析类型检查→中间代码IR生成→优化→目标代码生成。前端语言相关后端机器相关。LLVM三阶段设计Clang+LLVM IR+后端。', g:['编译','编译器','CS基础'] },
  { t:'词法分析', c:'正则表达式→NFA非确定有限自动机→DFA确定有限自动机→最小化DFA。Lex/Flex工具。Token=(类型,值,位置)。捕获词法错误非法字符。最长匹配原则。', g:['编译','词法分析','正则','CS基础'] },
  { t:'语法分析', c:'上下文无关文法CFG。自顶向下LL(k)递归下降预测分析表左递归消除。自底向上LR(0)→SLR(1)→LR(1)→LALR(1)移进-归约冲突。YACC/Bison工具。语法错误恢复panic mode/phrase level。', g:['编译','语法分析','LL','LR','CS基础'] },
  { t:'中间代码IR', c:'三地址码(TAC)、静态单赋值(SSA)、LLVM IR。SSA每个变量仅赋值一次通过phi函数合并。控制流图CFG基本块+边。IR更接近机器便于优化。LLVM IR类型系统+无限寄存器。', g:['编译','IR','LLVM','SSA','CS基础'] },
  { t:'代码优化', c:'常量传播+死代码消除+公共子表达式消除。循环优化：循环不变外提/强度削弱/归纳变量消除。函数内联消除调用开销。逃逸分析栈分配替代堆分配。PGO基于Profiling的优化。', g:['编译','优化','CS基础'] },
  { t:'寄存器分配', c:'图着色算法：寄存器=颜色，变量=节点，冲突边=同时活跃。Chaitin/Briggs算法。溢出spill无法分配时存栈。线性扫描分配更快。SSA形式简化分配。贪心算法关注热路径。', g:['编译','寄存器','CS基础'] },
  { t:'JIT编译器', c:'Just-In-Time编译运行时代码生成。解释执行→热点检测→编译优化→机器码。V8 TurboFan/Ignition+Sparkplug。GraalVM多语言JIT。JIT比AOT多了运行时信息可以做推测性优化。逆优化回退。', g:['编译','JIT','V8','CS基础'] },
  { t:'LLVM生态', c:'模块化编译器架构。Clang C/C++前端+LLVM IR中间表示+多种后端。Pass管道优化IR。TableGen代码生成器。LTO链接时优化。MLIR多层IR扩展。Swift/Rust/Julia语言基于LLVM。', g:['编译','LLVM','Clang','CS基础'] },

  // ===== 计算机组成原理 =====
  { t:'冯诺依曼体系', c:'五大部件：运算器ALU、控制器CU、存储器、输入设备、输出设备。存储程序概念指令与数据同存存储器。程序计数器PC+指令寄存器IR+累加器ACC。哈佛架构指令数据分离并行。', g:['计组','冯诺依曼','体系结构','CS基础'] },
  { t:'CPU流水线', c:'IF取指ID译码EX执行MEM访存WB写回五级流水。流水线冒险：结构冒险资源冲突、数据冒险RAW/WAR/WAW转发旁路、控制冒险分支预测。超标量多发射。乱序执行Reorder Buffer。', g:['计组','CPU','流水线','CS基础'] },
  { t:'缓存层次结构', c:'L1 32KB/1ns L2 256KB/4ns L3 8MB/15ns 主存/60ns SSD/100us 磁盘/10ms。时间局部性刚访问过可能再访问。空间局部性附近地址可能访问。Cache Line 64B预取。映射方式直接/全相联/组相联。写回WriteBack vs 写直达WriteThrough。', g:['计组','缓存','CPU','CS基础'] },
  { t:'内存层次', c:'寄存器1cycle→L1缓存2-4cycle→L2 10-20cycle→L3 30-70cycle→主存100-200cycle。DDR SDRAM行选通CAS列选通RAS延迟。双通道增加带宽。NUMA非一致内存访问每CPU有自己的内存节点。', g:['计组','内存','DDR','CS基础'] },
  { t:'指令集ISA', c:'CISC x86复杂指令集变长指令微码。RISC ARM固定长度Load/Store架构。流水线友好RISC>驱动复杂度CISC。RISC-V开源自由ISA模块化设计。SIMD向量指令AVX/NEON。', g:['计组','ISA','x86','ARM','RISC-V','CS基础'] },
  { t:'中断与异常', c:'中断异步外部设备触发。异常同步指令执行触发(除零/缺页/非法指令)。中断向量表存ISR地址。中断控制器APIC。保存现场→处理→恢复。软中断int指令系统调用。NMI不可屏蔽中断。', g:['计组','中断','异常','CS基础'] },

  // ===== 离散数学 =====
  { t:'命题逻辑', c:'原子命题∧与∨或¬非→蕴含↔等价。真值表列所有可能赋值。永真式重言式永假式矛盾式。逻辑等价替换。德摩根律¬(P∧Q)≡¬P∨¬Q。析取/合取范式DNF/CNF。', g:['离散数学','逻辑','CS基础'] },
  { t:'谓词逻辑', c:'∀全称量词∃存在量词。量词交换：∃x∀y P(x,y)→∀y∃x P(x,y)单向。否定：¬∀x P(x)≡∃x ¬P(x)。斯科伦化消除存在量词引入函数。一阶逻辑可判定半。哥德尔不完备定理。', g:['离散数学','谓词逻辑','CS基础'] },
  { t:'集合与关系', c:'并∪交∩差-补集。幂集所有子集2^n个。笛卡尔积有序对。关系自反/对称/传递/反自反/反对称。等价关系(自反+对称+传递)=划分。偏序关系(自反+反对称+传递)。哈斯图可视化偏序。', g:['离散数学','集合','关系','CS基础'] },
  { t:'函数', c:'映射f:A→B。单射不同输入不同输出。满射值域覆盖B。双射一一对应。可逆函数必须有反函数双射。鸽巢原理n+1鸽进n巢至少一巢多鸽。函数复合f∘g(x)=f(g(x))。', g:['离散数学','函数','CS基础'] },
  { t:'图论', c:'握手定理degree和=2|E|。欧拉回路经过每条边一次起终点同。哈密顿回路经过每个顶点一次。平面图V-E+F=2欧拉公式。四色定理。树n节点n-1边连通无环。生成树无向图极小连通子图。', g:['离散数学','图论','CS基础'] },
  { t:'组合数学', c:'加法原则互斥P=P1+P2。乘法原则独立序列P=P1*P2。排列P(n,r)有序选、组合C(n,r)无序选。鸽巢+容斥+生成函数。二项式定理(a+b)^n=∑C(n,k)a^k b^(n-k)。卡特兰数C_n=C(2n,n)/(n+1)。', g:['离散数学','组合','排列','CS基础'] },
  { t:'数论基础', c:'整除a|b。最大公约数gcd欧几里得算法O(log min(a,b))。最小公倍数lcm(a,b)=ab/gcd(a,b)。模运算同余a≡b(mod m)。中国剩余定理CRT求解同余方程组。费马小定理a^(p-1)≡1(mod p)欧拉定理推广。', g:['离散数学','数论','密码学','CS基础'] },
  { t:'代数系统', c:'群封闭+结合+单位元+逆元。阿贝尔群交换。环+和·两运算。域加减乘除非零除(有限域GF(p^n)密码学重要)。半群群去逆元幺半群群加单位元。布尔代数⊕↑↓逻辑电路开关代数。', g:['离散数学','代数','群论','CS基础'] },

  // ===== 软件工程 =====
  { t:'设计模式GoF', c:'创建型(工厂/抽象工厂/建造者/原型/单例)。结构型(适配器/桥接/组合/装饰/外观/享元/代理)。行为型(责任链/命令/解释器/迭代器/中介者/备忘录/观察者/状态/策略/模板方法/访问者)。SOLID原则+单一职责/开闭/里氏替换/接口隔离/依赖倒置。', g:['软件工程','设计模式','SOLID','CS基础'] },
  { t:'敏捷开发', c:'Scrum Sprint1-4周迭代。每日站会+评审+回顾。产品Backlog优先级+冲刺Backlog承诺。Kanban可视化流程WIP限制。用户故事as角色I want功能so that价值。DDD领域驱动设计聚合根/实体/值对象。', g:['软件工程','敏捷','Scrum','CS基础'] },
  { t:'测试驱动开发TDD', c:'Red写失败测试→Green最少代码通过→Refactor重构。单元测试xUnit框架AAA Arrange-Act-Assert。测试替身Mock/Stub/Fake/Spy/Dummy。集成测试模块间+端到端E2E全链路。BDD GIVEN/WHEN/THEN。', g:['软件工程','测试','TDD','CS基础'] },
  { t:'版本控制Git', c:'工作区→暂存区stage→本地仓库commit→远程push。分支branch合并merge变基rebase。cherry-pick拣选。HEAD当前/HEAD~n祖先。stash暂存。reset软硬混合。reflog找回误删。.gitignore排除。Git Flow分支模型。', g:['软件工程','Git','版本控制','CS基础'] },
  { t:'CI/CD持续集成部署', c:'push→构建→测试→部署全自动。GitHub Actions YAML工作流。Jenkins Pipeline DSL。Docker多阶段构建减小镜像。蓝绿部署新旧共存切换。金丝雀发布小比例灰度。回滚快速恢复上一版本。', g:['软件工程','CI/CD','DevOps','CS基础'] },
  { t:'微服务架构', c:'服务拆分单一职责独立部署。API Gateway统一入口认证限流路由。服务发现Consul/Nacos/Eureka。配置中心Apollo/Nacos热更新。熔断降级Sentinel/Hystrix。分布式链路追踪SkyWalking/Jaeger。', g:['软件工程','微服务','架构','CS基础'] },
  { t:'重构技巧', c:'提炼函数长函数拆分。移动方法职责归位。以多态替换条件。引入参数对象减少参数。内联临时变量简化。分解条件表达式。马丁福勒重构第二版。IDE自动重构安全。重构后跑测试确保无回归。', g:['软件工程','重构','代码质量','CS基础'] },
  { t:'代码坏味道', c:'重复代码单一职责违反。长方法超50行考虑拆分。大class超500行。长参数列表>4个。霰弹式修改改一处动全身。依恋情结过度耦合。神秘命名不清晰。数据泥团散落数据应封装。switch过多用多态替代。拒绝继承只复用小部分。', g:['软件工程','坏味道','重构','CS基础'] },

  // ===== 编程语言理论 =====
  { t:'静态类型 vs 动态类型', c:'静态编译时检查(Java/TS/Rust/Go)早发现错误IDE智能提示。动态运行时检查(Python/JS/Ruby)灵活快速原型。强类型不隐式转换弱类型自动转换。类型推断var/auto省略声明。渐进类型TS是JS超集加类型。', g:['PL','类型','CS基础'] },
  { t:'函数式编程', c:'纯函数相同输入相同输出无副作用。不可变数据不修改原值返回新值。高阶函数接受返回函数(map/filter/reduce)。柯里化多参数转为单参数链。尾递归优化复用栈帧。Monad函子管道化副作用。', g:['PL','函数式','FP','CS基础'] },
  { t:'面向对象OOP', c:'封装隐藏内部状态暴露行为接口。继承子类复用父类代码重写扩展。多态同一接口不同实现运行时绑定虚函数表vtable。抽象类不能实例化(abstract)。接口纯行为契约。组合优于继承降低耦合。', g:['PL','OOP','CS基础'] },
  { t:'垃圾回收GC', c:'标记-清除Mark-Sweep标记可达对象清除未标记有碎片。标记-整理Mark-Compact移动存活对象消除碎片。复制GC semispace存活率低时高效。分代GC年轻代频繁老年代稀疏。G1/ZGC低延迟并发。引用计数(CPython/ObjC/Swift)实时释放无法回收循环引用。', g:['PL','GC','内存','CS基础'] },
  { t:'协程 vs 线程', c:'协程用户态协作式切换无内核开销。async/await语法糖事件循环调度Go goroutine自动调度。栈大小协程KB级线程MB级。适合IO密集CPU密集用线程池。Go M:N调度G(goroutine)/P(processor)/M(machine)模型。', g:['PL','协程','goroutine','CS基础'] },
  { t:'Python核心特性', c:'动态类型解释型。GIL全局解释器锁限制同一时刻一个线程执行Python字节码(IO操作释放)。C扩展可绕过GIL。列表推导式[x for x in arr]。生成器yield惰性求值。装饰器@修改函数行为。上下文管理with自动资源清理。', g:['PL','Python','CS基础'] },
  { t:'Java核心特性', c:'JVM跨平台写一次到处运行。类加载双亲委派加载→验证→准备→解析→初始化。泛型类型擦除编译后去掉类型信息。反射运行时获取类信息动态调用。注解@元数据。JIT C1客户端快速编译C2服务端深度优化。', g:['PL','Java','JVM','CS基础'] },
  { t:'JavaScript核心特性', c:'事件循环宏任务setTimeout→微任务Promise→渲染。闭包函数记住外部变量。原型链[[Prototype]]属性查找。this动态绑定。const/let块作用域var函数作用域。Promise链式调用async/await同步写法。Proxy元编程。', g:['PL','JavaScript','CS基础'] },
  { t:'TypeScript类型系统', c:'interface定义对象形状type更灵活联合交叉。泛型<T>类型参数约束extends。条件类型T extends U ? X : Y。Mapped Types [K in keyof T]。模板字面量类型。declare声明外部类型。窄化typeof/instanceof/in。satisfies检查不改变类型。', g:['PL','TypeScript','CS基础'] },
  { t:'Go语言特性', c:'静态编译单二进制部署。goroutine轻量级协程go关键字创建。channel通信CSP模型。defer延迟执行后进先出。interface隐式实现。错误值(非异常)多返回值处理。空结构体{}零内存。select多路channel操作。', g:['PL','Go','CS基础'] },
  { t:'Rust所有权系统', c:'所有权规则每一值有且只有一个所有者。移动move赋值所有权转移。借用&共享引用只读不写、&mut独占引用读写唯一。生命周期标注引用有效期。RAII Resource Acquisition Is Initialization离开作用域自动释放。无GC保证内存安全。', g:['PL','Rust','所有权','CS基础'] },

  // ===== 人工智能基础 =====
  { t:'搜索算法', c:'无信息搜索：BFS保证最短但空间大、DFS空间少不保证最优、迭代加深IDS结合两者。A* f(n)=g(n)+h(n)，h(n)可采纳不超实际保证最优。博弈树minimax+α-β剪枝。蒙特卡洛树搜索MCTS AlphaGo核心。爬山/模拟退火/遗传算法局部搜索。', g:['AI','搜索','CS基础'] },
  { t:'知识表示', c:'一阶逻辑表示事实规则。语义网络节点概念+边关系。框架slot-value结构。本体OWL/RDF共享概念化。产生式规则IF-THEN专家系统。不确定推理贝叶斯网/+信度函数。', g:['AI','知识表示','CS基础'] },
  { t:'机器学习分类', c:'监督学习有标签回归/分类。无监督无标签聚类/降维。半监督少量标签+大量无标签。自监督从数据自身构造监督信号(掩码/对比)。强化学习智能体环境交互最大化累计奖励。迁移学习源任务→目标任务。', g:['AI','机器学习','CS基础'] },
  { t:'神经网络基础', c:'感知机线性模型激活函数非线性。MLP多层感知机全连接隐藏层。激活函数ReLU(Sigmoid梯度消失Tanh零中心LeakyReLU/Swish)。反向传播链式法则逐层梯度。损失函数MSE回归CrossEntropy分类。BatchNorm层归一化稳定训练。', g:['AI','神经网络','CS基础'] },
  { t:'CNN卷积神经网络', c:'卷积核滑动窗口局部连接权值共享。多通道并行为特征图feature map。池化Pooling降维不变性(最大/平均)。ResNet残差连接跳2-3层解决退化。VGG堆叠3x3小卷积核。Inception多尺度并行。', g:['AI','CNN','深度学习','CS基础'] },
  { t:'RNN序列模型', c:'循环神经网络h_t=tanh(W[h_{t-1},x_t])处理序列。LSTM门控遗忘/输入/输出门控制长期记忆。GRU简化LSTM合并隐状态仅重置/更新门。Seq2Seq编码器-解码器+注意力翻译摘要。梯度消失/爆炸截断梯度+梯度裁剪。', g:['AI','RNN','LSTM','CS基础'] },
  { t:'自然语言处理NLP', c:'分词tokenize→词向量Word2Vec/GloVe→上下文BERT→LLM。TF-IDF关键词提取词频*逆文档频率。命名实体识别人名地名组织。机器翻译统计→神经→Transformer。情感分析正面负面中性。BERT双向预训练Masked LM+NSP。', g:['AI','NLP','CS基础'] },
  { t:'计算机视觉CV', c:'图像分类ResNet/EfficientNet/ViT。目标检测YOLO单阶段/Faster R-CNN双阶段。语义分割FCN/U-Net像素级分类。实例分割Mask R-CNN。GAN生成对抗网络生成器+判别器对抗训练。Diffusion扩散模型逐步去噪生成。', g:['AI','CV','CS基础'] },

  // ===== 计算机图形学 =====
  { t:'渲染管线', c:'顶点处理(空间变换)→光栅化(三角形→像素)→片元处理(纹理+光照)→输出合并。MVP变换：Model模型→World世界→View相机→Projection投影。视锥体裁剪、背面剔除。光栅化扫描线+边缘函数。深度测试Z-Buffer。', g:['图形学','渲染','CS基础'] },
  { t:'光照模型', c:'冯氏Phong光照=环境光+漫反射(N dot L)+镜面反射(R dot V)^shininess。Blinn-Phong用半向量H=(L+V)/|L+V|替代R计算镜面。PBR基于物理渲染能量守恒微表面模型。Cook-Torrance BRDF漫反射+镜面Fresnel+几何遮蔽+法线分布。', g:['图形学','光照','CS基础'] },
  { t:'贝塞尔曲线', c:'n阶控制点P_i+Bernstein基函数。三阶曲线最常用字体设计。de Casteljau递归线性插值求点。升阶/降阶不变曲线形状。B样条局部控制+NURBS非均匀有理B样条。CAD/字体/动画路径核心工具。', g:['图形学','贝塞尔','CS基础'] },
  { t:'纹理映射', c:'UV坐标[0,1]映射到纹理像素texel。双线性/三线性Mipmap插值走样。凹凸贴图扰动法线模拟表面细节。法线贴图RGB编码法线方向。环境贴图反射/折射立方体贴图。程序化纹理噪声生成。', g:['图形学','纹理','CS基础'] },
  { t:'着色器', c:'GLSL/HLSL GPU可编程管线语言。顶点着色器顶点空间变换。片元着色器逐像素颜色计算。几何着色器生成新图元。计算着色器通用GPU计算。WebGL 1.0(OpenGL ES 2.0) / WebGL 2.0(ES 3.0) / WebGPU新一代标准。', g:['图形学','Shader','WebGL','CS基础'] },
  { t:'光线追踪', c:'从视点发射光线→场景求交→递归追踪反射/折射。光线-三角形Möller-Trumbore算法。加速结构BVH包围体层次/KD树空间分割。蒙特卡洛路径追踪全局光照。降噪DLSS/FSR神经网络。RTX硬件加速。', g:['图形学','光线追踪','CS基础'] },

  // ===== 分布式系统 =====
  { t:'CAP定理', c:'Consistency强一致每次读最新写。Availability可用每个请求都有响应。Partition Tolerance分区容错网络故障仍工作。P必须选即网络故障时必须C和A二选一。CP(ZooKeeper/etcd) AP(Cassandra/Dynamo) BASE最终一致。', g:['分布式','CAP','CS基础'] },
  { t:'一致性协议', c:'两阶段提交2PC协调者prepare→commit单点阻塞。三阶段提交3PC预提交减少阻塞仍非PAXOS容忍。Paxos:Prepare/Promise→Accept/Accepted→Learn多数派。Raft简化Paxos:Leader选举+日志复制+安全性。Multi-Paxos连续实例优化。', g:['分布式','一致性','Raft','CS基础'] },
  { t:'分布式ID生成', c:'UUID全局唯一但有性能开销。雪花算法Snowflake:时间戳+机器ID+序列号趋势递增。号段模式Leaf-Segment缓存一段ID减少DB压力。Redis incr原子递增。美团Leaf/百度UidGenerator同基于Snowflake。', g:['分布式','ID生成','CS基础'] },
  { t:'分布式锁', c:'Redis SETNX+过期时间+守护线程续期。Redlock多节点过半设置成功。ZooKeeper临时顺序节点+Watch前一个节点释放通知。etcd事务+租约lease自动过期。锁需满足互斥+防死锁+容错+唯一解锁者。', g:['分布式','锁','Redis','CS基础'] },
  { t:'分布式事务', c:'Seata AT模式一阶段业务SQL+回滚日志→二阶段全局提交/回滚。TCC Try预留→Confirm确认→Cancel取消。Saga长事务正向补偿+反向补偿。消息表+RocketMQ事务消息最终一致性。可靠消息+最大努力通知。', g:['分布式','事务','Seata','CS基础'] },
  { t:'负载均衡', c:'四层TCP LVS DR/NAT/TUN模式。七层HTTP Nginx upstream。轮询/加权/最少连接/IP哈希/一致性哈希(适合缓存)。健康检查探活自动摘除故障节点。Nginx高可用Keepalived VIP漂移。', g:['分布式','负载均衡','Nginx','CS基础'] },
  { t:'消息队列', c:'解耦异步削峰。Kafka高吞吐日志流分区有序持久化→消费者组消费。RabbitMQ AMQP协议交换机+队列+路由键。RocketMQ事务消息+顺序消息+延迟消息。Pulsar计算存储分离分层架构。推模式vs拉模式。', g:['分布式','消息队列','Kafka','CS基础'] },

  // ===== 信息安全与密码学 =====
  { t:'对称加密', c:'相同密钥加解密。AES高级加密标准分组128位密钥128/192/256。模式ECB安全差→CBC初始向量/CTR计数器/GCM认证加密。DES 56位已不安全→3DES过渡。ChaCha20流密码速度快移动端首选。', g:['安全','加密','AES','CS基础'] },
  { t:'非对称加密', c:'公钥加密私钥解密。RSA大整数分解困难性密钥长2048+位。ECC椭圆曲线更小密钥同等安全。ECDHE密钥协商DH椭圆曲线前向安全。数字签名私钥签名公钥验签。混合加密对称加密数据+非对称加密对称密钥。', g:['安全','加密','RSA','CS基础'] },
  { t:'哈希函数', c:'任意长→固定长单向不可逆。MD5 128位已碰撞不安全。SHA-256 256位/512/3。SHA-3 Keccak竞赛获胜者。BLAKE2/3速度更快。盐值Salt防彩虹表。HMAC带密钥哈希消息认证码。PBKDF2/bcrypt/Argon2密码哈希慢速防暴力破解。', g:['安全','哈希','SHA','CS基础'] },
  { t:'认证与授权', c:'Session服务器存状态Cookie传SessionID。JWT JSON Web Token自包含Header.Payload.Signature无状态。OAuth2.0授权码模式第三方登录。SSO单点登录CAS/JWT。RBAC基于角色权限/ABAC基于属性。双因素认证TOTP/SMS。', g:['安全','认证','JWT','OAuth','CS基础'] },
  { t:'Web安全', c:'XSS跨站脚本反射型/存储型/DOM型防御输出编码CSP。CSRF跨站请求伪造防御CSRF Token/Referer验证/SameSite Cookie。SSRF服务端请求伪造限制请求URL白名单。CORS跨域资源共享Access-Control-Allow-Origin。点击劫持X-Frame-Options。', g:['安全','Web','XSS','CSRF','CS基础'] },
  { t:'渗透测试', c:'信息收集→漏洞扫描→漏洞利用→权限维持→清理痕迹。OWASP Top 10 Web安全风险。SQLMap自动化SQL注入。BurpSuite代理拦截修改请求。Nmap端口扫描。Metasploit漏洞利用框架。工具仅限授权测试。', g:['安全','渗透测试','CS基础'] },

  // ===== Web开发 =====
  { t:'浏览器渲染', c:'HTML→DOM树+CSS→CSSOM树→Render树→Layout布局→Paint绘制→Composite合成。reflow/repaint触发代价高。requestAnimationFrame动画帧同步。Virtual DOM diff最小DOM操作。关键渲染路径优化首屏。', g:['Web','浏览器','渲染','CS基础'] },
  { t:'React核心概念', c:'组件(函数/类)JSX语法。Hooks(useState/useEffect/useMemo/useCallback/useRef/useContext)。Virtual DOM reconciliation Fiber架构可中断。状态提升+单向数据流。React Server Components RSC服务端组件。并发模式Suspense流式渲染。', g:['Web','React','CS基础'] },
  { t:'Vue响应式原理', c:'Vue3 Proxy代理对象拦截get/set自动追踪依赖。ref(.value包装)/reactive(深层响应)。computed缓存依赖不变不重算。watch监听变化触发回调。虚拟DOM diff双端比较。编译时优化静态提升+补丁标记patch flag。', g:['Web','Vue','响应式','CS基础'] },
  { t:'前端性能优化', c:'资源压缩(gzip/brotli)。图片优化(WebP/AVIF/懒加载/sizes)。代码分割Tree Shaking路由懒加载。预加载preload/prefetch/dns-prefetch。CDN+缓存策略(强缓存Cache-Control/协商缓存ETag)。虚拟滚动长列表。WebWorker耗时计算。', g:['Web','性能','优化','CS基础'] },
  { t:'CSS布局机制', c:'文档流块级/行内。Flex一维主轴交叉轴布局。Grid二维网格布局模板区域。定位static/relative/absolute/fixed/sticky。BFC块级格式化上下文清除浮动外边距折叠。层叠上下文z-index+position创建。媒体查询响应式断点。', g:['Web','CSS','布局','CS基础'] },
  { t:'前端工程化', c:'打包器Vite(ESBuild dev/Rollup build) Webpack(Loader+Plugin)Turbopack(Rust)。Babel转译高级语法。ESLint静态检查Prettier格式化。Husky git hooks+lint-staged。Monorepo pnpm+workspace/Turborepo/Nx。Tree Shaking ESM静态分析死码消除。', g:['Web','工程化','Vite','CS基础'] },

  // ===== 编程语言核心 =====
  { t:'C语言指针', c:'*取值&取地址。int* p指针存储地址。指针算术p+n跳n个元素字节(与类型大小相关)。void*通用指针需强转。函数指针回调qsort。动态内存malloc/calloc/realloc + free配对。const int*值不可变 int* const指针不可变。', g:['编程','C','指针','CS基础'] },
  { t:'C++面向对象', c:'构造函数初始化+析构函数清理。深拷贝/浅拷贝复制控制三/五法则。移动语义std::move右值引用&&转移所有权。虚函数virtual+纯虚函数=0抽象基类。模板泛型编程编译期展开。RAII+智能指针unique/shared/weak_ptr无需手动delete。STL容器算法。', g:['编程','C++','OOP','CS基础'] },
  { t:'Python高级特性', c:'元类type创建类定制类行为__new__/__init__。描述符__get__/__set__property底层。魔术方法__str__/__repr__/__call__/__iter__/__enter__/__exit__。GIL限制+多进程multiprocessing Pool。asyncio事件循环协程并发。pipenv/poetry依赖管理虚拟环境。', g:['编程','Python','高级','CS基础'] },
  { t:'Rust高级特性', c:'trait行为抽象(类似接口)泛型约束。enum带数据的和类型Result/Option。模式匹配match完备性检查。Send+Sync marker trait线程安全。unsafe调用C/绕开编译器检查。宏macro_rules!+过程宏。智能指针Box/Rc/Arc/RefCell/Cell内部可变性。', g:['编程','Rust','高级','CS基础'] },
  { t:'多线程编程', c:'Thread创建+join等待。互斥锁mutex临界区。信号量semaphore计数器型。条件变量condition_variable等待-通知。原子操作atomic无锁。线程池预先创建复用threadpool。Future/Promise异步结果。fork join并行任务分解。', g:['编程','多线程','并发','CS基础'] },
  { t:'正则表达式', c:'元字符. [] [^] * + ? {n,m} ^ $ | \\b \\B ()捕获分组(?:)非捕获(?=)正向预查(?!)负向预查(?<=)后顾。贪婪/懒惰量词。常用：邮箱\\S+@\\S+ URL https?://[\\w./]+ 手机号1[3-9]\\d{9} 中文[\\u4e00-\\u9fa5]。', g:['编程','正则','CS基础'] },
]
