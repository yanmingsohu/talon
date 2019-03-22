jQuery(function($) {

$.loadScript('ace-min-noconflict/ace.js', function() {
  $.loadScript('ace-min-noconflict/ext-language_tools.js', function() {});
});

var version = '0.12';

var tab_name      = $('.talon_file_tab_name');
var tab_cont      = $('.talon_file_tab_content');
var file_tree     = $('.talon_file_tree');
var output        = $('.talon_output_content');
var state         = $('.talon_state_small');
var menu_bar      = $('.talon_sys_menu_bar');
var tree_id       = 0;
var menu_cmd_eve  = Event();
var inner_event   = Event();
var open_conf     = parseQuery();
var opened_tab    = [];
var key_binding   = new Keys.Bindings();
var modify_char   = '&Xi;';
var mutex_group   = {};
var ace_skip_cmd  = {};
var language      = {};
var curr_tab;
var talon_config;
var mime_map;


//
// Events:
//   initia_success    -- 初始化完成
//   working_resize    -- 工作窗口尺寸改变
//   save_all          -- 保存所有文件
//   close_all_tab     -- 关闭所有文件 (必要时提示保存)
//   esc_key_press     -- ESC 按键被按下
//   choose_project    -- (project, node) 当文件列表中的节点被点击
//   language_changed  -- 语言被改变
//   tab_changed_focus -- (TabClass) 当 Tab 焦点切换时发生的事件
//
var talon_exports = window.talon = {
  className : 'TalonGlobal',

  // 打开 ide 时的 url 参数
  open_conf : open_conf,

  // Function(name, cb) 用来监听全局事件
  on : inner_event.on,

  // Function(name, data) 用来触发全局事件
  emit : inner_event.emit,

  // Function(name, cb) 移除全局事件
  off : inner_event.off,

  // Function(menu_event_command_name, cb)
  // cb: Function(event, TalonTab, TalonMenuItem)
  // 当 menu_event_command_name 菜单被触发并处理完成后, cb 被回调.
  on_command : menu_cmd_eve.on,

  // Function(conf) 创建编辑器
  add_code_editor : add_code_editor,

  // Function(name) 创建一个 tab 页编辑器
  add_tab : add_tab,

  // Function(closed_call_back) 关闭并保存所有文件, 并提示退出确认.
  // 直到所有操作完整 closed_call_back() 被调用, 否则不会调用.
  closeAllFile : closeAllFile,

  // Function(...) 打印消息到输出窗口.
  print : print,

  // Function(...) 打印的日志带有时间戳.
  log : log,

  // Object 帮定快捷键,
  key_binding : key_binding,

  // Function() 返回配置文件, 未准备好返回 null, 可以等待 initia_success 事件.
  get_config : function() { return talon_config; },

  // Function() 保存配置文件到本地
  save_config : save_config,

  // Function(cb) 打开 fs 选择对话框
  // cb: Function(err, fsid, name, urls) 成功后会返回 fsid,
  // 如果失败会设置 err, 通常可以忽略; name 磁盘名称, urls 允许对这个 fs 行定制 api
  // 如连接到另一个远程系统
  open_fs_selector : open_fs_selector,

  // Function(pname, fsid, service_url, cb) 打开项目, service_url 是地址列表.
  open_project : open_project,

  // Function(cb) 返回当前编辑器窗口
  get_current_tab : function() { return curr_tab; },

  // Function(type, cssfile) 设置样式, type:[ide|ztree|ace]
  // 分别设置, cssfile 指明样式表文件.
  set_style :  set_style,

  // Function() 切换输出窗口
  toggle_output : null,

  // Function() 返回 tree 窗口的 jquery 对象
  get_tree_dom : function() { return file_tree; },

  // 设置右下角状态栏内容.
  set_state : function(txt) { state.html(txt); },

  // Function(opt, Function cb(err, msg)) 打开一个输入对话框,
  // opt { size: 最大输入长度, 默认15, title, msg }
  // 取消不会调用 cb
  open_input: open_input,

  // Function(group_name) 创建互斥组, 返回函数 Function add(onblur)
  // 通过该函数将失去焦点时的回调注册, 返回
  // { Function remove(), Function focus() }
  create_mutex : create_mutex,

  // Function(command_name) 取消 ace 默认热键
  add_ace_skip_cmd : function(cmd) { ace_skip_cmd[cmd] = 1; },

  // Function(tab) 打开搜索窗口
  open_find_file : open_find_file,

  // Function(jparent, menu_event) 加载菜单并绑定事件
  load_menu_from : load_menu_from,

  // Function(url, data, cb, _ex_opt) 请求资源
  ajax : ajax,

  // Function(option) 创建文件比较器.
  create_diff : create_diff,

  // Function() 打开读取进度条, 返回 stop() 函数在完成后调用.
  open_loading : open_loading,

  // Function(iso_639_1_code, cb) 修改 UI 语言
  change_lang : change_lang,

  // Function(text_id) 返回代码对应的当前选中语言的文本.
  lang : lang,

  // Function(cb) 点击屏幕任意一处触发一次
  once_click_anything: once_click_anything,
};

jQuery.fn.extend({
  // 显示到屏幕中央, 以 display:flex 方式显示.
  screen_center : screen_center,
  // 遮蔽所有操作. 调用 remove() 才能删除遮蔽层.
  cover : cover,
  // 拖动元素大小 jQuery.(target, dir, isY)
  // dir=[1|-1] 觉定方向, isY=Bool 决定是否Y轴, target 是操作的目标节点
  silder : silder,
});

var DEFAULT_TALON_CONFIG = {
  tab_size      : 2,
  font_size     : 12,
  hide_output   : false,
  language_code : 'en',
};

init_version();
open_welcome();
init_output();
initialization();


function initialization() {
  log('Talon IDE', version);
  log('initialization...');
  console.log('Talon IDE version', version, ', by yanming 2017.');

  //
  // 初始化接口必要属性
  //
  var config_attr = [
    'query',        // 打开 ide 时的页面请求参数.
    'service_url',  // 请求服务的地址配置.
    'default_fsid', // 默认打开 fs
    'default_fs_name',
    'plugin_js',    // 插件脚本
  ];

  $.ajaxSetup({
    error : function(jqXHR, textStatus, errorThrown) {
      log(errorThrown);
    }
  });

  ajax('./ide-framework/mime-mode.json', null, function(err, data) {
    if (err) log(err);
    mime_map = data;
  });

  //
  // ESC 键全局消息
  //
  key_binding.add('esc_key_press', Keys.Key.Esc);
  key_binding.registerHandler('esc_key_press', function() {
    talon_exports.emit('esc_key_press');
  }, true);

  //
  // 绑定退出消息, 如果有 TAB 正在编辑则弹出提示
  //
  $(window)
    .on('beforeunload', function() {
      if (curr_tab) return "quit?";
    }).on('click', function(e) {
      file_tree.trigger('close_menu', e);
    }).unload(save_config);

  //
  // 初始化 talon ide 配置
  //
  try {
    talon_config = JSON.parse(localStorage.__talon_ide_config);
    for (var n in DEFAULT_TALON_CONFIG) {
      if (!talon_config[n])
        talon_config[n] = DEFAULT_TALON_CONFIG[n];
    }
  } catch(e) {
    talon_config = DEFAULT_TALON_CONFIG;
  } finally {
    talon_config.parameter = open_conf;
    save_config();
  }

  //
  // 文件树可拖动大小
  //
  var silder  = $('.talon_working > .talon_rl_silder').silder(file_tree, -1);

  //
  // UI 语言初始化
  //
  change_lang(talon_config.language_code || 'en', function(err) {
    if (err) log(err);
    init_services_url();
  });


  function init_services_url() {
    var iurl = open_conf.init_service;
    if (!iurl) return log( new Error(lang('s0001')) );

    ajax(iurl, null, function(err, conf) {
      if (err) return log('init fail', err);
      config_attr.forEach(function(n) {
        talon_config[n] = conf[n];
      });

      log(lang('s0002'));
      if (talon_config.hide_output) {
        talon_exports.toggle_output();
      }
      talon_exports.emit('initia_success');
      init_plugin();
    });
  }

  function init_plugin() {
    if (talon_config.plugin_js) {
      $.loadScript(talon_config.plugin_js, open_default_fs);
    } else {
      open_default_fs();
    }
  }

  function open_default_fs() {
    if (talon_config.default_fsid) {
      open_project(
        talon_config.default_fs_name,
        talon_config.default_fsid,
        talon_config.service_url,
        open_cb);

      function open_cb(err) {
        if (err) log(lang('s0003'), err);
      }
    }
  }
}


function save_config() {
  localStorage.__talon_ide_config
      = JSON.stringify(talon_config);
}


function open_fs_selector(cb) {
  if (!talon_config.service_url) {
    return log(new Error(lang('s0004')));
  }

  var dia = open_select_dialog();
  ajax(talon_config.service_url.list_fs, null, function(err, data) {
    if (err) return cb(err);
    data.data.forEach(dia.append);
    dia.data_success(data.service_url);
  });

  function open_select_dialog() {
    var selector = $('.talon_select_fs').clone();
    selector.appendTo(document.body).screen_center();
    var select = selector.find('select').html('');
    var urls = $.extend(false, talon_config.service_url);
    var id_name_map = {};

    selector.find('.cancel').click(function() {
      selector.remove();
    });

    var ok = selector.find('.ok').click(function() {
      var fsid = select.val();
      if (fsid) {
        selector.remove();
        cb(null, fsid, id_name_map[fsid], urls);
      }
    }).attr('disabled', true);

    return {
      data_success : function(_urls) {
        urls = $.extend(false, talon_config.service_url, _urls);
        ok.prop('disabled', false);
      },
      append : function(item) {
        var opt = $('<option value="'+ item.fsid + '">'
            + item.name + '&nbsp;&nbsp;<span>[' + item.fsid + ']</span></option>');
        id_name_map[item.fsid] = item.name;
        opt.appendTo(select);
      },
    }
  }
}


function open_project(pname, fsid, service_url, cb) {
  ++tree_id;
  var menu = $('#talon_tree_menu').clone().appendTo(document.body);
  var jdom = $('<div class="ztree" id="'+ tree_id +'"/>').appendTo(file_tree);
  var sett = { async: true, view: { expandSpeed: false }, callback:
      { onExpand: open_dir, onDblClick: open_file,
        onRightClick: choose_node, onClick: select_node } };
  var tree = $.fn.zTree.init(jdom, sett);
  var opend_files = {}; // path : node
  var pro_inner_event = Event();

  var project = {
    className : 'TalonProject',
    filetree  : tree,
    fsid      : fsid,
    urls      : service_url,
    name      : pname || lang('s0005'),
    // Function(event, id, node)
    open_file : open_file,
    // Function(path, cb), cb:Function(err, id, node) 用路径寻找节点, 异步的;
    find_node : find_node,
    // Function(path) 刷新树
    refresh   : refresh,
  };

  var rootNode = init_root();
  project.rootNode = rootNode;

  function init_root() {
    var root = tree.addNodes(null, {
      name      : project.name,
      open      : true,
      isParent  : true,
      tal_path  : '/',
      tal_type  : 'd',
      tal_fsid  : fsid,
      tal_ischiled : true,
    })[0];

    dir('/', function(err, data) {
      if (err) {
        close_project();
        return cb(err);
      }
      add_node(root, data);
      jdom.on('contextmenu', open_menu);
      file_tree.on('close_menu', close_menu);
      talon_exports.on('choose_project', on_choose_project);

      bind_menu();
      cb();
    });
    return root;
  }

  function bind_menu() {
    // 右键菜单绑定事件
    var menu_event_bind = {
      close_project : close_project,
      create_dir    : create_dir,
      new_file      : new_file,
      remove_dir    : remove_dir,
      del_file      : del_file,
      copy_to       : copy_to,
      move_to       : move_to,
      download      : download,
      upfile        : upfile,
      zip           : zip,
      unzip         : unzip,
    };

    menu.find('[menu_event]').each(function() {
      var thiz = $(this);
      var menu_event = thiz.attr('menu_event');
      var fn = menu_event_bind[menu_event];
      if (fn) {
        thiz.removeClass('disable').click(function(ev) {
          try { fn.call(thiz, ev);
          } catch(e) { log(e); }
        });
      }
    });
  }

  function parent_path(p) {
    var a = p.split('/');
    a.pop();
    return a.join('/');
  }

  function zip() {
    open_node_select({ act: 'Zip', on_select: _zip, suffix: '.zip' });

    function _zip(src_path, dst_path, src_fsid, dst_fsid, dst_proj) {
      var parm = {
        fsid   : src_fsid,
        zfsid  : dst_fsid,
        path   : src_path,
        zip    : dst_path,
      };
      log('Zip file waitting...');
      ajax(service_url.zip, parm, function(err, ret) {
        if (err) return log(err);
        log('Zip complete, need refresh');
        dst_proj.refresh(parent_path(dst_path));
      });
    }
  }

  function unzip() {
    open_node_select({ act: 'UnZip', on_select: _zip, no_add_name: true });

    function _zip(src_path, dst_path, src_fsid, dst_fsid, dst_proj) {
      var parm = {
        zfsid  : src_fsid,
        fsid   : dst_fsid,
        zip    : src_path,
        path   : dst_path,
      };
      log('UnZip file waitting...');
      ajax(service_url.unzip, parm, function(err, ret) {
        if (err) return log(err);
        log('UnZip complete, need refresh');
        dst_proj.refresh(parent_path(dst_path));
      });
    }
  }

  function open_menu(e) {
    file_tree.trigger('close_menu');
    menu.show();
    var off = e.clientY + menu.outerHeight();
    if (e.clientY + menu.outerHeight() > $(window).height()) {
      var top = e.clientY - menu.outerHeight();
      menu.offset({ left: e.clientX , top: (top < 0 ? 0 : top) });
    } else {
      menu.offset({ left: e.clientX , top: e.clientY });
    }
    return false;
  }

  function close_menu() {
    menu.hide();
  }

  // 鼠标右键打开选择菜单并选中节点
  function choose_node(event, id, node) {
    tree.selectNode(node);
    select_node(event, id, node)
  }

  // 鼠标左键消息
  function select_node(event, id, node) {
    talon_exports.emit('choose_project', project, node);
  }

  function on_choose_project(_project, _node) {
    if (project === _project) return;
    tree.cancelSelectedNode();
  }

  function close_project() {
    jdom.trigger('close_project');
    file_tree.off('close_menu', close_menu);
    talon_exports.off('choose_project', on_choose_project);
    talon_exports.emit('choose_project');
    tree.destroy();
    menu.remove();
    jdom.remove();
  }

  // 如果目录中没有文件被打开, 则刷新目录内容
  function refresh(path) {
    find_node(path, function(err, nid, node) {
      if (!node) return;

      for (var p in opend_files) {
        if (p.indexOf(node.tal_path) == 0) {
          return log('Cannot refresh', path, 'some file opend.');
        }
      }

      tree.removeChildNodes(node);
      delete node.tal_ischiled;
      open_dir(null, nid, node);
    });
  }

  function find_node(path, cb) {
    if (!path) return;
    var _pnode = rootNode;
    var names  = split_path(path);
    var i      = 2;
    var begin_time = Date.now();
    _node();

    function _node() {
      if (i <= names.length) {
        var n = tree.getNodesByParam('tal_path', names.slice(0, i).join('/'), _pnode);
        if (n.length < 1) {
          // 节点是异步读取会有延迟, 在延迟后重试.
          tree.expandNode(_pnode, true, false, false, true);
          if (Date.now() - begin_time > 5 * 1000) {
            log(new Error(lang('s0006')), path);
          } else {
            setTimeout(_node, 100);
          }
        } else {
          ++i;
          _pnode = n[0];
          _node();
        }
      } else {
        choose_node(null, _pnode.tId, _pnode);
        cb(null, _pnode.tId, _pnode);
      }
    }
  }

  function new_file() {
    var node = get_current_dir_node();
    var opt = {
      title : lang('s0007'),
      msg   : lang('s0008')
            +': <b class="filename">"' + node.tal_path + '"</b>',
    };
    open_input(opt, function(err, filename) {
      var param = { fsid: fsid, path: join_path(node.tal_path, filename) };

      ajax(service_url.new_file, param, function(err) {
        if (err) return log(lang('s0009'), err);
        var newnode = {
          name     : filename,
          tal_path : param.path,
          tal_type : 'f',
          tal_fsid : fsid,
          isParent : false,
        };
        tree.addNodes(node, newnode);
      });
    });
  }

  function remove_dir() {
    var node = get_select_node(lang('s0010'));

    for (var p in opend_files) {
      if (p.indexOf(node.tal_path) == 0) {
        throw new Error(lang('s0011') + '  ' + node.tal_path);
      }
    }

    var opt = {
      title : lang('s0012'),
      msg   : '<b class="filename">"' + node.tal_path + '"</b><br/>'
            + lang('s0013'),
    };
    open_input(opt, function(err, yes) {
      if (yes) {
        yes = yes.toLowerCase();
        if (!(yes == 'yes' || yes == 'all')) return;
      } else return;

      var recursive = (yes == 'all');
      log('Remove dir please wait');

      var param = { fsid: fsid, path: node.tal_path, recursive: recursive };
      ajax(service_url.del_dir, param, function(err, ret) {
        if (err) return log(lang('s0014'), err);
        tree.removeNode(node);
      });
    });
  }

  function del_file() {
    var node = get_select_node(lang('s0015'));
    if (node.tal_opend)
      throw new Error(lang('s0016'));

    var opt = {
      title : lang('s0017'),
      msg   : '<b class="filename">"' + node.tal_path + '"</b><br/>'
            + lang('s0018'),
    };
    open_input(opt, function(err, yes) {
      if (!(yes && yes.toLowerCase() == 'yes'))
        return;

      var param = { fsid: fsid, path: node.tal_path };
      ajax(service_url.del_file, param, function(err, ret) {
        if (err) return log(lang('s0019'), err);
        tree.removeNode(node);
      });
    });
  }

  function get_current_dir_node() {
    var node = get_select_node(lang('s0020'));

    if (node.tal_type != 'd') {
      var tmp = node.getParentNode();
      if (tmp && tmp.tal_type == 'd') {
        node = tmp;
      } else {
        throw new Error(lang('s0021'));
      }
    }
    return node;
  }

  function get_select_node(msg) {
    var nodes = tree.getSelectedNodes();
    if (nodes.length != 1)
      throw new Error(msg);
    return nodes[0];
  }

  function create_dir() {
    var node = get_current_dir_node();
    var opt = {
      title : lang('s0022'),
      msg   : lang('s0008') + ': <b class="filename">"' + node.tal_path + '"</b>',
    };
    open_input(opt, function(err, dirname) {
      var param = { fsid: fsid, path: join_path(node.tal_path, dirname) };

      ajax(service_url.new_dir, param, function(err) {
        if (err) return log(lang('s0024'), err);
        var newnode = {
          name     : dirname,
          open     : 0,
          tal_path : param.path,
          tal_type : 'd',
          tal_fsid : fsid,
          isParent : true,
          tal_ischiled : true,
        };
        tree.addNodes(node, newnode);
      });
    });
  }

  function open_dir(event, treeId, treeNode) {
    if (treeNode.tal_type != 'd') return;
    if (treeNode.tal_ischiled) {
      // 如果对 tree 进行更新, 会使 tree 和 editor 的同步丢失.
      return;
    } else {
      treeNode.tal_ischiled = true;
    }
    dir(treeNode.tal_path, function(err, data) {
      if (err) return log(lang('s0026'), err);
      add_node(treeNode, data);
    });
  }

  function download() {
    var node = get_select_node(lang('s0015'));
    if (node.tal_type == 'd') throw new Error(lang('s0025'));
    var url = service_url.read + '?fsid=' + fsid + '&path=' + node.tal_path;
    $('#downloadfile').attr('src', url);
  }

  //
  // open_over: Function(new_tab, treeNode) 可选的, 成功打开并创建编辑器后回调
  //
  function open_file(event, treeId, treeNode, open_over) {
    if (!treeNode) return;
    var file = treeNode.tal_path;
    if (treeNode.tal_type == 'd') return;
    if (!service_url.read) return log(lang('s0027'));
    if (treeNode.tal_opend) {
      if (treeNode.tal_opend.sw_focus) {
        treeNode.tal_opend.sw_focus();
        open_over && open_over(treeNode.tal_opend, treeNode);
        return;
      } else {
        return log(lang('m0001'), file, lang('s0028'));
      }
    }
    // 防止文件重复打开
    treeNode.tal_opend = true;

    read_file(file, function(err, filecontent, uptime, mimetype) {
      treeNode.tal_opend = false;
      if (err) return log(lang('s0029'), err);

      var mode = ace_mode(mimetype, file);
      treeNode.tal_up = Number(uptime);
      if (!treeNode.tal_up)
        throw new Error(lang('s0030'));

      var new_tab = talon.add_code_editor({
        name : treeNode.name,
        mode : mode || 'text',
        text : filecontent,
        save : makesave(treeNode),
      });

      treeNode.tal_opend = new_tab;
      opend_files[file] = treeNode;

      new_tab.full_name = treeNode.tal_path;
      new_tab.on('off', save_close_file);
      new_tab.on('close', close_all);
      new_tab.on('focus', function() {
        choose_node(event, treeId, treeNode);
      });

      talon_exports.on('save_all', save);
      talon_exports.on('close_all_tab', save_close_file);
      jdom.on('close_project', function() {
        save(new_tab.close);
      });

      if (typeof open_over == 'function') {
        open_over(new_tab, treeNode)
      }

      function save_close_file() {
        if (new_tab.ischanged()) {
          var opt = {
            title    : lang('s0031'),
            msg      : lang('s0032'),
            filename : file,
            nyes     : lang('m0202'),
            nno      : lang('m0210'),
            ncancel  : lang('m0211'),
          }
          open_yn(opt, function(err, yes) {
            if (err) return log(err);
            if (yes) {
              save(new_tab.close);
            } else {
              new_tab.close();
            }
          });
        } else {
          new_tab.close();
        }
      }

      function save(cb) {
        new_tab.save(function(err) {
          if (err) return log(lang('s0033'), err);
          cb && cb();
        });
      }

      function close_all() {
        delete opend_files[file];
        treeNode.tal_opend = false;
        talon_exports.off('save_all', save);
        talon_exports.off('close_all_tab', save_close_file);
      }
    });
  }

  function add_node(parent, data) {
    var nodes = [];
    data.sort(function(a, b) {
      return (a.name > b.name ? 1 : (a.name < b ? -1 : 0));
    });
    data.forEach(function(d) {
      var node = {
        name     : d.name,
        open     : 0,
        tal_path : '/' + d.name,
        tal_type : d.type,
        tal_fsid : fsid,
        isParent : d.type == 'd',
      };
      if (parent) {
        node.tal_path = join_path(parent.tal_path, node.tal_path);
      }
      nodes.push(node);
    });
    tree.addNodes(parent, nodes);
  }

  function dir(path, cb) {
    try {
      if (!service_url.dir) {
        return cb(new Error(lang('s0034')));
      }
      ajax(service_url.dir, {path : path, fsid: fsid}, function(err, ret) {
        if (err) return cb(err);
        cb(null, ret.data);
      });
    } catch(e) {
      cb(e);
    }
  }

  // cb: Function(error, content, uptime, mime)
  function read_file(filepath, cb) {
    var param = { fsid: fsid, path: filepath };
    ajax(service_url.read, param, function(err, filecontent, textStatus, jqXHR) {
      if (err) return cb(err);
      if (jqXHR.status != 200) {
        var msg;
        switch (jqXHR.status) {
          case 404:
            msg = lang('s0035'); break;
          case 406:
            msg = lang('s0036'); break;
          case 400:
            msg = lang('s0037'); break;
          default:
            msg = 'Code ' + jqXHR.status +' -- '+ textStatus;
        }
        return cb(new Error(lang('s0038')+ ': '+ filepath+ ', '+ msg));
      }
      var mimetype = jqXHR.getResponseHeader('Content-Type');
      var uptime   = jqXHR.getResponseHeader('uptime');
      cb(null, filecontent, uptime, mimetype);
    });
  }

  function makesave(treeNode) {
    function get_file(cb) {
      read_file(treeNode.tal_path, function(err, changed_content, up) {
        if (err) return log(lang('s0039'), err);
        cb(changed_content, up);
      });
    }

    function update(time) {
      treeNode.tal_up = time;
    }

    return function(filecontent, cb) {
      if (!service_url.write) {
        return cb(new Error(lang('s0040')));
      }
      if (!filecontent) {
        return cb(new Error(lang('s0041')));
      }

      var url = service_url.write + '?' + $.param({
          fsid   : fsid,
          path   : treeNode.tal_path,
          uptime : treeNode.tal_up });

      ajax(url, filecontent, function(err, ret) {
        if (err) {
          if (err.code === 7) return create_diff({
            tab      : treeNode.tal_opend,
            get_file : get_file,
            update   : update,
          });
          return cb(err);
        }
        treeNode.tal_up = ret.uptime;
        cb(null, ret.total_length);
      }, {
        contentType : 'application/octet-stream',
        type : 'POST',
      });
    }
  }

  function move_to() {
    open_node_select({ act: lang('s0044'), on_select: _move });

    function _move(src_path, dst_path, src_fsid, dst_fsid, dst_proj) {
      if (src_fsid != dst_fsid)
        throw new Error(lang('s0042'));

      var parm = {
        fsid : fsid,
        path : src_path,
        to   : dst_path,
      };
      ajax(service_url.move_to, parm, function(err, ret) {
        if (err) return log(err);
        log(lang('s0043'));
        refresh(parent_path(dst_path));
      });
    }
  }

  function copy_to() {
    open_node_select({ act: lang('s0045'), on_select: _copy });

    function _copy(src_path, dst_path, src_fsid, dst_fsid, dst_proj) {
      var parm = {
        sfsid : src_fsid,
        tfsid : dst_fsid,
        spath : src_path,
        tpath : dst_path,
      };
      var loadover = talon.open_loading();

      ajax(service_url.copy_to, parm, function(err, ret) {
        loadover();
        if (err) return log(err);
        log(lang('s0046'));
        dst_proj.refresh(parent_path(dst_path));

        if (ret.err && ret.err.length > 0) {
          var err = new Error('some file copy fail');
          err.stack = ret.err.join('\n');
          log(err);
        }
      });
    }
  }

  //
  // _opt : {
  //    act         : '名称',
  //    on_select   : Function(src_path, dst_path, src_fsid, dst_fsid),
  //    no_add_name : false, true 则不添加节点名称
  //    suffix      : '', 设置文件后缀 no_add_name==true 无效.
  //    only_dir    : false, true 只能选择目录
  // }
  //
  function open_node_select(_opt) {
    var snode = get_select_node(lang('s0010'));
    var tnode;
    var src_fsid = fsid;
    var dst_fsid = src_fsid;
    var src_path = snode.tal_path;
    var dst_proj;

    var opt = {
      title : _opt.act + ' ' + lang('s0047'),
      msg   : _opt.act + ' <b class="filename">' + snode.tal_path + '</b> '
            + lang('s0062') +'<br/>(' + lang('s0048') + ')',
      no_cover  : true,
      on_cancel : _cancel,
    };
    var op = open_input(opt, do_act);
    op.frame.css({ top: 50, left: 50+ file_tree.width(), margin: 0 });
    talon_exports.on('choose_project', _choose_project);

    function do_act(err, filename) {
      _cancel();
      if (err) log(err);
      if (filename) {
        var dst_path = op.inputTxt.val();
        _opt.on_select(src_path, dst_path, src_fsid, dst_fsid, dst_proj);
      }
    }

    function _choose_project(project, node) {
      if (node) {
        tnode = node;
        if (_opt.only_dir && tnode.tal_type != 'd') {
          project.tree.cancelSelectedNode(node);
          return;
        }

        var _path = node.tal_path;
        if (tnode.tal_type == 'd' && (!_opt.no_add_name)) {
          _path = join_path(_path, snode.name);
          if (_opt.suffix) _path += _opt.suffix;
        }

        op.inputTxt.val(_path);
        dst_fsid = project.fsid;
        dst_proj = project;
      } else {
        dst_fsid = src_fsid;
      }
    }

    function _cancel() {
      talon_exports.off('choose_project', _choose_project);
    }
  }

  function upfile() {
    var up        = $('.talon_upfile').clone().appendTo(document.body);
    var cancel    = up.find('.cancel');
    var progress  = up.find('._progress');
    var jupbase   = up.find('._upbase');
    var zone      = new FileDrop(up.find('.__upload_zone')[0]);
    var upbase;

    try {
      node = get_current_dir_node();
      upbase = node.tal_path;
    } catch(e) {
      upbase = '/';
    }
    jupbase.text(join_path(upbase, '/'));
    up.screen_center().cover();

    cancel.click(function() {
      up.remove();
    });

    zone.event('send', function (files) {
      files.each(function (file) {
        progress.html(lang('s0049'));

        file.event('done', function (xhr) {
          // console.log(xhr.responseText);
          var ret = JSON.parse(xhr.responseText);
          progress.html(ret.msg || 'ok');
          cancel.removeClass('disabled');
          refresh(upbase);
        });

        file.event('progress', function (sent, total) {
          var pc = sent / total;
          progress.html('<div><em>' + file.name + '</em>'
                       + Math.round(pc * 100) + '%...</div><br/>');
        });

        file.event('error', function (e, xhr) {
          progress.text(e.message);
          cancel.removeClass('disabled');
        });

        var param = { fsid : fsid, path : join_path(upbase, file.name) };
        file.sendTo(service_url.upfile + '?' + $.param(param));
        cancel.addClass('disabled');
      });
    });
  }
}


//
// 创建文件比较器
// opt = {
//   tab      : Class TalonTab, 在 TAB 中创建比较器
//   get_file : Function(cb : Function(filecontent, uptime)), 读取文件内容
//   update   : Function(uptime), 更新当前编辑器中的文件时间, 可以空
// };
//
function create_diff(opt) {
  var tab = opt.tab;
  if (!(tab && tab.editor)) return log(lang('s0050'));
  if (!tab.update) tab.update = function(up) {};

  var template = $('.talon_diff_main_template').html();
  var AceRange = ace.require('./range').Range;
  var jextend  = tab.jextl;

  opt.get_file(function(changed_content, up) {
    up = Number(up);
    jextend.html('');

    var oldtx   = tab.editor.getValue();
    var jdiff   = $(template).appendTo(jextend);
    var reditor = ace.edit(jdiff.find('.changed_file')[0]);
    var diffout = jdiff.find('.diff_output');
    var diffopt = {
        tofile      : opt.file1Name || lang('s0051'),
        fromfile    : opt.file2Name || lang('s0052'),
        tofiledate  : up && new Date(up),
        fromfiledate: new Date() };
    var patch   = difflib.unifiedDiff(
        changed_content.split('\n'), oldtx.split('\n'), diffopt);
    var silder  = jextend.find('.talon_rl_silder')
        .silder(jextend.find('.talon_diff_main'));

    tab.setchange();
    reditor.$blockScrolling = Infinity;
    reditor.setValue(changed_content, -1);
    reditor.setTheme(tab.editor.getTheme());
    reditor.session.setMode(tab.editor.session.getMode());
    jextend.show();
    talon_exports.emit('working_resize');

    for (var i=0; i<patch.length; ++i) {
      var html;
      if (patch[i].indexOf('@@') == 0) {
        var a = patch[i].split(' ');
        var pos = JSON.stringify({
          ls : Math.abs( a[1].split(',')[0] )-1,
          le : Math.abs( a[1].split(',')[1] ),
          rs : Math.abs( a[2].split(',')[0] )-1,
          re : Math.abs( a[2].split(',')[1] ),
        });
        html = "<a href='#' data-pos='" + pos + "'>" + patch[i] + '</a>';
      } else {
        html = $('<div/>').text(patch[i]);
      }
      diffout.append(html);
    }

    function _selection(ed, s, e) {
      s = Number(s);
      e = Number(e) + s;
      var range = new AceRange(s, 0, e, 0);
      ed.getSelection().setSelectionRange(range, true);
      ed.centerSelection();
    }

    diffout.find('a').click(function() {
      var pos = $(this).data('pos');
      _selection(tab.editor, pos.ls, pos.le);
      _selection(reditor,    pos.rs, pos.re);
      return false;
    });

    jdiff.find('.local').click(function() {
      opt.update(up);
      var pos = tab.editor.getCursorPosition();
      tab.editor.setValue(oldtx);
      tab.editor.moveCursorToPosition(pos);
      $(this).addClass('disabled');
    });

    jdiff.find('.remote').click(function() {
      opt.update(up);
      var pos = tab.editor.getCursorPosition();
      tab.editor.setValue(changed_content);
      tab.editor.moveCursorToPosition(pos);
      $(this).addClass('disabled');
    });

    jdiff.find('.manual').click(function() {
      opt.update(up);
      $(this).addClass('disabled');
    });

    jdiff.find('.close').click(close);
    talon_exports.on('esc_key_press', close);

    function close() {
      talon_exports.off('esc_key_press', close);
      jextend.hide();
      jdiff.remove();
      reditor.destroy();
      silder.destroy();
      talon_exports.emit('working_resize');
    }
  });
}



//
// 打开一个是否对话框,
// opt : { title, msg, filename, nyes, nno, ncancel }
// Function cb(err, isyes) -- 在选择取消后不会调用
//
function open_yn(opt, cb) {
  var yesno  = $('.talon_yes_no').clone().appendTo(document.body);

  yesno.find('.yes').click(end(1)).html(opt.nyes || lang('d0003'));
  yesno.find('.no').click(end(2)).html(opt.nno || lang('d0004'));
  yesno.find('.cancel').click(end(3)).html(opt.ncancel || lang('d0002'));

  yesno.find('.title').html(opt.title || '?');
  yesno.find('.message').html(opt.msg || 'what');
  yesno.find('.filename').html(opt.filename || '');
  yesno.screen_center().cover();

  function end(num) {
    return function() {
      try {
        yesno.remove();
        switch(num) {
          case 1: cb(null, true); break;
          case 2: cb(null, false); break;
        }
      } catch(e) {
        log(e);
      }
    }
  }
}


function open_input(opt, cb) {
  var inp = $('.talon_input').clone().appendTo(document.body);
  var txt = inp.find('input');
  inp.find('.title').html(opt.title || '?');
  inp.find('.message').html(opt.msg || 'Input some thing');
  inp.find('.ok').click(end(1));
  inp.find('.cancel').click(end(0));
  inp.screen_center();
  if (!opt.no_cover) {
    inp.cover();
  }

  txt[0].focus();
  txt.keydown(function(e) {
    if (e.keyCode == 13) end(1)();
  });

  return {
    frame : inp,
    inputTxt : txt,
  }

  function end(num) {
    return function () {
      inp.remove();
      try {
        if (num == 1) {
          var v = txt.val()
          v && cb(null, v);
        } else if (opt.on_cancel) {
          opt.on_cancel();
        }
      } catch(e) {
        log(e);
      }
    }
  }
}


function ace_mode(mimetype, fileurl) {
  var mode;
  if (fileurl) {
    var i = fileurl.lastIndexOf('.');
    if (i >= 0) {
      mode = fileurl.substr(i+1);
      if (mime_map[mode]) mode = mime_map[mode];
      return mode;
    }
  }
  if (mimetype) {
    mode = mime_map[mimetype];
    if (mode) mode = mode[0];
    return mode;
  }
}


function ajax(url, data, cb, _ex_opt) {
  if (!url) return cb(new Error(lang('s0053')));

  var opt = {
    cache : false,
    async : true,
    data  : data,
    crossDomain : true,

    success : function(msg, textStatus, jqXHR) {
      log('success');
      try {
        if (msg.ret > 0) {
          var err = new Error(msg.msg);
          err.code = msg.ret;
          err.data = msg;
          cb(err, null, textStatus, jqXHR);
        } else {
          cb(null, msg, textStatus, jqXHR);
        }
      } catch(e) {
        log(e)
      }
    },
    error : function(jqXHR, textStatus, errorThrown) {
      log('error', textStatus);
      cb(errorThrown, null, textStatus, jqXHR);
    },
  };

  log('Get', url, '...');
  $.ajax(url, $.extend(false, opt, _ex_opt));
}


//
// conf.name  -- TAB 显示名称
// conf.mode  -- 编辑器模式. 默认 text
// conf.theme -- 样式, 默认 terminal
// conf.text  -- 编辑器默认内容.
// conf.save  -- 保存函数.
//
function add_code_editor(conf) {
  var tab    = add_tab(conf.name);
  var frame  = $(tab.get_content()).css('display', 'flex');
  var jedit  = $('<pre/>').appendTo(frame);
  var jextl  = $('<div class="extend_frame_right"/>').appendTo(frame);
  var editor = ace.edit(jedit[0]);
  var mode   = conf.mode  || 'text';
  var theme  = conf.theme || 'terminal';

  editor.setTheme("ace/theme/" + theme);
  editor.session.setMode("ace/mode/" + mode);
  editor.$blockScrolling = Infinity;
  editor.setFontSize(talon_config.font_size);
  editor.session.setTabSize(talon_config.tab_size);
  editor.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true,
  });

  editor.keyBinding.setDefaultHandler(function(e,t,n,r) {
    var ret = editor.commands.handleKeyboard(e,t,n,r);
    if (ret && ret.command) {
      if (ace_skip_cmd[ret.command.name]) return;
      console.log('Do ace command:', ret.command.name);
    }
    return ret;
  });

  if (conf.text) {
    editor.setValue(conf.text, -1);
    setTimeout(function() {
      // 在同一任务中设置无效
      editor.session.getUndoManager().reset();
    });
  }
  editor.on('change', function() {
    tab.setchange();
  });
  tab.on('close', function() {
    inner_event.off('working_resize', resize);
    editor.destroy();
  });

  var sel = editor.getSelection();
  sel.on('changeCursor', function() {
    var pos = editor.getCursorPosition();
    talon_exports.set_state('['+ (pos.row+1) + ', ' + (pos.column+1) +']');
  });

  talon_exports.on('working_resize', resize);
  tab.on('focus', resize);
  function resize() {
    editor.resize();
  }

  tab.save = function(cb) {
    if (!conf.save) {
      return log(lang('s0054'));
    }
    conf.save(editor.getValue(), function(err, tlen) {
      if (err) return cb(err);
      tab.resetchange();
      cb(null, tlen);
    });
  };

  tab.editor = editor;
  tab.jextl  = jextl;
  return tab;
}


//
// 返回一个 TabClass 对象用于操作.
//
// Event:
//   close -- 当 tab 被关闭前这个事件被触发. 事件处理器: Function(TabClass)
//   off   -- 当关闭按钮被按下/菜单中选择关闭时被触发
//   saved -- 当保存完成后背触发
//   focus -- 获取焦点时
//   blur  -- 失去焦点时
//
function add_tab(name) {
  var handle  = $('<div class="talon_handle"></div>').appendTo(tab_name);
  var change  = $('<a class="change"></a>').appendTo(handle);
  var tname   = $('<a class="tname"></a>').html(name).appendTo(handle);
  var off     = $('<a class="turn_off">X</a>').appendTo(handle);
  var content = $('<div class="talon_tab_content"/>').appendTo(tab_cont);
  var events  = Event();
  var ischanged = false;

  var ret = {
    className   : 'TalonTab',
    // 消息处理.
    on          : events.on,
    emit        : events.emit,
    off         : events.off,
    // 失去焦点.
    blur        : blur,
    // 获取焦点.
    focus       : focus,
    // 切换焦点到当前 tab.
    sw_focus    : sw_focus,
    // 返回内容 pre 的 html 对象.
    get_content : get_content,
    // 关闭 tab 并释放资源.
    close       : close,
    // 设置为修改状态.
    setchange   : setchange,
    // 设置为非修改状态.
    resetchange : resetchange,
    // 返回修改状态
    ischanged   : _ischanged,
    // 编辑器对象, 可以为空
    editor      : null,
    // Function(save_over_cb) 保存修改的内容, 保存完成则调用 save_over_cb.
    save        : null,
    // 编辑器扩展窗口, 在右侧打开
    jextl       : null,
    short_name  : name,
    full_name   : null,
  };

  handle.click(sw_focus);

  off.click(function() {
    events.emit('off', ret);
  });

  if (curr_tab) {
    curr_tab.blur();
  }
  curr_tab = ret;
  curr_tab.focus();
  opened_tab.push(ret);

  return ret;

  function setchange() {
    if (ischanged) return;
    ischanged = true;
    change.html(modify_char);
  }

  function resetchange() {
    if (!ischanged) return;
    ischanged = false;
    change.html('');
  }

  function _ischanged() {
    return ischanged;
  }

  function get_content() {
    return content[0];
  }

  function close() {
    if (!events) return;
    events.emit('close', ret);
    var i;
    for (i=0,e=opened_tab.length; i<e; ++i) {
      if (opened_tab[i] == ret) {
        opened_tab.splice(i, 1);
        break;
      }
    }
    content.remove();
    handle.remove();
    if (curr_tab == ret) {
      curr_tab = opened_tab[i] || opened_tab[i-1];
      curr_tab && curr_tab.focus();
    }
    events.close();
    events = null;
  }

  function focus() {
    handle.addClass('talon_handle_focus');
    content.show();
    events.emit('focus', ret);
    talon_exports.emit('tab_changed_focus', ret);
  }

  function blur() {
    handle.removeClass('talon_handle_focus');
    content.hide();
    events.emit('blur', ret);
  }

  function sw_focus() {
    if (curr_tab) {
      if (curr_tab == ret) return;
      curr_tab.blur();
    }
    ret.focus();
    curr_tab = ret;
  }
}


function Event() {
  var events = {};
  var proxyMap = {};

  return {
    className : 'TalonEvent',
    on        : on,
    off       : off,
    emit      : emit,
    trigger   : emit,
    close     : close,
    reset     : reset,
    remove    : close,
  };

  function reset() {
    events = {};
  }

  function off(name, cb) {
    if (!events[name]) return;
    if (cb) {
      cb = proxyMap[cb] || cb;
      events[name].remove(cb);
      delete proxyMap[cb];
    } else {
      events[name].empty();
    }
  }

  function on(name, cb) {
    var proxy = function() {
      try {
        // 在 Callbacks 中抛出异常会导致 Callbacks 失效.
        cb.apply(null, arguments);
      } catch(e) {
        log(lang('s0055'), cb.name ||'', e);
      }
    };
    proxyMap[cb] = proxy;
    _event(name).add(proxy);
  }

  function emit(name, a, b, c, d) {
    _event(name).fire(a, b, c, d);
  }

  function _event(name) {
    if (!events) throw Error(lang('s0056'));
    if (!events[name]) {
      events[name] = $.Callbacks();
    }
    return events[name];
  }

  function close() {
    events = null;
  }
}


function open_welcome() {
  var wl = $('.talon_welcome');
  once_click_anything(close);
  wl.find('.ok').click(close);
  wl.screen_center();

  function close() {
    wl.hide();
  }
}


//
// 读取菜单并关联菜单事件
//
// .talon_sub_menu_container:
//    在 jparent 中寻找这个元素作为子菜单容器,
//    当 parent 属性指定的选择器选择的元素被点击, 此菜单被激活;
//    如果用 parent 找不到元素且设置了 name 属性, 则会使用 name 属性创建元素.
// .talon_menu_item:
//    在 .talon_sub_menu_container 选择这个元素作为菜单项;
//    菜单项的 menu_event 属性将被关联到 `menu_event` 变量中的事件处理函数.
// 菜单处理函数:
//    Function init(menu, talon_exports)
//        返回当菜单被触发时的回调函数 Function onclick(event, curr_tab)
//        函数名应该有意义以便调试, `onclick` 名称仅作示例不要使用.
//      menu          -- 当前菜单的 jQuery 对象, 也是 TalonMenuItem 类.
//      talon_exports -- ide 导出对象 TalonGlobal 类.
//      event         -- 事件触发后的消息对象.
//      curr_tab      -- TAB 对象 TalonTab 类.
//
function load_menu_from(jparent, menu_event) {
  var menu_base = {
    className : 'TalonMenuItem',
    // 使按钮成为禁用状态
    disable : function() {
      this.addClass('disable');
      return this;
    },
    // 使按钮成为启用状态
    enable : function() {
      this.removeClass('disable');
      return this;
    },
    // Function(key_text, cb) 设置热键, 必须大写且使用 '+' 分割
    setHot : setHot,
  };

  // 右键菜单也可以借助该方法初始化, 但不要有 parent, name 属性
  jparent.find('.talon_sub_menu_container').each(function() {
    var thiz      = $(this);
    var nameattr  = thiz.attr('name');
    var parent    = $(thiz.attr('parent'));
    var mouse_in_menu = false;

    thiz.find('*').wrapAll('<div class="talon_sub_menu_container_border"></div>');

    thiz.mouseleave(function() {
      mouse_in_menu = false;
    });

    thiz.mouseenter(function() {
      mouse_in_menu = true;
    });

    // Menu framework
    thiz.find('.talon_menu_item').each(function() {
      menu_framework(thiz, $(this));
    });

    if (parent.length <= 0 && nameattr) {
      parent = $('<span class="talon_menu_item"/>').html(nameattr);
      menu_bar.find('#talon_sub_menu_help').before(parent);
    }

    if (parent.length > 0) {
      parent.removeClass('disable').click(function() {
        setTimeout(function() {
          var off = parent.offset();
          off.top += parent.outerHeight();
          thiz.css({ top: off.top, left: off.left }).show();
        }, 1);
        once_click_anything(function() {
          if (mouse_in_menu)
            return true;
          thiz.hide();
        });
      });
    }
  });

  function menu_framework(container, item) {
    var menu = $.extend(false, item, menu_base);
    var event_name = menu.attr('menu_event');

    var init_fn = menu_event[event_name];
    if (init_fn) {
      var event_fn = init_fn(menu, talon_exports);
      menu.click(function(e) {
        if (!menu.is('.disable')) {
          try {
            event_fn(e, curr_tab);
          } catch(e) {
            log(lang('s0057'), e);
          } finally {
            menu_cmd_eve.emit(event_name, e, curr_tab, menu);
          }
          container.hide();
        }
      });
    } else {
      menu.disable();
    }
  }

  function setHot(txt, handler) {
    var name = this.html();
    this.html('');
    $('<span class="menuname"/>')
      .html(name).attr('lang', this.attr('lang')).appendTo(this);
    $('<span class="hotkey"/>').html(txt).appendTo(this);
    this.removeAttr('lang');

    var keytxt = txt.split('+');
    var keys = [{code:999}];

    if (!handler) return;
    function _handeler(keyevent) {
      try {
        return handler(keyevent, talon_exports.get_current_tab());
      } catch(err) {
        log(lang('s0058'), txt, handler.name, err);
      }
    }

    keytxt.forEach(function(k) {
      var key = Keys.Key[ k.trim().toUpperCase() ]
             || Keys.Key[ k.trim() ];
      if (key) keys.push(key);
      else throw new Error(lang('s0059') + k);
    });
    keys.sort(function(a, b) {
      return b.code - a.code;
    });

    // = new Keys.Combo(keys[0], ... keys[n])
    var combo = new (Function.prototype.bind.apply(Keys.Combo, keys));
    key_binding.add(name, combo);
    key_binding.registerHandler(name, _handeler, true);
    return this;
  }
}


//
// 如果 doclick 返回 true 则认为此次操作被中断, 并等待下一次点击.
//
function once_click_anything(doclick) {
  if (!doclick) return;
  setTimeout(function() {
    $(document.body).on('click', function _close() {
      if (doclick() !== true) {
        $(document.body).off('click', _close);
      }
    });
  });
}


function init_version() {
  $('.talon_version').html(version);
  var title = $('title');
  var tt = title.html();
  tt = tt.replace('[talon_version]', version);
  title.html(tt);
}


function screen_center() {
  var jdom = this;
  var win = $(window);
  var off = {
    top  : (win.height() - jdom.height()) / 2,
    left : (win.width()  - jdom.width() ) / 2,
  }
  jdom.css('display', 'flex').offset(off);
  return this;
}


function cover() {
  var c = $('<div class="talon_cover"/>').appendTo(document.body);
  var z = parseInt(this.css('z-index')) || 100;
  c.css('z-index', z+1);
  this.css('z-index', z+2);
  var thiz = this;
  var rm = this.remove;
  this.remove = function() {
    c.remove(0);
    rm.apply(thiz, arguments);
  }
  return this;
}


function parseQuery() {
  var query = {};
  if (location.search) {
    var s = location.search[0] == '?' ? location.search.substr(1) : location.search;
    var q = s.split('&');
    q.forEach(function(i) {
      var t = i.split('=');
      query[t[0]] = decodeURIComponent(t[1]);
    });
  }
  return query;
}


function print() {
  var out = ['<div>'];
  var eventback, needshow;

  for(var i=0,e=arguments.length; i<e; ++i) {
    var arg = arguments[i];
    var className = 'msg';

    //
    // 不同的数据类型, 使用不同的格式
    //
    if (arg instanceof Error) {
      className = 'error';
      needshow = true;
      arg = arg.message + ' <a class="open_stack">[...]</a>'
          + '<pre class="stack">'+ arg.stack +'</pre>';

      eventback = function(msgline) {
        msgline.find('.open_stack').click(function() {
          msgline.find('.stack').toggle();
        });
      };

    } else if (arg.constructor === Date) {
      className = 'date';
      arg = arg.toISOString();
    }

    out.push('<span class="');
    out.push(className);
    out.push('">');
    out.push(arg);
    out.push('&nbsp;</span>');
  }

  out.push('</div>');
  var msgline = $(out.join(''));
  if (eventback) eventback(msgline);
  output.prepend(msgline);
  if (needshow) {
    output.parent().show();
  }
}


function log() {
  var out = [ new Date() ];
  for(var i=0,e=arguments.length; i<e; ++i) {
    out.push(arguments[i]);
  }
  print.apply(null, out);
}


function init_output() {
  var frame = output.parent();

  frame.find('.hide').click(toggle_show);
  frame.find('.clear').click(function() {
    output.html('');
  });

  key_binding.add('output_display', Keys.Key.F9);
  key_binding.registerHandler('output_display', toggle_show, true);

  frame.find('.talon_ud_silder').silder(frame, 1, true);

  function toggle_show() {
    if (frame.css('display') == 'none') {
      frame.show();
      talon_config.hide_output = false;
    } else {
      frame.hide();
      talon_config.hide_output = true;
    }
    talon_exports.emit('working_resize');
  }

  talon_exports.on('esc_key_press', function() {
    if (frame.css('display') != 'none') {
      toggle_show();
    }
  });

  talon_exports.toggle_output = toggle_show;
  return toggle_show;
}


function closeAllFile(all_over) {
  var i = -1;
  check_next();

  function check_next() {
    try {
      if (++i < opened_tab.length) {
        var tab = opened_tab[i];
        if (tab.ischanged() && tab.save) {
          tab.save(check_next);
        } else {
          check_next();
        }
      } else {
        all_over();
      }
    } catch(e) {
      print(lang('s0060'), e);
    }
  }
}


//
// 连接路径字符串, 并规范化
//
function join_path() {
  var tmp = [];
  for (var i=0, e=arguments.length; i<e; ++i) {
    tmp.push(arguments[i]);
  }

  var path = tmp.join('/');
  var ret = [];
  var is = false;

  for (var i=0, e=path.length; i<e; ++i) {
    if (path[i] == '/') {
      if (is) continue;
      is = true;
    } else {
      is = false;
    }
    ret.push(path[i]);
  }
  return ret.join('');
}


function split_path(path) {
  var c, s = 0, i, names = [];

  for (i=0, e=path.length; i<e; ++i) {
    var c = path[i];
    if (c == '/' || c == '\\') {
      names.push(path.substring(s, i));
      s = i + 1;
    }
  }
  if (s < i)
    names.push(path.substring(s, i));
  return names;
}


function set_style(type, cssfile) {
  $('#talon_style_' + type).attr('href', cssfile);
}


function create_mutex(group_name) {
  var grp = mutex_group[group_name];
  if (!grp) {
    var items = [];
    grp = mutex_group[group_name] = add;

    function add(onblur) {
      items.push(onblur);
      return {
        className : 'TalonMutex',
        focus     : focus,
        remove    : remove,
      };

      function focus() {
        items.forEach(function(blur) {
          if (blur === onblur) return;
          blur();
        });
      }

      function remove() {
        for (var i=0; i<items.length; ++i) {
          if (items[i] === onblur) {
            items.splice(i, 1);
          }
        }
      }
    }
  }
  return grp;
}


//
// 返回 FindFile 对象, 可触发事件:
//  find        (opt, find-txt)
//  find_all    (opt, find-txt)
//  replace     (opt, find-txt, replace-txt)
//  replace_all (opt, find-txt, replace-txt)
//
function open_find_file(tab) {
  var jfind       = $('.talon_find_file');
  var options     = { regExp: false, preserveCase: false, wholeWord: false };
  var find_txt    = jfind.find('.find_txt');
  var replace_txt = jfind.find('.replace_txt');
  var count_txt   = jfind.find('.count');
  var events      = Event();
  var is_temp_hide;

  tab.find_window_opened = true;
  talon_exports.on('esc_key_press', close);
  temp_focus();

  opt_click(jfind.find('.regex'), 'regExp');
  opt_click(jfind.find('.case'),  'preserveCase');
  opt_click(jfind.find('.whole'), 'wholeWord');

  make_click('find',        false, jfind.find('.find'));
  make_click('find_all',    false, jfind.find('.find_all'));
  make_click('replace',     true,  jfind.find('.replace'));
  make_click('replace_all', true,  jfind.find('.replace_all'));

  tab.on('blur', temp_hide);
  tab.on('focus', temp_focus);
  tab.on('close', close);

  enterkey(make_click('find'), find_txt);
  enterkey(make_click('replace', true), replace_txt);


  function opt_click(jdom, attrname) {
    options[attrname] = !jdom.hasClass('disabled');

    function _fn() {
      if (options[attrname]) jdom.addClass('disabled');
      else jdom.removeClass('disabled');
      options[attrname] = !options[attrname];
    }

    jdom.click(_fn);
    events.on('distory', function() {
      jdom.off('click', _fn);
    });
  }

  function enterkey(fn, jdom) {
    function _fn(e) {
      if (e.keyCode == 13) fn();
    }
    jdom.keydown(_fn);
    events.on('distory', function() {
      jdom.off('keydown', _fn);
    });
  }

  function temp_hide() {
    is_temp_hide = true;
    jfind.hide();
    talon_exports.emit('working_resize');
  }

  function temp_focus() {
    is_temp_hide = false;
    jfind.css('display', 'flex');
    talon_exports.emit('working_resize');
    find_txt[0].focus();
  }

  function make_click(eventname, usertxt, jdom) {
    function _fn() {
      if (is_temp_hide) return;
      setCount();
      var rtxt, ftxt = find_txt.val();

      if (usertxt)
        rtxt = replace_txt.val() || '';
      if (ftxt)
        events.trigger(eventname, options, ftxt, rtxt);
    }
    if (jdom) {
      jdom.click(_fn);
      events.on('distory', function() {
        jdom.off('click', _fn);
      });
    }
    return _fn;
  }

  function close() {
    if (is_temp_hide) return;
    tab.find_window_opened = false;
    tab.off('blur', temp_hide);
    tab.off('focus', temp_focus);
    tab.off('close', close);
    jfind.hide();
    talon_exports.emit('working_resize');
    talon_exports.off('esc_key_press', close);
    if (events) {
      events.emit('distory');
      events.remove();
      events = null;
    }
  }

  function setCount(c, txt) {
    if (c > 0) {
      count_txt.html(c + ' ' + lang('s0061'));
    } else if (txt) {
      count_txt.html(txt);
    } else {
      count_txt.html('');
    }
  }

  function setText(t) {
    find_txt.val(t);
  }

  return {
    className : 'TalonFindFile',
    close     : close,
    setCount  : setCount,
    on        : events.on,
    setText   : setText,
  };
}


//
// 滑动改变 jtarget 的大小, 调用 this.destroy 事件释放所有行为.
//
function silder(jtarget, dir, isY) {
  var thiz = this;
  if (jtarget && jtarget.length <= 0) {
    jtarget = thiz.parent();
  }

  if (jtarget && jtarget.length > 0) {
    var isdown = false;
    var beginx = 0, beginy = 0, w, h;
    if (!dir) dir = 1;
    var mouse_move = isY ? mouse_move_y : mouse_move_x;

    thiz.mousedown(begin_move);
    $(document).on('mouseup', move_over);
    $(document).on('mousemove', mouse_move);

    this.destroy = function() {
      thiz.off('mousedown', begin_move);
      $(document).off('mouseup', move_over);
      $(document).off('mousemove', mouse_move);
    };

    function mouse_move_x(e) {
      if (isdown) {
        jtarget.css('width', w + (beginx - e.screenX)*dir);
      }
    }

    function mouse_move_y(e) {
      if (isdown) {
        jtarget.css('height', h + (beginy - e.screenY)*dir);
      }
    }

    function begin_move(e) {
      isdown = true;
      beginx = e.screenX;
      beginy = e.screenY;
      w = parseInt(jtarget.css('width'));
      h = parseInt(jtarget.css('height'));
    }

    function move_over() {
       isdown = false;
       talon_exports.emit('working_resize');
    }
  }

  if (!this.destroy) {
    this.destroy = function() {}
  }
  return this;
}


function open_loading() {
  var load = $('.talon_loading').clone().appendTo(document.body);
  load.screen_center().cover();
  var x = load.find('.x');
  var c = 0, txt = '';
  var t = [ '/', '|', '\\', '-' ];

  var tid = setInterval(function() {
    if (++c < 100) {
      txt += '|';
    } else {
      txt = '';
      c= 0;
    }
    x.html(txt + t[c%t.length]);
  }, 50);

  return function stop() {
    clearInterval(tid);
    load.remove();
  }
}


function lang(_id) {
  return language[_id] || ('[' + _id + ']');
}


//
// 更新全局 language 数据, 并将 dom 有 lang 属性的节点内容进行更新.
//
// code -- [ISO 639-1](http://www.w3school.com.cn/tags/html_ref_language_codes.asp)
//         zh, en, ja
// cb -- Function(err)
//
function change_lang(code, cb) {
  ajax('./localization/' + code + '.json', {}, function(err, lang) {
    if (err) return cb(err);

    for (var n in lang) {
      language[n] = lang[n];
    }

    $('*[lang]').each(function() {
      var thiz = $(this);
      var ln = thiz.attr('lang');

      if (ln && lang[ln]) {
        thiz.html(lang[ln]);
      }
    });

    talon_config.language_code = code;
    cb(null, language);
    talon_exports.emit('language_changed', code);
  });
}


});
