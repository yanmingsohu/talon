# Talon IDE

前端使用静态文件, 后端与指定接口进行通信.
部分配置保存于客户端

![屏幕截图1](https://github.com/yanmingsohu/talon/blob/master/screen1.jpg)
![屏幕截图2](https://github.com/yanmingsohu/talon/blob/master/screen2.jpg)


* ok 文件被改变后读取当前文件进入临时editor,并显示出不同之处
* ok 刷新目录
* ok 窗口可以拖动大小
* ok 代码格式化
* ok 关键字自动完成
* ok 已打开文件间比较


# UI 接口

使用 ifreame 引入 ./talon/index.html 页面, 框架应该与窗口尺寸适配, 不要有任何滚动条.
页面接口可传递参数(通过URL上的参数进行设置):

* exit_url     : 当用户点击退出按钮时, 页面切换到这个地址, 不提供窗口被关闭.
* init_service : 服务入口地址, ide 通过这个接口来获取全部通信地址.


# 接口返回码

* 0   成功
* 1   未知的错误
* 2   参数错误
* 4   文件或目录不存在
* 6   文件或目录已经存在
* 7   文件时间戳与远程文件时间戳不一致
* 8   fsid 无效
* 9   路径无效, 不允许有 '..' 符号
* 12  无权操作
* 13  删除目录时, 目录非空
* 15  文件太大, 无法操作


# 基础 Http 接口

  服务地址全部可以动态配置, 并没有确定的服务地址, 使用服务名称表明功能.  
  以下接口全部由服务端实现以对接 ide.  
  未特别说明接口返回 header[Content-Type] == 'application/json';

## init_service
--------------------------------------------------------------------------------
说明:

  来自于页面URL参数, IDE会请求这个地址上的服务, 从而得到其他服务的地址.

参数: 无

返回:

```js
  {
    ret : 0,        // Int: 0 表示成功, 其他为错误, 出错后设置 msg 消息.
    msg : '',       // String: 设置出错消息.

    // Object: 服务地址配置, url 如果没有 http: [hostname]:[port]
    // 的部分则使用 init_service 路径中的主机和端口.
    service_url : {   
      list_fs,        
      dir,
      read,
      write,
      new_file,
      new_dir,
      del_file,
      del_dir,
      find_in_file,
      move_to,
      copy_to,
      upfile,
    },

    // 初始化完成后, 默认打开一个 fs
    default_fsid : ''
    // String: 默认项目名称, 显示在文件树的根名称.
    default_fs_name : '',
    // String: 引入一个 js 脚本插件.
    plugin_js : '',
  }
```

## list_fs
--------------------------------------------------------------------------------
说明:

  列出所有 fs 用于选择. fs 在 UI 上体现为 project.

参数: 无

返回:

```js
  {
    ret : Int, msg : String,
    data : [{
      fsid : UUID String,
      name : String,
      service_url : {
        // 覆盖 init_service 中的同名配置
        // 这允许每个文件有自己的文件服务接口
      }
    }],
  }
```

## dir
--------------------------------------------------------------------------------
说明:

  获取目录内容.

参数:

  fsid: 指明 fs.  
  path: String, 路径, 默认 '/'.  

返回:
```js
  {
    ret : Int, msg : String,
    data : [
      { name: String,    //文件名称
        type: 'f/d/l',   //f 文件, d 目录, l 链接
      }
    ],
  }
```

## read
--------------------------------------------------------------------------------
说明:

  读取文件内容.

参数:

  fsid: UUID, 指明 fs.  
  path: String, 文件路径.  


返回:

  返回数据不是 json 而是文件本身的内容.  
  返回文件类型固定 header[Content-Type]=='application/octet-stream'  
  在 header[uptime]:Long 中设置文件最后修改时间.  
  返回码在 header[StatusCode] 中设置:  
  
* 200 成功, 并返回文件,
* 404 失败, 找不到文件.
* 406 失败, path 路径有对象但不是文件.
* 400 失败, 参数错误.

## write
--------------------------------------------------------------------------------
说明:

  写入文件.

参数:

  递交的数据即是文件本身, 其他参数通过 url 来传入.  
  fsid: UUID, 指明 fs.  
  path: String, 文件路径.  
  uptime: Long, 文件最后修改时间, 如果早于远程文件日期则认为远程文件被修改, 需要执行合并, 返回码: 7.  

返回:

```js
  { ret : Int,
    msg : String,
    filetime : Long, //文件最后修改时间.
  }
```

## new_file
--------------------------------------------------------------------------------
说明:

  创建一个新文件, 如果文件已经存在会发出错误.

参数:

  fsid: UUID, 指明 fs.  
  path: String, 文件路径.

返回:

```js
  { ret : Int,
    msg : String,
    uptime: Long, //文件最后修改时间.
  }
```

## new_dir
--------------------------------------------------------------------------------
说明:

  创建一个新目录, 如果目录已经存在会发出错误;  
  并不会级联创建目录, 新建目录的子目录必须存在.

参数:

  fsid: UUID, 指明 fs.  
  path: String, 文件路径.  

返回:

```js
  { ret : Int,
    msg : String,
  }
```

## del_file
--------------------------------------------------------------------------------
说明:

  删除文件/软连接, 如果文件不存在会报错.

参数:

  fsid: UUID, 指明 fs.  
  path: String, 文件路径.  

返回:

```js
  { ret : Int,
    msg : String,
  }
```

## del_dir
--------------------------------------------------------------------------------
说明:

  删除目录, 目录必须空, 否则报错.

参数:

  fsid: UUID, 指明 fs.  
  path: String, 文件路径.  
  recursive: Bool, 如果为 true 则删除包括所有子目录和目录中的文件.  

返回:

```js
  { ret : Int,
    msg : String,
  }
```


## find_in_file
--------------------------------------------------------------------------------
说明:

  在指定目录搜索文件内容字符串

参数:

  fsid: UUID, 指明 fs.  
  path: String, 开始搜索的目录.  
  find: String, 搜索字符串.  

返回:

```js
  { ret : Int,
    msg : String,
    data : [   //找到的文件列表
      ['文件名', { //所在行列表(从0开始) : '附近文字' } ]
    ],
    skip : [   //忽略的文件列表
      ['文件名', '原因']
    ]
  }
```


## move_to
--------------------------------------------------------------------------------
说明:

  移动目录或文件, 只能在同一个项目中操作; 移动目录的速度比复制更快.  
  不可用覆盖已经存在的目标目录/文件.  

参数:

  fsid: UUID, 指明 fs.
  path: String, 要移动的目录或文件
  to  : String, 目标地址

返回:

```js
  { ret : Int,
    msg : String,
  }
```


## copy_to
--------------------------------------------------------------------------------
说明:

  复制目录或文件, 可以跨项目. 不会修改目标项目中已经存在的文件.  
  尽可能的复制文件/目录.  

参数:

  sfsid: UUID, 指明源项目 fs.
  tfsid: UUID, 指明目地项目 fs.
  spath: String, 要移动的目录或文件
  tpath: String, 目标地址

返回:

```js
  { ret : Int,
    msg : String,
    err  : [],   如果复制文件出错, 会记录出错的信息.
  }
```  


## upfile
--------------------------------------------------------------------------------
说明:

  上传文件. 不会修改已经存在的文件.

参数:

  fsid: UUID, 指明项目 fs.  
  path: String, 文件存放位置  

返回:

```js
  { ret : Int,
    msg : String,
  }
```  


## zip
--------------------------------------------------------------------------------
说明:

  压缩文件/目录.  

参数:

  fsid: UUID, 指明项目 fs.  
  zfsid:UUID, 指明 zip 文件的 fs, 如果无效使用 fsid.  
  path: String, 文件存放位置  
  zip : String, 压缩文件位置  

返回:

```js
  { ret : Int,
    msg : String,
  }
```


## unzip
--------------------------------------------------------------------------------
说明:

  解压文件.

参数:

  fsid: UUID, 指明项目 fs.  
  zfsid:UUID, 指明 zip 文件的 fs, 如果无效使用 fsid.  
  path: String, 解压文件存放位置  
  zip : String, 压缩文件位置  

返回:

```js
  { ret : Int,
    msg : String,
  }
```



# 全局对象

> window 为浏览器对象

## window.talon

  talon ide 唯一实例, `TalonGlobal` 类.


# Class TalonGlobal
-------------------------------------------------------------------------------

## Events

* initia_success    -- 初始化完成
* working_resize    -- 工作窗口尺寸改变
* save_all          -- 保存所有文件
* close_all_tab     -- 关闭所有文件 (必要时提示保存)
* esc_key_press     -- ESC 按键被按下
* choose_project    -- (project, node) 当文件列表中的节点被点击
* language_changed  -- 语言被改变
* tab_changed_focus -- (TabClass) 当 Tab 焦点切换时发生的事件

## Object open_conf

  打开 ide 时的将浏览器的 url 解析为参数对象.

## Object key_binding

  [参考 binding API](https://github.com/bitwalker/keys.js)
  [本地](../keys/Bindings.html)

## Function on(name, callback)
## Function off(name, callback)
## Function emit(name, data)

  事件监听函数系

## Function on_command(menu_event_command_name, cb)

  cb: Function(event, TalonTab, TalonMenuItem)  
  当 menu_event_command_name 菜单被触发并处理完成后, cb 被回调.  
  菜单的 `menu_event` DOM 属性即是 menu_event_command_name.

## Function add_code_editor(conf)

  [创建 ACE 编辑器](https://github.com/ajaxorg/ace)
  [本地](../ace-api/index.html)

  conf.name  -- TAB 显示名称  
  conf.mode  -- 编辑器模式. 默认 text  
  conf.theme -- 样式, 默认 'terminal'  
  conf.text  -- 编辑器默认内容.  
  conf.save  -- 保存函数. Function(text, cb) 当用户执行保存动作时被调用, text 为当前编辑器的内容,
  保存完成调用 cb.

## Function add_tab(name)

  使用 name 创建一个 Tab 页, 并返回 TalonTab 对象.

## Function closeAllFile(all_over)

  关闭并保存所有文件, 并提示退出确认.  
  直到所有操作完整 closed_call_back() 被调用, 否则不会调用.

## Function print(...)

  打印消息到输出窗口, 将自动处理 Error/Date 的显示格式, 如果消息中有错误对象,
  将立即显示输出窗口.

## Function log(...)

  对 print() 的封装, 前置当前时间.

## Function get_config()

  返回 IDE 配置对象, 未准备好返回 null, 可以等待 initia_success 事件.

## Function save_config()

  保存对 IDE 配置对象的修改.

## Function open_fs_selector(cb)

  打开 fs 选择对话框,  
  cb: Function(err, fsid, name, urls)  
  成功后会返回 fsid, 如果失败会设置 err, 通常可以忽略; name 磁盘名称,
  urls 允许对这个 fs 行定制 api, 如连接到另一个远程系统.

## Function open_project(name, fsid, service_url, cb)

  打开项目, name: 磁盘名称, fsid: 磁盘ID, service_url 地址列表. 完成后回调 cb.

## Function get_current_tab()

  返回当前编辑器窗口

## Function set_style(type, cssfile)

  设置样式, type:[ide|ztree|ace], cssfile 指明样式表文件.

## Function toggle_output()

  切换输出窗口 显示/隐藏

## Function get_tree_dom()

  返回 tree 窗口的 jquery 对象

## Function set_state(txt)

  设置右下角状态栏内容.

## Function open_input(option, cb)

  打开一个输入对话框, 取消不会调用 cb, cb: Function(err, input_txt)  
  opt { size: 最大输入长度, 默认15, title, msg }

## Function create_mutex(group_name)

  创建互斥组, 返回函数 Function add(onblur) 通过该函数将失去焦点时的回调注册, 返回  
  { Function remove(), Function focus() }

## Function add_ace_skip_cmd(cmd)

  ace 内部有一个命令系统, 有一个默认的命令处理系统来处理这些命令,
  调用该函数取消默认 cmd 命令处理器,.

## Function open_find_file(tab)

  打开搜索窗口, 返回 `TalonFindFile` 对象; tab: TalonTab.

## Function load_menu_from(jparent, menu_event)

  加载菜单并绑定事件, 返回 `TalonMenuItem` 对象.

  .talon_sub_menu_container:  
  
     在 jparent 中寻找这个元素作为子菜单容器,  
     当 parent 属性指定的选择器选择的元素被点击, 此菜单被激活;  
     如果用 parent 找不到元素且设置了 name 属性, 则会使用 name 属性创建元素.  

  .talon_menu_item:  
  
     在 .talon_sub_menu_container 选择这个元素作为菜单项;  
     菜单项的 menu_event 属性将被关联到 `menu_event` 变量中的事件处理函数.  

  菜单处理函数: 
  
     Function init(menu, talon_exports)  
         返回当菜单被触发时的回调函数 Function onclick(event, curr_tab)  
         函数名应该有意义以便调试, `onclick` 名称仅作示例不要使用.   
       menu          -- 当前菜单的 jQuery 对象, 也是 TalonMenuItem 类.  
       talon_exports -- ide 导出对象 TalonGlobal 类.  
       event         -- 事件触发后的消息对象.  
       curr_tab      -- TAB 对象 TalonTab 类.  


## Function ajax(url, data, cb, _ex_opt_)

  _ex_opt_: jQuery 对象 ajax 有效属性对象.

## Function create_diff(option)

  创建文件比较器

```js
  option = {
   tab      : Class TalonTab, 在 TAB 中创建比较器
   get_file : Function(cb : Function(filecontent, uptime)), 读取文件内容
   update   : Function(uptime), 更新当前编辑器中的文件时间, 可以空
  };
```

## Function open_loading()

  打开读取进度条, 返回 stop() 函数在完成后调用.

## Function change_lang(iso_639_1_code, cb)

  修改 UI 语言, [ISO 639-1](https: en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

## Function lang(text_id)

  返回代码对应的当前选中语言的文本.

## Function once_click_anything(cb)

  点击屏幕任意一处触发一次 cb.


# Class TalonTab
-------------------------------------------------------------------------------

## Events

* close -- 当 tab 被关闭前这个事件被触发. 事件处理器: Function(TabClass)
* off   -- 当关闭按钮被按下/菜单中选择关闭时被触发
* saved -- 当保存完成后背触发
* focus -- 获取焦点时
* blur  -- 失去焦点时

## Object editor

  编辑器对象

## Object jextl

  扩展, 对比窗口用到了这个属性

## String short_name
## String full_name

## Function on(name, callback)
## Function off(name, callback)
## Function emit(name, data)

  事件监听函数系

## Function blur()

  不安全的失去焦点, 必须与 focus 配合使用.

## Function focus()

  不安全的获取焦点.

## Function sw_focus()

  安全的将焦点切换为当前 TAB.

## Function get_content()

  返回 TAB 内容窗口的 DOM 对象.

## Function close()

  关闭 tab 并释放资源.

## Function setchange()

  设置为修改状态.

## Function resetchange()

  设置为非修改状态.

## Function ischanged()

  返回修改状态.

## Function save(save_over_cb)

  保存修改的内容, 保存完成则调用 save_over_cb.


# Class TalonEvent
-------------------------------------------------------------------------------
事件对象

## Function on(name, cb)
## Function off(name, cb)

  绑定/解绑定事件

## Function emit(name, ...)
## Function trigger(name, ...)

  触发事件

## Function reset()

  删除所有监听器

## Function close()
## Function remove()

  释放对象, 之后所有调用都会抛出异常


# Class TalonMenuItem
-------------------------------------------------------------------------------

## Function disable()
## Function enable()
## Function setHot(key_text, cb)

  设置热键, key_text 必须大写且使用 '+' 分割.


# Class TalonMutex
-------------------------------------------------------------------------------

  使用 create_mutex().add() 方法创建

## Function focus()

  组中的所有对象, 当前调用者获取焦点, 其他全部失去焦点

## Function remove()

  删除回调


# Class TalonFindFile
-------------------------------------------------------------------------------

返回 FindFile 对象, 可触发事件:
find        (opt, find-txt)
find_all    (opt, find-txt)
replace     (opt, find-txt, replace-txt)
replace_all (opt, find-txt, replace-txt)

## Function setCount(count, text)
## Function close()
## Function setText()
## Function on


# Class TalonProject
-------------------------------------------------------------------------------

## Object filetree
## Object urls
## String fsid
## String name

## Function open_file(event, treeId, treeNode, open_over)

  open_over: Function(new_tab, treeNode) 可选的, 成功打开并创建编辑器后回调

## Function find_node(path, cb)

  cb:Function(err, id, node) 用路径寻找节点, 异步的;

## Function refresh(path)

  刷新树, path 要刷新的路径; 如果目录中没有文件被打开, 则刷新目录内容


# 引用的开源库

* [ACE](https://github.com/ajaxorg/ace)
* [Keys.js](https://github.com/bitwalker/keys.js)
* [JS/CSS/HTML beautifier](http://jsbeautifier.org/)
* [Diff](https://github.com/qiao/difflib.js)
* [Diff Match and Patch](http://code.google.com/p/google-diff-match-patch/)
* [FileDrop Revamped](https://github.com/ProgerXP/FileDrop)
* [jQuery Load Script](https://github.com/leiming/jquery.loadscript)
* [jQuery](https://jquery.org/)


